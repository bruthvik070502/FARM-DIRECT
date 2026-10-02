import { useContext, useState } from 'react';
import { api } from './api';
import { Ctx, ProductImg, Skeleton, Reveal, Spot, Timeline, Empty, Pill, STATUSES, CATS, money, useFetch, motion, AnimatePresence } from './ui';

const fileToData = (f) => new Promise((res) => { const r = new FileReader(); r.onload = () => { const im = new Image(); im.onload = () => { const s = Math.min(1, 800 / im.width), c = document.createElement('canvas'); c.width = im.width * s; c.height = im.height * s; c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.82)); }; im.src = r.result; }; r.readAsDataURL(f); });
const PAY = { upi_app: 'UPI App', upi_id: 'UPI ID', card: 'Card', netbanking: 'Net Banking', cod: 'Cash on Delivery' };
export const payLabel = (p) => `${PAY[p.method]}${p.bank ? ' · ' + p.bank : ''}${p.cardType ? ' ' + p.cardType : ''}${p.detail ? ' · ' + p.detail : ''}`;

export function Orders({ role }) {
  const toast = useContext(Ctx);
  const [orders, reload, loading] = useFetch('/orders', 8000); // live polling
  const set = (id, status) => api(`/orders/${id}/status`, { method: 'PATCH', body: { status } }).then(() => { toast('Order moved to ' + status); reload(); }).catch((e) => toast(e.message, 'err'));
  if (loading) return <Skeleton n={3} h={180} />;
  if (!orders?.length) return <Empty icon="📦" text="No orders yet." />;
  return (
    <div className="stack">{orders.map((o, i) => (
      <Reveal key={o.id} i={i}><Spot className="card order">
        <div className="row between"><div><h3>#{o.id}</h3><small className="muted">{new Date(o.createdAt).toLocaleString()} · {o.customerName}</small></div><div className="right"><b className="big">{money(o.total)}</b><div><Pill tone={o.payment.status === 'Paid' ? 'good' : 'warn'}>{o.payment.status}</Pill></div></div></div>
        <div className="chips">{o.items.map((it) => <span key={it.productId} className="chip">{it.name} × {it.qty} <small>({money(it.price)} / {it.unit})</small></span>)}</div>
        <small className="muted">💳 {payLabel(o.payment)} · 📍 {o.address}</small>
        {(o.offerDiscount > 0 || o.bankDiscount > 0) && <small className="save">You saved {money(o.offerDiscount + o.bankDiscount)} on this order</small>}
        <Timeline status={o.status} timeline={o.timeline} />
        {role !== 'customer' && <div className="row"><label>Update status</label><select value={o.status} onChange={(e) => set(o.id, e.target.value)}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></div>}
      </Spot></Reveal>))}
    </div>
  );
}

const blank = { name: '', category: 'Fruits', price: '', unit: '1 kg', stock: '', description: '', image: '' };
export function ProductManager({ role, user, data, reload }) {
  const toast = useContext(Ctx);
  const [f, setF] = useState(blank), [edit, setEdit] = useState(null), [farmers] = useFetch(role === 'admin' ? '/admin/users' : '/me');
  const mine = role === 'farmer' ? data.products.filter((p) => p.farmerId === user.id) : data.products;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const pick = async (e) => { if (e.target.files[0]) setF({ ...f, image: await fileToData(e.target.files[0]) }); };
  const save = async (e) => {
    e.preventDefault();
    try { await api(edit ? '/products/' + edit : '/products', { method: edit ? 'PUT' : 'POST', body: f }); toast(edit ? 'Product updated' : 'Product added 🎉'); setF(blank); setEdit(null); reload(); } catch (er) { toast(er.message, 'err'); }
  };
  const del = (p) => confirm(`Delete ${p.name}?`) && api('/products/' + p.id, { method: 'DELETE' }).then(() => { toast('Deleted'); reload(); });
  return (
    <div className="split">
      <form className="card form" onSubmit={save}>
        <h3>{edit ? 'Edit product' : 'Add a product'}</h3>
        <div className="preview">{f.name ? <ProductImg p={{ ...f, name: f.name }} /> : <div className="img-fallback">📷</div>}</div>
        <label className="upload">📸 Upload real photo<input type="file" accept="image/*" onChange={pick} hidden /></label>
        <input placeholder="Product name (e.g. Mango)" value={f.name} onChange={set('name')} required />
        <div className="row"><select value={f.category} onChange={set('category')}>{CATS.map((c) => <option key={c}>{c}</option>)}</select><input placeholder="Unit (1 kg, 1 dozen…)" value={f.unit} onChange={set('unit')} /></div>
        <div className="row"><input type="number" min="1" placeholder="Price ₹ per unit" value={f.price} onChange={set('price')} required /><input type="number" min="0" placeholder="Stock" value={f.stock} onChange={set('stock')} required /></div>
        <textarea placeholder="Description" rows="2" value={f.description} onChange={set('description')} />
        {role === 'admin' && !edit && <select onChange={(e) => setF({ ...f, farmerId: e.target.value })}><option value="">Assign to farmer…</option>{(farmers || []).filter((u) => u.role === 'farmer').map((u) => <option key={u.id} value={u.id}>{u.farm}</option>)}</select>}
        <button className="btn">{edit ? 'Save changes' : 'Add product'}</button>
        {edit && <button type="button" className="btn ghost" onClick={() => { setEdit(null); setF(blank); }}>Cancel</button>}
      </form>
      <div className="grid sm"><AnimatePresence>{mine.map((p, i) => (
        <motion.div layout key={p.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ delay: i * 0.03 }}>
          <Spot className="card pcard"><ProductImg p={p} className="pimg" /><div className="pbody"><h4>{p.name}</h4><small className="muted">{p.farm} · {p.category}</small><b>{money(p.price)} / {p.unit}</b><Pill tone={p.stock < 10 ? 'warn' : 'good'}>{p.stock} in stock</Pill>
            <div className="row"><button className="btn sm" onClick={() => { setEdit(p.id); setF({ ...blank, ...p }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Edit / photo</button><button className="btn sm ghost" onClick={() => del(p)}>Delete</button></div></div></Spot>
        </motion.div>))}</AnimatePresence></div>
    </div>
  );
}

export function OfferManager({ role, user, data, reload }) {
  const toast = useContext(Ctx);
  const [o, setO] = useState({ title: '', percent: '', productId: '' }), [b, setB] = useState({ bank: '', type: 'credit', percent: '', max: '' });
  const mineP = role === 'farmer' ? data.products.filter((p) => p.farmerId === user.id) : data.products;
  const run = (fn, ok) => async (e) => { e.preventDefault(); try { await fn(); toast(ok); reload(); } catch (er) { toast(er.message, 'err'); } };
  const nameOf = (id) => data.products.find((p) => p.id === id)?.name || 'All products';
  return (
    <div className="split">
      <div className="stack">
        <form className="card form" onSubmit={run(() => api('/offers', { method: 'POST', body: o }).then(() => setO({ title: '', percent: '', productId: '' })), 'Offer is live ✨')}>
          <h3>Create offer</h3><input placeholder="Offer title (e.g. Mango Mania)" value={o.title} onChange={(e) => setO({ ...o, title: e.target.value })} required />
          <div className="row"><input type="number" min="1" max="90" placeholder="Discount %" value={o.percent} onChange={(e) => setO({ ...o, percent: e.target.value })} required />
            <select value={o.productId} onChange={(e) => setO({ ...o, productId: e.target.value })} required={role === 'farmer'}>{role === 'admin' && <option value="">Sitewide (all products)</option>}{role === 'farmer' && <option value="">Choose product…</option>}{mineP.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          <button className="btn">Publish offer</button>
        </form>
        {role === 'admin' && <form className="card form" onSubmit={run(() => api('/bank-offers', { method: 'POST', body: b }).then(() => setB({ bank: '', type: 'credit', percent: '', max: '' })), 'Bank offer added')}>
          <h3>Bank card offer</h3><input placeholder="Bank (e.g. HDFC Bank)" value={b.bank} onChange={(e) => setB({ ...b, bank: e.target.value })} required />
          <div className="row"><select value={b.type} onChange={(e) => setB({ ...b, type: e.target.value })}><option value="credit">Credit card</option><option value="debit">Debit card</option></select><input type="number" placeholder="% off" value={b.percent} onChange={(e) => setB({ ...b, percent: e.target.value })} required /><input type="number" placeholder="Max ₹" value={b.max} onChange={(e) => setB({ ...b, max: e.target.value })} required /></div>
          <button className="btn">Add bank offer</button></form>}
      </div>
      <div className="stack"><h3>Live offers</h3>
        {data.offers.filter((x) => role === 'admin' || x.createdBy === user.id).map((x) => <Spot key={x.id} className="card row between"><div><b>{x.percent}% OFF · {x.title}</b><br /><small className="muted">{nameOf(x.productId)}</small></div><button className="btn sm ghost" onClick={() => api('/offers/' + x.id, { method: 'DELETE' }).then(reload)}>Remove</button></Spot>)}
        {role === 'admin' && <><h3>Bank offers</h3>{data.bankOffers.map((x) => <Spot key={x.id} className="card row between"><div><b>{x.bank} {x.type} card</b><br /><small className="muted">{x.percent}% off up to {money(x.max)}</small></div><button className="btn sm ghost" onClick={() => api('/bank-offers/' + x.id, { method: 'DELETE' }).then(reload)}>Remove</button></Spot>)}</>}
      </div>
    </div>
  );
}
