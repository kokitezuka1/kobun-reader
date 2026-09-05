(function(){
  const WORK   = window.WORK;
  const textEl = document.getElementById('text');
  const paneW  = document.getElementById('pane-w');
  const paneA  = document.getElementById('pane-a');
  const DAN    = WORK.dan;

  /* ── 本文を組む ─────────────────────── */
  const flat = [];            // クリック可能な語だけを通し番号で保持
  const seq  = [];            // 記号も含めた本文の並び（前後の文脈表示用）
  DAN.forEach(dan => {
    const sec = document.createElement('section');
    sec.className = 'dan';

    const mark = document.createElement('div');
    mark.className = 'dan-mark';
    mark.textContent = DAN.length > 1 ? '第' + dan.n + '段' : (dan.n || '本文');
    sec.appendChild(mark);

    const body = document.createElement('div');
    body.className = 'body';
    dan.t.forEach(tk => {
      if (tk.c === 'br') { body.appendChild(document.createElement('br')); return; }
      const el = document.createElement('span');
      if (tk.c === 'pn') {
        el.className = 'pn'; el.textContent = tk.s; body.appendChild(el);
        seq.push({s: tk.s, i: -1}); return;
      }
      const i = flat.length;
      seq.push({s: tk.s, i});
      el.className = 'w ' + tk.c + (tk.kei ? ' kei' : '');
      el.textContent = tk.s;
      el.dataset.i = i;
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', i === 0 ? '0' : '-1');
      el.setAttribute('aria-label', tk.s + '　' + tk.p);
      body.appendChild(el);
      flat.push({tk, el, dan: dan.n});
    });
    sec.appendChild(body);

    const yaku = document.createElement('div');
    yaku.className = 'yaku';
    yaku.innerHTML = '<span class="tag">現代語訳</span>';
    yaku.appendChild(document.createTextNode(dan.y));
    sec.appendChild(yaku);

    textEl.appendChild(sec);
  });

  /* 読み終わりの見返し ─ 次の章段へ */
  if (window.WORKS && WORKS.length > 1) {
    const at = WORKS.findIndex(w => w.id === WORK.id);
    const nx = WORKS[(at + 1) % WORKS.length];
    const end = document.createElement('section');
    end.className = 'dan endleaf';
    end.innerHTML =
      '<div class="dan-mark">読み終わり</div>' +
      '<a class="nextwork" href="' + nx.id + '.html">' +
      '<span class="nw-lab">次の章段</span>' +
      '<span class="nw-title">' + nx.work + '『' + nx.title + '』</span></a>';
    textEl.appendChild(end);
  }

  /* ── 語釈パネル ─────────────────────── */
  let cur = -1;
  const esc = s => s.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));

  function context(i){
    const at = seq.findIndex(o => o.i === i);
    let html = '';
    for (let j = Math.max(0, at - 6); j < Math.min(seq.length, at + 7); j++){
      html += j === at
        ? '<span class="me">' + esc(seq[j].s) + '</span>'
        : esc(seq[j].s);
    }
    return html;
  }

  function showEmpty(){
    paneW.innerHTML =
      '<div class="empty"><span class="k">語</span>' +
      '本文の語をクリックすると、ここに品詞・活用・意味・語法のメモが表示されます。<br><br>' +
      'まずは<b>助動詞</b>から追うと、' + esc(WORK.hint || 'この文章の語り口') + 'がつかめます。</div>';
  }

  function select(i, scroll){
    if (i < 0 || i >= flat.length) return;
    if (cur >= 0) { flat[cur].el.classList.remove('sel'); flat[cur].el.tabIndex = -1; }
    cur = i;
    const {tk, el, dan} = flat[i];
    el.classList.add('sel');
    el.tabIndex = 0;
    if (scroll) el.scrollIntoView({block:'nearest', inline:'nearest', behavior:'smooth'});

    let h = '';
    h += '<div class="hd"><span class="word">' + esc(tk.s) + '</span>';
    if (tk.yomi) h += '<span class="yomi">' + esc(tk.yomi) + '</span>';
    h += '</div>';
    h += '<span class="pos ' + tk.c + '">' + esc(tk.p) + '</span>';
    h += '<dl class="row">';
    if (tk.g) h += '<dt>活用・種類</dt><dd>' + esc(tk.g) + '</dd>';
    h += '<dt>意味</dt><dd><span class="mean">' + esc(tk.m) + '</span></dd>';
    if (DAN.length > 1) h += '<dt>出典</dt><dd>第' + esc(dan) + '段</dd>';
    h += '</dl>';
    if (tk.kei) h += '<div class="keitag">敬語（' + esc(tk.kei) + '語）</div>';
    if (tk.note) h += '<div class="note">' + tk.note + '</div>';
    h += '<div class="ctx">' + context(i) + '</div>';
    h += '<div class="nav"><button data-step="-1">← 前の語</button><button data-step="1">次の語 →</button></div>';
    paneW.innerHTML = h;
    paneW.scrollTop = 0;

    paneA.querySelectorAll('button.on').forEach(b => b.classList.remove('on'));
    const li = paneA.querySelector('button[data-i="' + i + '"]');
    if (li) li.classList.add('on');
  }

  paneW.addEventListener('click', e => {
    const b = e.target.closest('button[data-step]');
    if (!b) return;
    const j = cur + (+b.dataset.step);
    if (j >= 0 && j < flat.length) { select(j, true); flat[j].el.focus(); }
  });

  textEl.addEventListener('click', e => {
    const w = e.target.closest('.w');
    if (w) { select(+w.dataset.i, false); showTab('w'); }
  });
  textEl.addEventListener('keydown', e => {
    const w = e.target.closest('.w');
    if (!w) return;
    const i = +w.dataset.i;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(i, false); return; }
    const step = {ArrowDown:1, ArrowLeft:1, ArrowUp:-1, ArrowRight:-1}[e.key];
    if (step === undefined) return;
    e.preventDefault();
    const j = Math.min(flat.length - 1, Math.max(0, i + step));
    select(j, true); flat[j].el.focus();
  });

  /* ── 助動詞一覧タブ ──────────────────── */
  (function buildAux(){
    const items = flat.map((f, i) => ({f, i})).filter(o => o.f.tk.c === 'aux');
    if (!items.length) {
      paneA.innerHTML = '<div class="listhead">この章段には助動詞がありません。</div>';
      return;
    }
    let h = '<div class="listhead">本文に現れる助動詞　全' + items.length +
            '語（出現順）。行をクリックすると本文の該当箇所へ移動します。</div><ul class="list">';
    items.forEach(o => {
      h += '<li><button data-i="' + o.i + '">' +
           '<span class="s">' + esc(o.f.tk.s) + '</span>' +
           '<span class="g">' + esc(o.f.tk.g) + '</span>' +
           (DAN.length > 1 ? '<span class="d">' + esc(o.f.dan) + '</span>' : '') +
           '</button></li>';
    });
    paneA.innerHTML = h + '</ul>';
  })();
  paneA.addEventListener('click', e => {
    const b = e.target.closest('button[data-i]');
    if (!b) return;
    const i = +b.dataset.i;
    select(i, true); flat[i].el.focus();
  });

  /* ── タブ ───────────────────────────── */
  function showTab(which){
    const on = which === 'w';
    document.getElementById('tab-w').setAttribute('aria-selected', on);
    document.getElementById('tab-a').setAttribute('aria-selected', !on);
    paneW.hidden = !on; paneA.hidden = on;
  }
  document.getElementById('tab-w').onclick = () => showTab('w');
  document.getElementById('tab-a').onclick = () => showTab('a');

  /* ── 表示の切り替え ─────────────────── */
  const hl = new Set();
  document.getElementById('hlchips').addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    const k = b.dataset.hl;
    if (hl.has(k)) hl.delete(k); else hl.add(k);
    b.setAttribute('aria-pressed', hl.has(k));
    if (hl.size) textEl.dataset.hl = [...hl].join(' '); else delete textEl.dataset.hl;
  });

  const toggle = (id, attr, target, init) => {
    const b = document.getElementById(id);
    let on = init;
    const apply = () => { b.setAttribute('aria-pressed', on); target.setAttribute(attr, on ? 'on' : 'off'); };
    b.onclick = () => { on = !on; apply(); };
    apply();
  };
  toggle('colorBtn', 'data-color', textEl, true);
  toggle('keiBtn',   'data-kei',   textEl, true);

  const yb = document.getElementById('yakuBtn');
  let yakuOn = false;
  const applyYaku = () => { yb.setAttribute('aria-pressed', yakuOn); document.body.dataset.yaku = yakuOn ? 'on' : 'off'; };
  yb.onclick = () => { yakuOn = !yakuOn; applyYaku(); };
  applyYaku();

  let fs = window.matchMedia('(max-width:820px)').matches ? 19 : 21;
  const applyFs = () => textEl.style.setProperty('--fs', fs + 'px');
  document.getElementById('fsUp').onclick   = () => { fs = Math.min(34, fs + 2); applyFs(); };
  document.getElementById('fsDown').onclick = () => { fs = Math.max(15, fs - 2); applyFs(); };

  /* ── 初期状態 ───────────────────────── */
  showEmpty();
  const scroller = document.getElementById('scroll');
  scroller.scrollLeft = scroller.scrollWidth;   // 縦書きは右端から読み始める
})();
