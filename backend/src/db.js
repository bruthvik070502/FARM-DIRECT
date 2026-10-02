// Tiny JSON-file database (zero native deps). Swap for PostgreSQL/MongoDB in production.
const fs = require('fs'), path = require('path'), bcrypt = require('bcryptjs');
const FILE = process.env.DB_FILE || path.join(__dirname, '..', 'data', 'db.json');
const MEMORY = FILE === 'memory';
let db;
const id = () => Math.random().toString(36).slice(2, 10);
const h = (p) => bcrypt.hashSync(p, 8);

function seed() {
  const P = (i, farmerId, name, category, price, unit, stock, farm) => ({ id: 'p' + i, farmerId, name, category, price, unit, stock, farm, image: '', description: `Fresh ${name.toLowerCase()} straight from ${farm}.` });
  return {
    users: [
      { id: 'u_admin', name: 'Admin', email: 'admin@farm.com', pass: h('admin123'), role: 'admin' },
      { id: 'u_f1', name: 'Ramesh', email: 'farmer@farm.com', pass: h('farmer123'), role: 'farmer', farm: 'Green Valley Farm' },
      { id: 'u_f2', name: 'Lakshmi', email: 'lakshmi@farm.com', pass: h('farmer123'), role: 'farmer', farm: 'Sunrise Orchards' },
      { id: 'u_c1', name: 'Asha', email: 'customer@farm.com', pass: h('cust123'), role: 'customer' },
    ],
    products: [
      P(1, 'u_f2', 'Mango', 'Fruits', 120, '1 kg', 80, 'Sunrise Orchards'),
      P(2, 'u_f2', 'Strawberry', 'Fruits', 90, '250 g', 40, 'Sunrise Orchards'),
      P(3, 'u_f2', 'Pomegranate', 'Fruits', 150, '1 kg', 35, 'Sunrise Orchards'),
      P(4, 'u_f2', 'Banana', 'Fruits', 60, '1 dozen', 100, 'Sunrise Orchards'),
      P(5, 'u_f1', 'Tomato', 'Vegetables', 40, '1 kg', 120, 'Green Valley Farm'),
      P(6, 'u_f1', 'Spinach', 'Vegetables', 25, '1 bunch', 60, 'Green Valley Farm'),
      P(7, 'u_f1', 'Carrot', 'Vegetables', 45, '1 kg', 90, 'Green Valley Farm'),
      P(8, 'u_f1', 'Onion', 'Vegetables', 35, '1 kg', 150, 'Green Valley Farm'),
      P(9, 'u_f1', 'Basmati Rice', 'Grains', 95, '1 kg', 200, 'Green Valley Farm'),
      P(10, 'u_f1', 'Fresh Milk', 'Dairy', 55, '1 L', 70, 'Green Valley Farm'),
    ],
    offers: [
      { id: 'o1', title: 'Mango Mania', percent: 20, productId: 'p1', createdBy: 'u_f2', active: true },
      { id: 'o2', title: 'Tomato Tuesday', percent: 10, productId: 'p5', createdBy: 'u_f1', active: true },
      { id: 'o3', title: 'Welcome Fresh', percent: 5, productId: null, createdBy: 'u_admin', active: true },
    ],
    bankOffers: [
      { id: 'b1', bank: 'HDFC Bank', type: 'credit', percent: 10, max: 150 },
      { id: 'b2', bank: 'ICICI Bank', type: 'debit', percent: 7, max: 100 },
      { id: 'b3', bank: 'SBI', type: 'credit', percent: 8, max: 120 },
      { id: 'b4', bank: 'Axis Bank', type: 'debit', percent: 5, max: 80 },
    ],
    orders: [], withdrawals: [],
  };
}
const save = () => { if (MEMORY) return; fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(db, null, 1)); };
function load() {
  if (db) return db;
  if (!MEMORY && fs.existsSync(FILE)) db = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  else { db = seed(); save(); }
  return db;
}
const reset = () => { db = seed(); save(); };
module.exports = { load, save, id, reset };
