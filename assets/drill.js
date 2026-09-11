(function () {
  const WK = window.WORK;
  const esc = s => String(s).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
  const POS = {v:'動詞', adj:'形容詞・形容動詞', aux:'助動詞', pt:'助詞', n:'名詞・代名詞', o:'副詞・連体詞など'};

  /* ── カードの素材を本文から集める ───────────────────── */
  function worth(tk) {
    if (tk.c === 'aux' || tk.c === 'v' || tk.c === 'adj') return true;
    if (tk.c === 'n')  return !!(tk.yomi || tk.note);
    if (tk.c === 'o')  return tk.p !== '接尾語';
    if (tk.c === 'pt') return !!tk.note;
    return false;
  }
  function around(list, i) {
    let s = '';
    for (let j = Math.max(0, i - 5); j < Math.min(list.length, i + 6); j++) {
      if (list[j].c === 'br') continue;
      s += j === i ? '〈' + list[j].s + '〉' : list[j].s;
    }
    return s;
  }
  const seen = new Set(), cards = [];
  WK.dan.forEach(d => d.t.forEach((tk, i) => {
    if (tk.c === 'pn' || tk.c === 'br' || !worth(tk)) return;
    const key = tk.s + '|' + tk.p + '|' + (tk.g || '');
    if (seen.has(key)) return;
    seen.add(key);
    cards.push({key, s: tk.s, c: tk.c, p: tk.p, g: tk.g || '', m: tk.m,
                yomi: tk.yomi || '', kei: tk.kei || '', note: tk.note || '', ku: tk.ku || '',
                imp: !!(tk.ku || tk.kei || tk.note || tk.c === 'aux' || (tk.c === 'n' && tk.yomi)),
                dan: WK.dan.length > 1 ? '第' + d.n + '段' : (d.n || '本文'),
                ctx: around(d.t, i)});
  }));

  let scope = 'all';
  const pool = () => scope === 'all' ? cards : cards.filter(c => c.imp);

  const LKEY = 'kobun:learned:' + WK.id;
  function readLearned() {
    try { const a = JSON.parse(localStorage.getItem(LKEY)); return Array.isArray(a) ? a : []; }
    catch (e) { return []; }
  }
  function writeLearned(a) { try { localStorage.setItem(LKEY, JSON.stringify(a)); } catch (e) {} }
  let learned = readLearned();

  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

  /* ══ フラッシュカード ═══════════════════════════════ */
  const cardBox = document.getElementById('card-box');
  const cardBar = document.getElementById('card-bar');
  const cardStat = document.getElementById('card-stat');
  let queue = [], face = 0;

  function newQueue(onlyUnlearned) {
    const base = onlyUnlearned ? pool().filter(c => learned.indexOf(c.key) < 0) : pool().slice();
    queue = shuffle(base);
    face = 0;
    drawCard();
  }
  function drawCard() {
    const inPool = pool();
    const total = inPool.length, done = inPool.filter(c => learned.indexOf(c.key) >= 0).length;
    cardStat.textContent = '覚えた ' + done + ' / ' + total + '　残り ' + queue.length + '枚';
    cardBar.style.setProperty('--p', total ? (done / total * 100) + '%' : '0%');
    if (!queue.length) {
      cardBox.innerHTML =
        '<div class="done"><span class="big">了</span>' +
        '<p>この山は終わりました。' + (done >= total
          ? 'この範囲はすべて覚えた状態です。' : 'まだ覚えていない語が ' + (total - done) + ' 語あります。') + '</p>' +
        '<div class="row2"><button class="btn" data-act="again">覚えていない語をもう一周</button>' +
        '<button class="btn ghost" data-act="all">全部の語をもう一周</button>' +
        '<button class="btn ghost" data-act="reset">学習状況をリセット</button></div></div>';
      return;
    }
    const c = queue[0];
    cardBox.innerHTML =
      '<div class="flash' + (face ? ' flipped' : '') + '" data-act="flip">' +
      '  <div class="fside front">' +
      '    <span class="dan">' + esc(c.dan) + '</span>' +
      '    <span class="term">' + esc(c.s) + '</span>' +
      '    <span class="ctx">' + esc(c.ctx) + '</span>' +
      '    <span class="hint">タップで答えを見る</span>' +
      '  </div>' +
      '  <div class="fside back">' +
      '    <span class="pos ' + c.c + '">' + esc(c.p) + '</span>' +
      (c.yomi ? '<span class="yomi">' + esc(c.yomi) + '</span>' : '') +
      '    <span class="mean">' + esc(c.m) + '</span>' +
      (c.g ? '<span class="katsu">' + esc(c.g) + '</span>' : '') +
      (c.kei ? '<span class="keitag">敬語（' + esc(c.kei) + '語）</span>' : '') +
      (c.note ? '<div class="note">' + c.note + '</div>' : '') +
      '  </div>' +
      '</div>' +
      (face && window.REF ? '<div class="cardref">' + REF.conjHtml(c) + REF.lexHtml(c) + '</div>' : '') +
      '<div class="row2">' +
      '  <button class="btn ghost" data-act="later">もう一度</button>' +
      '  <button class="btn" data-act="got">覚えた</button>' +
      '</div>';
  }
  cardBox.addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'flip') { face = face ? 0 : 1; drawCard(); return; }
    if (act === 'later') { queue.push(queue.shift()); face = 0; drawCard(); return; }
    if (act === 'got') {
      const c = queue.shift();
      if (learned.indexOf(c.key) < 0) { learned.push(c.key); writeLearned(learned); }
      face = 0; drawCard(); return;
    }
    if (act === 'again') { newQueue(true); return; }
    if (act === 'all')   { newQueue(false); return; }
    if (act === 'reset') { learned = []; writeLearned(learned); newQueue(false); return; }
  });

  /* ══ 出題の共通部分 ═════════════════════════════════ */
  function others(field, val, pool, n) {
    const vals = [];
    shuffle(pool.slice()).forEach(c => {
      const v = c[field];
      if (v && v !== val && vals.indexOf(v) < 0 && vals.length < n) vals.push(v);
    });
    return vals;
  }
  /* 同じ語が一回の出題で重ならないように選ぶ */
  function draft(all, n) {
    const used = new Set(), out = [];
    const take = (list, limit) => shuffle(list).forEach(q => {
      if (out.length >= limit || used.has(q.key)) return;
      used.add(q.key); out.push({...q, o: shuffle(q.o.slice())});
    });
    take(all.filter(q => q.pri), Math.min(4, n));   // 句法は必ず何問か入れる
    take(all, n);
    return shuffle(out);
  }

  function Quiz(boxId, gather, emptyMsg) {
    const box = document.getElementById(boxId);
    let qs = [], qi = 0, score = 0, missed = [];

    function build() { qs = draft(gather(), 10); qi = 0; score = 0; missed = []; }
    function draw() {
      if (!qs.length) { box.innerHTML = '<div class="done"><p>' + emptyMsg + '</p></div>'; return; }
      if (qi >= qs.length) {
        const pct = Math.round(score / qs.length * 100);
        box.innerHTML =
          '<div class="done"><span class="big">' + score + '/' + qs.length + '</span>' +
          '<p>正答率 ' + pct + '％。' + (pct === 100 ? '全問正解です。' : pct >= 70 ? 'あと少しです。' : '本文に戻って確かめましょう。') + '</p>' +
          (missed.length ? '<ul class="misslist">' + missed.map(c =>
            '<li><span class="s">' + esc(c.s) + '</span><span class="m">' + esc(c.m) + '</span></li>').join('') + '</ul>' : '') +
          '<div class="row2"><button class="btn" data-act="retry">別の問題でもう一度</button>' +
          '<a class="btn ghost" href="' + WK.id + '.html">本文を読む</a></div></div>';
        return;
      }
      const q = qs[qi];
      box.innerHTML =
        '<div class="qhead"><span class="qn">第' + (qi + 1) + '問 / ' + qs.length + '</span>' +
        '<span class="qscore">正解 ' + score + '</span></div>' +
        (q.ctx ? '<p class="qctx">' + esc(q.ctx) + '</p>' : '') +
        '<h2 class="qtext">' + esc(q.q) + '</h2>' +
        '<ul class="opts">' + q.o.map((o, i) =>
          '<li><button class="opt' + (q.big ? ' big' : '') + '" data-i="' + i + '">' + esc(o) + '</button></li>').join('') + '</ul>' +
        '<div class="verdict" hidden></div>';
    }
    box.addEventListener('click', ev => {
      if (ev.target.closest('[data-act="retry"]')) { build(); draw(); return; }
      const b = ev.target.closest('.opt');
      if (!b || box.querySelector('.opt.picked')) return;
      const q = qs[qi], chosen = q.o[+b.dataset.i], ok = chosen === q.a;
      if (ok) score++; else missed.push(q.why);
      box.querySelectorAll('.opt').forEach(o => {
        o.disabled = true;
        if (q.o[+o.dataset.i] === q.a) o.classList.add('right');
      });
      b.classList.add('picked', ok ? 'right' : 'wrong');
      const c = q.why, v = box.querySelector('.verdict');
      v.hidden = false;
      v.className = 'verdict ' + (ok ? 'ok' : 'ng');
      v.innerHTML =
        '<b>' + (ok ? '正解' : '不正解') + '</b>　' + esc(c.s) +
        (c.yomi ? '（' + esc(c.yomi) + '）' : '') +
        '　' + esc(c.p) + (c.g ? '／' + esc(c.g) : '') +
        (c.ku ? '　<span class="kuinline">句法・' + esc(c.ku) + '</span>' : '') + '　' + esc(c.m) +
        (c.note ? '<div class="note">' + c.note + '</div>' : '') +
        (window.REF ? REF.conjHtml(c) + REF.lexHtml(c) : '') +
        '<div class="row2"><button class="btn" data-act="next">次へ</button></div>';
      v.querySelector('[data-act="next"]').onclick = () => { qi++; draw(); };
    });
    return {build, draw, ensure() { if (!qs.length || qi >= qs.length) { build(); draw(); } }};
  }

  /* ══ 単語クイズ（語義・読み） ═══════════════════════ */
  const isVocab = c => c.c === 'v' || c.c === 'adj' || c.c === 'n' || c.c === 'o';
  function vocabQs() {
    const qs = [], vocab = pool().filter(isVocab);
    vocab.forEach(c => {
      let d = others('m', c.m, vocab, 3);
      if (d.length === 3) qs.push({key: c.key, q: '「' + c.s + '」の意味は？', ctx: c.ctx, a: c.m, o: d.concat([c.m]), why: c});
      d = others('s', c.s, vocab, 3);
      if (d.length === 3) qs.push({key: c.key, q: '「' + c.m + '」にあたる語は？', ctx: '', a: c.s, o: d.concat([c.s]), why: c, big: true});
      if (c.yomi) {
        d = others('yomi', c.yomi, vocab.filter(x => x.yomi), 3);
        if (d.length === 3) qs.push({key: c.key, q: '「' + c.s + '」の読みは？', ctx: c.ctx, a: c.yomi, o: d.concat([c.yomi]), why: c});
      }
    });
    return qs;
  }
  const vq = Quiz('vocab-box', vocabQs, 'この章段では単語の問題を作れませんでした。');

  /* ══ 文法問題（品詞・活用・助動詞・敬語） ═══════════ */
  const KU_ALL = ['再読文字', '使役', '受身', '反語', '疑問', '抑揚', '限定',
                  '比況', '仮定', '願望', '否定', '不可能', 'ク語法'];
  function grammarQs() {
    const qs = [], all = pool(), auxes = all.filter(c => c.c === 'aux');
    all.forEach(c => {
      const same = all.filter(x => x.c === c.c);
      if (c.ku) {
        const d = shuffle(KU_ALL.filter(k => k !== c.ku)).slice(0, 3);
        qs.push({key: c.key, q: '「' + c.s + '」に使われている句法は？', ctx: c.ctx,
                 a: c.ku, o: d.concat([c.ku]), why: c, pri: true});
      }
      let d = others('p', c.p, all, 3);
      if (d.length === 3) qs.push({key: c.key, q: '「' + c.s + '」の品詞は？', ctx: c.ctx, a: c.p, o: d.concat([c.p]), why: c});
      if (c.g && (c.c === 'v' || c.c === 'adj')) {
        d = others('g', c.g, same, 3);
        if (d.length === 3) qs.push({key: c.key, q: '「' + c.s + '」の活用の種類と活用形は？', ctx: c.ctx, a: c.g, o: d.concat([c.g]), why: c});
      }
      if (c.c === 'aux' && c.g && auxes.length > 4) {
        d = others('g', c.g, auxes, 3);
        if (d.length === 3) qs.push({key: c.key, q: '助動詞「' + c.s + '」の説明として正しいものは？', ctx: c.ctx, a: c.g, o: d.concat([c.g]), why: c});
      }
      if (c.kei) qs.push({key: c.key, q: '「' + c.s + '」の敬語の種類は？', ctx: c.ctx, a: c.kei + '語',
                          o: ['尊敬語', '謙譲語', '丁寧語', '敬語ではない'], why: c});
    });
    return qs;
  }
  const gq = Quiz('quiz-box', grammarQs, 'この章段では文法の問題を作れませんでした。');

  /* ══ テスト対策（頻出ポイントの一問一答） ═════════ */
  const spots = (window.SPOTS || {})[WK.id] || [];
  const spotBox = document.getElementById('spot-box');
  let si = 0, sOpen = false;
  function drawSpot() {
    if (!spots.length) { spotBox.innerHTML = '<div class="done"><p>この章段には頻出ポイントを用意していません。</p></div>'; return; }
    const sp = spots[si];
    spotBox.innerHTML =
      '<div class="stat">第' + (si + 1) + '問 / ' + spots.length + '　<span class="tt">' + esc(sp.t) + '</span>' +
      (sp.d ? '　第' + esc(sp.d) + '段' : '') + '</div>' +
      '<div class="flash' + (sOpen ? ' flipped' : '') + '" data-act="flip">' +
      '  <div class="fside front"><span class="qq">' + esc(sp.q) + '</span>' +
      '    <span class="hint">タップで答えを見る</span></div>' +
      '  <div class="fside back"><p class="ans">' + esc(sp.a) + '</p>' +
      (sp.w ? '<div class="note">' + esc(sp.w) + '</div>' : '') + '</div>' +
      '</div>' +
      '<div class="row2">' +
      '  <button class="btn ghost" data-act="prev"' + (si === 0 ? ' disabled' : '') + '>← 前へ</button>' +
      (si < spots.length - 1
        ? '  <button class="btn" data-act="next">次へ →</button>'
        : '  <a class="btn" href="' + WK.id + '.html">本文で確かめる</a>') +
      '</div>';
  }
  spotBox.addEventListener('click', ev => {
    const b = ev.target.closest('[data-act]');
    if (!b) return;
    const a = b.dataset.act;
    if (a === 'flip') { sOpen = !sOpen; drawSpot(); }
    if (a === 'prev') { si = Math.max(0, si - 1); sOpen = false; drawSpot(); }
    if (a === 'next') { si = Math.min(spots.length - 1, si + 1); sOpen = false; drawSpot(); }
  });

  /* ══ モード切り替え ═════════════════════════════════ */
  const MODES = {spot: 'tab-spot', card: 'tab-card', vocab: 'tab-vocab', quiz: 'tab-quiz'};
  function show(mode) {
    Object.keys(MODES).forEach(k => {
      document.getElementById(MODES[k]).setAttribute('aria-selected', k === mode);
      document.getElementById('pane-' + k).hidden = k !== mode;
    });
    scopeBox.hidden = !scopeUsable || mode === 'spot';
    if (mode === 'vocab') vq.ensure();
    if (mode === 'quiz') gq.ensure();
  }
  document.getElementById('tab-spot').onclick  = () => show('spot');
  document.getElementById('tab-card').onclick  = () => show('card');
  document.getElementById('tab-vocab').onclick = () => show('vocab');
  document.getElementById('tab-quiz').onclick  = () => show('quiz');

  const sizes = () => {
    document.getElementById('deck-size').textContent = pool().length;
    document.getElementById('vocab-size').textContent = pool().filter(isVocab).length;
  };
  const scopeBox = document.getElementById('scope');
  let scopeUsable = false;
  const impCount = cards.filter(c => c.imp).length;
  if (impCount && impCount < cards.length) {
    scopeBox.addEventListener('click', ev => {
      const b = ev.target.closest('[data-scope]');
      if (!b || b.dataset.scope === scope) return;
      scope = b.dataset.scope;
      scopeBox.querySelectorAll('[data-scope]').forEach(x =>
        x.setAttribute('aria-pressed', x.dataset.scope === scope));
      sizes(); newQueue(true);
      vq.build(); vq.draw(); gq.build(); gq.draw();
    });
    scopeUsable = true;
  }
  sizes();
  document.getElementById('spot-size').textContent = spots.length;
  drawSpot();
  newQueue(true);
  vq.build(); vq.draw();
  gq.build(); gq.draw();
  show(spots.length ? 'spot' : 'card');
})();
