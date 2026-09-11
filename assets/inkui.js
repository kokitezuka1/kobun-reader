/* 書き込みの道具箱とレイヤーパネル */
(function(){
  if (!window.INK) return;
  const I = window.INK;

  const bar = document.createElement('div');
  bar.className = 'inkbar';
  bar.hidden = true;
  document.body.appendChild(bar);

  const sheet = document.createElement('div');
  sheet.className = 'inksheet';
  sheet.hidden = true;
  document.body.appendChild(sheet);

  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  function drawBar() {
    const cols = I.colors();
    bar.innerHTML =
      '<div class="grp tools">' +
      Object.keys(I.TOOLS).map(k =>
        '<button class="ib' + (I.getTool() === k ? ' on' : '') + '" data-tool="' + k + '">' +
        esc(I.TOOLS[k].label) + '</button>').join('') +
      '</div>' +
      (cols ? '<div class="grp swatches">' + cols.map((c, i) =>
        '<button class="sw' + (I.getColor() === i ? ' on' : '') + '" data-color="' + i + '" ' +
        'style="--sw:' + c + '" aria-label="色' + (i + 1) + '"></button>').join('') + '</div>' : '') +
      '<div class="grp widths">' + I.WIDTHS.map((w, i) =>
        '<button class="iw' + (I.getWidth() === i ? ' on' : '') + '" data-width="' + i + '">' +
        '<span style="--d:' + Math.max(3, w * 1.7) + 'px"></span></button>').join('') + '</div>' +
      '<div class="grp zoom">' +
      '<button class="ib" data-act="zoomout" title="縮小">−</button>' +
      '<button class="ib zoomlevel" data-act="zoomreset" title="等倍に戻す">' +
      Math.round((window.ZOOM ? ZOOM.scale : 1) * 100) + '％</button>' +
      '<button class="ib" data-act="zoomin" title="拡大">＋</button>' +
      '</div>' +
      '<div class="grp">' +
      '<button class="ib" data-act="undo" title="元に戻す">戻す</button>' +
      '<button class="ib" data-act="redo" title="やり直す">進む</button>' +
      '<button class="ib" data-act="layers">レイヤー</button>' +
      '<button class="ib close" data-act="off">閉じる</button>' +
      '</div>';
  }

  function drawSheet() {
    const d = I.doc();
    sheet.innerHTML =
      '<div class="ish-head"><b>レイヤー</b>' +
      '<span class="ish-hint">復習するときは「答え」を隠して解き直す</span>' +
      '<button class="ib" data-act="addlayer">＋ 追加</button>' +
      '<button class="ib close" data-act="closesheet">閉じる</button></div>' +
      '<ul class="ish-list">' + d.layers.map(l =>
        '<li' + (d.active === l.id ? ' class="on"' : '') + '>' +
        '<button class="eye' + (l.visible ? ' on' : '') + '" data-vis="' + l.id + '" ' +
        'aria-pressed="' + l.visible + '" title="表示／非表示">' + (l.visible ? '●' : '○') + '</button>' +
        '<button class="lock' + (l.locked ? ' on' : '') + '" data-lock="' + l.id + '" ' +
        'aria-pressed="' + l.locked + '" title="編集をロック">' + (l.locked ? '鍵' : '　') + '</button>' +
        '<button class="pick" data-pick="' + l.id + '">' + esc(l.name) +
        '<span class="n">' + l.strokes.length + '</span></button>' +
        '<button class="mini" data-clear="' + l.id + '" title="このレイヤーを消す">消去</button>' +
        (d.layers.length > 1 ? '<button class="mini" data-del="' + l.id + '" title="削除">×</button>' : '') +
        '</li>').join('') + '</ul>' +
      '<label class="ish-touch"><input type="checkbox" id="inkTouch"' +
      (I.allowTouch() ? ' checked' : '') + '> 指でも書く（Apple Pencil を使わないとき）</label>' +
      '<label class="ish-touch"><input type="checkbox" id="inkAuto"' +
      (autoPen ? ' checked' : '') + '> ペンを近づけたら道具箱を出す</label>' +
      '<p class="ish-note">ペンで素早く二度たたくと消しゴムに切り替わります。' +
      '二本指でピンチすると拡大縮小、拡大中は二本指でスクロールできます。</p>';
    const t = sheet.querySelector('#inkTouch');
    if (t) t.onchange = () => I.setAllowTouch(t.checked);
    const a = sheet.querySelector('#inkAuto');
    if (a) a.onchange = () => {
      autoPen = a.checked;
      try { localStorage.setItem(AUTOKEY, autoPen ? '1' : '0'); } catch (err) {}
    };
  }

  bar.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.tool) { I.setTool(b.dataset.tool); drawBar(); return; }
    if (b.dataset.color !== undefined) { I.setColor(+b.dataset.color); drawBar(); return; }
    if (b.dataset.width !== undefined) { I.setWidth(+b.dataset.width); drawBar(); return; }
    const a = b.dataset.act;
    if (a === 'zoomin')  { window.ZOOM && ZOOM.zoomIn();  return; }
    if (a === 'zoomout') { window.ZOOM && ZOOM.zoomOut(); return; }
    if (a === 'zoomreset') { window.ZOOM && ZOOM.reset();  return; }
    if (a === 'undo') I.undo();
    else if (a === 'redo') I.redo();
    else if (a === 'layers') { sheet.hidden = !sheet.hidden; if (!sheet.hidden) drawSheet(); }
    else if (a === 'off') setOn(false);
  });

  sheet.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.vis)  { I.toggleVisible(b.dataset.vis); drawSheet(); return; }
    if (b.dataset.lock) { I.toggleLock(b.dataset.lock); drawSheet(); return; }
    if (b.dataset.pick) { I.setActive(b.dataset.pick); drawSheet(); return; }
    if (b.dataset.clear) {
      const l = I.doc().layers.find(x => x.id === b.dataset.clear);
      if (l && l.strokes.length && confirm('「' + l.name + '」の書き込みを全部消します。よろしいですか。')) {
        I.clearLayer(b.dataset.clear); drawSheet();
      }
      return;
    }
    if (b.dataset.del) {
      const l = I.doc().layers.find(x => x.id === b.dataset.del);
      if (l && confirm('「' + l.name + '」を削除します。よろしいですか。')) { I.removeLayer(b.dataset.del); drawSheet(); }
      return;
    }
    if (b.dataset.act === 'addlayer') { I.addLayer(); drawSheet(); return; }
    if (b.dataset.act === 'closesheet') sheet.hidden = true;
  });
  sheet.addEventListener('dblclick', e => {
    const b = e.target.closest('[data-pick]'); if (!b) return;
    const l = I.doc().layers.find(x => x.id === b.dataset.pick); if (!l) return;
    const name = prompt('レイヤーの名前', l.name);
    if (name) { I.rename(l.id, name.slice(0, 20)); drawSheet(); }
  });

  const AUTOKEY = 'kobun:ink:autopen';
  let autoPen = true;
  try { autoPen = localStorage.getItem(AUTOKEY) !== '0'; } catch (e) {}

  const btn = document.getElementById('inkBtn');
  function setOn(v) {
    I.setOn(v);
    bar.hidden = !v;
    if (!v) sheet.hidden = true;
    if (btn) btn.setAttribute('aria-pressed', v);
    if (v) drawBar();
  }
  if (btn) btn.onclick = () => setOn(!I.isOn());

  document.addEventListener('keydown', e => {
    if (!I.isOn()) return;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault(); e.shiftKey ? I.redo() : I.undo();
    }
    if (e.key === 'Escape') setOn(false);
  });

  /* ペンが近づいたら道具箱を出す。ダブルタップで道具が変わったら表示を合わせる */
  I.onPen(kind => {
    if (kind === 'tool') { if (!bar.hidden) drawBar(); return; }
    if (autoPen && !I.isOn()) setOn(true);
  });
  document.addEventListener('zoomchange', () => { if (!bar.hidden) drawBar(); });

  /* 書き込みがあれば、ひらいたときにボタンへ印を出す */
  if (btn && I.count()) btn.classList.add('has');
})();
