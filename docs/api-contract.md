# Backend API contract (for the live backend build)

The static frontend (`js/app.js`) is display-only. A live backend MUST re-validate
everything below — never trust client totals.

## Endpoints to implement

| Method | Path | Purpose |
|---|---|---|
| GET | /api/menu | Canonical menu (id, name, price, availability). Frontend mirrors `js/data.js`. |
| POST | /api/quote | Body: `{items:[{id,qty}], promo}` → returns server-priced `{subtotal, discount, delivery, tax, total}`. Checkout summary must use this, not local math. |
| POST | /api/orders | Body: `{items, promo, address, slot, idempotencyKey}` + OTP auth. Returns `{orderId, status}`. Duplicate `idempotencyKey` returns the original order (no double charge). |
| GET | /api/orders | Auth'd order history (paginated). |
| POST | /api/orders/:id/cancel | Only within the cancellation window, only `active` orders. |
| POST | /api/payments/webhook | Gateway webhook (Razorpay signature verified). ONLY this marks orders paid. |
| POST | /api/reviews | OTP-authed, one review per order item. |

## Pricing rules (mirror `js/pricing.js` exactly)

- `WELCOME10`: 10% off, capped at ₹120.
- `FREEDEL`: free delivery, no discount.
- Referral `DD-XXXX`: flat ₹50 off when subtotal ≥ ₹199.
- Delivery ₹29 flat, free when discounted subtotal ≥ ₹499.
- GST 5% on discounted subtotal, rounded.

## Security notes

- OTP auth on order/review endpoints; rate-limit orders (e.g. 5/hr/phone), OTPs (3/10 min).
- Admin endpoints behind roles; kitchen status transitions validated server-side.
- Never accept client `total`; always recompute. Log `idempotencyKey` + `paymentId`.
- PII: encrypt phone/address at rest; 3-year retention for tax, then anonymise.
