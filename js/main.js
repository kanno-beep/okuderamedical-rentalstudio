/**
 * オクデラメディカル 貸しスタジオ - メインJavaScript
 * アコーディオン / QRコード生成 / フォームバリデーション
 */

'use strict';

/* ==========================================================================
   アコーディオン (プログラム・FAQ共通)
   ========================================================================== */

function initAccordions() {
  // プログラムアコーディオン
  const accordionTriggers = document.querySelectorAll('.accordion-trigger');
  accordionTriggers.forEach(trigger => {
    trigger.addEventListener('click', function () {
      const item = this.closest('.accordion-item');
      const body = item.querySelector('.accordion-body');
      const isOpen = item.classList.contains('is-open');

      // 他を閉じない（複数開閉可能）
      if (isOpen) {
        item.classList.remove('is-open');
        this.setAttribute('aria-expanded', 'false');
        body.hidden = true;
      } else {
        item.classList.add('is-open');
        this.setAttribute('aria-expanded', 'true');
        body.hidden = false;
      }
    });
  });

  // FAQアコーディオン
  const faqTriggers = document.querySelectorAll('.faq-trigger');
  faqTriggers.forEach(trigger => {
    trigger.addEventListener('click', function () {
      const item = this.closest('.faq-item');
      const body = item.querySelector('.faq-body');
      const isOpen = item.classList.contains('is-open');

      // 他のFAQを閉じる
      document.querySelectorAll('.faq-item.is-open').forEach(openItem => {
        if (openItem !== item) {
          openItem.classList.remove('is-open');
          openItem.querySelector('.faq-trigger').setAttribute('aria-expanded', 'false');
          openItem.querySelector('.faq-body').hidden = true;
        }
      });

      if (isOpen) {
        item.classList.remove('is-open');
        this.setAttribute('aria-expanded', 'false');
        body.hidden = true;
      } else {
        item.classList.add('is-open');
        this.setAttribute('aria-expanded', 'true');
        body.hidden = false;
      }
    });
  });
}

/* ==========================================================================
   QRコード生成
   ========================================================================== */

function initQRCode() {
  const qrContainer = document.getElementById('qrcode');
  if (!qrContainer) return;

  // 現在のページURLを取得
  const pageUrl = window.location.href.split('?')[0];

  if (typeof QRCode === 'undefined') {
    // ライブラリが読み込まれていない場合のフォールバック
    qrContainer.innerHTML = '<p style="font-size:0.75rem;color:#6B7280;text-align:center;padding:20px;">QRコードは<br>公開後に表示されます</p>';
    return;
  }

  try {
    // QRCodeライブラリでQRコードを生成
    const qr = new QRCode(qrContainer, {
      text: pageUrl,
      width: 120,
      height: 120,
      colorDark: '#1a1a2e',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
  } catch (e) {
    qrContainer.innerHTML = '<p style="font-size:0.75rem;color:#6B7280;text-align:center;padding:10px;">QRコード生成エラー</p>';
  }
}

/* ==========================================================================
   ステップ式予約フォーム
   ========================================================================== */

const STEP_COUNT = 3;
let currentStep = 1;

function setStep(target) {
  const form = document.getElementById('reservationForm');
  if (!form) return;
  const next = Math.max(1, Math.min(STEP_COUNT, target));

  // 各パネル表示切替
  form.querySelectorAll('.step-panel').forEach(panel => {
    const stepNum = Number(panel.dataset.step);
    const isCurrent = stepNum === next;
    panel.classList.toggle('is-active', isCurrent);
    panel.hidden = !isCurrent;
  });

  // プログレスバー
  const fill = document.getElementById('stepProgressFill');
  if (fill) fill.style.width = ((next / STEP_COUNT) * 100).toFixed(2) + '%';

  // ラベル状態
  document.querySelectorAll('.step-progress-labels li').forEach(li => {
    const n = Number(li.dataset.stepLabel);
    li.classList.toggle('is-active', n === next);
    li.classList.toggle('is-done', n < next);
  });

  currentStep = next;

  // ステップ3に来たら入力内容のサマリー表示
  if (next === 3) renderStepSummary();

  // スクロール（モバイルでフォーム上部が見えるように）
  const form_top = form.getBoundingClientRect().top + window.scrollY;
  const headerH = document.querySelector('.site-header')?.offsetHeight || 64;
  if (window.scrollY > form_top - headerH - 20) {
    window.scrollTo({ top: form_top - headerH - 16, behavior: 'smooth' });
  }
}

function validateStep(step) {
  clearErrors();
  let ok = true;

  if (step === 1) {
    const usage = document.getElementById('usage');
    const duration = document.getElementById('duration');
    if (!usage.value) { showError('usageError', 'ご利用目的を選択してください'); ok = false; }
    if (!duration.value) { showError('durationError', 'ご利用時間を選択してください'); ok = false; }
  }

  if (step === 2) {
    const date = document.getElementById('date');
    if (!date.value) {
      showError('dateError', 'ご希望日時を選択してください'); ok = false;
    } else {
      const selected = new Date(date.value);
      if (selected <= new Date()) {
        showError('dateError', '未来の日時を選択してください'); ok = false;
      }
    }
  }

  if (step === 3) {
    const name = document.getElementById('name');
    const phone = document.getElementById('phone');
    const email = document.getElementById('email');
    if (!name.value.trim()) { showError('nameError', 'お名前を入力してください'); ok = false; }
    if (!phone.value.trim()) {
      showError('phoneError', '電話番号を入力してください'); ok = false;
    } else if (!/^[\d\-\+\(\)\s]{7,15}$/.test(phone.value.trim())) {
      showError('phoneError', '正しい電話番号を入力してください'); ok = false;
    }
    if (email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
      showError('emailError', '正しいメールアドレスを入力してください'); ok = false;
    }
  }

  return ok;
}

function renderStepSummary() {
  const summary = document.getElementById('stepSummary');
  if (!summary) return;

  const usage = document.getElementById('usage');
  const duration = document.getElementById('duration');
  const date = document.getElementById('date');

  const usageText = usage.options[usage.selectedIndex]?.text || '';
  const durationText = duration.options[duration.selectedIndex]?.text || '';
  const dateRaw = date.value;
  let dateText = '';
  if (dateRaw) {
    const d = new Date(dateRaw);
    dateText = `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日（${'日月火水木金土'[d.getDay()]}）${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')} 〜`;
  }

  summary.innerHTML = `
    <span class="step-summary-title">📋 ご入力内容の確認</span>
    <dl>
      <dt>ご利用</dt><dd>${escapeHtml(usageText)}</dd>
      <dt>時間</dt><dd>${escapeHtml(durationText)}</dd>
      <dt>日時</dt><dd>${escapeHtml(dateText)}</dd>
    </dl>
  `;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function initReservationForm() {
  const form = document.getElementById('reservationForm');
  const successBox = document.getElementById('formSuccess');
  if (!form) return;

  // 次へ / 戻るボタン
  form.addEventListener('click', function (e) {
    const nextBtn = e.target.closest('.btn-step-next');
    const backBtn = e.target.closest('.btn-back');
    if (nextBtn) {
      e.preventDefault();
      if (!validateStep(currentStep)) return;
      const target = Number(nextBtn.dataset.go);
      setStep(target);
    } else if (backBtn) {
      e.preventDefault();
      const target = Number(backBtn.dataset.go);
      setStep(target);
    }
  });

  // 送信
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validateStep(3)) return;

    const submitBtn = form.querySelector('.btn-submit');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '送信中...'; }

    setTimeout(() => {
      form.hidden = true;
      successBox.hidden = false;
      successBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 800);
  });

  // 初期表示
  setStep(1);
}

function showError(id, message) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = message;
  }
  const inputId = id.replace('Error', '');
  const input = document.getElementById(inputId);
  if (input) {
    input.style.borderColor = '#DC2626';
  }
}

function clearErrors() {
  const errorMsgs = document.querySelectorAll('.error-msg');
  errorMsgs.forEach(el => { el.textContent = ''; });
  const inputs = document.querySelectorAll('.form-group input, .form-group select, .form-group textarea');
  inputs.forEach(input => { input.style.borderColor = ''; });
}

/* ==========================================================================
   スムーズスクロール (ナビリンク)
   ========================================================================== */

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const headerH = document.querySelector('.site-header')?.offsetHeight || 64;
      const top = target.getBoundingClientRect().top + window.scrollY - headerH - 16;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
}

/* ==========================================================================
   フローティングCTAの表示制御
   ========================================================================== */

function initFloatingCTA() {
  const cta = document.querySelector('.floating-cta');
  if (!cta) return;

  // ページ読み込み直後から表示（ヒーロー内CTAを排した分、ここを常時CTAに）
  cta.style.opacity = '1';
  cta.style.transform = 'translateY(0)';
  cta.style.transition = 'opacity 0.3s, transform 0.3s';

  let shown = true;

  function checkScroll() {
    if (!shown) {
      cta.style.opacity = '1';
      cta.style.transform = 'translateY(0)';
      shown = true;
    }
    // フッターおよび予約フォームセクション付近では非表示
    const footer = document.querySelector('.site-footer');
    const reservation = document.querySelector('.reservation-section');
    let hide = false;
    if (footer) {
      const footerTop = footer.getBoundingClientRect().top;
      if (footerTop < window.innerHeight) hide = true;
    }
    if (reservation) {
      const r = reservation.getBoundingClientRect();
      // 予約セクションが画面に入ったら非表示（既にCTAの代わりとなるため）
      if (r.top < window.innerHeight - 100 && r.bottom > 100) hide = true;
    }
    if (hide) {
      cta.style.opacity = '0';
      cta.style.pointerEvents = 'none';
    } else if (shown) {
      cta.style.opacity = '1';
      cta.style.pointerEvents = 'auto';
    }
  }

  window.addEventListener('scroll', checkScroll, { passive: true });
  checkScroll();
}

/* ==========================================================================
   画像エラーハンドリング
   ========================================================================== */

function initImageErrorHandling() {
  // プログラムカード画像のエラー処理
  document.querySelectorAll('.program-card-img').forEach(img => {
    img.addEventListener('error', function () {
      const wrap = this.closest('.program-card-img-wrap');
      if (wrap) {
        wrap.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:200px;font-size:3rem;background:#EFF6FF;">🎭</div>';
      }
    });
  });

  // ヒーロー画像は onerror をHTMLで処理済み
}

/* ==========================================================================
   ヒーロースライドショー（自動フェード回転）
   ========================================================================== */

function initHeroSlideshow() {
  const slides = document.querySelectorAll('.hero-bg-img');
  const messages = document.querySelectorAll('.hero-message');
  const dots = document.querySelectorAll('.hero-indicators button');
  if (slides.length < 2) return;

  const total = slides.length;
  const INTERVAL = 5500;
  let current = 0;
  let timer = null;

  function go(idx) {
    current = ((idx % total) + total) % total;
    slides.forEach((el, i) => el.classList.toggle('is-active', i === current));
    messages.forEach((el, i) => el.classList.toggle('is-active', i === current));
    dots.forEach((el, i) => {
      el.classList.toggle('is-active', i === current);
      el.setAttribute('aria-selected', String(i === current));
    });
  }

  function start() {
    stop();
    timer = setInterval(() => go(current + 1), INTERVAL);
  }
  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  // ドットクリックで切替＆タイマーリセット
  dots.forEach((btn, i) => {
    btn.addEventListener('click', () => { go(i); start(); });
  });

  // ホバー中は一時停止（PC）
  const hero = document.querySelector('.hero');
  hero?.addEventListener('mouseenter', stop);
  hero?.addEventListener('mouseleave', start);

  // タブ非表示時はタイマー停止（電池配慮）
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop(); else start();
  });

  // スワイプ操作
  let touchStartX = null;
  hero?.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    stop();
  }, { passive: true });
  hero?.addEventListener('touchend', (e) => {
    if (touchStartX === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) go(current + (dx < 0 ? 1 : -1));
    touchStartX = null;
    start();
  }, { passive: true });

  // アクセシビリティ：モーション低減設定では自動回転しない
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    go(0);
    return;
  }

  go(0);
  start();
}

/* ==========================================================================
   プログラムカード「もっと見る」（PC: 3件 / スマホ: 1件）
   ========================================================================== */

const MOBILE_BREAKPOINT = 640;

function applyShowMore() {
  const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
  const visibleCount = isMobile ? 1 : 3;

  document.querySelectorAll('.program-grid').forEach(grid => {
    const cards = Array.from(grid.querySelectorAll('.program-card'));
    cards.forEach((card, idx) => {
      card.classList.toggle('is-hidden', idx >= visibleCount);
    });

    const wrap = grid.parentElement?.querySelector('.show-more-wrap');
    if (!wrap) return;
    const btn = wrap.querySelector('.show-more-btn');
    const hiddenCount = Math.max(0, cards.length - visibleCount);

    if (hiddenCount === 0) {
      wrap.classList.add('is-empty');
      return;
    }
    wrap.classList.remove('is-empty');

    const isExpanded = grid.classList.contains('is-expanded');
    if (btn) {
      btn.setAttribute('aria-expanded', String(isExpanded));
      btn.textContent = isExpanded ? '閉じる' : `もっと見る（+${hiddenCount}件）`;
    }
  });
}

function initShowMore() {
  document.querySelectorAll('.show-more-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      const wrap = this.closest('.show-more-wrap');
      const body = wrap?.parentElement;
      const grid = body?.querySelector('.program-grid');
      if (!grid) return;
      grid.classList.toggle('is-expanded');
      applyShowMore();
    });
  });

  applyShowMore();

  // リサイズで PC ↔ スマホ切替時に件数調整
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(applyShowMore, 120);
  });
}

/* ==========================================================================
   モバイルドロワー（ハンバーガーメニュー）
   ========================================================================== */

function initMobileDrawer() {
  const toggle = document.getElementById('navToggle');
  const drawer = document.getElementById('mobileDrawer');
  const backdrop = document.getElementById('drawerBackdrop');
  const closeBtn = document.getElementById('drawerClose');
  if (!toggle || !drawer || !backdrop) return;

  function open() {
    drawer.classList.add('is-open');
    backdrop.classList.add('is-open');
    backdrop.hidden = false;
    toggle.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'メニューを閉じる');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('drawer-open');
  }
  function close() {
    drawer.classList.remove('is-open');
    backdrop.classList.remove('is-open');
    toggle.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'メニューを開く');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('drawer-open');
    setTimeout(() => { backdrop.hidden = true; }, 260);
  }

  toggle.addEventListener('click', () => {
    if (drawer.classList.contains('is-open')) close();
    else open();
  });
  closeBtn?.addEventListener('click', close);
  backdrop.addEventListener('click', close);

  // ナビリンクをクリックしたら閉じる
  drawer.querySelectorAll('[data-drawer-link]').forEach(link => {
    link.addEventListener('click', close);
  });

  // ESCで閉じる
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('is-open')) close();
  });
}

/* ==========================================================================
   初期化
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {
  initAccordions();
  initQRCode();
  initReservationForm();
  initSmoothScroll();
  initFloatingCTA();
  initImageErrorHandling();
  initMobileDrawer();
  initShowMore();
  initHeroSlideshow();

  // 最初のアコーディオンを開いておく（UX向上）
  const firstAccordion = document.querySelector('.accordion-item');
  if (firstAccordion) {
    const trigger = firstAccordion.querySelector('.accordion-trigger');
    const body = firstAccordion.querySelector('.accordion-body');
    if (trigger && body) {
      firstAccordion.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');
      body.hidden = false;
    }
  }
});
