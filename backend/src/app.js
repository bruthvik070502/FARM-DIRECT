const express = require('express'), cors = require('cors'), bcrypt = require('bcryptjs'), jwt = require('jsonwebtoken');
const fs = require('fs'), path = require('path');
const { load, save, id } = require('./db');

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const STATUSES = ['Placed', 'Confirmed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered'];
const METHODS = ['upi_app', 'upi_id', 'card', 'netbanking', 'cod'];
const WITHDRAW = ['bank', 'upi', 'wallet'];
const app = express();
app.use(cors());
app.use(express.json({ limit: '6mb' }));

const pub = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, farm: u.farm });
const auth = (...roles) => (req, res, next) => {
  try {
    const p = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), SECRET);
    req.user = load().users.find((u) => u.id === p.id);
    if (!req.user) throw new Error();
  } catch { return res.status(401).json({ error: 'Please log in' }); }
  if (roles.length && !roles.includes(req.user.role)) return res.status(403).json({ error: 'Not allowed for your role' });
  next();
};
const sign = (u) => ({ token: jwt.sign({ id: u.id }, SECRET, { expiresIn: '7d' }), user: pub(u) });

// ---------- Auth ----------
app.post('/api/auth/register', (req, res) => {
  const { name, email, password, role, farm } = req.body || {}, db = load();
  if (!name || !email || !password || password.length < 6) return res.status(400).json({ error: 'Name, email and a 6+ char password are required' });
  if (!['farmer', 'customer'].includes(role)) return res.status(400).json({ error: 'Role must be farmer or customer' });
  if (db.users.some((u) => u.email === email.toLowerCase())) return res.status(409).json({ error: 'Email already registered' });
  const u = { id: id(), name, email: email.toLowerCase(), pass: bcrypt.hashSync(password, 8), role, farm: role === 'farmer' ? farm || name + "'s Farm" : undefined };
  db.users.push(u); save(); res.status(201).json(sign(u));
});
app.post('/api/auth/login', (req, res) => {
  const { email = '', password = '' } = req.body || {};
  const u = load().users.find((x) => x.email === email.toLowerCase());
  if (!u || !bcrypt.compareSync(password, u.pass)) return res.status(401).json({ error: 'Wrong email or password' });
  res.json(sign(u));
});
app.get('/api/me', auth(), (req, res) => res.json(pub(req.user)));

// ---------- Products ----------
app.get('/api/products', (req, res) => {
  const q = (req.query.q || '').toLowerCase().trim(), c = req.query.category;
  res.json(load().products.filter((p) => (!c || c === 'All' || p.category === c) && (!q || `${p.name} ${p.farm} ${p.category}`.toLowerCase().includes(q))));
});
const clean = (b) => ({ name: String(b.name || '').trim(), category: b.category || 'Vegetables', price: Number(b.price), unit: b.unit || '1 kg', stock: parseInt(b.stock), description: b.description || '', image: b.image || '' });
const valid = (p) => p.name && p.price > 0 && p.stock >= 0;
app.post('/api/products', auth('farmer', 'admin'), (req, res) => {
  const p = clean(req.body);
  if (!valid(p)) return res.status(400).json({ error: 'Name, price > 0 and stock are required' });
  const db = load(), owner = req.user.role === 'farmer' ? req.user : db.users.find((u) => u.id === req.body.farmerId && u.role === 'farmer') || db.users.find((u) => u.role === 'farmer');
  const prod = { id: id(), farmerId: owner.id, farm: owner.farm, ...p };
  db.products.push(prod); save(); res.status(201).json(prod);
});
app.put('/api/products/:id', auth('farmer', 'admin'), (req, res) => {
  const db = load(), p = db.products.find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  if (req.user.role === 'farmer' && p.farmerId !== req.user.id) return res.status(403).json({ error: 'Not your product' });
  const n = clean({ ...p, ...req.body });
  if (!valid(n)) return res.status(400).json({ error: 'Invalid product data' });
  Object.assign(p, n); save(); res.json(p);
});
app.delete('/api/products/:id', auth('farmer', 'admin'), (req, res) => {
  const db = load(), p = db.products.find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  if (req.user.role === 'farmer' && p.farmerId !== req.user.id) return res.status(403).json({ error: 'Not your product' });
  db.products = db.products.filter((x) => x !== p); db.offers = db.offers.filter((o) => o.productId !== p.id); save(); res.json({ ok: true });
});

// ---------- Offers ----------
app.get('/api/offers', (req, res) => res.json(load().offers.filter((o) => o.active)));
app.get('/api/bank-offers', (req, res) => res.json(load().bankOffers));
app.post('/api/offers', auth('farmer', 'admin'), (req, res) => {
  const { title, percent, productId } = req.body || {}, db = load();
  if (!title || !(percent > 0 && percent <= 90)) return res.status(400).json({ error: 'Title and a percent between 1-90 are required' });
  if (productId) {
    const p = db.products.find((x) => x.id === productId);
    if (!p || (req.user.role === 'farmer' && p.farmerId !== req.user.id)) return res.status(403).json({ error: 'Pick one of your own products' });
  } else if (req.user.role === 'farmer') return res.status(403).json({ error: 'Farmers can only create product offers' });
  const o = { id: id(), title, percent: Number(percent), productId: productId || null, createdBy: req.user.id, active: true };
  db.offers.push(o); save(); res.status(201).json(o);
});
app.delete('/api/offers/:id', auth('farmer', 'admin'), (req, res) => {
  const db = load(), o = db.offers.find((x) => x.id === req.params.id);
  if (!o) return res.status(404).json({ error: 'Not found' });
  if (req.user.role === 'farmer' && o.createdBy !== req.user.id) return res.status(403).json({ error: 'Not your offer' });
  db.offers = db.offers.filter((x) => x !== o); save(); res.json({ ok: true });
});
app.post('/api/bank-offers', auth('admin'), (req, res) => {
  const { bank, type, percent, max } = req.body || {};
  if (!bank || !['credit', 'debit'].includes(type) || !(percent > 0) || !(max > 0)) return res.status(400).json({ error: 'Invalid bank offer' });
  const b = { id: id(), bank, type, percent: Number(percent), max: Number(max) };
  load().bankOffers.push(b); save(); res.status(201).json(b);
});
app.delete('/api/bank-offers/:id', auth('admin'), (req, res) => { const db = load(); db.bankOffers = db.bankOffers.filter((b) => b.id !== req.params.id); save(); res.json({ ok: true }); });

// ---------- Pricing / Orders ----------
function quote(items, payment = {}) {
  const db = load(); let subtotal = 0, offerDiscount = 0; const lines = [];
  if (!Array.isArray(items) || !items.length) throw new Error('Cart is empty');
  for (const it of items) {
    const p = db.products.find((x) => x.id === it.productId);
    if (!p) throw new Error('A product in your cart no longer exists');
    const qty = Math.max(1, parseInt(it.qty) || 1);
    if (qty > p.stock) throw new Error(`Only ${p.stock} of ${p.name} left`);
    const pct = Math.max(0, ...db.offers.filter((o) => o.active && (!o.productId || o.productId === p.id)).map((o) => o.percent));
    const gross = p.price * qty, disc = Math.round((gross * pct) / 100);
    subtotal += gross; offerDiscount += disc;
    lines.push({ productId: p.id, name: p.name, price: p.price, unit: p.unit, qty, farmerId: p.farmerId, offerPercent: pct, lineTotal: gross - disc });
  }
  const after = subtotal - offerDiscount;
  const bo = payment.method === 'card' ? db.bankOffers.find((b) => b.bank === payment.bank && b.type === payment.cardType) : null;
  const bankDiscount = bo ? Math.min(Math.round((after * bo.percent) / 100), bo.max) : 0;
  const delivery = after >= 500 ? 0 : 40;
  return { lines, subtotal, offerDiscount, bankDiscount, bankOffer: bo, delivery, total: after - bankDiscount + delivery };
}
app.post('/api/quote', (req, res) => { try { res.json(quote(req.body.items, req.body.payment)); } catch (e) { res.status(400).json({ error: e.message }); } });

app.post('/api/orders', auth('customer'), (req, res) => {
  const { items, payment = {}, address } = req.body || {}, db = load();
  if (!address || address.trim().length < 6) return res.status(400).json({ error: 'Please enter a delivery address' });
  if (!METHODS.includes(payment.method)) return res.status(400).json({ error: 'Choose a payment method' });
  if (payment.method === 'upi_id' && !/^[\w.-]+@[\w]+$/.test(payment.detail || '')) return res.status(400).json({ error: 'Enter a valid UPI ID like name@bank' });
  let q; try { q = quote(items, payment); } catch (e) { return res.status(400).json({ error: e.message }); }
  q.lines.forEach((l) => { db.products.find((p) => p.id === l.productId).stock -= l.qty; });
  const now = new Date().toISOString();
  const order = {
    id: 'FD' + Date.now().toString().slice(-7), customerId: req.user.id, customerName: req.user.name, address, items: q.lines,
    subtotal: q.subtotal, offerDiscount: q.offerDiscount, bankDiscount: q.bankDiscount, delivery: q.delivery, total: q.total,
    payment: { method: payment.method, bank: payment.bank, cardType: payment.cardType, detail: payment.method === 'card' ? '•••• ' + String(payment.detail || '').slice(-4) : payment.detail, status: payment.method === 'cod' ? 'Pay on delivery' : 'Paid' },
    status: 'Placed', timeline: [{ status: 'Placed', at: now }], createdAt: now,
  };
  db.orders.unshift(order); save(); res.status(201).json(order);
});
const myOrders = (u) => {
  const all = load().orders;
  if (u.role === 'admin') return all;
  if (u.role === 'customer') return all.filter((o) => o.customerId === u.id);
  return all.filter((o) => o.items.some((i) => i.farmerId === u.id)).map((o) => ({ ...o, items: o.items.filter((i) => i.farmerId === u.id) }));
};
app.get('/api/orders', auth(), (req, res) => res.json(myOrders(req.user)));
app.patch('/api/orders/:id/status', auth('farmer', 'admin'), (req, res) => {
  const o = load().orders.find((x) => x.id === req.params.id);
  if (!o) return res.status(404).json({ error: 'Order not found' });
  if (req.user.role === 'farmer' && !o.items.some((i) => i.farmerId === req.user.id)) return res.status(403).json({ error: 'Not your order' });
  if (!STATUSES.includes(req.body.status)) return res.status(400).json({ error: 'Invalid status' });
  o.status = req.body.status; o.timeline.push({ status: o.status, at: new Date().toISOString() });
  if (o.status === 'Delivered' && o.payment.method === 'cod') o.payment.status = 'Paid';
  save(); res.json(o);
});

// ---------- Farmer wallet ----------
function wallet(fid) {
  const db = load();
  const earned = db.orders.filter((o) => o.status === 'Delivered').flatMap((o) => o.items).filter((i) => i.farmerId === fid).reduce((s, i) => s + i.lineTotal, 0);
  const withdrawn = db.withdrawals.filter((w) => w.farmerId === fid && w.status !== 'Rejected').reduce((s, w) => s + w.amount, 0);
  const pending = db.orders.filter((o) => o.status !== 'Delivered').flatMap((o) => o.items).filter((i) => i.farmerId === fid).reduce((s, i) => s + i.lineTotal, 0);
  return { earned, withdrawn, pending, balance: earned - withdrawn };
}
app.get('/api/farmer/wallet', auth('farmer'), (req, res) => res.json({ ...wallet(req.user.id), withdrawals: load().withdrawals.filter((w) => w.farmerId === req.user.id) }));
app.post('/api/withdrawals', auth('farmer'), (req, res) => {
  const { amount, method, detail } = req.body || {}, a = Number(amount);
  if (!WITHDRAW.includes(method) || !detail) return res.status(400).json({ error: 'Choose a withdrawal method and enter the details' });
  if (!(a >= 100)) return res.status(400).json({ error: 'Minimum withdrawal is ₹100' });
  if (a > wallet(req.user.id).balance) return res.status(400).json({ error: 'Amount exceeds your available balance' });
  const w = { id: 'W' + id(), farmerId: req.user.id, farmerName: req.user.name, amount: a, method, detail, status: 'Processing', at: new Date().toISOString() };
  load().withdrawals.unshift(w); save(); res.status(201).json(w);
});

// ---------- Admin ----------
app.get('/api/admin/stats', auth('admin'), (req, res) => {
  const db = load(), paid = db.orders.filter((o) => o.payment.status === 'Paid');
  const byStatus = {}; db.orders.forEach((o) => (byStatus[o.status] = (byStatus[o.status] || 0) + 1));
  res.json({ users: db.users.length, farmers: db.users.filter((u) => u.role === 'farmer').length, customers: db.users.filter((u) => u.role === 'customer').length, products: db.products.length, orders: db.orders.length, revenue: paid.reduce((s, o) => s + o.total, 0), pendingPayouts: db.withdrawals.filter((w) => w.status === 'Processing').length, byStatus });
});
app.get('/api/admin/users', auth('admin'), (req, res) => res.json(load().users.map(pub)));
app.delete('/api/admin/users/:id', auth('admin'), (req, res) => {
  const db = load(); if (req.params.id === req.user.id) return res.status(400).json({ error: "You can't remove yourself" });
  db.users = db.users.filter((u) => u.id !== req.params.id); db.products = db.products.filter((p) => p.farmerId !== req.params.id); save(); res.json({ ok: true });
});
app.get('/api/admin/payments', auth('admin'), (req, res) => res.json(load().orders.map((o) => ({ orderId: o.id, customer: o.customerName, total: o.total, bankDiscount: o.bankDiscount, ...o.payment, createdAt: o.createdAt }))));
app.get('/api/admin/withdrawals', auth('admin'), (req, res) => res.json(load().withdrawals));
app.patch('/api/admin/withdrawals/:id', auth('admin'), (req, res) => {
  const w = load().withdrawals.find((x) => x.id === req.params.id);
  if (!w || !['Paid', 'Rejected', 'Processing'].includes(req.body.status)) return res.status(400).json({ error: 'Invalid request' });
  w.status = req.body.status; save(); res.json(w);
});

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// Serve the built React app (single-service deploy)
const dist = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(dist)) { app.use(express.static(dist)); app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html'))); }

module.exports = app;
