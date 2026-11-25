/* dashboard.js — needs: data.js, store.js, ui.js, shared.js */
(function (E) {
  'use strict';

  const user = E.boot();
  if (!user) return;

  const fmt = E.fmt;
  const ui = E.ui;
  const esc = ui.esc;
  const $ = function (id) { return document.getElementById(id); };

  const isTenant = user.role === 'tenant';
  const lease = user.lease && E.propertyById(user.lease.propertyId) ? user.lease : null;

  /* ---- Greeting ---- */
  (function greet() {
    const hour = new Date().getHours();
    const part = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    $('greeting').textContent = part + ', ' + user.name.split(' ')[0];
  })();

  /* ---- Summary numbers come from the data, not from fixed text ---- */
  function renderStats() {
    const all = E.PROPERTIES;
    const let_ = all.filter(function (p) { return p.status === 'let'; }).length;
    $('statTotal').textContent = all.length;
    $('statLet').textContent = let_;
    $('statAvail').textContent = all.length - let_;
    $('statRepairs').textContent = E.tickets.openCount(user.id);
  }

  /* ==================================================================
     Property grid: search + filter chips + save/unsave
     ================================================================== */
  const grid = $('grid');
  const noResults = $('noResults');
  const count = $('count');
  const search = $('q');
  const chips = document.querySelectorAll('.chip');
  let activeFilter = 'all';

  function matches(p, term) {
    const byFilter =
      activeFilter === 'all' ? true :
      activeFilter === 'available' ? p.status === 'available' :
      activeFilter === 'furnished' ? p.furnished :
      p.type === activeFilter;
    const haystack = (p.name + ' ' + p.unit + ' ' + p.area + ' ' + p.type).toLowerCase();
    return byFilter && haystack.indexOf(term) !== -1;
  }

  function renderGrid() {
    const term = search.value.trim().toLowerCase();
    const saved = E.favs.list(user.id);
    const list = E.PROPERTIES.filter(function (p) { return matches(p, term); });

    grid.innerHTML = list.map(function (p) {
      return E.cards.html(p, saved.indexOf(p.id) !== -1);
    }).join('');
    grid.hidden = list.length === 0;
    noResults.hidden = list.length !== 0;
    count.textContent = list.length + ' of ' + E.PROPERTIES.length + ' shown';
  }

  grid.addEventListener('click', function (event) {
    const btn = event.target.closest('.fav');
    if (!btn) return;
    const p = E.propertyById(btn.dataset.id);
    if (!p) return;

    const nowSaved = E.favs.toggle(user.id, p.id);
    E.cards.paintFav(btn, nowSaved, p);        // in place, so keyboard focus stays on the heart

    const label = p.unit + ', ' + p.name;
    if (nowSaved) {
      ui.toast('Saved ' + label);
    } else {
      ui.toast('Removed ' + label, { action: { label: 'Undo', onClick: function () {
        E.favs.toggle(user.id, p.id);
        renderGrid();
      } } });
    }
  });

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      activeFilter = chip.dataset.filter;
      chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c === chip)); });
      renderGrid();
    });
  });

  search.addEventListener('input', renderGrid);

  $('clearFilters').addEventListener('click', function () {
    search.value = '';
    activeFilter = 'all';
    chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c.dataset.filter === 'all')); });
    renderGrid();
    search.focus();
  });

  /* Saved properties may change in another tab, or while we were on another page. */
  window.addEventListener('storage', function (e) {
    if (e.key && e.key.indexOf(E.KEYS.favs) === 0) renderGrid();
  });
  window.addEventListener('pageshow', function (e) { if (e.persisted) { renderGrid(); renderTickets(); renderStats(); renderRent(); } });

  /* ==================================================================
     Rent card (tenants only)
     ================================================================== */
  let rentMode = 'none';   // 'pay' | 'done' | 'none'

  function renderRent() {
    if (!isTenant) {
      $('rentHead').hidden = true;
      $('rentCard').hidden = true;
      return;
    }
    const card = $('rentCard');
    const due = $('rentDue');
    const amount = $('rentAmount');
    const unit = $('rentUnit');
    const btn = $('payRent');
    const next = E.rent.next(user);
    card.style.borderLeftColor = '';
    btn.disabled = false;

    if (!next) {                                   // no lease on this account
      rentMode = 'none';
      due.textContent = 'No active lease';
      amount.textContent = '\u2014';
      unit.textContent = 'Find an available property below and contact the owner to start a lease.';
      btn.textContent = 'Browse properties';
    } else if (next.done) {                        // lease fully paid
      rentMode = 'done';
      due.textContent = 'Nothing due';
      amount.textContent = fmt.money(0);
      unit.textContent = next.property.unit + ', ' + next.property.name + ' \u00B7 rent is paid through the end of your lease';
      btn.textContent = 'All paid';
      btn.disabled = true;
    } else {
      rentMode = 'pay';
      if (next.overdue) {
        due.innerHTML = 'Due ' + esc(fmt.date(next.due)) + ' <span class="badge badge-due">Overdue by ' +
                        esc(fmt.plural(next.daysLate, 'day')) + '</span>';
        card.style.borderLeftColor = 'var(--rust)';
      } else {
        due.textContent = 'Due ' + fmt.date(next.due);
      }
      amount.textContent = fmt.money(next.amount);
      unit.textContent = next.property.unit + ', ' + next.property.name + ' \u00B7 ' + fmt.monthName(next.month) + ' rent';
      btn.textContent = 'Pay rent';
    }
  }

  function openPayment() {
    const next = E.rent.next(user);
    if (!next || next.done) return;

    const body = document.createElement('div');
    body.innerHTML =
      '<p>Pay <b>' + esc(fmt.money(next.amount)) + '</b> for ' + esc(fmt.monthLong(next.month)) +
      ' rent on ' + esc(next.property.unit) + ', ' + esc(next.property.name) + '.</p>' +
      '<div class="field" style="margin-bottom:0"><label for="payMethod">Payment method</label>' +
      '<select id="payMethod"><option>UPI</option><option>Debit / credit card</option><option>Net banking</option></select>' +
      '<p class="hint">Demo payment \u2014 no money moves. It is recorded on this device only.</p></div>';

    ui.dialog({
      title: 'Pay rent',
      content: body,
      buttons: [
        { label: 'Cancel', variant: 'quiet' },
        { label: 'Pay ' + fmt.money(next.amount), onClick: function (api, btn) {
            api.locked = true;
            api.foot.querySelectorAll('button').forEach(function (b) { b.disabled = true; });
            btn.textContent = 'Processing\u2026';
            const method = body.querySelector('#payMethod').value;
            setTimeout(function () {
              const receipt = E.rent.pay(user, next, method);
              api.locked = false;
              api.close();
              renderRent();
              ui.toast('Payment received \u00B7 ref ' + receipt.ref);
            }, 900);
            return false;                       // stay open until the "payment" finishes
        } }
      ]
    });
  }

  $('payRent').addEventListener('click', function () {
    if (rentMode === 'pay') openPayment();
    else if (rentMode === 'none') { grid.scrollIntoView({ behavior: 'smooth', block: 'start' }); search.focus({ preventScroll: true }); }
  });

  /* ==================================================================
     Maintenance tickets
     ================================================================== */
  const ticketBox = $('tickets');
  const STATE_LABEL = { open: 'Open', progress: 'In progress', closed: 'Closed' };

  function renderTickets() {
    const list = E.tickets.list(user.id);
    if (!list.length) {
      ticketBox.innerHTML = '<div class="ticket"><p class="muted-empty">' +
        (lease || !isTenant ? 'No maintenance requests yet.' : 'Requests you raise will appear here once you have an active lease.') +
        '</p></div>';
      return;
    }
    ticketBox.innerHTML = list.slice(0, 8).map(function (t) {
      return '<div class="ticket">' +
        '<div class="ticket-top"><b>' + esc(t.title) + '</b>' +
        '<span class="badge badge-' + esc(t.state) + '">' + esc(STATE_LABEL[t.state] || t.state) + '</span></div>' +
        '<p>' + esc(t.unit) + ' \u00B7 raised ' + esc(fmt.ago(t.createdAt)) + '</p>' +
        (t.state !== 'closed'
          ? '<button class="link-btn" type="button" data-resolve="' + esc(t.id) + '">Mark as resolved</button>'
          : '') +
        '</div>';
    }).join('');
  }

  ticketBox.addEventListener('click', function (event) {
    const btn = event.target.closest('[data-resolve]');
    if (!btn) return;
    E.tickets.setState(user.id, btn.dataset.resolve, 'closed');
    renderTickets();
    renderStats();
    ui.toast('Request marked as resolved.');
  });

  /* ---- Raise a request ---- */
  const raise = $('raise');
  const unitSelect = $('unit');
  const ticketForm = $('ticketForm');
  const ticketNotice = $('ticketNotice');
  let noticeTimer;

  /* Tenants can only raise requests for the unit they rent; owners and
     administrators can raise one for any property. */
  const raisable = isTenant ? (lease ? [E.propertyById(lease.propertyId)] : []) : E.PROPERTIES;

  if (!raisable.length) {
    raise.hidden = true;
    $('raiseLink').hidden = true;
  } else {
    unitSelect.innerHTML = raisable.map(function (p) {
      return '<option value="' + p.id + '">' + esc(p.unit + ', ' + p.name) + '</option>';
    }).join('');
  }

  ui.clearErrorsOnInput(ticketForm);

  ticketForm.addEventListener('submit', function (event) {
    event.preventDefault();
    const detail = $('detail');
    const text = detail.value.trim();
    const ok = text.length >= 10;
    ui.fieldError('f-detail', !ok);
    if (!ok) { detail.focus(); return; }

    const p = E.propertyById(unitSelect.value);
    const category = $('category').value;
    E.tickets.add(user.id, {
      title: category + ' \u2014 ' + (text.length > 40 ? text.slice(0, 40).trim() + '\u2026' : text),
      category: category,
      detail: text,
      propertyId: p.id,
      unit: p.unit
    });

    renderTickets();
    renderStats();
    ticketForm.reset();
    ui.notice(ticketNotice, 'Request submitted. You can follow its status under Maintenance.', true);
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(function () { ticketNotice.classList.remove('is-visible'); }, 5000);
  });

  /* ---- Go ---- */
  renderStats();
  renderGrid();
  renderRent();
  renderTickets();

})(window.Estate);
