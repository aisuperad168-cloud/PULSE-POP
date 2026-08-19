/* ===========================
   PULSEPOP OFFICIAL WEBSITE
   Main JavaScript v4
=========================== */

// ===== STREAMER DATA (29 featured) =====
const streamers = [
  {
    handle: 'sj231009', name: '馬妹', fullName: '馬妹🐴',
    url: 'https://www.tiktok.com/@sj231009',
    thumb: 'assets/avatars/sj231009.jpg',
    emoji: '🐴'
  },
  {
    handle: 'zunwang5858518', name: '沐光', fullName: '沐光🍹',
    url: 'https://www.tiktok.com/@zunwang5858518',
    thumb: 'assets/avatars/zunwang5858518.jpg',
    emoji: '🍹'
  },
  {
    handle: 'lin_959595', name: '優Yoyo', fullName: '優Yoyo🪀',
    url: 'https://www.tiktok.com/@lin_959595',
    thumb: 'assets/avatars/lin_959595.jpg',
    emoji: '🪀'
  },
  {
    handle: 'sherrolss', name: '知音姊姊', fullName: '知音姊姊',
    url: 'https://www.tiktok.com/@sherrolss',
    thumb: 'assets/avatars/sherrolss.jpg',
    emoji: '🎵'
  },
  {
    handle: 'mai916537', name: '甜桃', fullName: '甜桃🍑',
    url: 'https://www.tiktok.com/@mai916537',
    thumb: 'assets/avatars/mai916537.jpg',
    emoji: '🍑'
  },
  {
    handle: 'pp888a', name: '瑜媽', fullName: '瑜媽🐯',
    url: 'https://www.tiktok.com/@pp888a',
    thumb: 'assets/avatars/pp888a.jpg',
    emoji: '🐯'
  },
  {
    handle: 'xnln1538', name: '亮亮', fullName: '亮亮❣️',
    url: 'https://www.tiktok.com/@xnln1538',
    thumb: 'assets/avatars/xnln1538.jpg',
    emoji: '❣️'
  },
  {
    handle: 'duolyu1225', name: '多多綠', fullName: '多多綠🌙',
    url: 'https://www.tiktok.com/@duolyu1225',
    thumb: 'assets/avatars/duolyu1225.jpg',
    emoji: '🌙'
  },
  {
    handle: 'renatz0503', name: '芮娜', fullName: '芮娜🧶',
    url: 'https://www.tiktok.com/@renatz0503',
    thumb: 'assets/avatars/renatz0503.jpg',
    emoji: '🧶'
  },
  {
    handle: 'nini_1003_hyn', name: 'NiNi', fullName: 'NiNi🦦',
    url: 'https://www.tiktok.com/@nini_1003_hyn',
    thumb: 'assets/avatars/nini_1003_hyn.jpg',
    emoji: '🦦'
  },
  {
    handle: 'taco_ya124', name: '叩叩Taco', fullName: '叩叩Taco🌱',
    url: 'https://www.tiktok.com/@taco_ya124',
    thumb: 'assets/avatars/taco_ya124.jpg',
    emoji: '🌱'
  },
  {
    handle: 'c_mi_0908', name: '米姥思', fullName: '米姥思🪅',
    url: 'https://www.tiktok.com/@c_mi_0908',
    thumb: 'assets/avatars/c_mi_0908.jpg',
    emoji: '🪅'
  },
  {
    handle: 'ambercblyr3', name: '貢你妹', fullName: '貢你妹🍘',
    url: 'https://www.tiktok.com/@ambercblyr3',
    thumb: 'assets/avatars/ambercblyr3.jpg',
    emoji: '🍘'
  },
  {
    handle: 'demidemi0103', name: 'ㄚ咪', fullName: '貪吃鬼ㄚ咪🥚',
    url: 'https://www.tiktok.com/@demidemi0103',
    thumb: 'assets/avatars/demidemi0103.jpg',
    emoji: '🥚'
  },
  {
    handle: 'juiccc25', name: '優優', fullName: '優優🍒',
    url: 'https://www.tiktok.com/@juiccc25',
    thumb: 'assets/avatars/juiccc25.jpg',
    emoji: '🍒'
  },
  {
    handle: 'chloe13149999', name: '克蘿伊', fullName: '克蘿伊🎀',
    url: 'https://www.tiktok.com/@chloe13149999',
    thumb: 'assets/avatars/chloe13149999.jpg',
    emoji: '🎀'
  },
  {
    handle: 'sevenmonki', name: '阿娜子', fullName: 'A-NA阿娜子🐵',
    url: 'https://www.tiktok.com/@sevenmonki',
    thumb: 'assets/avatars/sevenmonki.jpg',
    emoji: '🐵'
  },
  {
    handle: 'sea.817', name: '黃曉海', fullName: '黃曉海🌊',
    url: 'https://www.tiktok.com/@sea.817',
    thumb: 'assets/avatars/sea.817.jpg',
    emoji: '🌊'
  },
  {
    handle: 'lucky_1388', name: '皮蛋', fullName: '皮蛋🍀',
    url: 'https://www.tiktok.com/@lucky_1388',
    thumb: 'assets/avatars/lucky_1388.jpg',
    emoji: '🍀'
  },
  {
    handle: 'user30678fuck', name: 'Faker', fullName: 'Faker🐟',
    url: 'https://www.tiktok.com/@user30678fuck',
    thumb: 'assets/avatars/user30678fuck.jpg',
    emoji: '🐟'
  },
  {
    // Fixed: now has real avatar (was placeholder before)
    handle: 'fierce1222', name: '元承烈', fullName: '元承烈🎙️',
    url: 'https://www.tiktok.com/@fierce1222',
    thumb: 'assets/avatars/fierce1222.jpg',
    emoji: '⚜️'
  },
  {
    handle: 'jack09_20', name: '曜宸Jack', fullName: '曜宸💼Jack',
    url: 'https://www.tiktok.com/@jack09_20',
    thumb: 'assets/avatars/jack09_20.jpg',
    emoji: '💼'
  },
  {
    handle: 'jan_11111', name: '河馬哥哥', fullName: '河馬哥哥🦛',
    url: 'https://www.tiktok.com/@jan_11111',
    thumb: 'assets/avatars/jan_11111.jpg',
    emoji: '🦛'
  },
  {
    // Fixed: now has real avatar (was placeholder before)
    handle: 'm4jo6211', name: '小折', fullName: '小折💣',
    url: 'https://www.tiktok.com/@m4jo6211',
    thumb: 'assets/avatars/m4jo6211.jpg',
    emoji: '💣'
  },
  {
    handle: 'eunice_ice_', name: '尤妮酥', fullName: '尤妮酥💫',
    url: 'https://www.tiktok.com/@eunice_ice_',
    thumb: 'assets/avatars/eunice_ice_.jpg',
    emoji: '💫'
  },
  {
    handle: 'wawagiking', name: '翔a', fullName: '翔a🎈',
    url: 'https://www.tiktok.com/@wawagiking',
    thumb: 'assets/avatars/wawagiking.jpg',
    emoji: '🎈'
  },
  {
    handle: '080u_u080', name: '拾貳', fullName: '拾貳🎈',
    url: 'https://www.tiktok.com/@080u_u080',
    thumb: 'assets/avatars/080u_u080.jpg',
    emoji: '🎈'
  },
  {
    handle: 'ciaoc.tw', name: '雀兒', fullName: '雀兒👽',
    url: 'https://www.tiktok.com/@ciaoc.tw',
    thumb: 'assets/avatars/ciaoc.tw.jpg',
    emoji: '👽'
  },
  {
    handle: 'zhi_xuan93_0125', name: '尹流星', fullName: '尹流星🎙️',
    url: 'https://www.tiktok.com/@zhi_xuan93_0125',
    thumb: 'assets/avatars/zhi_xuan93_0125.jpg',
    emoji: '🎙️'
  }
];

// ===== 活動專區 DATA =====

// 7月金牌主播排行榜 (July 2026)
const goldRanking = [
  {
    rank: 1, handle: 'renatz0503', name: '芮娜', fullName: '芮娜🧶𝓡𝓝⁰⁵⁰³',
    url: 'https://www.tiktok.com/@renatz0503',
    thumb: 'assets/avatars/renatz0503.jpg',
    emoji: '🧶', medal: '🥇'
  },
  {
    rank: 2, handle: 'duolyu1225', name: '多多綠', fullName: '🌜多多綠🌛¹⁵⁷',
    url: 'https://www.tiktok.com/@duolyu1225',
    thumb: 'assets/avatars/duolyu1225.jpg',
    emoji: '🌙', medal: '🥈'
  },
  {
    rank: 3, handle: 'c_mi_0908', name: '米姥思', fullName: '米姥思🪅 ᴹᴵ',
    url: 'https://www.tiktok.com/@c_mi_0908',
    thumb: 'assets/avatars/c_mi_0908.jpg',
    emoji: '🪅', medal: '🥉'
  },
  {
    rank: 4, handle: 'emily10148888', name: '美麗不打烊', fullName: '美麗🧸不打烊🧸',
    url: 'https://www.tiktok.com/@emily10148888',
    thumb: 'assets/avatars/emily10148888.jpg',
    emoji: '🧸', medal: '4️⃣'
  },
  {
    rank: 5, handle: 'ambercblyr3', name: '貢你妹', fullName: '貢你妹🍘',
    url: 'https://www.tiktok.com/@ambercblyr3',
    thumb: 'assets/avatars/ambercblyr3.jpg',
    emoji: '🍘', medal: '5️⃣'
  }
];

// 新進主播
const newStreamers = [
  {
    handle: 'dearpink0311', name: '娃娃', fullName: 'Love娃娃🐾',
    url: 'https://www.tiktok.com/@dearpink0311',
    thumb: 'assets/avatars/dearpink0311.jpg',
    emoji: '🐾'
  },
  {
    handle: 'sea.817', name: '黃曉海', fullName: '黃曉海🌊',
    url: 'https://www.tiktok.com/@sea.817',
    thumb: 'assets/avatars/sea.817.jpg',
    emoji: '🌊'
  },
  {
    handle: 'chloe13149999', name: '克蘿伊', fullName: '克蘿伊🎀',
    url: 'https://www.tiktok.com/@chloe13149999',
    thumb: 'assets/avatars/chloe13149999.jpg',
    emoji: '🎀'
  },
  {
    handle: 'ooooo6789ooooo', name: 'Guanting99', fullName: 'Guanting 99✨',
    url: 'https://www.tiktok.com/@ooooo6789ooooo',
    thumb: 'assets/avatars/ooooo6789ooooo.jpg',
    emoji: '✨'
  },
  {
    handle: 'jan_11111', name: '河馬哥哥', fullName: '河馬哥哥🦛',
    url: 'https://www.tiktok.com/@jan_11111',
    thumb: 'assets/avatars/jan_11111.jpg',
    emoji: '🦛'
  },
  {
    handle: 'amis790608', name: '凱凱', fullName: '凱凱🌈',
    url: 'https://www.tiktok.com/@amis790608',
    thumb: 'assets/avatars/amis790608.jpg',
    emoji: '🌈'
  },
  {
    handle: 'www__shay', name: 'Shay烜', fullName: 'Shay 烜♡',
    url: 'https://www.tiktok.com/@www__shay',
    thumb: 'assets/avatars/www__shay.jpg',
    emoji: '♡'
  },
  {
    handle: 'lauralan.tw', name: '藍辰語', fullName: '藍辰語🌸',
    url: 'https://www.tiktok.com/@lauralan.tw',
    thumb: 'assets/avatars/lauralan.tw.jpg',
    emoji: '🌸'
  },
  {
    handle: 'user8542304936538', name: '柚子', fullName: '🔥柚子🐺',
    url: 'https://www.tiktok.com/@user8542304936538',
    thumb: 'assets/avatars/user8542304936538.jpg',
    emoji: '🔥'
  }
];

// ===== SVG icons =====
const tiktokSVG = `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5
  2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01
  a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34
  6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z"/>
</svg>`;

// ===== STREAMER CARD HTML =====
function makeCard(s, i, small = false) {
  return `
    <a href="${s.url}" target="_blank" rel="noopener noreferrer"
       class="streamer-card${small ? ' streamer-card-sm' : ''}"
       style="animation-delay:${(i % 15) * 0.05}s">
      <div class="streamer-avatar-wrap">
        <img class="streamer-avatar-img" src="${s.thumb}" alt="${s.name}" loading="lazy"
          onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
        <div class="streamer-avatar-fallback" style="display:none;"><span>${s.emoji}</span></div>
        <div class="live-ring"></div>
        <div class="live-badge">LIVE</div>
      </div>
      <div class="streamer-name">${s.fullName}</div>
      <div class="streamer-handle">@${s.handle}</div>
      <div class="streamer-link-btn">${tiktokSVG}查看主播</div>
    </a>`;
}

// ===== RENDER FEATURED STREAMERS =====
function renderStreamers(list) {
  const grid = document.getElementById('streamersGrid');
  if (!grid) return;
  if (list.length === 0) {
    grid.innerHTML = '<div class="no-results">😅 找不到符合的主播，請嘗試其他關鍵字</div>';
    return;
  }
  grid.innerHTML = list.map((s, i) => makeCard(s, i)).join('');
}

// ===== RENDER GOLD RANKING =====
function renderGoldRanking() {
  const podium = document.getElementById('goldPodium');
  const listEl = document.getElementById('goldRankingList');
  if (!podium || !listEl) return;

  const top3 = goldRanking.filter(s => s.rank <= 3);
  const rest = goldRanking.filter(s => s.rank > 3);

  // Display order on podium: 2nd | 1st | 3rd (1st in middle, raised)
  const podiumOrder = [
    top3.find(s => s.rank === 2),
    top3.find(s => s.rank === 1),
    top3.find(s => s.rank === 3),
  ].filter(Boolean);

  const medalLabel = { 1: 'CHAMPION', 2: 'RUNNER-UP', 3: '3RD PLACE' };
  const medalIcon  = { 1: '🥇', 2: '🥈', 3: '🥉' };
  const crownIcon  = { 1: '👑', 2: '', 3: '' };

  podium.innerHTML = podiumOrder.map(s => `
    <a href="${s.url}" target="_blank" rel="noopener noreferrer"
       class="podium-card podium-rank-${s.rank}">
      ${crownIcon[s.rank] ? `<div class="podium-crown">${crownIcon[s.rank]}</div>` : ''}
      <div class="podium-rank-num">#${s.rank}</div>
      <div class="podium-avatar-wrap">
        <div class="podium-avatar-ring"></div>
        <div class="podium-avatar-glow"></div>
        <img class="podium-avatar" src="${s.thumb}" alt="${s.name}" loading="lazy"
          onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
        <div class="podium-avatar-fallback" style="display:none;"><span>${s.emoji}</span></div>
        <div class="podium-medal">${medalIcon[s.rank]}</div>
      </div>
      <div class="podium-info">
        <div class="podium-name">${s.fullName}</div>
        <div class="podium-handle">@${s.handle}</div>
      </div>
      <div class="podium-label">${medalLabel[s.rank]}</div>
      <div class="podium-cta">
        查看主播
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </div>
      <div class="podium-shine"></div>
    </a>
  `).join('');

  listEl.innerHTML = rest.map(s => `
    <a href="${s.url}" target="_blank" rel="noopener noreferrer" class="rank-card rank-${s.rank}">
      <div class="rank-num-wrap">
        <span class="rank-num-hash">#</span><span class="rank-num">${s.rank}</span>
      </div>
      <div class="rank-avatar-wrap">
        <img class="rank-avatar" src="${s.thumb}" alt="${s.name}" loading="lazy"
          onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
        <div class="rank-avatar-fallback" style="display:none;"><span>${s.emoji}</span></div>
      </div>
      <div class="rank-info">
        <div class="rank-name">${s.fullName}</div>
        <div class="rank-handle">@${s.handle}</div>
      </div>
      <div class="rank-arrow">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </div>
    </a>
  `).join('');
}

// ===== RENDER NEW STREAMERS =====
function renderNewStreamers() {
  const grid = document.getElementById('newStreamersGrid');
  if (!grid) return;
  grid.innerHTML = newStreamers.map((s, i) => makeCard(s, i, true)).join('');
}

// ===== SEARCH =====
function initSearch() {
  const input = document.getElementById('searchInput');
  if (!input) return;
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    const filtered = q
      ? streamers.filter(s =>
          s.name.toLowerCase().includes(q) ||
          s.fullName.toLowerCase().includes(q) ||
          s.handle.toLowerCase().includes(q))
      : streamers;
    renderStreamers(filtered);
  });
}

// ===== NAVBAR =====
function initNavbar() {
  const navbar   = document.getElementById('navbar');
  const burger   = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');
  if (!navbar) return;
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  }, { passive: true });
  burger?.addEventListener('click', () => {
    const open = navLinks?.classList.toggle('open');
    const spans = burger.querySelectorAll('span');
    if (open) {
      spans[0].style.transform = 'rotate(45deg) translate(5px,6px)';
      spans[1].style.opacity   = '0';
      spans[2].style.transform = 'rotate(-45deg) translate(5px,-6px)';
    } else {
      spans.forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
    }
  });
  navLinks?.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      navLinks.classList.remove('open');
      burger?.querySelectorAll('span').forEach(s => { s.style.transform=''; s.style.opacity=''; });
    });
  });
}

// ===== COUNTER =====
function animateCounter(el) {
  const target = parseInt(el.dataset.target, 10);
  const steps  = 1800 / 16;
  const inc    = target / steps;
  let cur = 0;
  const t = setInterval(() => {
    cur += inc;
    if (cur >= target) { el.textContent = target; clearInterval(t); }
    else el.textContent = Math.floor(cur);
  }, 16);
}
function initCounters() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { animateCounter(e.target); obs.unobserve(e.target); } });
  }, { threshold: 0.5 });
  document.querySelectorAll('.stat-num').forEach(el => obs.observe(el));
}

// ===== PARTICLES =====
function initParticles() {
  const c = document.getElementById('particles');
  if (!c) return;
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const sz = Math.random() * 3 + 1.5;
    p.style.cssText = `left:${Math.random()*100}%;width:${sz}px;height:${sz}px;
      animation-duration:${Math.random()*14+9}s;animation-delay:-${Math.random()*16}s;`;
    c.appendChild(p);
  }
}

// ===== SCROLL REVEAL =====
function initScrollReveal() {
  const targets = document.querySelectorAll(
    '.about-grid > *, .platform-card, .feature-item, .join-content, .section-header, .contact-grid > *, .event-card, .rank-card, .activity-block'
  );
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        setTimeout(() => {
          e.target.style.opacity   = '1';
          e.target.style.transform = 'translateY(0) scale(1)';
        }, +(e.target.dataset.delay || 0));
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.08 });
  targets.forEach((el, i) => {
    el.style.opacity    = '0';
    el.style.transform  = 'translateY(28px) scale(0.98)';
    el.style.transition = 'opacity 0.65s cubic-bezier(.4,0,.2,1), transform 0.65s cubic-bezier(.4,0,.2,1)';
    el.dataset.delay    = (i % 6) * 80;
    obs.observe(el);
  });
}

// ===== TICKER =====
function initTicker() {
  const t = document.getElementById('tickerInner');
  if (t) t.innerHTML += t.innerHTML;
}

// ===== TOAST =====
function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}

// ===== CONTACT FORM (mailto) =====
function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const data     = new FormData(form);
    const name     = data.get('name')    || '';
    const contact  = data.get('contact') || '';
    const type     = data.get('type')    || '';
    const message  = data.get('message') || '';
    const subject  = encodeURIComponent(`[脈動傳媒官網] ${type || '詢問'} — ${name}`);
    const body     = encodeURIComponent(
      `姓名：${name}\n聯絡方式：${contact}\n合作類型：${type}\n\n訊息內容：\n${message}\n\n---\n透過脈動傳媒官方網站聯絡表單送出`
    );
    window.location.href = `mailto:pulse.Pop9@proton.me?subject=${subject}&body=${body}`;
    showToast('✅ 正在開啟郵件程式，請確認寄出！');
    form.reset();
  });
}

// ===== SMOOTH SCROLL =====
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 74, behavior: 'smooth' });
    });
  });
}

// ===== ACTIVE NAV =====
function initActiveNav() {
  const sections = document.querySelectorAll('section[id]');
  const links    = document.querySelectorAll('.nav-links a');
  window.addEventListener('scroll', () => {
    let cur = '';
    sections.forEach(s => { if (window.scrollY >= s.offsetTop - 140) cur = s.id; });
    links.forEach(a => { a.style.color = a.getAttribute('href') === `#${cur}` ? 'var(--white)' : ''; });
  }, { passive: true });
}

// ===== CURSOR GLOW =====
function initCursorGlow() {
  if (window.matchMedia('(pointer: coarse)').matches) return;
  const g = document.createElement('div');
  g.style.cssText = `position:fixed;pointer-events:none;z-index:0;width:400px;height:400px;border-radius:50%;
    background:radial-gradient(circle,rgba(232,57,42,0.06) 0%,transparent 65%);
    transform:translate(-50%,-50%);transition:left .14s ease,top .14s ease;will-change:left,top;`;
  document.body.appendChild(g);
  document.addEventListener('mousemove', e => { g.style.left=e.clientX+'px'; g.style.top=e.clientY+'px'; }, { passive: true });
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  renderStreamers(streamers);
  renderGoldRanking();
  renderNewStreamers();
  initSearch();
  initNavbar();
  initCounters();
  initParticles();
  initScrollReveal();
  initContactForm();
  initSmoothScroll();
  initActiveNav();
  initCursorGlow();
  initTicker();
  initAdCarousel();
});

/* ============================================
   AD CAROUSEL (Featured Streamers)
   ============================================ */
function initAdCarousel() {
  const track = document.getElementById('adCarouselTrack');
  const prevBtn = document.getElementById('adCarouselPrev');
  const nextBtn = document.getElementById('adCarouselNext');
  const dotsWrap = document.getElementById('adCarouselDots');
  if (!track || !prevBtn || !nextBtn || !dotsWrap) return;

  const slides = track.querySelectorAll('.ad-slide');
  const dots = dotsWrap.querySelectorAll('.ad-carousel-dot');
  const total = slides.length;
  if (total <= 1) return;

  let current = 0;
  let autoTimer = null;
  const AUTO_MS = 5000;

  function goTo(idx) {
    current = (idx + total) % total;
    track.style.transform = `translateX(-${current * 100}%)`;
    dots.forEach((d, i) => d.classList.toggle('active', i === current));
  }
  function next() { goTo(current + 1); }
  function prev() { goTo(current - 1); }

  function startAuto() {
    stopAuto();
    autoTimer = setInterval(next, AUTO_MS);
  }
  function stopAuto() {
    if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
  }

  nextBtn.addEventListener('click', (e) => { e.preventDefault(); next(); startAuto(); });
  prevBtn.addEventListener('click', (e) => { e.preventDefault(); prev(); startAuto(); });
  dots.forEach((dot, i) => {
    dot.addEventListener('click', (e) => { e.preventDefault(); goTo(i); startAuto(); });
  });

  // Pause on hover (desktop)
  const carousel = document.getElementById('adCarousel');
  if (carousel) {
    carousel.addEventListener('mouseenter', stopAuto);
    carousel.addEventListener('mouseleave', startAuto);
  }

  // Touch swipe (mobile)
  let touchStartX = 0;
  let touchEndX = 0;
  track.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    stopAuto();
  }, { passive: true });
  track.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) next(); else prev();
    }
    startAuto();
  }, { passive: true });

  // Pause when tab is hidden (saves resources)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopAuto(); else startAuto();
  });

  startAuto();
}
