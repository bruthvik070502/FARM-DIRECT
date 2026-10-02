process.env.DB_FILE = 'memory';
const { test, before } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../src/app');
const { reset } = require('../src/db');

const login = async (email, password) => (await request(app).post('/api/auth/login').send({ email, password })).body.token;
const bearer = (t) => ({ Authorization: 'Bearer ' + t });
before(reset);

test('login works and rejects bad passwords', async () => {
  assert.ok(await login('customer@farm.com', 'cust123'));
  const r = await request(app).post('/api/auth/login').send({ email: 'customer@farm.com', password: 'nope' });
  assert.equal(r.status, 401);
});
test('search matches full names', async () => {
  const r = await request(app).get('/api/products?q=strawberry');
  assert.equal(r.body.length, 1);
});
test('quote applies product offer and bank offer', async () => {
  const r = await request(app).post('/api/quote').send({ items: [{ productId: 'p1', qty: 2 }], payment: { method: 'card', bank: 'HDFC Bank', cardType: 'credit' } });
  assert.equal(r.body.offerDiscount, 48); // 20% of 240
  assert.ok(r.body.bankDiscount > 0);
});
test('role guards block customers from adding products', async () => {
  const t = await login('customer@farm.com', 'cust123');
  const r = await request(app).post('/api/products').set(bearer(t)).send({ name: 'X', price: 1, stock: 1 });
  assert.equal(r.status, 403);
});
test('full flow: order -> deliver -> farmer withdraws', async () => {
  const ct = await login('customer@farm.com', 'cust123'), ft = await login('farmer@farm.com', 'farmer123');
  const o = await request(app).post('/api/orders').set(bearer(ct)).send({ items: [{ productId: 'p9', qty: 3 }], address: '12 Main Street, Hyderabad', payment: { method: 'upi_id', detail: 'asha@okbank' } });
  assert.equal(o.status, 201);
  for (const s of ['Confirmed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered']) {
    const u = await request(app).patch(`/api/orders/${o.body.id}/status`).set(bearer(ft)).send({ status: s });
    assert.equal(u.status, 200);
  }
  const w = await request(app).get('/api/farmer/wallet').set(bearer(ft));
  assert.ok(w.body.balance >= 270);
  const wd = await request(app).post('/api/withdrawals').set(bearer(ft)).send({ amount: 200, method: 'upi', detail: 'ramesh@upi' });
  assert.equal(wd.status, 201);
  const over = await request(app).post('/api/withdrawals').set(bearer(ft)).send({ amount: 999999, method: 'upi', detail: 'ramesh@upi' });
  assert.equal(over.status, 400);
});
