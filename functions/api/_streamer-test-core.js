/**
 * ============================================================
 * Streamer Test - Core (ES Module version for Cloudflare Worker)
 * ============================================================
 *
 * 這是 /js/streamer-test-core.js 的 ES module 版本，
 * 供 Cloudflare Worker 端使用（Worker 只支援 ES modules，
 * 不支援 IIFE + require）。
 *
 * 資料來源同樣是 /js/streamer-test-data.js，但也需要 ES module 版本
 * → 見 _streamer-test-data.js
 *
 * 邏輯與 /js/streamer-test-core.js 完全一致，Node 測試已驗證 48/48 pass。
 * ============================================================
 */

import * as DATA from './_streamer-test-data.js';

const {
  version: DATA_VERSION,
  modules: MODULES,
  questions: QUESTIONS,
  lieQuestions: LIE_QUESTIONS,
  riskRules: RISK_RULES,
  profiles: PROFILES,
  profileRules: PROFILE_RULES,
  profileFallback: PROFILE_FALLBACK,
  profilePaths: PROFILE_PATHS,
  tiers: TIERS,
  moduleAdvice: MODULE_ADVICE,
  lieThresholdAvg: LIE_THRESHOLD,
} = DATA;

const MODULE_BY_KEY = new Map(MODULES.map(m => [m.key, m]));

// ─────────────────────────────────────────────────────────
// 反向計分
// ─────────────────────────────────────────────────────────
export function applyReverseScore(rawValue, isReverse) {
  const v = Number(rawValue);
  if (!Number.isFinite(v) || v < 1 || v > 5) {
    throw new Error(`[applyReverseScore] invalid answer value: ${rawValue}`);
  }
  return isReverse ? 6 - v : v;
}

// ─────────────────────────────────────────────────────────
// 模組分數
// ─────────────────────────────────────────────────────────
export function calculateModuleScores(answers) {
  if (!answers || typeof answers !== 'object') {
    throw new Error('[calculateModuleScores] answers must be an object');
  }

  const buckets = {};
  for (const m of MODULES) buckets[m.key] = { raw: 0, count: 0 };

  for (const q of QUESTIONS) {
    const rawAnswer = answers[q.id];
    if (rawAnswer == null) continue;
    const scored = applyReverseScore(rawAnswer, q.reverse);
    buckets[q.module].raw += scored;
    buckets[q.module].count += 1;
  }

  return MODULES.map(m => {
    const bucket = buckets[m.key];
    const percent = bucket.count > 0
      ? round1((bucket.raw / (5 * bucket.count)) * 100)
      : 0;
    return {
      key: m.key,
      name: m.name,
      shortName: m.shortName,
      color: m.color,
      weight: m.weight,
      raw: bucket.raw,
      percent,
      questionCount: bucket.count,
    };
  });
}

// ─────────────────────────────────────────────────────────
// 加權總分
// ─────────────────────────────────────────────────────────
export function calculateTotalScore(moduleScores) {
  let total = 0;
  for (const ms of moduleScores) {
    const m = MODULE_BY_KEY.get(ms.key);
    if (!m) continue;
    total += ms.percent * m.weight;
  }
  return round1(total);
}

export function toPercentMap(moduleScores) {
  const out = {};
  for (const ms of moduleScores) out[ms.key] = ms.percent;
  return out;
}

// ─────────────────────────────────────────────────────────
// 分型
// ─────────────────────────────────────────────────────────
export function matchProfile(modulePercents, totalScore) {
  for (const rule of PROFILE_RULES) {
    try {
      if (rule.test(modulePercents, totalScore) === true) {
        return rule.profile;
      }
    } catch (e) {
      console.warn('[matchProfile] rule error:', rule.profile, e);
    }
  }
  return PROFILE_FALLBACK;
}

// ─────────────────────────────────────────────────────────
// 風險 flags
// ─────────────────────────────────────────────────────────
export function computeRiskFlags(modulePercents) {
  const flags = [];
  for (const key of Object.keys(RISK_RULES)) {
    const rule = RISK_RULES[key];
    const modulePercent = modulePercents[rule.module];
    if (modulePercent != null && modulePercent < rule.threshold) {
      flags.push({
        key: rule.key || key,
        name: rule.name,
        module: rule.module,
        threshold: rule.threshold,
        modulePercent,
        advice: rule.advice || '',
        severity: rule.severity || (modulePercent < 40 ? 'high' : 'medium'),
      });
    }
  }
  return flags;
}

// ─────────────────────────────────────────────────────────
// 誠實檢核
// ─────────────────────────────────────────────────────────
export function detectLieFlag(lieAnswers) {
  if (!lieAnswers || typeof lieAnswers !== 'object') {
    return { triggered: false, avg: 0, answered: 0 };
  }
  let sum = 0;
  let answered = 0;
  for (const lq of LIE_QUESTIONS) {
    const v = Number(lieAnswers[lq.id]);
    if (Number.isFinite(v) && v >= 1 && v <= 5) {
      sum += v;
      answered += 1;
    }
  }
  if (answered === 0) return { triggered: false, avg: 0, answered: 0 };
  const avg = round1(sum / answered);
  const threshold = typeof LIE_THRESHOLD === 'number' ? LIE_THRESHOLD : 4.5;
  return { triggered: avg >= threshold, avg, answered, threshold };
}

// ─────────────────────────────────────────────────────────
// Tier
// ─────────────────────────────────────────────────────────
export function identifyTier(totalScore) {
  for (const t of TIERS) {
    if (totalScore >= t.min && totalScore <= t.max) return t;
  }
  return TIERS[TIERS.length - 1];
}

// ─────────────────────────────────────────────────────────
// 優勢 / 短板
// ─────────────────────────────────────────────────────────
function sortModulesByPercent(modulePercents, direction) {
  const list = MODULES.map((m, idx) => ({
    key: m.key,
    name: m.name,
    shortName: m.shortName,
    percent: modulePercents[m.key] != null ? modulePercents[m.key] : 0,
    _idx: idx,
  }));
  list.sort((a, b) => {
    const diff = direction === 'desc' ? b.percent - a.percent : a.percent - b.percent;
    if (diff !== 0) return diff;
    return a._idx - b._idx;
  });
  return list.map(({ _idx, ...rest }) => rest);
}

export function pickStrengths(modulePercents, n = 3) {
  return sortModulesByPercent(modulePercents, 'desc').slice(0, n);
}

export function pickWeaknesses(modulePercents, n = 2) {
  return sortModulesByPercent(modulePercents, 'asc').slice(0, n);
}

export function buildActionItems(modulePercents) {
  const weakest = sortModulesByPercent(modulePercents, 'asc').slice(0, 3);
  return weakest.map(w => {
    const advice = (MODULE_ADVICE && MODULE_ADVICE[w.key]) || {};
    const action = advice.actionLow || advice.low
      || `建議針對「${w.shortName || w.name}」制定 4 週訓練計畫，設定可量化的觀察指標。`;
    return {
      module: w.key,
      moduleName: w.shortName || w.name,
      percent: w.percent,
      action,
    };
  });
}

export function buildSummary(profileKey, tierKey) {
  const profile = PROFILES[profileKey] || {};
  const tier = TIERS.find(t => t.key === tierKey) || {};
  const parts = [];
  if (profile.summary) parts.push(profile.summary);
  if (tier.summary && tier.summary !== profile.summary) parts.push(tier.summary);
  if (parts.length === 0) {
    return '本次測驗完成，請參考各模組分數與建議進行下一步規劃。';
  }
  return parts.join(' ');
}

// ─────────────────────────────────────────────────────────
// 完整性驗證
// ─────────────────────────────────────────────────────────
export function validateAnswersCompleteness(answers) {
  const missing = [];
  for (const q of QUESTIONS) {
    const v = answers ? answers[q.id] : undefined;
    if (v == null) { missing.push(q.id); continue; }
    const num = Number(v);
    if (!Number.isFinite(num) || num < 1 || num > 5) {
      missing.push(q.id);
    }
  }
  return missing;
}

// ─────────────────────────────────────────────────────────
// 主入口
// ─────────────────────────────────────────────────────────
export function buildResult(answers, lieAnswers, options) {
  options = options || {};
  const requireAll = options.requireAll !== false;

  if (requireAll) {
    const missing = validateAnswersCompleteness(answers);
    if (missing.length > 0) {
      throw new Error(
        `[buildResult] missing answers for question IDs: ${missing.join(', ')}`
      );
    }
  }

  const moduleScores = calculateModuleScores(answers);
  const modulePercents = toPercentMap(moduleScores);
  const totalScore = calculateTotalScore(moduleScores);
  const tier = identifyTier(totalScore);
  const profileKey = matchProfile(modulePercents, totalScore);
  const profile = PROFILES[profileKey] || {};
  const riskFlags = computeRiskFlags(modulePercents);
  const strengths = pickStrengths(modulePercents, 3);
  const weaknesses = pickWeaknesses(modulePercents, 2);
  const actionItems = buildActionItems(modulePercents);
  const paths = PROFILE_PATHS[profileKey] || { recommended: [], avoid: [] };
  const lieFlag = detectLieFlag(lieAnswers);
  const summary = buildSummary(profileKey, tier.key);

  return {
    version: DATA_VERSION,
    generatedAt: new Date().toISOString(),
    totalScore,
    tier: {
      key: tier.key,
      label: tier.label,
      min: tier.min,
      max: tier.max,
    },
    moduleScores,
    profile: {
      key: profileKey,
      name: profile.name || profileKey,
      tagline: profile.tagline || '',
    },
    summary,
    strengths,
    weaknesses,
    riskFlags,
    recommendedPaths: paths.recommended || [],
    avoidPaths: paths.avoid || [],
    actionItems,
    lieCheck: lieFlag,
  };
}

// ─────────────────────────────────────────────────────────
// 工具
// ─────────────────────────────────────────────────────────
function round1(n) {
  return Math.round(n * 10) / 10;
}
