/* 書き込み　─　本文の上に重ねる手書きレイヤー。
   Apple Pencil（pointerType が pen）を主入力とし、ペンを使っている間は
   手のひらや指のタッチを無視する。ノートアプリ側の作りに合わせて、
   ペン・鉛筆・万年筆・マーカー・消しゴム、太さ3段階、レイヤーの表示切り替えを持つ。 */
(function(){
  const WORK = window.WORK;
  if (!WORK) return;
  const scrollEl = document.getElementById('scroll');
  const textEl   = document.getElementById('text');
  if (!scrollEl || !textEl) return;

  const KEY = 'kobun:ink:' + WORK.id;
  const PEN_COLORS    = ['#202124', '#D93025', '#1A73E8', '#188038'];
  const MARKER_COLORS = ['#FFEB3B', '#FF80AB', '#80D8FF', '#B2FF59'];
  const WIDTHS = [1.6, 3, 5.5];
  const TOOLS = {
    pen:      {label:'ペン',   colors:PEN_COLORS},
    pencil:   {label:'鉛筆',   colors:PEN_COLORS},
    fountain: {label:'万年筆', colors:PEN_COLORS},
    marker:   {label:'マーカー', colors:MARKER_COLORS},
    eraser:   {label:'消しゴム', colors:null}
  };

  /* ── 保存されている状態 ─────────────────────── */
  const DEFAULT = () => ({
    layers: [
      {id:'l1', name:'書き込み', visible:true, locked:false, strokes:[]},
      {id:'l2', name:'答え',     visible:true, locked:false, strokes:[]},
      {id:'l3', name:'メモ',     visible:true, locked:false, strokes:[]}
    ],
    active: 'l1'
  });
  let doc;
  try {
    doc = JSON.parse(localStorage.getItem(KEY)) || DEFAULT();
    if (!doc.layers || !doc.layers.length) doc = DEFAULT();
  } catch (e) { doc = DEFAULT(); }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(doc)); } catch (e) {} };
  const layer = id => doc.layers.find(l => l.id === id);
  const activeLayer = () => layer(doc.active) || doc.layers[0];

  /* ── 画面 ───────────────────────────────────── */
  let on = false, tool = 'pen', colorIdx = 0, widthIdx = 1;
  const undoStack = [], redoStack = [];

  const canvas = document.createElement('canvas');
  canvas.className = 'inkcanvas';
  const host = (window.ZOOM && ZOOM.stage) || scrollEl;
  if (host === scrollEl) scrollEl.style.position = 'relative';
  host.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const zoom = () => (window.ZOOM ? ZOOM.scale : 1);

  function sizeCanvas() {
    const sz = window.ZOOM && ZOOM.size();
    const w = sz ? sz.w : Math.max(textEl.scrollWidth, scrollEl.clientWidth, 1);
    const h = sz ? sz.h : Math.max(scrollEl.clientHeight, textEl.offsetHeight, 1);
    if (w < 2 || h < 2) return;          // レイアウト前は測らない
    /* 拡大時もにじまないよう、倍率のぶんだけ実ピクセルを増やす */
    const dpr = Math.min((window.devicePixelRatio || 1) * Math.min(zoom(), 3), 4);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redraw();
  }

  function strokePath(s) {
    const p = s.p;
    if (p.length < 4) return;
    ctx.beginPath();
    ctx.moveTo(p[0], p[1]);
    if (p.length === 4) ctx.lineTo(p[2], p[3]);
    else for (let i = 2; i + 3 < p.length; i += 2) {
      const mx = (p[i] + p[i + 2]) / 2, my = (p[i + 1] + p[i + 3]) / 2;
      ctx.quadraticCurveTo(p[i], p[i + 1], mx, my);
    }
    ctx.stroke();
  }

  function paint(s) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = s.c;
    ctx.lineWidth = s.w;
    if (s.t === 'marker') {
      ctx.globalAlpha = 0.32;
      ctx.lineWidth = s.w * 4.5;
      ctx.lineCap = 'butt';
      ctx.globalCompositeOperation = 'multiply';
    } else if (s.t === 'pencil') {
      ctx.globalAlpha = 0.78;
    } else if (s.t === 'fountain') {
      ctx.globalAlpha = 0.95;
    }
    strokePath(s);
    ctx.restore();
  }

  function redraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    doc.layers.forEach(l => { if (l.visible) l.strokes.forEach(paint); });
  }

  /* ── 入力 ───────────────────────────────────── */
  let drawing = null, pencilSeen = 0, activeId = null;
  let lastTap = 0, lastTapPt = [0, 0], suppress = false, prevTool = 'pen';
  const near = [];                     // ペンが近づいたときに呼ぶ
  const isPen = e => e.pointerType === 'pen';
  const usingPencil = () => Date.now() - pencilSeen < 1500;

  function pos(e) {
    const r = canvas.getBoundingClientRect(), k = zoom();
    return [(e.clientX - r.left) / k, (e.clientY - r.top) / k];
  }
  function hit(s, x, y, r) {
    const p = s.p, pad = (s.t === 'marker' ? s.w * 2.5 : s.w) + r;
    for (let i = 0; i + 1 < p.length; i += 2) {
      if (Math.abs(p[i] - x) < pad && Math.abs(p[i + 1] - y) < pad) return true;
    }
    return false;
  }

  function down(e) {
    if (!on) return;
    if (isPen(e)) pencilSeen = Date.now();
    /* ペンで素早く二度たたくと消しゴムに切り替える（Apple Pencil のダブルタップの代わり） */
    if (isPen(e)) {
      const now = Date.now(), [x0, y0] = pos(e);
      if (now - lastTap < 340 && Math.hypot(x0 - lastTapPt[0], y0 - lastTapPt[1]) * zoom() < 16) {
        suppress = true; lastTap = 0;
        toggleEraser();
        return;
      }
      lastTap = now; lastTapPt = [x0, y0]; suppress = false;
    }
    /* ペンのお尻（消しゴム側）は消しゴムとして扱う */
    if (e.pointerType === 'pen' && (e.buttons & 32) && tool !== 'eraser') toggleEraser();
    /* ペンを使っている間、指と手のひらは描かない（スクロールに回す） */
    if (!isPen(e) && (usingPencil() || !allowTouch)) return;
    if (e.pointerType === 'pen' && e.pressure === 0) return;
    const L = activeLayer();
    if (!L || L.locked) return;
    e.preventDefault();
    activeId = e.pointerId;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    const [x, y] = pos(e);

    if (tool === 'eraser') { erase(x, y); return; }
    const t = tool === 'marker' ? 'marker' : tool;
    const c = (TOOLS[tool].colors || PEN_COLORS)[colorIdx];
    drawing = {id:'s' + Date.now().toString(36), t, c, w:WIDTHS[widthIdx], p:[x, y]};
  }

  function move(e) {
    if (!on || e.pointerId !== activeId) return;
    if (isPen(e)) pencilSeen = Date.now();
    const [x, y] = pos(e);
    if (tool === 'eraser') { if (drawingErase) erase(x, y); return; }
    if (!drawing) return;
    e.preventDefault();
    let pts = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
    if (!pts || !pts.length) pts = [e];
    pts.forEach(pt => { const [a, b] = pos(pt); drawing.p.push(a, b); });
    paint(drawing);
  }

  function up(e) {
    if (suppress) { suppress = false; activeId = null; drawing = null; return; }
    if (e.pointerId !== activeId) return;
    activeId = null;
    drawingErase = false;
    if (!drawing) return;
    if (drawing.p.length >= 4) {
      const L = activeLayer();
      L.strokes.push(drawing);
      undoStack.push({op:'add', layer:L.id, stroke:drawing});
      redoStack.length = 0;
      save();
    }
    drawing = null;
    redraw();
  }

  let drawingErase = false, allowTouch = false;
  function toggleEraser() {
    if (tool === 'eraser') { tool = prevTool || 'pen'; }
    else { prevTool = tool; tool = 'eraser'; }
    drawing = null;
    near.forEach(fn => fn('tool'));
  }

  /* ペンが画面に近づいたら知らせる（ホバーに対応した iPad のみ届く） */
  function penNear(e) {
    if (e.pointerType !== 'pen') return;
    pencilSeen = Date.now();
    near.forEach(fn => fn('near'));
  }
  document.addEventListener('pointerover', penNear, true);
  document.addEventListener('pointermove', e => { if (e.pointerType === 'pen') penNear(e); }, true);
  function erase(x, y) {
    drawingErase = true;
    const L = activeLayer();
    for (let i = L.strokes.length - 1; i >= 0; i--) {
      if (hit(L.strokes[i], x, y, WIDTHS[widthIdx] * 3)) {
        const [s] = L.strokes.splice(i, 1);
        undoStack.push({op:'del', layer:L.id, stroke:s, at:i});
        redoStack.length = 0;
        save(); redraw();
        break;
      }
    }
  }

  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('pointerleave', up);

  function undo() {
    const a = undoStack.pop(); if (!a) return;
    const L = layer(a.layer); if (!L) return;
    if (a.op === 'add') L.strokes.pop();
    else L.strokes.splice(a.at, 0, a.stroke);
    redoStack.push(a); save(); redraw();
  }
  function redo() {
    const a = redoStack.pop(); if (!a) return;
    const L = layer(a.layer); if (!L) return;
    if (a.op === 'add') L.strokes.push(a.stroke);
    else L.strokes.splice(a.at, 1);
    undoStack.push(a); save(); redraw();
  }

  window.INK = {
    setOn(v) {
      on = v;
      document.body.dataset.ink = v ? 'on' : 'off';
      if (v) sizeCanvas();
    },
    isOn: () => on,
    setTool(t) { tool = t; if (TOOLS[t].colors && colorIdx >= TOOLS[t].colors.length) colorIdx = 0; },
    getTool: () => tool,
    setColor(i) { colorIdx = i; },
    getColor: () => colorIdx,
    setWidth(i) { widthIdx = i; },
    getWidth: () => widthIdx,
    colors: () => TOOLS[tool].colors,
    TOOLS, WIDTHS,
    undo, redo, redraw, save, sizeCanvas,
    doc: () => doc,
    setActive(id) { doc.active = id; save(); },
    toggleVisible(id) { const l = layer(id); if (l) { l.visible = !l.visible; save(); redraw(); } },
    toggleLock(id) { const l = layer(id); if (l) { l.locked = !l.locked; save(); } },
    rename(id, name) { const l = layer(id); if (l) { l.name = name; save(); } },
    addLayer() {
      const id = 'l' + Date.now().toString(36);
      doc.layers.push({id, name:'レイヤー' + (doc.layers.length + 1), visible:true, locked:false, strokes:[]});
      doc.active = id; save(); return id;
    },
    removeLayer(id) {
      if (doc.layers.length <= 1) return false;
      doc.layers = doc.layers.filter(l => l.id !== id);
      if (doc.active === id) doc.active = doc.layers[0].id;
      save(); redraw(); return true;
    },
    clearLayer(id) {
      const l = layer(id); if (!l) return;
      l.strokes = []; undoStack.length = 0; redoStack.length = 0; save(); redraw();
    },
    setAllowTouch(v) { allowTouch = v; },
    cancelStroke() { drawing = null; activeId = null; redraw(); },
    onPen(fn) { near.push(fn); },
    toggleEraser,
    allowTouch: () => allowTouch,
    count: () => doc.layers.reduce((n, l) => n + l.strokes.length, 0)
  };

  let rt;
  const later = () => { clearTimeout(rt); rt = setTimeout(sizeCanvas, 120); };
  window.addEventListener('resize', later);
  if (window.ResizeObserver) new ResizeObserver(later).observe(scrollEl);
  document.fonts && document.fonts.ready && document.fonts.ready.then(later);
  document.addEventListener('zoomchange', () => { sizeCanvas(); });
  sizeCanvas();
  redraw();
})();
