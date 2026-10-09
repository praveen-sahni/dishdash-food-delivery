// Payment provider interface. Demo mode (no SITE.razorpayKeyId) resolves
// a mock payment so the full checkout flow can be tested end to end.
// To go live: set SITE.razorpayKeyId and include Razorpay checkout.js;
// startPayment will then open the real gateway and resolve only on success.
import { SITE } from './data.js';

export const getPayMode = () => (SITE.razorpayKeyId ? 'live' : 'demo');

function loadRazorpay() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve(window.Razorpay);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(window.Razorpay);
    s.onerror = () => reject(new Error('gateway failed to load'));
    document.head.appendChild(s);
  });
}

export async function startPayment({ amountPaise, orderId, name, phone, email }) {
  if (!SITE.razorpayKeyId) {
    return { provider: 'demo', paymentId: `pay_demo_${orderId}` };
  }
  const Razorpay = await loadRazorpay();
  return new Promise((resolve, reject) => {
    const rzp = new Razorpay({
      key: SITE.razorpayKeyId,
      amount: amountPaise,
      currency: 'INR',
      name: SITE.shopName,
      description: `Order ${orderId}`,
      prefill: { name, contact: phone, email: email || '' },
      handler: res => resolve({ provider: 'razorpay', paymentId: res.razorpay_payment_id }),
      modal: { ondismiss: () => reject(new Error('payment cancelled')) }
    });
    rzp.on('payment.failed', err => reject(new Error(err?.error?.description || 'payment failed')));
    rzp.open();
  });
}
