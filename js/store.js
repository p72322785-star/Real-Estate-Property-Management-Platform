/* store.js — local persistence, demo data, users and session helpers. */
(function (E) {
  'use strict';

  const local = {
    getItem: function (key) { return window.localStorage.getItem(key); },
    setItem: function (key, value) { return window.localStorage.setItem(key, value); },
    removeItem: function (key) { return window.localStorage.removeItem(key); }
  };
  const session = {
    getItem: function (key) { return window.sessionStorage.getItem(key); },
    setItem: function (key, value) { return window.sessionStorage.setItem(key, value); },
    removeItem: function (key) { return window.sessionStorage.removeItem(key); }
  };

  function storageError(action, error) {
    const message = error && error.message ? ': ' + error.message : '';
    return new Error('Estate could not ' + action + ' browser storage' + message);
  }

  function readFrom(store, key, fallback) {
    let raw;
    try {
      raw = store.getItem(key);
    } catch (error) {
      throw storageError('read', error);
    }
    if (raw === null) return fallback;
    try {
      return JSON.parse(raw);
    } catch (error) {
      throw new Error('Estate storage contains invalid data for "' + key + '".');
    }
  }

  function writeTo(store, key, value) {
    try {
      store.setItem(key, JSON.stringify(value));
    } catch (error) {
      throw storageError('save', error);
    }
  }

  function removeFrom(store, key) {
    try {
      store.removeItem(key);
    } catch (error) {
      throw storageError('clear', error);
    }
  }

  function scopedKey(key, userId) {
    return key + ':' + userId;
  }

  function readList(key, userId) {
    const list = readFrom(local, scopedKey(key, userId), []);
    if (!Array.isArray(list)) throw new Error('Estate storage list "' + key + '" is invalid.');
    return list;
  }

  function writeList(key, userId, list) {
    writeTo(local, scopedKey(key, userId), list);
  }

  function seedDemoData(demo) {
    const ticketKey = scopedKey(E.KEYS.tickets, demo.id);
    if (readFrom(local, ticketKey, null) === null) {
      writeTo(local, ticketKey, [{
        id: 'demo-ticket-1',
        title: 'Plumbing — kitchen tap is leaking',
        category: 'Plumbing',
        detail: 'The kitchen tap continues to leak after being turned off.',
        propertyId: demo.lease.propertyId,
        unit: 'Flat 402',
        state: 'open',
        createdAt: Date.now() - 2 * 864e5
      }]);
    }

    const paymentKey = scopedKey(E.KEYS.payments, demo.id);
    if (readFrom(local, paymentKey, null) === null) {
      const previousMonth = new Date();
      previousMonth.setDate(1);
      previousMonth.setMonth(previousMonth.getMonth() - 1);
      const month = previousMonth.getFullYear() + '-' +
        String(previousMonth.getMonth() + 1).padStart(2, '0');
      writeTo(local, paymentKey, [{
        id: 'demo-payment-1',
        month: month,
        amount: 18500,
        method: 'UPI',
        ref: 'ESTDEMO1',
        at: new Date(previousMonth.getFullYear(), previousMonth.getMonth(), 5).toISOString()
      }]);
    }
  }

  function seedDemo() {
    const storedUsers = readFrom(local, E.KEYS.users, []);
    if (!Array.isArray(storedUsers)) throw new Error('Estate user storage is invalid.');

    if (storedUsers.length) {
      let changed = false;
      const users = storedUsers.map(function (user) {
        if (!user || typeof user !== 'object' || Array.isArray(user)) {
          throw new Error('Estate user storage contains an invalid account.');
        }
        const email = String(user.email || '').trim().toLowerCase();
        const isDemo = email === E.DEMO_USER.email;
        const id = user.id || (isDemo ? 'demo' : uniqueId('usr_'));
        const updated = Object.assign(
          {},
          isDemo ? E.DEMO_USER : { city: '', address: '', lease: null },
          user,
          {
            id: id,
            email: email,
            lease: user.lease || (isDemo ? E.DEMO_USER.lease : null)
          }
        );
        if (updated.id !== user.id || updated.email !== user.email || updated.lease !== user.lease) {
          changed = true;
        }
        return updated;
      });
      if (changed) writeTo(local, E.KEYS.users, users);
      const demo = users.find(function (user) { return user.email === E.DEMO_USER.email; });
      if (demo) seedDemoData(demo);
      return users;
    }

    const demo = Object.assign({}, E.DEMO_USER, {
      id: 'demo',
      notify: { rent: true, repairs: true, listings: false }
    });
    writeTo(local, E.KEYS.users, [demo]);
    seedDemoData(demo);
    return [demo];
  }

  function users() {
    return seedDemo();
  }

  function userById(id) {
    return users().find(function (user) { return user.id === id; }) || null;
  }

  function uniqueId(prefix) {
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  E.storageOk = function () {
    const key = '__estate_storage_test__';
    try {
      local.setItem(key, '1');
      local.removeItem(key);
      session.setItem(key, '1');
      session.removeItem(key);
      return true;
    } catch (error) {
      try { local.removeItem(key); } catch (ignored) {}
      try { session.removeItem(key); } catch (ignored) {}
      return false;
    }
  };

  E.users = {
    list: users,

    byEmail: function (email) {
      const normalized = String(email || '').trim().toLowerCase();
      return users().find(function (user) {
        return String(user.email).toLowerCase() === normalized;
      }) || null;
    },

    create: function (details) {
      const list = users();
      const email = String(details.email || '').trim().toLowerCase();
      if (list.some(function (user) { return String(user.email).toLowerCase() === email; })) {
        throw new Error('An account already uses this email address.');
      }
      const user = Object.assign({
        id: uniqueId('usr_'),
        city: '',
        address: '',
        joined: new Date().toISOString(),
        lease: null,
        notify: { rent: true, repairs: true, listings: false }
      }, details, { email: email });
      writeTo(local, E.KEYS.users, list.concat(user));
      return user;
    },

    update: function (id, changes) {
      const list = users();
      const index = list.findIndex(function (user) { return user.id === id; });
      if (index === -1) throw new Error('Estate could not find this user account.');
      const email = changes.email === undefined
        ? list[index].email
        : String(changes.email).trim().toLowerCase();
      if (list.some(function (user) { return user.id !== id && String(user.email).toLowerCase() === email; })) {
        throw new Error('Another account already uses this email address.');
      }
      const updated = Object.assign({}, list[index], changes, { id: id, email: email });
      list[index] = updated;
      writeTo(local, E.KEYS.users, list);
      return updated;
    }
  };

  E.session = {
    start: function (user, remember) {
      if (!user || !user.id) throw new Error('A valid user is required to start a session.');
      removeFrom(local, E.KEYS.session);
      removeFrom(session, E.KEYS.session);
      writeTo(remember ? local : session, E.KEYS.session, { userId: user.id });
    }
  };

  E.auth = {
    login: function (email, password) {
      const user = E.users.byEmail(email);
      return user && user.password === password ? user : null;
    },

    current: function () {
      if (!E.storageOk()) return null;
      const stored = readFrom(local, E.KEYS.session, null) ||
        readFrom(session, E.KEYS.session, null);
      return stored && stored.userId ? userById(stored.userId) : null;
    },

    require: function () {
      const user = E.auth.current();
      if (user) return user;
      const page = location.pathname.split('/').pop();
      const allowed = ['dashboard.html', 'favorites.html', 'profile.html'];
      const next = allowed.indexOf(page) !== -1 ? page : 'dashboard.html';
      location.replace('login.html?reason=auth&next=' + encodeURIComponent(next));
      return null;
    },

    signOut: function () {
      removeFrom(local, E.KEYS.session);
      removeFrom(session, E.KEYS.session);
      location.href = 'login.html';
    },

    paintRail: function (user) {
      const avatar = document.getElementById('railAvatar');
      const name = document.getElementById('railName');
      const role = document.getElementById('railRole');
      if (avatar) avatar.textContent = E.fmt.initials(user.name);
      if (name) name.textContent = user.name;
      if (role) role.textContent = E.ROLES[user.role] || 'Tenant';
    },

    adoptLegacyFavs: function (user) {
      const key = scopedKey(E.KEYS.favs, user.id);
      if (readFrom(local, key, null) !== null) return;
      const legacy = readFrom(local, E.KEYS.favs, null);
      if (legacy === null) return;
      if (Array.isArray(legacy)) {
        writeTo(local, key, legacy);
      } else if (legacy && typeof legacy === 'object') {
        Object.keys(legacy).forEach(function (id) {
          if (Array.isArray(legacy[id])) writeTo(local, scopedKey(E.KEYS.favs, id), legacy[id]);
        });
      } else {
        throw new Error('Legacy saved-property data is invalid.');
      }
      removeFrom(local, E.KEYS.favs);
    }
  };

  E.favs = {
    list: function (userId) {
      const list = readList(E.KEYS.favs, userId);
      return list.filter(function (id, index) {
        return typeof id === 'string' && list.indexOf(id) === index;
      });
    },

    set: function (userId, ids) {
      if (!Array.isArray(ids)) throw new Error('Saved properties must be a list.');
      const unique = ids.filter(function (id, index) {
        return typeof id === 'string' && ids.indexOf(id) === index;
      });
      writeList(E.KEYS.favs, userId, unique);
      return unique;
    },

    toggle: function (userId, propertyId) {
      const list = E.favs.list(userId);
      const index = list.indexOf(propertyId);
      if (index === -1) list.push(propertyId);
      else list.splice(index, 1);
      E.favs.set(userId, list);
      return index === -1;
    }
  };

  E.tickets = {
    list: function (userId) {
      return readList(E.KEYS.tickets, userId).slice().sort(function (a, b) {
        return b.createdAt - a.createdAt;
      });
    },

    openCount: function (userId) {
      return E.tickets.list(userId).filter(function (ticket) {
        return ticket.state !== 'closed';
      }).length;
    },

    add: function (userId, details) {
      const list = readList(E.KEYS.tickets, userId);
      const ticket = Object.assign({
        id: uniqueId('ticket_'),
        state: 'open',
        createdAt: Date.now()
      }, details);
      list.push(ticket);
      writeList(E.KEYS.tickets, userId, list);
      return ticket;
    },

    setState: function (userId, ticketId, state) {
      const list = readList(E.KEYS.tickets, userId);
      const ticket = list.find(function (item) { return item.id === ticketId; });
      if (!ticket) return null;
      ticket.state = state;
      writeList(E.KEYS.tickets, userId, list);
      return ticket;
    }
  };

  E.payments = {
    list: function (userId) {
      return readList(E.KEYS.payments, userId);
    },

    add: function (userId, payment) {
      const list = readList(E.KEYS.payments, userId);
      const existing = list.find(function (item) { return item.month === payment.month; });
      if (existing) return existing;
      list.push(payment);
      writeList(E.KEYS.payments, userId, list);
      return payment;
    }
  };

})(window.Estate = window.Estate || {});
