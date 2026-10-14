Restaurant POS & Management System — TRD
Version: 1.0
Architecture: Frontend-first MERN, serverless-ready
Deployment: GitHub → Vercel
1. Repository Structure
restaurant-management-system/
├─ frontend/
│  ├─ src/
│  ├─ public/
│  ├─ .env.example
│  ├─ .gitignore
│  └─ package.json
├─ backend/
│  ├─ api/
│  ├─ src/
│  ├─ .env.example
│  ├─ .gitignore
│  └─ package.json
├─ prdfile.md
├─ trdfile.md
├─ agent.md
├─ skills.md
└─ README.md
Current phase: implement /frontend only. Reserve /backend, but do not build backend business logic until explicitly requested.
2. Stack
Frontend:
- React.js + Vite
- React Router
- Tailwind CSS or equivalent token-driven styling
- Zustand (or similarly lightweight state store)
- React Hook Form + Zod
- Recharts
- Lucide React
- date-fns
- nanoid/UUID
- IndexedDB helper
Backend later:
- Node.js
- Express.js
- MongoDB Atlas
- Mongoose
- Serverless-compatible Vercel API
Use latest stable mutually compatible package versions at implementation time.
3. Vercel Model
Recommended: one GitHub repository with two Vercel projects.
Frontend Vercel project:
- Root: /frontend
- Vite production build
Backend Vercel project later:
- Root: /backend
- Serverless API routes
- Express adapted for serverless execution
- MongoDB connection reuse/caching
Never depend on long-running in-memory server state or local server filesystem persistence.
4. Frontend Architecture
src/
├─ app/
├─ assets/
├─ components/
│  ├─ ui/
│  ├─ layout/
│  ├─ charts/
│  └─ feedback/
├─ features/
│  ├─ dashboard/
│  ├─ pos/
│  ├─ menu/
│  │  ├─ categories/
│  │  ├─ items/
│  │  └─ addons/
│  ├─ reports/
│  └─ settings/
├─ domain/
│  ├─ calculations/
│  ├─ rules/
│  └─ selectors/
├─ services/
│  ├─ repositories/
│  ├─ persistence/
│  └─ adapters/
├─ store/
├─ hooks/
├─ utils/
└─ styles/
Pages stay thin. Business calculations live in domain utilities. Data access stays behind repositories.
5. Design System
Centralize:
- orange/coral primary
- white surfaces
- light-gray background
- dark text
- muted text
- semantic success/warning/danger
- border color
- spacing
- radii
- shadows
- typography
- icon sizes
- input/button heights
Reusable components:
Sidebar, PageHeader, Card, KPI Card, Button, Input, Search, Select, Tabs, Badge, Modal, Drawer, DataTable, EmptyState, ConfirmDialog, DateRangeFilter, ChartCard, FormField, ImageUploader.
6. Core Frontend Models
Category
{
  id, name, slug, status,
  defaultUnitType, baseUnit,
  keywords: [],
  defaultPortions: [{ label, quantityInBaseUnit }],
  defaultAddonIds: [],
  createdAt, updatedAt
}
AddOn
{
  id, name, price, status,
  categoryIds: [],
  itemIds: [],
  createdAt, updatedAt
}
MenuItem
{
  id, name, categoryId, description,
  imageRef, status,
  basePrice, unitType, baseUnit,
  portionOptions: [], addonIds: [],
  createdAt, updatedAt
}
OrderLine
{
  id, itemId,
  itemNameSnapshot, itemImageSnapshot,
  categoryIdSnapshot,
  pricingMode,
  baseUnitSnapshot,
  selectedWeightGrams,
  basePriceSnapshot,
  addonSnapshots: [],
  quantity,
  unitPrice,
  lineSubtotal,
  note
}
Order
{
  id, invoiceNumber,
  status,
  orderType,
  lines: [],
  subtotal,
  discountType,
  discountValue,
  discountAmount,
  taxableAmount,
  taxRateSnapshot,
  taxAmount,
  grandTotal,
  paymentMethod,
  amountReceived,
  changeAmount,
  createdAt,
  completedAt
}
Reversal
{
  id,
  originalOrderId,
  originalInvoiceNumber,
  reason,
  subtotalReversed,
  discountReversed,
  taxReversed,
  totalReversedIncludingTax,
  reversedAt
}
Historical invoices must rely on snapshots.
7. Category Suggestion Engine
Implement a deterministic function:
suggestCategory(itemName, categories)
Algorithm:
1. normalize case/spacing/punctuation
2. compare with category names
3. compare with category keywords
4. rank exact/longest/high-confidence match
5. auto-select only one safe result
6. otherwise return null
7. user can always override
No uncontrolled guesswork.
8. Unit Rules
Category provides default unit behavior.
- Burger → piece
- Biryani → weight/kg
- Pizza → piece/size
- Drink → configured unit
Item can override category defaults.
9. Calculation Utilities
Create pure functions such as:
- calculateWeightPrice
- calculateWeightFromAmount
- calculateAddonTotal
- calculateLineSubtotal
- calculateOrderSubtotal
- calculateDiscount
- calculateTax
- calculateGrandTotal
- calculateChange
- calculateReversalImpact
- calculateDashboardMetrics
Kg pricing:
price = basePricePerKg × grams / 1000
Custom rupee amount:
grams = enteredAmount / basePricePerKg × 1000
Order:
line total = main item + add-ons
subtotal = sum(lines × qty)
discounted subtotal = max(0, subtotal - discount)
tax = taxable base × tax rate
grand total = discounted subtotal + tax
Use integer paisa or a safe decimal strategy. Do not scatter floating-point math across components.
10. Add-on Resolver
Implement:
getCompatibleAddons(item, category, addons)
Combine:
1. direct item assignments
2. category assignments
3. category default add-ons
4. deduplicate
5. active only
11. State
Suggested store slices:
- categories
- items
- add-ons
- current cart/order
- order history
- reversals
- settings
- report/dashboard filters
Do not store duplicated KPI totals; derive them with selectors.
12. Persistence
Repository interfaces:
- CategoryRepository
- ItemRepository
- AddonRepository
- OrderRepository
- ReversalRepository
- SettingsRepository
Frontend adapter:
- IndexedDB for data/images where practical
- localStorage for small settings if needed
Later adapter:
- REST API
13. Image Upload
- device/gallery picker
- image MIME validation
- max-size validation
- preview
- preserve aspect ratio
- food thumbnails use appropriate cover behavior
- persist Blob/reference via frontend storage
Later use cloud storage URL. Do not put large base64 images into MongoDB documents.
14. Charts
Use one chart library consistently.
Required:
- Daily Sales
- Revenue Trend
- Sales by Category
- Payment Method Breakdown
- Reversal Trend
Charts must respond to filters, use real transaction data, show tooltips and handle no-data state.
15. Invoice
Dedicated invoice component + print stylesheet.
- Preview
- Browser print
- PDF-friendly output
- Sequential demo invoice number (e.g. INV-000001)
Backend later enforces uniqueness.
16. Reversal
A reversal is a separate event linked to a completed invoice. Never delete the invoice. V1 supports full reversal only.
17. Delete All Data
Settings → Data Management → Danger Zone.
1. Warning
2. Typed DELETE ALL DATA
3. Disabled final action until exact match
4. Second confirmation
5. Clear app operational repositories
6. Clear cart
7. Rehydrate to empty state
8. Keep app functional
9. No automatic demo reseed
18. Validation
Category:
- name required
- unique normalized name
- valid unit
Item:
- name required
- category required
- price > 0
- unit required
- valid image
Add-on:
- name required
- price >= 0
Sale:
- at least one line
- valid totals
- valid payment
- cash received >= grand total
19. Testing
Minimum unit tests:
- 250g/500g/750g/1kg pricing
- custom Rs → grams
- add-on totals
- fixed/% discount
- tax
- cash change
- reversal impact
- dashboard metrics
- category suggestion
- add-on resolver
- data reset
20. Quality Gates
After every batch:
- lint
- relevant tests
- production build
- manual verification of requested route/flow
A batch is not complete if build fails, console errors remain, controls are dead, calculations are duplicated, or reference design is materially ignored.
21. Backend Later
When explicitly started:
- Express REST API
- MongoDB Atlas/Mongoose
- stateless serverless handlers
- cached DB connection
- validation
- secure headers/CORS/rate limiting
- authentication/RBAC when introduced
- audit fields
- idempotency for sale completion/reversal
- no destructive deletion of financial history
Potential groups:
/api/categories, /api/items, /api/addons, /api/orders, /api/reversals, /api/reports, /api/settings.