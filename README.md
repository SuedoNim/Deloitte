# Deloitte U.S. Airport Modernization & Investment Intelligence Orchestrator (ECS)

An interactive, multi-agent advisory and orchestration platform for **U.S. Airport Modernization & Capital Investment Intelligence**. The application combines a conversational **Main Orchestrator Chat** with a persistent **Job Management Engine (`PGlite` + `pg-boss`)** and five domain-specialized **Workflow Job Agents (`W1`–`W5`)** that query live federal aviation/weather telemetry, execute deterministic financial and engineering calculations, and generate board-ready PDF deliverables on demand.

---

## What This Application Does

### 1. Conversational Airport Modernization Advisory & Orchestration
- **Consultative Main Chat**: Acts as a senior U.S. Airport Modernization Partner. When asked what it can do, it explains the platform's five specialized modernization workflows (`W1`–`W5`), details the live federal datasets and quantitative models behind each service, and helps users structure capital program mandates.
- **Natural-Language Job Lifecycle Management**: Only chat messages dispatch, update, or abort jobs. Users can:
  - **Create / Dispatch Jobs**: e.g., *"Create a W1 Capital Stack job for JFK Terminal 6 redevelopment"* or *"Run a W4 climate resilience stress test for MIA and generate a PDF report"*.
  - **Update Active Jobs**: e.g., *"Update JOB-102 to 75% progress and refine purpose to include Concourse B"*.
  - **Abort / Cancel Jobs**: e.g., *"Abort JOB-101"*.

### 2. Five Specialized Modernization Workflows (`W1`–`W5`)
Each dispatched job is assigned to a dedicated specialist agent equipped with domain skills (`S1`–`S5`), deterministic calculation tools, and live online telemetry retrieval:

| Workflow | Domain Skill | Core Advisory Capabilities & Quantitative Calculations | Primary Deliverables (`R1`–`R10`) |
| :--- | :--- | :--- | :--- |
| **`W1`** · Capital Stack & Funding Orchestration | `S1` · `us-funding-capital-stack` | Models multi-source airport capital stacks across **FAA AIP Formula & Discretionary**, **IIJA / BIL (`$15B` AIG + `$5B` ATP)**, **PFC (`$4.50` cap)**, **GARBs**, **TIFIA**, and **3P equity**, calculating weighted average cost of capital (WACC), debt service coverage ratios (DSCR), and residual funding gaps. | `R1` Funding & Capital Stack Blueprint<br>`R4` IIJA / BIL Grant Strategy<br>`R10` Credit & Debt Service Profile |
| **`W2`** · Capacity & Demand Stress-Testing | `S2` · `capacity-demand-stress-test` | Evaluates FAA TAF passenger growth scenarios, peak-hour aircraft operations (`ASPM` / `OPSNET`), airfield VFR/IFR runway saturation, and terminal/gate delay sensitivity curves. | `R2` Airfield & Terminal Capacity Stress-Test<br>`R8` Gate & Apron Utilization Study |
| **`W3`** · Delivery Vehicle Selection (`DBB`/`CMAR`/`PDB`/`P3`) | `S3` · `delivery-vehicle-selection` | Scores alternative project delivery models (**Design-Bid-Build**, **CMAR**, **Progressive Design-Build**, and **DBFM / P3 Availability Payment or Concession**) for schedule compression, risk transfer, and Value-for-Money (VfM). | `R3` Delivery Vehicle Selection Matrix<br>`R9` P3 Value-for-Money & Risk Allocation |
| **`W4`** · ESG, Decarbonization & Climate Resilience | `S4` · `esg-climate-resilience` | Runs NOAA storm-surge/extreme-heat physical hazard stress tests, calculates Scope 1–3 emissions, sizes **FAA VALE / ZEV** electrification grants, and models **SAF** blending infrastructure economics. | `R5` Climate Resilience & Hazard Stress-Test<br>`R6` Net-Zero & VALE/SAF Decarbonization Plan |
| **`W5`** · Executive Capital Investment Roadmap | `S5` · `executive-investment-roadmap` | Synthesizes capital funding, airfield capacity triggers, delivery sequencing, and climate resilience into a phased **10-Year Capital Improvement Program (CIP)** and board-ready investment memorandum. | `R7` 10-Year Executive CIP & Investment Roadmap |

### 3. Live Online Federal & Aviation Telemetry (`fetchOnlineAirportLiveData`)
Before executing calculations or compiling reports, job specialist agents invoke the **`fetchOnlineAirportLiveData`** tool to retrieve live data for the target U.S. hub (`JFK`, `LAX`, `ORD`, `ATL`, `DEN`, `DFW`, `SFO`, `MIA`, `SEA`, `BOS`, `MCO`, `EWR`, `PHX`, `IAH`, `CLT`, `LAS`, `MSP`, `DTW`, `SLC`, `IAD`):
- **FAA NAS Status API** (`nasstatus.faa.gov/api/airport-status-information`): Real-time Ground Delay Programs (GDP), Ground Stops, and operational delay alerts.
- **NOAA Aviation Weather Center METAR API** (`aviationweather.gov/api/data/metar`): Live surface wind, visibility, flight category (`VFR`/`MVFR`/`IFR`), ceiling, and temperature observations.
- **Open-Meteo Climate & Forecast API** (`api.open-meteo.com`): Live temperature, precipitation, and wind gusts for acute climate stress-testing.
- **USASpending.gov Federal Awards API** (`api.usaspending.gov`): Federal DOT/FAA grant obligation benchmarks.
- **FAA NPIAS & AIP Authoritative Benchmarks**: Hub classification, passenger enplanement baselines, and 5-year capital need benchmarks.

### 4. Conditional, Tool-Generated Single PDF Reports
- **No Unsolicited Report Clutter**: Agents **never** auto-generate PDF reports if the user is simply asking questions, exploring scenarios, or running a job that does not ask for a formal report/PDF deliverable.
- **Tool-Driven Generation**: When a report is requested (either in the initial job mandate or later inside the Job Conversation modal), the specialist agent calls the **`generatePdfAssessmentReport`** tool.
- **Single Relevant Report**: The tool selects the **single most relevant report code (`R1`–`R10`)** matching the user's request, populates it with the deterministic calculation outputs and live telemetry citations, writes a valid multi-section PDF binary to `./reports`, and unlocks the download button in the UI.

### 5. Interactive Specialist Job Conversations
- Clicking **Conversation** on any job card opens the **Specialist Job Agent Modal**.
- Users can review the full audit trail of live data fetches and calculation tool runs, ask follow-up advisory questions, test new financial or operational assumptions, or ask the specialist agent to generate a formal PDF report on the spot.

---

## How It Works (Architecture)

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SolidJS Client (src/client)                          │
│  ┌──────────────────────────────┐   ┌────────────────────────────────────┐  │
│  │ Main Orchestrator Chat       │   │ Persistent Jobs Panel & SSE Stream │  │
│  │ • Conversational Advisory    │   │ • Live Job Progress & Status       │  │
│  │ • Natural Language Dispatch  │   │ • Specialist Job Conversation Modal│  │
│  │ • Model Config Settings      │   │ • Tool-Generated PDF Downloads     │  │
│  └──────────────┬───────────────┘   └─────────────────┬──────────────────┘  │
└─────────────────┼─────────────────────────────────────┼─────────────────────┘
                  │ POST /api/chat                      │ /api/jobs + SSE
                  ▼                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Hono Backend (src/server)                           │
│  ┌──────────────────────────────┐   ┌────────────────────────────────────┐  │
│  │ ChatService                  │   │ JobRepository (PGlite + pg-boss)   │  │
│  │ • Intent Parser & Advisor    │   │ • Embedded Postgres Persistence    │  │
│  │ • Google Gemini / OpenAI /   │   │ • pg-boss Queue & Worker Execution │  │
│  │   Compatible LLM Routing     │   │ • Real-time SSE Event Broadcasting │  │
│  └──────────────┬───────────────┘   └─────────────────┬──────────────────┘  │
│                 │                                     │                     │
│                 └──────────────────┬──────────────────┘                     │
│                                    ▼                                        │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ JobAgentRunner & Domain Skills (W1–W5 / S1–S5)                        │  │
│  │ 1. fetchOnlineAirportLiveData (FAA NAS, NOAA METAR, Open-Meteo, etc.) │  │
│  │ 2. Deterministic Quantitative Tools (WACC, DSCR, TAF, VfM, VALE/SAF)  │  │
│  │ 3. Conditional generatePdfAssessmentReport (Single Report R1–R10)     │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

- **Frontend (`src/client`)**:
  - **SolidJS** (`solid-js`) with reactive signals and fine-grained DOM updates
  - **Vite 8** (`vite`, `vite-plugin-solid`) for fast builds and asset bundling
  - **TypeScript 6** for strict end-to-end type safety
- **Backend (`src/server`)**:
  - **Node.js + Hono** (`hono`, `@hono/node-server`) serving REST endpoints, Server-Sent Events (SSE), and static production assets
  - **Database & Job Queue**:
    - **PGlite** (`@electric-sql/pglite`): Embedded WebAssembly PostgreSQL database storing jobs, sub-chat transcripts, and metadata
    - **pg-boss** (`pg-boss`): Transactional job queue backed by PGlite for orchestrating asynchronous `W1`–`W5` workflow execution
  - **AI & LLM Integration**:
    - **Google GenAI SDK** (`@google/genai`) for native Google Gemini models (`gemini-2.5-flash`, `gemini-2.5-pro`, etc.)
    - **Vercel AI SDK** (`ai`, `@ai-sdk/openai`) for OpenAI and OpenAI-compatible endpoints (Ollama, vLLM, LM Studio, Azure)
    - **Built-in Deterministic Advisory Fallback**: Full tool execution, live online telemetry retrieval, and conversational responses work even before an external API key is configured
  - **Build & Packaging**:
    - **esbuild** for bundling the server into a standalone ESM executable
    - **Justfile** (`just`) for single-command builds, checks, and standalone binary packaging

---

## How to Run the Application

### Prerequisites
- **Node.js** `>= 20` (tested with Node.js 22)
- **npm** `>= 10`
- **just** (optional, for running `justfile` recipes)

### 1. Install Dependencies
```bash
npm install
# or using just:
just install
```

### 2. Run in Development / Watch Mode
Build the frontend and start the unified Hono server in watch mode:
```bash
npm run debug
# or using just:
just debug
```
To run only the server directly:
```bash
npm run dev
```
By default, the server listens on `http://0.0.0.0:3000` (or the `PORT` environment variable).

### 3. Build for Production
```bash
npm run build
npm run start
```

### 4. Pack as a Single-Press Standalone Executable (`just pack`)
You can bundle the entire frontend, Hono backend, PGlite WebAssembly runtime, and configuration into a self-contained executable package:
```bash
just pack
```
This creates:
- `./airport-modernization-ecs` — Single-press launcher executable in the repo root
- `./dist-package/airport-modernization-ecs` — Portable self-contained directory and executable
- `./dist-package.tar.gz` — Distributable archive

To run the standalone executable directly:
```bash
./airport-modernization-ecs
# or:
just run-standalone
```

---

## How to Use the Application

### 1. Configure AI / Gemini Connection (Optional)
- Click the **Model Config** button in the top navigation bar.
- Choose your provider:
  - **Google Gemini (`@google/genai`)**: Select `gemini`, choose a model (e.g., `gemini-2.5-flash`), and provide a Gemini API key (or rely on the server's `GEMINI_API_KEY` environment variable).
  - **OpenAI / Compatible**: Configure an OpenAI API key or point the Base URL to a local LLM server (such as Ollama or LM Studio).
- Click **Save & Test Connection**. *(Note: Even without an external key configured, the platform's domain skills, live telemetry tools, and deterministic quantitative calculations operate seamlessly.)*

### 2. Explore Capabilities in the Main Orchestrator Chat
- Ask the main chat what it can do:
  > *"What can you do? Explain the Airport Modernization services and how the job agents work."*
- Or ask for advisory guidance before launching a job:
  > *"How should we structure a $2.4B terminal modernization at ORD using IIJA grants and PFC-backed bonds?"*

### 3. Dispatch, Update, or Abort Jobs via Chat
- **Create a Job (Advisory & Calculations Only — No PDF Generated)**:
  > *"Create a W1 Capital Stack job for JFK to evaluate a $1.8B terminal redevelopment"*
- **Create a Job with an Official PDF Deliverable**:
  > *"Dispatch a W4 ESG & Climate Resilience job for MIA and generate a formal PDF report"*
- **Update an Existing Job**:
  > *"Update JOB-101 to 80% progress and expand the scope to include airside apron electrification"*
- **Abort a Running Job**:
  > *"Abort JOB-101"*

### 4. Converse with a Job's Specialist Agent
- In the **Active Jobs Panel** on the right, click the **Conversation** button on any job card.
- Inside the **Job Conversation Modal**, you can:
  - Inspect the specialist agent's live online data citations (FAA NAS Status, NOAA METAR weather, Open-Meteo climate, USASpending grants) and quantitative calculation outputs.
  - Use the quick-action chips or type any follow-up question (e.g., *"What are the key findings and live telemetry metrics?"* or *"Stress-test the financial & capacity assumptions"*).
  - Request a formal report at any time by clicking **"Generate official PDF report via tool"** or asking *"Please generate the PDF report for this engagement"*.

### 5. Download Tool-Generated PDF Reports
- Once a specialist agent invokes `generatePdfAssessmentReport` for a job, the **PDF** badge on the job card (and the download button inside the Conversation Modal) becomes active, showing the exact report code generated (`R1`–`R10`).
- Click the **PDF (`R#`)** button to download the formatted multi-page PDF deliverable.

---

## Repository Structure

```text
├── config.json                  # Runtime server & LLM provider configuration
├── justfile                     # Build, check, serve, and single-press `pack` recipes
├── metadata.json                # Application metadata
├── package.json                 # Workspace root scripts and dependencies
├── reports/                     # Tool-generated PDF assessment deliverables
└── src/
    ├── client/                  # SolidJS frontend workspace
    │   └── src/
    │       ├── App.tsx          # Main orchestrator chat & workspace shell
    │       ├── components/
    │       │   ├── JobsPanel.tsx            # Real-time job queue & status cards
    │       │   ├── JobConversationModal.tsx # Interactive specialist agent chat & PDF download
    │       │   └── SettingsModal.tsx        # Gemini / OpenAI / Compatible LLM config UI
    │       └── types/           # Shared TypeScript interfaces for jobs, skills, and reports
    └── server/                  # Hono backend workspace
        ├── main.ts              # Server entry point, static file serving & graceful shutdown
        ├── ai/
        │   └── gemini-client.ts # Google Gemini (@google/genai) & OpenAI-compatible client
        ├── routes/
        │   ├── chat-routes.ts   # Main orchestrator chat streaming endpoint (/api/chat)
        │   ├── jobs-routes.ts   # Job queries, sub-chat turns, SSE stream & PDF report routes
        │   └── config-routes.ts # Model & provider configuration endpoints (/api/config)
        ├── services/
        │   ├── chat-service.ts       # Main orchestrator intent detection & consultative advisor
        │   ├── job-repository.ts     # PGlite + pg-boss persistence & queue orchestration
        │   ├── job-agent-runner.ts   # W1–W5 specialist agent execution & tool loop
        │   └── pdf-report-service.ts # Deterministic PDF report builder (R1–R10)
        └── skills/
            ├── skill-registry.ts     # S1–S5 domain skill prompts, formulas & report mappings
            └── skill-tools.ts        # Live online telemetry tool & quantitative calculation tools
```
