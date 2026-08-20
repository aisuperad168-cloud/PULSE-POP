/* eslint-disable */
/**
 * JDI 脈動傳媒 - 主播適配度心理測驗｜計分核心
 * ------------------------------------------------------------------
 * 檔案：js/streamer-test-core.js
 *
 * 用途：
 *   - 純函式計分邏輯（無 DOM、無網路），可同時被瀏覽器 UI 與
 *     Node.js API handler / 測試腳本使用。
 *
 * 匯入資料：
 *   - 瀏覽器：讀取 window.STMT_DATA（由 streamer-test-data.js 先載入）
 *   - Node.js：require('./streamer-test-data.js')
 *
 * 主要 API：
 *   applyReverseScore(rawValue, isReverse)          -> number
 *   calculateModuleScores(answers)                  -> ModuleScore[]
 *   calculateTotalScore(moduleScores)               -> number
 *   matchProfile(modulePercents, totalScore)        -> ProfileTypeKey
 *   computeRiskFlags(modulePercents)                -> RiskFlag[]
 *   detectLieFlag(lieAnswers)                       -> { triggered, avg }
 *   identifyTier(totalScore)                        -> Tier
 *   pickStrengths(modulePercents, n=3)              -> ModuleKey[]
 *   pickWeaknesses(modulePercents, n=2)             -> ModuleKey[]
 *   buildActionItems(modulePercents)                -> string[]
 *   buildSummary(profileKey, tierKey)               -> string
 *   buildResult(answers, lieAnswers?, options?)     -> TestResult
 *
 * 型別（JSDoc）：見 streamer-test-data.js 的 @typedef 定義。
 * ------------------------------------------------------------------
 */

(function () {
  'use strict';

  // ─────────────────────────────────────────────────────────
  // 1. 資料層取得（雙運行環境相容）
  // ─────────────────────────────────────────────────────────
  let DATA;
  if (typeof window !== 'undefined' && window.STMT_DATA) {
    DATA = window.STMT_DATA;
  } else if (typeof module !== 'undefined' && module.exports) {
    // Node.js
    DATA = require('./streamer-test-data.js');
  } else {
    throw new Error('[streamer-test-core] STMT_DATA not available');
  }

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
  } = DATA;

  // 建立查表結構
  const QUESTION_BY_ID = new Map(QUESTIONS.map(q => [q.id, q]));
  const MODULE_BY_KEY = new Map(MODULES.map(m => [m.key, m]));

  // ─────────────────────────────────────────────────────────
  // 2. 反向計分
  // ─────────────────────────────────────────────────────────
  /**
   * 對單題原始作答值做反向換算（若為反向題）。
   *   1 -> 5, 2 -> 4, 3 -> 3, 4 -> 2, 5 -> 1
   * @param {number} rawValue  使用者選擇的原始分數 (1-5)
   * @param {boolean} isReverse  是否為反向題
   * @returns {number}
   */
  function applyReverseScore(rawValue, isReverse) {
    const v = Number(rawValue);
    if (!Number.isFinite(v) || v < 1 || v > 5) {
      throw new Error(`[applyReverseScore] invalid answer value: ${rawValue}`);
    }
    return isReverse ? 6 - v : v;
  }

  // ─────────────────────────────────────────────────────────
  // 3. 模組分數
  // ─────────────────────────────────────────────────────────
  /**
   * 計算每個模組的原始總分與百分制分數。
   * @param {Object.<number, number>} answers  key = questionId, value = 1-5
   * @returns {Array<{key:string, name:string, raw:number, percent:number, questionCount:number}>}
   */
  function calculateModuleScores(answers) {
    if (!answers || typeof answers !== 'object') {
      throw new Error('[calculateModuleScores] answers must be an object');
    }

    // 初始化每個模組桶子
    const buckets = {};
    for (const m of MODULES) {
      buckets[m.key] = { raw: 0, count: 0 };
    }

    // 逐題累加
    for (const q of QUESTIONS) {
      const rawAnswer = answers[q.id];
      if (rawAnswer == null) continue; // 允許缺答（在 buildResult 之前應該先做完整性驗證）
      const scored = applyReverseScore(rawAnswer, q.reverse);
      buckets[q.module].raw += scored;
      buckets[q.module].count += 1;
    }

    // 產出模組結果
    return MODULES.map(m => {
      const bucket = buckets[m.key];
      const maxRaw = 5 * bucket.count || 50; // 若尚未作答完，仍以已作答題數估算
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
  // 4. 加權總分
  // ─────────────────────────────────────────────────────────
  /**
   * 依模組權重加總。
   * @param {Array<{key:string, percent:number}>} moduleScores
   * @returns {number} 0-100
   */
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
  // 5. 主播分型
  // ─────────────────────────────────────────────────────────
  /**
   * 將 moduleScores 轉換為 { moduleKey: percent } 的簡單物件。
   * @param {Array<{key:string, percent:number}>} moduleScores
   */
  function toPercentMap(moduleScores) {
    const out = {};
    for (const ms of moduleScores) out[ms.key] = ms.percent;
    return out;
  }

  /**
   * 依 STMT_PROFILE_RULES 的優先順序回傳第一個 match 的分型 key。
   * 若都沒 match，回傳 STMT_PROFILE_FALLBACK。
   * @param {Object.<string, number>} modulePercents  { moduleKey: percent }
   * @param {number} totalScore
   * @returns {string} profile key
   */
  function matchProfile(modulePercents, totalScore) {
    for (const rule of PROFILE_RULES) {
      try {
        if (rule.test(modulePercents, totalScore) === true) {
          return rule.profile;
        }
      } catch (e) {
        // 保護：某個規則寫壞不會讓整個分型失效
        // eslint-disable-next-line no-console
        console.warn('[matchProfile] rule error:', rule.profile, e);
      }
    }
    return PROFILE_FALLBACK;
  }

  // ─────────────────────────────────────────────────────────
  // 6. 風險預警
  // ─────────────────────────────────────────────────────────
  /**
   * 檢查所有 RISK_RULES，回傳觸發的 risk flag 清單。
   * @param {Object.<string, number>} modulePercents
   * @returns {Array<{key:string, name:string, module:string, threshold:number, advice:string, severity?:string}>}
   */
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
  // 7. 誠實作答檢核（soft flag）
  // ─────────────────────────────────────────────────────────
  /**
   * 三題誠實檢核題平均 >= 4.5 視為過度理想化。
   * @param {Object.<string, number>|null|undefined} lieAnswers  { L1: 1-5, L2: 1-5, L3: 1-5 }
   * @returns {{ triggered: boolean, avg: number, answered: number }}
   */
  function detectLieFlag(lieAnswers) {
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
    const threshold = (typeof DATA.lieThresholdAvg === 'number')
      ? DATA.lieThresholdAvg
      : 4.5;
    return {
      triggered: avg >= threshold,
      avg,
      answered,
      threshold,
    };
  }

  // ─────────────────────────────────────────────────────────
  // 8. Tier 級距
  // ─────────────────────────────────────────────────────────
  /**
   * 依總分找出所屬 tier。
   * @param {number} totalScore
   * @returns {{ key:string, label:string, min:number, max:number, summary:string }}
   */
  function identifyTier(totalScore) {
    for (const t of TIERS) {
      if (totalScore >= t.min && totalScore <= t.max) return t;
    }
    // 邊界保護（理論上不會走到）
    return TIERS[TIERS.length - 1];
  }

  // ─────────────────────────────────────────────────────────
  // 9. 優勢 / 短板 / 行動建議
  // ─────────────────────────────────────────────────────────
  /**
   * 取分數最高的 n 個模組（依 percent 降冪；同分依原本模組順序穩定排序）。
   * @param {Object.<string, number>} modulePercents
   * @param {number} n
   * @returns {Array<{key:string, name:string, shortName:string, percent:number}>}
   */
  function pickStrengths(modulePercents, n = 3) {
    return sortModulesByPercent(modulePercents, 'desc').slice(0, n);
  }

  /**
   * 取分數最低的 n 個模組。
   */
  function pickWeaknesses(modulePercents, n = 2) {
    return sortModulesByPercent(modulePercents, 'asc').slice(0, n);
  }

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

  /**
   * 依「最低 3 個模組」產出 3 條可執行建議。
   * 若專案未提供 MODULE_ADVICE.actionLow，會 fallback 到通用文案。
   * @param {Object.<string, number>} modulePercents
   * @returns {Array<{module:string, moduleName:string, action:string}>}
   */
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
  // 10. 結果總結文案
  // ─────────────────────────────────────────────────────────
  /**
   * 組合結果總結（優先取用 profile.summary，再套入 tier 補述）。
   */
  function buildSummary(profileKey, tierKey) {
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
  // 11. 主入口：組合完整結果
  // ─────────────────────────────────────────────────────────
  /**
   * 完整計算流程。
   * @param {Object.<number, number>} answers    { qid: 1-5 }
   * @param {Object.<string, number>} [lieAnswers]  { L1: 1-5, L2:..., L3:... }
   * @param {{ requireAll?: boolean }} [options]  requireAll=true 時缺題會 throw
   * @returns {TestResult}
   */
  function buildResult(answers, lieAnswers, options) {
    options = options || {};
    const requireAll = options.requireAll !== false; // 預設嚴格

    if (requireAll) {
      const missing = validateAnswersCompleteness(answers);
      if (missing.length > 0) {
        throw new Error(
          `[buildResult] missing answers for question IDs: ${missing.join(', ')}`
        );
      }
    }

    // 1) 模組分數
    const moduleScores = calculateModuleScores(answers);
    const modulePercents = toPercentMap(moduleScores);

    // 2) 總分
    const totalScore = calculateTotalScore(moduleScores);

    // 3) Tier
    const tier = identifyTier(totalScore);

    // 4) 分型
    const profileKey = matchProfile(modulePercents, totalScore);
    const profile = PROFILES[profileKey] || {};

    // 5) 風險
    const riskFlags = computeRiskFlags(modulePercents);

    // 6) 優勢 / 短板
    const strengths = pickStrengths(modulePercents, 3);
    const weaknesses = pickWeaknesses(modulePercents, 2);

    // 7) 行動建議
    const actionItems = buildActionItems(modulePercents);

    // 8) 分型發展路徑
    const paths = PROFILE_PATHS[profileKey] || { recommended: [], avoid: [] };

    // 9) 誠實檢核
    const lieFlag = detectLieFlag(lieAnswers);

    // 10) 摘要
    const summary = buildSummary(profileKey, tier.key);

    /** @type {TestResult} */
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
  // 12. 工具：完整性驗證
  // ─────────────────────────────────────────────────────────
  /**
   * 檢查所有 60 題是否都作答且值合法（1-5 整數）。
   * @param {Object.<number, number>} answers
   * @returns {number[]} 缺題或違規的題號
   */
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
  // 13. 內部工具
  // ─────────────────────────────────────────────────────────
  function round1(n) {
    return Math.round(n * 10) / 10;
  }

  // ─────────────────────────────────────────────────────────
  // 14. 匯出（雙運行環境）
  // ─────────────────────────────────────────────────────────
  const STMT_CORE = {
    // 主入口
    buildResult,
    // 子函式
    applyReverseScore,
    calculateModuleScores,
    calculateTotalScore,
    matchProfile,
    computeRiskFlags,
    detectLieFlag,
    identifyTier,
    pickStrengths,
    pickWeaknesses,
    buildActionItems,
    buildSummary,
    validateAnswersCompleteness,
    toPercentMap,
    // 工具
    round1,
  };

  if (typeof window !== 'undefined') {
    window.STMT_CORE = STMT_CORE;
    // 為了 UI 使用方便，也把常用函式掛在 window 上
    window.stmtBuildResult = buildResult;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = STMT_CORE;
  }
})();
