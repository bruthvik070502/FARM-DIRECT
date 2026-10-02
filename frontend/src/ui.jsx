import { createContext, useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from './api';

export const Ctx = createContext(() => {});
export const money = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
export const STATUSES = ['Placed', 'Confirmed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered'];
const ICONS = ['📝', '✅', '📦', '🚚', '🛵', '🏠'];
const EMOJI = { Fruits: '🍎', Vegetables: '🥕', Grains: '🌾', Dairy: '🥛' };
export const CATS = ['Fruits', 'Vegetables', 'Grains', 'Dairy', 'Spices', 'Other'];
export const bestOffer = (p, offers) => offers.filter((o) => !o.productId || o.productId === p.id).reduce((a, o) => (o.percent > (a?.percent || 0) ? o : a), null);

// Product image: farmer/admin-uploaded photo first, otherwise a real photo matched to the product name.
export function ProductImg({ p, className = '' }) {
  const [bad, setBad] = useState(false);
  const seed = [...p.name].reduce((a, c) => a + c.charCodeAt(0), 0);
  const src = p.image || `https://loremflickr.com/480/360/${encodeURIComponent(p.name.trim().split(' ').pop())}?lock=${seed}`;
  useEffect(() => setBad(false), [src]);
  return bad ? <div className={'img-fallback ' + className}>{EMOJI[p.category] || '🌱'}</div> : <img className={className} src={src} alt={p.name} loading="lazy" onError={() => setBad(true)} />;
}
export const Skeleton = ({ n = 6, h = 260 }) => <div className="grid">{Array.from({ length: n }, (_, i) => <div key={i} className="skeleton" style={{ height: h }} />)}</div>;
export const Reveal = ({ children, i = 0, className = '' }) => <motion.div className={className} initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.5, delay: (i % 6) * 0.07 }}>{children}</motion.div>;
// Spotlight card: a soft glow follows the cursor
export function Spot({ children, className = '', ...rest }) {
  const move = (e) => { const r = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty('--x', e.clientX - r.left + 'px'); e.currentTarget.style.setProperty('--y', e.clientY - r.top + 'px'); };
  return <div className={'spot ' + className} onMouseMove={move} {...rest}>{children}</div>;
}
export const Modal = ({ onClose, children, wide }) => (
  <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <motion.div className={'modal ' + (wide ? 'wide' : '')} initial={{ scale: 0.92, y: 30, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ type: 'spring', damping: 24, stiffness: 260 }}>
      <button className="x" onClick={onClose} aria-label="Close">✕</button>{children}
    </motion.div>
  </motion.div>
);
export function CountUp({ to, money: m }) {
  const [v, setV] = useState(0);
  useEffect(() => { let f, s; const step = (t) => { s ??= t; const k = Math.min(1, (t - s) / 900); setV(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) f = requestAnimationFrame(step); }; f = requestAnimationFrame(step); return () => cancelAnimationFrame(f); }, [to]);
  return <>{m ? money(v) : v}</>;
}
export const Stat = ({ label, value, money: m, icon, i = 0 }) => <Reveal i={i}><Spot className="stat"><span className="ico">{icon}</span><small>{label}</small><b><CountUp to={value} money={m} /></b></Spot></Reveal>;
export function Timeline({ status, timeline }) {
  const i = STATUSES.indexOf(status);
  return (
    <div className="tl"><div className="tl-bar"><motion.i initial={{ width: 0 }} animate={{ width: `${(i / (STATUSES.length - 1)) * 100}%` }} transition={{ duration: 1, ease: 'easeOut' }} /></div>
      {STATUSES.map((s, k) => { const t = timeline.find((x) => x.status === s); return (
        <div key={s} className={'tl-step ' + (k <= i ? 'done ' : '') + (k === i ? 'now' : '')}><span>{ICONS[k]}</span><b>{s}</b><small>{t ? new Date(t.at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}</small></div>); })}
    </div>
  );
}
export function useFetch(path, poll) {
  const [d, setD] = useState(null), [loading, setL] = useState(true);
  const load = useCallback(() => api(path).then(setD).catch(() => {}).finally(() => setL(false)), [path]);
  useEffect(() => { load(); if (poll) { const t = setInterval(load, poll); return () => clearInterval(t); } }, [load, poll]);
  return [d, load, loading];
}
export const Empty = ({ icon = '🌱', text }) => <div className="empty"><div>{icon}</div><p>{text}</p></div>;
export const Pill = ({ children, tone = '' }) => <span className={'pill ' + tone}>{children}</span>;
export function Table({ cols, rows }) {
  return <div className="tbl"><table><thead><tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr></thead><tbody>{rows.map((r, i) => <motion.tr key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 12) * 0.03 }}>{r.map((c, j) => <td key={j}>{c}</td>)}</motion.tr>)}</tbody></table></div>;
}
export { AnimatePresence, motion };
