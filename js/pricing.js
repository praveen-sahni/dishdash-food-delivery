import { DELIVERY_FEE, FREE_DELIVERY_THRESHOLD, PROMOS, REFERRAL_MIN, REFERRAL_OFF, TAX_RATE } from './data.js';

export const normalizePromo = (code = '') => String(code).trim().toUpperCase();

export const isReferralCode = (code = '') => /^DD-[A-Z0-9]{4}$/.test(normalizePromo(code));

export function resolvePromo(code = '') {
  const c = normalizePromo(code);
  if (!c) return null;
  if (PROMOS[c]) return { code: c, kind: 'promo', ...PROMOS[c] };
  if (isReferralCode(c)) return { code: c, kind: 'referral', label: 'Referral ₹50 off', flat: REFERRAL_OFF, min: REFERRAL_MIN };
  return null;
}

export function calcBreakup(subtotal = 0, promoCode = null) {
  subtotal = Math.max(0, Math.round(subtotal));
  const promo = promoCode ? resolvePromo(promoCode) : null;
  let discount = 0;
  if (promo?.pct) discount = Math.min(Math.round((subtotal * promo.pct) / 100), promo.cap);
  else if (promo?.kind === 'referral' && subtotal >= (promo.min ?? 0)) discount = Math.min(promo.flat, subtotal);
  const afterDiscount = subtotal - discount;
  const delivery = subtotal === 0 ? 0 : promo?.freeDel || afterDiscount >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
  const tax = Math.round(afterDiscount * TAX_RATE);
  return { subtotal, discount, delivery, tax, total: afterDiscount + delivery + tax, promo };
}

export const isValidPhone = (phone = '') => /^[0-9+ \-]{10,15}$/.test(String(phone).trim());

export const isValidEmail = (email = '') => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());

export const formatINR = (amount = 0) => `₹${Math.round(amount).toLocaleString('en-IN')}`;
