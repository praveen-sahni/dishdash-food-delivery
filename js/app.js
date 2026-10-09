import { dishes, FREE_DELIVERY_THRESHOLD } from './data.js';
import { calcBreakup, formatINR as format, isValidEmail, isValidPhone, normalizePromo, resolvePromo } from './pricing.js';

const CART_KEY = 'dishdash-cart-v1';
const LOCATION_KEY = 'dishdash-location-v1';
const PROMO_KEY = 'dishdash-promo-v1';
const ORDER_KEY = 'dishdash-last-order-v1';
const ORDERS_KEY = 'dishdash-orders-v1';
const FAV_KEY = 'dishdash-favs-v1';
const THEME_KEY = 'dishdash-theme-v1';
const ADDR_KEY = 'dishdash-addrs-v1';
const REVIEWS_KEY = 'dishdash-reviews-v1';
const REF_KEY = 'dishdash-ref-v1';
const NL_KEY = 'dishdash-newsletter-v1';

const SLOTS = [
  { id: 'asap', label: 'ASAP · 25–30 min' },
  { id: 'tonight', label: 'Tonight · 7–8 pm' },
  { id: 'tomorrow', label: 'Tomorrow · 12–1 pm' }
];

let activeCategory = 'All';
let query = '';
let sortBy = 'featured';
let vegOnly = false;
let cart = [];
let promoCode = null;
let favs = new Set();
let trackTimers = [];
let skelTimer = null;
let lastFocusedBeforeCart = null;
let toastTimer = null;
let searchDebounce = null;

const $ = sel => document.querySelector(sel);
const grid = $('#food-grid');
const resultsCount = $('#results-count');
const filtersEl = $('#filters');
const sortSelect = $('#sort-select');
const vegCheckbox = $('#veg-only');
const cartEl = $('#cart');
const overlayEl = $('#overlay');
const cartItemsEl = $('#cart-items');
const cartCountEl = $('#cart-count');
const cartSubtotalEl = $('#cart-subtotal');
const cartDiscountRow = $('#discount-row');
const cartDiscountEl = $('#cart-discount');
const cartDeliveryEl = $('#cart-delivery');
const cartTaxEl = $('#cart-tax');
const cartTotalEl = $('#cart-total');
const checkoutBtn = $('#checkout');
const clearCartBtn = $('#clear-cart');
const cartButton = $('#cart-button');
const closeCartBtn = $('#close-cart');
const freeDeliveryEl = $('#free-delivery');
const promoForm = $('#promo-form');
const promoInput = $('#promo-input');
const promoMsg = $('#promo-msg');
const navEl = $('#nav');
const menuButton = $('#menu-button');
const searchForm = $('#search-form');
const searchInput = $('#search-input');
const toastEl = $('#toast');
const locationLabel = $('#location-label');
const locationDialog = $('#location-dialog');
const locationForm = $('#location-form');
const locationInput = $('#location-input');
const locationCancel = $('#location-cancel');
const checkoutDialog = $('#checkout-dialog');
const checkoutForm = $('#checkout-form');
const checkoutSummary = $('#checkout-summary');
const orderConfirm = $('#order-confirm');
const newsletterForm = $('#newsletter-form');
const stickyBar = $('#sticky-bar');
const dishDialog = $('#dish-dialog');
const dishContent = $('#dish-content');
const ordersList = $('#orders-list');
const reviewsGrid = $('#reviews-grid');
const reviewForm = $('#review-form');

const escapeHtml = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// --- Theme ---
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
  const btn = $('#theme-toggle');
  if (btn) {
    btn.textContent = theme === 'dark' ? '☀️' : '🌙';
    btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = theme === 'dark' ? '#121210' : '#202019';
}

// --- Filtering ---
function getFilteredDishes() {
  const q = query.trim().toLowerCase();
  let list = dishes.filter(dish => {
    const matchesCategory = activeCategory === 'All' ? true : activeCategory === 'Popular' ? dish.popular : activeCategory === 'Saved' ? favs.has(dish.id) : dish.category === activeCategory;
    if (!matchesCategory) return false;
    if (vegOnly && !dish.veg) return false;
    if (!q) return true;
    return `${dish.name} ${dish.cuisine} ${dish.category} ${dish.desc}`.toLowerCase().includes(q);
  });
  const by = {
    'price-asc': (a, b) => a.price - b.price,
    'price-desc': (a, b) => b.price - a.price,
    rating: (a, b) => parseFloat(b.rating) - parseFloat(a.rating),
    time: (a, b) => a.timeMin - b.timeMin
  }[sortBy];
  if (by) list = [...list].sort(by);
  else if (sortBy === 'featured') list = [...list].sort((a, b) => Number(b.popular) - Number(a.popular));
  return list;
}

function syncFilterButtons() {
  const counts = { All: dishes.length, Popular: dishes.filter(d => d.popular).length, Saved: favs.size };
  dishes.forEach(d => { counts[d.category] = (counts[d.category] || 0) + 1; });
  filtersEl.querySelectorAll('button').forEach(button => {
    const cat = button.dataset.category;
    const isActive = cat === activeCategory;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
    const base = button.textContent.replace(/\s*\(\d+\)\s*$/, '');
    if (counts[cat] != null) button.textContent = `${base} (${counts[cat]})`;
  });
}

function stars(rating) {
  const full = Math.round(parseFloat(rating));
  return '★'.repeat(full) + '☆'.repeat(5 - full);
}

function cartQty(id) {
  const item = cart.find(i => i.id === id);
  return item ? item.qty : 0;
}

function cardControlHtml(dish) {
  const qty = cartQty(dish.id);
  if (qty === 0) return `<button type="button" class="add-button" data-action="add" data-id="${dish.id}" aria-label="Add ${escapeHtml(dish.name)} to bag">Add +</button>`;
  return `<div class="card-stepper" role="group" aria-label="Quantity for ${escapeHtml(dish.name)}">
    <button type="button" data-action="decrease" data-id="${dish.id}" aria-label="Remove one ${escapeHtml(dish.name)}">−</button>
    <strong aria-live="polite">${qty}</strong>
    <button type="button" data-action="increase" data-id="${dish.id}" aria-label="Add one ${escapeHtml(dish.name)}">+</button>
  </div>`;
}

function dishImg(dish, cls = '') {
  return `<img class="dish-photo ${cls}" src="${escapeHtml(dish.img)}" alt="${escapeHtml(dish.name)}" loading="lazy" width="640" height="400" onerror="this.remove()" />`;
}

function updateCardControl(id) {
  const dish = dishes.find(d => d.id === id);
  if (!dish) return;
  const btn = grid.querySelector(`[data-id="${id}"]`);
  if (!btn) return;
  const row = btn.closest('.price-row');
  if (!row) return;
  const focusedAction = document.activeElement?.dataset?.action;
  row.innerHTML = `<strong>${format(dish.price)}</strong>${cardControlHtml(dish)}`;
  if (focusedAction && focusedAction !== 'add') {
    const next = row.querySelector(`[data-action="${focusedAction}"]`);
    if (next) { try { next.focus({ preventScroll: true }); } catch (e) { next.focus(); } }
  }
}

function renderSkeleton() {
  grid.setAttribute('aria-busy', 'true');
  grid.innerHTML = Array.from({ length: 8 }, () => '<article class="food-card skeleton" aria-hidden="true"><div class="food-image shimmer"></div><div class="card-info"><div class="shimmer-line"></div><div class="shimmer-line short"></div></div></article>').join('');
}

function withSkeleton(render) {
  renderSkeleton();
  clearTimeout(skelTimer);
  skelTimer = setTimeout(() => { render(); }, 180);
}

function renderDishes() {
  const list = getFilteredDishes();
  const parts = [];
  if (query.trim()) parts.push(`${list.length} result${list.length === 1 ? '' : 's'} for “${query.trim()}”`);
  if (activeCategory !== 'All') parts.push(activeCategory);
  if (vegOnly) parts.push('Veg');
  resultsCount.textContent = parts.length ? parts.join(' · ') : `${list.length} dishes`;
  grid.setAttribute('aria-busy', 'false');

  if (!list.length) {
    const hint = activeCategory === 'Saved' ? 'Tap the ♥ on any dish to save it here.' : 'Try another craving!';
    grid.innerHTML = `<div class="empty-state"><p>No dishes found. ${hint}</p><button type="button" id="reset-filters" class="text-button">Clear search &amp; filters</button></div>`;
    grid.querySelector('#reset-filters').addEventListener('click', resetAll);
    return;
  }
  grid.innerHTML = list.map(dish => {
    const saved = favs.has(dish.id);
    const badge = dish.rating === '4.9' ? '<span class="badge">★ Chef’s pick</span>' : dish.popular ? '<span class="badge">Popular</span>' : '';
    return `
    <article class="food-card">
      <div class="food-image" data-action="view" data-id="${dish.id}" role="button" tabindex="0" aria-label="View ${escapeHtml(dish.name)}" style="background:linear-gradient(135deg, ${escapeHtml(dish.color)}, #ffffff)">
        ${dishImg(dish)}
        <span class="veg-dot ${dish.veg ? 'veg' : 'nonveg'}" role="img" aria-label="${dish.veg ? 'Veg' : 'Non-veg'}"></span>
        ${badge}
        <button type="button" class="fav-button" data-action="fav" data-id="${dish.id}" aria-pressed="${saved}" aria-label="${saved ? 'Remove' : 'Save'} ${escapeHtml(dish.name)}">${saved ? '♥ Saved' : '♡ Save'}</button>
      </div>
      <div class="card-info">
        <span class="tag">${escapeHtml(dish.cuisine)} · ${escapeHtml(dish.time)}</span>
        <h3><button type="button" data-action="view" data-id="${dish.id}">${escapeHtml(dish.name)}</button></h3>
        <p class="desc">${escapeHtml(dish.desc)}</p>
        <div class="meta"><span title="Rated ${escapeHtml(dish.rating)} out of 5"><span class="stars" aria-hidden="true">${stars(dish.rating)}</span> ${escapeHtml(dish.rating)}</span></div>
        <div class="price-row"><strong>${format(dish.price)}</strong>${cardControlHtml(dish)}</div>
      </div>
    </article>`;
  }).join('');
}

function resetAll() {
  activeCategory = 'All';
  query = '';
  vegOnly = false;
  sortBy = 'featured';
  searchInput.value = '';
  vegCheckbox.checked = false;
  sortSelect.value = 'featured';
  syncFilterButtons();
  renderDishes();
}

// --- Favorites ---
function saveFavs() {
  try { localStorage.setItem(FAV_KEY, JSON.stringify([...favs])); } catch (e) {}
}

function toggleFav(id) {
  const dish = dishes.find(d => d.id === id);
  if (!dish) return;
  if (favs.has(id)) { favs.delete(id); showToast(`${dish.name} removed from saved`); }
  else { favs.add(id); showToast(`♥ ${dish.name} saved`); }
  saveFavs();
  syncFilterButtons();
  renderDishes();
  if (dishDialog.open) openDish(id, true);
}

function pairsFor(dish) {
  const same = dishes.filter(d => d.id !== dish.id && d.cuisine === dish.cuisine);
  const rest = dishes.filter(d => d.id !== dish.id && d.cuisine !== dish.cuisine && d.popular);
  return [...same, ...rest].slice(0, 2);
}

// --- Dish detail ---
function openDish(id, keepOpen) {
  const dish = dishes.find(d => d.id === id);
  if (!dish) return;
  const saved = favs.has(id);
  const pairs = pairsFor(dish);
  dishContent.innerHTML = `
    <div class="dish-hero" style="background:linear-gradient(135deg, ${escapeHtml(dish.color)}, #ffffff)">
      <button type="button" class="dish-close" data-close aria-label="Close details">×</button>
      ${dishImg(dish)}
    </div>
    <div class="dish-body">
      <span class="tag">${escapeHtml(dish.cuisine)} · ${escapeHtml(dish.time)} · ${dish.veg ? 'Veg' : 'Non-veg'}</span>
      <h2 id="dish-title">${escapeHtml(dish.name)}</h2>
      <p class="muted">${escapeHtml(dish.desc)}</p>
      <div class="meta"><span class="stars" aria-hidden="true">${stars(dish.rating)}</span> ${escapeHtml(dish.rating)} · <strong>${format(dish.price)}</strong></div>
      <div class="dish-actions">
        <div class="price-row" style="flex:1;margin:0"><strong>${format(dish.price)}</strong>${cardControlHtml(dish)}</div>
        <button type="button" class="ghost-button" data-action="fav" data-id="${dish.id}" aria-pressed="${saved}">${saved ? '♥ Saved' : '♡ Save'}</button>
      </div>
      <div class="pairs"><b>Pairs well with</b><div class="pairs-row">${pairs.map(p => `<button type="button" class="pair-chip" data-action="view" data-id="${p.id}">${escapeHtml(p.emoji)} ${escapeHtml(p.name)} · ${format(p.price)}</button>`).join('')}</div></div>
    </div>`;
  if (!keepOpen && !dishDialog.open) dishDialog.showModal();
}

// --- Cart + pricing ---
function saveCart() {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    if (promoCode) localStorage.setItem(PROMO_KEY, promoCode);
    else localStorage.removeItem(PROMO_KEY);
  } catch (e) {}
}

function loadState() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        cart = parsed.map(entry => {
          const dish = dishes.find(d => d.id === Number(entry.id));
          if (!dish) return null;
          return { ...dish, qty: Math.min(99, Math.max(1, Number(entry.qty) || 1)) };
        }).filter(Boolean);
      }
    }
    promoCode = localStorage.getItem(PROMO_KEY);
    if (promoCode && !resolvePromo(promoCode)) promoCode = null;
    try {
      const fraw = localStorage.getItem(FAV_KEY);
      if (fraw) favs = new Set(JSON.parse(fraw).map(Number).filter(id => dishes.some(d => d.id === id)));
    } catch (e) { favs = new Set(); }
    const savedLoc = localStorage.getItem(LOCATION_KEY);
    if (savedLoc) locationLabel.textContent = savedLoc;
    const last = localStorage.getItem(ORDER_KEY);
    if (last) {
      const o = JSON.parse(last);
      $('#last-order').textContent = `Last order ${o.id} · ${o.total} · ${o.eta}`;
    }
    const theme = localStorage.getItem(THEME_KEY);
    applyTheme(theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
    loadAddresses();
    renderOrders();
    renderSavedReviews();
    ensureReferralCode();
  } catch (e) { cart = []; }
}

function priceBreakup() {
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const r = calcBreakup(subtotal, promoCode);
  return { ...r, count: cart.reduce((t, i) => t + i.qty, 0) };
}

function renderCart() {
  const { subtotal, discount, delivery, tax, total, count, promo } = priceBreakup();
  cartCountEl.textContent = count;
  cartSubtotalEl.textContent = format(subtotal);
  cartDiscountRow.classList.toggle('hidden', !discount);
  cartDiscountEl.textContent = `−${format(discount)}${promo ? ` (${promo.code})` : ''}`;
  cartDeliveryEl.textContent = subtotal > 0 && delivery === 0 ? 'FREE' : format(delivery);
  cartTaxEl.textContent = format(tax);
  cartTotalEl.textContent = format(total);
  checkoutBtn.disabled = cart.length === 0;
  checkoutBtn.textContent = cart.length === 0 ? 'Bag is empty' : `Checkout · ${format(total)}`;
  updateStickyBar(count, total);

  if (subtotal >= FREE_DELIVERY_THRESHOLD) freeDeliveryEl.innerHTML = '<div class="progress done">🎉 You unlocked <b>FREE delivery</b></div>';
  else if (subtotal > 0) freeDeliveryEl.innerHTML = `<div class="progress-info">Add <b>${format(FREE_DELIVERY_THRESHOLD - subtotal)}</b> more for free delivery</div><div class="progress"><i style="width:${Math.round(subtotal / FREE_DELIVERY_THRESHOLD * 100)}%"></i></div>`;
  else freeDeliveryEl.innerHTML = '<div class="progress-info">Free delivery over ₹499 · code WELCOME10 for 10% off</div>';

  if (!cart.length) {
    cartItemsEl.innerHTML = '<p class="empty-cart">Your bag is waiting for something delicious.<br><a href="#menu" id="empty-browse">Browse the menu →</a></p>';
    const link = cartItemsEl.querySelector('#empty-browse');
    if (link) link.addEventListener('click', () => toggleCart(false));
    return;
  }
  cartItemsEl.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div class="item-icon has-photo" style="background:${escapeHtml(item.color)}" aria-hidden="true"><img src="${escapeHtml(item.img)}" alt="" loading="lazy" width="92" height="92" onerror="this.remove()" /></div>
      <div class="item-info">
        <b>${escapeHtml(item.name)}</b>
        <small>${format(item.price)} each · <strong>${format(item.price * item.qty)}</strong></small>
        <div class="qty-controls">
          <button type="button" class="qty-btn" data-action="decrease" data-id="${item.id}" aria-label="Decrease quantity of ${escapeHtml(item.name)}">−</button>
          <span aria-live="polite">Qty ${item.qty}</span>
          <button type="button" class="qty-btn" data-action="increase" data-id="${item.id}" aria-label="Increase quantity of ${escapeHtml(item.name)}">+</button>
        </div>
      </div>
      <button type="button" class="remove-item" data-action="remove" data-id="${item.id}" aria-label="Remove ${escapeHtml(item.name)} from bag">×</button>
    </div>`).join('');
}

function addToCart(id) {
  const dish = dishes.find(item => item.id === id);
  if (!dish) return;
  const existing = cart.find(item => item.id === id);
  if (existing) existing.qty = Math.min(99, existing.qty + 1);
  else cart.push({ ...dish, qty: 1 });
  saveCart(); renderCart();
  updateCardControl(id);
  cartButton.classList.remove('pulse');
  void cartButton.offsetWidth;
  cartButton.classList.add('pulse');
  showToast(`✓ ${dish.name} added to your bag`);
}

function changeCartQty(id, delta) {
  const item = cart.find(d => d.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter(d => d !== item);
  if (item.qty > 99) item.qty = 99;
  saveCart(); renderCart();
  updateCardControl(id);
}

function reorderItems(items) {
  items.forEach(({ id, qty }) => {
    const dish = dishes.find(d => d.id === id);
    if (!dish) return;
    const existing = cart.find(i => i.id === id);
    if (existing) existing.qty = Math.min(99, existing.qty + qty);
    else cart.push({ ...dish, qty: Math.min(99, qty) });
  });
  saveCart(); renderCart();
  items.forEach(({ id }) => updateCardControl(id));
  toggleCart(true);
  showToast('Items added back to your bag');
}

function updateStickyBar(count, total) {
  if (!stickyBar) return;
  const cartOpen = cartEl.classList.contains('open');
  if (count > 0 && !cartOpen && !checkoutDialog.open) {
    stickyBar.hidden = false;
    stickyBar.innerHTML = `<span>🛍 ${count} item${count === 1 ? '' : 's'} · ${format(total)}</span><span>View bag →</span>`;
  } else {
    stickyBar.hidden = true;
  }
}

// --- Orders history ---
function getOrders() {
  try { return JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]'); } catch (e) { return []; }
}

function saveOrders(orders) {
  try { localStorage.setItem(ORDERS_KEY, JSON.stringify(orders.slice(0, 10))); } catch (e) {}
}

function renderOrders() {
  if (!ordersList) return;
  const orders = getOrders();
  if (!orders.length) {
    ordersList.innerHTML = '<p class="muted">No orders yet — your history will appear here.</p>';
    return;
  }
  ordersList.innerHTML = orders.map(o => {
    const canCancel = o.status === 'active' && Date.now() - new Date(o.at).getTime() < 120000;
    const items = o.items.map(i => `${escapeHtml(i.name)} × ${i.qty}`).join(', ');
    return `<article class="order-card" data-status="${o.status}">
      <div><b>${escapeHtml(o.id)}</b> <span class="pill">${o.status}</span><br><small>${escapeHtml(items)}</small><br><small>${escapeHtml(o.slotLabel || o.eta)} · ${escapeHtml(o.total)}</small></div>
      <div class="order-actions"><button type="button" data-reorder="${escapeHtml(o.id)}">Reorder</button>${canCancel ? `<button type="button" data-cancel="${escapeHtml(o.id)}">Cancel</button>` : ''}</div>
    </article>`;
  }).join('');
}

function startTracking(orderId) {
  trackTimers.forEach(clearTimeout);
  trackTimers = [];
  const steps = [0, 4000, 9000, 15000];
  const render = active => {
    const list = orderConfirm.querySelector('.tracker');
    if (list) list.querySelectorAll('li').forEach((li, i) => li.classList.toggle('done', i <= active));
    if (active === 1) showToast('👨‍🍳 Your food is being prepared');
    if (active === 2) showToast('🛵 Rider is on the way');
    if (active === 3) {
      showToast('✅ Delivered — enjoy!');
      const orders = getOrders().map(o => o.id === orderId ? { ...o, status: 'delivered' } : o);
      saveOrders(orders);
      renderOrders();
    }
  };
  steps.forEach((delay, i) => trackTimers.push(setTimeout(() => render(i), delay)));
}

if (stickyBar) stickyBar.addEventListener('click', () => toggleCart(true));

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
}

function setBackgroundInert(open) {
  ['main', '.site-header', '.site-footer'].forEach(sel => {
    const el = document.querySelector(sel);
    if (!el) return;
    try { open ? el.setAttribute('inert', '') : el.removeAttribute('inert'); } catch (e) {}
  });
}

function toggleCart(open) {
  cartEl.classList.toggle('open', open);
  overlayEl.classList.toggle('open', open);
  cartEl.setAttribute('aria-hidden', String(!open));
  cartButton.setAttribute('aria-expanded', String(open));
  document.body.classList.toggle('no-scroll', open);
  setBackgroundInert(open);
  const { count, total } = priceBreakup();
  updateStickyBar(count, total);
  if (open) { lastFocusedBeforeCart = document.activeElement; closeCartBtn.focus(); }
  else if (lastFocusedBeforeCart?.focus) lastFocusedBeforeCart.focus();
}

function toggleNav(force) {
  const willOpen = typeof force === 'boolean' ? force : !navEl.classList.contains('open');
  navEl.classList.toggle('open', willOpen);
  menuButton.setAttribute('aria-expanded', String(willOpen));
}

// --- Address book ---
function getAddresses() {
  try { return JSON.parse(localStorage.getItem(ADDR_KEY) || '[]'); } catch (e) { return []; }
}

function loadAddresses() {
  const sel = $('#addr-select');
  if (!sel) return;
  const addrs = getAddresses();
  sel.innerHTML = '<option value="">Use a new address…</option>' + addrs.map((a, i) => `<option value="${i}">${escapeHtml(a.name)} — ${escapeHtml(a.address.slice(0, 32))}</option>`).join('');
}

function slotLabel(id) {
  return (SLOTS.find(s => s.id === id) || SLOTS[0]).label;
}

// --- Checkout flow ---
function openCheckout() {
  if (!cart.length) return showToast('Add a dish before checking out');
  const { subtotal, discount, delivery, tax, total, count } = priceBreakup();
  checkoutSummary.innerHTML = `${count} item${count === 1 ? '' : 's'} · ${format(subtotal)}${discount ? ` − ${format(discount)}` : ''} + ${delivery === 0 ? 'FREE delivery' : format(delivery)} + ${format(tax)} tax = <b>${format(total)}</b>`;
  loadAddresses();
  showPane(1);
  toggleCart(false);
  checkoutDialog.showModal();
}

function showPane(n) {
  checkoutForm.querySelectorAll('fieldset').forEach(fs => { fs.hidden = Number(fs.dataset.pane) !== n; });
  checkoutDialog.querySelectorAll('.checkout-steps li').forEach(li => {
    const isActive = Number(li.dataset.step) === n;
    li.classList.toggle('active', isActive);
    if (isActive) li.setAttribute('aria-current', 'step');
    else li.removeAttribute('aria-current');
  });
  const first = checkoutDialog.querySelector('fieldset:not([hidden]) input, fieldset:not([hidden]) button');
  if (first) setTimeout(() => first.focus(), 50);
}

function setFieldError(input, msgId, message) {
  const err = document.getElementById(msgId);
  if (message) {
    input.setAttribute('aria-invalid', 'true');
    if (err) { err.textContent = message; err.hidden = false; }
  } else {
    input.removeAttribute('aria-invalid');
    if (err) { err.textContent = ''; err.hidden = true; }
  }
}

function placeOrder(data) {
  const { total } = priceBreakup();
  const id = 'DD-' + Math.floor(100000 + Math.random() * 900000);
  const slot = slotLabel(data.slot);
  const items = cart.map(i => ({ id: i.id, name: i.name, qty: i.qty, price: i.price }));
  const order = { id, items, subtotal: format(cart.reduce((s, i) => s + i.price * i.qty, 0)), total: format(total), eta: data.slot === 'asap' ? '25–30 min' : slot, slot, slotLabel: slot, name: data.name, phone: data.phone, address: data.address, pay: data.pay, at: new Date().toISOString(), status: 'active' };
  try {
    localStorage.setItem(ORDER_KEY, JSON.stringify(order));
    const orders = [order, ...getOrders()];
    saveOrders(orders);
  } catch (e) {}
  if (data.saveAddr) {
    const addrs = getAddresses();
    if (!addrs.some(a => a.address === data.address) && addrs.length < 3) {
      addrs.push({ name: data.name, phone: data.phone, address: data.address });
      try { localStorage.setItem(ADDR_KEY, JSON.stringify(addrs)); } catch (e) {}
    }
  }
  $('#last-order').textContent = `Last order ${id} · ${format(total)} · ${order.eta}`;
  orderConfirm.innerHTML = `<p class="big">🎉 Order <b>${escapeHtml(id)}</b> confirmed!</p><p>Hi ${escapeHtml(data.name)}, arriving <b>${escapeHtml(order.eta)}</b> · Paying via ${escapeHtml(data.pay)} · Total <b>${format(total)}</b>.</p><p class="muted">Slot: ${escapeHtml(slot)} · <button type="button" class="link-button" data-reorder-latest>Reorder these items</button></p><ol class="tracker" aria-label="Order status"><li><span><b>Order received</b>Kitchen confirmed</span></li><li><span><b>Preparing</b>Cooking fresh</span></li><li><span><b>On the way</b>Rider picked up</span></li><li><span><b>Delivered</b>Enjoy!</span></li></ol>`;
  const ids = cart.map(i => i.id);
  cart = []; promoCode = null; saveCart(); renderCart(); renderOrders();
  ids.forEach(updateCardControl);
  showPane(3);
  startTracking(id);
}

// --- Reviews (user-submitted) ---
function renderSavedReviews() {
  if (!reviewsGrid) return;
  try {
    const saved = JSON.parse(localStorage.getItem(REVIEWS_KEY) || '[]');
    saved.forEach(r => {
      const el = document.createElement('article');
      el.innerHTML = `<div class="stars" aria-label="${r.rating} out of 5 stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div><p>“${escapeHtml(r.text)}”</p><footer><b>${escapeHtml(r.name)}</b><small>Guest review · Ordered ${escapeHtml(r.dish)}</small></footer>`;
      reviewsGrid.prepend(el);
    });
  } catch (e) {}
}

// --- Referral ---
function ensureReferralCode() {
  let code = null;
  try { code = localStorage.getItem(REF_KEY); } catch (e) {}
  if (!code) {
    code = 'DD-' + Array.from({ length: 4 }, () => 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 31)]).join('');
    try { localStorage.setItem(REF_KEY, code); } catch (e) {}
  }
  const el = $('#my-code');
  if (el) el.textContent = code;
}

// --- Events ---
filtersEl.addEventListener('click', e => {
  const btn = e.target.closest('button');
  if (!btn) return;
  activeCategory = btn.dataset.category;
  syncFilterButtons();
  withSkeleton(renderDishes);
});
sortSelect.addEventListener('change', () => { sortBy = sortSelect.value; withSkeleton(renderDishes); });
vegCheckbox.addEventListener('change', () => { vegOnly = vegCheckbox.checked; withSkeleton(renderDishes); });
grid.addEventListener('click', e => {
  const btn = e.target.closest('button[data-action], [data-action="view"]');
  if (!btn) return;
  const id = Number(btn.dataset.id);
  if (btn.dataset.action === 'fav') { toggleFav(id); return; }
  if (btn.dataset.action === 'view' || btn.getAttribute('data-action') === 'view') { openDish(id); return; }
  if (btn.dataset.action === 'add' || btn.dataset.action === 'increase') {
    if (cartQty(id) === 0) addToCart(id);
    else changeCartQty(id, 1);
  }
  else if (btn.dataset.action === 'decrease') changeCartQty(id, -1);
});
grid.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-action="view"]')) {
    e.preventDefault();
    openDish(Number(e.target.dataset.id));
  }
});
if (dishContent) dishContent.addEventListener('click', e => {
  if (e.target.closest('[data-close]')) { dishDialog.close(); return; }
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const id = Number(btn.dataset.id);
  if (btn.dataset.action === 'fav') toggleFav(id);
  else if (btn.dataset.action === 'view') openDish(id, true);
  else if (btn.dataset.action === 'increase') { if (cartQty(id) === 0) addToCart(id); else changeCartQty(id, 1); openDish(id, true); }
  else if (btn.dataset.action === 'decrease') { changeCartQty(id, -1); openDish(id, true); }
});
if (dishDialog) {
  dishDialog.addEventListener('click', e => {
    if (e.target.closest('[data-close]')) { dishDialog.close(); return; }
    const rect = dishDialog.getBoundingClientRect();
    const inDialog = rect.top <= e.clientY && e.clientY <= rect.top + rect.height && rect.left <= e.clientX && e.clientX <= rect.left + rect.width;
    if (!inDialog) dishDialog.close();
  });
  dishDialog.addEventListener('close', () => renderDishes());
}
cartItemsEl.addEventListener('click', e => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const id = Number(btn.dataset.id);
  const item = cart.find(d => d.id === id);
  if (!item) return;
  if (btn.dataset.action === 'increase') changeCartQty(id, 1);
  else if (btn.dataset.action === 'decrease') changeCartQty(id, -1);
  else if (btn.dataset.action === 'remove') { cart = cart.filter(d => d.id !== id); showToast(`${item.name} removed`); saveCart(); renderCart(); updateCardControl(id); }
});
clearCartBtn.addEventListener('click', () => {
  if (!cart.length) return;
  const ids = cart.map(i => i.id);
  cart = []; promoCode = null; saveCart(); renderCart(); showToast('Bag cleared');
  ids.forEach(updateCardControl);
});
promoForm.addEventListener('submit', e => {
  e.preventDefault();
  const code = normalizePromo(promoInput.value);
  if (!code) return;
  const resolved = resolvePromo(code);
  if (resolved) {
    promoCode = resolved.code; saveCart(); renderCart();
    promoMsg.classList.remove('error');
    promoMsg.textContent = `✓ ${resolved.code} applied: ${resolved.label}.`;
    showToast(`Promo ${resolved.code} applied`);
  }
  else { promoMsg.classList.add('error'); promoMsg.textContent = 'That code is not valid. Try WELCOME10 or a DD-XXXX referral.'; promoInput.focus(); promoInput.select(); }
});
$('#promo-remove').addEventListener('click', () => { promoCode = null; promoInput.value = ''; promoMsg.textContent = ''; saveCart(); renderCart(); });
cartButton.addEventListener('click', () => toggleCart(true));
closeCartBtn.addEventListener('click', () => toggleCart(false));
overlayEl.addEventListener('click', () => toggleCart(false));
checkoutBtn.addEventListener('click', openCheckout);
$('#checkout-cancel').addEventListener('click', () => { checkoutDialog.close(); toggleCart(true); });
const addrSelect = $('#addr-select');
if (addrSelect) addrSelect.addEventListener('change', () => {
  const addrs = getAddresses();
  const a = addrs[Number(addrSelect.value)];
  if (a) {
    checkoutForm.name.value = a.name;
    checkoutForm.phone.value = a.phone;
    checkoutForm.address.value = a.address;
  }
});
checkoutForm.addEventListener('submit', e => {
  e.preventDefault();
  const btn = e.submitter;
  const next = btn?.dataset?.next;
  if (next === 'close') { checkoutDialog.close(); $('#menu').scrollIntoView({ behavior: 'smooth' }); return; }
  if (next === '2') {
    const name = checkoutForm.name.value.trim();
    const phone = checkoutForm.phone.value.trim();
    const address = checkoutForm.address.value.trim();
    let firstInvalid = null;
    if (!name) { setFieldError(checkoutForm.name, 'err-name', 'Please enter your name.'); firstInvalid = firstInvalid || checkoutForm.name; }
    else setFieldError(checkoutForm.name, 'err-name', '');
    if (!phone) { setFieldError(checkoutForm.phone, 'err-phone', 'Please enter your phone number.'); firstInvalid = firstInvalid || checkoutForm.phone; }
    else if (!isValidPhone(phone)) { setFieldError(checkoutForm.phone, 'err-phone', 'Enter a valid 10-digit phone number.'); firstInvalid = firstInvalid || checkoutForm.phone; }
    else setFieldError(checkoutForm.phone, 'err-phone', '');
    if (!address) { setFieldError(checkoutForm.address, 'err-address', 'Please enter your delivery address.'); firstInvalid = firstInvalid || checkoutForm.address; }
    else setFieldError(checkoutForm.address, 'err-address', '');
    if (firstInvalid) { firstInvalid.focus(); showToast('Please fix the highlighted fields'); return; }
    showPane(2); return;
  }
  if (next === '3') {
    placeOrder({
      name: checkoutForm.name.value.trim(),
      phone: checkoutForm.phone.value.trim(),
      address: checkoutForm.address.value.trim(),
      slot: (checkoutForm.querySelector('input[name="slot"]:checked') || {}).value || 'asap',
      saveAddr: checkoutForm.querySelector('#addr-save')?.checked,
      pay: (checkoutForm.querySelector('input[name="pay"]:checked') || {}).value || 'UPI'
    });
    return;
  }
  if (next === '1') { showPane(1); return; }
});
orderConfirm.addEventListener('click', e => {
  if (e.target.closest('[data-reorder-latest]')) {
    const orders = getOrders();
    if (orders[0]) { checkoutDialog.close(); reorderItems(orders[0].items); }
  }
});
if (ordersList) ordersList.addEventListener('click', e => {
  const reorder = e.target.closest('[data-reorder]');
  const cancel = e.target.closest('[data-cancel]');
  if (reorder) {
    const o = getOrders().find(x => x.id === reorder.dataset.reorder);
    if (o) reorderItems(o.items);
  }
  if (cancel) {
    const id = cancel.dataset.cancel;
    saveOrders(getOrders().map(o => o.id === id ? { ...o, status: 'cancelled' } : o));
    renderOrders();
    showToast(`Order ${id} cancelled`);
  }
});
searchForm.addEventListener('submit', e => {
  e.preventDefault();
  query = searchInput.value; renderSkeleton();
  clearTimeout(skelTimer);
  skelTimer = setTimeout(() => renderDishes(), 180);
  $('#menu').scrollIntoView({ behavior: 'smooth' });
});
searchInput.addEventListener('input', () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => { query = searchInput.value; withSkeleton(renderDishes); }, 200);
});
document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    $('#menu').scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => searchInput.focus(), 300);
  }
});
$('#view-all').addEventListener('click', resetAll);
menuButton.addEventListener('click', () => toggleNav());
navEl.querySelectorAll('a').forEach(link => link.addEventListener('click', () => toggleNav(false)));
const themeToggle = $('#theme-toggle');
if (themeToggle) themeToggle.addEventListener('click', () => {
  applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
});
document.querySelector('.location').addEventListener('click', () => {
  locationInput.value = locationLabel.textContent.trim() === 'New Delhi' ? '' : locationLabel.textContent.trim();
  if (typeof locationDialog.showModal === 'function') { locationDialog.showModal(); setTimeout(() => locationInput.focus(), 50); }
});
locationCancel.addEventListener('click', () => locationDialog.close());
[checkoutDialog, locationDialog].forEach(d => {
  if (!d) return;
  d.addEventListener('click', e => { if (e.target === d) d.close(); });
});
locationForm.addEventListener('submit', () => {
  const value = locationInput.value.trim().slice(0, 60);
  if (value) {
    locationLabel.textContent = value;
    try { localStorage.setItem(LOCATION_KEY, value); } catch (e) {}
    showToast(`Delivering to ${value}`);
  }
});
document.querySelectorAll('.code-chip').forEach(chip => chip.addEventListener('click', async () => {
  const code = chip.dataset.code;
  promoInput.value = code;
  try { await navigator.clipboard.writeText(code); showToast(`Code ${code} copied — paste it in your bag`); }
  catch (e) { showToast(`Use code ${code} in your bag`); }
  toggleCart(true);
}));
const myCodeBtn = $('#my-code');
if (myCodeBtn) myCodeBtn.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(myCodeBtn.textContent); showToast(`Referral ${myCodeBtn.textContent} copied — friends get ₹50 off`); }
  catch (e) { showToast(`Share code ${myCodeBtn.textContent}`); }
});
if (reviewForm) {
  const dishSel = $('#review-dish');
  dishSel.innerHTML = dishes.map(d => `<option>${escapeHtml(d.name)}</option>`).join('');
  reviewForm.addEventListener('submit', e => {
    e.preventDefault();
    const name = $('#review-name').value.trim();
    const text = $('#review-text').value.trim();
    const rating = Number($('#review-rating').value) || 5;
    if (!name || !text) { showToast('Please add your name and review'); return; }
    const review = { name: name.slice(0, 40), dish: dishSel.value, rating: Math.min(5, Math.max(1, rating)), text: text.slice(0, 280) };
    try {
      const saved = JSON.parse(localStorage.getItem(REVIEWS_KEY) || '[]');
      saved.unshift(review);
      localStorage.setItem(REVIEWS_KEY, JSON.stringify(saved.slice(0, 12)));
    } catch (e) {}
    const el = document.createElement('article');
    el.innerHTML = `<div class="stars" aria-label="${review.rating} out of 5 stars">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</div><p>“${escapeHtml(review.text)}”</p><footer><b>${escapeHtml(review.name)}</b><small>Guest review · Ordered ${escapeHtml(review.dish)}</small></footer>`;
    reviewsGrid.prepend(el);
    reviewForm.reset();
    showToast('Thanks! Your review is live');
  });
}
newsletterForm.addEventListener('submit', async e => {
  e.preventDefault();
  const email = $('#newsletter-email').value.trim();
  if (!isValidEmail(email)) { $('#newsletter-msg').textContent = 'Enter a valid email address.'; return; }
  const endpoint = newsletterForm.dataset.endpoint;
  if (endpoint) {
    try {
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      if (!res.ok) throw new Error('bad status');
      $('#newsletter-msg').textContent = 'Subscribed! Check your inbox.';
    } catch (err) {
      try { localStorage.setItem(NL_KEY, email); } catch (e) {}
      $('#newsletter-msg').textContent = 'Saved! We will email you (offline mode). Code WELCOME10 works now.';
    }
  } else {
    try { localStorage.setItem(NL_KEY, email); } catch (e) {}
    $('#newsletter-msg').textContent = 'You are in! Code WELCOME10 works on your first order.';
  }
  showToast('Subscribed — check your inbox for ₹100 off');
  newsletterForm.reset();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (navEl.classList.contains('open')) toggleNav(false);
    else if (cartEl.classList.contains('open')) toggleCart(false);
  }
});
window.addEventListener('resize', () => { if (window.innerWidth > 800 && navEl.classList.contains('open')) toggleNav(false); });

// Init
loadState();
syncFilterButtons();
renderDishes();
renderCart();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
