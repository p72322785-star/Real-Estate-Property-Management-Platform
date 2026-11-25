/* profile.js — needs: data.js, store.js, ui.js, shared.js */
(function (E) {
  'use strict';

  let user = E.boot();
  if (!user) return;

  const fmt = E.fmt;
  const ui = E.ui;
  const esc = ui.esc;
  const $ = function (id) { return document.getElementById(id); };

  const FIELDS = ['name', 'phone', 'email', 'city', 'address'];
  const NOTIFY_DEFAULTS = { rent: true, repairs: true, listings: false };
  const EMAIL_DEFAULT_ERROR = 'Enter a valid email address.';

  const form = $('profileForm');
  const notice = $('saveNotice');
  let noticeTimer;

  ui.clearErrorsOnInput(form);
  ui.digitsOnly($('phone'));

  /* ---- Lease card (right column) ---- */
  function fillLease() {
    const list = $('leaseFacts');
    const btn = $('viewAgreement');
    const lease = user.lease;
    const prop = lease && E.propertyById(lease.propertyId);

    if (!prop) {
      list.innerHTML = '<li><span class="k">No active lease is linked to this account yet.</span></li>';
      btn.hidden = true;
      return;
    }
    const next = E.rent.next(user);
    const rows = [
      ['Property', prop.unit + ', ' + prop.name],
      ['Lease period', fmt.monthShort(fmt.parseDate(lease.start)) + ' \u2013 ' + fmt.monthShort(fmt.parseDate(lease.end))],
      ['Monthly rent', fmt.money(prop.rent)],
      ['Security deposit', fmt.money(lease.deposit)],
      ['Next due date', next && !next.done ? fmt.date(next.due) : 'Paid in full'],
      ['Owner', lease.owner]
    ];
    list.innerHTML = rows.map(function (r) {
      return '<li><span class="k">' + esc(r[0]) + '</span><span class="v">' + esc(r[1]) + '</span></li>';
    }).join('');
    btn.hidden = false;
  }

  /* ---- Fill every part of the page from the current user ---- */
  function fill() {
    FIELDS.forEach(function (id) { $(id).value = user[id] || ''; });

    const notify = Object.assign({}, NOTIFY_DEFAULTS, user.notify);
    $('notifyRent').checked = notify.rent;
    $('notifyRepairs').checked = notify.repairs;
    $('notifyListings').checked = notify.listings;

    const role = E.ROLES[user.role] || 'Tenant';
    const joined = new Date(user.joined);
    const since = isNaN(joined) ? 'March 2026' : fmt.monthLong(joined);

    $('displayName').textContent = user.name;
    $('displayMeta').textContent = role + ' \u00B7 Member since ' + since;
    $('roleValue').textContent = role;
    $('bigAvatar').textContent = fmt.initials(user.name);
    $('favCount').textContent = E.favs.list(user.id).length;
    $('openCount').textContent = E.tickets.openCount(user.id);

    E.auth.paintRail(user);
    fillLease();
  }

  function clearErrors() {
    document.querySelectorAll('.field-error').forEach(function (f) { f.classList.remove('field-error'); });
    ui.fieldError('f-email', false, EMAIL_DEFAULT_ERROR);
  }

  /* ---- Save ---- */
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    clearErrors();

    const values = {};
    FIELDS.forEach(function (id) { values[id] = $(id).value.trim(); });
    values.phone = fmt.digits(values.phone);
    values.email = values.email.toLowerCase();

    const taken = E.users.byEmail(values.email);
    const emailTaken = taken && taken.id !== user.id;

    const checks = {
      'f-name': E.validate.name(values.name),
      'f-phone': E.validate.phone(values.phone),
      'f-email': E.validate.email(values.email) && !emailTaken
    };
    let valid = true;
    Object.keys(checks).forEach(function (id) {
      ui.fieldError(id, !checks[id]);
      if (!checks[id]) valid = false;
    });
    if (emailTaken) ui.fieldError('f-email', true, 'Another account already uses this email.');
    if (!valid) { document.querySelector('.field-error input').focus(); return; }

    user = E.users.update(user.id, Object.assign({}, values, {
      notify: {
        rent: $('notifyRent').checked,
        repairs: $('notifyRepairs').checked,
        listings: $('notifyListings').checked
      }
    }));

    fill();
    ui.notice(notice, 'Changes saved.', true);
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(function () { notice.classList.remove('is-visible'); }, 3200);
  });

  /* ---- Discard ---- */
  $('reset').addEventListener('click', function () {
    fill();
    clearErrors();
    notice.classList.remove('is-visible');
  });

  /* ---- Rental agreement: a summary of the lease, viewable and downloadable ---- */
  function agreementRows() {
    const lease = user.lease;
    const prop = E.propertyById(lease.propertyId);
    return [
      ['Tenant', user.name],
      ['Owner', lease.owner],
      ['Property', prop.unit + ', ' + prop.name + ', ' + prop.area],
      ['Lease period', fmt.date(fmt.parseDate(lease.start)) + ' to ' + fmt.date(fmt.parseDate(lease.end))],
      ['Monthly rent', fmt.money(prop.rent)],
      ['Rent due on', 'Day ' + lease.dueDay + ' of every month'],
      ['Security deposit', fmt.money(lease.deposit)]
    ];
  }

  $('viewAgreement').addEventListener('click', function () {
    if (!user.lease) return;
    const rows = agreementRows();
    const body = document.createElement('div');
    body.innerHTML =
      '<ul class="est-rows">' + rows.map(function (r) {
        return '<li><span class="k">' + esc(r[0]) + '</span><span class="v">' + esc(r[1]) + '</span></li>';
      }).join('') + '</ul>' +
      '<p class="small muted" style="margin:10px 0 0">This is a summary of the key terms. The signed agreement is held by the owner.</p>';

    ui.dialog({
      title: 'Rental agreement summary',
      content: body,
      buttons: [
        { label: 'Close', variant: 'quiet' },
        { label: 'Download summary', onClick: function () {
            const text = 'RENTAL AGREEMENT \u2014 SUMMARY OF KEY TERMS\n\n' +
              rows.map(function (r) { return r[0] + ': ' + r[1]; }).join('\n') + '\n';
            const a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
            a.download = 'rental-agreement-summary.txt';
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
        } }
      ]
    });
  });

  window.addEventListener('pageshow', function (e) { if (e.persisted) fill(); });

  fill();

})(window.Estate);
