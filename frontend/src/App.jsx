import { useCallback, useEffect, useState } from 'react';
import { api, setToken } from './api';
import { Ctx, motion, AnimatePresence } from './ui';
import Customer from './Customer';
import Panel from './Panel';
import Manual from './Manual';

function Auth({ onAuth, toast }) {
  const [mode, setMode] = useState('login'), [f, setF] = useState({ name: '', email: '', password: '', role: 'customer', farm: '' }), [guide, setGuide] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => { e.preventDefault(); try { const r = await api('/auth/' + mode, { method: 'POST', body: f }); setToken(r.token); onAuth(r.user); } catch (er) { toast(er.message, 'err'); } };
  const demo = (email, password) => setF({ ...f, email, password });
  return (
    <div className="auth"><div className="blob b1" /><div className="blob b2" />
      <motion.div className="card authbox" initial={{ opacity: 0, y: 40, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', damping: 20 }}>
        <h1>🌿 Farm Direct</h1><p className="muted">A direct farmer-to-customer marketplace</p>
        <div className="paytabs two"><button className={mode === 'login' ? 'on' : ''} onClick={() => setMode('login')}>Login</button><button className={mode === 'register' ? 'on' : ''} onClick={() => setMode('register')}>Sign up</button></div>
        <form className="form" onSubmit={submit}>
          {mode === 'register' && <><div className="paytabs two"><button type="button" className={f.role === 'customer' ? 'on' : ''} onClick={() => setF({ ...f, role: 'customer' })}>🛍️ Customer</button><button type="button" className={f.role === 'farmer' ? 'on' : ''} onClick={() => setF({ ...f, role: 'farmer' })}>🧑‍🌾 Farmer</button></div>
            <input placeholder="Full name" value={f.name} onChange={set('name')} required />{f.role === 'farmer' && <input placeholder="Farm name" value={f.farm} onChange={set('farm')} />}</>}
          <input type="email" placeholder="Email" value={f.email} onChange={set('email')} required /><input type="password" placeholder="Password (6+ chars)" value={f.password} onChange={set('password')} required />
          <button className="btn">{mode === 'login' ? 'Login' : 'Create account'}</button></form>
        <div className="chips demo"><small>Try demo:</small><button className="chip" onClick={() => demo('customer@farm.com', 'cust123')}>Customer</button><button className="chip" onClick={() => demo('farmer@farm.com', 'farmer123')}>Farmer</button><button className="chip" onClick={() => demo('admin@farm.com', 'admin123')}>Admin</button></div>
        <button className="link" onClick={() => setGuide(!guide)}>📘 How to use Farm Direct</button>{guide && <Manual role="customer" />}
      </motion.div></div>
  );
}

export default function App() {
  const [user, setUser] = useState(null), [boot, setBoot] = useState(!!localStorage.getItem('fd_token')), [toasts, setToasts] = useState([]);
  const [data, setData] = useState({ products: [], offers: [], bankOffers: [] }), [loading, setLoading] = useState(true);
  const toast = useCallback((m, t = 'ok') => { const id = Math.random(); setToasts((x) => [...x, { id, m, t }]); setTimeout(() => setToasts((x) => x.filter((y) => y.id !== id)), 3200); }, []);
  const reload = useCallback(() => Promise.all([api('/products'), api('/offers'), api('/bank-offers')]).then(([products, offers, bankOffers]) => setData({ products, offers, bankOffers })).finally(() => setLoading(false)), []);
  useEffect(() => { if (boot) api('/me').then(setUser).catch(() => setToken(null)).finally(() => setBoot(false)); }, []);
  useEffect(() => { if (user) reload(); }, [user, reload]);
  const logout = () => { setToken(null); setUser(null); };
  const P = { user, data, reload, loading, logout };
  return (
    <Ctx.Provider value={toast}>
      {boot ? <div className="boot">🌿</div> : !user ? <Auth onAuth={setUser} toast={toast} /> : user.role === 'customer' ? <Customer {...P} /> : <Panel {...P} />}
      <div className="toasts"><AnimatePresence>{toasts.map((t) => <motion.div key={t.id} className={'toast ' + t.t} initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 60 }}>{t.m}</motion.div>)}</AnimatePresence></div>
    </Ctx.Provider>
  );
}
