import test from 'node:test';
import assert from 'node:assert/strict';
import { calcBreakup, isReferralCode, isValidEmail, isValidPhone, normalizePromo, resolvePromo } from '../js/pricing.js';
import { zoneFor } from '../js/data.js';

test('empty cart has zero totals', () => {
  const r = calcBreakup(0, null);
  assert.equal(r.subtotal, 0);
  assert.equal(r.discount, 0);
  assert.equal(r.delivery, 0);
  assert.equal(r.tax, 0);
  assert.equal(r.total, 0);
  assert.equal(r.promo, null);
});

test('delivery fee below threshold, free above', () => {
  assert.equal(calcBreakup(400, null).delivery, 29);
  assert.equal(calcBreakup(499, null).delivery, 0);
  assert.equal(calcBreakup(718, null).delivery, 0);
});

test('WELCOME10 gives 10% capped at 120', () => {
  assert.equal(calcBreakup(400, 'welcome10').discount, 40);
  assert.equal(calcBreakup(2000, 'WELCOME10').discount, 120);
});

test('FREEDEL waives delivery but gives no discount', () => {
  const r = calcBreakup(200, 'FREEDEL');
  assert.equal(r.delivery, 0);
  assert.equal(r.discount, 0);
});

test('referral DD-XXXX gives flat 50 above minimum', () => {
  assert.equal(calcBreakup(300, 'DD-AB12').discount, 50);
  assert.equal(calcBreakup(100, 'DD-AB12').discount, 0);
  assert.ok(isReferralCode('dd-ab12'));
  assert.equal(resolvePromo('BOGUS'), null);
});

test('validators', () => {
  assert.ok(isValidPhone('98765 43210'));
  assert.ok(!isValidPhone('123'));
  assert.ok(isValidEmail('you@example.com'));
  assert.ok(!isValidEmail('not-an-email'));
  assert.equal(normalizePromo('  welcome10 '), 'WELCOME10');
});

test('delivery zones vary fee and threshold', () => {
  assert.equal(zoneFor('Connaught Place').id, 'central-delhi');
  assert.equal(zoneFor('Andheri West').fee, 39);
  assert.equal(zoneFor('Somewhere Else').fee, 49);
  assert.equal(calcBreakup(400, null, 'New Delhi').delivery, 29);
  assert.equal(calcBreakup(400, null, 'Bandra').delivery, 39);
  assert.equal(calcBreakup(600, null, 'Bandra').delivery, 0);
  assert.equal(calcBreakup(400).delivery, 29);
});
