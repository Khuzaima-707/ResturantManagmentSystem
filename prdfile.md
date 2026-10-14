# Restaurant POS & Management System — PRD

**Version:** 1.0  
**Phase:** Frontend First  
**Stack:** MERN (MongoDB, Express.js, React.js, Node.js)  
**Deployment:** GitHub → Vercel  

## 1. Vision
Build a simple, fast and professional Restaurant Management System focused on POS/billing, menu management, dashboard analytics, reports and settings. The supplied screenshots are the visual reference and the frontend should stay approximately 90% visually faithful: orange/coral accent, white/light-gray surfaces, compact modern typography, clean cards, tables, drawers, charts and invoice layouts.

The first phase is frontend only. The architecture must remain ready for later Express.js + MongoDB integration without rebuilding the UI.

## 2. Core Navigation
- Dashboard
- Sales / POS
- Items / Menu
- Reports
- Settings

## 3. Dashboard
The Dashboard must have 8 working KPI cards derived from transaction data:
1. Gross Sales
2. Completed Orders
3. Net Revenue
4. Reversals Including Tax
5. Average Order Value
6. Tax Collected
7. Discounts Given
8. Items Sold

Dashboard visuals:
- Daily Sales chart
- Revenue Trend chart
- Sales by Category donut
- Payment Method breakdown
- Top Selling Items
- Recent Sales / Activity

Filters:
- Today
- This Week
- This Month
- Custom date range

All cards, graphs and tables must use the same filtered dataset.

## 4. Items / Menu
The module has three sections:
- Categories
- Items
- Add-ons

### Categories
User can add, edit, activate/deactivate and safely delete categories.

Category fields:
- Name
- Status
- Default Unit Type
- Base Unit
- Matching Keywords
- Default Portion Options
- Default Add-ons

Examples:
- Burger → Piece; keywords: burger, zinger, beef burger; default add-ons: cheese, fries, sauce
- Biryani → Weight/Kg; keywords: biryani, chicken biryani, beef biryani; portions: 250g, 500g, 750g, 1kg; add-ons: raita, salad, extra boti, aloo

### Add Item
Fields:
- Food photo upload from device/gallery
- Item name
- Category
- Price
- Serving unit/weight
- Description
- Add-on assignment
- Status
- Cancel / Save

#### Category Auto-Suggestion
When item name is typed, the frontend must match the name against category names and category keywords. If a safe single match exists, auto-select it. User can override manually. If no safe match exists, require manual category selection.

Examples:
- Zinger Burger → Burger
- Chicken Biryani → Biryani

#### Unit Auto-Suggestion
Selected category supplies a sensible default unit.
- Burger → Piece
- Biryani → Kg / Weight
- Pizza → Piece / Size
- Drinks → configured Bottle/Glass/Liter

Never assign a nonsensical unit such as liter to biryani.

## 5. Pricing Rules
Each item has a base price and base unit.

Examples:
- Chicken Biryani: Rs 1,000 per 1kg
- Zinger Burger: Rs 450 per piece

For kg-based items:
`portion price = base price × selected kg`

Example: Rs 1,000/kg × 0.25kg = Rs 250.

For custom rupee amount on weight-based items:
`derived kg = entered amount / base price per kg`
`derived grams = derived kg × 1000`

Example: Rs 100 on a Rs 1,000/kg item = 100g.

## 6. Add-ons
Add-ons are maintained in a separate list.

Fields:
- Add-on name
- Price
- Compatible categories
- Optional specific item assignments
- Status

Examples:
- Raita
- Salad
- Extra Chicken Boti
- Aloo
- Cheese Slice
- Fries
- Extra Sauce

POS must show only active add-ons assigned to the selected item's category/item. Do not hardcode add-ons inside the POS component.

## 7. Sales / POS
POS screen contains:
- Search
- Category chips
- Product cards
- Product photo/name/description/base price
- History
- Current Order
- Order Type

V1 order types:
- Dine-In
- Takeaway

### Item Click
Clicking anywhere on a product card opens a configuration modal for that selected product only.

For weight-based foods, show configured quick portions such as:
- 250g
- 500g
- 750g
- 1kg

Also show custom rupee amount input for eligible weight-based items, derived weight, calculated price, compatible add-ons, quantity, note and Add to Order.

For piece items, show quantity and compatible add-ons without weight controls.

## 8. Current Order Drawer
Must visually follow the supplied reference and include:
- Item list
- Thumbnail
- Configuration summary
- Quantity +/-
- Remove line
- Clear All
- Subtotal
- Discount (% or Rs)
- Tax
- Grand Total
- Payment Method
- Amount Received
- Change
- Complete Sale & Print Invoice

Payment methods:
- Cash
- Card
- Online

Cash rule:
`change = amount received - grand total`
Sale cannot complete if cash received is less than grand total.

## 9. Invoice
Invoice preview must include business details, invoice number, date/time, order type, cashier placeholder, line items, quantity, rate, amount, subtotal, discount, tax, grand total, payment method, amount received and change.

Actions:
- Reverse Invoice
- Download PDF
- Print
- New Sale
- Close

Completed invoices store snapshots so later menu price/name changes do not alter historical invoices.

## 10. Reversal
V1 supports full invoice reversal.

Rules:
- Never delete original completed invoice.
- Create a separate reversal record linked to original invoice.
- Store reason, subtotal impact, tax impact, total reversed including tax and timestamp.
- Reversal must update Dashboard and Reports.
- Original invoice stays inspectable.

## 11. Reports
Three main tabs:
- Sales Report
- Revenue Report
- Reversal Report

Common filters:
- Date preset
- Custom date range
- Category
- Payment method
- Order type
- Status
- Invoice search

Sales Report:
- Total sales
- Total orders
- Average order value
- Items sold
- Daily Sales chart
- Sales by Category chart
- Detailed sales table

Revenue Report:
- Gross billed amount
- Discounts
- Tax
- Reversals
- Net revenue
- Revenue trend
- Payment breakdown

Reversal Report:
- Reversal count
- Reversal before tax
- Reversed tax
- Reversal including tax
- Reversal trend
- Reversal details

## 12. Financial Definitions
- Gross Sales: completed customer-billed totals before reversals.
- Net Revenue: valid net sales excluding tax after discounts and reversals.
- Tax Collected: valid tax remaining after reversals.
- Reversal Including Tax: reversed customer-billed amount including reversed tax.
- Average Order Value: valid billed sales after reversals divided by valid completed order count.

Tax is not revenue.

## 13. Settings
Sections:
- Business Profile
- Tax
- POS / Invoice Preferences
- Data Management

### Delete All Data
Add a red Danger Zone action named **Delete All Data**.

Frontend flow:
1. Warning modal
2. Show what will be deleted
3. Require exact phrase: `DELETE ALL DATA`
4. Keep final button disabled until phrase matches
5. Require second confirmation
6. Clear categories, items, add-ons, orders, reversals, report data/cache and current cart from frontend persistence
7. Return to a clean empty usable app
8. Do not silently reseed demo data

Backend phase must later add admin authorization, re-authentication and an audit record.

## 14. Frontend Persistence
During frontend-only phase, use a repository/service abstraction.
- Prefer IndexedDB for menu records/images/orders.
- Use localStorage only for lightweight preferences if required.
- UI components must not call storage APIs directly.
- Reports and KPIs must be derived from canonical order/reversal records.

## 15. Acceptance Criteria
Frontend is complete only when:
- All navigation works
- UI is close to supplied references
- Category/Item/Add-on CRUD works
- Image upload/preview works
- Category auto-suggestion works
- Unit defaults work
- Weight and custom-Rs calculations work
- Compatible add-ons work
- POS cart/order drawer works
- Discount/tax/payment/change calculations work
- Completing a sale creates invoice history
- Invoice preview/print works
- Full reversal works without deleting invoice
- Dashboard and Reports use real transaction data
- Filters work
- Delete All Data works safely
- Refresh persistence works
- Empty states are polished
- No console errors
- Lint/tests/build pass

## 16. Future Expansion Guardrails
The product will grow later. Keep business rules outside presentation components, centralize calculations, use stable IDs, store historical snapshots, never rewrite financial history, and keep the architecture ready for users/roles, kitchen, tables, inventory, delivery and multi-branch expansion.
