import { useState } from 'react';
import { motion, AnimatePresence } from './ui';

const GUIDE = {
  customer: [
    ['🔍 Find produce', 'Type in the search bar (it matches product, farm or category as you type) and use the category chips. Offers show as badges on each product.'],
    ['🛒 Build your cart', 'Tap Add — the button turns into − 1 + so you can change pieces. The cart shows pieces added, price per unit (e.g. ₹40 / 1 kg) and line totals.'],
    ['🏷️ Use offers', 'The biggest discount is highlighted at the top. Open the Offers tab to see all farmer, sitewide and bank offers.'],
    ['💳 Checkout & pay', 'Enter your address and choose UPI app, UPI ID, Card, Net Banking or Cash on Delivery. Pick a bank offer chip (e.g. HDFC credit card) to see the extra discount applied live.'],
    ['📍 Track your order', 'Open My Orders. The tracker moves Placed → Confirmed → Packed → Shipped → Out for Delivery → Delivered and refreshes automatically.'],
  ],
  farmer: [
    ['🌾 List a product', 'Products → Add. Enter name, category, price, unit (e.g. 1 kg) and stock. Upload a real photo of your produce, or leave it empty to get an auto-matched picture.'],
    ['🏷️ Run an offer', 'Offers → choose one of your products and a discount %. Customers see it on the product card immediately.'],
    ['📦 Handle orders', 'Orders shows every order with your items. Move each one through Confirmed, Packed, Shipped, Out for Delivery and Delivered — customers see every update.'],
    ['💰 Withdraw money', 'Wallet shows earnings from delivered orders. Choose Bank Transfer, UPI or Wallet, enter the details and request a withdrawal (min ₹100). Admin releases the payout.'],
  ],
  admin: [
    ['📊 Monitor', 'Overview shows users, orders, revenue, order pipeline and pending payouts.'],
    ['🚚 Track orders & payments', 'Orders lets you update any order status. Payments lists method, bank, card type and paid status for every order.'],
    ['🏦 Pay farmers', 'Withdrawals lists payout requests with the chosen mode — mark them Paid or Rejected.'],
    ['🏷️ Offers', 'Create sitewide or product offers and bank card offers (bank, credit/debit, % and max discount).'],
    ['👥 Govern', 'Users and Products let you remove accounts, fix listings and replace product photos.'],
  ],
};
export default function Manual({ role }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="manual"><h2>How to use Farm Direct</h2><p className="muted">A quick guide for {role}s.</p>
      {GUIDE[role].map(([t, d], i) => (
        <motion.div key={t} className="acc" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
          <button onClick={() => setOpen(open === i ? -1 : i)}><span>{t}</span><motion.em animate={{ rotate: open === i ? 180 : 0 }}>⌄</motion.em></button>
          <AnimatePresence initial={false}>{open === i && <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>{d}</motion.p>}</AnimatePresence>
        </motion.div>
      ))}
    </div>
  );
}
