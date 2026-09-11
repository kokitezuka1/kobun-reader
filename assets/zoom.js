/* 拡大縮小　─　本文と書き込みを同じ入れ物ごと拡大する。
   二本指のピンチはノートアプリと同じくズームへ完全に譲り、描画には使わない。 */
(function(){
  const scrollEl = document.getElementById('scroll');
  const textEl   = document.getElementById('text');
  if (!scrollEl || !textEl) return;

  const MIN = 0.5, MAX = 5;
  let z = 1;

  /* 本文と書き込みを包む入れ物を作る */
  const sizer = document.createElement('div');
  sizer.id = 'sizer';
  const stage = document.createElement('div');
  stage.id = 'stage';
  scrollEl.insertBefore(sizer, textEl);
  sizer.appendChild(stage);
  stage.appendChild(textEl);

  let W = 1, H = 1;
  function measure() {
    H = Math.max(scrollEl.clientHeight, 1);
    stage.style.height = H + 'px';
    W = Math.max(textEl.scrollWidth, 1);
    stage.style.width = W + 'px';
  }
  function apply() {
    sizer.style.width  = Math.round(W * z) + 'px';
    sizer.style.height = Math.round(H * z) + 'px';
    stage.style.transform = z === 1 ? 'none' : 'scale(' + z + ')';
    scrollEl.dataset.zoomed = z > 1.001 ? 'on' : 'off';
    document.dispatchEvent(new CustomEvent('zoomchange', {detail:{scale:z}}));
  }
  function relayout() { measure(); apply(); }

  /* 画面上の一点を保ったまま倍率を変える */
  function zoomAt(next, cx, cy) {
    next = Math.min(MAX, Math.max(MIN, next));
    if (Math.abs(next - z) < 0.0005) return;
    const r = scrollEl.getBoundingClientRect();
    const px = (scrollEl.scrollLeft + (cx - r.left)) / z;
    const py = (scrollEl.scrollTop  + (cy - r.top))  / z;
    z = next;
    apply();
    scrollEl.scrollLeft = px * z - (cx - r.left);
    scrollEl.scrollTop  = py * z - (cy - r.top);
  }
  const center = () => {
    const r = scrollEl.getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  };

  /* 指の操作　一本指＝移動、二本指＝ピンチしながら移動 */
  const touches = new Map();
  let ges = null;
  const two = () => [...touches.values()];
  const dist = () => { const [a, b] = two(); return Math.hypot(a.x - b.x, a.y - b.y); };
  const mid  = () => { const [a, b] = two(); return [(a.x + b.x) / 2, (a.y + b.y) / 2]; };
  const by = (dx, dy) => { scrollEl.scrollLeft -= dx; scrollEl.scrollTop -= dy; };

  /* 拡大しているときは一本指でも紙を動かせるようにする */
  function fingerPans() { return z > 1.001; }

  scrollEl.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'touch') return;
    touches.set(e.pointerId, {x:e.clientX, y:e.clientY});
    if (touches.size === 1) {
      ges = fingerPans() ? {mode:'pan', x:e.clientX, y:e.clientY} : null;
    } else if (touches.size === 2) {
      const [mx, my] = mid();
      ges = {mode:'pinch', d:dist(), z, x:mx, y:my};
    }
  }, true);

  scrollEl.addEventListener('pointermove', e => {
    if (e.pointerType !== 'touch' || !touches.has(e.pointerId) || !ges) return;
    touches.set(e.pointerId, {x:e.clientX, y:e.clientY});
    if (ges.mode === 'pan' && touches.size === 1) {
      e.preventDefault();
      by(e.clientX - ges.x, e.clientY - ges.y);
      ges.x = e.clientX; ges.y = e.clientY;
      return;
    }
    if (ges.mode === 'pinch' && touches.size === 2) {
      e.preventDefault();
      const d = dist(), [mx, my] = mid();
      by(mx - ges.x, my - ges.y);          // 二本指の中心が動いたぶん紙を動かす
      ges.x = mx; ges.y = my;
      if (ges.d > 0) zoomAt(ges.z * (d / ges.d), mx, my);
    }
  }, true);

  const end = e => {
    if (e.pointerType !== 'touch') return;
    touches.delete(e.pointerId);
    if (touches.size === 1 && fingerPans()) {
      const [a] = two();
      ges = {mode:'pan', x:a.x, y:a.y};     // 一本残ったらそのまま移動へ
    } else if (touches.size === 0) ges = null;
  };
  scrollEl.addEventListener('pointerup', end, true);
  scrollEl.addEventListener('pointercancel', end, true);

  /* パソコンでは スペース＋ドラッグ と 中ボタンドラッグ で動かす */
  let drag = null, space = false;
  document.addEventListener('keydown', e => {
    if (e.code === 'Space' && !e.repeat && e.target === document.body) {
      space = true; document.body.dataset.pan = 'on'; e.preventDefault();
    }
  });
  document.addEventListener('keyup', e => {
    if (e.code === 'Space') { space = false; delete document.body.dataset.pan; }
  });
  scrollEl.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch') return;
    if (e.button !== 1 && !(space && e.button === 0)) return;
    e.preventDefault();
    drag = {x:e.clientX, y:e.clientY};
    try { scrollEl.setPointerCapture(e.pointerId); } catch (err) {}
  }, true);
  scrollEl.addEventListener('pointermove', e => {
    if (!drag) return;
    e.preventDefault();
    by(e.clientX - drag.x, e.clientY - drag.y);
    drag = {x:e.clientX, y:e.clientY};
  }, true);
  const dragEnd = () => { drag = null; };
  scrollEl.addEventListener('pointerup', dragEnd, true);
  scrollEl.addEventListener('pointercancel', dragEnd, true);

  /* トラックパッドのピンチとCtrl+ホイール */
  scrollEl.addEventListener('wheel', e => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      zoomAt(z * Math.pow(0.995, e.deltaY), e.clientX, e.clientY);
      return;
    }

  }, {passive:false});

  document.addEventListener('keydown', e => {
    if (!(e.metaKey || e.ctrlKey)) return;
    if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomAt(z * 1.25, ...center()); }
    else if (e.key === '-') { e.preventDefault(); zoomAt(z / 1.25, ...center()); }
    else if (e.key === '0') { e.preventDefault(); zoomAt(1, ...center()); }
  });

  let rt;
  const later = () => { clearTimeout(rt); rt = setTimeout(relayout, 120); };
  window.addEventListener('resize', later);
  if (window.ResizeObserver) new ResizeObserver(later).observe(scrollEl);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(later);

  window.ZOOM = {
    get scale() { return z; },
    stage, sizer,
    zoomIn:  () => zoomAt(z * 1.25, ...center()),
    zoomOut: () => zoomAt(z / 1.25, ...center()),
    reset:   () => zoomAt(1, ...center()),
    at: zoomAt,
    relayout,
    size: () => ({w:W, h:H})
  };
  relayout();
  scrollEl.scrollLeft = scrollEl.scrollWidth;
})();
