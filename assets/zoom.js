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
    if (window.INK) INK.sizeCanvas();
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

  /* 二本指のピンチ */
  const touches = new Map();
  let pinch = null;
  const dist = () => {
    const [a, b] = [...touches.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };
  const mid = () => {
    const [a, b] = [...touches.values()];
    return [(a.x + b.x) / 2, (a.y + b.y) / 2];
  };
  scrollEl.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'touch') return;
    touches.set(e.pointerId, {x:e.clientX, y:e.clientY});
    if (touches.size === 2) {
      pinch = {d:dist(), z};
      if (window.INK) INK.cancelStroke();
    }
  }, true);
  scrollEl.addEventListener('pointermove', e => {
    if (e.pointerType !== 'touch' || !touches.has(e.pointerId)) return;
    touches.set(e.pointerId, {x:e.clientX, y:e.clientY});
    if (touches.size === 2 && pinch) {
      e.preventDefault();
      const d = dist();
      if (pinch.d > 0) { const [mx, my] = mid(); zoomAt(pinch.z * (d / pinch.d), mx, my); }
    }
  }, true);
  const end = e => {
    if (e.pointerType !== 'touch') return;
    touches.delete(e.pointerId);
    if (touches.size < 2) pinch = null;
  };
  scrollEl.addEventListener('pointerup', end, true);
  scrollEl.addEventListener('pointercancel', end, true);

  /* トラックパッドのピンチとCtrl+ホイール */
  scrollEl.addEventListener('wheel', e => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    zoomAt(z * Math.pow(0.995, e.deltaY), e.clientX, e.clientY);
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
