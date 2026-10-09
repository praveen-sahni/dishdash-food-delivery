const dishes = [
  { id: 1, name: 'Truffle Pasta', category: 'Popular', cuisine: 'Italian', desc: 'Creamy truffle sauce, parmesan, basil.', time: '25 min', timeMin: 25, rating: '4.9', price: 349, emoji: '🍝', color: '#f8dfaa', popular: true, veg: true },
  { id: 2, name: 'Smoky BBQ Burger', category: 'Burger', cuisine: 'American', desc: 'Char-grilled patty, smoked cheddar, pickles.', time: '20 min', timeMin: 20, rating: '4.8', price: 289, emoji: '🍔', color: '#efd0ad', popular: false, veg: false },
  { id: 3, name: 'Garden Burrito Bowl', category: 'Healthy', cuisine: 'Mexican', desc: 'Brown rice, beans, corn, avocado crema.', time: '25 min', timeMin: 25, rating: '4.7', price: 319, emoji: '🥗', color: '#cfe4bd', popular: false, veg: true },
  { id: 4, name: 'Spicy Ramen', category: 'Asian', cuisine: 'Japanese', desc: 'Rich chilli-miso broth, noodles, soft egg.', time: '30 min', timeMin: 30, rating: '4.9', price: 369, emoji: '🍜', color: '#f5c8ad', popular: true, veg: false },
  { id: 5, name: 'Margherita Pizza', category: 'Pizza', cuisine: 'Italian', desc: 'San Marzano tomato, fior di latte, basil.', time: '25 min', timeMin: 25, rating: '4.8', price: 399, emoji: '🍕', color: '#f7d18b', popular: false, veg: true },
  { id: 6, name: 'Dragon Dumplings', category: 'Asian', cuisine: 'Chinese', desc: 'Pan-seared veg dumplings, chilli oil.', time: '18 min', timeMin: 18, rating: '4.6', price: 249, emoji: '🥟', color: '#f0d4bd', popular: false, veg: true },
  { id: 7, name: 'Avocado Toast', category: 'Healthy', cuisine: 'Cafe', desc: 'Sourdough, smashed avo, seeds, lime.', time: '15 min', timeMin: 15, rating: '4.7', price: 229, emoji: '🥑', color: '#cfe6a6', popular: false, veg: true },
  { id: 8, name: 'Pepperoni Pizza', category: 'Pizza', cuisine: 'Italian', desc: 'Double pepperoni, mozzarella, oregano.', time: '28 min', timeMin: 28, rating: '4.9', price: 449, emoji: '🍕', color: '#f0c7a3', popular: true, veg: false },
  { id: 9, name: 'Paneer Tikka Bowl', category: 'Healthy', cuisine: 'Indian', desc: 'Smoky paneer, millet, mint chutney.', time: '22 min', timeMin: 22, rating: '4.8', price: 299, emoji: '🥘', color: '#e6d3b3', popular: false, veg: true },
  { id: 10, name: 'Classic Cheeseburger', category: 'Burger', cuisine: 'American', desc: 'Beef patty, cheddar, house sauce.', time: '18 min', timeMin: 18, rating: '4.7', price: 259, emoji: '🍔', color: '#eed9c0', popular: false, veg: false },
  { id: 11, name: 'Pad Thai Noodles', category: 'Asian', cuisine: 'Thai', desc: 'Tamarind glaze, peanuts, bean sprouts.', time: '24 min', timeMin: 24, rating: '4.7', price: 329, emoji: '🍜', color: '#f3cfae', popular: false, veg: true },
  { id: 12, name: 'Farmhouse Pizza', category: 'Pizza', cuisine: 'Italian', desc: 'Loaded garden veggies, extra cheese.', time: '26 min', timeMin: 26, rating: '4.6', price: 379, emoji: '🍕', color: '#f6d9a0', popular: false, veg: true }
];

const PROMOS = { WELCOME10: { pct: 10, cap: 120, label: '10% off' }, FREEDEL: { freeDel: true, label: 'Free delivery' } };
const FREE_DELIVERY_THRESHOLD = 499;
const DELIVERY_FEE = 29;
const TAX_RATE = 0.05;
const CART_KEY = 'dishdash-cart-v1';
const LOCATION_KEY = 'dishdash-location-v1';
const PROMO_KEY = 'dishdash-promo-v1';
const ORDER_KEY = 'dishdash-last-order-v1';

let activeCategory = 'All';
let query = '';
let sortBy = 'featured';
let vegOnly = false;
let cart = [];
let promoCode = null;
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

const format = amount => `₹${Math.round(amount).toLocaleString('en-IN')}`;
const escapeHtml = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function getFilteredDishes() {
  const q = query.trim().toLowerCase();
  let list = dishes.filter(dish => {
    const matchesCategory = activeCategory === 'All' ? true : activeCategory === 'Popular' ? dish.popular : dish.category === activeCategory;
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
  filtersEl.querySelectorAll('button').forEach(button => {
    const isActive = button.dataset.category === activeCategory;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
}

function stars(rating) {
  const r = parseFloat(rating);
  const full = Math.round(r);
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

function updateCardControl(id) {
  const dish = dishes.find(d => d.id === id);
  if (!dish) return;
  const btn = grid.querySelector(`[data-id="${id}"]`);
  if (!btn) return;
  const row = btn.closest('.price-row');
  if (!row) return;
  const focusedAction = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.action : null;
  row.innerHTML = `<strong>${format(dish.price)}</strong>${cardControlHtml(dish)}`;
  if (focusedAction && focusedAction !== 'add') {
    const next = row.querySelector(`[data-action="${focusedAction}"]`) || row.querySelector('strong');
    if (next && next.focus) { try { next.focus({ preventScroll: true }); } catch (e) { next.focus(); } }
  }
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
    grid.innerHTML = '<div class="empty-state"><p>No dishes found. Try another craving!</p><button type="button" id="reset-filters" class="text-button">Clear search &amp; filters</button></div>';
    grid.querySelector('#reset-filters').addEventListener('click', resetAll);
    return;
  }
  grid.innerHTML = list.map(dish => `
    <article class="food-card">
      <div class="food-image" style="background:linear-gradient(135deg, ${escapeHtml(dish.color)}, #ffffff)">
        <span class="veg-dot ${dish.veg ? 'veg' : 'nonveg'}" role="img" aria-label="${dish.veg ? 'Veg' : 'Non-veg'}"></span>
        ${dish.popular ? '<span class="badge">Popular</span>' : ''}
        <span class="food-emoji" aria-hidden="true">${escapeHtml(dish.emoji)}</span>
      </div>
      <div class="card-info">
        <span class="tag">${escapeHtml(dish.cuisine)} · ${escapeHtml(dish.time)}</span>
        <h3>${escapeHtml(dish.name)}</h3>
        <p class="desc">${escapeHtml(dish.desc)}</p>
        <div class="meta"><span title="Rated ${escapeHtml(dish.rating)} out of 5"><span class="stars" aria-hidden="true">${stars(dish.rating)}</span> ${escapeHtml(dish.rating)}</span></div>
        <div class="price-row"><strong>${format(dish.price)}</strong>${cardControlHtml(dish)}</div>
      </div>
    </article>`).join('');
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
    if (promoCode && !PROMOS[promoCode]) promoCode = null;
    const savedLoc = localStorage.getItem(LOCATION_KEY);
    if (savedLoc) locationLabel.textContent = savedLoc;
    const last = localStorage.getItem(ORDER_KEY);
    if (last) {
      const o = JSON.parse(last);
      $('#last-order').textContent = `Last order ${o.id} · ${o.total} · ${o.eta}`;
    }
  } catch (e) { cart = []; }
}

function priceBreakup() {
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const promo = promoCode ? PROMOS[promoCode] : null;
  const discount = promo && promo.pct ? Math.min(Math.round(subtotal * promo.pct / 100), promo.cap) : 0;
  const afterDiscount = subtotal - discount;
  const delivery = subtotal === 0 ? 0 : (promo && promo.freeDel) || afterDiscount >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
  const tax = Math.round(afterDiscount * TAX_RATE);
  return { subtotal, discount, delivery, tax, total: afterDiscount + delivery + tax, count: cart.reduce((t, i) => t + i.qty, 0) };
}

function renderCart() {
  const { subtotal, discount, delivery, tax, total, count } = priceBreakup();
  cartCountEl.textContent = count;
  cartSubtotalEl.textContent = format(subtotal);
  cartDiscountRow.classList.toggle('hidden', !discount);
  cartDiscountEl.textContent = `−${format(discount)}${promoCode ? ` (${promoCode})` : ''}`;
  cartDeliveryEl.textContent = subtotal > 0 && delivery === 0 ? 'FREE' : format(delivery);
  cartTaxEl.textContent = format(tax);
  cartTotalEl.textContent = format(total);
  checkoutBtn.disabled = cart.length === 0;
  checkoutBtn.textContent = cart.length === 0 ? 'Bag is empty' : `Checkout · ${format(total)}`;

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
      <div class="item-icon" style="background:${escapeHtml(item.color)}" aria-hidden="true">${escapeHtml(item.emoji)}</div>
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
  if (open) { lastFocusedBeforeCart = document.activeElement; closeCartBtn.focus(); }
  else if (lastFocusedBeforeCart && lastFocusedBeforeCart.focus) lastFocusedBeforeCart.focus();
}

function toggleNav(force) {
  const willOpen = typeof force === 'boolean' ? force : !navEl.classList.contains('open');
  navEl.classList.toggle('open', willOpen);
  menuButton.setAttribute('aria-expanded', String(willOpen));
}

// --- Checkout flow ---
function openCheckout() {
  if (!cart.length) return showToast('Add a dish before checking out');
  const { subtotal, discount, delivery, tax, total, count } = priceBreakup();
  checkoutSummary.innerHTML = `${count} item${count === 1 ? '' : 's'} · ${format(subtotal)}${discount ? ` − ${format(discount)}` : ''} + ${delivery === 0 ? 'FREE delivery' : format(delivery)} + ${format(tax)} tax = <b>${format(total)}</b>`;
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
  const eta = '25–30 min';
  const order = { id, total: format(total), eta, name: data.name, pay: data.pay, at: new Date().toISOString() };
  try { localStorage.setItem(ORDER_KEY, JSON.stringify(order)); } catch (e) {}
  $('#last-order').textContent = `Last order ${id} · ${format(total)} · ${eta}`;
  orderConfirm.innerHTML = `<p class="big">🎉 Order <b>${escapeHtml(id)}</b> confirmed!</p><p>Hi ${escapeHtml(data.name)}, your food is being prepared. Arriving in <b>${eta}</b> · Paying via ${escapeHtml(data.pay)} · Total <b>${format(total)}</b>.</p><p class="muted">A confirmation was “sent” to ${escapeHtml(data.phone)}. Cold food? We refund or redeliver.</p>`;
  const ids = cart.map(i => i.id);
  cart = []; promoCode = null; saveCart(); renderCart();
  ids.forEach(updateCardControl);
  showPane(3);
}

// --- Events ---
filtersEl.addEventListener('click', e => {
  const btn = e.target.closest('button');
  if (!btn) return;
  activeCategory = btn.dataset.category;
  syncFilterButtons(); renderDishes();
});
sortSelect.addEventListener('change', () => { sortBy = sortSelect.value; renderDishes(); });
vegCheckbox.addEventListener('change', () => { vegOnly = vegCheckbox.checked; renderDishes(); });
grid.addEventListener('click', e => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const id = Number(btn.dataset.id);
  if (btn.dataset.action === 'add' || btn.dataset.action === 'increase') {
    if (cartQty(id) === 0) addToCart(id);
    else changeCartQty(id, 1);
  }
  else if (btn.dataset.action === 'decrease') changeCartQty(id, -1);
});
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
  const code = promoInput.value.trim().toUpperCase();
  if (!code) return;
  if (PROMOS[code]) { promoCode = code; saveCart(); renderCart(); promoMsg.classList.remove('error'); promoMsg.textContent = `✓ ${code} applied: ${PROMOS[code].label}.`; showToast(`Promo ${code} applied`); }
  else { promoMsg.classList.add('error'); promoMsg.textContent = 'That code is not valid. Try WELCOME10.'; promoInput.focus(); promoInput.select(); }
});
$('#promo-remove').addEventListener('click', () => { promoCode = null; promoInput.value = ''; promoMsg.textContent = ''; saveCart(); renderCart(); });
cartButton.addEventListener('click', () => toggleCart(true));
closeCartBtn.addEventListener('click', () => toggleCart(false));
overlayEl.addEventListener('click', () => toggleCart(false));
checkoutBtn.addEventListener('click', openCheckout);
$('#checkout-cancel').addEventListener('click', () => { checkoutDialog.close(); toggleCart(true); });
checkoutForm.addEventListener('submit', e => {
  e.preventDefault();
  const btn = e.submitter;
  const next = btn && btn.dataset ? btn.dataset.next : null;
  if (next === 'close') { checkoutDialog.close(); $('#menu').scrollIntoView({ behavior: 'smooth' }); return; }
  if (next === '2') {
    const name = checkoutForm.name.value.trim();
    const phone = checkoutForm.phone.value.trim();
    const address = checkoutForm.address.value.trim();
    let firstInvalid = null;
    if (!name) { setFieldError(checkoutForm.name, 'err-name', 'Please enter your name.'); firstInvalid = firstInvalid || checkoutForm.name; }
    else setFieldError(checkoutForm.name, 'err-name', '');
    if (!phone) { setFieldError(checkoutForm.phone, 'err-phone', 'Please enter your phone number.'); firstInvalid = firstInvalid || checkoutForm.phone; }
    else if (!/^[0-9+ \-]{10,15}$/.test(phone)) { setFieldError(checkoutForm.phone, 'err-phone', 'Enter a valid 10-digit phone number.'); firstInvalid = firstInvalid || checkoutForm.phone; }
    else setFieldError(checkoutForm.phone, 'err-phone', '');
    if (!address) { setFieldError(checkoutForm.address, 'err-address', 'Please enter your delivery address.'); firstInvalid = firstInvalid || checkoutForm.address; }
    else setFieldError(checkoutForm.address, 'err-address', '');
    if (firstInvalid) { firstInvalid.focus(); showToast('Please fix the highlighted fields'); return; }
    showPane(2); return;
  }
  if (next === '3') {
    placeOrder({ name: checkoutForm.name.value.trim(), phone: checkoutForm.phone.value.trim(), pay: (checkoutForm.querySelector('input[name="pay"]:checked') || {}).value || 'UPI' });
    return;
  }
  if (next === '1') { showPane(1); return; }
});
searchForm.addEventListener('submit', e => {
  e.preventDefault();
  query = searchInput.value; grid.setAttribute('aria-busy', 'true'); renderDishes();
  $('#menu').scrollIntoView({ behavior: 'smooth' });
});
searchInput.addEventListener('input', () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => { query = searchInput.value; grid.setAttribute('aria-busy', 'true'); renderDishes(); }, 200);
});
$('#view-all').addEventListener('click', resetAll);
menuButton.addEventListener('click', () => toggleNav());
navEl.querySelectorAll('a').forEach(link => link.addEventListener('click', () => toggleNav(false)));
document.querySelector('.location').addEventListener('click', () => {
  locationInput.value = locationLabel.textContent.trim() === 'New Delhi' ? '' : locationLabel.textContent.trim();
  if (typeof locationDialog.showModal === 'function') { locationDialog.showModal(); setTimeout(() => locationInput.focus(), 50); }
});
locationCancel.addEventListener('click', () => locationDialog.close());
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
newsletterForm.addEventListener('submit', e => {
  e.preventDefault();
  const email = $('#newsletter-email').value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { $('#newsletter-msg').textContent = 'Enter a valid email address.'; return; }
  $('#newsletter-msg').textContent = 'You are in! Code WELCOME10 works on your first order.';
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
