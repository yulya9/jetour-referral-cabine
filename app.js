/* JETOUR referral cabinet: scroll choreography and interface behaviour. */
(function () {
  'use strict';
  var html = document.documentElement;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a === undefined ? 0 : a, Math.min(b === undefined ? 1 : b, v)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var REF = 'https://jetour-ru.com/?ref=ivanov';

  /* ---------- toast ---------- */
  var toast = document.createElement('div');
  toast.className = 'toast'; toast.setAttribute('role', 'status');
  document.body.appendChild(toast);
  var toastTimer;
  function say(text) {
    toast.textContent = text; toast.classList.add('is-on');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { toast.classList.remove('is-on'); }, 2400);
  }

  /* ---------- popovers (fixed to body, so panels with overflow:clip do not cut them) ---------- */
  var openPop = null;
  function place(pop, anchor, align) {
    var r = anchor.getBoundingClientRect();
    pop.style.minWidth = r.width + 'px';
    pop.style.top = (r.bottom + 8) + 'px';
    var w = pop.offsetWidth;
    var left = align === 'right' ? r.right - w : r.left;
    pop.style.left = clamp(left, 8, window.innerWidth - w - 8) + 'px';
  }
  function closePop() {
    if (!openPop) return;
    openPop.pop.classList.remove('is-open');
    openPop.anchor.setAttribute('aria-expanded', 'false');
    openPop = null;
  }
  function showPop(pop, anchor, align) {
    closePop();
    place(pop, anchor, align);
    pop.classList.add('is-open');
    anchor.setAttribute('aria-expanded', 'true');
    openPop = { pop: pop, anchor: anchor, align: align };
  }
  document.addEventListener('pointerdown', function (e) {
    if (openPop && !openPop.pop.contains(e.target) && !openPop.anchor.contains(e.target)) closePop();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && openPop) { var a = openPop.anchor; closePop(); a.focus(); }
  });
  window.addEventListener('resize', function () { if (openPop) place(openPop.pop, openPop.anchor, openPop.align); });
  window.addEventListener('scroll', function () { if (openPop) place(openPop.pop, openPop.anchor, openPop.align); }, { passive: true });

  function listNav(pop, anchor) {
    pop.addEventListener('keydown', function (e) {
      var items = $$('.pop-item', pop), i = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
      else if (e.key === 'Home') { e.preventDefault(); items[0].focus(); }
      else if (e.key === 'End') { e.preventDefault(); items[items.length - 1].focus(); }
      else if (e.key === 'Tab') { closePop(); }
    });
  }
  var TICK = '<svg class="tick" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6.5l2.8 2.8L10 3.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /* ---------- month / year selects ---------- */
  var MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  var YEARS = ['2024', '2025', '2026'];
  var ratingList = $('.rating-list');
  function replayRows() {
    $$('.rating-row', ratingList).forEach(function (r, i) { r.style.setProperty('--i', i); });
    ratingList.classList.remove('replay'); void ratingList.offsetWidth; ratingList.classList.add('replay');
  }
  $$('.select').forEach(function (btn) {
    var kind = btn.getAttribute('data-kind');
    var data = kind === 'month' ? MONTHS : YEARS;
    var pop = document.createElement('div');
    pop.className = 'pop' + (kind === 'month' ? ' menu-months' : '');
    pop.setAttribute('role', 'listbox'); pop.setAttribute('aria-label', kind === 'month' ? 'Месяц' : 'Год');
    var label = $('span', btn);
    data.forEach(function (name) {
      var it = document.createElement('button');
      it.type = 'button'; it.className = 'pop-item'; it.setAttribute('role', 'option');
      it.setAttribute('aria-selected', name === label.textContent ? 'true' : 'false');
      it.innerHTML = '<span>' + name + '</span>' + TICK;
      it.addEventListener('click', function () {
        $$('.pop-item', pop).forEach(function (o) { o.setAttribute('aria-selected', o === it ? 'true' : 'false'); });
        var changed = label.textContent !== name;
        label.textContent = name; closePop(); btn.focus();
        if (changed) { replayRows(); if (window.__countRating) window.__countRating(); }
      });
      pop.appendChild(it);
    });
    document.body.appendChild(pop); listNav(pop, btn);
    function toggle() {
      if (openPop && openPop.pop === pop) { closePop(); return; }
      showPop(pop, btn, 'left');
      var sel = $('[aria-selected="true"]', pop) || $('.pop-item', pop);
      if (sel) { sel.focus({ preventScroll: true }); sel.scrollIntoView({ block: 'nearest' }); }
    }
    btn.addEventListener('click', toggle);
    btn.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!(openPop && openPop.pop === pop)) toggle(); }
    });
  });

  /* ---------- copy link ---------- */
  var copyBtn = $('#copy-btn'), copyLive = $('#copy-live'), copyTimer;
  var checkPath = $('.mag-check path', copyBtn), checkLen = checkPath.getTotalLength();
  checkPath.style.strokeDasharray = checkLen; checkPath.style.strokeDashoffset = checkLen;
  function copyDone(ok) {
    clearTimeout(copyTimer);
    if (ok) {
      copyBtn.classList.add('is-done'); copyLive.textContent = 'Скопировано';
      if (window.gsap) gsap.fromTo(checkPath, { strokeDashoffset: checkLen }, { strokeDashoffset: 0, duration: 0.5, ease: 'power2.out' });
      else checkPath.style.strokeDashoffset = 0;
    } else { copyLive.textContent = 'Не удалось скопировать'; say('Не удалось скопировать ссылку'); }
    copyTimer = setTimeout(function () {
      copyBtn.classList.remove('is-done'); copyLive.textContent = '';
      checkPath.style.strokeDashoffset = checkLen;
    }, 2000);
  }
  function fallbackCopy(text) {
    var t = document.createElement('textarea');
    t.value = text; t.setAttribute('readonly', ''); t.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(t); t.select();
    var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(t); return ok;
  }
  copyBtn.addEventListener('click', function () {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(REF).then(function () { copyDone(true); }, function () { copyDone(fallbackCopy(REF)); });
    } else { copyDone(fallbackCopy(REF)); }
  });

  /* ---------- share menu ---------- */
  var shareBtn = $('.link-panel .icon-btn');
  shareBtn.setAttribute('aria-haspopup', 'menu'); shareBtn.setAttribute('aria-expanded', 'false');
  var sharePop = document.createElement('div');
  sharePop.className = 'pop'; sharePop.setAttribute('role', 'menu');
  var u = encodeURIComponent(REF), tx = encodeURIComponent('Моя ссылка на тест-драйв JETOUR');
  [['Telegram', 'https://t.me/share/url?url=' + u + '&text=' + tx], ['ВКонтакте', 'https://vk.com/share.php?url=' + u], ['WhatsApp', 'https://wa.me/?text=' + tx + '%20' + u]].forEach(function (p) {
    var a = document.createElement('a');
    a.className = 'pop-item'; a.setAttribute('role', 'menuitem'); a.href = p[1]; a.target = '_blank'; a.rel = 'noopener';
    a.textContent = p[0]; a.addEventListener('click', closePop); sharePop.appendChild(a);
  });
  var other = document.createElement('button');
  other.type = 'button'; other.className = 'pop-item'; other.setAttribute('role', 'menuitem'); other.textContent = 'Другое приложение…';
  other.addEventListener('click', function () {
    closePop();
    if (navigator.share) { navigator.share({ title: 'JETOUR', url: REF }).catch(function () {}); }
    else { copyBtn.click(); say('Ссылка скопирована'); }
  });
  sharePop.appendChild(other); document.body.appendChild(sharePop); listNav(sharePop, shareBtn);
  shareBtn.addEventListener('click', function () {
    if (openPop && openPop.pop === sharePop) { closePop(); return; }
    showPop(sharePop, shareBtn, 'right'); $('.pop-item', sharePop).focus({ preventScroll: true });
  });

  /* ---------- log out confirmation ---------- */
  var outBtn = $('.profile-menu .btn');
  outBtn.setAttribute('aria-haspopup', 'dialog'); outBtn.setAttribute('aria-expanded', 'false');
  var outPop = document.createElement('div');
  outPop.className = 'pop pop-confirm'; outPop.setAttribute('role', 'dialog'); outPop.setAttribute('aria-label', 'Выход из кабинета');
  outPop.innerHTML = '<p>Выйти из личного кабинета?</p><div class="row"><button class="btn btn-primary" type="button" data-yes>Выйти</button><button class="btn btn-outline" type="button" data-no>Остаться</button></div>';
  document.body.appendChild(outPop);
  outBtn.addEventListener('click', function () {
    if (openPop && openPop.pop === outPop) { closePop(); return; }
    showPop(outPop, outBtn, 'right'); $('[data-no]', outPop).focus({ preventScroll: true });
  });
  $('[data-no]', outPop).addEventListener('click', function () { closePop(); outBtn.focus(); });
  $('[data-yes]', outPop).addEventListener('click', function () { closePop(); say('Вы вышли из кабинета'); });

  /* ---------- history: the list is longer than the panel, so the cut-off row says "there is more" ---------- */
  var viewAll = $('#view-all'), hList = $('#history-list');
  function histState() {
    var more = hList.scrollTop + hList.clientHeight < hList.scrollHeight - 4;
    hList.classList.toggle('has-more', more);
  }
  var bar = $('#hist-bar'), thumb = $('i', bar), dragY = null;
  function histBar() {
    var ch = hList.clientHeight, sh = hList.scrollHeight;
    if (sh <= ch + 1) { bar.classList.remove('is-on'); return; }
    var th = Math.max(36, ch * ch / sh), max = sh - ch;
    bar.style.top = hList.offsetTop + 'px'; bar.style.height = ch + 'px';
    thumb.style.height = th + 'px';
    thumb.style.transform = 'translateY(' + (hList.scrollTop / max * (ch - th)) + 'px)';
    bar.classList.add('is-on');
  }
  thumb.addEventListener('pointerdown', function (e) { dragY = e.clientY - thumb.getBoundingClientRect().top; thumb.setPointerCapture(e.pointerId); bar.classList.add('is-drag'); hList.style.scrollBehavior = 'auto'; });
  thumb.addEventListener('pointermove', function (e) {
    if (dragY === null) return;
    var ch = hList.clientHeight, sh = hList.scrollHeight, th = thumb.offsetHeight;
    var y = e.clientY - bar.getBoundingClientRect().top - dragY;
    hList.scrollTop = Math.max(0, Math.min(1, y / (ch - th))) * (sh - ch);
  });
  thumb.addEventListener('pointerup', function () { dragY = null; bar.classList.remove('is-drag'); hList.style.scrollBehavior = ''; });
  bar.addEventListener('pointerdown', function (e) { if (e.target === bar) hList.scrollTop += (e.clientY < thumb.getBoundingClientRect().top ? -1 : 1) * hList.clientHeight * 0.8; });
  hList.addEventListener('scroll', function () { histBar(); histState(); }, { passive: true });
  window.addEventListener('resize', function () { histBar(); histState(); });
  window.addEventListener('load', function () { histBar(); histState(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { histBar(); histState(); });
  viewAll.addEventListener('click', function () { say('Полная история откроется отдельной страницей'); });
  histState(); histBar();

  /* ---------- stat cards: open on tap / Enter (hover and focus are handled in CSS) ---------- */
  var cards = $$('.stat-card');
  cards.forEach(function (c) {
    c.addEventListener('click', function (e) {
      if (e.target.closest('a')) return;
      var was = c.classList.contains('is-open');
      cards.forEach(function (o) { o.classList.remove('is-open'); });
      if (!was && window.matchMedia('(hover: none)').matches) c.classList.add('is-open');
    });
    c.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); c.classList.toggle('is-open'); }
    });
  });

  /* ---------- rules = one big button ---------- */
  $('#rules').addEventListener('click', function (e) {
    e.preventDefault(); say('Файл «Правила программы» (PDF) будет подключён здесь');
  });

  /* ---------- scroll choreography: Lenis (smooth scroll) + GSAP ScrollTrigger (scrubbed timelines) ---------- */
  if (!window.gsap || !window.ScrollTrigger || reduce) return;
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  var mm = gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)', function () {
    html.classList.add('anim');

    // smooth scroll, one shared ticker (Lenis README pattern)
    var lenis = window.Lenis ? new Lenis({ lerp: 0.1, wheelMultiplier: 0.9, smoothWheel: true }) : null;
    var tick = function (t) { lenis.raf(t * 1000); };
    if (lenis) { lenis.on('scroll', ScrollTrigger.update); gsap.ticker.add(tick); }
    gsap.ticker.lagSmoothing(0);

    var q = function (s) { return document.querySelector(s); };
    var hero = q('.hero'), stats = q('.stats'), rating = q('.rating');

    // the pinned statistics block may be taller than a short viewport
    function stick() { stats.style.setProperty('--stick', Math.min(0, window.innerHeight - stats.offsetHeight) + 'px'); }
    stick();
    ScrollTrigger.addEventListener('refreshInit', stick);

    // 1. hero: while it scrolls away its edges pull in and the corners round
    gsap.to(hero, {
      scale: 0.92, ease: 'none', force3D: true,
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true }
    });
    // corners reach the same radius as every other block (28 px on screen) within the first 180 px of scroll
    gsap.to(hero, {
      borderRadius: 28 / 0.92, ease: 'power1.out',
      scrollTrigger: { trigger: hero, start: 'top top', end: '+=180', scrub: true }
    });

    // line-by-line reveal of the headings (time based, plays once)
    gsap.set('.ln > span', { yPercent: 115 });
    function reveal(sel, trigger, start, delay) {
      var spans = document.querySelectorAll(sel + ' .ln > span');
      ScrollTrigger.create({ trigger: trigger, start: start, once: true, onEnter: function () {
        gsap.to(spans, { yPercent: 0, duration: 1.1, stagger: 0.14, delay: delay || 0, ease: 'power4.out' });
      } });
    }
    reveal('.stats .section-title', stats, 'top 80%');
    reveal('.rating .section-title', rating, 'top 80%');
    reveal('.rules-title', '.rules', 'top 90%');

    // counters: numbers run up from zero when their block comes into view
    function countUp(nodes, delay) {
      nodes.forEach(function (el, i) {
        var to = +el.getAttribute('data-to'), o = { v: 0 };
        el.textContent = '0';
        gsap.to(o, { v: to, duration: 1.5, delay: (delay || 0) + i * 0.12, ease: 'power3.out', onUpdate: function () { el.textContent = Math.round(o.v); } });
      });
    }
    window.__countRating = function () { countUp(Array.prototype.slice.call(document.querySelectorAll('.score')), 0.1); };
    ScrollTrigger.create({ trigger: '.stat-cards', start: 'top 72%', once: true, onEnter: function () { countUp(Array.prototype.slice.call(document.querySelectorAll('.value')), 0.1); } });
    ScrollTrigger.create({ trigger: '.rating-history', start: 'top 72%', once: true, onEnter: function () { window.__countRating(); } });
    document.querySelectorAll('.value').forEach(function (el) { el.textContent = '0'; });
    document.querySelectorAll('.score').forEach(function (el) { el.textContent = '0'; });

    // 3. the rating block rises over the pinned statistics; statistics sinks and dims
    gsap.to(stats, {
      scale: 0.94, y: -8, '--dim': 0.5, ease: 'none', force3D: true,
      scrollTrigger: { trigger: rating, start: 'top bottom', end: 'top top', scrub: true }
    });

    // once the rating block has fully covered the statistics, hide it so no dark edge shows under the rating while it shrinks
    ScrollTrigger.create({
      trigger: rating, start: 'top top',
      onEnter: function () { gsap.set(stats, { autoAlpha: 0 }); },
      onLeaveBack: function () { gsap.set(stats, { autoAlpha: 1 }); }
    });

    // 4. rating rows and history items simply appear, one after another (time based, not scrubbed)
    gsap.from('.rating-row', {
      y: 32, opacity: 0, duration: 0.9, stagger: 0.1, ease: 'power3.out', clearProps: 'opacity,transform',
      scrollTrigger: { trigger: '.rating-history', start: 'top 72%', toggleActions: 'play none none none' }
    });
    gsap.from('.hist-item', {
      y: 32, opacity: 0, duration: 0.9, stagger: 0.1, delay: 0.25, ease: 'power3.out', clearProps: 'opacity,transform',
      scrollTrigger: { trigger: '.rating-history', start: 'top 72%', toggleActions: 'play none none none' }
    });

    // 5. rating leaves like the hero: edges pull in as it scrolls away
    gsap.to(rating, {
      scale: 0.92, ease: 'none', force3D: true,
      scrollTrigger: { trigger: rating, start: 'bottom 85%', end: 'bottom top', scrub: true }
    });


    // hero photo: parallax and slow zoom while the hero scrolls away, headlights breathe
    var mediaInner = q('.hero-media-inner');
    gsap.to(mediaInner, { yPercent: 3.5, scale: 1.08, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.glow', { opacity: 0.9, scale: 1.18, duration: 1.4, ease: 'sine.inOut', yoyo: true, repeat: -1, stagger: 0.18 });

    // marquee: constant drift, speeds up with scroll velocity and follows the scroll direction
    var mTrack = q('.marquee-track');
    if (mTrack) {
      var drift = gsap.to(mTrack, { xPercent: -50, duration: 48, ease: 'none', repeat: -1 });
      var dir = 1, boost = 0;
      ScrollTrigger.create({
        onUpdate: function (self) { dir = self.direction || dir; boost = Math.min(10, Math.max(boost, Math.abs(self.getVelocity()) / 420)); }
      });
      gsap.ticker.add(function () { boost *= 0.94; drift.timeScale(dir * (1 + boost)); });
    }

    // first screen: quiet entrance (plays once on load)
    gsap.timeline({ defaults: { ease: 'power4.out' } })
      .to('.hero-title .ln > span', { yPercent: 0, duration: 1.2, stagger: 0.14 }, 0.1)
      .from('.hero-lead', { y: 32, opacity: 0, duration: 1 }, 0.35)
      .from('.link-panel', { y: 40, opacity: 0, duration: 1 }, 0.5)
      .from('.friends-badge', { scale: 0.4, opacity: 0, rotate: -50, duration: 1.3, ease: 'back.out(1.6)' }, 0.7)
      .from('.cabinet-nav', { y: -16, opacity: 0, duration: 0.9 }, 0.2);

    // sticky offsets and trigger positions need fresh numbers once fonts and the photo are in
    var refresh = function () { stick(); ScrollTrigger.refresh(); };
    window.addEventListener('load', refresh);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);

    return function () {
      html.classList.remove('anim');
      if (lenis) { gsap.ticker.remove(tick); lenis.destroy(); }
    };
  });
})();
