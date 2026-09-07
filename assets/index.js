(function () {
  const favCards = document.getElementById('fav-cards');
  const favEmpty = document.getElementById('fav-empty');
  const favCount = document.getElementById('fav-count');
  const order = (window.WORKS || []).map(w => w.id);

  /* 元のカードを id で引けるようにしておく */
  const src = {};
  document.querySelectorAll('.genre a.card').forEach(a => { src[a.dataset.id] = a; });

  function renderFavs() {
    const ids = order.filter(id => FAV.has(id));
    favCards.textContent = '';
    ids.forEach(id => { if (src[id]) favCards.appendChild(src[id].cloneNode(true)); });
    favCards.hidden = ids.length === 0;
    favEmpty.hidden = ids.length > 0;
    favCount.textContent = ids.length;
    FAV.sync();
  }

  document.addEventListener('fav:change', renderFavs);
  renderFavs();
})();
