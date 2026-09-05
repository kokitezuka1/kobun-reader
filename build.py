#!/usr/bin/env python3
"""texts/*.js から各作品のページと作品一覧（index.html）を生成する。

新しい章段を足すときは texts/ に .js を 1 つ置いて、このスクリプトを実行するだけ。
    python3 build.py
"""
import re, pathlib, html

ROOT = pathlib.Path(__file__).resolve().parent

# 収録順（時代順）。ここに無い id は末尾に五十音順で並ぶ。
ORDER = [
    'taketori-oitachi', 'ise-azumakudari', 'ise-tsutsuizutsu',
    'ochikubo-tegami', 'makura-haruwa', 'makura-warewoba', 'genji-kiritsubo',
    'hojoki-yukukawa', 'heike-gion', 'heike-ougi',
    'tsurezure-joudan', 'tsurezure-ninnaji', 'tamakatsuma-inaka',
]
# 一覧ページでのまとまり
GROUPS = [('物語・歌物語', {'物語', '歌物語'}),
          ('随筆',        {'随筆'}),
          ('軍記物語',    {'軍記物語'})]

FIELDS = ('id', 'work', 'title', 'chapter', 'author', 'era', 'genre', 'range', 'lede')
FAVICON = ("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'>"
           "<text y='26' x='4' font-size='26'>%F0%9F%93%9C</text></svg>")

FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com">\n'
         '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
         '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?'
         'family=Zen+Kaku+Gothic+New:wght@400;500;700&family=Zen+Old+Mincho:wght@400;600;900'
         '&display=swap">')


def load():
    works = []
    for path in sorted((ROOT / 'texts').glob('*.js')):
        src = path.read_text(encoding='utf-8')
        w = {}
        for key in FIELDS:
            m = re.search(r"\n\s*%s\s*:\s*'((?:[^'\\]|\\.)*)'" % key, src)
            w[key] = m.group(1) if m else ''
        if not w['id']:
            raise SystemExit('id が見つかりません: %s' % path.name)
        w['file'] = path.name
        w['words'] = len(re.findall(r"W\('", src))
        w['aux'] = len(re.findall(r",\s*'aux'\s*,", src))
        w['dan'] = len(re.findall(r"\{\s*n\s*:\s*'", src))
        works.append(w)
    works.sort(key=lambda w: (ORDER.index(w['id']) if w['id'] in ORDER else 99, w['id']))
    return works


def head(title, desc):
    return ('<!doctype html>\n<html lang="ja">\n<head>\n'
            '<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
            '<meta name="color-scheme" content="light dark">\n'
            '<meta name="description" content="%s">\n'
            '<title>%s</title>\n'
            '<link rel="icon" href="%s">\n%s\n'
            '<link rel="stylesheet" href="assets/style.css">\n</head>\n'
            % (html.escape(desc, quote=True), html.escape(title), FAVICON, FONTS))


CONTROLS = '''  <div class="tools">
    <div class="grp" id="hlchips">
      <span class="lab">品詞を強調</span>
      <button class="chip aux" data-hl="aux" aria-pressed="false"><span class="dot"></span>助動詞</button>
      <button class="chip v" data-hl="v" aria-pressed="false"><span class="dot"></span>動詞</button>
      <button class="chip adj" data-hl="adj" aria-pressed="false"><span class="dot"></span>形容</button>
      <button class="chip pt" data-hl="pt" aria-pressed="false"><span class="dot"></span>助詞</button>
      <button class="chip n" data-hl="n" aria-pressed="false"><span class="dot"></span>名詞</button>
      <button class="chip o" data-hl="o" aria-pressed="false"><span class="dot"></span>その他</button>
    </div>
    <div class="grp">
      <button class="chip kei" id="keiBtn" aria-pressed="true"><span class="dot"></span>敬語に圏点</button>
      <button class="chip plain" id="colorBtn" aria-pressed="true">品詞で色分け</button>
      <button class="chip plain" id="yakuBtn" aria-pressed="false">現代語訳</button>
    </div>
    <div class="grp">
      <span class="lab">字</span>
      <div class="step">
        <button id="fsDown" title="小さく">小</button>
        <button id="fsUp" title="大きく">大</button>
      </div>
    </div>
  </div>
'''

PANEL = '''<main>
  <aside>
    <div class="tabs" role="tablist">
      <button role="tab" id="tab-w" aria-selected="true" aria-controls="pane-w">語　釈</button>
      <button role="tab" id="tab-a" aria-selected="false" aria-controls="pane-a">助動詞一覧</button>
    </div>
    <div class="pane" id="pane-w" role="tabpanel" aria-labelledby="tab-w"></div>
    <div class="pane" id="pane-a" role="tabpanel" aria-labelledby="tab-a" hidden></div>
    <div class="legend">
      本文の語をクリック／タップすると品詞・活用・意味が出ます。<br>
      <span class="sesame">圏点</span>は敬語（尊敬・謙譲・丁寧）。矢印キーで前後の語へ移動。
    </div>
  </aside>
  <div id="scroll"><div id="text"></div></div>
</main>
'''


def work_page(w):
    e = lambda s: html.escape(s)
    return (head('%s｜%s — 古文リーダー' % (w['title'], w['work']), w['lede'])
            + '<body>\n<header>\n'
              '  <a class="back" href="index.html">← 作品一覧</a>\n'
              '  <div class="brand">\n'
              '    <h1>%s</h1>\n'
              '    <span class="work">%s・%s</span>\n'
              '    <span class="src">%s</span>\n'
              '  </div>\n' % (e(w['title']), e(w['work']), e(w['chapter']), e(w['range']))
            + CONTROLS + '</header>\n\n' + PANEL
            + '\n<script src="assets/kit.js"></script>\n'
              '<script src="assets/works.js"></script>\n'
              '<script src="texts/%s"></script>\n'
              '<script src="assets/reader.js"></script>\n</body>\n</html>\n' % w['file'])


def index_page(works):
    e = lambda s: html.escape(s)
    tot_w = sum(w['words'] for w in works)
    tot_a = sum(w['aux'] for w in works)
    body = [head('古文リーダー', '古文の名文を縦書きで読み、語をクリックすると品詞・活用・意味が引ける学習サイト。'),
            '<body class="home">\n<div class="home-wrap">\n'
            '<div class="hero">\n'
            '  <p class="eyebrow">縦書きで読む・語をひらいて確かめる</p>\n'
            '  <h1>古文リーダー</h1>\n'
            '  <p>教科書でおなじみの章段を、原文のまま縦書きで並べました。'
            '語をクリックすると品詞・活用の種類と活用形・意味が出ます。'
            '助動詞だけを浮かび上がらせたり、敬語に圏点を打ったり、現代語訳を隣に立てたりしながら読み進められます。</p>\n'
            '  <div class="counts">\n'
            '    <div><b>%d</b>章段</div>\n'
            '    <div><b>%d</b>作品</div>\n'
            '    <div><b>%s</b>語を品詞分解</div>\n'
            '    <div><b>%s</b>語の助動詞</div>\n'
            '  </div>\n</div>\n' % (len(works), len({w['work'] for w in works}),
                                    format(tot_w, ','), format(tot_a, ','))]
    seen = set()
    for label, genres in GROUPS:
        items = [w for w in works if w['genre'] in genres]
        if not items:
            continue
        seen |= {w['id'] for w in items}
        body.append('<section class="genre">\n  <h2>%s</h2>\n  <div class="cards">\n' % e(label))
        for w in items:
            body.append(
                '    <a class="card" href="%s.html">\n'
                '      <span class="spine">%s</span>\n'
                '      <span class="meat">\n'
                '        <h3>%s</h3>\n'
                '        <span class="by">%s／%s</span>\n'
                '        <p class="lede">%s</p>\n'
                '        <span class="stats"><span>%s</span><span>%d語</span>'
                '<span class="aux">助動詞%d</span></span>\n'
                '      </span>\n    </a>\n'
                % (e(w['id']), e(w['work']), e(w['title']), e(w['author']), e(w['era']),
                   e(w['lede']), e(w['chapter']), w['words'], w['aux']))
        body.append('  </div>\n</section>\n')
    missing = [w for w in works if w['id'] not in seen]
    if missing:
        raise SystemExit('ジャンル未分類: %s' % ', '.join(w['id'] for w in missing))
    body.append(
        '<div class="home-foot">\n'
        '  本文は著作権の切れた古典作品。品詞分解・現代語訳・語法メモは学校文法（古典文法）に沿って書き起こしたものです。<br>\n'
        '  章段を足すときは <code>texts/</code> に .js を置いて <code>python3 build.py</code> を実行してください。\n'
        '</div>\n</div>\n</body>\n</html>\n')
    return ''.join(body)


def main():
    works = load()
    for w in works:
        (ROOT / (w['id'] + '.html')).write_text(work_page(w), encoding='utf-8')
    (ROOT / 'assets' / 'works.js').write_text(
        'window.WORKS = [\n' + ''.join(
            "  {id:'%s', work:'%s', title:'%s'},\n" % (w['id'], w['work'], w['title'])
            for w in works) + '];\n', encoding='utf-8')
    (ROOT / 'index.html').write_text(index_page(works), encoding='utf-8')
    print('%d 章段 / %d 語 を書き出しました。' % (len(works), sum(w['words'] for w in works)))
    for w in works:
        print('  %-22s %-6s %s（%d語・助動詞%d）' % (w['id'] + '.html', w['work'], w['title'], w['words'], w['aux']))


if __name__ == '__main__':
    main()
