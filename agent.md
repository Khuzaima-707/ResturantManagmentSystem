Antigravity Agent Instructions
1. Mandatory Start of Every Task
Before doing any work, re-read completely:
1. prdfile.md
2. trdfile.md
3. agent.md
4. skills.md
These files are the project constitution.
2. Current Phase
Frontend first.
- Work in /frontend only unless explicitly told otherwise.
- Do not build Express APIs yet.
- Do not connect MongoDB yet.
- Keep /backend reserved for later.
- Build repository/service abstractions so API integration can replace frontend persistence later.
3. Visual Rule
The user-provided screenshots are the visual source of truth. Target roughly 90% fidelity in layout and styling.
Keep:
- orange/coral accent
- white/light-gray surfaces
- compact modern typography
- clean left sidebar
- rounded cards/tables/modals
- professional order drawer and invoice
Do not introduce a different theme, random gradients, emoji UI icons, cartoon icons or inconsistent spacing.
4. Batch Process
Every implementation batch must:
1. state exact scope
2. inspect existing relevant code
3. re-read pillar files
4. identify reusable components/services
5. implement only requested scope
6. preserve existing working behavior
7. centralize business rules
8. verify interactions manually
9. run lint
10. run relevant tests
11. run production build
12. fix failures before reporting completion
5. Completion Report
Return:
Batch completed:
- Implemented
- Key files changed
- Rules/calculations covered
- Validation/edge cases
- Commands run
- Build result
- Test result
- Known limitations
- Recommended next batch
Never claim success when verification failed.
6. Architecture Rules
- Thin pages
- Reusable UI components
- Pure domain calculation utilities
- Data access behind repositories/services
- No giant components
- No duplicated calculation logic
- No random hardcoded dashboard totals
- No hardcoded add-on list inside POS components
- No direct storage calls from UI components
7. Financial Rules
- Historical invoices use snapshots.
- Menu changes never rewrite old invoices.
- Tax is not net revenue.
- Reversal is a separate record.
- Never delete a completed invoice to represent reversal.
- Dashboard/Reports must reconcile with transactions.
- Use one currency rounding strategy.
- Cash sale requires enough amount received.
- Change cannot be negative.
8. Menu Intelligence
- Match item name against category name/keywords.
- Auto-select only when safe.
- User can override.
- Never invent a category.
- Category supplies default unit.
- Item may override unit.
- Biryani must not get a volume unit.
- Burger should default to piece.
Add-ons come from category/item assignments and only active compatible add-ons appear.
9. POS Rules
Clicking a product opens that selected product only.
For kg items, support configured quick portions such as 250g, 500g, 750g, 1kg plus custom rupee amount → derived weight.
Order drawer must have functioning quantity, remove, clear, discount, tax, payment, amount received, change, complete sale and invoice preview actions.
No dead controls.
10. Reports/Dashboard
All values must come from completed orders/reversals under active filters. Cards, charts and tables update together. Never use random graph numbers.
11. Delete All Data
Required safeguards:
- warning
- exact phrase DELETE ALL DATA
- final button disabled until match
- second confirmation
- actual persistence clear
- clean empty state
- app must continue booting
12. Coding Standards
- Clear names
- Single-responsibility components
- No unused imports
- No production console noise
- No silent errors
- User-friendly error feedback
- Constants/enums for units/statuses
- Schema validation
- Keep style consistent across every page
13. Git Safety
Do not:
- force push
- rewrite history
- delete unrelated files
- commit secrets
- commit .env
- commit node_modules
Keep separate .gitignore files inside /frontend and /backend.
14. Scope Changes
If a new explicit user request conflicts with pillar files:
1. identify the conflict
2. follow the newest explicit user decision
3. update the affected pillar docs in the same batch
4. preserve unrelated decisions
15. No Vibe Coding
Before changing code, understand the data impact, calculation impact, UI impact and regression risk. If a small non-blocking assumption is needed, choose the safest minimal assumption and mention it in the completion report.
16. Frontend Completion Gate
Do not recommend backend implementation until navigation, menu CRUD, image upload, intelligent defaults, POS calculations, invoices, reversals, dashboard, reports, filters, persistence, reset flow, responsive behavior, lint, tests and production build are all verified.