#!/usr/bin/env python3
"""texts/*.js から各章段のページ・練習ページ・作品一覧を生成する。

新しい章段を足すときは texts/ に .js を 1 つ置いて、このスクリプトを実行するだけ。
    python3 build.py
"""
import re, pathlib, html

ROOT = pathlib.Path(__file__).resolve().parent

# 収録順（時代順）。ここに無い id は末尾に並ぶ。
ORDER = [
    'taketori-oitachi', 'ise-azumakudari', 'ise-tsutsuizutsu',
    'ochikubo-tegami', 'makura-haruwa', 'makura-warewoba', 'genji-kiritsubo',
    'hojoki-yukukawa', 'heike-gion', 'heike-ougi',
    'tsurezure-joudan', 'tsurezure-ninnaji', 'tamakatsuma-inaka',
    'shiki-koumon',
]
# 一覧ページでのまとまり
GROUPS = [('物語・歌物語', {'物語', '歌物語'}),
          ('随筆',        {'随筆'}),
          ('軍記物語',    {'軍記物語'}),
          ('漢文',        {'漢文'})]
# 初回訪問時にお気に入りに入っている作品
DEFAULT_FAV_WORKS = ['玉勝間', '落窪物語', '枕草子', '源氏物語']

FIELDS = ('id', 'work', 'title', 'chapter', 'author', 'era', 'genre', 'range', 'lede')
FAVICON = ("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'>"
           "<text y='26' x='4' font-size='26'>%F0%9F%93%9C</text></svg>")
FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com">\n'
         '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
         '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?'
         'family=Zen+Kaku+Gothic+New:wght@400;500;700&family=Zen+Old+Mincho:wght@400;600;900'
         '&display=swap">')
e = html.escape


def ver(rel):
    """assets/*.js などに内容ハッシュを付ける（ブラウザの古いキャッシュ対策）"""
    f = ROOT / rel
    if not f.exists():
        return rel
    import hashlib
    h = hashlib.sha1(f.read_bytes()).hexdigest()[:8]
    return '%s?v=%s' % (rel, h)


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
        works.append(w)
    works.sort(key=lambda w: (ORDER.index(w['id']) if w['id'] in ORDER else 99, w['id']))
    return works


def head(title, desc, body_class=''):
    return ('<!doctype html>\n<html lang="ja">\n<head>\n'
            '<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
            '<meta name="color-scheme" content="light dark">\n'
            '<meta name="description" content="%s">\n<title>%s</title>\n'
            '<link rel="icon" href="%s">\n%s\n'
            '<link rel="stylesheet" href="%s">\n</head>\n<body%s>\n'
            % (e(desc, quote=True), e(title), FAVICON, FONTS, ver('assets/style.css'),
               ' class="%s"' % body_class if body_class else ''))


def star(work_id):
    return ('<button class="star" data-fav-id="%s" aria-pressed="false" '
            'aria-label="お気に入りに入れる">★</button>' % e(work_id))


CONTROLS = '''  <div class="tools">
    <div class="grp" id="hlchips">
      <span class="lab">品詞を強調</span>
      <button class="chip aux" data-hl="aux" aria-pressed="false"><span class="dot"></span>助動詞</button>
      <button class="chip v" data-hl="v" aria-pressed="false"><span class="dot"></span>動詞</button>
      <button class="chip adj" data-hl="adj" aria-pressed="false"><span class="dot"></span>形容</button>
      <button class="chip pt" data-hl="pt" aria-pressed="false"><span class="dot"></span>助詞</button>
      <button class="chip n" data-hl="n" aria-pressed="false"><span class="dot"></span>名詞</button>
      <button class="chip o" data-hl="o" aria-pressed="false"><span class="dot"></span>その他</button>
      <button class="chip imp" data-hl="imp" aria-pressed="false"><span class="dot"></span>要チェック</button>
      <button class="chip spot" data-hl="spot" aria-pressed="false"><span class="dot"></span>頻出</button>
    </div>
    <div class="grp">
      <button class="chip kei" id="keiBtn" aria-pressed="true"><span class="dot"></span>敬語に圏点</button>
      <button class="chip plain" id="colorBtn" aria-pressed="true">品詞で色分け</button>
      <button class="chip plain" id="rubyBtn" aria-pressed="false">読み仮名</button>
      <button class="chip plain" id="hakuBtn" aria-pressed="false">白文</button>
      <button class="chip plain" id="yakuBtn" aria-pressed="false">現代語訳</button>
      <button class="chip plain" id="pdfBtn">PDF</button>
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
      <button role="tab" id="tab-a" aria-selected="false" aria-controls="pane-a">助動詞</button>
      <button role="tab" id="tab-k" aria-selected="false" aria-controls="pane-k">句法</button>
      <button role="tab" id="tab-s" aria-selected="false" aria-controls="pane-s">頻出</button>
    </div>
    <div class="pane" id="pane-w" role="tabpanel" aria-labelledby="tab-w"></div>
    <div class="pane" id="pane-a" role="tabpanel" aria-labelledby="tab-a" hidden></div>
    <div class="pane" id="pane-k" role="tabpanel" aria-labelledby="tab-k" hidden></div>
    <div class="pane" id="pane-s" role="tabpanel" aria-labelledby="tab-s" hidden></div>
    <div class="legend">
      本文の語をクリック／タップすると品詞・活用・意味が出ます。<br>
      <span class="sesame">圏点</span>は敬語、<span class="kuline">下線</span>は句法。矢印キーで前後の語へ移動。
    </div>
  </aside>
  <div id="scroll"><div id="text"></div></div>
</main>
'''


def work_page(w):
    return (head('%s｜%s — 古文リーダー' % (w['title'], w['work']), w['lede'])
            + '<header>\n'
              '  <a class="back" href="index.html">← 作品一覧</a>\n'
              '  %s\n'
              '  <div class="brand">\n    <h1>%s</h1>\n'
              '    <span class="work">%s・%s</span>\n'
              '    <span class="src">%s</span>\n  </div>\n'
              '  <a class="back" href="%s-drill.html">練習 →</a>\n'
              % (star(w['id']), e(w['title']), e(w['work']), e(w['chapter']),
                 e(w['range']), e(w['id']))
            + CONTROLS + '</header>\n\n' + PANEL
            + '\n<script src="%s"></script>\n' % ver('assets/kit.js')
            + '<script src="%s"></script>\n' % ver('assets/works.js')
            + '<script src="%s"></script>\n' % ver('assets/favorites.js')
            + '<script src="%s"></script>\n' % ver('assets/spots.js')
            + '<script src="%s"></script>\n' % ver('assets/lexicon.js')
            + '<script src="%s"></script>\n' % ver('assets/conj.js')
            + '<script src="texts/%s"></script>\n' % w['file']
            + '<script src="%s"></script>\n' % ver('assets/reader.js')
            + '<script src="%s"></script>\n' % ver('assets/zoom.js')
            + '<script src="%s"></script>\n</body>\n</html>\n' % ver('assets/pdf.js'))


def drill_page(w):
    return (head('%s 練習｜%s — 古文リーダー' % (w['title'], w['work']),
                 '%s『%s』の重要語フラッシュカード・単語クイズ・文法問題。' % (w['work'], w['title']), 'drill')
            + '<header>\n'
              '  <a class="back" href="%s.html">← 本文へ</a>\n'
              '  %s\n'
              '  <div class="brand">\n    <h1>%s</h1>\n'
              '    <span class="work">%s・練習</span>\n  </div>\n'
              '  <a class="back" href="index.html">作品一覧</a>\n</header>\n\n'
              % (e(w['id']), star(w['id']), e(w['title']), e(w['work']))
            + '<div class="drill-wrap">\n'
              '  <div class="drill-tabs" role="tablist">\n'
              '    <button role="tab" id="tab-spot" aria-selected="true">テスト対策</button>\n'
              '    <button role="tab" id="tab-card" aria-selected="false">フラッシュカード</button>\n'
              '    <button role="tab" id="tab-vocab" aria-selected="false">単語クイズ</button>\n'
              '    <button role="tab" id="tab-quiz" aria-selected="false">文法問題</button>\n'
              '  </div>\n'
              '  <p class="drill-note">テストでねらわれやすい <b id="spot-size">0</b> 箇所の一問一答と、'
              '品詞分解から自動で作った カード <b id="deck-size">0</b> 枚・'
              '単語クイズの対象語 <b id="vocab-size">0</b> 語。'
              'クイズは毎回10問を選び直します。覚えた記録はこの端末のブラウザに残ります。</p>\n'
              '  <div class="scope" id="scope" role="group" aria-label="出題の範囲">\n'
              '    <button data-scope="all" aria-pressed="true">すべての語</button>\n'
              '    <button data-scope="imp" aria-pressed="false">要チェックのみ</button>\n'
              '  </div>\n'
              '  <div class="pane-d" id="pane-spot"><div id="spot-box"></div></div>\n'
              '  <div class="pane-d" id="pane-card" hidden>\n'
              '    <div class="bar" id="card-bar"></div>\n'
              '    <div class="stat" id="card-stat"></div>\n'
              '    <div id="card-box"></div>\n'
              '  </div>\n'
              '  <div class="pane-d" id="pane-vocab" hidden><div id="vocab-box"></div></div>\n'
              '  <div class="pane-d" id="pane-quiz" hidden><div id="quiz-box"></div></div>\n'
              '</div>\n'
            + '\n<script src="%s"></script>\n' % ver('assets/kit.js')
            + '<script src="%s"></script>\n' % ver('assets/works.js')
            + '<script src="%s"></script>\n' % ver('assets/favorites.js')
            + '<script src="%s"></script>\n' % ver('assets/spots.js')
            + '<script src="%s"></script>\n' % ver('assets/lexicon.js')
            + '<script src="%s"></script>\n' % ver('assets/conj.js')
            + '<script src="texts/%s"></script>\n' % w['file']
            + '<script src="%s"></script>\n</body>\n</html>\n' % ver('assets/drill.js'))


def card(w):
    return ('    <a class="card" href="%s.html" data-id="%s">\n'
            '      %s\n'
            '      <span class="spine">%s</span>\n'
            '      <span class="meat">\n        <h3>%s</h3>\n'
            '        <span class="by">%s／%s</span>\n'
            '        <p class="lede">%s</p>\n'
            '        <span class="stats"><span>%s</span><span>%d語</span>'
            '<span class="aux">助動詞%d</span></span>\n'
            '      </span>\n    </a>\n'
            % (e(w['id']), e(w['id']), star(w['id']), e(w['work']), e(w['title']),
               e(w['author']), e(w['era']), e(w['lede']), e(w['chapter']),
               w['words'], w['aux']))


def index_page(works):
    tot_w = sum(w['words'] for w in works)
    tot_a = sum(w['aux'] for w in works)
    out = [head('古文リーダー',
                '古文・漢文の名文を縦書きで読み、語をクリックすると品詞・活用・意味が引ける学習サイト。',
                'home'),
           '<div class="home-wrap">\n<div class="hero">\n'
           '  <p class="eyebrow">縦書きで読む・語をひらいて確かめる</p>\n'
           '  <h1>古文リーダー</h1>\n'
           '  <p>教科書でおなじみの章段を、原文のまま縦書きで並べました。'
           '語をクリックすると品詞・活用の種類と活用形・意味が出ます。'
           '助動詞だけを浮かび上がらせたり、敬語に圏点を打ったり、現代語訳を隣に立てたりしながら読み進められます。'
           '章段ごとにフラッシュカードと確認問題も用意しました。</p>\n'
           '  <div class="counts">\n    <div><b>%d</b>章段</div>\n    <div><b>%d</b>作品</div>\n'
           '    <div><b>%s</b>語を品詞分解</div>\n    <div><b>%s</b>語の助動詞</div>\n  </div>\n</div>\n'
           % (len(works), len({w['work'] for w in works}), format(tot_w, ','), format(tot_a, ',')),
           '<section class="genre shelf">\n'
           '  <h2>お気に入り<span class="n" id="fav-count">0</span></h2>\n'
           '  <div class="cards" id="fav-cards" hidden></div>\n'
           '  <div class="fav-empty" id="fav-empty" hidden>'
           'カードの<button class="star" aria-pressed="true" tabindex="-1">★</button>'
           'を押すと、ここによく読む章段が並びます。</div>\n</section>\n']
    seen = set()
    for label, genres in GROUPS:
        items = [w for w in works if w['genre'] in genres]
        if not items:
            continue
        seen |= {w['id'] for w in items}
        out.append('<section class="genre">\n  <h2>%s</h2>\n  <div class="cards">\n' % e(label))
        out += [card(w) for w in items]
        out.append('  </div>\n</section>\n')
    missing = [w for w in works if w['id'] not in seen]
    if missing:
        raise SystemExit('ジャンル未分類: %s' % ', '.join(w['id'] for w in missing))
    out.append('<div class="home-foot">\n'
               '  本文は著作権の切れた古典作品。品詞分解・現代語訳・語法メモは学校文法（古典文法）に沿って書き起こしたものです。<br>\n'
               '  お気に入りと学習の記録は、この端末のブラウザにだけ保存されます。<br>\n'
               '  章段を足すときは <code>texts/</code> に .js を置いて <code>python3 build.py</code> を実行してください。\n'
               '</div>\n</div>\n'
               '<script src="%s"></script>\n' % ver('assets/works.js') +
               '<script src="%s"></script>\n' % ver('assets/favorites.js') +
               '<script src="%s"></script>\n</body>\n</html>\n' % ver('assets/index.js'))
    return ''.join(out)


def main():
    works = load()
    favs = [w['id'] for w in works if w['work'] in DEFAULT_FAV_WORKS]
    for w in works:
        (ROOT / (w['id'] + '.html')).write_text(work_page(w), encoding='utf-8')
        (ROOT / (w['id'] + '-drill.html')).write_text(drill_page(w), encoding='utf-8')
    (ROOT / 'assets' / 'works.js').write_text(
        'window.WORKS = [\n' + ''.join(
            "  {id:'%s', work:'%s', title:'%s'},\n" % (w['id'], w['work'], w['title'])
            for w in works) + '];\n'
        + 'window.DEFAULT_FAVORITES = ' + repr(favs).replace('"', "'") + ';\n',
        encoding='utf-8')
    (ROOT / 'index.html').write_text(index_page(works), encoding='utf-8')
    print('%d 章段 / %d 語　（ページ %d 枚）' % (len(works), sum(w['words'] for w in works), len(works) * 2 + 1))
    print('既定のお気に入り: %s' % ', '.join(favs))
    for w in works:
        print('  %-24s %-6s %s（%d語・助動詞%d）' % (w['id'] + '.html', w['work'], w['title'], w['words'], w['aux']))


if __name__ == '__main__':
    main()
