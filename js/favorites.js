/* favorites.js — needs: data.js, store.js, ui.js, shared.js */
(function (E) {
  'use strict';

  const user = E.boot();
  if (!user) return;

  const fmt = E.fmt;
  const ui = E.ui;
  const $ = function (id) { return document.getElementById(id); };

  const grid = $('grid');
  const empty = $('empty');
  const bar = $('bar');
  const summary = $('summary');
  const headline = $('headline');
  const sort = $('sort');

  function render() {
    const ids = E.favs.list(user.id);
    const list = ids.map(E.propertyById).filter(Boolean);

    if (sort.value === 'low') list.sort(function (a, b) { return a.rent - b.rent; });
    else if (sort.value === 'high') list.sort(function (a, b) { return b.rent - a.rent; });
    else list.sort(function (a, b) { return ids.indexOf(b.id) - ids.indexOf(a.id); });   // newest first

    grid.innerHTML = list.map(function (p) { return E.cards.html(p, true); }).join('');

    const has = list.length > 0;
    grid.hidden = !has;
    empty.hidden = has;
    bar.hidden = !has;
    headline.textContent = has
      ? list.length + (list.length === 1 ? ' property saved' : ' properties saved')
      : 'Saved properties';

    if (has) {
      const average = Math.round(list.reduce(function (s, p) { return s + p.rent; }, 0) / list.length);
      const available = list.filter(function (p) { return p.status === 'available'; }).length;
      summary.textContent = 'Average rent ' + fmt.money(average) + ' per month \u00B7 ' + available + ' available now';
    }
  }

  /* Remove one — with an Undo that restores the exact previous list. */
  grid.addEventListener('click', function (event) {
    const btn = event.target.closest('.fav');
    if (!btn) return;
    const p = E.propertyById(btn.dataset.id);
    const before = E.favs.list(user.id);
    E.favs.set(user.id, before.filter(function (id) { return id !== btn.dataset.id; }));
    render();
    ui.toast('Removed ' + (p ? p.unit + ', ' + p.name : 'property'), {
      action: { label: 'Undo', onClick: function () { E.favs.set(user.id, before); render(); } }
    });
  });

  sort.addEventListener('change', render);

  $('clearAll').addEventListener('click', function () {
    ui.confirm({
      title: 'Remove all saved properties?',
      message: 'Every property on this list will be removed. You can undo this right afterwards.',
      confirmLabel: 'Remove all',
      danger: true
    }).then(function (yes) {
      if (!yes) return;
      const before = E.favs.list(user.id);
      E.favs.set(user.id, []);
      render();
      ui.toast('Removed all saved properties', {
        action: { label: 'Undo', onClick: function () { E.favs.set(user.id, before); render(); } }
      });
    });
  });

  window.addEventListener('storage', function (e) {
    if (e.key && e.key.indexOf(E.KEYS.favs) === 0) render();
  });
  window.addEventListener('pageshow', function (e) { if (e.persisted) render(); });

  render();

})(window.Estate);
