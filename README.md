# 🌿 Farm Direct — farmer-to-customer marketplace

Based on the *Farm Direct* proposal deck: Farmer, Customer and Admin roles, role-based JWT auth, listings, cart, orders, delivery tracking, reviews of platform activity.

```
farm-direct/
├── backend/    Express API + JSON-file DB + tests (node:test, supertest)
├── frontend/   React 18 + Vite + framer-motion
├── render.yaml One-click deploy blueprint (Render)
└── package.json  helper scripts
```

## Run in VS Code
```bash
npm run install:all
npm run dev:api     # terminal 1 → http://localhost:5000
npm run dev:web     # terminal 2 → http://localhost:5173
npm test            # backend tests
```
Demo logins: `customer@farm.com / cust123` · `farmer@farm.com / farmer123` · `admin@farm.com / admin123`

## Deploy (single service)
Push to GitHub → Render → *New Blueprint* → pick the repo. The API also serves the built React app.
Any Node host works: `npm run install:all && npm run build && npm start`. Env vars: `JWT_SECRET`, `PORT`, optional `DB_FILE`, `VITE_API` (only if frontend is hosted separately).

## Before real production
- Data is stored in `backend/data/db.json`. On hosts with ephemeral disks, replace `backend/src/db.js` with PostgreSQL/MongoDB.
- Payments are **simulated**. Plug Razorpay/Cashfree into `POST /api/orders`; withdrawals are recorded and released by admin manually.
- Product photos are resized in the browser and stored as data-URLs; move to S3/Cloudinary at scale.

## API summary
`/api/auth/*` · `/api/products` · `/api/offers` · `/api/bank-offers` · `/api/quote` · `/api/orders` (+`/:id/status`) · `/api/farmer/wallet` · `/api/withdrawals` · `/api/admin/{stats,users,payments,withdrawals}`
