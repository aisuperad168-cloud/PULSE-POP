/**
 * ============================================================
 * JDI Sign System · Step 4: ID Card Upload
 * ============================================================
 * - 檔案客戶端壓縮至 <1MB
 * - Base64 存 sessionStorage 給後續 preview & submit
 */

(function() {
  'use strict';

  const terms = JSON.parse(sessionStorage.getItem('signContractTerms') || 'null');
  if (!terms || !terms.contract_years) {
    alert('請先完成上一步');
    window.location.href = '/sign/step-3.html';
    return;
  }

  const form = document.getElementById('uploadForm');
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB before compress
  const TARGET_SIZE = 800 * 1024;    // 800KB after compress

  function setupUpload(inputId, previewId, titleId, storageKey, errorId) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    const title = document.getElementById(titleId);
    const label = input.closest('.sign-file-upload');
    const errEl = document.getElementById(errorId);

    // Prefill from session
    const saved = sessionStorage.getItem(storageKey);
    if (saved) {
      preview.src = saved;
      preview.classList.add('show');
      title.textContent = '✓ 已上傳，點擊可更換';
      label.classList.add('has-file');
    }

    input.addEventListener('change', async function(e) {
      const file = e.target.files[0];
      if (!file) return;
      errEl.classList.remove('show');

      if (!file.type.startsWith('image/')) {
        errEl.textContent = '請上傳圖片格式檔案（JPG/PNG/WebP）';
        errEl.classList.add('show');
        return;
      }
      if (file.size > MAX_SIZE) {
        errEl.textContent = '檔案大小超過 5 MB，請壓縮後再上傳';
        errEl.classList.add('show');
        return;
      }

      title.textContent = '壓縮中...';
      try {
        const compressed = await compressImage(file, 1600, 0.85);
        preview.src = compressed;
        preview.classList.add('show');
        title.textContent = `✓ 已選擇：${file.name}（${Math.round(compressed.length / 1024)} KB）`;
        label.classList.add('has-file');
        sessionStorage.setItem(storageKey, compressed);
      } catch (err) {
        errEl.textContent = '圖片處理失敗：' + err.message;
        errEl.classList.add('show');
        title.textContent = '選擇檔案或拖曳到此';
      }
    });
  }

  async function compressImage(file, maxWidth, quality) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          let w = img.width;
          let h = img.height;
          if (w > maxWidth) {
            h = h * (maxWidth / w);
            w = maxWidth;
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => reject(new Error('圖片讀取失敗'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('檔案讀取失敗'));
      reader.readAsDataURL(file);
    });
  }

  setupUpload('id_front', 'frontPreview', 'frontTitle', 'signIdFront', 'err-id_front');
  setupUpload('id_back', 'backPreview', 'backTitle', 'signIdBack', 'err-id_back');

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    const hasFront = !!sessionStorage.getItem('signIdFront');
    const hasBack = !!sessionStorage.getItem('signIdBack');
    let hasError = false;

    if (!hasFront) {
      document.getElementById('err-id_front').textContent = '請上傳身分證正面';
      document.getElementById('err-id_front').classList.add('show');
      hasError = true;
    }
    if (!hasBack) {
      document.getElementById('err-id_back').textContent = '請上傳身分證反面';
      document.getElementById('err-id_back').classList.add('show');
      hasError = true;
    }
    if (hasError) return;

    window.location.href = '/sign/step-5.html';
  });
})();
