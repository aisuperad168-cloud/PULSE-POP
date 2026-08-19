/**
 * ============================================================
 * JDI 脈動傳媒 · 主播類型測驗 · 資料層
 * 6 題選擇題 · 6 種主播類型
 *
 * 分數機制：每個選項對應 1–3 個類型的加分
 * 最終加總最高分的類型 = 你的主播類型
 * ============================================================
 */

// ============ 6 種主播類型定義 ============
window.QUIZ_TYPES = {
  singer: {
    id: 'singer',
    name: '歌唱型主播',
    emoji: '🎤',
    tagline: '用歌聲收粉的實力派',
    color: '#FE2C55',
    gradient: 'linear-gradient(135deg, #FE2C55, #FF6B9D)',
    description: '你是那種只要一開口，就能讓整個直播間安靜下來的人。歌聲是你最強的武器，粉絲會因為你的音色、你的情感詮釋而留下來。你適合走「音樂人設 + 深度互動」的路線。',
    strengths: [
      '高留人率（一首歌就能留住 5 分鐘以上）',
      '粉絲黏著度極高、送禮意願強',
      '容易累積死忠鐵粉、打賞轉化率高'
    ],
    incomeStars: 4,
    bestTime: '晚間 20:00–24:00',
    tips: '建議準備 30 首以上曲目、加強即興演唱能力。與其他歌唱型主播 PK 是快速累粉的關鍵。',
    similarStreamer: '元承烈 37 · 芊芊 coco'
  },
  dancer: {
    id: 'dancer',
    name: '舞蹈唱跳型主播',
    emoji: '💃',
    tagline: '律動與才藝的完美結合',
    color: '#25F4EE',
    gradient: 'linear-gradient(135deg, #25F4EE, #00E5D9)',
    description: '你是那種天生就有「畫面感」的人，肢體表達自然流暢，鏡頭前充滿感染力。你的直播間永遠不無聊，音樂一下就能帶動氣氛，短影音爆紅潛力極高。',
    strengths: [
      '短影音病毒式擴散能力強',
      '視覺吸引力最高、開播即引流',
      '容易接業配、跨平台曝光多'
    ],
    incomeStars: 5,
    bestTime: '晚間 19:00–23:00',
    tips: '建議每週固定產出 3–5 支短影音導流，直播中融入 challenge 挑戰與粉絲互動舞。',
    similarStreamer: '馬妹 · 芊芊 coco'
  },
  chat: {
    id: 'chat',
    name: '聊天陪伴型主播',
    emoji: '💬',
    tagline: '溫暖如家的情感連結',
    color: '#00F0FF',
    gradient: 'linear-gradient(135deg, #00F0FF, #7B68EE)',
    description: '你是那種「聊天就是本體」的人，不需要才藝、不需要炫技，你的溫度、你的傾聽、你的日常分享，就是最強的競爭力。粉絲會把你當朋友、當家人。',
    strengths: [
      '長期經營型（3 個月後爆發力最強）',
      '粉絲團穩定、月流水穩健',
      '心理陪伴需求極大、被喜愛度高'
    ],
    incomeStars: 4,
    bestTime: '晚間 21:00–凌晨 01:00',
    tips: '準備 20 個以上聊天話題模組（星座、感情、職場、生活哲學），加強故事講述能力。',
    similarStreamer: '米姥思 MI · 多多綠 157'
  },
  battle: {
    id: 'battle',
    name: 'PK 競技型主播',
    emoji: '⚔️',
    tagline: '擂台上的爆發力王者',
    color: '#FF3A69',
    gradient: 'linear-gradient(135deg, #FF3A69, #FE2C55)',
    description: '你是熱血、好勝、享受戰鬥的類型。PK 對你來說不是壓力，是舞台。你能在擂台上把粉絲情緒推到最高點，讓「拱火」變成一種藝術。收入天花板超高。',
    strengths: [
      '單場爆發力強（單日破 10 萬營收不是夢）',
      '公會爭霸賽主力、平台流量重點扶持',
      '短時間快速衝榜、話題性高'
    ],
    incomeStars: 5,
    bestTime: '晚間 20:00–凌晨 02:00',
    tips: '建議加強反應速度、話題張力、鐵粉維護。PK 策略比才藝本身更重要。',
    similarStreamer: '芮娜 RN0503'
  },
  talent: {
    id: 'talent',
    name: '才藝生活型主播',
    emoji: '🎨',
    tagline: '獨特專業的內容創作者',
    color: '#FFB84D',
    gradient: 'linear-gradient(135deg, #FFB84D, #FF6B9D)',
    description: '你是有「一技之長」的人 —— 可能是烹飪、手作、美妝、穿搭、命理、寵物飼養…你的專業就是你的護城河，粉絲來這裡不只是消費、更是學東西。',
    strengths: [
      '內容差異化極大、被複製難度高',
      '品牌合作、業配機會多',
      '跨平台變現路徑清晰（IG / YT / 蝦皮）'
    ],
    incomeStars: 4,
    bestTime: '白天 14:00–17:00 或晚間 20:00–22:00',
    tips: '把專業內容拆成「教學 + 娛樂 + 互動」三段，觀眾學到東西就會回訪。',
    similarStreamer: '多元類型（可跨界發展）'
  },
  variety: {
    id: 'variety',
    name: '綜藝互動型主播',
    emoji: '🎪',
    tagline: '幽默感就是最強超能力',
    color: '#7B68EE',
    gradient: 'linear-gradient(135deg, #7B68EE, #FE2C55)',
    description: '你是天生「開心果」型的人，玩梗、整活、帶氣氛是本能。你的直播間永遠都在笑，粉絲上線就像看綜藝節目一樣放鬆。適合玩遊戲、辦活動、跨界連麥。',
    strengths: [
      '爆點多、話題性強、容易被剪輯出圈',
      '連麥合作機會多、粉絲擴散快',
      '任務型直播（遊戲 / 挑戰）表現亮眼'
    ],
    incomeStars: 4,
    bestTime: '晚間 19:00–23:00',
    tips: '每場直播準備 3–5 個「梗點」與 1–2 個「爆點活動」，帶起氛圍後粉絲自然湧入。',
    similarStreamer: '多元類型（可跨界發展）'
  }
};

// ============ 6 題測驗題目 ============
// 每個選項對應 1-3 個類型的加分（分數 1-3）
window.QUIZ_QUESTIONS = [
  {
    q: '你最舒服的自我表達方式是？',
    icon: '🎯',
    options: [
      { text: '用歌聲抒發情緒、療癒自己', emoji: '🎵', scores: { singer: 3, chat: 1 } },
      { text: '用肢體律動、跳舞展現能量',   emoji: '💃', scores: { dancer: 3, variety: 1 } },
      { text: '用聊天分享日常、講故事',     emoji: '💬', scores: { chat: 3, talent: 1 } },
      { text: '用競技、挑戰展現實力',       emoji: '🎮', scores: { battle: 3, variety: 1 } },
      { text: '用專業技能或作品呈現',       emoji: '🎨', scores: { talent: 3, chat: 1 } },
      { text: '用幽默、綜藝感搞笑帶氣氛',   emoji: '🎪', scores: { variety: 3, dancer: 1 } }
    ]
  },
  {
    q: '你希望的直播間氛圍是？',
    icon: '✨',
    options: [
      { text: '溫暖療癒、粉絲間像家人一樣',  emoji: '🍵', scores: { chat: 3, talent: 1, singer: 1 } },
      { text: '熱鬧刺激、常有爆點與高潮',    emoji: '🔥', scores: { battle: 3, variety: 2 } },
      { text: '精緻優雅、專業感強',          emoji: '✨', scores: { singer: 2, talent: 2, dancer: 1 } },
      { text: '歡樂輕鬆、笑聲不斷',          emoji: '🎉', scores: { variety: 3, dancer: 2, chat: 1 } }
    ]
  },
  {
    q: '你偏好的開播時段是？',
    icon: '🕐',
    options: [
      { text: '白天中午（12:00–15:00）',    emoji: '🌅', scores: { chat: 2, talent: 2 } },
      { text: '晚間黃金檔（18:00–22:00）',   emoji: '🌆', scores: { dancer: 2, singer: 2, variety: 2, talent: 1 } },
      { text: '深夜檔（22:00 之後）',        emoji: '🌙', scores: { battle: 3, chat: 2, singer: 1 } },
      { text: '彈性排班，隨機都可以',        emoji: '🎲', scores: { variety: 2, talent: 1, dancer: 1 } }
    ]
  },
  {
    q: '你比較擅長？',
    icon: '💡',
    options: [
      { text: '快速反應、即興發揮、臨場感強', emoji: '⚡', scores: { battle: 3, variety: 3 } },
      { text: '深度話題、講故事、有觀點',     emoji: '📖', scores: { chat: 3, talent: 2 } },
      { text: '帶氣氛、炒場面、high 全場',    emoji: '🎊', scores: { variety: 3, dancer: 2, battle: 1 } },
      { text: '專業內容、教學、有一技之長',   emoji: '📚', scores: { talent: 3, singer: 1 } },
      { text: '情感表達、傳達感受',           emoji: '💖', scores: { singer: 3, chat: 2 } }
    ]
  },
  {
    q: '面對 PK / 擂台你的直覺反應是？',
    icon: '⚔️',
    options: [
      { text: '熱血！我愛拚 —— 我要贏！',    emoji: '🔥', scores: { battle: 3, dancer: 1 } },
      { text: '可以偶爾玩玩、當娛樂',        emoji: '😊', scores: { variety: 2, dancer: 2, chat: 1 } },
      { text: '有點壓力，希望粉絲互動為主',   emoji: '😅', scores: { chat: 3, talent: 2 } },
      { text: '我想專注在自己的內容上',      emoji: '🎯', scores: { singer: 3, talent: 3 } }
    ]
  },
  {
    q: '你希望粉絲怎麼記住你？',
    icon: '💎',
    options: [
      { text: '「歌聲會發光」的實力派主播',   emoji: '🎤', scores: { singer: 3 } },
      { text: '「一開播就想跟著跳」的能量主播', emoji: '💃', scores: { dancer: 3 } },
      { text: '「像朋友一樣自在」的暖心主播', emoji: '💬', scores: { chat: 3 } },
      { text: '「PK 沒在怕」的擂台王者',      emoji: '⚔️', scores: { battle: 3 } },
      { text: '「有真材實料」的內容專家',     emoji: '🎨', scores: { talent: 3 } },
      { text: '「笑點滿滿」的直播間開心果',   emoji: '🎪', scores: { variety: 3 } }
    ]
  }
];

// ============ 計算主播類型 ============
window.calculateQuizResult = function(answers) {
  // answers: Array of {questionIdx, optionIdx}
  const scores = { singer: 0, dancer: 0, chat: 0, battle: 0, talent: 0, variety: 0 };

  answers.forEach(ans => {
    const question = window.QUIZ_QUESTIONS[ans.questionIdx];
    if (!question) return;
    const option = question.options[ans.optionIdx];
    if (!option) return;
    Object.entries(option.scores).forEach(([type, score]) => {
      scores[type] = (scores[type] || 0) + score;
    });
  });

  // 找最高分（若同分取第一個，隨機性由題目順序影響已足夠）
  let maxScore = 0;
  let winnerType = 'chat';  // 預設保底
  Object.entries(scores).forEach(([type, score]) => {
    if (score > maxScore) {
      maxScore = score;
      winnerType = type;
    }
  });

  return {
    type: winnerType,
    scores: scores,
    typeData: window.QUIZ_TYPES[winnerType]
  };
};
