/* ui.js — shared form feedback, dialogs and toast notifications. */
(function (E) {
  'use strict';

  const STYLE_ID = 'estate-ui-styles';
  let toastRegion;

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent =
      '.estate-dialog{width:min(520px,calc(100% - 32px));max-height:85vh;padding:0;border:1px solid #d4dce1;border-radius:10px;background:#fff;color:#0e2033;box-shadow:0 20px 60px rgba(14,32,51,.24)}' +
      '.estate-dialog::backdrop{background:rgba(14,32,51,.48)}' +
      '.estate-dialog-head,.estate-dialog-body,.estate-dialog-foot{padding:20px 24px}' +
      '.estate-dialog-head{border-bottom:1px solid #e6ecef}' +
      '.estate-dialog-head h2{margin:0;font:600 1.25rem/1.3 "Archivo","Segoe UI",sans-serif}' +
      '.estate-dialog-body{max-height:60vh;overflow:auto}' +
      '.estate-dialog-body>:last-child{margin-bottom:0}' +
      '.estate-dialog-foot{display:flex;justify-content:flex-end;gap:10px;border-top:1px solid #e6ecef}' +
      '.estate-toast-region{position:fixed;right:20px;bottom:20px;z-index:1000;display:grid;gap:10px;width:min(420px,calc(100% - 40px))}' +
      '.estate-toast{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:13px 16px;border-radius:8px;background:#0e2033;color:#fff;box-shadow:0 8px 26px rgba(14,32,51,.2)}' +
      '.estate-toast button{border:0;background:transparent;color:#a8e1d3;font:inherit;font-weight:600;cursor:pointer}' +
      '@media(max-width:480px){.estate-dialog-head,.estate-dialog-body,.estate-dialog-foot{padding:16px}.estate-toast-region{right:12px;bottom:12px;width:calc(100% - 24px)}}';
    document.head.appendChild(style);
  }

  function getToastRegion() {
    if (toastRegion && toastRegion.isConnected) return toastRegion;
    toastRegion = document.createElement('div');
    toastRegion.className = 'estate-toast-region';
    toastRegion.setAttribute('role', 'status');
    toastRegion.setAttribute('aria-live', 'polite');
    toastRegion.setAttribute('aria-relevant', 'additions');
    document.body.appendChild(toastRegion);
    return toastRegion;
  }

  function closeDialog(dialog) {
    if (dialog.open) dialog.close();
  }

  E.ui = {
    esc: function (value) {
      return String(value === null || value === undefined ? '' : value).replace(/[&<>"']/g, function (char) {
        return {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;'
        }[char];
      });
    },

    clearErrorsOnInput: function (root) {
      root.addEventListener('input', function (event) {
        const field = event.target.closest('.field-error');
        if (!field || !root.contains(field)) return;
        field.classList.remove('field-error');
        field.querySelectorAll('[aria-invalid="true"]').forEach(function (control) {
          control.setAttribute('aria-invalid', 'false');
        });
      });
    },

    digitsOnly: function (input) {
      input.addEventListener('input', function () {
        const digits = input.value.replace(/\D/g, '');
        if (input.value !== digits) input.value = digits;
      });
    },

    fieldError: function (id, invalid, message) {
      const field = document.getElementById(id);
      if (!field) return;
      field.classList.toggle('field-error', Boolean(invalid));
      field.querySelectorAll('input, select, textarea').forEach(function (control) {
        control.setAttribute('aria-invalid', String(Boolean(invalid)));
      });
      if (message) {
        const error = field.querySelector('.error');
        if (error) error.textContent = message;
      }
    },

    notice: function (element, message, success) {
      if (!element) return;
      element.textContent = message;
      element.classList.toggle('notice-ok', Boolean(success));
      element.classList.add('is-visible');
    },

    dialog: function (options) {
      installStyles();
      const previousFocus = document.activeElement;
      const dialog = document.createElement('dialog');
      dialog.className = 'estate-dialog';
      dialog.setAttribute('aria-labelledby', 'estate-dialog-title');

      const header = document.createElement('div');
      header.className = 'estate-dialog-head';
      const title = document.createElement('h2');
      title.id = 'estate-dialog-title';
      title.textContent = options.title || '';
      header.appendChild(title);

      const body = document.createElement('div');
      body.className = 'estate-dialog-body';
      if (options.content instanceof Node) body.appendChild(options.content);
      else body.textContent = String(options.content || '');

      const footer = document.createElement('div');
      footer.className = 'estate-dialog-foot';
      const api = {
        foot: footer,
        locked: false,
        close: function () { closeDialog(dialog); }
      };

      (options.buttons || []).forEach(function (definition) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn' + (definition.variant === 'quiet' ? ' btn-quiet' : '') +
          (definition.variant === 'danger' || definition.danger ? ' btn-danger' : '');
        button.textContent = definition.label;
        button.addEventListener('click', function () {
          if (api.locked) return;
          const result = definition.onClick ? definition.onClick(api, button) : undefined;
          if (result !== false) api.close();
        });
        footer.appendChild(button);
      });

      dialog.appendChild(header);
      dialog.appendChild(body);
      dialog.appendChild(footer);
      dialog.addEventListener('click', function (event) {
        if (event.target === dialog) api.close();
      });
      dialog.addEventListener('close', function () {
        dialog.remove();
        if (previousFocus && previousFocus.isConnected) previousFocus.focus();
      }, { once: true });

      document.body.appendChild(dialog);
      dialog.showModal();
      const firstButton = footer.querySelector('button');
      if (firstButton) firstButton.focus();
      return api;
    },

    confirm: function (options) {
      return new Promise(function (resolve) {
        let settled = false;
        function settle(answer) {
          if (settled) return;
          settled = true;
          resolve(answer);
        }
        const content = document.createElement('p');
        content.textContent = options.message || '';
        const api = E.ui.dialog({
          title: options.title || 'Please confirm',
          content: content,
          buttons: [
            { label: 'Cancel', variant: 'quiet', onClick: function () { settle(false); } },
            {
              label: options.confirmLabel || 'Confirm',
              variant: options.danger ? 'danger' : undefined,
              onClick: function () { settle(true); }
            }
          ]
        });
        const dialog = api.foot.closest('dialog');
        dialog.addEventListener('close', function () { settle(false); }, { once: true });
      });
    },

    toast: function (message, options) {
      installStyles();
      const region = getToastRegion();
      const toast = document.createElement('div');
      toast.className = 'estate-toast';
      const text = document.createElement('span');
      text.textContent = message;
      toast.appendChild(text);

      let timer;
      function dismiss() {
        clearTimeout(timer);
        toast.remove();
      }

      if (options && options.action) {
        const action = document.createElement('button');
        action.type = 'button';
        action.textContent = options.action.label;
        action.addEventListener('click', function () {
          dismiss();
          options.action.onClick();
        });
        toast.appendChild(action);
      }

      region.appendChild(toast);
      timer = setTimeout(dismiss, 6000);
      return dismiss;
    }
  };

})(window.Estate = window.Estate || {});
