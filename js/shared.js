/* ==========================================================================
   shared.js — used by dashboard, favorites and profile (the signed-in pages):
   page boot, property cards, rent-cycle logic.
   ========================================================================== */
(function (E) {
  'use strict';

  const fmt = E.fmt;
  const esc = E.ui.esc;
  const DAY = 864e5;

  /* ---- Boot: guard the page, paint the rail, wire "Sign out" ---- */
  E.boot = function () {
    const user = E.auth.require();
    if (!user) return null;
    E.auth.adoptLegacyFavs(user);
    E.auth.paintRail(user);
    const out = document.getElementById('signout');
    if (out) out.addEventListener('click', E.auth.signOut);
    return user;
  };

  /* ---- Property cards (identical markup on dashboard and favorites) ---- */
  function factsFor(p) {
    const bits = [];
    if (p.beds) bits.push(p.beds + ' bed');
    if (p.baths) bits.push(p.baths + ' bath');
    if (p.size) bits.push(p.size);
    if (p.frontage) bits.push(p.frontage);
    bits.push(p.furnished ? 'Furnished' : 'Unfurnished');
    return bits.map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('');
  }

  function favLabel(p, saved) {
    return (saved ? 'Remove ' : 'Save ') + p.name + ' ' + p.unit + (saved ? ' from saved' : '');
  }

  E.cards = {
    html: function (p, saved) {
      return '' +
      '<article class="prop prop--' + p.type + (p.status === 'let' ? ' prop--let' : '') + '">' +
        '<div class="prop-plan">' +
          '<button class="fav" type="button" data-id="' + p.id + '" aria-pressed="' + saved + '" ' +
            'aria-label="' + esc(favLabel(p, saved)) + '">' +
            '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">' +
            '<path d="m12 20-7.5-7a4.5 4.5 0 1 1 7.5-5 4.5 4.5 0 1 1 7.5 5Z"/></svg>' +
          '</button>' +
          '<span class="kind">' + (p.type === 'commercial' ? 'Commercial' : 'Residential') + '</span>' +
        '</div>' +
        '<div class="prop-body">' +
          '<h3>' + esc(p.unit) + ', ' + esc(p.name) + '</h3>' +
          '<p class="prop-addr">' + esc(p.area) + '</p>' +
          '<ul class="prop-facts">' + factsFor(p) + '</ul>' +
          '<div class="prop-foot">' +
            '<span class="rent">' + fmt.money(p.rent) + ' <small>/ month</small></span>' +
            '<span class="badge ' + (p.status === 'let' ? 'badge-closed' : 'badge-progress') + '">' +
              (p.status === 'let' ? 'Let' : 'Available') + '</span>' +
          '</div>' +
        '</div>' +
      '</article>';
    },

    /* Flip a heart button in place (keeps keyboard focus, no re-render). */
    paintFav: function (btn, saved, p) {
      btn.setAttribute('aria-pressed', String(saved));
      btn.setAttribute('aria-label', favLabel(p, saved));
    }
  };

  /* ---- Rent cycle ----
     Rent is due on lease.dueDay of every month. The "next" payment is the
     earliest unpaid month from this month to the end of the lease, so a
     tenant can also pay ahead. */
  const monthKey = function (d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  };

  E.rent = {
    /* null            -> no lease on this account
       { done: true }  -> everything up to lease end is paid
       { done: false, key, month, due, amount, property, overdue, daysLate } */
    next: function (user) {
      const lease = user && user.lease;
      const prop = lease && E.propertyById(lease.propertyId);
      if (!prop) return null;

      const paid = new Set(E.payments.list(user.id).map(function (p) { return p.month; }));
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const start = fmt.parseDate(lease.start);
      const end = fmt.parseDate(lease.end);
      const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const firstMonth = new Date(start.getFullYear(), start.getMonth(), 1);
      const lastMonth = new Date(end.getFullYear(), end.getMonth(), 1);

      let cur = thisMonth > firstMonth ? thisMonth : firstMonth;
      for (; cur <= lastMonth; cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1)) {
        const key = monthKey(cur);
        if (paid.has(key)) continue;
        const due = new Date(cur.getFullYear(), cur.getMonth(), lease.dueDay || 5);
        const diff = Math.round((due - today) / DAY);
        return {
          done: false, key: key, month: cur, due: due, amount: prop.rent, property: prop,
          overdue: diff < 0, daysLate: diff < 0 ? -diff : 0
        };
      }
      return { done: true, property: prop };
    },

    /* Demo payment: nothing is charged, it is only recorded on this device. */
    pay: function (user, due, method) {
      return E.payments.add(user.id, {
        id: 'pay' + Date.now().toString(36),
        month: due.key,
        amount: due.amount,
        method: method,
        ref: 'EST' + Math.random().toString(36).slice(2, 8).toUpperCase(),
        at: new Date().toISOString()
      });
    }
  };

})(window.Estate = window.Estate || {});
