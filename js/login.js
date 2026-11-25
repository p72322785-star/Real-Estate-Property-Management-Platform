/* login.js — sign-in page. Needs: data.js, store.js, ui.js */
(function (E) {
  'use strict';

  const ui = E.ui;
  E.pageReady = true;     // lets the inline check in login.html know the scripts loaded
  const PAGES = ['dashboard.html', 'favorites.html', 'profile.html'];

  /* Where to go after signing in: the page that bounced them here, if valid. */
  function destination() {
    const next = new URLSearchParams(location.search).get('next');
    return PAGES.indexOf(next) !== -1 ? next : 'dashboard.html';
  }

  /* Already signed in? Skip the form. */
  if (E.auth.current()) { location.replace(destination()); return; }

  const form = document.getElementById('signin');
  const notice = document.getElementById('formNotice');
  const emailInput = document.getElementById('email');

  ui.clearErrorsOnInput(form);

  /* Bounced here by a page guard: say why, so it never looks like a silent reload. */
  if (new URLSearchParams(location.search).get('reason') === 'auth') {
    ui.notice(notice, 'Please sign in to continue. If you just signed in and ended up back here, your browser is not sharing storage between local files \u2014 open the site through a local server instead (see README).', false);
  }

  if (!E.storageOk()) {
    ui.notice(notice, 'Your browser is blocking site storage, so sign-in cannot work. Turn off private mode or allow cookies for this site.');
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    notice.classList.remove('is-visible');

    const email = emailInput.value.trim().toLowerCase();
    const password = document.getElementById('password').value;

    const emailOk = E.validate.email(email);
    const passOk = password.length > 0;
    ui.fieldError('f-email', !emailOk);
    ui.fieldError('f-password', !passOk);
    if (!emailOk || !passOk) {
      (emailOk ? document.getElementById('password') : emailInput).focus();
      return;
    }

    if (!E.storageOk()) {
      ui.notice(notice, 'Your browser is blocking site storage (private mode or strict cookie settings), so sign-in cannot work. Open the site in a normal window, or allow storage for it.');
      return;
    }

    const user = E.auth.login(email, password);
    if (!user) {
      ui.notice(notice, 'That email and password don\u2019t match an account. Check both and try again.');
      return;
    }

    E.session.start(user, document.getElementById('remember').checked);
    if (!E.auth.current()) {
      ui.notice(notice, 'Signed in, but the browser did not keep the session. Allow site storage, or open the site through a local server.');
      return;
    }
    location.href = destination();
  });

  /* ---- Forgot password ----
     Front-end only: there is no email service, so the reset happens right
     here for any account stored in this browser. */
  document.getElementById('forgot').addEventListener('click', function (event) {
    event.preventDefault();

    const body = document.createElement('div');
    body.innerHTML =
      '<p class="muted small">Enter the email on your account and choose a new password.</p>' +
      '<div class="field" id="r-email"><label for="rEmail">Email address</label>' +
        '<input type="email" id="rEmail" autocomplete="email">' +
        '<p class="error">No account uses this email.</p></div>' +
      '<div class="field" id="r-pass"><label for="rPass">New password</label>' +
        '<input type="password" id="rPass" autocomplete="new-password">' +
        '<p class="error">Password needs at least 8 characters and one number.</p></div>' +
      '<div class="field" id="r-confirm" style="margin-bottom:0"><label for="rConfirm">Confirm new password</label>' +
        '<input type="password" id="rConfirm" autocomplete="new-password">' +
        '<p class="error">Both passwords must match.</p></div>';
    ui.clearErrorsOnInput(body);
    body.querySelector('#rEmail').value = emailInput.value.trim();

    function submit(api) {
      const email = body.querySelector('#rEmail').value.trim().toLowerCase();
      const pass = body.querySelector('#rPass').value;
      const confirm = body.querySelector('#rConfirm').value;
      const found = E.validate.email(email) ? E.users.byEmail(email) : null;

      ui.fieldError('r-email', !found);
      ui.fieldError('r-pass', !E.validate.password(pass));
      ui.fieldError('r-confirm', pass !== confirm || !confirm);
      if (!found || !E.validate.password(pass) || pass !== confirm) return false;

      E.users.update(found.id, { password: pass });
      emailInput.value = email;
      document.getElementById('password').value = '';
      ui.notice(notice, 'Password updated. Sign in with your new password.', true);
      api.close();
    }

    const dlg = ui.dialog({
      title: 'Reset your password',
      content: body,
      buttons: [
        { label: 'Cancel', variant: 'quiet' },
        { label: 'Update password', onClick: function (api) { return submit(api); } }
      ]
    });
    body.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); if (submit(dlg) !== false) { /* closed */ } }
    });
  });

})(window.Estate);
