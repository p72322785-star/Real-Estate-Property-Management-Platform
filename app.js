(() => {
  'use strict';
  const homes = [
    ['modern-family-villa','Modern Family Villa','Sector 44, Noida','villa',4,'2,450',18500000,'₹1.85 Cr','For sale','photo-1600596542815-ffad4c1539a9','Designed for the way families live, with generous light and a private garden.'],
    ['aria-sale','The Aria Residences','Sector 150, Noida','apartment',3,'1,680',12500000,'₹1.25 Cr','For sale','photo-1600607687939-ce8a6c25118c','A calm, contemporary apartment in a well-connected, thoughtfully planned community.'],
    ['skyline-penthouse','Skyline Penthouse','Sector 128, Noida','apartment',4,'2,800',24800000,'₹2.48 Cr','For sale','photo-1600566753086-00f18fb6b3ea','Open-plan living, considered finishes and wide views from every room.'],
    ['olive-grove','Olive Grove Apartment','Sector 75, Noida','apartment',2,'1,250',8900000,'₹89 Lakh','For sale','photo-1600566753190-17f0baa2a6c3','An easy-to-love city home with beautiful natural light and everyday convenience.'],
    ['ridge-house','The Ridge House','Tajganj, Agra','house',3,'2,050',9800000,'₹98 Lakh','For sale','photo-1600047509807-ba8f99d2cdde','A warm, spacious home in a friendly neighbourhood with room to grow.'],
    ['maple-court','Maple Court','Sector 137, Noida','apartment',2,'1,180',7600000,'₹76 Lakh','For sale','photo-1600210492486-724fe5c67fb0','A smartly designed home with inviting shared spaces and a convenient address.'],
    ['garden-house','Garden House','Shamshabad Road, Agra','house',3,'2,100',42000,'₹42,000 / mo','For rent','photo-1600047509807-ba8f99d2cdde','A welcoming, light-filled home with room to slow down and settle in.'],
    ['courtyard-home','The Courtyard Home','Dayal Bagh, Agra','house',3,'1,950',36000,'₹36,000 / mo','For rent','photo-1600210492486-724fe5c67fb0','A peaceful home with a sunlit courtyard and all the essentials close by.'],
    ['aria-rent','The Aria Residences','Sector 150, Noida','apartment',3,'1,680',38500,'₹38,500 / mo','For rent','photo-1600607687939-ce8a6c25118c','A calm, contemporary apartment in a well-connected, thoughtfully planned community.'],
    ['parkside-studio','Parkside Studio','Sector 62, Noida','apartment',1,'720',22000,'₹22,000 / mo','For rent','photo-1600566753190-17f0baa2a6c3','A bright, low-maintenance space with cafes, transit and green space nearby.'],
    ['willow-lane','Willow Lane Villa','Sector 46, Noida','villa',4,'2,600',58000,'₹58,000 / mo','For rent','photo-1600596542815-ffad4c1539a9','Generous rooms, a leafy outlook and space for the whole family to feel at home.'],
    ['riverside-apartment','Riverside Apartment','Civil Lines, Agra','apartment',2,'1,150',28000,'₹28,000 / mo','For rent','photo-1600566753086-00f18fb6b3ea','An easy, airy apartment with a welcoming feel and a lovely neighbourhood setting.']
  ].map(([id,name,location,type,beds,area,amount,priceLabel,status,image,description]) => ({id,name,location,type,beds,area,amount,priceLabel,status,image,description}));

  const page = document.body.dataset.page || 'explore';
  const grid = document.getElementById('propertyGrid');
  const form = document.getElementById('searchForm');
  const toast = document.getElementById('toast');
  const fields = { location:document.getElementById('location'), kind:document.getElementById('kind'), beds:document.getElementById('beds'), budget:document.getElementById('budget') };
  let toastTimer;
  let saved = new Set();
  try { saved = new Set(JSON.parse(localStorage.getItem('estatehub-saved') || '[]')); } catch (_) { /* Storage is optional. */ }
  const imageUrl = id => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1000&q=84`;
  const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const pageHomes = () => homes.filter(home => page === 'buy' ? home.status === 'For sale' : page === 'rent' ? home.status === 'For rent' : true);

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
  }
  function cardMarkup(home, index) {
    const type = `${home.type[0].toUpperCase()}${home.type.slice(1)}`;
    const isSaved = saved.has(home.id);
    return `<article class="property-card" style="animation-delay:${index * 45}ms"><div class="property-image"><img src="${imageUrl(home.image)}" alt="${escapeHTML(home.name)} in ${escapeHTML(home.location)}" loading="lazy"><span class="badge">${home.status}</span><button class="favorite" type="button" data-save="${home.id}" aria-label="${isSaved ? 'Remove' : 'Save'} ${escapeHTML(home.name)}" aria-pressed="${isSaved}">${isSaved ? '♥' : '♡'}</button></div><div class="property-content"><p class="property-type">${type}</p><div class="property-title-row"><h3>${escapeHTML(home.name)}</h3><span class="price">${home.priceLabel}</span></div><p class="location"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>${escapeHTML(home.location)}</p><div class="card-meta"><span><b class="meta-icon">●</b>${home.beds} bedrooms</span><span><b class="meta-icon">□</b>${home.area} sq ft</span></div><button class="card-details" type="button" data-details="${home.id}">View details <span aria-hidden="true">→</span></button></div></article>`;
  }
  function addTools() {
    const target = document.getElementById('resultCount');
    const tools = document.createElement('div');
    tools.className = 'listing-tools';
    tools.innerHTML = `<p class="result-count" id="resultCount" aria-live="polite"></p><select class="sort-select" id="sortHomes" aria-label="Sort homes"><option value="featured">Featured</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option><option value="beds">Most bedrooms</option></select>`;
    target.replaceWith(tools);
    tools.querySelector('#sortHomes').addEventListener('change', renderHomes);
  }
  function renderHomes() {
    const query = fields.location.value.trim().toLowerCase();
    const kind = fields.kind.value;
    const minBeds = Number(fields.beds.value || 0);
    const maxPrice = Number(fields.budget.value || 0);
    const sort = document.getElementById('sortHomes').value;
    let visible = pageHomes().filter(home => {
      const text = `${home.name} ${home.location} ${home.description}`.toLowerCase();
      const matchesKind = !kind || (page === 'explore' ? home.status === kind : home.type === kind);
      return (!query || text.includes(query)) && matchesKind && home.beds >= minBeds && (!maxPrice || home.amount <= maxPrice);
    });
    if (sort === 'low') visible.sort((a,b) => a.amount - b.amount);
    if (sort === 'high') visible.sort((a,b) => b.amount - a.amount);
    if (sort === 'beds') visible.sort((a,b) => b.beds - a.beds || a.amount - b.amount);
    grid.innerHTML = visible.length ? visible.map(cardMarkup).join('') : '<div class="empty-state"><strong>No homes found just yet.</strong>Try a different location or loosen your filters.<br><button type="button" id="resetFilters">Clear filters</button></div>';
    document.getElementById('resultCount').innerHTML = `<strong>${visible.length}</strong> ${visible.length === 1 ? 'home' : 'homes'} to explore`;
  }
  function openDialog(home) {
    let dialog = document.getElementById('propertyDialog');
    if (!dialog) { dialog = document.createElement('dialog'); dialog.id = 'propertyDialog'; dialog.className = 'property-dialog'; document.body.append(dialog); dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); }); dialog.addEventListener('close', () => document.body.classList.remove('modal-open')); }
    dialog.innerHTML = `<div class="dialog-content"><img src="${imageUrl(home.image)}" alt="${escapeHTML(home.name)}"><div class="dialog-copy"><button class="dialog-close" type="button" aria-label="Close details">×</button><p class="property-type">${home.status} · ${home.type}</p><h2>${escapeHTML(home.name)}</h2><span class="price">${home.priceLabel}</span><p class="location">${escapeHTML(home.location)}</p><p>${escapeHTML(home.description)}</p><div class="dialog-details"><span>${home.beds} bedrooms</span><span>${home.area} sq ft</span><span>Verified listing</span></div><button class="view-button" type="button">Ask about this home →</button></div></div>`;
    dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
    dialog.querySelector('.view-button').addEventListener('click', () => { dialog.close(); showToast(`An advisor will help with ${home.name}.`); });
    dialog.showModal(); document.body.classList.add('modal-open');
  }
  addTools();
  form.addEventListener('submit', event => { event.preventDefault(); renderHomes(); document.getElementById('listings').scrollIntoView({behavior:'smooth',block:'start'}); });
  Object.values(fields).forEach(field => field.addEventListener(field.tagName === 'SELECT' ? 'change' : 'input', renderHomes));
  grid.addEventListener('click', event => {
    const saveButton = event.target.closest('[data-save]'); const detailsButton = event.target.closest('[data-details]');
    if (saveButton) { const id = saveButton.dataset.save; if (saved.has(id)) { saved.delete(id); showToast('Removed from saved homes'); } else { saved.add(id); showToast('Saved to your favourites'); } try { localStorage.setItem('estatehub-saved', JSON.stringify([...saved])); } catch (_) { /* Storage is optional. */ } renderHomes(); }
    if (detailsButton) openDialog(homes.find(home => home.id === detailsButton.dataset.details));
    if (event.target.closest('#resetFilters')) { form.reset(); renderHomes(); }
  });
  const menuToggle = document.getElementById('menuToggle');
  menuToggle.addEventListener('click', event => { const menu = document.getElementById('navLinks'); const open = menu.classList.toggle('open'); event.currentTarget.setAttribute('aria-expanded', String(open)); event.currentTarget.textContent = open ? '×' : '☰'; });
  renderHomes();
})();
