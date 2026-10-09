const dishes = [
  { id: 1, name: 'Truffle Pasta', category: 'Popular', cuisine: 'Italian', time: '25 min', rating: '4.9', price: 349, emoji: '🍝', color: '#f8dfaa', popular: true },
  { id: 2, name: 'Smoky BBQ Burger', category: 'Burger', cuisine: 'American', time: '20 min', rating: '4.8', price: 289, emoji: '🍔', color: '#efd0ad', popular: false },
  { id: 3, name: 'Garden Burrito Bowl', category: 'Healthy', cuisine: 'Mexican', time: '25 min', rating: '4.7', price: 319, emoji: '🥗', color: '#cfe4bd', popular: false },
  { id: 4, name: 'Spicy Ramen', category: 'Asian', cuisine: 'Japanese', time: '30 min', rating: '4.9', price: 369, emoji: '🍜', color: '#f5c8ad', popular: true },
  { id: 5, name: 'Margherita Pizza', category: 'Pizza', cuisine: 'Italian', time: '25 min', rating: '4.8', price: 399, emoji: '🍕', color: '#f7d18b', popular: false },
  { id: 6, name: 'Dragon Dumplings', category: 'Asian', cuisine: 'Chinese', time: '18 min', rating: '4.6', price: 249, emoji: '🥟', color: '#f0d4bd', popular: false },
  { id: 7, name: 'Avocado Toast', category: 'Healthy', cuisine: 'Cafe', time: '15 min', rating: '4.7', price: 229, emoji: '🥑', color: '#cfe6a6', popular: false },
  { id: 8, name: 'Pepperoni Pizza', category: 'Pizza', cuisine: 'Italian', time: '28 min', rating: '4.9', price: 449, emoji: '🍕', color: '#f0c7a3', popular: true }
];

const FREE_DELIVERY_THRESHOLD = 499;
const DELIVERY_FEE = 29;
const CART_KEY = 'dishdash-cart-v1';
const LOCATION_KEY = 'dishdash-location-v1';

let activeCategory = 'All';
let query = '';
let cart = [];
let lastFocusedBeforeCart = null;
let toastTimer = null;

// Cached DOM refs
const grid = document.querySelector('#food-grid');
const resultsCount = document.querySelector('#results-count');
const filtersEl = document.querySelector('#filters');
const cartEl = document.querySelector('#cart');
const overlayEl = document.querySelector('#overlay');
const cartItemsEl = document.querySelector('#cart-items');
const cartCountEl = document.querySelector('#cart-count');
const cartSubtotalEl = document.querySelector('#cart-subtotal');
const cartDeliveryEl = document.querySelector('#cart-delivery');
const cartTotalEl = document.querySelector('#cart-total');
const checkoutBtn = document.querySelector('#checkout');
const cartButton = document.querySelector('#cart-button');
const closeCartBtn = document.querySelector('#close-cart');
const navEl = document.querySelector('#nav');
const menuButton = document.querySelector('#menu-button');
const searchForm = document.querySelector('#search-form');
const searchInput = document.querySelector('#search-input');
const toastEl = document.querySelector('#toast');
const locationLabel = document.querySelector('#location-label');
const locationDialog = document.querySelector('#location-dialog');
const locationForm = document.querySelector('#location-form');
const locationInput = document.querySelector('#location-input');
const locationCancel = document.querySelector('#location-cancel');

const format = amount => `₹${amount.toLocaleString('en-IN')}`;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getFilteredDishes() {
  const q = query.trim().toLowerCase();
  return dishes.filter(dish => {
    const matchesCategory =
      activeCategory === 'All' ? true :
      activeCategory === 'Popular' ? dish.popular :
      dish.category === activeCategory;
    if (!matchesCategory) return false;
    if (!q) return true;
    return `${dish.name} ${dish.cuisine} ${dish.category}`.toLowerCase().includes(q);
  });
}

function syncFilterButtons() {
  filtersEl.querySelectorAll('button').forEach(button => {
    const isActive = button.dataset.category === activeCategory;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
}

function renderDishes() {
  const list = getFilteredDishes();
  const parts = [];
  if (query.trim()) parts.push(`${list.length} result${list.length === 1 ? '' : 's'} for “${query.trim()}”`);
  if (activeCategory !== 'All') parts.push(activeCategory);
  resultsCount.textContent = parts.length ? parts.join(' · ') : `${list.length} dishes`;

  if (!list.length) {
    grid.innerHTML = '<div class="empty-state"><p>No dishes found. Try another craving!</p><button type="button" id="reset-filters" class="text-button">Clear search &amp; filters</button></div>';
    const reset = grid.querySelector('#reset-filters');
    if (reset) reset.addEventListener('click', resetAll);
    return;
  }

  grid.innerHTML = list.map(dish => `
    <article class="food-card">
      <div class="food-image" style="background:${escapeHtml(dish.color)}"><span class="food-emoji" aria-hidden="true">${escapeHtml(dish.emoji)}</span></div>
      <div class="card-info">
        <span class="tag">${escapeHtml(dish.cuisine)}</span>
        <h3>${escapeHtml(dish.name)}</h3>
        <div class="meta"><span aria-label="Rated ${escapeHtml(dish.rating)} out of 5">★ ${escapeHtml(dish.rating)}</span><span>${escapeHtml(dish.time)}</span></div>
        <div class="price-row"><strong>${format(dish.price)}</strong><button type="button" class="add-button" data-id="${dish.id}" aria-label="Add ${escapeHtml(dish.name)} to bag">+</button></div>
      </div>
    </article>`).join('');
}

function resetAll() {
  activeCategory = 'All';
  query = '';
  searchInput.value = '';
  syncFilterButtons();
  renderDishes();
}

function saveCart() {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch (e) { /* storage unavailable — ignore */ }
}

function loadCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    cart = parsed
      .map(entry => {
        const dish = dishes.find(d => d.id === Number(entry.id));
        if (!dish) return null;
        const qty = Math.min(99, Math.max(1, Number(entry.qty) || 1));
        return { ...dish, qty };
      })
      .filter(Boolean);
  } catch (e) { cart = []; }
}

function cartTotals() {
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const delivery = subtotal === 0 ? 0 : (subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE);
  return { subtotal, delivery, total: subtotal + delivery, count: cart.reduce((t, i) => t + i.qty, 0) };
}

function renderCart() {
  const { subtotal, delivery, total, count } = cartTotals();
  cartCountEl.textContent = count;
  cartCountEl.setAttribute('aria-label', `${count} items in bag`);
  cartSubtotalEl.textContent = format(subtotal);
  cartDeliveryEl.textContent = delivery === 0 && subtotal >= FREE_DELIVERY_THRESHOLD ? 'FREE' : format(delivery);
  cartTotalEl.textContent = format(total);
  checkoutBtn.disabled = cart.length === 0;
  checkoutBtn.textContent = cart.length === 0 ? 'Bag is empty' : `Checkout · ${format(total)}`;

  if (!cart.length) {
    cartItemsEl.innerHTML = '<p class="empty-cart">Your bag is waiting for something delicious.</p>';
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
          <span aria-live="polite" aria-label="Quantity ${item.qty}">Qty ${item.qty}</span>
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
  saveCart();
  renderCart();
  showToast(`${dish.name} added to your bag`);
}

function changeQty(id, delta) {
  const item = cart.find(d => d.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter(d => d !== item);
  if (item.qty > 99) item.qty = 99;
  saveCart();
  renderCart();
}

function removeItem(id) {
  const item = cart.find(d => d.id === id);
  cart = cart.filter(d => d.id !== id);
  saveCart();
  renderCart();
  if (item) showToast(`${item.name} removed`);
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2400);
}

function setBackgroundInert(open) {
  ['main', '.site-header', '#about'].forEach(sel => {
    const el = document.querySelector(sel);
    if (!el) return;
    try {
      if (open) el.setAttribute('inert', '');
      else el.removeAttribute('inert');
    } catch (e) { /* older browsers */ }
  });
}

function toggleCart(open) {
  cartEl.classList.toggle('open', open);
  overlayEl.classList.toggle('open', open);
  cartEl.setAttribute('aria-hidden', String(!open));
  cartButton.setAttribute('aria-expanded', String(open));
  document.body.classList.toggle('no-scroll', open);
  setBackgroundInert(open);
  if (open) {
    lastFocusedBeforeCart = document.activeElement;
    closeCartBtn.focus();
  } else if (lastFocusedBeforeCart && lastFocusedBeforeCart.focus) {
    lastFocusedBeforeCart.focus();
  }
}

function toggleNav(force) {
  const willOpen = typeof force === 'boolean' ? force : !navEl.classList.contains('open');
  navEl.classList.toggle('open', willOpen);
  menuButton.setAttribute('aria-expanded', String(willOpen));
}

function loadLocation() {
  try {
    const saved = localStorage.getItem(LOCATION_KEY);
    if (saved) locationLabel.textContent = saved;
  } catch (e) { /* ignore */ }
}

function openLocation() {
  locationInput.value = locationLabel.textContent.trim() === 'New Delhi' ? '' : locationLabel.textContent.trim();
  if (typeof locationDialog.showModal === 'function') {
    locationDialog.showModal();
    setTimeout(() => locationInput.focus(), 50);
  } else {
    const next = window.prompt('Enter delivery area:', locationLabel.textContent);
    if (next && next.trim()) {
      locationLabel.textContent = next.trim().slice(0, 60);
      try { localStorage.setItem(LOCATION_KEY, locationLabel.textContent); } catch (e) {}
    }
  }
}

// Events
filtersEl.addEventListener('click', e => {
  const btn = e.target.closest('button');
  if (!btn) return;
  activeCategory = btn.dataset.category;
  syncFilterButtons();
  renderDishes();
});

grid.addEventListener('click', e => {
  const btn = e.target.closest('.add-button');
  if (btn) addToCart(Number(btn.dataset.id));
});

cartItemsEl.addEventListener('click', e => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const id = Number(btn.dataset.id);
  const action = btn.dataset.action;
  if (action === 'increase') changeQty(id, 1);
  else if (action === 'decrease') changeQty(id, -1);
  else if (action === 'remove') removeItem(id);
});

cartButton.addEventListener('click', () => toggleCart(true));
closeCartBtn.addEventListener('click', () => toggleCart(false));
overlayEl.addEventListener('click', () => toggleCart(false));

checkoutBtn.addEventListener('click', () => {
  if (!cart.length) return showToast('Add a dish before checking out');
  const { total } = cartTotals();
  showToast(`Order placed for ${format(total)} — your food is on its way!`);
  cart = [];
  saveCart();
  renderCart();
  toggleCart(false);
  document.querySelector('#menu').scrollIntoView({ behavior: 'smooth' });
});

searchForm.addEventListener('submit', e => {
  e.preventDefault();
  query = searchInput.value;
  renderDishes();
  document.querySelector('#menu').scrollIntoView({ behavior: 'smooth' });
});

searchInput.addEventListener('input', () => {
  if (searchInput.value === '' && query !== '') {
    query = '';
    renderDishes();
  }
});

document.querySelector('#view-all').addEventListener('click', resetAll);

menuButton.addEventListener('click', () => toggleNav());
navEl.querySelectorAll('a').forEach(link => link.addEventListener('click', () => toggleNav(false)));

document.querySelector('.location').addEventListener('click', openLocation);
locationCancel.addEventListener('click', () => locationDialog.close());
locationForm.addEventListener('submit', () => {
  const value = locationInput.value.trim().slice(0, 60);
  if (value) {
    locationLabel.textContent = value;
    try { localStorage.setItem(LOCATION_KEY, value); } catch (e) {}
    showToast(`Delivering to ${value}`);
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (locationDialog.open) locationDialog.close();
    else if (cartEl.classList.contains('open')) toggleCart(false);
    else if (navEl.classList.contains('open')) toggleNav(false);
  }
});

window.addEventListener('resize', () => {
  if (window.innerWidth > 800 && navEl.classList.contains('open')) toggleNav(false);
});

// Init
loadCart();
loadLocation();
syncFilterButtons();
renderDishes();
renderCart();
