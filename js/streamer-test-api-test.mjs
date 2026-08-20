/**
 * ============================================================
 * Streamer Test - API Handler 端對端測試（不需要真的部署到 Cloudflare）
 * ============================================================
 * 執行：
 *   cd /home/user/webapp && node --experimental-vm-modules js/streamer-test-api-test.js
 * ============================================================
 */

import { onRequestPost, onRequestOptions } from '../functions/api/streamer-test-submit.js';
import * as data from '../functions/api/_streamer-test-data.js';

// 假 env（無 D1、無 Resend）
const mockEnv = {};

// 假 request
function makeRequest(payload) {
  return new Request('http://localhost/api/streamer-test-submit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'CF-Connecting-IP': '1.2.3.4',
      'CF-IPCountry': 'TW',
      'User-Agent': 'test-runner/1.0',
    },
    body: JSON.stringify(payload),
  });
}

// 產生完整 60 題答案（依模組 target 百分比）
function answersFor(targets) {
  const out = {};
  data.questions.forEach(q => {
    const p = targets[q.module] != null ? targets[q.module] : 60;
    let v = Math.max(1, Math.min(5, p / 20));
    out[q.id] = q.reverse ? (6 - v) : v;
  });
  return out;
}

// ─────────────────────────────────────────────
// 迷你測試框架
// ─────────────────────────────────────────────
const results = [];
async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    results.push({ ok: true, name });
  } catch (e) {
    console.log(`  ✗ ${name}`);
    console.log(`      ${e.message}`);
    results.push({ ok: false, name, err: e });
  }
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}
function assertEq(actual, expected, msg) {
  if (actual !== expected) throw new Error(`${msg || 'assert'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

// ─────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────
async function run() {
  console.log('\n▌ API Handler: onRequestOptions (CORS)');
  await test('回 204 + CORS headers', async () => {
    const resp = await onRequestOptions();
    assertEq(resp.status, 204);
    assert(resp.headers.get('Access-Control-Allow-Origin') === '*', 'CORS *');
  });

  console.log('\n▌ API Handler: 驗證錯誤');
  await test('無 JSON body -> 400', async () => {
    const req = new Request('http://localhost/api/streamer-test-submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    });
    const resp = await onRequestPost({ request: req, env: mockEnv });
    assertEq(resp.status, 400);
    const body = await resp.json();
    assertEq(body.error, 'INVALID_JSON');
  });

  await test('缺 name -> 400 MISSING_FIELDS', async () => {
    const req = makeRequest({ email: 'x@x.com', lineId: 'a', consent: true, answers: {} });
    const resp = await onRequestPost({ request: req, env: mockEnv });
    assertEq(resp.status, 400);
    const body = await resp.json();
    assertEq(body.error, 'MISSING_FIELDS');
  });

  await test('未勾 consent -> 400', async () => {
    const req = makeRequest({ name: 'A', email: 'x@x.com', lineId: 'a', consent: false, answers: answersFor({}) });
    const resp = await onRequestPost({ request: req, env: mockEnv });
    assertEq(resp.status, 400);
    const body = await resp.json();
    assertEq(body.error, 'CONSENT_REQUIRED');
  });

  await test('Email 格式錯誤 -> 400', async () => {
    const req = makeRequest({ name: 'A', email: 'not-email', lineId: 'a', consent: true, answers: answersFor({}) });
    const resp = await onRequestPost({ request: req, env: mockEnv });
    assertEq(resp.status, 400);
    const body = await resp.json();
    assertEq(body.error, 'INVALID_EMAIL');
  });

  await test('性別不合法 -> 400', async () => {
    const req = makeRequest({
      name: 'A', email: 'a@b.com', lineId: 'a', consent: true,
      gender: '外星人', answers: answersFor({}),
    });
    const resp = await onRequestPost({ request: req, env: mockEnv });
    assertEq(resp.status, 400);
    const body = await resp.json();
    assertEq(body.error, 'INVALID_GENDER');
  });

  await test('缺答案 -> 400 INVALID_ANSWERS', async () => {
    const req = makeRequest({
      name: 'A', email: 'a@b.com', lineId: 'a', consent: true,
      answers: { 1: 3, 2: 3 }, // 只答 2 題
    });
    const resp = await onRequestPost({ request: req, env: mockEnv });
    assertEq(resp.status, 400);
    const body = await resp.json();
    assertEq(body.error, 'INVALID_ANSWERS');
  });

  console.log('\n▌ API Handler: 成功流程（無 D1、無 Resend）');
  await test('完整流程回 200 + result + warn（因無 API key）', async () => {
    const req = makeRequest({
      name: '王小明', email: 'wang@example.com', lineId: '@wang123',
      consent: true,
      gender: '男', age: '25-29', region: '北北基', experience: 'new',
      answers: answersFor({
        camera_expression: 85, audience_interaction: 80, emotional_regulation: 70,
        self_discipline: 65, content_creativity: 75, boundary_control: 70,
      }),
      lieAnswers: { L1: 2, L2: 3, L3: 2 },
      source: 'streamer-test-page',
    });
    const resp = await onRequestPost({ request: req, env: mockEnv });
    assertEq(resp.status, 200);
    const body = await resp.json();
    assertEq(body.ok, true);
    assert(body.result, 'result 應該存在');
    assertEq(body.result.tier.key, 'developing');
    assertEq(body.result.profile.key, 'stage'); // 舞台型
    assert(body.warn, '應該有 warn（缺 Resend key）');
    assertEq(body.result.moduleScores.length, 6);
  });

  await test('低分情境 -> profile=not_recommended + 有風險 flag', async () => {
    const req = makeRequest({
      name: '測試低分', email: 't@t.com', lineId: 't',
      consent: true,
      answers: answersFor({
        camera_expression: 40, audience_interaction: 45, emotional_regulation: 35,
        self_discipline: 45, content_creativity: 40, boundary_control: 40,
      }),
    });
    const resp = await onRequestPost({ request: req, env: mockEnv });
    assertEq(resp.status, 200);
    const body = await resp.json();
    assertEq(body.result.profile.key, 'not_recommended');
    assert(body.result.riskFlags.length > 0, '應該有風險');
    assertEq(body.cta.label, '與運營聊聊合作方向');
  });

  await test('CTA 分型分流：舞台型 -> LINE 面談', async () => {
    const req = makeRequest({
      name: '舞台', email: 'stage@t.com', lineId: 's',
      consent: true,
      answers: answersFor({
        camera_expression: 85, audience_interaction: 80, emotional_regulation: 70,
        self_discipline: 65, content_creativity: 75, boundary_control: 70,
      }),
    });
    const body = await (await onRequestPost({ request: req, env: mockEnv })).json();
    assertEq(body.cta.label, '立即加入 LINE，安排面談');
  });

  await test('CTA 分型分流：穩定經營 -> 新人培訓', async () => {
    const req = makeRequest({
      name: '穩定', email: 'stable@t.com', lineId: 's',
      consent: true,
      answers: answersFor({
        camera_expression: 60, audience_interaction: 60, emotional_regulation: 80,
        self_discipline: 80, content_creativity: 60, boundary_control: 75,
      }),
    });
    const body = await (await onRequestPost({ request: req, env: mockEnv })).json();
    assertEq(body.result.profile.key, 'stable');
    assertEq(body.cta.label, '立即參加新人培訓');
  });

  await test('誠實檢核觸發（三題全 5）-> lieCheck.triggered=true', async () => {
    const req = makeRequest({
      name: 'lie', email: 'l@t.com', lineId: 'l',
      consent: true,
      answers: answersFor({}),
      lieAnswers: { L1: 5, L2: 5, L3: 5 },
    });
    const body = await (await onRequestPost({ request: req, env: mockEnv })).json();
    assertEq(body.result.lieCheck.triggered, true);
  });

  // ─────────────────────────────────────────────
  // 收尾
  // ─────────────────────────────────────────────
  const passed = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;
  console.log(`\n═══════════════════════════════════════════════════════`);
  console.log(`  Tests: ${passed} passed, ${failed} failed, ${results.length} total`);
  console.log(`═══════════════════════════════════════════════════════\n`);

  process.exit(failed > 0 ? 1 : 0);
}

run();
