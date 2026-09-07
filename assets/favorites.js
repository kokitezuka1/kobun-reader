/* お気に入り（この端末のブラウザに保存される） */
window.FAV = (function () {
  const KEY = 'kobun:favorites';
  function read() {
    try {
      const v = localStorage.getItem(KEY);
      if (v === null) return null;
      const a = JSON.parse(v);
      return Array.isArray(a) ? a : null;
    } catch (e) { return null; }
  }
  function write(a) {
    try { localStorage.setItem(KEY, JSON.stringify(a)); } catch (e) {}
  }
  // 初回だけ既定のお気に入りを入れる。以後は利用者の操作を尊重する
  let ids = read();
  if (ids === null) { ids = (window.DEFAULT_FAVORITES || []).slice(); write(ids); }

  return {
    list() { return ids.slice(); },
    has(id) { return ids.indexOf(id) >= 0; },
    toggle(id) {
      const i = ids.indexOf(id);
      if (i >= 0) ids.splice(i, 1); else ids.push(id);
      write(ids);
      return ids.indexOf(id) >= 0;
    },
    /* ページ内のすべての星ボタンを現在の状態に合わせる */
    sync(root) {
      (root || document).querySelectorAll('[data-fav-id]').forEach(b => {
        const on = this.has(b.dataset.favId);
        b.setAttribute('aria-pressed', on);
        b.title = on ? 'お気に入りから外す' : 'お気に入りに入れる';
        b.setAttribute('aria-label', b.title);
      });
    }
  };
})();

/* どのページでも [data-fav-id] を押せば切り替わるようにする */
(function () {
  const apply = () => FAV.sync();
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-fav-id]');
    if (!b) return;
    e.preventDefault();          // カードのリンクをたどらせない
    e.stopPropagation();
    FAV.toggle(b.dataset.favId);
    apply();
    document.dispatchEvent(new CustomEvent('fav:change'));
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply);
  else apply();
})();
