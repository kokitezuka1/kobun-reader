/* PDF 書き出し　─　縦書きのまま、字をベクタで出す。
   画面を画像に写し取るのではなく印刷用の紙面を組み直すので、
   拡大しても字がぼけず、PDF の中の文字を検索・選択できる。 */
(function(){
  const WORK = window.WORK;
  if (!WORK) return;
  const MM = 96 / 25.4;                       // 1mm を CSS ピクセルに
  const KANBUN = WORK.genre === '漢文';
  const esc = s => String(s).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));

  const PAPER = {
    'a4-landscape': {w:297, h:210, label:'A4 横'},
    'a4-portrait':  {w:210, h:297, label:'A4 縦'},
    'b5-landscape': {w:257, h:182, label:'B5 横'},
    'b5-portrait':  {w:182, h:257, label:'B5 縦'}
  };
  const SIZES = {small:{px:11, label:'小'}, mid:{px:13, label:'中'}, large:{px:15.5, label:'大'}};

  const opt = {
    paper:'a4-landscape', size:'mid', margin:12,
    yaku:false, ruby:KANBUN, color:false, kei:true, haku:KANBUN, spots:false
  };

  /* ── 印刷用の紙面を組む ───────────────────────── */
  let root, pageStyle;
  function ensureRoot() {
    if (!root) {
      root = document.createElement('div');
      root.id = 'printroot';
      document.body.appendChild(root);
      pageStyle = document.createElement('style');
      document.head.appendChild(pageStyle);
    }
    return root;
  }

  function tokenHtml(tk) {
    if (tk.c === 'br') return '<br>';
    if (tk.c === 'pn') return '<span class="pn">' + esc(tk.s) + '</span>';
    const cls = ['t', tk.c];
    if (opt.kei && tk.kei) cls.push('kei');
    if (opt.spots && (tk.ku || tk.note)) cls.push('mark');
    const body = (opt.ruby && tk.yomi)
      ? '<ruby>' + esc(tk.s) + '<rt>' + esc(tk.yomi) + '</rt></ruby>'
      : esc(tk.s);
    return '<span class="' + cls.join(' ') + '">' + body + '</span>';
  }

  function contentHtml() {
    let h = '';
    WORK.dan.forEach(dan => {
      const label = WORK.dan.length > 1 ? '第' + dan.n + '段' : (dan.n || '本文');
      h += '<span class="pdan">' + esc(label) + '</span>';
      if (opt.haku && dan.k) h += '<span class="phaku">［白文］' + esc(dan.k) + '</span>';
      h += dan.t.map(tokenHtml).join('');
      if (opt.yaku) h += '<span class="pyaku">〈訳〉' + esc(dan.y) + '</span>';
    });
    return h;
  }

  function build() {
    const r = ensureRoot();
    const paper = PAPER[opt.paper];
    const m = opt.margin;
    const pageW = (paper.w - m * 2) * MM;
    const headH = 7 * MM;
    const pageH = (paper.h - m * 2) * MM - headH;

    pageStyle.textContent = '@page{size:' + opt.paper.replace('-', ' ').replace('a4', 'A4').replace('b5', 'B5') +
                            '; margin:' + m + 'mm}';
    r.dataset.color = opt.color ? 'on' : 'off';
    r.style.setProperty('--pfs', SIZES[opt.size].px + 'px');

    /* まず一続きに流して、どこで紙が変わるかを測る */
    r.innerHTML = '<div class="measure" style="height:' + pageH + 'px">' + contentHtml() + '</div>';
    const flow = r.firstChild;
    const kids = [...flow.childNodes].filter(n => n.nodeType === 1);
    const base = flow.getBoundingClientRect().right;
    const limit0 = pageW * 0.97;              // 組み直しの余裕を少し見ておく
    const pages = [[]];
    let limit = limit0;
    kids.forEach(el => {
      const far = base - el.getBoundingClientRect().left;
      if (far > limit && pages[pages.length - 1].length) {
        pages.push([]);
        limit += limit0;
      }
      pages[pages.length - 1].push(el);
    });

    /* 測った区切りで紙面を作り直す */
    const head = esc(WORK.work) + '『' + esc(WORK.title) + '』' +
                 (WORK.chapter ? '　' + esc(WORK.chapter) : '');
    const frag = document.createDocumentFragment();
    pages.forEach((els, i) => {
      const pp = document.createElement('section');
      pp.className = 'pp';
      pp.style.width = pageW + 'px';
      pp.innerHTML = '<header><span>' + head + '</span><span class="pno">' +
                     (i + 1) + ' / ' + pages.length + '</span></header>' +
                     '<div class="ppbody" style="height:' + pageH + 'px"></div>';
      const body = pp.lastChild;
      els.forEach(el => body.appendChild(el));
      frag.appendChild(pp);
    });
    r.innerHTML = '';
    r.appendChild(frag);
    return pages.length;
  }

  /* ── 設定のダイアログ ─────────────────────────── */
  const dlg = document.createElement('div');
  dlg.className = 'pdfdlg';
  dlg.hidden = true;
  document.body.appendChild(dlg);

  const CHECKS = [
    ['yaku',  '現代語訳を入れる'],
    ['ruby',  '読み仮名をふる'],
    ['kei',   '敬語に圏点をつける'],
    ['color', '品詞で色分けする'],
    ['spots', '句法・語法メモのある語に印をつける']
  ];

  function drawDlg(pageCount) {
    dlg.innerHTML =
      '<div class="pd-box" role="dialog" aria-label="PDFに書き出す">' +
      '<div class="pd-head"><b>PDF に書き出す</b>' +
      '<button class="ib close" data-act="close">閉じる</button></div>' +
      '<div class="pd-body">' +
      '<div class="pd-row"><span class="pd-lab">用紙</span><div class="pd-seg">' +
      Object.keys(PAPER).map(k => '<button data-paper="' + k + '"' +
        (opt.paper === k ? ' aria-pressed="true"' : '') + '>' + PAPER[k].label + '</button>').join('') +
      '</div></div>' +
      '<div class="pd-row"><span class="pd-lab">字の大きさ</span><div class="pd-seg">' +
      Object.keys(SIZES).map(k => '<button data-size="' + k + '"' +
        (opt.size === k ? ' aria-pressed="true"' : '') + '>' + SIZES[k].label + '</button>').join('') +
      '</div></div>' +
      '<div class="pd-row"><span class="pd-lab">余白</span><div class="pd-seg">' +
      [8, 12, 18].map(v => '<button data-margin="' + v + '"' +
        (opt.margin === v ? ' aria-pressed="true"' : '') + '>' + v + 'mm</button>').join('') +
      '</div></div>' +
      '<ul class="pd-checks">' +
      CHECKS.map(([k, lab]) => '<li><label><input type="checkbox" data-opt="' + k + '"' +
        (opt[k] ? ' checked' : '') + '> ' + lab + '</label></li>').join('') +
      (WORK.dan.some(d => d.k)
        ? '<li><label><input type="checkbox" data-opt="haku"' + (opt.haku ? ' checked' : '') +
          '> 白文を入れる</label></li>' : '') +
      '</ul>' +
      '<p class="pd-note">仕上がり <b>' + pageCount + '</b> ページ。' +
      '字は画像ではなく文字のまま入るので、拡大してもぼけず、PDF の中を検索できます。</p>' +
      '</div>' +
      '<div class="pd-foot">' +
      '<span class="pd-hint">保存先のダイアログで「PDFとして保存」を選んでください。</span>' +
      '<button class="btnp" data-act="print">書き出す</button></div>' +
      '</div>';
  }

  function refresh() { drawDlg(build()); }

  dlg.addEventListener('click', e => {
    if (e.target === dlg) { close(); return; }
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.paper)  { opt.paper = b.dataset.paper; refresh(); return; }
    if (b.dataset.size)   { opt.size = b.dataset.size; refresh(); return; }
    if (b.dataset.margin) { opt.margin = +b.dataset.margin; refresh(); return; }
    if (b.dataset.act === 'close') close();
    if (b.dataset.act === 'print') { build(); setTimeout(() => window.print(), 60); }
  });
  dlg.addEventListener('change', e => {
    const c = e.target.closest('[data-opt]'); if (!c) return;
    opt[c.dataset.opt] = c.checked;
    refresh();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !dlg.hidden) close(); });

  function open() {
    /* いま画面で見ている設定を引き継ぐ */
    const t = document.getElementById('text');
    opt.color = t.dataset.color === 'on';
    opt.kei   = t.dataset.kei === 'on';
    opt.ruby  = document.body.dataset.ruby === 'on';
    opt.yaku  = document.body.dataset.yaku === 'on';
    if (document.body.dataset.haku) opt.haku = document.body.dataset.haku === 'on';
    dlg.hidden = false;
    document.body.dataset.pdfopen = 'on';
    refresh();
  }
  function close() {
    dlg.hidden = true;
    delete document.body.dataset.pdfopen;
    if (root) root.innerHTML = '';
  }
  window.addEventListener('afterprint', () => { if (root) root.innerHTML = ''; });

  const btn = document.getElementById('pdfBtn');
  if (btn) btn.onclick = open;
})();
