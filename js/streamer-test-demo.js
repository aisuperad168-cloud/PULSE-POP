/* eslint-disable no-console */
/**
 * JDI 脈動傳媒 - 主播測驗 Demo 腳本
 * ------------------------------------------------------------------
 * 這個檔案不會被部署，只是給你在本機看「實際結果長怎樣」用的。
 *
 * 用法：
 *   cd /home/user/webapp && node js/streamer-test-demo.js
 *   cd /home/user/webapp && node js/streamer-test-demo.js all-4    # 全部答 4
 *   cd /home/user/webapp && node js/streamer-test-demo.js high     # 舞台型情境
 *   cd /home/user/webapp && node js/streamer-test-demo.js companion # 陪伴型情境
 *   cd /home/user/webapp && node js/streamer-test-demo.js low      # 不建議情境
 *   cd /home/user/webapp && node js/streamer-test-demo.js risky    # 觸發風險 flag
 * ------------------------------------------------------------------
 */
'use strict';

const DATA = require('./streamer-test-data.js');
const CORE = require('./streamer-test-core.js');

// 幫手：依模組目標百分比產生 60 題答案
function answersFor(targets, fallback = 60) {
  const out = {};
  for (const q of DATA.questions) {
    const percent = targets[q.module] != null ? targets[q.module] : fallback;
    let scored = percent / 20; // 0% -> 0, 100% -> 5
    if (scored < 1) scored = 1;
    if (scored > 5) scored = 5;
    out[q.id] = q.reverse ? (6 - scored) : scored;
  }
  return out;
}

// 全部答同一個值
function allAnswers(v) {
  const out = {};
  for (const q of DATA.questions) out[q.id] = v;
  return out;
}

// 情境庫
const SCENARIOS = {
  'all-3': {
    label: '所有題目都答 3（中庸）',
    build: () => ({ answers: allAnswers(3), lie: null }),
  },
  'all-4': {
    label: '所有題目都答 4（略偏正向，但反向題會拉回）',
    build: () => ({ answers: allAnswers(4), lie: null }),
  },
  'all-5': {
    label: '所有題目都答 5（不看題目一路 5，反向題會壓回）',
    build: () => ({ answers: allAnswers(5), lie: null }),
  },
  'high': {
    label: '舞台型：鏡頭 85% + 互動 80% + 創意 75% + 情緒 70%',
    build: () => ({
      answers: answersFor({
        camera_expression: 85,
        audience_interaction: 80,
        emotional_regulation: 70,
        self_discipline: 65,
        content_creativity: 75,
        boundary_control: 70,
      }),
      lie: { L1: 2, L2: 2, L3: 3 },
    }),
  },
  'companion': {
    label: '陪伴型：互動 90% + 情緒 80% + 邊界 70%（其他中等）',
    build: () => ({
      answers: answersFor({
        camera_expression: 65,
        audience_interaction: 90,
        emotional_regulation: 80,
        self_discipline: 65,
        content_creativity: 60,
        boundary_control: 70,
      }),
      lie: null,
    }),
  },
  'knowledge': {
    label: '知識型：自律 85% + 創意 80% + 鏡頭 65%',
    build: () => ({
      answers: answersFor({
        camera_expression: 65,
        audience_interaction: 60,
        emotional_regulation: 65,
        self_discipline: 85,
        content_creativity: 80,
        boundary_control: 70,
      }),
      lie: null,
    }),
  },
  'stable': {
    label: '穩定經營：情緒 80% + 自律 80% + 邊界 75%（其他中等）',
    build: () => ({
      answers: answersFor({
        camera_expression: 60,
        audience_interaction: 60,
        emotional_regulation: 80,
        self_discipline: 80,
        content_creativity: 60,
        boundary_control: 75,
      }),
      lie: null,
    }),
  },
  'high-potential': {
    label: '高潛待訓：鏡頭 85% + 互動 80%，但情緒只有 50%',
    build: () => ({
      answers: answersFor({
        camera_expression: 85,
        audience_interaction: 80,
        emotional_regulation: 50, // 拖後腿
        self_discipline: 65,
        content_creativity: 75,
        boundary_control: 70,
      }),
      lie: null,
    }),
  },
  'low': {
    label: '不建議上線：多項核心都低於 55%',
    build: () => ({
      answers: answersFor({
        camera_expression: 40,
        audience_interaction: 45,
        emotional_regulation: 35,
        self_discipline: 45,
        content_creativity: 40,
        boundary_control: 40,
      }),
      lie: null,
    }),
  },
  'risky': {
    label: '觸發全部 5 個風險 flag（每個關鍵模組都 < 55）',
    build: () => ({
      answers: answersFor({
        camera_expression: 40,
        audience_interaction: 70,
        emotional_regulation: 40,
        self_discipline: 40,
        content_creativity: 40,
        boundary_control: 40,
      }),
      lie: null,
    }),
  },
  'lie': {
    label: '誠實檢核觸發：三題誠實題全部答 5',
    build: () => ({
      answers: allAnswers(4),
      lie: { L1: 5, L2: 5, L3: 5 },
    }),
  },
};

// ─────────────────────────────────────────────────────────
// 印出漂亮結果
// ─────────────────────────────────────────────────────────
function bar(percent, width = 20) {
  const filled = Math.round((percent / 100) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

function printResult(scenarioKey, scenarioLabel, result) {
  const line = '─'.repeat(70);
  console.log('\n' + line);
  console.log(`  情境：${scenarioLabel}`);
  console.log(`  key： ${scenarioKey}`);
  console.log(line);

  console.log(`\n  📊 總分：${result.totalScore} / 100`);
  console.log(`  🎯 分級：${result.tier.label} (${result.tier.key})`);
  console.log(`  🎭 分型：${result.profile.name}`);
  if (result.profile.tagline) console.log(`     tagline：${result.profile.tagline}`);
  console.log(`\n  💬 總結：${result.summary}\n`);

  console.log('  📈 模組分數：');
  for (const ms of result.moduleScores) {
    const pad = ms.shortName.padEnd(4, '　');
    console.log(`    ${pad}  ${bar(ms.percent)} ${String(ms.percent).padStart(5)}%  (raw ${ms.raw}/50, 權重 ${ms.weight})`);
  }

  console.log('\n  ⭐ 前 3 優勢：');
  result.strengths.forEach((s, i) => {
    console.log(`    ${i + 1}. ${s.name}  (${s.percent}%)`);
  });

  console.log('\n  ⚠️  待加強：');
  result.weaknesses.forEach((w, i) => {
    console.log(`    ${i + 1}. ${w.name}  (${w.percent}%)`);
  });

  if (result.riskFlags.length > 0) {
    console.log('\n  🚨 風險 flag：');
    result.riskFlags.forEach((f, i) => {
      console.log(`    ${i + 1}. [${f.severity}] ${f.name}  (${f.module} = ${f.modulePercent}%)`);
      if (f.advice) console.log(`       建議：${f.advice}`);
    });
  } else {
    console.log('\n  🚨 風險 flag：無');
  }

  console.log('\n  ✅ 推薦發展路徑：');
  result.recommendedPaths.slice(0, 3).forEach((p, i) => {
    console.log(`    ${i + 1}. ${p}`);
  });

  console.log('\n  🚫 建議避開：');
  result.avoidPaths.slice(0, 3).forEach((p, i) => {
    console.log(`    ${i + 1}. ${p}`);
  });

  console.log('\n  🎯 3 條行動建議：');
  result.actionItems.forEach((item, i) => {
    console.log(`    ${i + 1}. [${item.moduleName} · ${item.percent}%]`);
    console.log(`       ${item.action}`);
  });

  if (result.lieCheck.answered > 0) {
    console.log(`\n  🕵️  誠實檢核：avg=${result.lieCheck.avg}, threshold=${result.lieCheck.threshold}, ${result.lieCheck.triggered ? '⚠️  觸發（可能過度理想化）' : '✅ 正常'}`);
  }

  console.log('\n' + line + '\n');
}

// ─────────────────────────────────────────────────────────
// 主流程
// ─────────────────────────────────────────────────────────
const arg = process.argv[2];

if (!arg || arg === 'list') {
  console.log('\n可用情境（傳入其中一個 key 執行）：\n');
  for (const key of Object.keys(SCENARIOS)) {
    console.log(`  ${key.padEnd(18)}  ${SCENARIOS[key].label}`);
  }
  console.log('\n範例：');
  console.log('  node js/streamer-test-demo.js all-3');
  console.log('  node js/streamer-test-demo.js high');
  console.log('  node js/streamer-test-demo.js risky');
  console.log('  node js/streamer-test-demo.js all       # 全部跑一遍');
  console.log('');
  process.exit(0);
}

if (arg === 'all') {
  for (const key of Object.keys(SCENARIOS)) {
    const scenario = SCENARIOS[key];
    const { answers, lie } = scenario.build();
    const result = CORE.buildResult(answers, lie);
    printResult(key, scenario.label, result);
  }
  process.exit(0);
}

const scenario = SCENARIOS[arg];
if (!scenario) {
  console.error(`\n❌ 找不到情境：${arg}\n`);
  console.error('  可用情境：' + Object.keys(SCENARIOS).join(', '));
  console.error('  或用 "list" 看列表、"all" 全部跑一遍\n');
  process.exit(1);
}

const { answers, lie } = scenario.build();
const result = CORE.buildResult(answers, lie);
printResult(arg, scenario.label, result);
