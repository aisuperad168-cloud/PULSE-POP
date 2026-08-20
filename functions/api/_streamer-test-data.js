/**
 * ============================================================
 * Streamer Test - Data (ES Module version for Cloudflare Worker)
 * ============================================================
 *
 * 這是 /js/streamer-test-data.js 的 ES module 版本。
 *
 * ⚠️ 這個檔案的內容應該與 /js/streamer-test-data.js 保持同步。
 *    如果修改題目/規則/文案，兩邊都要改。
 *    (未來若有時間可以做 build step，這裡先手動複製。)
 * ============================================================
 */

const STMT_VERSION = 1;

/* ============================================================
 *  模組定義（固定順序 = 顯示順序 = 雷達圖順序）
 * ============================================================ */
const STMT_MODULES = [
  {
    key: 'camera_expression',
    name: '鏡頭表達與溝通自信',
    shortName: '鏡頭表達',
    weight: 0.20,
    color: '#FE2C55',
    description: '面對鏡頭時的自信、口條、抗壓、掌控節奏的能力。',
  },
  {
    key: 'audience_interaction',
    name: '互動經營與觀眾感知',
    shortName: '互動經營',
    weight: 0.20,
    color: '#25F4EE',
    description: '感知觀眾狀態、主動連結、把陌生人變社群的能力。',
  },
  {
    key: 'emotional_regulation',
    name: '情緒調節與壓力穩定',
    shortName: '情緒穩定',
    weight: 0.20,
    color: '#FFB37A',
    description: '面對批評、挫折、負面情緒的復原力與自我調節。',
  },
  {
    key: 'self_discipline',
    name: '自律執行與持續輸出',
    shortName: '自律執行',
    weight: 0.15,
    color: '#7B68EE',
    description: '沒有動力時仍能穩定輸出、拒絕分心、長期堅持的能力。',
  },
  {
    key: 'content_creativity',
    name: '風格創造與內容延展',
    shortName: '內容延展',
    weight: 0.15,
    color: '#00F0FF',
    description: '找出獨特角度、延伸話題、建立辨識度的創造力。',
  },
  {
    key: 'boundary_control',
    name: '邊界感與風險控管',
    shortName: '邊界控管',
    weight: 0.10,
    color: '#4ADE80',
    description: '分辨可分享 / 不可分享、拒絕越界誘導、保護自己的自覺。',
  },
];

/* ============================================================
 *  題庫（60 題 · 每模組 10 題 · reverse 欄位嚴格對應題目編號）
 *  題目來源：客戶提供的規格書
 *  反向題號：2, 4, 8, 10, 14, 19, 22, 24, 26, 29, 32, 36, 39, 44, 48, 52, 54, 57
 * ============================================================ */
const STMT_REVERSE_IDS = new Set([2, 4, 8, 10, 14, 19, 22, 24, 26, 29, 32, 36, 39, 44, 48, 52, 54, 57]);

/** @type {Question[]} */
const STMT_QUESTIONS_RAW = [
  // ---- 模組 A：鏡頭表達與溝通自信 (1-10) ----
  { id: 1,  module: 'camera_expression', text: '面對鏡頭說話時，我通常能很快進入狀態。' },
  { id: 2,  module: 'camera_expression', text: '要對一群陌生人講話時，我會明顯緊張。' },
  { id: 3,  module: 'camera_expression', text: '就算沒有完整準備，我也能自然地把話說下去。' },
  { id: 4,  module: 'camera_expression', text: '當大家都在看我時，我容易腦袋一片空白。' },
  { id: 5,  module: 'camera_expression', text: '我能在短時間內把一件事講得清楚、有重點。' },
  { id: 6,  module: 'camera_expression', text: '開場時我通常知道怎麼迅速抓住注意力。' },
  { id: 7,  module: 'camera_expression', text: '如果講錯一句話，我能很快接回來，不會卡住太久。' },
  { id: 8,  module: 'camera_expression', text: '一想到要長時間對鏡頭說話，我就會有壓力。' },
  { id: 9,  module: 'camera_expression', text: '我在公開表達時，聲音和情緒通常能保持穩定。' },
  { id: 10, module: 'camera_expression', text: '比起私下聊天，我在公開說話時表現會明顯變差。' },

  // ---- 模組 B：互動經營與觀眾感知 (11-20) ----
  { id: 11, module: 'audience_interaction', text: '我會主動注意他人的回應，並調整自己的說法。' },
  { id: 12, module: 'audience_interaction', text: '當聊天室或現場氣氛變冷時，我通常知道怎麼把氣氛拉回來。' },
  { id: 13, module: 'audience_interaction', text: '我喜歡一邊表達、一邊和觀眾互動，而不是只單向輸出。' },
  { id: 14, module: 'audience_interaction', text: '如果有人留言插話，我常會被打亂節奏。' },
  { id: 15, module: 'audience_interaction', text: '我能讓別人感到「有被我注意到」。' },
  { id: 16, module: 'audience_interaction', text: '我會記得常互動的人說過什麼，並在之後接續話題。' },
  { id: 17, module: 'audience_interaction', text: '比起把內容講完，我也會在意觀眾有沒有跟上。' },
  { id: 18, module: 'audience_interaction', text: '面對不同類型的人，我通常能調整互動方式。' },
  { id: 19, module: 'audience_interaction', text: '觀眾反應和我預期不一樣時，我容易變得不自然。' },
  { id: 20, module: 'audience_interaction', text: '我擅長把零散的互動慢慢變成熟悉的社群感。' },

  // ---- 模組 C：情緒調節與壓力穩定 (21-30) ----
  { id: 21, module: 'emotional_regulation', text: '當我被批評時，我通常能先消化再決定怎麼回應。' },
  { id: 22, module: 'emotional_regulation', text: '只要有人公開否定我，我會很難從情緒中抽離。' },
  { id: 23, module: 'emotional_regulation', text: '即使狀況不順，我也能先把該做的事做完。' },
  { id: 24, module: 'emotional_regulation', text: '當我情緒上來時，我容易說出之後會後悔的話。' },
  { id: 25, module: 'emotional_regulation', text: '面對壓力時，我通常能維持基本表現。' },
  { id: 26, module: 'emotional_regulation', text: '被誤解或被帶風向時，我容易整個人失去節奏。' },
  { id: 27, module: 'emotional_regulation', text: '我有自己讓情緒穩下來的方法。' },
  { id: 28, module: 'emotional_regulation', text: '就算某一場表現不好，我也能在下一次重新開始。' },
  { id: 29, module: 'emotional_regulation', text: '當我感受到負面情緒時，我常不知道怎麼處理。' },
  { id: 30, module: 'emotional_regulation', text: '遇到挫折時，我恢復狀態的速度通常算快。' },

  // ---- 模組 D：自律執行與持續輸出 (31-40) ----
  { id: 31, module: 'self_discipline', text: '就算當下沒什麼動力，我仍能照計畫完成該做的事。' },
  { id: 32, module: 'self_discipline', text: '我傾向等到有感覺時才開始行動。' },
  { id: 33, module: 'self_discipline', text: '如果要固定產出內容，我能維持一定節奏。' },
  { id: 34, module: 'self_discipline', text: '我做事通常有安排，而不是想到什麼做什麼。' },
  { id: 35, module: 'self_discipline', text: '長期看不到明顯成績時，我也能先撐住一段時間。' },
  { id: 36, module: 'self_discipline', text: '我常因為心情起伏而中斷原本的計畫。' },
  { id: 37, module: 'self_discipline', text: '我願意花時間準備，讓正式呈現更穩。' },
  { id: 38, module: 'self_discipline', text: '比起短期熱情，我更有辦法持續做重複的累積。' },
  { id: 39, module: 'self_discipline', text: '我很容易因為其他新鮮事分心，放掉原本要經營的方向。' },
  { id: 40, module: 'self_discipline', text: '我可以接受成長很慢，但仍持續優化內容。' },

  // ---- 模組 E：風格創造與內容延展 (41-50) ----
  { id: 41, module: 'content_creativity', text: '同一個主題，我通常能找到自己的切入方式。' },
  { id: 42, module: 'content_creativity', text: '我能把日常小事講得有趣或有畫面。' },
  { id: 43, module: 'content_creativity', text: '要我持續想新題材時，我通常不會太痛苦。' },
  { id: 44, module: 'content_creativity', text: '我常擔心自己講的東西太普通、太無聊。' },
  { id: 45, module: 'content_creativity', text: '我有能力把一個話題延伸出多個角度。' },
  { id: 46, module: 'content_creativity', text: '我的表達方式通常有一點自己的辨識度。' },
  { id: 47, module: 'content_creativity', text: '面對臨時話題，我通常能很快組織出說法。' },
  { id: 48, module: 'content_creativity', text: '如果沒有別人帶話題，我常不知道要講什麼。' },
  { id: 49, module: 'content_creativity', text: '我會主動觀察受眾喜歡什麼，再思考怎麼做成自己的風格。' },
  { id: 50, module: 'content_creativity', text: '我不只想把內容講完，也會在意內容有沒有記憶點。' },

  // ---- 模組 F：邊界感與風險控管 (51-60) ----
  { id: 51, module: 'boundary_control', text: '我知道哪些私事可以分享，哪些不適合公開。' },
  { id: 52, module: 'boundary_control', text: '為了拉近距離，我有時會不小心講太多自己的私事。' },
  { id: 53, module: 'boundary_control', text: '當別人故意挑釁時，我通常不會立刻上鉤。' },
  { id: 54, module: 'boundary_control', text: '如果現場氣氛在拱，我有時會講出超過分寸的話。' },
  { id: 55, module: 'boundary_control', text: '我能分辨「真誠互動」和「過度迎合」的差別。' },
  { id: 56, module: 'boundary_control', text: '我知道如何在親近觀眾和保護自己之間取得平衡。' },
  { id: 57, module: 'boundary_control', text: '當我被觀眾情緒綁住時，我很難設下界線。' },
  { id: 58, module: 'boundary_control', text: '我對可能引發爭議的話題通常有基本警覺。' },
  { id: 59, module: 'boundary_control', text: '就算想衝流量，我也不太會用自己承受不了的方式去換曝光。' },
  { id: 60, module: 'boundary_control', text: '我能把「主播角色」和「真實私生活」做適度區分。' },
];

/** @type {Question[]} — 依 STMT_REVERSE_IDS 自動填入 reverse 欄位 */
const STMT_QUESTIONS = STMT_QUESTIONS_RAW.map(q => ({
  ...q,
  reverse: STMT_REVERSE_IDS.has(q.id),
}));

/* ============================================================
 *  誠實作答檢核題（可選 · 不計入主分）
 *  規則：3 題平均分數 >= 4.5 視為過度理想化，lieFlagged = true
 * ============================================================ */
/** @type {LieQuestion[]} */
const STMT_LIE_QUESTIONS = [
  { id: 'L1', text: '我幾乎從不犯錯。',                     maxScore: 4 },
  { id: 'L2', text: '不管任何情況，我都完全不會緊張。',     maxScore: 4 },
  { id: 'L3', text: '我總是能完美控制自己的情緒。',         maxScore: 4 },
];
const STMT_LIE_THRESHOLD_AVG = 4.5;

/* ============================================================
 *  風險規則（模組分數 < 55 觸發）
 * ============================================================ */
/** @type {Object.<RiskFlagKey, {key:RiskFlagKey, module:ModuleKey, threshold:number, name:string, description:string, advice:string}>} */
const STMT_RISK_RULES = {
  high_exposure_anxiety: {
    key: 'high_exposure_anxiety',
    module: 'camera_expression',
    threshold: 55,
    name: '高曝光焦慮風險',
    description: '在鏡頭前容易緊張、卡詞或喪失節奏，直接上線可能會被觀眾感受到不安。',
    advice: '建議先從短影音、預錄練習開始，並安排每週 2–3 次 15 分鐘的鏡頭練習，逐步降低生理反應。',
  },
  emotional_burst: {
    key: 'emotional_burst',
    module: 'emotional_regulation',
    threshold: 55,
    name: '情緒失速風險',
    description: '面對批評、酸民或臨場失誤時，情緒反應可能過強，容易在直播中做出不可逆的言行。',
    advice: '建議先建立情緒 SOP（例如：遇到攻擊先靜音 3 秒），並定期與經紀人回顧回饋，避免自我損耗。',
  },
  three_minute_heat: {
    key: 'three_minute_heat',
    module: 'self_discipline',
    threshold: 55,
    name: '三分鐘熱度風險',
    description: '缺乏持續輸出的節奏，容易在 1–2 個月內熱情消退，斷播是最大風險。',
    advice: '建議先訂 4 週最小可行計畫（例如每週 3 播 × 90 分鐘），並綁定固定時段，讓「開播」變成習慣而非決定。',
  },
  content_drought: {
    key: 'content_drought',
    module: 'content_creativity',
    threshold: 55,
    name: '內容乾枯風險',
    description: '難以持續產出新題材，長期下來直播內容會重複、觀眾流失。',
    advice: '建議先建立「30 個常備話題庫」+「每週補充 3 個新話題」的內容製造流程，降低對即興的依賴。',
  },
  over_exposure: {
    key: 'over_exposure',
    module: 'boundary_control',
    threshold: 55,
    name: '過度暴露 / 爭議風險',
    description: '對於私生活、爭議話題、拱火場面的界線感較弱，容易被觀眾情緒帶走、講出後悔的話。',
    advice: '建議先與經紀人一起列出「可分享 / 不可分享 / 絕對不談」三張清單，並在每次開播前提醒自己。',
  },
};

/* ============================================================
 *  分型定義
 * ============================================================ */
/** @type {Object.<ProfileTypeKey, {key:ProfileTypeKey, name:string, tagline:string, description:string, emoji:string, color:string}>} */
const STMT_PROFILES = {
  stage: {
    key: 'stage',
    name: '鏡頭舞台型',
    tagline: '天生為鏡頭而生的表演型主播',
    emoji: '🎤',
    color: '#FE2C55',
    description: '你在鏡頭前有明顯的存在感與掌控力，能把表達、互動與內容結合成一場完整的秀。適合走高強度、高曝光、走秀感強的路線。',
  },
  companion: {
    key: 'companion',
    name: '社群陪伴型',
    tagline: '把觀眾變朋友的長期經營者',
    emoji: '💬',
    color: '#7B68EE',
    description: '你的優勢不在爆發，而在延續。你能讓觀眾覺得「被記得、被理解」，非常適合走陪伴、深度互動、粉絲社群經營路線。',
  },
  knowledge: {
    key: 'knowledge',
    name: '知識內容型',
    tagline: '有料、可延伸、能被搜尋到的專業主播',
    emoji: '📚',
    color: '#25F4EE',
    description: '你能持續產出有結構、有觀點的內容，適合走專題、垂直領域、教學或觀點型主播路線。長期價值高，累積效應強。',
  },
  stable: {
    key: 'stable',
    name: '穩定經營型',
    tagline: '不會爆但也不會塌的長線選手',
    emoji: '🛡️',
    color: '#4ADE80',
    description: '你的自律、情緒穩定、邊界感都在均值以上，適合走可預期、低風險的長線經營路線。收入不會頂尖，但很少大跌。',
  },
  high_potential: {
    key: 'high_potential',
    name: '高潛待訓型',
    tagline: '有天分但需要陪跑的璞玉',
    emoji: '💎',
    color: '#FFB37A',
    description: '你在某個核心能力上有明顯天分，但情緒或自律其中一項還沒到位。強烈建議先接受系統訓練再上線，避免天賦被消耗。',
  },
  not_recommended: {
    key: 'not_recommended',
    name: '不建議直接上線型',
    tagline: '建議先充值準備、不急於開播',
    emoji: '⏸️',
    color: '#94A3B8',
    description: '目前的鏡頭表達、情緒穩定或邊界感等核心能力還沒到直播可上線的水準。急著上線容易受挫、留下負面經驗。建議先做基礎訓練或先評估其他職涯選項。',
  },
};

/* ============================================================
 *  分型判定規則（優先級：由嚴到寬，第一個符合就回傳）
 *
 *  評估方式：規則是「AND」條件，全部符合才算 matched。
 *  優先級順序刻意這樣安排的理由：
 *    1) not_recommended：最保守，先擋住不適合上線的
 *    2) high_potential：有天分但缺自律/情緒 → 需要訓練
 *    3) stable：全模組均衡穩定
 *    4) knowledge：專業型
 *    5) stage：表演型（要求高）
 *    6) companion：陪伴型
 *    7) fallback：走 stable（保底一定回傳一個）
 * ============================================================ */
/** @type {Array<{profile: ProfileTypeKey, test: (m: Object.<ModuleKey, number>, total: number) => boolean}>} */
const STMT_PROFILE_RULES = [
  // Rule 1：不建議直接上線型
  {
    profile: 'not_recommended',
    test: (m, total) => {
      if (total < 55) return true;
      // 三項核心（鏡頭 / 情緒 / 邊界）其中兩項 < 55
      const critical = [m.camera_expression, m.emotional_regulation, m.boundary_control];
      const belowCount = critical.filter(v => v < 55).length;
      return belowCount >= 2;
    },
  },
  // Rule 2：高潛待訓型
  {
    profile: 'high_potential',
    test: (m) => {
      const anyCore75 =
        m.camera_expression >= 75 ||
        m.audience_interaction >= 75 ||
        m.content_creativity >= 75;
      const unstable = m.emotional_regulation < 60 || m.self_discipline < 60;
      return anyCore75 && unstable;
    },
  },
  // Rule 3：穩定經營型（自律 + 情緒 + 邊界都高）
  {
    profile: 'stable',
    test: (m) => (
      m.emotional_regulation >= 75 &&
      m.self_discipline >= 75 &&
      m.boundary_control >= 70
    ),
  },
  // Rule 4：知識內容型
  {
    profile: 'knowledge',
    test: (m) => (
      m.self_discipline >= 75 &&
      m.content_creativity >= 75 &&
      m.camera_expression >= 60
    ),
  },
  // Rule 5：鏡頭舞台型（4 個模組門檻）
  {
    profile: 'stage',
    test: (m) => (
      m.camera_expression >= 75 &&
      m.audience_interaction >= 70 &&
      m.content_creativity >= 65 &&
      m.emotional_regulation >= 60
    ),
  },
  // Rule 6：社群陪伴型
  {
    profile: 'companion',
    test: (m) => (
      m.audience_interaction >= 80 &&
      m.emotional_regulation >= 70 &&
      m.boundary_control >= 65
    ),
  },
];

/** 若所有規則都不符合，最終 fallback（保證一定會回傳一個 profile） */
const STMT_PROFILE_FALLBACK = 'stable';

/* ============================================================
 *  總分分級
 * ============================================================ */
/** @type {Array<{key: TierKey, label: string, min: number, max: number, summary: string}>} */
const STMT_TIERS = [
  {
    key: 'excellent',
    label: '高適配型',
    min: 85, max: 100,
    summary: '你的整體條件已經達到可以直接上線的水準，各項能力均衡且不太有明顯短板。建議進入正式培訓與導流流程。',
  },
  {
    key: 'developing',
    label: '發展型',
    min: 70, max: 84,
    summary: '你具備成為主播的核心條件，某些項目已經足夠強。建議搭配針對性訓練 1–2 個月，再進入正式上線階段。',
  },
  {
    key: 'potential',
    label: '潛力型',
    min: 55, max: 69,
    summary: '你有潛質，但目前尚未達到「直接上線」的準備。建議先接受系統性培訓，鎖定 2–3 個核心弱項改善。',
  },
  {
    key: 'training',
    label: '待訓型',
    min: 40, max: 54,
    summary: '你目前的準備度離上線還有明顯距離。建議不要急著開播，先從短影音、預錄練習、小型互動場練起。',
  },
  {
    key: 'unstable',
    label: '不穩定型',
    min: 0, max: 39,
    summary: '目前狀態不建議直接進入直播工作，可能對心理健康造成負擔。建議先做自我準備、或評估其他更合適的職涯方向。',
  },
];

/* ============================================================
 *  結果文案模板系統
 *  - moduleAdvice: 依「該模組是高分/低分」對應建議
 *  - profilePaths:  依主播分型給推薦與避開的方向
 *  - actionRules:   依低分模組推 3 條可執行提升建議
 * ============================================================ */

/** 每個模組的高分/低分文案（用於結果頁優勢/短板） */
const STMT_MODULE_ADVICE = {
  camera_expression: {
    high: '鏡頭前的自信與節奏掌握力是你最大的資產',
    low:  '鏡頭前的緊張與斷片頻率仍偏高，需要專門訓練',
    actionHigh: '每週選 1 場作為「打磨場」，把開場、換題、收尾三個關鍵點做到極致。',
    actionLow:  '從每天 15 分鐘鏡頭獨白練起，錄下來檢視語速、眼神與換氣。',
  },
  audience_interaction: {
    high: '你能自然地讓觀眾感覺「被看見」，這是長期社群的關鍵',
    low:  '對觀眾即時反應的敏感度不足，容易變成單向廣播',
    actionHigh: '把 3–5 位常留言的粉絲名字建成小卡，開播時主動點名互動、強化黏著。',
    actionLow:  '每次開播設定「至少回應 20 則留言」的硬指標，訓練從單向表達切換到雙向互動。',
  },
  emotional_regulation: {
    high: '你的抗壓力與復原速度是可以走長線的基礎',
    low:  '情緒的起伏會直接影響直播品質，這是目前最需要處理的區塊',
    actionHigh: '把你自己的情緒調節方法寫成 SOP，未來作為新主播訓練素材。',
    actionLow:  '每次開播前做 3 分鐘呼吸練習，並設一位「熄火按鈕人」（經紀人或朋友）在旁邊。',
  },
  self_discipline: {
    high: '你可以維持長期產出，這在直播圈是稀缺能力',
    low:  '你目前的執行節奏還很依賴心情，這對主播工作是硬傷',
    actionHigh: '把節奏拉高一點：從每週 3 播進化到 5 播，同時控制不掉品質。',
    actionLow:  '訂 4 週最小可行計畫（每週固定 3 播 × 90 分），並公開告知觀眾，用外部承諾綁定行動。',
  },
  content_creativity: {
    high: '你能持續產出有記憶點的內容，適合走差異化路線',
    low:  '目前題材偏被動、辨識度不足，長期會遇到內容天花板',
    actionHigh: '把你近 20 場的高潮片段整理成「風格關鍵字」，強化人設一致性。',
    actionLow:  '建立 30 個常備話題庫，並每週補充 3 個新話題，先解決「不知道要講什麼」的問題。',
  },
  boundary_control: {
    high: '你有明確的自我保護意識，比大多數新人成熟',
    low:  '對於界線與爭議的敏感度不足，長期可能會被拱、被消耗',
    actionHigh: '維持現有節奏，並建立危機應對 SOP（收到私訊騷擾 / 爭議留言 / 邀約異常時怎麼處理）。',
    actionLow:  '和經紀人一起列出「可分享 / 不可分享 / 絕對不談」三張清單，並貼在你可以看到的位置。',
  },
};

/** 每個分型的發展路線建議 */
/** @type {Object.<ProfileTypeKey, {recommended: string[], avoid: string[]}>} */
const STMT_PROFILE_PATHS = {
  stage: {
    recommended: [
      '主打「表演感 + 高互動」的直播間路線（歌唱、才藝、唱跳、變裝）',
      'PK / 擂台場、活動主持與跨會 PK 是加速起飛的關鍵',
      '短影音與 REELS 引流：你有畫面感，長內容剪成 15–30 秒容易爆',
    ],
    avoid: [
      '純陪聊、慢節奏的深夜私聊型直播間（優勢用不出來、還會覺得無聊）',
      '純知識分享型（時間長、觀眾難累積、你會流失表演能量）',
    ],
  },
  companion: {
    recommended: [
      '固定時段的陪聊 / 深夜聊天型直播間，深耕小而美的社群',
      '會員經營、粉絲群、私訊回覆等 1-on-many 互動場景',
      '節目化的長期單元（每週三 08 點聽故事、每週五塔羅…）',
    ],
    avoid: [
      '短時間 PK 衝榜、拱錢型的高強度場（消耗過大、和你優勢不合）',
      '追求快速爆紅、大量短影音導流的模式（你更適合細火慢燉）',
    ],
  },
  knowledge: {
    recommended: [
      '主題化 / 系列化直播（星期一講穿搭、星期三講理財、星期五 Q&A）',
      '長影片 / Podcast 平行經營，把直播內容轉成可搜尋的資產',
      '進駐特定垂直圈層（美妝、理財、遊戲、健身…），建立信任',
    ],
    avoid: [
      '純情緒 / 純陪聊型場景（你的優勢是內容深度，不是即時黏著）',
      '快節奏 PK 場（會逼你放棄結構化表達）',
    ],
  },
  stable: {
    recommended: [
      '固定時段、固定主題的長線經營型直播間',
      '團體 / 家族制主播（穩定人設 + 團體互相拉抬）',
      '和品牌方合作的長期業配（你的穩定性適合做品牌代言人）',
    ],
    avoid: [
      '需要極端情緒煽動或爭議話題的路線（浪費你的長板）',
      '純爆發型 PK（可以偶爾參加，但不建議當主軸）',
    ],
  },
  high_potential: {
    recommended: [
      '先接受 4–8 週系統培訓，補齊情緒 / 自律短板再正式上線',
      '培訓期間先做預錄短影音，累積作品但不急著開直播',
      '找一位經驗豐富的主播當導師 / mentor',
    ],
    avoid: [
      '沒有訓練就進入高強度 PK 場（會消耗你的天賦）',
      '每天長時間直播 4 小時以上（你的耐性目前扛不住）',
    ],
  },
  not_recommended: {
    recommended: [
      '先評估自己開播的動機：是興趣、賺快錢，還是逃避現況？',
      '如果仍想進入這個產業，建議先從「主播助理 / 場控 / 內容企劃」等幕後角色開始',
      '把 3 個月當作準備期，做鏡頭練習、短影音、觀察優秀主播',
    ],
    avoid: [
      '直接進入直播工作（會很快受挫、留下負面經驗）',
      '簽長期分潤合約前不要先開播',
    ],
  },
};

/* ============================================================
 *  Runtime 匯出（雙相容）
 * ============================================================ */
// ============================================================
// ES module exports for Cloudflare Worker
// ============================================================
export const version = STMT_VERSION;
export const modules = STMT_MODULES;
export const questions = STMT_QUESTIONS;
export const lieQuestions = STMT_LIE_QUESTIONS;
export const lieThresholdAvg = STMT_LIE_THRESHOLD_AVG;
export const riskRules = STMT_RISK_RULES;
export const profiles = STMT_PROFILES;
export const profileRules = STMT_PROFILE_RULES;
export const profileFallback = STMT_PROFILE_FALLBACK;
export const profilePaths = STMT_PROFILE_PATHS;
export const tiers = STMT_TIERS;
export const moduleAdvice = STMT_MODULE_ADVICE;
