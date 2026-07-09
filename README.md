# PBMP Blockly — Product Discovery Workbench

PBMP (Product Business Management Platform) ka **Product Discovery** module — Blockly blocks se structured requirements capture, validation gates, aur Cursor ke liye implementation pack generation.

## Kya include hai

| Component | Description |
|-----------|-------------|
| **Blockly Workbench** | Goal, Actor, Trigger, Condition, Action, NFR, Acceptance Criteria blocks |
| **MVP Plugins** | Toolbox Search, Workspace Search, Backpack, Zoom-to-Fit, Minimap, High Contrast Theme |
| **Validation API** | Schema + completeness + vocabulary checks |
| **Implementation Pack** | Approved requirements, EOC, design, tests, Cursor rules |
| **Anti-hallucination** | Gap log, deviation control, contract-first development |

## Architecture

```
Product Discovery (Blockly UI)
        ↓
Requirement JSON + Blockly workspace state
        ↓
Validation Gates (schema, vocabulary, completeness)
        ↓
Expected Output Contract (EOC)
        ↓
pbmp-implementation-pack/  →  Cursor Rules + Design + Tests
        ↓
Design → Development → Testing → Deployment (Zeabur)
```

---

## Part 1: Local Machine Setup

### Prerequisites

- **Node.js 20+** — [nodejs.org](https://nodejs.org/)
- **npm** (Node ke saath aata hai)
- **Git** (optional, Zeabur deploy ke liye recommended)

### Step 1 — Clone / open project

```bash
cd /home/bappu/blockly
```

### Step 2 — One-command setup

```bash
chmod +x scripts/setup-local.sh
npm run setup:local
```

Ya manually:

```bash
npm install
npm install --prefix client
npm install --prefix server
cp .env.example .env
```

### Step 3 — Development mode start karein

```bash
npm run dev
```

| URL | Service |
|-----|---------|
| http://localhost:5173 | Blockly UI (Vite hot reload) |
| http://localhost:3000/api/health | API health check |
| http://localhost:3000/api/requirements | Saved requirements list |

### Step 4 — Workbench use karein

1. Browser mein **http://localhost:5173** kholo
2. **Requirement ID** root block add karo (e.g. `REQ-SALES-001`)
3. Goal, Actor, Trigger, Condition, Action, Acceptance Criteria blocks chain karo
4. **Load Sample** — demo requirement load hoti hai
5. **Save & Validate** — server par validate + save + implementation pack update
6. **Export Requirement JSON** — local file download

### Step 5 — Keyboard shortcuts (plugins)

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + F` | Workspace Search — blocks dhundho |
| Toolbox "Search" | Block type search |
| Backpack icon | Reusable block patterns save/load |
| Zoom-to-fit control | Poora flow ek view mein |
| Minimap | Large workflow navigation |

### Step 6 — Production-like local run

```bash
npm run build
npm run start --prefix server
```

Open: **http://localhost:3000** (API + built UI same port)

### Step 7 — Validation script

```bash
npm run validate
```

Sample requirement JSON schema check karta hai.

---

## Part 2: Zeabur Deployment

Zeabur par deploy karne ke **3 tareeke** hain. Recommended: **Dockerfile** (sabse predictable).

### Option A — Dockerfile (Recommended)

Project mein `Dockerfile` already hai.

1. **GitHub** par repo push karo
2. [Zeabur Dashboard](https://zeabur.com) → **New Project**
3. **Deploy from GitHub** → ye repo select karo
4. Zeabur `Dockerfile` auto-detect karega
5. Environment variables set karo:

| Variable | Value | Required |
|----------|-------|----------|
| `NODE_ENV` | `production` | Yes |
| `PORT` | Zeabur auto-set karta hai | Auto |
| `PBMP_DATA_DIR` | `/app/data/requirements` | Optional (default OK) |

6. **Deploy** — build complete hone ke baad public URL milega

**Persistent storage:** Requirements save karne ke liye Zeabur **Volume** attach karo:

- Mount path: `/app/data/requirements`
- Bina volume ke restart par saved data lost ho sakta hai

### Option B — Zeabur auto-detect (zbpack)

`zbpack.json` root mein hai. Agar Dockerfile disable karna ho:

1. Zeabur service → Environment → `ZBPACK_IGNORE_DOCKERFILE=true`
2. Start command: `npm run start` (root `package.json` build + server start)

### Option C — Zeabur CLI

```bash
# Zeabur CLI install (see https://zeabur.com/docs/en-US/deploy/cli)
zeabur login
zeabur deploy
```

### Zeabur post-deploy checklist

- [ ] `https://YOUR-APP.zeabur.app/api/health` → `{"status":"ok"}`
- [ ] UI load ho rahi hai
- [ ] Save & Validate kaam kar raha hai
- [ ] Volume attached (production data ke liye)
- [ ] Custom domain (optional)

---

## PBMP Lifecycle Gates (Anti-Hallucination)

### Discovery → Design

Requirement tab tak Design mein nahi jaati jab tak:

- Actor, trigger, condition, action, acceptance criteria present hon
- JSON schema valid ho
- Approved vocabulary match kare (actor, entities)
- Business approval ho

### Design → Development (Cursor)

Cursor ko sirf ye files source of truth manni chahiye:

```
pbmp-implementation-pack/
  requirements/approved-requirements.json
  design/approved-design.md
  tests/acceptance-criteria.feature
  cursor/implementation-prompt.md
  gaps/gap-log.md
```

Cursor rules: `.cursor/rules/pbmp-*.mdc`

**Golden rule:**  
> Implement only the approved Expected Output Contract. Missing info → Gap Log, not AI guess.

### Development → Testing → Deployment

| Gate | Check |
|------|-------|
| Merge | Lint, typecheck, tests pass |
| PR | Human review + traceability scan |
| Release | 100% AC coverage, 0 critical gaps |
| Deploy | Rollback plan + monitoring |

---

## Installed Blockly Plugins (MVP Bundle)

| Plugin | Package | PBMP Use |
|--------|---------|----------|
| Toolbox Search | `@blockly/toolbox-search` | Business blocks search |
| Workspace Search | `@blockly/plugin-workspace-search` | Large BRD mein blocks dhundhna |
| Backpack | `@blockly/workspace-backpack` | Reusable requirement patterns |
| Zoom to Fit | `@blockly/zoom-to-fit` | Full logic flow view |
| Minimap | `@blockly/workspace-minimap` | Large workflow navigation |
| High Contrast | `@blockly/theme-highcontrast` | Enterprise accessibility |

## Custom PBMP Blocks

Goal · Actor · Trigger · Condition · **Create Task** (structured) · Action · **Notify** · Data Entity · Business Rule · NFR · Acceptance Criteria · Approval · Output/Traceability · **Procedure/Function define & call**

### Business toolbox categories

Start / Trigger · Conditions · Actions · Approvals · Data · Notifications · Acceptance Criteria · NFRs · Procedures / Functions

### Cursor integration (anti-hallucination)

- UI: **Export Cursor Pack** (approved contract, not raw Blockly)
- On save: `pbmp-implementation-pack/cursor/cursor-payload-<REQ>.json`
- Docs: `docs/CUSTOM_BLOCKS_PROCEDURES_CURSOR_HI.md`, `pbmp-implementation-pack/cursor/cursor-integration.md`

Safe path: `Blockly → PBMP JSON → Validation → EOC → Cursor Pack → API/CLI/MCP → PR → Tests`

---

## Project Structure

```
blockly/
├── client/                 # Vite + Blockly frontend
├── server/                 # Express API + validation
├── schemas/                # Requirement & EOC JSON schemas
├── pbmp-implementation-pack/  # Cursor implementation artifacts
├── .cursor/rules/          # PBMP Cursor rules
├── scripts/                # setup-local.sh, validate
├── Dockerfile              # Zeabur / Docker deploy
├── zbpack.json             # Zeabur auto-build config
└── data/requirements/      # Saved requirements (local)
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/requirements/validate` | Validate requirement JSON |
| POST | `/api/requirements` | Save + generate EOC + update pack |
| GET | `/api/requirements` | List saved requirements |
| GET | `/api/requirements/sample` | Sample requirement for demo |
| GET | `/api/requirements/:id` | Get one requirement |

---

## Cursor Usage (Development stage)

1. Requirement save karo workbench se → `pbmp-implementation-pack` auto-update
2. Cursor mein project kholo — rules auto-load hongi
3. Prompt template: `pbmp-implementation-pack/cursor/implementation-prompt.md`
4. Plan Mode use karo multi-file changes ke liye
5. Har task end par deviation report do

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Port 3000 busy | `.env` mein `PORT=3001` set karo |
| Blockly blank screen | Browser console check karo; `npm run dev` dono services chal rahi hon |
| Validation fails on actor | Use approved actors: Sales Manager, Business Owner, etc. |
| Zeabur build fails | Node 20+ confirm; Dockerfile path correct |
| Data lost on Zeabur restart | Volume mount `/app/data/requirements` |

---

## Coverage Audit (Shared points vs implementation)

Latest Hindi audit for all discussed points is available at:

- `docs/COVERAGE_AUDIT_HI.md`

It includes:
- covered vs partial vs optional items
- plugin/test/API scenario coverage
- pending enhancements roadmap

---

## License

Apache 2.0 (Blockly plugins). PBMP project code: use per your organization policy.
