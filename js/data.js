export const dishes = [
  { id: 1, name: 'Truffle Pasta', category: 'Popular', cuisine: 'Italian', desc: 'Creamy truffle sauce, parmesan, basil.', time: '25 min', timeMin: 25, rating: '4.9', price: 349, emoji: '🍝', color: '#f8dfaa', popular: true, veg: true, img: 'images/dish-1.svg' },
  { id: 2, name: 'Smoky BBQ Burger', category: 'Burger', cuisine: 'American', desc: 'Char-grilled patty, smoked cheddar, pickles.', time: '20 min', timeMin: 20, rating: '4.8', price: 289, emoji: '🍔', color: '#efd0ad', popular: false, veg: false, img: 'images/dish-2.svg' },
  { id: 3, name: 'Garden Burrito Bowl', category: 'Healthy', cuisine: 'Mexican', desc: 'Brown rice, beans, corn, avocado crema.', time: '25 min', timeMin: 25, rating: '4.7', price: 319, emoji: '🥗', color: '#cfe4bd', popular: false, veg: true, img: 'images/dish-3.svg' },
  { id: 4, name: 'Spicy Ramen', category: 'Asian', cuisine: 'Japanese', desc: 'Rich chilli-miso broth, noodles, soft egg.', time: '30 min', timeMin: 30, rating: '4.9', price: 369, emoji: '🍜', color: '#f5c8ad', popular: true, veg: false, img: 'images/dish-4.svg' },
  { id: 5, name: 'Margherita Pizza', category: 'Pizza', cuisine: 'Italian', desc: 'San Marzano tomato, fior di latte, basil.', time: '25 min', timeMin: 25, rating: '4.8', price: 399, emoji: '🍕', color: '#f7d18b', popular: false, veg: true, img: 'images/dish-5.svg' },
  { id: 6, name: 'Dragon Dumplings', category: 'Asian', cuisine: 'Chinese', desc: 'Pan-seared veg dumplings, chilli oil.', time: '18 min', timeMin: 18, rating: '4.6', price: 249, emoji: '🥟', color: '#f0d4bd', popular: false, veg: true, img: 'images/dish-6.svg' },
  { id: 7, name: 'Avocado Toast', category: 'Healthy', cuisine: 'Cafe', desc: 'Sourdough, smashed avo, seeds, lime.', time: '15 min', timeMin: 15, rating: '4.7', price: 229, emoji: '🥑', color: '#cfe6a6', popular: false, veg: true, img: 'images/dish-7.svg' },
  { id: 8, name: 'Pepperoni Pizza', category: 'Pizza', cuisine: 'Italian', desc: 'Double pepperoni, mozzarella, oregano.', time: '28 min', timeMin: 28, rating: '4.9', price: 449, emoji: '🍕', color: '#f0c7a3', popular: true, veg: false, img: 'images/dish-8.svg' },
  { id: 9, name: 'Paneer Tikka Bowl', category: 'Healthy', cuisine: 'Indian', desc: 'Smoky paneer, millet, mint chutney.', time: '22 min', timeMin: 22, rating: '4.8', price: 299, emoji: '🥘', color: '#e6d3b3', popular: false, veg: true, img: 'images/dish-9.svg' },
  { id: 10, name: 'Classic Cheeseburger', category: 'Burger', cuisine: 'American', desc: 'Beef patty, cheddar, house sauce.', time: '18 min', timeMin: 18, rating: '4.7', price: 259, emoji: '🍔', color: '#eed9c0', popular: false, veg: false, img: 'images/dish-10.svg' },
  { id: 11, name: 'Pad Thai Noodles', category: 'Asian', cuisine: 'Thai', desc: 'Tamarind glaze, peanuts, bean sprouts.', time: '24 min', timeMin: 24, rating: '4.7', price: 329, emoji: '🍜', color: '#f3cfae', popular: false, veg: true, img: 'images/dish-11.svg' },
  { id: 12, name: 'Farmhouse Pizza', category: 'Pizza', cuisine: 'Italian', desc: 'Loaded garden veggies, extra cheese.', time: '26 min', timeMin: 26, rating: '4.6', price: 379, emoji: '🍕', color: '#f6d9a0', popular: false, veg: true, img: 'images/dish-12.svg' }
];

export const PROMOS = {
  WELCOME10: { pct: 10, cap: 120, label: '10% off' },
  FREEDEL: { freeDel: true, label: 'Free delivery' }
};

export const FREE_DELIVERY_THRESHOLD = 499;
export const DELIVERY_FEE = 29;
export const TAX_RATE = 0.05;
export const REFERRAL_OFF = 50;
export const REFERRAL_MIN = 199;
