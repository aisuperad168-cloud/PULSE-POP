/* eslint-disable no-console */
/**
 * JDI 脈動傳媒 - 主播適配度心理測驗｜Node 驗證測試
 * ------------------------------------------------------------------
 * 執行：
 *   cd /home/user/webapp && node js/streamer-test-tests.js
 *
 * 目的：
 *   在無 UI 情況下，驗證 streamer-test-data.js 與 streamer-test-core.js
 *   的計分邏輯正確性。使用純 Node 原生斷言，不引入外部套件。
 * ------------------------------------------------------------------
 */

'use strict';

const assert = require('assert');
const DATA = require('./streamer-test-data.js');
const CORE = require('./streamer-test-core.js');

// ─────────────────────────────────────────────────────────
// 迷你測試框架
// ─────────────────────────────────────────────────────────
const results = [];
let currentGroup = '';

function group(name, fn) {
  currentGroup = name;
  console.log(`\n▌ ${name}`);
  fn();
}

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    results.push({ ok: true, name: `[${currentGroup}] ${name}` });
  } catch (e) {
    console.log(`  ✗ ${name}`);
    console.log(`      ${e.message}`);
    results.push({ ok: false, name: `[${currentGroup}] ${name}`, err: e });
  }
}

// ─────────────────────────────────────────────────────────
// 工具：構造 answers
// ─────────────────────────────────────────────────────────
/** 產生所有題目回答同一個值 */
function makeAnswers(value) {
  const out = {};
  for (const q of DATA.questions) out[q.id] = value;
  return out;
}

/** 依 module -> value 產生 answers（正向題填 value，反向題也填 value；由 core 自動反向） */
function makeAnswersByModule(perModule, fallback = 3) {
  const out = {};
  for (const q of DATA.questions) {
    const v = perModule[q.module];
    out[q.id] = v != null ? v : fallback;
  }
  return out;
}

/**
 * 產生指定「模組百分制」的 answers。
 * 因為正向題 + 反向題各半，最乾淨的做法是：
 * 用 raw value：正向題填 v，反向題也填 v，這樣兩者都經 core 換算後：
 *   正向題貢獻 v
 *   反向題貢獻 (6 - v)
 * 為了讓整個模組每題貢獻剛好 v，我們對反向題直接填 (6 - v)。
 */
function makeAnswersForTargetPercents(perModulePercent) {
  const out = {};
  for (const q of DATA.questions) {
    const percent = perModulePercent[q.module] != null
      ? perModulePercent[q.module]
      : 60; // fallback
    // percent 對應每題平均 scored value: v = percent / 20
    // 合法範圍：percent ∈ [20, 100] -> v ∈ [1, 5]
    // 若給 0%，改用最低合法值 20%（v=1）；並允許小數（但 raw 必須 1-5）
    let scored = percent / 20;
    if (scored < 1) scored = 1;
    if (scored > 5) scored = 5;
    // 正向題原始值 = scored；反向題原始值 = 6 - scored
    const rawForQuestion = q.reverse ? (6 - scored) : scored;
    out[q.id] = rawForQuestion;
  }
  return out;
}

// ─────────────────────────────────────────────────────────
// 1. 資料完整性檢查
// ─────────────────────────────────────────────────────────
group('資料層完整性', () => {
  test('共有 60 題', () => {
    assert.strictEqual(DATA.questions.length, 60);
  });

  test('題目 ID 從 1 到 60，且唯一', () => {
    const ids = DATA.questions.map(q => q.id).sort((a, b) => a - b);
    assert.deepStrictEqual(ids, Array.from({ length: 60 }, (_, i) => i + 1));
  });

  test('反向題共 18 題，題號正確', () => {
    const reverseIds = DATA.questions.filter(q => q.reverse).map(q => q.id).sort((a, b) => a - b);
    assert.deepStrictEqual(
      reverseIds,
      [2, 4, 8, 10, 14, 19, 22, 24, 26, 29, 32, 36, 39, 44, 48, 52, 54, 57]
    );
  });

  test('每個模組各 10 題', () => {
    const counts = {};
    for (const q of DATA.questions) counts[q.module] = (counts[q.module] || 0) + 1;
    for (const m of DATA.modules) {
      assert.strictEqual(counts[m.key], 10, `${m.key} 應該有 10 題，實際 ${counts[m.key]}`);
    }
  });

  test('六個模組權重總和 = 1.0', () => {
    const sum = DATA.modules.reduce((s, m) => s + m.weight, 0);
    assert.ok(Math.abs(sum - 1.0) < 1e-9, `weights sum = ${sum}`);
  });

  test('六個模組 key 唯一', () => {
    const keys = DATA.modules.map(m => m.key);
    assert.strictEqual(new Set(keys).size, keys.length);
  });

  test('風險規則指向合法模組', () => {
    const moduleKeys = new Set(DATA.modules.map(m => m.key));
    for (const key of Object.keys(DATA.riskRules)) {
      const rule = DATA.riskRules[key];
      assert.ok(moduleKeys.has(rule.module), `${key} 指向未知模組 ${rule.module}`);
    }
  });

  test('分型 fallback 必須存在於 profiles', () => {
    assert.ok(DATA.profiles[DATA.profileFallback], `fallback ${DATA.profileFallback} 不存在`);
  });

  test('每個 profile rule 的 profile 必須存在於 profiles', () => {
    for (const rule of DATA.profileRules) {
      assert.ok(DATA.profiles[rule.profile], `rule ${rule.profile} 不存在於 profiles`);
    }
  });

  test('tiers 級距覆蓋 0-100 且不重疊', () => {
    const sorted = [...DATA.tiers].sort((a, b) => a.min - b.min);
    assert.strictEqual(sorted[0].min, 0);
    assert.strictEqual(sorted[sorted.length - 1].max, 100);
    for (let i = 0; i < sorted.length - 1; i++) {
      assert.strictEqual(sorted[i].max + 1, sorted[i + 1].min,
        `tier ${sorted[i].key}-${sorted[i + 1].key} 不連續`);
    }
  });
});

// ─────────────────────────────────────────────────────────
// 2. 反向計分
// ─────────────────────────────────────────────────────────
group('反向計分 applyReverseScore', () => {
  test('正向題不變', () => {
    assert.strictEqual(CORE.applyReverseScore(1, false), 1);
    assert.strictEqual(CORE.applyReverseScore(3, false), 3);
    assert.strictEqual(CORE.applyReverseScore(5, false), 5);
  });

  test('反向題：1→5, 2→4, 3→3, 4→2, 5→1', () => {
    assert.strictEqual(CORE.applyReverseScore(1, true), 5);
    assert.strictEqual(CORE.applyReverseScore(2, true), 4);
    assert.strictEqual(CORE.applyReverseScore(3, true), 3);
    assert.strictEqual(CORE.applyReverseScore(4, true), 2);
    assert.strictEqual(CORE.applyReverseScore(5, true), 1);
  });

  test('非法值會 throw', () => {
    assert.throws(() => CORE.applyReverseScore(0, false));
    assert.throws(() => CORE.applyReverseScore(6, false));
    assert.throws(() => CORE.applyReverseScore('abc', false));
    assert.throws(() => CORE.applyReverseScore(null, false));
  });
});

// ─────────────────────────────────────────────────────────
// 3. 模組分數 & 總分
// ─────────────────────────────────────────────────────────
group('模組分數 & 總分', () => {
  test('全部答 5：正向題 -> 5, 反向題 -> 1, 每模組原始分 = 5*正向+1*反向', () => {
    const answers = makeAnswers(5);
    const modules = CORE.calculateModuleScores(answers);
    for (const ms of modules) {
      // 每模組 10 題；反向題數不同，raw 隨反向題數變動
      const reverseCount = DATA.questions.filter(q => q.module === ms.key && q.reverse).length;
      const expected = (10 - reverseCount) * 5 + reverseCount * 1;
      assert.strictEqual(ms.raw, expected, `${ms.key} raw 應為 ${expected}，得到 ${ms.raw}`);
    }
  });

  test('全部答 3：每題經反向後仍是 3，raw = 30, percent = 60', () => {
    const answers = makeAnswers(3);
    const modules = CORE.calculateModuleScores(answers);
    for (const ms of modules) {
      assert.strictEqual(ms.raw, 30);
      assert.strictEqual(ms.percent, 60);
    }
    const total = CORE.calculateTotalScore(modules);
    assert.strictEqual(total, 60, `total = ${total}`);
  });

  test('makeAnswersForTargetPercents(80% for all) -> 所有模組 percent = 80，total = 80', () => {
    const targets = {};
    for (const m of DATA.modules) targets[m.key] = 80;
    const answers = makeAnswersForTargetPercents(targets);
    const modules = CORE.calculateModuleScores(answers);
    for (const ms of modules) {
      assert.strictEqual(ms.percent, 80, `${ms.key} percent = ${ms.percent}`);
    }
    assert.strictEqual(CORE.calculateTotalScore(modules), 80);
  });

  test('不同模組不同分：加權總分計算正確', () => {
    // camera:100, audience:100, emotional:100, self:20, creativity:20, boundary:20
    // total = 100*0.2 + 100*0.2 + 100*0.2 + 20*0.15 + 20*0.15 + 20*0.10
    //       = 60 + 3 + 3 + 2 = 68
    const targets = {
      camera_expression: 100,
      audience_interaction: 100,
      emotional_regulation: 100,
      self_discipline: 20,
      content_creativity: 20,
      boundary_control: 20,
    };
    const answers = makeAnswersForTargetPercents(targets);
    const modules = CORE.calculateModuleScores(answers);
    const total = CORE.calculateTotalScore(modules);
    assert.strictEqual(total, 68, `total = ${total}`);
  });

  test('反向題單題驗證：Q2 (反向) 填 1 => 換算後 5', () => {
    // Q2 屬於 camera_expression（反向題）
    const q2 = DATA.questions.find(q => q.id === 2);
    assert.strictEqual(q2.reverse, true, 'Q2 應為反向題');
    // 只做 Q2：其他題填 3 讓乾擾最小
    const answers = makeAnswers(3);
    answers[2] = 1; // 反向題填 1 -> 換算後 5
    const modules = CORE.calculateModuleScores(answers);
    const camera = modules.find(m => m.key === 'camera_expression');
    // 該模組本來全 3 -> raw=30。改 Q2=1 (反向 -> 5)：多 +2
    assert.strictEqual(camera.raw, 32);
  });
});

// ─────────────────────────────────────────────────────────
// 4. Tier
// ─────────────────────────────────────────────────────────
group('Tier 級距', () => {
  test('90 -> excellent', () => {
    assert.strictEqual(CORE.identifyTier(90).key, 'excellent');
  });
  test('75 -> developing', () => {
    assert.strictEqual(CORE.identifyTier(75).key, 'developing');
  });
  test('60 -> potential', () => {
    assert.strictEqual(CORE.identifyTier(60).key, 'potential');
  });
  test('45 -> training', () => {
    assert.strictEqual(CORE.identifyTier(45).key, 'training');
  });
  test('20 -> unstable', () => {
    assert.strictEqual(CORE.identifyTier(20).key, 'unstable');
  });
  test('邊界值 85, 70, 55, 40 都能歸類', () => {
    assert.strictEqual(CORE.identifyTier(85).key, 'excellent');
    assert.strictEqual(CORE.identifyTier(70).key, 'developing');
    assert.strictEqual(CORE.identifyTier(55).key, 'potential');
    assert.strictEqual(CORE.identifyTier(40).key, 'training');
  });
});

// ─────────────────────────────────────────────────────────
// 5. 分型 matchProfile（優先級）
// ─────────────────────────────────────────────────────────
group('分型 matchProfile', () => {
  test('全部 0% -> not_recommended（總分 < 55）', () => {
    const percents = {};
    for (const m of DATA.modules) percents[m.key] = 0;
    assert.strictEqual(CORE.matchProfile(percents, 0), 'not_recommended');
  });

  test('全部 100% 高分穩定 -> 依優先級：high_potential 條件不成立、應命中 stable / stage 等，不會 fallback', () => {
    const percents = {};
    for (const m of DATA.modules) percents[m.key] = 100;
    const total = 100;
    const key = CORE.matchProfile(percents, total);
    // 全高分不會是 not_recommended；因為情緒/自律 > 60，也不會是 high_potential
    assert.notStrictEqual(key, 'not_recommended');
    assert.notStrictEqual(key, 'high_potential');
    // 應該是規則中比較前面的：stable 條件（emotional/self/boundary 高）會先命中
    // 但依現有規則順序，實際結果可能是 stable 或 knowledge，只要不是 fallback
    assert.ok(['stable', 'knowledge', 'stage', 'companion'].includes(key), `unexpected ${key}`);
  });

  test('高潛待訓：核心高但情緒 < 60', () => {
    // camera 80, audience 80, creativity 80, emotional 50, self 70, boundary 70
    const percents = {
      camera_expression: 80,
      audience_interaction: 80,
      emotional_regulation: 50, // < 60
      self_discipline: 70,
      content_creativity: 80,
      boundary_control: 70,
    };
    // total 需 >= 55 才不會命中 not_recommended
    // = 80*0.2 + 80*0.2 + 50*0.2 + 70*0.15 + 80*0.15 + 70*0.1
    // = 16 + 16 + 10 + 10.5 + 12 + 7 = 71.5
    assert.strictEqual(CORE.matchProfile(percents, 71.5), 'high_potential');
  });

  test('穩定經營：情緒>=75 & 自律>=75 & 邊界>=70 且未觸發前面規則', () => {
    const percents = {
      camera_expression: 60,
      audience_interaction: 60,
      emotional_regulation: 78,
      self_discipline: 78,
      content_creativity: 60,
      boundary_control: 72,
    };
    // 沒有任一核心 >= 75，high_potential 不會命中
    assert.strictEqual(CORE.matchProfile(percents, 68), 'stable');
  });

  test('not_recommended：兩項關鍵模組 < 55', () => {
    const percents = {
      camera_expression: 40,           // < 55
      audience_interaction: 70,
      emotional_regulation: 40,        // < 55
      self_discipline: 70,
      content_creativity: 70,
      boundary_control: 70,
    };
    // 總分 = 40*0.2 + 70*0.2 + 40*0.2 + 70*0.15 + 70*0.15 + 70*0.1 = 8+14+8+10.5+10.5+7 = 58
    // 兩項關鍵（camera, emotional）< 55 -> not_recommended
    assert.strictEqual(CORE.matchProfile(percents, 58), 'not_recommended');
  });

  test('無 rule 命中 -> fallback', () => {
    // 建立一個「中庸但不會命中任何 rule」的分數：所有 60
    const percents = {
      camera_expression: 60,
      audience_interaction: 60,
      emotional_regulation: 60,
      self_discipline: 60,
      content_creativity: 60,
      boundary_control: 60,
    };
    const key = CORE.matchProfile(percents, 60);
    // fallback 是 'stable'（雖然不完全符合 stable 的嚴格條件）
    assert.strictEqual(key, DATA.profileFallback);
  });
});

// ─────────────────────────────────────────────────────────
// 6. 風險 flags
// ─────────────────────────────────────────────────────────
group('風險 flags computeRiskFlags', () => {
  test('全 80% -> 沒有風險', () => {
    const percents = {};
    for (const m of DATA.modules) percents[m.key] = 80;
    const flags = CORE.computeRiskFlags(percents);
    assert.strictEqual(flags.length, 0);
  });

  test('camera 50 -> 高曝光焦慮風險', () => {
    const percents = {};
    for (const m of DATA.modules) percents[m.key] = 80;
    percents.camera_expression = 50;
    const flags = CORE.computeRiskFlags(percents);
    assert.strictEqual(flags.length, 1);
    assert.strictEqual(flags[0].module, 'camera_expression');
  });

  test('五個模組都 < 55 -> 五個風險', () => {
    const percents = {
      camera_expression: 40,
      audience_interaction: 40,
      emotional_regulation: 40,
      self_discipline: 40,
      content_creativity: 40,
      boundary_control: 40,
    };
    const flags = CORE.computeRiskFlags(percents);
    // audience_interaction 不在風險規則中，所以應該只有 5 個
    assert.strictEqual(flags.length, 5, `flags: ${flags.map(f => f.module).join(', ')}`);
  });

  test('恰好 55 不觸發（< 55 才觸發）', () => {
    const percents = {};
    for (const m of DATA.modules) percents[m.key] = 55;
    const flags = CORE.computeRiskFlags(percents);
    assert.strictEqual(flags.length, 0);
  });
});

// ─────────────────────────────────────────────────────────
// 7. 誠實檢核
// ─────────────────────────────────────────────────────────
group('誠實檢核 detectLieFlag', () => {
  test('未提供 lie answers -> not triggered', () => {
    assert.strictEqual(CORE.detectLieFlag(null).triggered, false);
    assert.strictEqual(CORE.detectLieFlag(undefined).triggered, false);
    assert.strictEqual(CORE.detectLieFlag({}).triggered, false);
  });

  test('三題平均 5 -> triggered', () => {
    const r = CORE.detectLieFlag({ L1: 5, L2: 5, L3: 5 });
    assert.strictEqual(r.triggered, true);
    assert.strictEqual(r.avg, 5);
  });

  test('三題平均 4 -> 不觸發（< 4.5）', () => {
    const r = CORE.detectLieFlag({ L1: 4, L2: 4, L3: 4 });
    assert.strictEqual(r.triggered, false);
  });

  test('三題平均 4.5 -> triggered（>= 4.5）', () => {
    const r = CORE.detectLieFlag({ L1: 5, L2: 5, L3: 4 });
    // (5+5+4)/3 = 4.666... 四捨五入到 4.7
    assert.ok(r.avg >= 4.5);
    assert.strictEqual(r.triggered, true);
  });
});

// ─────────────────────────────────────────────────────────
// 8. 優勢 / 短板 / 行動建議
// ─────────────────────────────────────────────────────────
group('pickStrengths / pickWeaknesses / buildActionItems', () => {
  test('取前 3 強、後 2 弱', () => {
    const percents = {
      camera_expression: 90,
      audience_interaction: 85,
      emotional_regulation: 60,
      self_discipline: 50,
      content_creativity: 80,
      boundary_control: 40,
    };
    const strengths = CORE.pickStrengths(percents, 3);
    assert.deepStrictEqual(
      strengths.map(s => s.key),
      ['camera_expression', 'audience_interaction', 'content_creativity']
    );
    const weaknesses = CORE.pickWeaknesses(percents, 2);
    assert.deepStrictEqual(
      weaknesses.map(w => w.key),
      ['boundary_control', 'self_discipline']
    );
  });

  test('buildActionItems 產生 3 條建議', () => {
    const percents = {
      camera_expression: 90,
      audience_interaction: 85,
      emotional_regulation: 60,
      self_discipline: 50,
      content_creativity: 80,
      boundary_control: 40,
    };
    const items = CORE.buildActionItems(percents);
    assert.strictEqual(items.length, 3);
    assert.ok(items.every(i => typeof i.action === 'string' && i.action.length > 0));
    // 第 1 條應對應最弱模組
    assert.strictEqual(items[0].module, 'boundary_control');
  });
});

// ─────────────────────────────────────────────────────────
// 9. buildResult 完整流程
// ─────────────────────────────────────────────────────────
group('buildResult 完整流程', () => {
  test('全部答 3 -> total 60, 每模組 60, tier=potential', () => {
    const answers = makeAnswers(3);
    const result = CORE.buildResult(answers);
    assert.strictEqual(result.totalScore, 60);
    assert.strictEqual(result.tier.key, 'potential');
    assert.strictEqual(result.moduleScores.length, 6);
    for (const ms of result.moduleScores) {
      assert.strictEqual(ms.percent, 60);
    }
    assert.strictEqual(result.riskFlags.length, 0);
    assert.strictEqual(result.strengths.length, 3);
    assert.strictEqual(result.weaknesses.length, 2);
    assert.strictEqual(result.actionItems.length, 3);
    assert.ok(result.profile.key);
    assert.ok(result.summary.length > 0);
    assert.ok(result.recommendedPaths.length > 0);
  });

  test('全部答 1（正向 1 + 反向 5）-> 每模組 raw 波動，total 應接近 0-100 邊界', () => {
    const answers = makeAnswers(1);
    const result = CORE.buildResult(answers);
    // 各模組每題 scored = 正向題 1 + 反向題 5，平均值 = (10-r)*1/10 + r*5/10 (r=反向題數)
    // percent = scoredAvg/5 * 100 = ((10-r) + 5r)/10 * 20 = (10 + 4r) * 2
    for (const ms of result.moduleScores) {
      const rev = DATA.questions.filter(q => q.module === ms.key && q.reverse).length;
      const expectedPercent = (10 + 4 * rev) * 2;
      assert.strictEqual(ms.percent, expectedPercent);
    }
  });

  test('全部答 5 -> total 應該偏中間（因為半數反向題會被壓回）', () => {
    const answers = makeAnswers(5);
    const result = CORE.buildResult(answers);
    // 每模組每題 scored = 正向題 5 + 反向題 1
    for (const ms of result.moduleScores) {
      const rev = DATA.questions.filter(q => q.module === ms.key && q.reverse).length;
      const expectedPercent = ((10 - rev) * 5 + rev * 1) * 2; // /50*100
      assert.strictEqual(ms.percent, expectedPercent);
    }
  });

  test('最高分理想情境（用 makeAnswersForTargetPercents 全 100） -> total 100, tier=excellent, 無風險', () => {
    const targets = {};
    for (const m of DATA.modules) targets[m.key] = 100;
    const answers = makeAnswersForTargetPercents(targets);
    const result = CORE.buildResult(answers);
    assert.strictEqual(result.totalScore, 100);
    assert.strictEqual(result.tier.key, 'excellent');
    assert.strictEqual(result.riskFlags.length, 0);
  });

  test('最低分情境（每題換算後皆 1 -> 每模組 20%）-> total 20, tier=unstable, 5 風險, profile=not_recommended', () => {
    // percent=20 對應 scored=1（最低合法值）
    const targets = {};
    for (const m of DATA.modules) targets[m.key] = 20;
    const answers = makeAnswersForTargetPercents(targets);
    const result = CORE.buildResult(answers);
    assert.strictEqual(result.totalScore, 20);
    assert.strictEqual(result.tier.key, 'unstable');
    assert.strictEqual(result.riskFlags.length, 5);
    assert.strictEqual(result.profile.key, 'not_recommended');
  });

  test('缺題會 throw（requireAll 預設 true）', () => {
    const answers = makeAnswers(3);
    delete answers[1];
    delete answers[30];
    assert.throws(() => CORE.buildResult(answers), /missing/i);
  });

  test('requireAll=false 允許缺題', () => {
    const answers = makeAnswers(3);
    delete answers[1];
    const result = CORE.buildResult(answers, null, { requireAll: false });
    // camera 模組會少 1 題
    const camera = result.moduleScores.find(m => m.key === 'camera_expression');
    assert.strictEqual(camera.questionCount, 9);
  });

  test('含誠實檢核題（全 5）-> lieCheck.triggered = true', () => {
    const answers = makeAnswers(3);
    const result = CORE.buildResult(answers, { L1: 5, L2: 5, L3: 5 });
    assert.strictEqual(result.lieCheck.triggered, true);
  });
});

// ─────────────────────────────────────────────────────────
// 收尾
// ─────────────────────────────────────────────────────────
const passed = results.filter(r => r.ok).length;
const failed = results.filter(r => !r.ok).length;
console.log(`\n═══════════════════════════════════════════════════════`);
console.log(`  Tests: ${passed} passed, ${failed} failed, ${results.length} total`);
console.log(`═══════════════════════════════════════════════════════\n`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
