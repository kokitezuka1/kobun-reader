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
                yomi: tk.yomi || '', kei: tk.kei || '', note: tk.note || '',
                dan: WK.dan.length > 1 ? '第' + d.n + '段' : (d.n || '本文'),
                ctx: around(d.t, i)});
  }));

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
    const base = onlyUnlearned ? cards.filter(c => learned.indexOf(c.key) < 0) : cards.slice();
    queue = shuffle(base);
    face = 0;
    drawCard();
  }
  function drawCard() {
    const total = cards.length, done = learned.length;
    cardStat.textContent = '覚えた ' + done + ' / ' + total + '　残り ' + queue.length + '枚';
    cardBar.style.setProperty('--p', total ? (done / total * 100) + '%' : '0%');
    if (!queue.length) {
      cardBox.innerHTML =
        '<div class="done"><span class="big">了</span>' +
        '<p>この山は終わりました。' + (learned.length >= cards.length
          ? 'すべて覚えた状態です。' : 'まだ覚えていない語が ' + (cards.length - learned.length) + ' 語あります。') + '</p>' +
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

  /* ══ 確認問題 ═══════════════════════════════════════ */
  const quizBox = document.getElementById('quiz-box');
  let quiz = [], qi = 0, score = 0;

  function others(field, val, pool, n) {
    const vals = [];
    shuffle(pool.slice()).forEach(c => {
      const v = c[field];
      if (v && v !== val && vals.indexOf(v) < 0 && vals.length < n) vals.push(v);
    });
    return vals;
  }
  function build() {
    const qs = [];
    const aux = cards.filter(c => c.c === 'aux');
    cards.forEach(c => {
      const same = cards.filter(x => x.c === c.c);
      // 意味
      let d = others('m', c.m, same.length > 6 ? same : cards, 3);
      if (d.length === 3) qs.push({q: '「' + c.s + '」の意味として最も適切なものは？', ctx: c.ctx, a: c.m, o: d.concat([c.m]), why: c});
      // 品詞
      d = others('p', c.p, cards, 3);
      if (d.length === 3) qs.push({q: '「' + c.s + '」の品詞は？', ctx: c.ctx, a: c.p, o: d.concat([c.p]), why: c});
      // 活用・種類
      if (c.g && (c.c === 'v' || c.c === 'adj')) {
        d = others('g', c.g, same, 3);
        if (d.length === 3) qs.push({q: '「' + c.s + '」の活用の種類と活用形は？', ctx: c.ctx, a: c.g, o: d.concat([c.g]), why: c});
      }
      // 助動詞
      if (c.c === 'aux' && c.g && aux.length > 4) {
        d = others('g', c.g, aux, 3);
        if (d.length === 3) qs.push({q: '助動詞「' + c.s + '」の説明として正しいものは？', ctx: c.ctx, a: c.g, o: d.concat([c.g]), why: c});
      }
      // 読み
      if (c.yomi) {
        d = others('yomi', c.yomi, cards.filter(x => x.yomi), 3);
        if (d.length === 3) qs.push({q: '「' + c.s + '」の読みは？', ctx: c.ctx, a: c.yomi, o: d.concat([c.yomi]), why: c});
      }
      // 敬語
      if (c.kei) {
        const all = ['尊敬語', '謙譲語', '丁寧語', '敬語ではない'];
        qs.push({q: '「' + c.s + '」の敬語の種類は？', ctx: c.ctx, a: c.kei + '語', o: all, why: c});
      }
    });
    quiz = shuffle(qs).slice(0, 10).map(q => ({...q, o: shuffle(q.o.slice())}));
    qi = 0; score = 0;
  }
  function drawQuiz() {
    if (!quiz.length) { quizBox.innerHTML = '<div class="done"><p>この章段では問題を作れませんでした。</p></div>'; return; }
    if (qi >= quiz.length) {
      const pct = Math.round(score / quiz.length * 100);
      quizBox.innerHTML =
        '<div class="done"><span class="big">' + score + '/' + quiz.length + '</span>' +
        '<p>正答率 ' + pct + '％。' + (pct === 100 ? '全問正解です。' : pct >= 70 ? 'あと少しです。' : '本文に戻って確かめましょう。') + '</p>' +
        '<div class="row2"><button class="btn" data-act="retry">別の問題でもう一度</button>' +
        '<a class="btn ghost" href="' + WK.id + '.html">本文を読む</a></div></div>';
      return;
    }
    const q = quiz[qi];
    quizBox.innerHTML =
      '<div class="qhead"><span class="qn">第' + (qi + 1) + '問 / ' + quiz.length + '</span>' +
      '<span class="qscore">正解 ' + score + '</span></div>' +
      '<p class="qctx">' + esc(q.ctx) + '</p>' +
      '<h2 class="qtext">' + esc(q.q) + '</h2>' +
      '<ul class="opts">' + q.o.map((o, i) =>
        '<li><button class="opt" data-i="' + i + '">' + esc(o) + '</button></li>').join('') + '</ul>' +
      '<div class="verdict" hidden></div>';
  }
  quizBox.addEventListener('click', e => {
    const r = e.target.closest('[data-act="retry"]');
    if (r) { build(); drawQuiz(); return; }
    const b = e.target.closest('.opt');
    if (!b || quizBox.querySelector('.opt.picked')) return;
    const q = quiz[qi];
    const chosen = q.o[+b.dataset.i];
    const ok = chosen === q.a;
    if (ok) score++;
    quizBox.querySelectorAll('.opt').forEach(o => {
      o.disabled = true;
      if (q.o[+o.dataset.i] === q.a) o.classList.add('right');
    });
    b.classList.add('picked', ok ? 'right' : 'wrong');
    const v = quizBox.querySelector('.verdict');
    const c = q.why;
    v.hidden = false;
    v.className = 'verdict ' + (ok ? 'ok' : 'ng');
    v.innerHTML =
      '<b>' + (ok ? '正解' : '不正解') + '</b>　' + esc(c.s) +
      '（' + esc(c.p) + (c.g ? '／' + esc(c.g) : '') + '）' + esc(c.m) +
      (c.note ? '<div class="note">' + c.note + '</div>' : '') +
      '<div class="row2"><button class="btn" data-act="next">次へ</button></div>';
    v.querySelector('[data-act="next"]').onclick = () => { qi++; drawQuiz(); };
  });

  /* ══ モード切り替え ═════════════════════════════════ */
  function show(mode) {
    const card = mode === 'card';
    document.getElementById('tab-card').setAttribute('aria-selected', card);
    document.getElementById('tab-quiz').setAttribute('aria-selected', !card);
    document.getElementById('pane-card').hidden = !card;
    document.getElementById('pane-quiz').hidden = card;
  }
  document.getElementById('tab-card').onclick = () => show('card');
  document.getElementById('tab-quiz').onclick = () => { show('quiz'); if (!quiz.length || qi >= quiz.length) { build(); drawQuiz(); } };

  document.getElementById('deck-size').textContent = cards.length;
  newQueue(true);
  build(); drawQuiz();
  show('card');
})();
