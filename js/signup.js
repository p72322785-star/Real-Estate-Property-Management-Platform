/* signup.js — account creation page. Needs: data.js, store.js, ui.js */
(function (E) {
  'use strict';

  const ui = E.ui;
  E.pageReady = true;

  if (E.auth.current()) { location.replace('dashboard.html'); return; }

  const form = document.getElementById('signup');
  const notice = document.getElementById('formNotice');
  const password = document.getElementById('password');
  const meter = document.getElementById('meter');
  const strength = document.getElementById('strength');
  const phoneInput = document.getElementById('phone');

  ui.clearErrorsOnInput(form);
  ui.digitsOnly(phoneInput);

  if (!E.storageOk()) {
    ui.notice(notice, 'Your browser is blocking site storage, so accounts cannot be created. Turn off private mode or allow cookies for this site.');
  }

  /* Live password strength — three bands, described in words as well as colour. */
  const MESSAGES = [
    'At least 8 characters, with a number.',
    'Weak \u2014 add a few more characters.',
    'Fine. A symbol would make it stronger.',
    'Strong password.'
  ];
  password.addEventListener('input', function () {
    const v = password.value;
    let level = 0;
    if (v.length >= 8) level++;
    if (/\d/.test(v) && /[a-zA-Z]/.test(v)) level++;
    if (v.length >= 12 || /[^\w\s]/.test(v)) level++;
    if (v.length === 0) level = 0;
    meter.dataset.level = level;
    strength.textContent = MESSAGES[level];
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    notice.classList.remove('is-visible');

    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim().toLowerCase();
    const phone = E.fmt.digits(phoneInput.value);
    const pass = password.value;
    const confirm = document.getElementById('confirm').value;
    const terms = document.getElementById('terms').checked;
    const role = document.querySelector('input[name="role"]:checked').value;

    const checks = {
      'f-name': E.validate.name(name),
      'f-email': E.validate.email(email),
      'f-phone': E.validate.phone(phone),
      'f-password': E.validate.password(pass),
      'f-confirm': confirm.length > 0 && confirm === pass,
      'f-terms': terms
    };

    let valid = true;
    Object.keys(checks).forEach(function (id) {
      ui.fieldError(id, !checks[id]);
      if (!checks[id]) valid = false;
    });
    if (!valid) {
      const firstBad = document.querySelector('.field-error input');
      if (firstBad) firstBad.focus();
      return;
    }

    if (E.users.byEmail(email)) {
      ui.fieldError('f-email', true, 'An account already uses this email.');
      ui.notice(notice, 'An account already uses this email. Sign in instead.');
      document.getElementById('email').focus();
      return;
    }

    const user = E.users.create({ name: name, email: email, phone: phone, password: pass, role: role });
    E.session.start(user, true);
    location.href = 'dashboard.html';
  });

  /* Restore the default message if the email field is edited after a duplicate error. */
  document.getElementById('email').addEventListener('input', function () {
    const err = document.querySelector('#f-email .error');
    if (err) err.textContent = 'Enter a valid email address.';
  });

})(window.Estate);
