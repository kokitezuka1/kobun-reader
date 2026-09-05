/* 品詞コード  v:動詞・補助動詞  adj:形容詞・形容動詞  aux:助動詞  pt:助詞
              n:名詞・代名詞     o:副詞・連体詞・接続詞・接尾語        pn:記号
   W(表記, 品詞コード, 品詞名, 活用・種類, 意味, {yomi,kei,note})
   P(記号)  K(敬語の種類) */
const W = (s, c, p, g, m, x) => Object.assign({s, c, p, g, m}, x || {});
const P = s => ({s, c: 'pn'});
const K = k => ({kei: k});
/* BR() … 改行（縦書きでは次の行＝次の列に送る）。和歌を一行に立てるのに使う */
const BR = () => ({s: '', c: 'br'});
