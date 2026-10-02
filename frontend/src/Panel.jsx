import { useContext, useState } from 'react';
import { api } from './api';
import { Ctx, Stat, Reveal, Spot, Skeleton, Table, Pill, Empty, STATUSES, money, useFetch, motion, AnimatePresence } from './ui';
import { Orders, ProductManager, OfferManager, payLabel } from './Shared';
import Manual from './Manual';

const MODES = { bank: ['🏦 Bank transfer', 'Account number & IFSC'], upi: ['🔗 UPI', 'yourname@bank'], wallet: ['👛 Mobile wallet', 'Wallet mobile number'] };
function Wallet() {
  const toast = useContext(Ctx), [w, reload, loading] = useFetch('/farmer/wallet', 10000), [f, setF] = useState({ amount: '', method: 'upi', detail: '' });
  if (loading) return <Skeleton n={3} h={110} />;
  const go = async (e) => { e.preventDefault(); try { await api('/withdrawals', { method: 'POST', body: f }); toast('Withdrawal requested 💸'); setF({ ...f, amount: '' }); reload(); } catch (er) { toast(er.message, 'err'); } };
  return (<>
    <div className="grid sm"><Stat i={0} icon="💰" label="Available balance" value={w.balance} money /><Stat i={1} icon="📈" label="Total earned" value={w.earned} money /><Stat i={2} icon="⏳" label="In progress orders" value={w.pending} money /><Stat i={3} icon="🏦" label="Withdrawn" value={w.withdrawn} money /></div>
    <div className="split"><form className="card form" onSubmit={go}><h3>Withdraw money</h3>
      <div className="paytabs">{Object.entries(MODES).map(([k, [l]]) => <button type="button" key={k} className={f.method === k ? 'on' : ''} onClick={() => setF({ ...f, method: k })}>{l}</button>)}</div>
      <input type="number" min="100" placeholder="Amount (min ₹100)" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} required />
      <input placeholder={MODES[f.method][1]} value={f.detail} onChange={(e) => setF({ ...f, detail: e.target.value })} required /><button className="btn">Request withdrawal</button></form>
      <div className="stack"><h3>Withdrawal history</h3>{w.withdrawals.length ? w.withdrawals.map((x) => <Spot key={x.id} className="card row between"><div><b>{money(x.amount)}</b> <small className="muted">via {MODES[x.method][0]} · {x.detail}</small><br /><small className="muted">{new Date(x.at).toLocaleString()}</small></div><Pill tone={x.status === 'Paid' ? 'good' : x.status === 'Rejected' ? 'bad' : 'warn'}>{x.status}</Pill></Spot>) : <Empty icon="💸" text="No withdrawals yet" />}</div></div></>);
}

function Overview({ role, data, user }) {
  const [s, , l1] = useFetch(role === 'admin' ? '/admin/stats' : '/farmer/wallet', 10000), [orders] = useFetch('/orders', 10000);
  if (l1 || !s) return <Skeleton n={4} h={110} />;
  if (role === 'farmer') {
    const mine = data.products.filter((p) => p.farmerId === user.id);
    return (<><div className="grid sm"><Stat i={0} icon="💰" label="Balance" value={s.balance} money /><Stat i={1} icon="📦" label="Orders" value={orders?.length || 0} /><Stat i={2} icon="🌾" label="Products" value={mine.length} /><Stat i={3} icon="⚠️" label="Low stock" value={mine.filter((p) => p.stock < 10).length} /></div>
      <h3>Needs attention</h3>{(orders || []).filter((o) => o.status !== 'Delivered').slice(0, 4).map((o) => <Spot key={o.id} className="card row between"><span>#{o.id} · {o.items.map((i) => `${i.name}×${i.qty}`).join(', ')}</span><Pill tone="warn">{o.status}</Pill></Spot>)}</>);
  }
  const max = Math.max(1, ...Object.values(s.byStatus));
  return (<><div className="grid sm"><Stat i={0} icon="💰" label="Revenue" value={s.revenue} money /><Stat i={1} icon="📦" label="Orders" value={s.orders} /><Stat i={2} icon="🧑‍🌾" label="Farmers" value={s.farmers} /><Stat i={3} icon="🛍️" label="Customers" value={s.customers} /><Stat i={4} icon="🌾" label="Products" value={s.products} /><Stat i={5} icon="🏦" label="Pending payouts" value={s.pendingPayouts} /></div>
    <Spot className="card"><h3>Order pipeline</h3>{STATUSES.map((st) => <div key={st} className="bar"><span>{st}</span><div><motion.i initial={{ width: 0 }} animate={{ width: `${((s.byStatus[st] || 0) / max) * 100}%` }} transition={{ duration: 0.9 }} /></div><b>{s.byStatus[st] || 0}</b></div>)}</Spot></>);
}

function AdminTables({ kind }) {
  const toast = useContext(Ctx), path = { payments: '/admin/payments', withdrawals: '/admin/withdrawals', users: '/admin/users' }[kind], [d, reload, l] = useFetch(path, kind === 'users' ? 0 : 8000);
  if (l) return <Skeleton n={2} h={80} />;
  if (!d?.length) return <Empty text="Nothing here yet" />;
  const act = (id, status) => api('/admin/withdrawals/' + id, { method: 'PATCH', body: { status } }).then(() => { toast('Updated'); reload(); });
  if (kind === 'payments') return <Table cols={['Order', 'Customer', 'Amount', 'Method', 'Bank discount', 'Status']} rows={d.map((p) => [p.orderId, p.customer, money(p.total), payLabel(p), p.bankDiscount ? money(p.bankDiscount) : '—', <Pill tone={p.status === 'Paid' ? 'good' : 'warn'}>{p.status}</Pill>])} />;
  if (kind === 'withdrawals') return <Table cols={['Farmer', 'Amount', 'Mode', 'Details', 'Status', 'Action']} rows={d.map((w) => [w.farmerName, money(w.amount), MODES[w.method][0], w.detail, <Pill tone={w.status === 'Paid' ? 'good' : w.status === 'Rejected' ? 'bad' : 'warn'}>{w.status}</Pill>, w.status === 'Processing' ? <span className="row"><button className="btn sm" onClick={() => act(w.id, 'Paid')}>Mark paid</button><button className="btn sm ghost" onClick={() => act(w.id, 'Rejected')}>Reject</button></span> : '—'])} />;
  return <Table cols={['Name', 'Email', 'Role', 'Farm', '']} rows={d.map((u) => [u.name, u.email, <Pill>{u.role}</Pill>, u.farm || '—', u.role !== 'admin' ? <button className="btn sm ghost" onClick={() => confirm('Remove ' + u.name + '?') && api('/admin/users/' + u.id, { method: 'DELETE' }).then(() => { toast('User removed'); reload(); })}>Remove</button> : ''])} />;
}

export default function Panel({ user, data, reload, logout }) {
  const role = user.role, [tab, setTab] = useState('overview');
  const tabs = role === 'admin' ? [['overview', '📊', 'Overview'], ['orders', '🚚', 'Order tracking'], ['payments', '💳', 'Payments'], ['withdrawals', '🏦', 'Withdrawals'], ['users', '👥', 'Users'], ['products', '🌾', 'Products'], ['offers', '🏷️', 'Offers'], ['manual', '📘', 'User manual']]
    : [['overview', '📊', 'Overview'], ['products', '🌾', 'My products'], ['offers', '🏷️', 'Offers'], ['orders', '📦', 'Orders'], ['wallet', '💰', 'Wallet & withdraw'], ['manual', '📘', 'User manual']];
  const v = { role, user, data, reload };
  return (
    <div className="shell"><aside className="side"><b className="logo">🌿 Farm Direct</b><small>{role === 'admin' ? 'Admin console' : user.farm}</small>
      {tabs.map(([k, ic, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{tab === k && <motion.i layoutId="pill" className="pillbg" />}<span>{ic} {l}</span></button>)}
      <button className="out" onClick={logout}>↩ Logout</button></aside>
      <main className="content"><h2>{tabs.find((t) => t[0] === tab)[2]}</h2>
        <AnimatePresence mode="wait"><motion.div key={tab} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
          {tab === 'overview' && <Overview {...v} />}{tab === 'orders' && <Orders role={role} />}{tab === 'wallet' && <Wallet />}
          {tab === 'products' && <ProductManager {...v} />}{tab === 'offers' && <OfferManager {...v} />}{tab === 'manual' && <Manual role={role} />}
          {['payments', 'withdrawals', 'users'].includes(tab) && <AdminTables kind={tab} />}
        </motion.div></AnimatePresence></main></div>
  );
}
