/**
 * ============================================================
 * Rookie Test - Data (ES Module version for Cloudflare Worker)
 * ============================================================
 *
 * 這是 /js/rookie-test-data.js 的 ES module 版本。
 *
 * ⚠️ 這個檔案的內容應該與 /js/rookie-test-data.js 保持同步。
 *    如果修改題目/規則/文案，兩邊都要改。
 *    (未來若有時間可以做 build step，這裡先手動複製。)
 * ============================================================
 */

const ROOK_VERSION = 1;

/* ============================================================
 *  模組定義（固定順序 = 顯示順序）
 * ============================================================ */
const ROOK_MODULES = [
  {
    key: 'expression',
    name: '鏡頭表達與自信',
    shortName: '鏡頭表達',
    weight: 0.20,
    color: '#FE2C55',
    description: '在鏡頭前是否放得開、能自然表達、不會過度緊張。',
  },
  {
    key: 'interaction',
    name: '互動熱度與親和力',
    shortName: '互動熱度',
    weight: 0.20,
    color: '#25F4EE',
    description: '面對陌生觀眾能否主動連結、讓對方感到被回應。',
  },
  {
    key: 'stability',
    name: '心理穩定與抗壓',
    shortName: '心理穩定',
    weight: 0.20,
    color: '#FFB37A',
    description: '面對批評、失誤、負面留言的復原速度與情緒穩定度。',
  },
  {
    key: 'discipline',
    name: '自律與持續性',
    shortName: '自律持續',
    weight: 0.15,
    color: '#7B68EE',
    description: '就算沒動力也能穩定開播、不會三分鐘熱度。',
  },
  {
    key: 'contentPotential',
    name: '內容潛力與話題感',
    shortName: '內容潛力',
    weight: 0.15,
    color: '#00F0FF',
    description: '有沒有自己的觀點、能不能把日常變話題、辨識度夠不夠。',
  },
  {
    key: 'boundary',
    name: '界線意識與自我保護',
    shortName: '界線意識',
    weight: 0.10,
    color: '#4ADE80',
    description: '能不能分辨可分享 / 不可分享、拒絕越界誘導、保護自己。',
  },
];

/* ============================================================
 *  題庫（24 題）· 反向 ID：{2,4,8,10,12,14,19,22,24}
 * ============================================================ */
const ROOK_REVERSE_IDS = new Set([2, 4, 8, 10, 12, 14, 19, 22, 24]);

const ROOK_QUESTIONS_RAW = [
  // ---- 模組 A：鏡頭表達與自信 (1-4) ----
  { id: 1, module: 'expression',       text: '我不排斥被鏡頭拍到，甚至有點享受被關注的感覺。' },
  { id: 2, module: 'expression',       text: '想到要對鏡頭一個人講話 30 分鐘，我會覺得很有壓力。' },
  { id: 3, module: 'expression',       text: '就算沒完全準備好，我也能自然地把話說下去。' },
  { id: 4, module: 'expression',       text: '當大家都在看我的時候，我容易腦袋一片空白。' },

  // ---- 模組 B：互動熱度與親和力 (5-8) ----
  { id: 5, module: 'interaction',      text: '和陌生人聊天時，我通常能很快找到話題。' },
  { id: 6, module: 'interaction',      text: '我會注意對方的反應，並主動調整自己的說話方式。' },
  { id: 7, module: 'interaction',      text: '別人跟我互動時，我常能讓他覺得「有被我注意到」。' },
  { id: 8, module: 'interaction',      text: '和不熟的人聊天，我通常會等對方先開口。' },

  // ---- 模組 C：心理穩定與抗壓 (9-12) ----
  { id: 9,  module: 'stability',        text: '當我被批評時，我通常能先消化情緒再決定怎麼回應。' },
  { id: 10, module: 'stability',        text: '有人公開否定我時，我會很難從情緒中抽離。' },
  { id: 11, module: 'stability',        text: '面對突發狀況，我通常能維持基本的表現。' },
  { id: 12, module: 'stability',        text: '負面留言或惡意攻擊會嚴重影響我當天的心情。' },

  // ---- 模組 D：自律與持續性 (13-16) ----
  { id: 13, module: 'discipline',       text: '就算當下沒動力，我也能照計畫完成該做的事。' },
  { id: 14, module: 'discipline',       text: '我常常因為心情或分心，中斷原本要做的事。' },
  { id: 15, module: 'discipline',       text: '如果要固定產出內容，我能維持一定節奏。' },
  { id: 16, module: 'discipline',       text: '長期看不到成果時，我也能先撐住一段時間繼續累積。' },

  // ---- 模組 E：內容潛力與話題感 (17-20) ----
  { id: 17, module: 'contentPotential', text: '我常能把日常的小事講得有趣或有畫面感。' },
  { id: 18, module: 'contentPotential', text: '同一個話題，我通常能找到自己的切入角度。' },
  { id: 19, module: 'contentPotential', text: '如果沒有別人帶話題，我常不知道要講什麼。' },
  { id: 20, module: 'contentPotential', text: '我平常會主動觀察流行、記下有趣的事想分享。' },

  // ---- 模組 F：界線意識與自我保護 (21-24) ----
  { id: 21, module: 'boundary',         text: '我很清楚哪些事可以公開分享、哪些事不適合。' },
  { id: 22, module: 'boundary',         text: '為了讓氣氛熱絡，我有時會不小心講太多自己的私事。' },
  { id: 23, module: 'boundary',         text: '被觀眾情緒帶動時，我仍能守住自己的原則。' },
  { id: 24, module: 'boundary',         text: '如果現場氣氛在拱，我有時會講出超過分寸的話。' },
];

const ROOK_QUESTIONS = ROOK_QUESTIONS_RAW.map(q => ({
  ...q,
  reverse: ROOK_REVERSE_IDS.has(q.id),
}));

/* ============================================================
 *  風險規則（模組分數 < 55 觸發）
 * ============================================================ */
const ROOK_RISK_RULES = {
  stage_fright: {
    key: 'stage_fright',
    module: 'expression',
    threshold: 55,
    name: '鏡頭緊張風險',
    description: '面對鏡頭容易緊張、講不順，剛開播時可能會被觀眾感受到不安。',
    advice: '建議從「每天 15 分鐘鏡頭獨白 + 錄下來檢視」開始，讓身體先適應鏡頭。頭 2 週先不用面對真觀眾。',
  },
  passive_interaction: {
    key: 'passive_interaction',
    module: 'interaction',
    threshold: 55,
    name: '被動互動風險',
    description: '面對陌生人偏被動、等對方先開口，容易讓直播冷場、留言少。',
    advice: '設定「每次開播主動點名 5 位觀眾」的硬指標，並準備 3 個「暖場提問」清單，強迫自己開口。',
  },
  emotion_volatile: {
    key: 'emotion_volatile',
    module: 'stability',
    threshold: 55,
    name: '情緒起伏風險',
    description: '面對批評或負面留言時情緒反應強，容易在直播中做出不可逆的言行。',
    advice: '建立「遇到攻擊先靜音 3 秒」SOP，並和經紀人約好緊急時可以按暫停鍵。頭 3 個月建議關閉即時留言彈幕。',
  },
  discipline_weak: {
    key: 'discipline_weak',
    module: 'discipline',
    threshold: 55,
    name: '三分鐘熱度風險',
    description: '缺乏持續輸出的節奏，可能會在 1-2 個月內熱情消退、開始斷播。',
    advice: '先訂 4 週最小可行計畫（每週固定 3 播 × 90 分），並公開告知觀眾，用外部承諾綁定行動。',
  },
  topic_barren: {
    key: 'topic_barren',
    module: 'contentPotential',
    threshold: 55,
    name: '話題乾枯風險',
    description: '不擅長主動找話題、辨識度低，長期直播容易內容重複、觀眾流失。',
    advice: '建立「30 個常備話題庫」，每週補充 3 個新話題。可以先從「模仿學習」開始，觀察你喜歡的主播如何開展話題。',
  },
  boundary_blur: {
    key: 'boundary_blur',
    module: 'boundary',
    threshold: 55,
    name: '界線模糊風險',
    description: '對於私生活分享、被拱、爭議話題的敏感度不足，長期可能會被消耗、講出後悔的話。',
    advice: '和經紀人一起列出「可分享 / 不可分享 / 絕對不談」三張清單，貼在螢幕旁提醒自己。',
  },
};

/* ============================================================
 *  分型定義
 * ============================================================ */
const ROOK_PROFILES = {
  natural_camera: {
    key: 'natural_camera',
    name: '天生鏡頭感型',
    tagline: '你在鏡頭前自然又放鬆，是最容易被觀眾記住的類型',
    emoji: '🎤',
    color: '#FE2C55',
    description: '你在鏡頭前有天然的存在感與掌控力，情緒穩定、表達自然。這是所有素人條件裡最稀缺的，只要搭配基本訓練就能快速上線。',
  },
  content_sharer: {
    key: 'content_sharer',
    name: '內容分享型',
    tagline: '有想法、有話題，適合走「內容型直播」路線',
    emoji: '📝',
    color: '#25F4EE',
    description: '你的優勢在於「有東西可以分享」——有觀點、有辨識度、能把日常變話題。適合走主題化、系列化的內容型直播，長期價值高。',
  },
  companion_interactive: {
    key: 'companion_interactive',
    name: '陪伴互動型',
    tagline: '你能讓觀眾感覺「被看見」，適合走陪伴社群路線',
    emoji: '💬',
    color: '#7B68EE',
    description: '你的優勢不在爆發、而在延續。你能讓觀眾覺得「被記得、被理解」，適合走陪聊、深度互動、粉絲社群經營。',
  },
  potential_rookie: {
    key: 'potential_rookie',
    name: '潛力待培養型',
    tagline: '有基本條件，但目前需要培訓才適合上線',
    emoji: '🌱',
    color: '#FFB37A',
    description: '你具備成為主播的基本條件，但某個核心模組（表達 / 情緒 / 自律）還沒到位。強烈建議先做 4-8 週系統培訓再上線，避免天賦被消耗。',
  },
};

/* ============================================================
 *  分型判定規則
 * ============================================================ */
const ROOK_PROFILE_RULES = [
  {
    profile: 'natural_camera',
    test: (m, total) => (
      total >= 65 &&
      m.expression >= 75 &&
      m.stability >= 65
    ),
  },
  {
    profile: 'content_sharer',
    test: (m, total) => (
      total >= 60 &&
      m.contentPotential >= 70 &&
      (m.expression >= 60 || m.discipline >= 65)
    ),
  },
  {
    profile: 'companion_interactive',
    test: (m, total) => (
      total >= 55 &&
      m.interaction >= 70 &&
      m.stability >= 60 &&
      m.boundary >= 60
    ),
  },
  {
    profile: 'potential_rookie',
    test: () => true,
  },
];

const ROOK_PROFILE_FALLBACK = 'potential_rookie';

/* ============================================================
 *  總分分級
 * ============================================================ */
const ROOK_TIERS = [
  {
    key: 'excellent',
    label: '高適配｜可直接上線',
    min: 80, max: 100,
    summary: '你的整體條件已經達到可以直接上線的水準，六大能力均衡且沒有明顯短板。建議進入正式培訓與導流流程，把握你目前的最佳狀態。',
  },
  {
    key: 'developing',
    label: '發展中｜具潛力',
    min: 65, max: 79,
    summary: '你具備成為主播的核心條件，某些能力已經足夠強。搭配 4-6 週針對性訓練後就能進入正式上線階段，把短板補起來就會很有競爭力。',
  },
  {
    key: 'potential',
    label: '潛力型｜需要培訓',
    min: 50, max: 64,
    summary: '你有潛質，但目前尚未達到「直接上線」的準備。建議先接受系統性培訓，鎖定 2-3 個核心弱項改善，再進入正式開播階段。',
  },
  {
    key: 'needs_training',
    label: '待訓型｜建議先準備',
    min: 0, max: 49,
    summary: '你目前的準備度離上線還有明顯距離。不建議急著開播，先從短影音、預錄練習、小型互動場慢慢練起，避免留下負面經驗。',
  },
];

/* ============================================================
 *  結果文案模板
 * ============================================================ */
const ROOK_MODULE_ADVICE = {
  expression: {
    high: '你在鏡頭前的自信與自然度是你最大的資產',
    low:  '鏡頭前的緊張與斷片還會影響你的表現，需要專門訓練',
    actionHigh: '每週選 1 場作為「打磨場」，把開場、換題、收尾三個關鍵點做到極致。',
    actionLow:  '從每天 15 分鐘鏡頭獨白練起，錄下來檢視語速、眼神與換氣。頭 2 週不用面對真觀眾。',
  },
  interaction: {
    high: '你能自然讓對方感覺「被看見」，這是社群經營的關鍵能力',
    low:  '對觀眾的即時反應敏感度不足，容易變成單向廣播',
    actionHigh: '把 3-5 位常留言的粉絲名字建成小卡，開播主動點名互動、強化黏著。',
    actionLow:  '每次開播設定「至少回應 20 則留言」的硬指標，訓練從單向表達切換到雙向互動。',
  },
  stability: {
    high: '你的情緒穩定與抗壓復原力是可以走長線的基礎',
    low:  '情緒起伏會直接影響直播品質，這是目前最需要處理的區塊',
    actionHigh: '把你自己的情緒調節方法寫成 SOP，未來作為新主播訓練素材。',
    actionLow:  '每次開播前做 3 分鐘呼吸練習，並設一位「熄火按鈕人」（經紀人或朋友）在旁邊。',
  },
  discipline: {
    high: '你能維持長期產出節奏，這在直播圈是稀缺能力',
    low:  '你目前的執行還依賴心情，這對主播工作是硬傷',
    actionHigh: '把節奏拉高一點：從每週 3 播進化到 5 播，同時控制不掉品質。',
    actionLow:  '訂 4 週最小可行計畫（每週固定 3 播 × 90 分），並公開告知觀眾，用外部承諾綁定行動。',
  },
  contentPotential: {
    high: '你能持續產出有記憶點的內容，適合走差異化路線',
    low:  '目前題材偏被動、辨識度不足，長期會遇到內容天花板',
    actionHigh: '把近期最有反應的話題整理成「風格關鍵字」，強化人設一致性。',
    actionLow:  '建立 30 個常備話題庫，並每週補充 3 個新話題，先解決「不知道要講什麼」的問題。',
  },
  boundary: {
    high: '你有明確的自我保護意識，比大多數新人成熟',
    low:  '對於界線與爭議的敏感度不足，長期可能會被拱、被消耗',
    actionHigh: '維持現有節奏，並建立危機應對 SOP（收到私訊騷擾 / 爭議留言 / 邀約異常時怎麼處理）。',
    actionLow:  '和經紀人一起列出「可分享 / 不可分享 / 絕對不談」三張清單，並貼在你可以看到的位置。',
  },
};

/* ============================================================
 *  分型發展路線
 * ============================================================ */
const ROOK_PROFILE_PATHS = {
  natural_camera: {
    recommended: [
      '直接進入「娛樂互動型」主流直播（唱聊、才藝、變裝、遊戲）',
      'PK / 擂台場、跨會 PK 是加速起飛的關鍵',
      '短影音 + 直播雙軌：你有畫面感，長內容剪成 15-30 秒容易爆',
    ],
    avoid: [
      '純知識深度型（會浪費你的鏡頭優勢）',
      '純陪聊、慢節奏的深夜私聊型（優勢用不出來、還會覺得無聊）',
    ],
  },
  content_sharer: {
    recommended: [
      '主題化 / 系列化直播（例：週一穿搭、週三理財、週五 Q&A）',
      '長影片 / Podcast 平行經營，把直播內容轉成可搜尋資產',
      '進駐特定垂直圈層（美妝、理財、遊戲、健身…），建立信任',
    ],
    avoid: [
      '純情緒 / 純陪聊型場景（你的優勢是內容深度，不是即時黏著）',
      '純爆發型 PK 場（會逼你放棄結構化表達）',
    ],
  },
  companion_interactive: {
    recommended: [
      '固定時段的陪聊 / 深夜聊天型直播間，深耕小而美社群',
      '會員經營、粉絲群、私訊回覆等 1-on-many 互動',
      '節目化的長期單元（例：每週三晚 8 點聽故事、每週五塔羅）',
    ],
    avoid: [
      '短時間 PK 衝榜、拱錢型的高強度場（消耗過大、和你優勢不合）',
      '追求快速爆紅、大量短影音導流的模式（你適合細火慢燉）',
    ],
  },
  potential_rookie: {
    recommended: [
      '先接受 4-8 週系統培訓，補齊短板再正式上線',
      '培訓期間先做預錄短影音，累積作品但不急著開直播',
      '找一位經驗豐富的主播當導師 / mentor',
    ],
    avoid: [
      '沒有訓練就進入高強度 PK 場（會消耗你的天賦）',
      '每天長時間直播 4 小時以上（目前的耐性扛不住）',
    ],
  },
};

// ============================================================
// ES module exports for Cloudflare Worker
// ============================================================
export const version = ROOK_VERSION;
export const modules = ROOK_MODULES;
export const questions = ROOK_QUESTIONS;
export const reverseIds = ROOK_REVERSE_IDS;
export const riskRules = ROOK_RISK_RULES;
export const profiles = ROOK_PROFILES;
export const profileRules = ROOK_PROFILE_RULES;
export const profileFallback = ROOK_PROFILE_FALLBACK;
export const profilePaths = ROOK_PROFILE_PATHS;
export const tiers = ROOK_TIERS;
export const moduleAdvice = ROOK_MODULE_ADVICE;
