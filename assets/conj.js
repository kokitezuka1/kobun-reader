/* 活用表　─　文法書に載っている形の表を組み立てる。
   用言（動詞・形容詞・形容動詞）は活用の種類と基本形から自動で作り、
   助動詞は下の表から引く。 */
(function(){
  const COL = ['未然形', '連用形', '終止形', '連体形', '已然形', '命令形'];

  /* ── 行（ぎょう）の音 ─────────────────────────── */
  const GYO = {
    'ア':'あいうえお', 'カ':'かきくけこ', 'ガ':'がぎぐげご', 'サ':'さしすせそ',
    'ザ':'ざじずぜぞ', 'タ':'たちつてと', 'ダ':'だぢづでど', 'ナ':'なにぬねの',
    'ハ':'はひふへほ', 'バ':'ばびぶべぼ', 'マ':'まみむめも', 'ヤ':'やいゆえよ',
    'ラ':'らりるれろ', 'ワ':'わゐうゑを'
  };

  /* ── 動詞 ───────────────────────────────────── */
  function verbTable(kind, base) {
    const gyo = (kind.match(/^([ア-ワ])行/) || [])[1];
    const row = gyo ? GYO[gyo] : null;
    const stem = base.slice(0, -1);          // 終止形から語尾一字を除いたもの
    const T = f => f.map(x => stem + x);

    if (/カ変/.test(kind)) return {type:'カ行変格活用', forms:['来（こ）','来（き）','来（く）','来（くる）','来（くれ）','来（こ・こよ）']};
    if (/サ変/.test(kind)) {
      const s = base.replace(/す$/, '');
      return {type:'サ行変格活用', forms:[s+'せ', s+'し', s+'す', s+'する', s+'すれ', s+'せよ']};
    }
    if (/ナ変/.test(kind)) return {type:'ナ行変格活用', forms:T(['な','に','ぬ','ぬる','ぬれ','ね'])};
    if (/ラ変/.test(kind)) return {type:'ラ行変格活用', forms:T(['ら','り','り','る','れ','れ'])};
    if (!row) return null;

    if (/四段/.test(kind))
      return {type:gyo + '行四段活用', forms:T([row[0], row[1], row[2], row[2], row[3], row[3]])};
    if (/上二段/.test(kind))
      return {type:gyo + '行上二段活用', forms:T([row[1], row[1], row[2], row[2]+'る', row[2]+'れ', row[1]+'よ'])};
    if (/下二段/.test(kind))
      return {type:gyo + '行下二段活用', forms:T([row[3], row[3], row[2], row[2]+'る', row[2]+'れ', row[3]+'よ'])};
    if (/上一段/.test(kind))
      return {type:gyo + '行上一段活用', forms:T(['', '', 'る', 'る', 'れ', 'よ'])};
    if (/下一段/.test(kind))
      return {type:gyo + '行下一段活用', forms:T(['', '', 'る', 'る', 'れ', 'よ'])};
    return null;
  }

  /* ── 形容詞・形容動詞 ───────────────────────── */
  function adjTable(kind, base) {
    if (/ナリ活用/.test(kind)) {
      const s = base.replace(/なり$/, '');
      return {type:'形容動詞ナリ活用', forms:[s+'なら', s+'なり／'+s+'に', s+'なり', s+'なる', s+'なれ', s+'なれ']};
    }
    if (/タリ活用/.test(kind)) {
      const s = base.replace(/たり$/, '');
      return {type:'形容動詞タリ活用', forms:[s+'たら', s+'たり／'+s+'と', s+'たり', s+'たる', s+'たれ', s+'たれ']};
    }
    const last = base.slice(-1);
    if (/シク活用/.test(kind)) {
      const s = base.slice(0, -1), j = last === 'じ' ? 'じ' : 'し';
      return {type:'形容詞シク活用',
              forms:[s+j+'から', s+j+'く／'+s+j+'かり', s+j, s+j+'き／'+s+j+'かる', s+j+'けれ', s+j+'かれ']};
    }
    if (/ク活用/.test(kind)) {
      const s = base.slice(0, -1);
      return {type:'形容詞ク活用',
              forms:[s+'から', s+'く／'+s+'かり', s+'し', s+'き／'+s+'かる', s+'けれ', s+'かれ']};
    }
    return null;
  }

  /* ── 助動詞 ─────────────────────────────────── */
  const X = '○';
  const A = (mean, setsu, type, f) => ({mean, setsu, type, forms:f});
  const AUX = {
    'ず':    A('打消', '未然形', '特殊型',        ['ず／ざら','ず／ざり','ず','ぬ／ざる','ね／ざれ','ざれ']),
    'き':    A('過去', '連用形', '特殊型',        ['せ',X,'き','し','しか',X]),
    'けり':  A('過去・詠嘆', '連用形', 'ラ変型',  ['けら',X,'けり','ける','けれ',X]),
    'つ':    A('完了・強意', '連用形', '下二段型',['て','て','つ','つる','つれ','てよ']),
    'ぬ':    A('完了・強意', '連用形', 'ナ変型',  ['な','に','ぬ','ぬる','ぬれ','ね']),
    'り':    A('完了・存続', 'サ変の未然形／四段の已然形', 'ラ変型', ['ら','り','り','る','れ','れ']),
    'む':    A('推量・意志・勧誘・婉曲・仮定', '未然形', '四段型', [X,X,'む','む','め',X]),
    'むず':  A('推量・意志', '未然形', 'サ変型',  [X,X,'むず','むずる','むずれ',X]),
    'けむ':  A('過去推量・過去の原因推量', '連用形', '四段型', [X,X,'けむ','けむ','けめ',X]),
    'らむ':  A('現在推量・現在の原因推量', '終止形（ラ変は連体形）', '四段型', [X,X,'らむ','らむ','らめ',X]),
    'べし':  A('推量・意志・可能・当然・命令・適当', '終止形（ラ変は連体形）', '形容詞ク活用型',
               ['べから','べく／べかり','べし','べき／べかる','べけれ',X]),
    'まじ':  A('打消推量・打消意志・不可能・禁止・不適当', '終止形（ラ変は連体形）', '形容詞シク活用型',
               ['まじから','まじく／まじかり','まじ','まじき／まじかる','まじけれ',X]),
    'じ':    A('打消推量・打消意志', '未然形', '無変化型', [X,X,'じ','じ','じ',X]),
    'まし':  A('反実仮想・ためらいの意志', '未然形', '特殊型', ['ましか／ませ',X,'まし','まし','ましか',X]),
    'めり':  A('推定・婉曲', '終止形（ラ変は連体形）', 'ラ変型', [X,'めり','めり','める','めれ',X]),
    'らし':  A('推定', '終止形（ラ変は連体形）', '無変化型', [X,X,'らし','らし','らし',X]),
    'けらし':A('過去推定（「けるらし」の約）', '連用形', '無変化型', [X,X,'けらし','けらし',X,X]),
    'る':    A('受身・尊敬・自発・可能', '四段・ナ変・ラ変の未然形', '下二段型', ['れ','れ','る','るる','るれ','れよ']),
    'らる':  A('受身・尊敬・自発・可能', '右以外の未然形', '下二段型', ['られ','られ','らる','らるる','らるれ','られよ']),
    'す':    A('使役・尊敬', '四段・ナ変・ラ変の未然形', '下二段型', ['せ','せ','す','する','すれ','せよ']),
    'さす':  A('使役・尊敬', '右以外の未然形', '下二段型', ['させ','させ','さす','さする','さすれ','させよ']),
    'しむ':  A('使役・尊敬', '未然形', '下二段型', ['しめ','しめ','しむ','しむる','しむれ','しめよ']),
    'まほし':A('願望', '未然形', '形容詞シク活用型',
               ['まほしから','まほしく／まほしかり','まほし','まほしき／まほしかる','まほしけれ',X]),
    'たし':  A('願望', '連用形', '形容詞ク活用型',
               ['たから','たく／たかり','たし','たき／たかる','たけれ',X]),
    'ごとし':A('比況・例示', '体言・連体形＋「が」「の」', '形容詞ク活用型', [X,'ごとく','ごとし','ごとき',X,X]),
    'なり':  [A('断定・存在', '体言・連体形', '形容動詞ナリ活用型', ['なら','なり／に','なり','なる','なれ','なれ'], ['断定','存在']),
              A('伝聞・推定', '終止形（ラ変は連体形）', 'ラ変型', [X,'なり','なり','なる','なれ',X], ['伝聞','推定'])],
    'たり':  [A('完了・存続', '連用形', 'ラ変型', ['たら','たり','たり','たる','たれ','たれ'], ['完了','存続']),
              A('断定', '体言', '形容動詞タリ活用型', ['たら','たり／と','たり','たる','たれ','たれ'], ['断定'])]
  };
  /* 二つある助動詞は意味で選び分ける */
  AUX['なり'][0].when = ['断定','存在']; AUX['なり'][1].when = ['伝聞','推定'];
  AUX['たり'][0].when = ['完了','存続']; AUX['たり'][1].when = ['断定'];

  /* ── 語の説明（g）から表を引く ─────────────── */
  function tableFor(tk) {
    const g = tk.g || '';
    if (tk.c === 'aux') {
      const name = (g.match(/「([^」]+)」/) || [])[1];
      const e = name && AUX[name];
      if (!e) return null;
      const hit = Array.isArray(e) ? (e.find(x => x.when.some(w => g.indexOf(w) >= 0)) || e[0]) : e;
      return {head:name, mean:hit.mean, setsu:hit.setsu, type:hit.type, forms:hit.forms, cols:COL};
    }
    if (tk.c !== 'v' && tk.c !== 'adj') return null;
    const base = (g.match(/（([^）]+)）\s*$/) || [])[1];
    if (!base) return null;
    const kind = g.split('・')[0];
    const t = (tk.c === 'adj') ? adjTable(kind, base) : verbTable(kind, base);
    if (!t) return null;
    return {head:base, type:t.type, forms:t.forms, cols:COL};
  }

  window.CONJ = {tableFor, COL, AUX};

  /* ── 語釈に差しこむ見た目 ───────────────────── */
  const esc = x => String(x).replace(/[&<>]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[ch]));

  const FORMNAME = /(未然|連用|終止|連体|已然|命令)形/;
  function lexOf(tk) {
    if (!window.LEX) return null;
    const yougen = tk.c === 'v' || tk.c === 'adj';
    const base = yougen ? (tk.g || '').match(/（([^）]+)）\s*$/) : null;
    const keys = [];
    if (base) keys.push(base[1]);
    keys.push(tk.s);
    if (tk.yomi) keys.push(tk.yomi);
    for (let i = 0; i < keys.length; i++) {
      const k = (window.LEXALIAS && LEXALIAS[keys[i]]) || keys[i];
      if (LEX[k]) return {key: k, e: LEX[k]};
    }
    return null;
  }
  function lexHtml(tk) {
    const hit = lexOf(tk);
    if (!hit) return '';
    const e = hit.e;
    return '<div class="lex"><div class="lex-head">' +
      '<span class="w">' + esc(hit.key) + '</span>' +
      (e.y ? '<span class="y">' + esc(e.y) + '</span>' : '') +
      (e.p ? '<span class="p">' + esc(e.p) + '</span>' : '') +
      '<span class="src">辞書</span></div>' +
      '<ol class="senses">' + e.s.map(x => '<li>' + esc(x) + '</li>').join('') + '</ol>' +
      (e.n ? '<p class="lex-note">' + esc(e.n) + '</p>' : '') + '</div>';
  }
  function conjHtml(tk) {
    if (!window.CONJ) return '';
    const t = CONJ.tableFor(tk);
    if (!t) return '';
    const nowForm = (tk.g || '').match(FORMNAME);
    const now = nowForm ? nowForm[1] + '形' : '';
    let head = '<div class="conj-head"><span class="w">' + esc(t.head) + '</span>' +
               '<span class="p">' + esc(t.type) + '</span><span class="src">活用表</span></div>';
    let meta = '';
    if (t.setsu) meta += '<span><b>接続</b>' + esc(t.setsu) + '</span>';
    if (t.mean)  meta += '<span><b>意味</b>' + esc(t.mean) + '</span>';
    return '<div class="conj">' + head +
      (meta ? '<div class="conj-meta">' + meta + '</div>' : '') +
      '<div class="conj-scroll"><table><thead><tr>' +
      t.cols.map(c => '<th' + (c === now ? ' class="on"' : '') + '>' + c.replace('形', '') + '</th>').join('') +
      '</tr></thead><tbody><tr>' +
      t.forms.map((f, i) => '<td' + (t.cols[i] === now ? ' class="on"' : '') + '>' +
        esc(f).replace('／', '<br>') + '</td>').join('') +
      '</tr></tbody></table></div></div>';
  }
  window.REF = {lexHtml, conjHtml};

})();
