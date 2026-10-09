# Go-live checklist

- [ ] Fill `SITE` in `js/data.js`: support phone/email, address, hours.
- [ ] FSSAI license obtained → set `SITE.fssai` (shown in footer + invoice).
- [ ] GSTIN obtained → set `SITE.gstin` (GST invoices).
- [ ] Razorpay (or Stripe) key → set `SITE.razorpayKeyId`; verify test + live payments + webhooks + refunds.
- [ ] Backend built against `docs/api-contract.md`; frontend quote/order calls switched from local to API.
- [ ] Privacy/Terms/Refunds reviewed by a lawyer (templates ship in repo root).
- [ ] Real food photos replace `images/dish-*.svg`; real kitchen names replace trustbar.
- [ ] Real support line staffed 11am–11pm; refund SLA owner assigned.
- [ ] `admin.html` replaced by authed backend admin; remove or password-gate it.
- [ ] Closed beta: one area, real money, 1 week, zero lost orders → public launch.
