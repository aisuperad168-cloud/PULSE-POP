/* ===========================
   PULSEPOP OFFICIAL WEBSITE
   Main JavaScript
=========================== */

// ===== STREAMER DATA =====
const streamers = [
  { name: '馬妹',       handle: '@sj231009',      url: 'https://www.tiktok.com/@sj231009',      emoji: '🐴' },
  { name: '尊王',       handle: '@zunwang5858518', url: 'https://www.tiktok.com/@zunwang5858518', emoji: '👑' },
  { name: 'Lin',        handle: '@lin_959595',     url: 'https://www.tiktok.com/@lin_959595',    emoji: '🌸' },
  { name: 'Sherrol',    handle: '@sherrolss',      url: 'https://www.tiktok.com/@sherrolss',     emoji: '✨' },
  { name: 'Mai',        handle: '@mai916537',      url: 'https://www.tiktok.com/@mai916537',     emoji: '🌺' },
  { name: 'PP',         handle: '@pp888a',         url: 'https://www.tiktok.com/@pp888a',        emoji: '🎀' },
  { name: 'XNLN',       handle: '@xnln1538',       url: 'https://www.tiktok.com/@xnln1538',      emoji: '💫' },
  { name: 'Duolyu',     handle: '@duolyu1225',     url: 'https://www.tiktok.com/@duolyu1225',    emoji: '🎵' },
  { name: 'Rena',       handle: '@renatz0503',     url: 'https://www.tiktok.com/@renatz0503',    emoji: '🌙' },
  { name: 'Nini',       handle: '@nini_1003_hyn',  url: 'https://www.tiktok.com/@nini_1003_hyn', emoji: '🍀' },
  { name: 'Taco',       handle: '@taco_ya124',     url: 'https://www.tiktok.com/@taco_ya124',    emoji: '🌮' },
  { name: 'C Mi',       handle: '@c_mi_0908',      url: 'https://www.tiktok.com/@c_mi_0908',     emoji: '🎶' },
  { name: 'Amber',      handle: '@ambercblyr3',    url: 'https://www.tiktok.com/@ambercblyr3',   emoji: '🍊' },
  { name: 'Demi',       handle: '@demidemi0103',   url: 'https://www.tiktok.com/@demidemi0103',  emoji: '💎' },
  { name: 'Juice',      handle: '@juiccc25',       url: 'https://www.tiktok.com/@juiccc25',      emoji: '🍹' },
  { name: 'Chloe',      handle: '@chloe13149999',  url: 'https://www.tiktok.com/@chloe13149999', emoji: '🦋' },
  { name: 'Seven',      handle: '@sevenmonki',     url: 'https://www.tiktok.com/@sevenmonki',    emoji: '🐵' },
  { name: 'Sea',        handle: '@sea.817',        url: 'https://www.tiktok.com/@sea.817',       emoji: '🌊' },
  { name: 'Lucky',      handle: '@lucky_1388',     url: 'https://www.tiktok.com/@lucky_1388',    emoji: '🍀' },
  { name: 'User30678',  handle: '@user30678fuck',  url: 'https://www.tiktok.com/@user30678fuck', emoji: '🎯' },
  { name: 'Fierce',     handle: '@fierce1222',     url: 'https://www.tiktok.com/@fierce1222',    emoji: '🔥' },
  { name: 'Jack',       handle: '@jack09_20',      url: 'https://www.tiktok.com/@jack09_20',     emoji: '⚡' },
  { name: 'Jan',        handle: '@jan_11111',      url: 'https://www.tiktok.com/@jan_11111',     emoji: '🌟' },
  { name: 'M4jo',       handle: '@m4jo6211',       url: 'https://www.tiktok.com/@m4jo6211',      emoji: '🎸' },
  { name: 'Eunice',     handle: '@eunice_ice_',    url: 'https://www.tiktok.com/@eunice_ice_',   emoji: '🧊' },
  { name: 'Wawa',       handle: '@wawagiking',     url: 'https://www.tiktok.com/@wawagiking',    emoji: '👸' },
  { name: '080',        handle: '@080u_u080',      url: 'https://www.tiktok.com/@080u_u080',     emoji: '🐼' },
  { name: 'Ciao',       handle: '@ciaoc.tw',       url: 'https://www.tiktok.com/@ciaoc.tw',      emoji: '👋' },
  { name: '芷璇',       handle: '@zhi_xuan93_0125',url: 'https://www.tiktok.com/@zhi_xuan93_0125',emoji: '🌷' },
];

// ===== TikTok SVG ICON =====
const tiktokIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5
           2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01
           a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34
           6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z"/>
</svg>`;

// ===== RENDER STREAMER CARDS =====
function renderStreamers(list) {
  const grid = document.getElementById('streamersGrid');
  if (!grid) return;

  if (list.length === 0) {
    grid.innerHTML = '<div class="no-results">😅 找不到符合的主播，請嘗試其他關鍵字</div>';
    return;
  }

  grid.innerHTML = list.map((s, i) => `
    <div class="streamer-card" style="animation-delay:${(i % 10) * 0.05}s">
      <div class="streamer-avatar">
        <span>${s.emoji}</span>
        <div class="live-dot"></div>
      </div>
      <div class="streamer-name">${s.name}</div>
      <div class="streamer-handle">${s.handle}</div>
      <a href="${s.url}" target="_blank" rel="noopener noreferrer" class="streamer-link">
        ${tiktokIcon} 查看主播
      </a>
    </div>
  `).join('');
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
          s.handle.toLowerCase().includes(q)
        )
      : streamers;
    renderStreamers(filtered);
  });
}

// ===== NAVBAR SCROLL =====
function initNavbar() {
  const navbar  = document.getElementById('navbar');
  const burger  = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');
  if (!navbar) return;

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });

  burger?.addEventListener('click', () => {
    navLinks?.classList.toggle('open');
    const spans = burger.querySelectorAll('span');
    burger.classList.toggle('active');
    if (burger.classList.contains('active')) {
      spans[0].style.transform = 'rotate(45deg) translate(5px,5px)';
      spans[1].style.opacity   = '0';
      spans[2].style.transform = 'rotate(-45deg) translate(5px,-5px)';
    } else {
      spans.forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
    }
  });

  // Close menu on link click
  navLinks?.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      navLinks.classList.remove('open');
      burger?.classList.remove('active');
      burger?.querySelectorAll('span').forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
    });
  });
}

// ===== COUNTER ANIMATION =====
function animateCounter(el) {
  const target = parseInt(el.dataset.target, 10);
  const duration = 1800;
  const step = 16;
  const steps = duration / step;
  const increment = target / steps;
  let current = 0;

  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      el.textContent = target;
      clearInterval(timer);
    } else {
      el.textContent = Math.floor(current);
    }
  }, step);
}

function initCounters() {
  const counters = document.querySelectorAll('.stat-num');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  counters.forEach(c => observer.observe(c));
}

// ===== PARTICLES =====
function initParticles() {
  const container = document.getElementById('particles');
  if (!container) return;
  const count = 25;

  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 4 + 2;
    p.style.cssText = `
      left: ${Math.random() * 100}%;
      width: ${size}px;
      height: ${size}px;
      animation-duration: ${Math.random() * 12 + 8}s;
      animation-delay: ${Math.random() * 10}s;
      opacity: ${Math.random() * 0.6 + 0.2};
    `;
    container.appendChild(p);
  }
}

// ===== SCROLL REVEAL =====
function initScrollReveal() {
  const els = document.querySelectorAll(
    '.about-grid, .platform-card, .feature-item, .stat-item, .join-content, .section-header'
  );

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.style.opacity  = '1';
          entry.target.style.transform = 'translateY(0)';
        }, i * 80);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  els.forEach(el => {
    el.style.opacity   = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.7s ease, transform 0.7s ease';
    observer.observe(el);
  });
}

// ===== TOAST =====
function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ===== CONTACT FORM =====
function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn.textContent = '傳送中...';
    btn.disabled = true;
    setTimeout(() => {
      showToast('✅ 訊息已送出！我們將盡快與您聯繫');
      form.reset();
      btn.textContent = '送出訊息 →';
      btn.disabled = false;
    }, 1200);
  });
}

// ===== SMOOTH SCROLL =====
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const offset = 80;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
}

// ===== ACTIVE NAV HIGHLIGHT =====
function initActiveNav() {
  const sections = document.querySelectorAll('section[id]');
  const links    = document.querySelectorAll('.nav-links a');

  window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(s => {
      if (window.scrollY >= s.offsetTop - 120) current = s.id;
    });
    links.forEach(a => {
      a.style.color = a.getAttribute('href') === `#${current}`
        ? 'var(--red-light)'
        : '';
    });
  }, { passive: true });
}

// ===== CURSOR GLOW (desktop only) =====
function initCursorGlow() {
  if (window.matchMedia('(pointer: coarse)').matches) return; // skip on touch
  const glow = document.createElement('div');
  glow.style.cssText = `
    position:fixed; pointer-events:none; z-index:9999;
    width:300px; height:300px; border-radius:50%;
    background:radial-gradient(circle, rgba(232,57,42,0.08) 0%, transparent 70%);
    transform:translate(-50%,-50%);
    transition:left 0.15s ease,top 0.15s ease;
  `;
  document.body.appendChild(glow);
  document.addEventListener('mousemove', e => {
    glow.style.left = e.clientX + 'px';
    glow.style.top  = e.clientY + 'px';
  });
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  renderStreamers(streamers);
  initSearch();
  initNavbar();
  initCounters();
  initParticles();
  initScrollReveal();
  initContactForm();
  initSmoothScroll();
  initActiveNav();
  initCursorGlow();
});
