/**
 * ============================================================
 * JDI Sign System · Step 6: Signature + Submit
 * ============================================================
 * - Canvas 手寫簽名（支援 touch + mouse）
 * - 最終確認 checkbox
 * - 送出至 /api/sign/submit
 */
(function() {
  'use strict';

  // 檢查前置資料
  const basicInfo = JSON.parse(sessionStorage.getItem('signBasicInfo') || 'null');
  const terms = JSON.parse(sessionStorage.getItem('signContractTerms') || 'null');
  const session = JSON.parse(sessionStorage.getItem('signSession') || 'null');
  const idFront = sessionStorage.getItem('signIdFront');
  const idBack = sessionStorage.getItem('signIdBack');

  if (!basicInfo || !terms || !idFront || !idBack || !session) {
    alert('請先完成前面步驟');
    window.location.href = '/sign/';
    return;
  }

  // ============ Canvas Signature ============
  const canvas = document.getElementById('sigCanvas');
  const ctx = canvas.getContext('2d');
  const hint = document.getElementById('sigHint');
  const statusEl = document.getElementById('sigStatus');
  const clearBtn = document.getElementById('sigClear');
  const finalConsent = document.getElementById('finalConsent');
  const submitBtn = document.getElementById('finalSubmit');
  const submitBtnText = document.getElementById('submitBtnText');
  const submitError = document.getElementById('submitError');

  let isDrawing = false;
  let hasSignature = false;
  let lastX = 0, lastY = 0;

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = 200 * dpr;
    canvas.style.height = '200px';
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#000';
  }
  resizeCanvas();
  window.addEventListener('resize', () => {
    // Save current signature, resize, restore
    const currentData = canvas.toDataURL();
    const img = new Image();
    img.onload = () => {
      resizeCanvas();
      ctx.drawImage(img, 0, 0, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1));
    };
    img.src = currentData;
  });

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches && e.touches[0];
    return {
      x: (touch ? touch.clientX : e.clientX) - rect.left,
      y: (touch ? touch.clientY : e.clientY) - rect.top,
    };
  }

  function startDraw(e) {
    e.preventDefault();
    isDrawing = true;
    const pos = getPos(e);
    lastX = pos.x;
    lastY = pos.y;
    hint.classList.add('hide');
  }
  function draw(e) {
    if (!isDrawing) return;
    e.preventDefault();
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastX = pos.x;
    lastY = pos.y;
    if (!hasSignature) {
      hasSignature = true;
      statusEl.textContent = '✓ 已簽名';
      statusEl.classList.add('signed');
      updateSubmitState();
    }
  }
  function endDraw() { isDrawing = false; }

  canvas.addEventListener('mousedown', startDraw);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', endDraw);
  canvas.addEventListener('mouseleave', endDraw);
  canvas.addEventListener('touchstart', startDraw, { passive: false });
  canvas.addEventListener('touchmove', draw, { passive: false });
  canvas.addEventListener('touchend', endDraw);

  clearBtn.addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasSignature = false;
    hint.classList.remove('hide');
    statusEl.textContent = '尚未簽名';
    statusEl.classList.remove('signed');
    updateSubmitState();
  });

  function updateSubmitState() {
    submitBtn.disabled = !(hasSignature && finalConsent.checked);
  }
  finalConsent.addEventListener('change', updateSubmitState);

  // ============ Submit ============
  submitBtn.addEventListener('click', async () => {
    if (!hasSignature || !finalConsent.checked) return;

    submitBtn.disabled = true;
    submitBtnText.textContent = '送出中...請稍候';
    submitError.style.display = 'none';

    const signaturePng = canvas.toDataURL('image/png');
    const now = new Date().toISOString();

    const payload = {
      ...basicInfo,
      ...terms,
      id_front: idFront,
      id_back: idBack,
      signature_data: signaturePng,
      signed_at: now,
      read_scrolled_at: session.scrolledAt,
      agreed_at: session.agreedAt,
      user_agent: navigator.userAgent,
      screen_size: `${screen.width}x${screen.height}`,
    };

    try {
      const res = await fetch('/api/sign/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();

      if (!res.ok || !result.ok) {
        throw new Error(result.error || '送出失敗');
      }

      // 清空 session data（除了合約編號給完成頁）
      const contractNo = result.contract_no;
      sessionStorage.removeItem('signSession');
      sessionStorage.removeItem('signBasicInfo');
      sessionStorage.removeItem('signContractTerms');
      sessionStorage.removeItem('signIdFront');
      sessionStorage.removeItem('signIdBack');
      sessionStorage.setItem('signCompletedNo', contractNo);

      // 跳到完成頁
      // 追蹤合約送出成功
      if (window.jdiTrack) {
        window.jdiTrack('contract_submitted', {
          contract_type: 'streamer',
          contract_years: payload.contract_years,
        });
      }

      window.location.href = `/sign/done.html?no=${encodeURIComponent(contractNo)}`;
    } catch (err) {
      submitError.textContent = '⚠️ ' + (err.message || '送出失敗，請稍後再試');
      submitError.style.display = 'block';
      submitBtnText.textContent = '送出合約簽署 →';
      submitBtn.disabled = false;
    }
  });
})();
