# FloodPulse AI 🌧️🗺️
> **Hyperlocal Flood and Drainage Risk Intelligence Platform for Smart Cities**

FloodPulse AI is a responsive full-stack climate-resilience web application designed to help citizens, municipal engineers, and disaster response teams monitor, report, and respond to urban flooding and drainage failures in real time.

This project is built as a production-quality hackathon MVP using **Next.js (App Router), TypeScript, Tailwind CSS, Prisma 7, and SQLite (simulating PostGIS)**.

---

## 🏗️ Technical Architecture & Stack

- **Frontend**: Next.js App Router (TypeScript), Tailwind CSS, Leaflet.js (React-Leaflet) with CartoDB Dark Matter map styling, Lucide Icons, and Recharts.
- **Backend & APIs**: Next.js Serverless Route Handlers (`app/api/*`) exposing clean REST endpoints.
- **Database Layer**: SQLite powered by Prisma 7. The setup leverages a custom driver adapter (`better-sqlite3`) to connect serverless functions.
- **AI & Analytics**: 
  - Dynamic mathematical risk engine that computes real-time hazard levels using rainfall, elevation, citizen reports, and historical data.
  - Keyword/semantic heuristic AI classifier simulating a computer vision model that labels citizen descriptions (e.g., classifying text into `FLOODED_ROAD` or `BLOCKED_DRAIN`).

---

## 📁 File Structure

The project has been initialized and organized with modular clean-code practices:

```text
├── prisma/
│   ├── dev.db              # SQLite Local Database file
│   ├── schema.prisma       # Prisma 7 Database schema definitions
│   └── seed.ts             # Seeding script with mock wards (polygons), users, & incidents
├── public/
│   └── uploads/            # Target directory for simulated/actual image uploads
├── src/
│   ├── app/
│   │   ├── api/            # Serverless API routes
│   │   │   ├── alerts/     # Broadcast emergency system alerts (GET/POST)
│   │   │   ├── incidents/  # Fetch and submit waterlogging reports (GET/POST)
│   │   │   ├── incidents/[id]/ # Update severity, dispatch agency, or resolve (PATCH)
│   │   │   ├── safe-route/ # Calculate safe detours avoiding active flood points (GET)
│   │   │   ├── upload/     # Image storage local handler (POST)
│   │   │   └── wards/      # Ward profiles & dynamic rainfall risk simulator (GET)
│   │   ├── citizen/        # Citizen page (Interactive reporting & safe routing)
│   │   ├── municipal/      # Municipal control panel (Rainfall slider & crew dispatch)
│   │   ├── disaster/       # Disaster Ops room (Broadcast warnings, charts, CSV export)
│   │   ├── globals.css     # Tailwinds setup, scrollbars, and Leaflet custom CSS overrides
│   │   ├── layout.tsx      # SEO metadata configuration and base HTML container
│   │   └── page.tsx        # High-converting Dark Climate-Tech landing page
│   ├── components/
│   │   ├── InteractiveMap.tsx # Leaflet.js client map rendering polygons, circles, and routes
│   │   ├── MapLoader.tsx   # Dynamic dynamic wrapper (SSR: false) to prevent hydration build bugs
│   │   └── Navigation.tsx  # Dynamic header linking pages with real-time warning banners
│   ├── services/
│   │   ├── db.ts           # Centralized PrismaClient singleton using better-sqlite3 adapter
│   │   ├── riskEngine.ts   # Core algorithms for risk scoring and heuristic classification
│   │   └── wardHelper.ts   # Point-in-polygon math & dynamic ward recalculation handler
```

---

## 🗄️ Database Schema (Prisma)

- **`User`**: Manages roles (`CITIZEN`, `MUNICIPAL_OFFICIAL`, `DISASTER_TEAM`).
- **`Ward`**: Represents administrative boundary zones. Stores GeoJSON boundary polygons, dynamic risk scores, and qualitative risk levels (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
- **`IncidentReport`**: Incident logs containing reporting GPS coordinates, reporter details, descriptions, image paths, AI classification results (label and confidence score), status (`REPORTED`, `INVESTIGATING`, `DISPATCHED`, `RESOLVED`), and assigned agency.
- **`EmergencyAlert`**: Broadcast messages showing critical city warning banners.

---

## 🔌 API Reference Guide

### 1. Incidents API
* **`GET /api/incidents`**: Lists all incidents (filters: `wardId`, `severity`, `status`).
* **`POST /api/incidents`**: Submits a report. Takes `latitude`, `longitude`, `description`, `reporterName`, `reporterPhone`.
  - *Automations*: Automatically parses text via AI engine to set labels (`FLOODED_ROAD`, `BLOCKED_DRAIN`, etc.), maps coordinates to the appropriate ward using a point-in-polygon algorithm, sets priority, and recalculates that ward's risk score in the database.
* **`PATCH /api/incidents/[id]`**: Updates `status` (e.g. `RESOLVED`), `severity`, or sets `assignedTo` (e.g. "Squad B"). Recalculates ward risk scores on save.

### 2. Wards & Simulation API
* **`GET /api/wards`**: Returns all wards, their boundary shapes, and scores.
  - *Simulation*: Passing `?rainfall=60` triggers the engine to dynamically recalculate risk scores for all wards under the new storm intensity, updating the map live for the judge.

### 3. Safe Route Planner API
* **`GET /api/safe-route?startLat=x&startLng=y&endLat=a&endLng=b`**: Builds a coordinate path detour. If any segment falls within 250 meters of an active `CRITICAL` or `HIGH` flood report, the algorithm applies a perpendicular offset, detour routing around the flooded hotspot.

### 4. Emergency Broadcasts API
* **`GET /api/alerts`** & **`POST /api/alerts`**: Fetch active alerts or submit a new broadcast (pushes live warning banners to the website header instantly).

---

## ⚙️ Heuristics & Scoring Formulas

### A. Ward Risk Formula (RiskEngine)
$$\text{Risk Score (0-100)} = R_{rainfall} (35\%) + E_{elevation} (25\%) + P_{proximity} (20\%) + R_{reports} (12\%) + H_{history} (8\%)$$
1. **Rainfall**: Linearly scaled up to 50 mm/hr (max 35 points).
2. **Elevation**: Inverted scale; lower altitude increases risk (max 25 points).
3. **Proximity to Drains/River**: Inverted distance scale; closer proximity increases risk (max 20 points).
4. **Active Citizen Reports**: Scaled based on active reports in the area (max 12 points).
5. **Historical Frequency**: Vulnerability modifier based on past incidents (max 8 points).

### B. Heuristic AI Classifier (Image/Text)
Scans description keywords for visual tokens:
- "drain", "clogged", "sewer", "grate" $\rightarrow$ `BLOCKED_DRAIN` (Severity: `MEDIUM`)
- "road", "street", "car", "highway" $\rightarrow$ `FLOODED_ROAD` (Severity: `CRITICAL`)
- "overflow", "river", "deep", "submerged" $\rightarrow$ `MAJOR_WATERLOGGING` (Severity: `HIGH`)
- "wet", "puddle", "slow" $\rightarrow$ `MINOR_WATERLOGGING` (Severity: `LOW`)

---

## 🤖 Prompt Template: How to Feed this to another AI to Improve Project

If you want to feed this project into an AI model to upgrade it, copy and paste the text below:

```text
You are an expert full-stack engineer and geospatial system architect. I have built a Next.js (App Router, TypeScript, Tailwind v4) hackathon MVP called "FloodPulse AI" (find the repository outline in the attached README).

Currently, the project uses Prisma 7 with SQLite and custom math (Haversine distance, Ray-casting point-in-polygon) to simulate PostGIS, along with text heuristics to simulate AI image classification.

Please review the architecture and help me implement the following enhancements:
1. Migrate the SQLite database setup to PostgreSQL + PostGIS (using Prisma schema spatial types or raw SQL queries).
2. Replace the heuristic AI image/text classifier in 'src/services/riskEngine.ts' with a real image classification endpoint using a HuggingFace model or OpenAI API (Vision API) to classify uploaded photos.
3. Integrate a real routing API (like OpenRouteService or Mapbox Directions API) that supports obstacle avoidance (passing our active flood coordinate bounds to get real walking/driving safe routing).
4. Implement WebSockets (using Socket.io or Next.js server actions subscription) so that when a citizen reports an incident, it immediately pops up on the municipal official's dashboard without polling.

Provide step-by-step file edits and structural instructions. Keep code modular.
```
