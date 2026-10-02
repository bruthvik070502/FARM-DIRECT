import { useContext, useEffect, useState } from 'react';
import { useScroll, useTransform } from 'framer-motion';
import { api } from './api';
import { Ctx, ProductImg, Skeleton, Reveal, Spot, Modal, Empty, bestOffer, money, motion, AnimatePresence } from './ui';
import { Orders } from './Shared';
import Manual from './Manual';

const BANKS = ['HDFC Bank', 'ICICI Bank', 'SBI', 'Axis Bank', 'Kotak Bank'];
const Stepper = ({ n, add, dec }) => (
  <AnimatePresence mode="wait" initial={false}>
    {n ? <motion.div key="s" className="stepper" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }}><button onClick={dec}>−</button><motion.b key={n} initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>{n}</motion.b><button onClick={add}>+</button></motion.div>
      : <motion.button key="a" className="btn add" whileTap={{ scale: 0.92 }} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} onClick={add}>Add +</motion.button>}
  </AnimatePresence>
);

function Card({ p, offers, n, add, dec, i }) {
  const off = bestOffer(p, offers), price = off ? Math.round(p.price * (1 - off.percent / 100)) : p.price;
  return (
    <Reveal i={i}><Spot className={'card pcard ' + (p.stock === 0 ? 'sold' : '')}>
      <div className="imgwrap"><ProductImg p={p} className="pimg" />{off && <span className="badge">{off.percent}% OFF</span>}{n > 0 && <span className="inc">{n} in cart</span>}</div>
      <div className="pbody"><h4>{p.name}</h4><small className="muted">🌱 {p.farm}</small>
        <div className="price"><b>{money(price)}</b>{off && <s>{money(p.price)}</s>}<span>/ {p.unit}</span></div>
        {off && <small className="offtag">🏷️ {off.title}</small>}
        {p.stock === 0 ? <Pill>Sold out</Pill> : <Stepper n={n} add={() => add(p)} dec={() => dec(p)} />}
      </div></Spot></Reveal>
  );
}

function Shop({ data, loading, cart, add, dec, top }) {
  const [q, setQ] = useState(''), [cat, setCat] = useState('All'), { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, 140]), y2 = useTransform(scrollY, [0, 500], [0, -60]);
  const cats = ['All', ...new Set(data.products.map((p) => p.category))], s = q.trim().toLowerCase();
  const list = data.products.filter((p) => (cat === 'All' || p.category === cat) && `${p.name} ${p.farm} ${p.category}`.toLowerCase().includes(s));
  return (<>
    <section className="hero"><motion.div className="blob b1" style={{ y: y1 }} /><motion.div className="blob b2" style={{ y: y2 }} />
      <div className="hero-in"><motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>{'Fresh from the farm,'.split(' ').map((w, i) => <motion.span key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.12 }}>{w}&nbsp;</motion.span>)}<em>no middlemen.</em></motion.h1>
        <p>Buy directly from farmers. Fair prices, full traceability.</p>
        {top && <motion.div className="topoffer" animate={{ scale: [1, 1.03, 1] }} transition={{ repeat: Infinity, duration: 2.4 }}>🔥 Top deal: <b>{top.percent}% OFF</b> · {top.title}</motion.div>}</div></section>
    <div className="marquee"><div>{[...data.offers, ...data.offers].map((o, i) => <span key={i}>🏷️ {o.title} — {o.percent}% off</span>)}</div></div>
    <div className="container">
      {/* Search input lives here, at module level, so it never loses focus while typing */}
      <div className="searchbar"><span>🔍</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search mango, tomato, farm name…" autoComplete="off" />{q && <button onClick={() => setQ('')}>✕</button>}</div>
      <div className="chips cats">{cats.map((c) => <button key={c} className={'chip ' + (c === cat ? 'on' : '')} onClick={() => setCat(c)}>{c}</button>)}</div>
      {loading ? <Skeleton /> : list.length ? <div className="grid">{list.map((p, i) => <Card key={p.id} p={p} i={i} offers={data.offers} n={cart[p.id] || 0} add={add} dec={dec} />)}</div> : <Empty icon="🔎" text={`No produce found for “${q}”`} />}
    </div></>);
}

function OffersPage({ data }) {
  return (<div className="container"><h2>Offers for you</h2>
    <div className="grid sm">{data.offers.map((o, i) => { const p = data.products.find((x) => x.id === o.productId); return <Reveal key={o.id} i={i}><Spot className="card offer">{p ? <ProductImg p={p} className="oimg" /> : <div className="img-fallback oimg">🛍️</div>}<div><span className="badge static">{o.percent}% OFF</span><h4>{o.title}</h4><small className="muted">{p ? `On ${p.name} from ${p.farm}` : 'Sitewide — applies to every product'}</small></div></Spot></Reveal>; })}</div>
    <h2>Bank offers at checkout</h2>
    <div className="grid sm">{data.bankOffers.map((b, i) => <Reveal key={b.id} i={i}><Spot className="card bank"><span className="ico">🏦</span><div><h4>{b.bank} {b.type} card</h4><small className="muted">{b.percent}% off, up to {money(b.max)}</small></div></Spot></Reveal>)}</div></div>);
}

function Checkout({ items, data, onClose, onDone }) {
  const toast = useContext(Ctx);
  const [address, setAddress] = useState(''), [method, setMethod] = useState('upi_app'), [app, setApp] = useState('Google Pay'), [upi, setUpi] = useState('');
  const [card, setCard] = useState({ num: '', exp: '', cvv: '', bank: 'HDFC Bank', type: 'credit' }), [nb, setNb] = useState('SBI');
  const [q, setQ] = useState(null), [done, setDone] = useState(null), [busy, setBusy] = useState(false);
  const payment = { method, bank: method === 'card' ? card.bank : method === 'netbanking' ? nb : undefined, cardType: method === 'card' ? card.type : undefined, detail: method === 'upi_app' ? app : method === 'upi_id' ? upi : method === 'card' ? card.num.replace(/\s/g, '') : undefined };
  const body = { items: items.map((i) => ({ productId: i.p.id, qty: i.qty })), payment };
  useEffect(() => { api('/quote', { method: 'POST', body }).then(setQ).catch((e) => toast(e.message, 'err')); }, [method, card.bank, card.type]);
  const pay = async () => {
    if (method === 'card' && (card.num.replace(/\s/g, '').length < 12 || !card.exp || card.cvv.length < 3)) return toast('Enter complete card details', 'err');
    setBusy(true);
    try { const o = await api('/orders', { method: 'POST', body: { ...body, address } }); setDone(o); onDone(); } catch (e) { toast(e.message, 'err'); } setBusy(false);
  };
  const METHODS = [['upi_app', '📱', 'UPI Apps'], ['upi_id', '🔗', 'UPI ID'], ['card', '💳', 'Card'], ['netbanking', '🏦', 'Net Banking'], ['cod', '💵', 'Cash on Delivery']];
  if (done) return <Modal onClose={onClose}><div className="success"><motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1 }}>✅</motion.div><h2>Order placed!</h2><p>Order <b>#{done.id}</b> · {money(done.total)}</p><button className="btn" onClick={() => { onClose(); onDone('orders'); }}>Track my order</button></div></Modal>;
  return (
    <Modal onClose={onClose} wide><h2>Checkout</h2>
      <div className="co"><div>
        <textarea rows="2" placeholder="Delivery address" value={address} onChange={(e) => setAddress(e.target.value)} />
        <h4>Bank offers</h4><div className="chips">{data.bankOffers.map((b) => <button key={b.id} className={'chip ' + (q?.bankOffer?.id === b.id ? 'on' : '')} onClick={() => { setMethod('card'); setCard({ ...card, bank: b.bank, type: b.type }); }}>{b.bank} {b.type} · {b.percent}% off (max {money(b.max)})</button>)}</div>
        <h4>Payment method</h4><div className="paytabs">{METHODS.map(([k, ic, l]) => <button key={k} className={method === k ? 'on' : ''} onClick={() => setMethod(k)}>{ic}<span>{l}</span></button>)}</div>
        <AnimatePresence mode="wait"><motion.div key={method} className="payform" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
          {method === 'upi_app' && <div className="chips">{['Google Pay', 'PhonePe', 'Paytm', 'BHIM'].map((a) => <button key={a} className={'chip ' + (app === a ? 'on' : '')} onClick={() => setApp(a)}>{a}</button>)}</div>}
          {method === 'upi_id' && <input placeholder="yourname@bank" value={upi} onChange={(e) => setUpi(e.target.value)} />}
          {method === 'card' && <><input placeholder="Card number" inputMode="numeric" maxLength={19} value={card.num} onChange={(e) => setCard({ ...card, num: e.target.value.replace(/[^\d ]/g, '') })} />
            <div className="row"><input placeholder="MM/YY" maxLength={5} value={card.exp} onChange={(e) => setCard({ ...card, exp: e.target.value })} /><input placeholder="CVV" type="password" maxLength={4} value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value })} /></div>
            <div className="row"><select value={card.bank} onChange={(e) => setCard({ ...card, bank: e.target.value })}>{BANKS.map((b) => <option key={b}>{b}</option>)}</select><select value={card.type} onChange={(e) => setCard({ ...card, type: e.target.value })}><option value="credit">Credit</option><option value="debit">Debit</option></select></div></>}
          {method === 'netbanking' && <select value={nb} onChange={(e) => setNb(e.target.value)}>{BANKS.map((b) => <option key={b}>{b}</option>)}</select>}
          {method === 'cod' && <p className="muted">Pay in cash when your order arrives.</p>}
        </motion.div></AnimatePresence></div>
        <aside className="summary"><h4>Order summary</h4>{items.map((i) => <div key={i.p.id} className="row between"><span>{i.p.name} × {i.qty}</span><span>{money(i.p.price * i.qty)}</span></div>)}
          {q && <><hr /><div className="row between"><span>Subtotal</span><span>{money(q.subtotal)}</span></div>{q.offerDiscount > 0 && <div className="row between save"><span>Offers</span><span>−{money(q.offerDiscount)}</span></div>}{q.bankDiscount > 0 && <div className="row between save"><span>{q.bankOffer.bank} offer</span><span>−{money(q.bankDiscount)}</span></div>}<div className="row between"><span>Delivery</span><span>{q.delivery ? money(q.delivery) : 'FREE'}</span></div><hr /><div className="row between big"><b>Total</b><b>{money(q.total)}</b></div></>}
          <button className="btn" disabled={busy || !q} onClick={pay}>{busy ? 'Processing…' : method === 'cod' ? 'Place order' : `Pay ${q ? money(q.total) : ''}`}</button><small className="muted">Demo payments — no real money is charged.</small></aside></div>
    </Modal>
  );
}

export default function Customer({ user, data, reload, loading, logout }) {
  const toast = useContext(Ctx);
  const [tab, setTab] = useState('shop'), [cart, setCart] = useState({}), [drawer, setDrawer] = useState(false), [co, setCo] = useState(false);
  const add = (p) => (cart[p.id] || 0) >= p.stock ? toast('No more stock available', 'err') : setCart((c) => ({ ...c, [p.id]: (c[p.id] || 0) + 1 }));
  const dec = (p) => setCart((c) => { const n = { ...c, [p.id]: (c[p.id] || 0) - 1 }; if (n[p.id] <= 0) delete n[p.id]; return n; });
  const items = Object.entries(cart).map(([id, qty]) => ({ p: data.products.find((x) => x.id === id), qty })).filter((x) => x.p);
  const count = items.reduce((s, i) => s + i.qty, 0);
  const lineTotal = (i) => { const o = bestOffer(i.p, data.offers); return Math.round(i.p.price * i.qty * (1 - (o?.percent || 0) / 100)); };
  const top = data.offers.reduce((a, o) => (o.percent > (a?.percent || 0) ? o : a), null);
  return (<>
    <nav className="top"><b className="logo">🌿 Farm Direct</b><div className="tabs">{[['shop', 'Shop'], ['offers', 'Offers'], ['orders', 'My Orders'], ['manual', 'How to use']].map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
      <div className="row"><button className="cartbtn" onClick={() => setDrawer(true)}>🛒<AnimatePresence>{count > 0 && <motion.span key={count} initial={{ scale: 0 }} animate={{ scale: 1 }}>{count}</motion.span>}</AnimatePresence></button><button className="btn sm ghost" onClick={logout}>Logout</button></div></nav>
    <AnimatePresence mode="wait"><motion.main key={tab} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
      {tab === 'shop' && <Shop data={data} loading={loading} cart={cart} add={add} dec={dec} top={top} />}
      {tab === 'offers' && <OffersPage data={data} />}
      {tab === 'orders' && <div className="container"><h2>My orders</h2><Orders role="customer" /></div>}
      {tab === 'manual' && <div className="container"><Manual role="customer" /></div>}
    </motion.main></AnimatePresence>
    <AnimatePresence>{drawer && <><motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawer(false)} />
      <motion.aside className="drawer" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 260 }}>
        <div className="row between"><h3>Your cart · {count} piece{count !== 1 && 's'}</h3><button className="x static" onClick={() => setDrawer(false)}>✕</button></div>
        {items.length ? items.map((i) => <motion.div layout key={i.p.id} className="line"><ProductImg p={i.p} className="thumb" /><div className="grow"><b>{i.p.name}</b><small className="muted">{money(i.p.price)} / {i.p.unit} · {i.qty} × {i.p.unit}</small><Stepper n={i.qty} add={() => add(i.p)} dec={() => dec(i.p)} /></div><b>{money(lineTotal(i))}</b></motion.div>) : <Empty icon="🛒" text="Your cart is empty" />}
        {items.length > 0 && <div className="foot"><div className="row between big"><span>Total</span><b>{money(items.reduce((s, i) => s + lineTotal(i), 0))}</b></div><button className="btn" onClick={() => { setDrawer(false); setCo(true); }}>Proceed to checkout →</button></div>}
      </motion.aside></>}</AnimatePresence>
    <AnimatePresence>{co && <Checkout items={items} data={data} onClose={() => setCo(false)} onDone={(go) => { if (go) setTab(go); else { setCart({}); reload(); } }} />}</AnimatePresence>
  </>);
}
