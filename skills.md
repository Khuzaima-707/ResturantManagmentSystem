Restaurant POS Project Skills & Engineering Playbook
1. React Engineering
Apply feature-based React architecture, reusable layouts/components, React Router, hooks, centralized state only where needed, responsive UI and clean production builds. Do not build the whole app in one component.
2. Reference-Driven UI Reproduction
For each supplied screenshot, inspect layout hierarchy, spacing, typography, radii, borders, shadows, action placement and density. Reproduce the visual language with shared components while using the user's own business data.
3. Design System
Centralize color, typography, spacing, radius, shadow, border, icon, input and button tokens. Every new module must reuse them.
4. Forms
Use schema validation, field errors, sensible defaults, disabled invalid submit, safe numeric parsing, image validation, keyboard accessibility, cancel/close behavior and strong dangerous-action confirmations.
5. Menu Rule Engine
Implement deterministic category intelligence:
- normalize item text
- match category names/keywords
- auto-suggest safe category
- derive default unit
- derive default portions
- derive default add-ons
- allow manual override
Do not require an AI API for these basic rules.
6. Pricing & Measurement
Weight items:
portionPrice = basePricePerKg × grams / 1000
Custom rupee amount:
grams = enteredRupees / basePricePerKg × 1000
Piece items:
price = base price × quantity
Use one decimal-safe financial strategy everywhere.
7. POS Cart
Support:
- configured item additions
- distinct configurations of same item
- quantity +/-
- remove
- clear cart
- notes
- add-on snapshots
- weight/portion snapshots
- subtotal
- discount
- tax
- grand total
- payment method
- amount received
- change
Cart-line identity must include configuration, not only item ID.
8. Financial Calculations
Create pure testable helpers for line base price, add-on total, subtotal, discount, taxable base, tax, grand total, amount received, change, reversal impact, net revenue and dashboard/report aggregates.
9. Reports
Build reports from canonical transactions. Support date/category/payment/order-type/status filters, grouping, aggregation, top items, trend datasets and reversal reconciliation. Tables and charts must share the same filtered source.
10. Charting
Use one chart library consistently. Charts must be responsive, have tooltips, clear labels, currency formatting and no-data states. No random/demo-only graph values after transactions exist.
11. Persistence
Frontend-first persistence should use repository interfaces. Prefer IndexedDB for records/images and localStorage only for small preferences. Include storage version/migration handling and a reset service.
12. Image Handling
Implement gallery/file upload, MIME/size validation, preview, aspect-ratio-safe rendering, replace/remove behavior and IndexedDB Blob persistence. Later backend should move images to cloud object storage rather than MongoDB base64 fields.
13. Invoice
Implement invoice numbering, invoice snapshots, preview, print layout, PDF-friendly output, payment details, change display, reversal action and New Sale flow.
14. Reversal
V1 workflow:
1. open completed invoice
2. Reverse Invoice
3. warning
4. reason required
5. confirm
6. create linked reversal record
7. update report/dashboard selectors
8. keep original invoice readable
Never delete the invoice.
15. Data Reset
Danger Zone reset must require explicit typed confirmation, clear repositories/cart, reinitialize to an empty usable state and remain empty after refresh until the user adds data.
16. QA
Every batch checks:
- route
- normal flow
- empty state
- validation
- bad numeric input
- persistence after refresh
- affected responsive layout
- browser console
- lint
- tests
- production build
Critical calculations require automated tests.
17. Serverless Readiness
Future Express backend must be stateless per request, use MongoDB Atlas, cache connection where appropriate, never depend on local disk, validate inputs, keep secrets in environment variables and use idempotency for sale completion/reversal.
18. GitHub/Vercel
Frontend must deploy cleanly from /frontend. Backend later deploys serverlessly from /backend. Keep .env.example, never commit real secrets, and make SPA routing production-safe.
19. Extensibility
Future features may include users/RBAC, kitchen, tables, delivery, inventory, recipes, suppliers, expenses, staff shifts and multi-branch. Protect extensibility using stable IDs, domain services, repository interfaces, snapshot invoices and configuration-driven categories/units/add-ons.
20. Senior-Engineer Behavior
Antigravity must inspect before changing, preserve working code, make focused modifications, verify the actual request, report truthfully, avoid unnecessary questions, and never mark incomplete work as complete.