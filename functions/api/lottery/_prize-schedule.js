/**
 * ============================================================
 * 每月獎品排程
 * ============================================================
 * 每月 1 日自動切換獎品，直接改這個檔案即可（改完後 commit + deploy）
 *
 * 資料結構：
 *   month: 'YYYY-MM'  → 該月獎品清單
 *   prizes: [
 *     { id, name, emoji, tier, stock, rate }
 *     id       — 唯一識別碼（DB 用）
 *     name     — 顯示名稱
 *     emoji    — 卡片 emoji
 *     tier     — 頭獎 / 貳獎 / 參獎 / 肆獎
 *     stock    — 本月總數量（會扣減，發完就不再開出）
 *     rate     — 中獎機率百分比（% ；0.5 = 0.5%）
 *   ]
 *
 * 「銘謝惠顧」不用寫，剩下的機率會自動填成銘謝惠顧。
 *
 * ⚠️ 修改注意：
 *   1) prize id 一旦上線後不要改，改了會影響歷史紀錄查詢
 *   2) 總 rate 建議 <= 20（銘謝惠顧 >= 80% 才不會爆預算）
 *   3) 新月份要在月底前加好，系統會自動切換
 * ============================================================
 */

export const PRIZE_SCHEDULE = {
  // === 2026 年 9 月 ===
  '2026-09': [
    { id: 'soundcard', name: '直播聲卡套組',     emoji: '🎙️', tier: '頭獎', stock: 1,  rate: 0.5 },
    { id: 'light',     name: '直播補光燈',       emoji: '💡', tier: '貳獎', stock: 2,  rate: 1.0 },
    { id: 'holder',    name: 'TikTok 手機支架',  emoji: '📱', tier: '參獎', stock: 5,  rate: 2.5 },
    { id: 'coffee',    name: '7-11 特大杯冰拿鐵',    emoji: '☕', tier: '肆獎', stock: 20, rate: 10.0 },
  ],

  // === 2026 年 10 月（同 9 月）===
  '2026-10': [
    { id: 'soundcard', name: '直播聲卡套組',     emoji: '🎙️', tier: '頭獎', stock: 1,  rate: 0.5 },
    { id: 'light',     name: '直播補光燈',       emoji: '💡', tier: '貳獎', stock: 2,  rate: 1.0 },
    { id: 'holder',    name: 'TikTok 手機支架',  emoji: '📱', tier: '參獎', stock: 5,  rate: 2.5 },
    { id: 'coffee',    name: '7-11 特大杯冰拿鐵',    emoji: '☕', tier: '肆獎', stock: 20, rate: 10.0 },
  ],
};

/**
 * 取得當前月份的獎品清單（含銘謝惠顧補齊到 100%）
 */
export function getCurrentMonthPrizes(month) {
  const prizes = PRIZE_SCHEDULE[month] || [];
  const totalWinRate = prizes.reduce((sum, p) => sum + p.rate, 0);
  const noneRate = Math.max(0, 100 - totalWinRate);

  return {
    month,
    prizes: prizes.map(p => ({ ...p })),
    none: {
      id: 'none',
      name: '銘謝惠顧',
      emoji: '😊',
      tier: '無',
      rate: noneRate,
    },
    total_win_rate: totalWinRate,
  };
}

/**
 * 取得台北時區的當前月份 YYYY-MM
 */
export function getTaipeiMonth() {
  const now = new Date(Date.now() + 8 * 3600 * 1000);
  return now.getUTCFullYear() + '-' + String(now.getUTCMonth() + 1).padStart(2, '0');
}

/**
 * 取得台北時區當月最後一天 23:59:59 的 ISO 字串（領獎期限用）
 * 領獎期限：抽中後到「下個月 15 日」
 */
export function getClaimDeadline() {
  const now = new Date(Date.now() + 8 * 3600 * 1000);
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  // 下個月 15 日
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const deadline = new Date(Date.UTC(nextYear, nextMonth - 1, 15, 23, 59, 59) - 8 * 3600 * 1000);
  return deadline.toISOString();
}
