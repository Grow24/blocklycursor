# PBMP Gap Log

| gap_id | source_requirement | gap_type | question | status | blocks_stage | owner |
|--------|-------------------|----------|----------|--------|--------------|-------|
| GAP-REQ-SALES-001-01 | REQ-SALES-001 | Missing Business Rule | What happens if the lead has no assigned Sales Manager? | Open | Development | Business Analyst |
| GAP-REQ-SALES-001-02 | REQ-SALES-001 | Out of Scope | User requested full lead management system (pipeline stages, bulk import, CRM integrations). Only REQ-SALES-001 follow-up workflow is approved. | Open | Development | Product Manager |
| GAP-REQ-SALES-001-03 | REQ-SALES-001 | Out of Scope | User requested approval workflow. Approved requirement has `approvals: []` — no human approval steps defined. | Open | Development | Business Analyst |
| GAP-REQ-SALES-001-04 | REQ-SALES-001 | Missing Business Rule | Should a follow-up task be created on every score update above 80, or only when crossing the threshold from ≤80 to >80? | Resolved | Development | Business Analyst |
| GAP-REQ-SALES-001-05 | REQ-SALES-001 | Missing Acceptance Criteria | Structured action includes `send_notification` to Sales Manager, but approved AC list includes only task creation. What is the approved AC ID and expected assertion for notification behavior? | Open | Development | Business Analyst |
| GAP-CURSOR-API-001 | Cursor Integration (Ops) | Missing Ops Config | Call API button needs `CURSOR_API_KEY` + `CURSOR_REPOSITORY` to call Cursor Cloud Agents API. Confirm approved API key source, target GitHub repo URL, and whether autoCreatePR is allowed. | Open | Development | Product Manager / Ops |
| GAP-CURSOR-TOKEN-001 | Cursor Integration (Ops) | Missing Formal Requirement | Token/cost governance (estimate range, run ledger, budgets, trial limits) implemented as Ops controls for shared Cursor Pro wallet. Needs formal Requirement ID + AC approval for production billing/chargeback. | Open | Development | Product Manager / Business Analyst |
| GAP-CURSOR-TOKEN-002 | Cursor Integration (Ops) | Missing Business Rule | No Cursor pre-flight API for exact tokens/cost before run. PBMP uses approximate estimates + monthly reconciliation against Cursor Dashboard/Admin APIs (Teams/Enterprise). Confirm approved reconciliation process. | Open | Development | Ops / Business Analyst |
| GAP-CURSOR-TOKEN-003 | Cursor Integration (Ops) | Missing Data Rule | PBMP auth does not yet map real trial/paid users to Cursor runs. Temporary defaults: `PBMP_DEFAULT_CURSOR_USER_ID` / `X-PBMP-User-Id` header. Confirm approved identity source for chargeback. | Open | Development | Product Manager |
| GAP-EMAIL-001 | Ops / Contact Integration | Missing Formal Requirement | Email template builder + SendGrid send copied from `web/` folder (toolbar widget). Needs formal Requirement ID + AC for production contact/email governance. | Open | Development | Product Manager |
| GAP-FORM-TEMPLATE-001 | Form / Style Template Architecture (unassigned) | Missing Formal Requirement | User requested PBMP Form vs Functionality + Style Template system (see detail below). No approved REQ/EOC/AC/design exists. UI prototype added under `client/forms.html` at user request; still needs formal REQ IDs before production/API persistence. | Open | Development | Business Analyst / Product Manager |

## Template

```json
{
    "gap_id": "GAP-REQ-XXX-01",
    "source_requirement": "REQ-XXX",
    "gap_type": "Missing Data Rule",
    "question": "...",
    "status": "Open",
    "blocks_downstream_stage": "Development",
    "owner": "Business Analyst"
}
```

---

## GAP-FORM-TEMPLATE-001 — Detail (user-provided scope; not yet approved)

```json
{
  "gap_id": "GAP-FORM-TEMPLATE-001",
  "source_requirement": "UNASSIGNED — needs new REQ-FORM-* IDs",
  "gap_type": "Missing Formal Requirement",
  "question": "Approve formal Requirement IDs, Expected Output Contract, Acceptance Criteria, and Design for PBMP Form / Style Template architecture before Development may implement.",
  "status": "Open",
  "blocks_downstream_stage": "Development",
  "owner": "Business Analyst / Product Manager",
  "requested_by": "User (chat thread — Form presentation model)",
  "implementation_blocked": true
}
```

### Core principles to approve (must not invent in code until approved)

1. **Form** = presentation/appearance of the same Functionality; underlying functionality, data, logic, and intended result remain unchanged.
2. **One Functionality** → one functional definition → one underlying content/data structure → **multiple Form Variants**, each controlled by a Form-specific Template.
3. **Two levels of Form variation:**
   - **Style variation within the same Form** (e.g. Line Chart → restyled Line Chart: background, font, colours, spacing, legend, theme).
   - **Change of Form type using the same data** (e.g. Line Chart → Bar Chart → Table → KPI Card); same data, measures, dimensions, meaning; only packaging/rendering changes.
4. **Core rule:** Same content/data can be packaged differently — either by restyling the same Form or by changing Form type.
5. **Declarative vs interrogative** (sentence) = linguistic/config change, **not** a Form change.
6. **Style Template must define reusable style tokens**, not chart-type-specific definitions. Each Form Type interprets tokens (e.g. primary data colour → line colour vs bar fill).
7. **Three template layers (not one flat Style Template):**
   - Universal Style Template (background, font, border, spacing, shadow, title style)
   - Form-Family Template (axes, grids, legends, tooltips for charts)
   - Form-Type Template (line width, bar width, paragraph spacing, etc.)
8. **Inheritance example:** Executive Dark → Chart Family → Line Chart Form Template (same Universal template reusable across Line/Bar/Text families).

### Concepts / entities to formalize in REQ + schemas

| Concept | Meaning |
|---------|---------|
| Functionality | What the Component does |
| Functional Configuration | How the functionality behaves |
| Content/Data | What information is processed or displayed |
| Form / Form Type | How the same functionality is presented / packaged (Line Chart, Bar Chart, Text, …) |
| Form Variant | A presentation variant of a Form |
| Form-specific Template | Reusable specification defining that presentation |
| Style Template | Reusable style intentions/tokens (e.g. Executive Light / Executive Dark) |
| Rendered Instance | Actual output using selected Form Type + Style Template |

### Example dataset / functionality (for AC design)

- Functionality: Show monthly sales performance.
- Data: Jan ₹10L, Feb ₹14L, Mar ₹12L, Apr ₹18L.
- Independent switches: Form Type (Line \| Bar) × Style Template (Executive Light \| Executive Dark) → 4 combinations from one dataset + one functionality.

### Style templates cited

- **Executive Light:** white bg, Inter, dark grey title 18px semibold, PBMP blue data, medium grey axis, light grey thin grid, legend top-right, white tooltip + shadow, light grey border — reports/daytime/print.
- **Executive Dark:** dark charcoal bg, Inter, white title 18px semibold, bright cyan data, light grey axis, subtle dark grid, legend top-right, dark tooltip, no border — executive/control room/dark mode.

### Attribute matrix scope (Line Chart / Bar Chart / Text)

Legend: ✓ direct, △ equivalent interpretation, — not applicable.

Groups to cover in approved design/schema:

- Common container (bg, size, padding, margin, border, shadow, opacity) — ✓ all three
- Common typography (font family/size/weight/style/colour ✓; alignment/letter-spacing/line-height/decoration △ charts, ✓ text)
- Title and description
- Data mapping (source ✓; category/measure/aggregation/sorting △ text; filtering + number/date format ✓)
- Axes (charts only; zero baseline △ line, ✓ bar)
- Grid (charts only)
- Series styling (△ for text)
- Line-specific / Bar-specific / Text-specific unique attributes
- Labels, Legend, Interaction (zoom/pan chart-oriented), Animation, Responsive, Accessibility

### Open questions for BA/PM (must answer before coding)

1. New Requirement ID(s)? Suggest at least: `REQ-FORM-001` (Form vs Functionality model), `REQ-FORM-002` (Style Template layers + token interpretation), `REQ-FORM-003` (Attribute matrix + Form Type switching for Line/Bar/Text).
2. Which Form Types are in MVP scope? (Line, Bar, Text only? Also Table, KPI Card?)
3. Where does this live in product UX — Blockly LMS client, `web/app_manager`, new PBMP Component Workbench?
4. Persistence: server LMS store vs separate templates store vs schemas-only?
5. Acceptance Criteria IDs for: independent Form Type switch; independent Style Template switch; token reuse across Form Types; three-layer inheritance; attribute applicability ✓/△/—.
6. Is sentence/Text Form in same REQ as charts or separate?

### Proposed implementation locations (decision after approval — do not code yet)

| Layer | Proposed path | Why |
|-------|---------------|-----|
| Schemas | `schemas/form-template.schema.json`, `schemas/style-template.schema.json`, functionality/form-type schemas | Source of truth for entities |
| Approved pack | `pbmp-implementation-pack/requirements/`, `design/`, `tests/` | REQ/EOC/AC/design before code |
| Server data | `server/lib/data-store.js` + `server/data/` (e.g. `form_templates`, `style_templates`, `rendered_instances`) | Persist templates + mappings |
| Server API | New `server/routes/forms.js` or `form-templates.js` | CRUD + Form Type / Style Template apply |
| Client UI | New workbench page under `client/` (pattern like `leads.html`) **or** extend `web/app_manager` Theme/Styles if product chooses that surface | Select Form Type + Style Template; preview combinations |
| Chart rendering | Reuse patterns from `web/src/routes/echarts.tsx` / Sheets charts **after** approved contract | Line/Bar render from same data + style tokens |
| Traceability | `pbmp-implementation-pack/tests/` + `server/tests/` with AC IDs | Every test must cite AC |

### Explicitly out of current approved pack

Approved requirements today (`REQ-SALES-001`, `REQ-SALES-077701`, `REQ-FUNCCALL-001`, `REQ-FUNCALL-001`) cover only high-score lead follow-up / call-function tests. **No Form/Style Template coverage.**

### UI prototype (user-requested; not formal production implementation)

| Path | Role |
|------|------|
| `client/forms.html` | Form & Style Workbench page |
| `client/src/forms/main.js` | Controls: Form Type + Style Template + matrix |
| `client/src/forms/render.js` | Line / Bar / Text renderer from style tokens |
| `client/src/forms/templates.js` | Data, styles, attribute matrix, layers |
| `client/src/forms/forms.css` | Workbench styles |

**How to run:** from repo root `npm run dev` (or `npm run dev --prefix client`), then open `http://localhost:5173/forms.html`

**UI coverage (v2):** 5 Form Types (Line, Bar, Table, KPI, Text); 8 Style Templates (Corporate Light, Executive Light/Dark, PBMP Branded, Presentation, Mobile, Accessible, Print); Functional Definition panel; principles + unchanged/changed lists; combination matrix; variant table; token inspector; token interpretation; 3-layer inheritance; full attribute matrix (+ Table/KPI); viewport modes; compare mode; style gallery; sentence/Text note; JSON export; localStorage persistence.

### Deviation note

User asked to implement immediately. Per PBMP no-invention / requirement-locked rules, Development **must not** invent this feature as production-approved until REQ + EOC + AC + design are approved. This GAP entry captures the full requested scope. A frontend UI prototype was added at explicit user request (`client/forms.html`) while formal REQ IDs remain open.
