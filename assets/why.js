/* なぜその活用形になるのか　─　下に何が続くかから理由を組み立てる。
   古典文法では活用形は「下接語の接続」と「係り結び」でほぼ決まるので、
   直後の語と、その段に立っている係助詞を見れば説明できる。 */
(function(){
  const FORM = /(未然|連用|終止|連体|已然|命令)形/;

  /* 助詞の接続（接続助詞・終助詞のうち、形を決めるもの） */
  const PT = {
    'ど':'已然形', 'ども':'已然形',
    'て':'連用形', 'して':'連用形', 'つつ':'連用形', 'ながら':'連用形',
    'で':'未然形', 'ばや':'未然形', 'なむ':'未然形',
    'とも':'終止形',
    'が':'連体形', 'に':'連体形', 'を':'連体形',
    'ものの':'連体形', 'ものを':'連体形', 'ものから':'連体形', 'ものゆゑ':'連体形'
  };
  const KAKARI = {'ぞ':'連体形', 'なむ':'連体形', 'や':'連体形', 'か':'連体形', 'こそ':'已然形'};

  const formOf = tk => { const m = (tk.g || '').match(FORM); return m ? m[1] + '形' : ''; };
  const baseOf = tk => { const m = (tk.g || '').match(/「([^」]+)」/); return m ? m[1] : ''; };
  const isYougen = tk => tk.c === 'v' || tk.c === 'adj';

  function nextOf(list, i) {
    for (let j = i + 1; j < list.length; j++) {
      if (list[j].c !== 'br') return list[j];
    }
    return null;
  }

  /* この語が係助詞の結びかどうか。
     さかのぼって近い係助詞を拾うやり方だと、結びが省略されている「か」などに
     後ろの連体形を片端からぶら下げてしまう。語釈に書いてある「〜の結び」を根拠にする。 */
  function kakari(list, i) {
    const tk = list[i], form = formOf(tk);
    if (!form || (form !== '連体形' && form !== '已然形')) return null;
    const m = String(tk.m || '').match(/「(.+?)」の結び/);
    if (m && KAKARI[m[1]] === form) return m[1];
    /* 直前が係助詞で、形も合うとき（「こそあれ」のように間に語を挟まない形） */
    const prev = list[i - 1];
    if (prev && prev.c === 'pt' && /係助詞/.test(prev.p || '') && KAKARI[prev.s] === form) return prev.s;
    return null;
  }

  function explain(list, i) {
    const tk = list[i];
    if (!tk || (tk.c !== 'v' && tk.c !== 'adj' && tk.c !== 'aux')) return null;
    const form = formOf(tk);
    if (!form) return null;
    const nx = nextOf(list, i);

    /* 係り結び（結びは下接語より優先して説明する） */
    const k = kakari(list, i);
    if (k && (form === '連体形' || form === '已然形')) {
      return '上にある係助詞「' + k + '」を受けた<b>結び</b>だから' + form + '。' +
             (form === '連体形' ? '「ぞ・なむ・や・か」は連体形で結ぶ。' : '「こそ」は已然形で結ぶ。');
    }

    if (nx) {
      /* 下に助動詞が続く */
      if (nx.c === 'aux') {
        const b = baseOf(nx), setsu = window.CONJ && CONJ.AUX[b] && CONJ.AUX[b].setsu;
        if (setsu) {
          return '下に続く助動詞「' + b + '」が<b>' + setsu + 'に接続</b>するから' + form + '。';
        }
      }
      /* 下に助詞が続く */
      if (nx.c === 'pt') {
        if (nx.s === 'ば') {
          return form === '未然形'
            ? '下の接続助詞「ば」が<b>未然形に接続</b>して、「もし〜ならば」という仮定を表すから未然形。'
            : '下の接続助詞「ば」が<b>已然形に接続</b>して、「〜ので・〜すると」という確定を表すから已然形。';
        }
        const need = PT[nx.s];
        if (need && need === form && /接続助詞|終助詞/.test(nx.p || '')) {
          return '下に続く' + (nx.p || '助詞') + '「' + nx.s + '」が<b>' + need + 'に接続</b>するから' + form + '。';
        }
      }
      /* 下に補助動詞・用言が続く */
      if (form === '連用形') {
        if (nx.p === '補助動詞') {
          return '下の補助動詞「' + (baseOf(nx) || nx.s) + '」が<b>連用形に接続</b>するから連用形。';
        }
        if (isYougen(nx)) {
          return '下の「' + nx.s + '」へ続けていくから連用形（用言に連なる形）。';
        }
        if (nx.c === 'pn' && /[、，]/.test(nx.s)) {
          return 'ここでいったん切って下へ続ける<b>連用中止法</b>だから連用形。';
        }
      }
      /* 連体形は体言にかかる */
      if (form === '連体形' && (nx.c === 'n' || nx.p === '名詞' || nx.p === '代名詞')) {
        return '下の体言「' + nx.s + '」にかかるから連体形。';
      }
      if (form === '連体形' && nx.c === 'pt' && /格助詞/.test(nx.p || '') && /^[がの]$/.test(nx.s)) {
        return '下の格助詞「' + nx.s + '」は<b>連体形を受ける</b>（下に体言を補って読む' +
               (/同格/.test(nx.g || '') ? '同格' : '用法') + '）から連体形。';
      }
      /* 終止形の位置 */
      if (form === '終止形') {
        if (nx.c === 'pn' && /[。」』]/.test(nx.s)) return 'ここで文が言い切られるから終止形。';
        if (nx.c === 'pt' && nx.s === 'と') return '引用の格助詞「と」が<b>終止形</b>を受けるから終止形。';
      }
    }

    if (form === '連体形' && !nx) return '下に体言を補って読む<b>連体止め</b>だから連体形。';
    if (form === '終止形' && !nx) return '文の最後で言い切るから終止形。';
    if (form === '命令形') return '命令・依頼の形で言い切るから命令形。';
    if (form === '連体形') return '下の体言（省略されることもある）にかかるから連体形。';
    return null;
  }

  window.WHY = {explain, formOf};
})();
