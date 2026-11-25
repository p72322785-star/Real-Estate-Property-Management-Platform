/* ==========================================================================
   data.js — constants, the property catalogue, demo account, formatters.
   Loaded first on every page. Everything hangs off one global: window.Estate.
   (Plain scripts instead of ES modules, so the site also works when you
   just double-click the HTML files — modules are blocked on file://.)
   ========================================================================== */
(function (E) {
  'use strict';

  E.KEYS = {
    users:    'estate_users',
    session:  'estate_session',
    favs:     'estate_favs',      // stored per user:  estate_favs:<userId>
    tickets:  'estate_tickets',   // stored per user
    payments: 'estate_payments'   // stored per user
  };

  E.ROLES = { tenant: 'Tenant', owner: 'Property owner', admin: 'Administrator' };

  /* One catalogue shared by the dashboard, favourites and profile pages.
     When a backend exists, replace this with a fetch(). */
  E.PROPERTIES = [
    { id: 'p1', name: 'Shanti Residency', unit: 'Flat 402', area: 'Krishna Nagar, Mathura',
      type: 'residential', status: 'let', rent: 18500, beds: 3, baths: 2, size: '1,180 sq ft', furnished: true },
    { id: 'p2', name: 'Krishna Plaza', unit: 'Shop 7', area: 'Masani Road, Mathura',
      type: 'commercial', status: 'available', rent: 42000, size: '640 sq ft', frontage: 'Main road', furnished: false },
    { id: 'p3', name: 'Yamuna Heights', unit: 'Flat 106', area: 'Govardhan Road, Mathura',
      type: 'residential', status: 'available', rent: 14000, beds: 2, baths: 2, size: '890 sq ft', furnished: true },
    { id: 'p4', name: 'Vrindavan Greens', unit: 'Villa 12', area: 'Chhatikara, Vrindavan',
      type: 'residential', status: 'available', rent: 36000, beds: 4, baths: 3, size: '2,150 sq ft', furnished: false },
    { id: 'p5', name: 'Radha Business Hub', unit: 'Office 3B', area: 'NH-19 Bypass, Mathura',
      type: 'commercial', status: 'available', rent: 55000, size: '1,400 sq ft', frontage: 'Second floor', furnished: true },
    { id: 'p6', name: 'Gokul Enclave', unit: 'Flat 8', area: 'Gokul, Mathura',
      type: 'residential', status: 'let', rent: 11500, beds: 2, baths: 1, size: '720 sq ft', furnished: false }
  ];

  E.propertyById = function (id) {
    return E.PROPERTIES.find(function (p) { return p.id === id; }) || null;
  };

  /* Demo account shown on the login page. It is the only account that
     starts with a lease, repair tickets and payment history. */
  E.DEMO_USER = {
    name: 'Rishabh Singh',
    email: 'tenant@estate.in',
    phone: '9876543210',
    password: 'estate123',
    role: 'tenant',
    city: 'Mathura',
    address: '',
    joined: '2026-03-12T00:00:00.000Z',
    lease: {
      propertyId: 'p1',
      start: '2026-04-01',
      end: '2027-03-31',
      dueDay: 5,
      deposit: 55500,
      owner: 'Praveen S. Tomar'
    }
  };

  /* ---- Formatting ---- */
  const plural = function (n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); };

  E.fmt = {
    money: function (n) { return '\u20B9' + Number(n).toLocaleString('en-IN'); },

    date: function (d) {
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    },
    monthName: function (d) { return d.toLocaleDateString('en-IN', { month: 'long' }); },
    monthLong: function (d) { return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }); },
    monthShort: function (d) { return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }); },

    /* 'YYYY-MM-DD' -> local Date (new Date('2026-04-01') would be UTC) */
    parseDate: function (s) {
      const p = String(s).split('-').map(Number);
      return new Date(p[0], p[1] - 1, p[2]);
    },

    initials: function (name) {
      return String(name || '').split(' ').filter(Boolean)
        .map(function (p) { return p[0]; }).join('').slice(0, 2).toUpperCase() || '?';
    },

    digits: function (s) { return String(s || '').replace(/\D/g, ''); },

    plural: plural,

    ago: function (ts) {
      const mins = Math.floor((Date.now() - ts) / 60000);
      if (mins < 1) return 'just now';
      if (mins < 60) return plural(mins, 'minute') + ' ago';
      const hours = Math.floor(mins / 60);
      if (hours < 24) return plural(hours, 'hour') + ' ago';
      const days = Math.floor(hours / 24);
      if (days < 14) return plural(days, 'day') + ' ago';
      if (days < 60) return plural(Math.floor(days / 7), 'week') + ' ago';
      return 'on ' + E.fmt.date(new Date(ts));
    }
  };

  /* ---- Validation (same rules on signup, profile and password reset) ---- */
  E.validate = {
    name:     function (v) { return String(v).trim().length >= 3; },
    email:    function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim()); },
    phone:    function (v) { return /^[6-9]\d{9}$/.test(E.fmt.digits(v)); },
    password: function (v) { return v.length >= 8 && /\d/.test(v); }
  };

})(window.Estate = window.Estate || {});
