# Custom Blocks · Procedures · Cursor Pipeline (Hindi + English)

## 1) Custom Blockly Blocks — kaise banate hain (non-tech)

Custom block = business language ka **puzzle piece**.

### 5 steps (PBMP way)

| Step | Non-tech meaning | PBMP example |
|------|------------------|--------------|
| 1. Decide meaning | Block kya business idea represent kare | Create Task |
| 2. Decide user fills | Text / dropdown / checkbox | Title + assigned role dropdown |
| 3. Decide connections | Flow start? IF ke andar? Action ke pehle/baad? | Statement block — Trigger ke baad stack |
| 4. Decide machine output | Save par structured JSON | `{ "action": "create_task", "title": "...", "assigned_role": "..." }` |
| 5. Put in toolbox | Business categories, programming nahi | Actions, Approvals, Conditions, NFRs |

### Analogy

Instead of typing free text, user fills a **standard form as blocks**:

```
IF [Lead Score] [>] [80]
THEN [Create Task] for [Sales Manager]
```

### Implemented in this app

- `Create Task` block with title + role dropdown
- `Send Notification` block
- Actor / Entity / Operator / NFR-type dropdowns
- Structured export: `structured_actions[]`

---

## 2) Procedures / Functions — non-tech explanation

**Procedure/function = reusable business logic package.**

### Procedure (actions karti hai)

Example name: `Check High-Value Deal Approval`

1. Name do  
2. Inputs define karo (Deal Amount, Customer Type, Risk Score)  
3. Logic ek baar andar banao  
4. Kahin bhi **Run Procedure** se call karo  

### Function (jawab / value return karti hai)

Example: `Calculate Lead Score` → returns `85`

| Term | Simple meaning |
|------|----------------|
| Procedure | Kaam karti hai (email, approval, audit) |
| Function | Answer/value deta hai (score, yes/no) |

### Why PBMP needs this

Same logic baar-baar rebuild mat karo. Approved reusable packages use karo:

- Calculate Lead Score  
- Check Approval Requirement  
- Validate Customer  
- Send Standard Notification  

### Implemented in this app

Toolbox category **Procedures / Functions**:

- Define Procedure / Run Procedure  
- Define Function / Call Function  

Exporter saves `procedures[]` and `functions[]` in Requirement JSON.

---

## 3) Cursor API — Blockly se pipe karna (hallucination kam)

### Cursor ke integration routes

| Capability | PBMP use |
|------------|----------|
| Cloud Agents API | PBMP trigger se agent run |
| Headless CLI | Scripts / CI me agent |
| MCP | Approved artifacts as controlled context |

### Golden rule

**Raw Blockly workspace JSON Cursor ko mat bhejo.**

Pehle:

```
Blockly blocks
→ PBMP Requirement JSON
→ Validation + Approval
→ Expected Output Contract
→ Cursor Implementation Pack
→ Cloud Agent API / Headless CLI / MCP
→ PR → Tests → Review → Deploy
```

### Architecture mantra

> PBMP owns truth. Blockly captures intention. Cursor implements approved work. CI verifies. Humans approve deviations.

### Implemented in this app

- UI button: **Export Cursor Pack**  
- On Save: writes `pbmp-implementation-pack/cursor/cursor-payload-<REQ>.json`  
- Payload includes instruction: *do not invent; gap log on missing info*  
- Docs: `pbmp-implementation-pack/cursor/cursor-integration.md`

---

## Safe vs unsafe

| Unsafe | Safe |
|--------|------|
| Blockly → Cursor directly → code | Blockly → PBMP Contract → Cursor → PR → Tests |
