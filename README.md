# Restaurant POS & Management System (RMS)

A professional, high-performance Restaurant Management & Point of Sale (POS) system designed for desktop cashier terminals and modern restaurant operations.

---

## 🎯 Project Overview & Purpose

The system provides an end-to-end operational suite for fast-casual and dine-in restaurants:
- **Sales / POS**: Rapid billing, menu exploration, portion & add-on selection, order management, and instant invoice printing.
- **Items / Menu**: Categories, items, add-on groups, price/unit management, and photo handling.
- **Dashboard**: Real-time sales analytics, top dishes, active prep tracking, and customer flow.
- **Reports**: Auditable sales, net revenue, tax, and full invoice reversal reconciliation.
- **Settings**: Business branding, tax configurations, invoice prefixing, and safe data management.

Visual design adheres with high fidelity (~90%) to the reference UI specification:
- **Brand primary**: Coral/Orange accent (`#FF5C28`)
- **Surfaces**: Pure white cards with subtle borders (`#EEF2F6`) and soft shadows
- **Background**: Very light slate (`#F8FAFC`)
- **Typography**: Compact, clean 'Plus Jakarta Sans' with dark navy/charcoal headers (`#0F172A`)
- **Icons**: Lucide React outline icons exclusively

---

## 🚀 Current Phase: Backend REST API + MongoDB Atlas (All 7 Modules Live & Verified)

> **Backend Architecture Update:**  
> The Express.js backend API and MongoDB Atlas connection are now **100% operational** with complete test coverage across all 7 modules:  
> 1. `/api/categories` — Category management, unit defaults, keywords, and seed engine.  
> 2. `/api/items` — Menu items, photo URLs, kg/portion pricing, and dynamic add-on links.  
> 3. `/api/addons` — 22 master add-ons across 6 restaurant categories (Sauces, Sides, Extra Protein, Toppings, Drinks).  
> 4. `/api/orders` — POS checkout, immutable invoice snapshots, sequential numbering (`INV-0001`), and cash validation.  
> 5. `/api/reversals` — Auditable non-destructive invoice reversals with financial impact tracking.  
> 6. `/api/reports` & `/api/dashboard` — Live reconciliation for all 8 PRD KPI cards and chart analytics.  
> 7. `/api/settings` — Business branding, tax configurations, and Danger Zone `DELETE ALL DATA` safeguard.

---

## 📁 Repository Structure

```text
/
├── frontend/
│   ├── public/
│   │   └── favicon.svg
│   ├── src/
│   │   ├── app/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── layout/          # Sidebar, PageHeader, AppLayout
│   │   │   └── ui/              # Button, IconButton, Card, KPICard, Input, SearchInput,
│   │   │                        # Select, Tabs, Badge, Modal, Drawer, DataTable,
│   │   │                        # EmptyState, ConfirmDialog, FormField
│   │   ├── domain/
│   │   │   ├── calculations/    # Pure decimal-safe financial & portion math
│   │   │   ├── rules/           # Category suggestion & unit defaults
│   │   │   └── selectors/       # Revenue & KPI aggregations
│   │   ├── features/
│   │   │   ├── dashboard/       # Dashboard widgets & metrics
│   │   │   ├── menu/            # Categories, items, add-ons
│   │   │   ├── pos/             # POS cart & checkout drawer
│   │   │   ├── reports/         # Detailed reporting views
│   │   │   └── settings/        # Configuration & danger zone
│   │   ├── hooks/               # Custom reusable React hooks
│   │   ├── pages/               # Top-level route pages
│   │   ├── services/
│   │   │   ├── adapters/        # Future API adapters
│   │   │   ├── persistence/     # Local persistence abstraction
│   │   │   └── repositories/    # IRepository contracts
│   │   ├── store/               # Lightweight Zustand store
│   │   ├── styles/              # Design system tokens & global CSS
│   │   ├── utils/               # Class merging (cn) & helpers
│   │   ├── App.jsx              # Routing & route configuration
│   │   └── main.jsx
│   ├── .env.example
│   ├── .gitignore
│   ├── package.json
│   └── vite.config.js
├── prdfile.md                   # Product Requirements Document
├── trdfile.md                   # Technical Requirements Document
├── agent.md                     # Agent engineering instructions
├── skills.md                    # Engineering skill playbook
└── README.md
```

---

## 🛠️ Tech Stack (Frontend)

- **Framework**: React 19 + Vite
- **Routing**: React Router v7 (`react-router-dom`)
- **Styling**: Tailwind CSS v4 + `@tailwindcss/vite`
- **Icons**: Lucide React
- **Global State**: Zustand
- **Forms & Validation**: React Hook Form + Zod
- **Date Handling**: date-fns
- **Charts**: Recharts
- **Class Utilities**: `clsx` + `tailwind-merge`

---

## 💻 Local Setup & Development

### Prerequisites
- Node.js (v18+ recommended)
- npm

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Start Local Development Server
```bash
npm run dev
```
The application will launch at `http://localhost:5173`.

### 3. Run Lint Checks
```bash
npm run lint
```

### 4. Build for Production
```bash
npm run build
```

---

## 🗺️ Application Routes

| Route | Page | Purpose |
| :--- | :--- | :--- |
| `/dashboard` | Dashboard | Sales overview, KPI cards, recent activity, top dishes |
| `/pos` | Sales / POS | Food catalogue, quick portion selection, slide-in order drawer |
| `/menu` | Items / Menu | Menu table, category filters, "Add New Food Item" modal |
| `/reports` | Reports | Sales/Revenue/Reversal tabs, Daily Sales chart, category donut |
| `/settings` | Settings | Business profile, tax config, invoice prefixes, Danger Zone reset |
| `/` | Redirect | Automatically redirects to `/dashboard` |

---

## 🛡️ Git Safety Guidelines
- Neither `node_modules` nor production `dist/` or `.env` files are tracked.
- Separate `.gitignore` configurations are active for `/frontend` and `/backend`.
