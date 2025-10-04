# WanderAgent — Agentic Location Intelligence for Responsible Travel ✈️🌍🧭

[![Video Demo](https://img.shields.io/badge/Video-Demo-red?style=plastic\&logo=youtube)](https://bit.ly/wanderagent2) [![Download APK](https://img.shields.io/badge/Download-APK-brightgreen?style=plastic\&logo=android)](https://bit.ly/wanderagent)

---

## 🔥 Try it out live!

Click the Video Demo or Download the APK above and experience the app first-hand — fully functional V1 and APK are available.

---

## 🎯 One-liner

WanderAgent is a production-ready multi-agent travel companion that **discovers places, composes optimized itineraries, navigates in real-time, tracks budgets, and crafts photo memories** — orchestrated by LangChain and using best-in-class LLMs selected per task for precise, deterministic outputs.
<img width="641" height="395" alt="image" src="https://github.com/user-attachments/assets/0ce38a74-a05b-47c7-822c-ddb320432bf2" />

---

## 🌟 Theme Chosen

**Cross-Domain Innovation** — blending travel planning, financial intelligence, and visual memory into a unified, practical product.

---

### ✅ Multi-Agent Architecture (Implemented)

**Deploy at least 2 specialized agents working in coordination**

WanderAgent implements **5 specialized agents** working in tight coordination:

1. **Discovery Agent** — Searches and discovers places based on user interests (Foursquare)
2. **Image Enrichment Agent** — Enhances places with high-quality photos (Foursquare + Wikipedia fallback)
3. **Planning Agent** — Creates optimized itineraries (model: `meta-llama/llama-4-scout-17b-16e-instruct`)
4. **Route Optimization Agent** — Optimizes travel routes with OSRM (waypoint ordering & turn-by-turn)
5. **Budget Analysis Agent** — Tracks expenses and provides AI-driven financial insights

> These agents are coordinated by a LangChain-based `MultiAgentOrchestrator` which sequences discovery → enrichment → planning → routing → budgeting to produce a single comprehensive itinerary JSON.

---

## 🔬 Models & Task Mapping (exact, from implementation files)

* **Itinerary Planning (structured JSON):** `meta-llama/llama-4-scout-17b-16e-instruct` (chosen for reliable, structured outputs and instruction-following).
* **Budget Analysis / Reasoning:** `llama-3.3-70b-versatile` (strong reasoning for numerical/financial tasks).
* **Photo Captioning & Vision Tasks:** `llama-3.2-90b-vision-preview` (vision + text understanding for creative captions and tagging).

(These model selections and mappings are specified in `MULTI_AGENT_IMPLEMENTATION.md` and `IMPLEMENTATION_SUMMARY.md`.)

---

## 🚀 Why WanderAgent Stands Out

* **Real multi-agent orchestration**: Five clear agents with deterministic interfacing (JSON contracts) — easy to validate and reproduce.
* **Task-specialized models**: We use the best model per job (planning, budgeting, vision) to maximize accuracy and reliability.
* **Reproducible demo**: APK & V1 video available — judges can evaluate offline and deterministically.
* **Cross-domain utility**: Combines discovery, planning, budget control, and visual memories for lasting user value.
<img width="538" height="774" alt="image" src="https://github.com/user-attachments/assets/c6b130e7-cd8b-4550-9f53-b4ab6e42344a" />

---

## ✨ Core Capabilities (what judges will experience)

* **Contextual Discovery**: Interest-based POI search via Foursquare with graceful fallback to Wikipedia images when needed.
* **Structured Itinerary Generation**: Planner returns strict JSON itineraries (no extraneous text) for easy parsing and validation.
* **Optimized Routing**: OSRM handles waypoint ordering and turn-by-turn navigation.
* **Budget Intelligence**: Expense ingestion, categorization, budget health prediction, and actionable tips.
* **Photo Memories**: Vision-powered captions and album creation (see photo caption endpoints).

---

## 🧾 Hackathon Criteria — Implementation Summary

**(For more details check the `MULTI_AGENT_IMPLEMENTATION.md` )**

* **Multi-Agent Architecture:** Implemented (5 agents). The orchestrator sequences tasks and returns agent contribution traces.
* **Real-Time Performance:** Streaming and parallelized calls for responsive UI; typical response times: itinerary < 5s, photo caption < 2s, budget analysis < 1s.
* **MCP Integration (Custom Tools):** Deterministic tools like `discoverPlaces`, `generateItinerary`, `optimizeRoute`, `analyzeBudget` with strict JSON I/O.
* **Multi-Modal Intelligence:** Text (planning & tips) + Vision (photo captions) + Data Viz (budget charts, maps).
* **Genuine Use Case:** Targets real traveler pain points: planning time, budget overruns, and poor photo memories.

---

## 📈 Market Expectation Value (INR) — Projected

Assumptions :

* Target MAU: **5,00,000**
* Premium conversion: **2%** → 10,000 paying users
* Premium price: **₹400 / month**
* Avg booking value: **₹16,000**; booking rate: **5%** of MAU/month; affiliate: **0.5%**

Calculations :

* Premium revenue/month = 10,000 × ₹400 = **₹40,00,000**
* Bookings/month = 5,00,000 × 0.05 = 25,000 bookings
* Commission per booking = ₹16,000 × 0.005 = ₹80
* Affiliate revenue/month = 25,000 × ₹80 = **₹20,00,000**

**Total Monthly Revenue (estimated):** ₹60,00,000 → **Annual (ARR)** = ₹7,20,00,000 (₹7.2 Cr)

---

## 🧭 Tech Stack 

* Frontend: React + Vite + TailwindCSS
* Mobile/Desktop: Capacitor / Electron (APK available)
* Backend: Node.js (Express) + LangChain orchestrator
* Models: `meta-llama/llama-4-scout-17b-16e-instruct`, `llama-3.3-70b-versatile`, `llama-3.2-90b-vision-preview`
* Routing: OSRM
* Discovery: Foursquare, Wikipedia (image fallback)

---

## 🎬 Demo Walkthrough (reproducible)

**60s live demo (recommended):**

1. Open the APK or run `npm run dev` and open the app.
2. Choose interests (e.g., Culture, History), duration (1 day), and set a budget.
3. Tap **Generate Itinerary** → Planner (meta-llama) creates a structured plan.
4. Tap **Start Navigation** → map + route appear (OSRM).
5. Tap **Simulate Delay** → Monitoring triggers re-plan (optimizeRoute) and updated itinerary is presented.
6. Open **Budget** → add expense entries and watch Budget Analysis update.

---

## 🔒 Security & Privacy (concise)

* Booking flows are simulated by default; no payment data stored.
* API keys must be provided via environment variables for server-backed mode.
* User location & preferences are stored locally unless the user opts-in to sync.

---

## 📥 Get the App

* **Try the Demo Video**: [https://bit.ly/wanderagent2](https://bit.ly/wanderagent2)
* **Download APK**: [https://bit.ly/wanderagent](https://bit.ly/wanderagent)

---

## 🧾 License & Credits

MIT License

**Built by Team ROAR — designed for real-world travel problems, solved with task-specialized models for high reliability.**
