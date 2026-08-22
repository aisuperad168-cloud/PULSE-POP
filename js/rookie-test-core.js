/* eslint-disable */
/**
 * JDI 脈動傳媒 - 素人主播適配度測驗｜計分核心（24 題版）
 * ------------------------------------------------------------------
 * 檔案：js/rookie-test-core.js
 *
 * 用途：
 *   - 純函式計分邏輯（無 DOM、無網路），可同時被瀏覽器 UI 與
 *     Node.js / Cloudflare Worker API handler / 測試腳本使用。
 *
 * 匯入資料：
 *   - 瀏覽器：讀取 window.ROOK_DATA（由 rookie-test-data.js 先載入）
 *   - Node.js：require('./rookie-test-data.js')
 *
 * 主要 API：
 *   applyReverseScore(rawValue, isReverse)          -> number
 *   calculateModuleScores(answers)                  -> ModuleScore[]
 *   calculateTotalScore(moduleScores)               -> number
 *   matchProfile(modulePercents, totalScore)        -> ProfileKey
 *   computeRiskFlags(modulePercents)                -> RiskFlag[]
 *   identifyTier(totalScore)                        -> Tier
 *   pickStrengths(modulePercents, n=3)              -> ModuleView[]
 *   pickWeaknesses(modulePercents, n=2)             -> ModuleView[]
 *   buildActionItems(modulePercents)                -> ActionItem[]
 *   buildSummary(profileKey, tierKey)               -> string
 *   buildResult(answers, options?)                  -> RookResult
 *
 * 與 5min 深度版的差異：
 *   - 沒有 lieCheck / detectLieFlag（24 題已含反向題自檢，不需要獨立誠實題）
 *   - buildResult 回傳的 lieCheck 恆為 { triggered:false }，保持 email
 *     模板共用時不會崩（email helper 會判斷 triggered 才顯示）
 * ------------------------------------------------------------------
 */

(function () {
  'use strict';

  // ─────────────────────────────────────────────────────────
  // 1. 資料層取得（雙運行環境相容）
  // ─────────────────────────────────────────────────────────
  let DATA;
  if (typeof window !== 'undefined' && window.ROOK_DATA) {
    DATA = window.ROOK_DATA;
  } else if (typeof module !== 'undefined' && module.exports) {
    // Node.js
    DATA = require('./rookie-test-data.js');
  } else {
    throw new Error('[rookie-test-core] ROOK_DATA not available');
  }

  const {
    version: DATA_VERSION,
    modules: MODULES,
    questions: QUESTIONS,
    riskRules: RISK_RULES,
    profiles: PROFILES,
    profileRules: PROFILE_RULES,
    profileFallback: PROFILE_FALLBACK,
    profilePaths: PROFILE_PATHS,
    tiers: TIERS,
    moduleAdvice: MODULE_ADVICE,
  } = DATA;

  const MODULE_BY_KEY = new Map(MODULES.map(m => [m.key, m]));

  // ─────────────────────────────────────────────────────────
  // 2. 反向計分
  // ─────────────────────────────────────────────────────────
  function applyReverseScore(rawValue, isReverse) {
    const v = Number(rawValue);
    if (!Number.isFinite(v) || v < 1 || v > 5) {
      throw new Error(`[applyReverseScore] invalid answer value: ${rawValue}`);
    }
    return isReverse ? 6 - v : v;
  }

  // ─────────────────────────────────────────────────────────
  // 3. 模組分數（原始分 + 百分制）
  // ─────────────────────────────────────────────────────────
  function calculateModuleScores(answers) {
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
      // 素人版每模組 4 題：最低 4 分、最高 20 分
      // 轉百分制：(raw - minRaw) / (maxRaw - minRaw) * 100
      // 這樣「全部答 3 (中立)」 = 50 分，語意最直覺
      const minRaw = bucket.count * 1;
      const maxRaw = bucket.count * 5;
      const range = maxRaw - minRaw;
      const percent = bucket.count > 0
        ? round1(((bucket.raw - minRaw) / range) * 100)
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
  // 4. 加權總分
  // ─────────────────────────────────────────────────────────
  function calculateTotalScore(moduleScores) {
    let total = 0;
    for (const ms of moduleScores) {
      const m = MODULE_BY_KEY.get(ms.key);
      if (!m) continue;
      total += ms.percent * m.weight;
    }
    return round1(total);
  }

  // ─────────────────────────────────────────────────────────
  // 5. 分型
  // ─────────────────────────────────────────────────────────
  function toPercentMap(moduleScores) {
    const out = {};
    for (const ms of moduleScores) out[ms.key] = ms.percent;
    return out;
  }

  function matchProfile(modulePercents, totalScore) {
    for (const rule of PROFILE_RULES) {
      try {
        if (rule.test(modulePercents, totalScore) === true) {
          return rule.profile;
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[matchProfile] rule error:', rule.profile, e);
      }
    }
    return PROFILE_FALLBACK;
  }

  /**
   * 找出「次要分型」（第 2 順位符合的規則）— 用於報告顯示補強說明。
   * 若找不到就回 null。
   */
  function matchSecondaryProfile(modulePercents, totalScore, primaryKey) {
    for (const rule of PROFILE_RULES) {
      if (rule.profile === primaryKey) continue;
      if (rule.profile === PROFILE_FALLBACK) continue; // 保底不算次要
      try {
        if (rule.test(modulePercents, totalScore) === true) {
          return rule.profile;
        }
      } catch (e) { /* skip */ }
    }
    return null;
  }

  // ─────────────────────────────────────────────────────────
  // 6. 風險預警
  // ─────────────────────────────────────────────────────────
  function computeRiskFlags(modulePercents) {
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
  // 7. Tier
  // ─────────────────────────────────────────────────────────
  function identifyTier(totalScore) {
    for (const t of TIERS) {
      if (totalScore >= t.min && totalScore <= t.max) return t;
    }
    return TIERS[TIERS.length - 1];
  }

  // ─────────────────────────────────────────────────────────
  // 8. 優勢 / 短板 / 行動建議
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
      return a._idx - b._idx; // 穩定排序：依模組原順序
    });
    return list.map(({ _idx, ...rest }) => rest);
  }

  function pickStrengths(modulePercents, n = 3) {
    return sortModulesByPercent(modulePercents, 'desc').slice(0, n);
  }

  function pickWeaknesses(modulePercents, n = 2) {
    return sortModulesByPercent(modulePercents, 'asc').slice(0, n);
  }

  function buildActionItems(modulePercents) {
    const weakest = sortModulesByPercent(modulePercents, 'asc').slice(0, 3);
    return weakest.map(w => {
      const advice = (MODULE_ADVICE && MODULE_ADVICE[w.key]) || {};
      const action = advice.actionLow
        || advice.low
        || `建議針對「${w.shortName || w.name}」制定 4 週訓練計畫，設定可量化的觀察指標。`;
      return {
        module: w.key,
        moduleName: w.shortName || w.name,
        percent: w.percent,
        action,
      };
    });
  }

  // ─────────────────────────────────────────────────────────
  // 9. 摘要文案
  // ─────────────────────────────────────────────────────────
  function buildSummary(profileKey, tierKey) {
    const profile = PROFILES[profileKey] || {};
    const tier = TIERS.find(t => t.key === tierKey) || {};
    const parts = [];
    if (profile.description) parts.push(profile.description);
    if (tier.summary && tier.summary !== profile.description) parts.push(tier.summary);
    if (parts.length === 0) {
      return '本次測驗完成，請參考各模組分數與建議進行下一步規劃。';
    }
    return parts.join(' ');
  }

  // ─────────────────────────────────────────────────────────
  // 10. 完整性驗證
  // ─────────────────────────────────────────────────────────
  function validateAnswersCompleteness(answers) {
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
  // 11. 主入口
  // ─────────────────────────────────────────────────────────
  function buildResult(answers, options) {
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
    const secondaryProfileKey = matchSecondaryProfile(modulePercents, totalScore, profileKey);
    const secondaryProfile = secondaryProfileKey ? (PROFILES[secondaryProfileKey] || {}) : null;
    const riskFlags = computeRiskFlags(modulePercents);
    const strengths = pickStrengths(modulePercents, 3);
    const weaknesses = pickWeaknesses(modulePercents, 2);
    const actionItems = buildActionItems(modulePercents);
    const paths = PROFILE_PATHS[profileKey] || { recommended: [], avoid: [] };
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
      secondaryProfile: secondaryProfile ? {
        key: secondaryProfileKey,
        name: secondaryProfile.name || secondaryProfileKey,
        tagline: secondaryProfile.tagline || '',
      } : null,
      summary,
      strengths,
      weaknesses,
      riskFlags,
      recommendedPaths: paths.recommended || [],
      avoidPaths: paths.avoid || [],
      actionItems,
      // 素人版沒有獨立誠實題（反向題已內含），但保留欄位讓 email 模板可共用
      lieCheck: { triggered: false, avg: 0, answered: 0, threshold: 0 },
    };
  }

  // ─────────────────────────────────────────────────────────
  // 12. 工具
  // ─────────────────────────────────────────────────────────
  function round1(n) {
    return Math.round(n * 10) / 10;
  }

  // ─────────────────────────────────────────────────────────
  // 13. 匯出
  // ─────────────────────────────────────────────────────────
  const ROOK_CORE = {
    buildResult,
    applyReverseScore,
    calculateModuleScores,
    calculateTotalScore,
    matchProfile,
    matchSecondaryProfile,
    computeRiskFlags,
    identifyTier,
    pickStrengths,
    pickWeaknesses,
    buildActionItems,
    buildSummary,
    validateAnswersCompleteness,
    toPercentMap,
    round1,
  };

  if (typeof window !== 'undefined') {
    window.ROOK_CORE = ROOK_CORE;
    window.rookBuildResult = buildResult;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ROOK_CORE;
  }
})();
