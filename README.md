# FloodPulse AI 🌧️🗺️
> **Hyperlocal Flood and Drainage Risk Intelligence Platform for Smart Cities**

FloodPulse AI is a responsive full-stack climate-resilience web application designed to help citizens, municipal engineers, and disaster response teams monitor, report, and respond to urban flooding and drainage failures in real time.

This project is built as a production-quality hackathon MVP using **Next.js (App Router), TypeScript, Tailwind CSS, Prisma 7, and SQLite (simulating PostGIS)**.

---

## 🏗️ Technical Architecture & Stack

- **Frontend & GIS**: Next.js App Router (TypeScript), Tailwind CSS, Leaflet.js (`react-leaflet`) with Esri World Imagery Satellite Map & World Places Hybrid Label base layers, Nominatim geocoding API integration, browser Geolocation tracking, lightweight zoom-based client-side marker clustering, Lucide Icons, and Recharts.
- **Backend & APIs**: Next.js Serverless Route Handlers (`app/api/*`) exposing clean REST endpoints.
- **Database Layer**: SQLite powered by Prisma 7. The setup leverages a custom driver adapter (`better-sqlite3`) to connect serverless functions.
- **AI & Analytics**: 
  - **Dynamic Digital Twin Simulation**: Mathematical risk and physical engine modeling rainfall accumulation, topography/elevation, drainage network densities, and historical profiles to output dynamic flood inundation GeoJSON boundaries and impact metrics.
  - **Satellite Remote Sensing Engine**: Processes Sentinel-1 SAR (Synthetic Aperture Radar) backscatter thresholding and Sentinel-2 NDWI (Normalized Difference Water Index) multi-spectral inputs to detect active water surfaces.
  - **Conversational AI Copilot**: Advanced multi-role LLM agent architecture (powered by OpenRouter with a robust failsafe generator) equipped with dynamic tool calling (e.g., retrieving incidents, modifying severity, executing simulations, analyzing satellite imagery).
  - **Zero-Shot NLP Classifier**: Connects to classification pipelines (`facebook/bart-large-mnli`) to dynamically parse description texts (e.g., classifying into `FLOODED_ROAD` or `BLOCKED_DRAIN`) with simulated latency fallbacks.

---

## 📁 File Structure

The project has been initialized and organized with modular clean-code practices:

```text
├── prisma/
│   ├── dev.db              # SQLite Local Database file
│   ├── schema.prisma       # Prisma 7 Database schema definitions
│   └── seed.ts             # Seeding script with MCGM South Mumbai, Bengaluru, Chennai, etc.
├── public/
│   └── uploads/            # Target directory for simulated/actual image uploads
├── src/
│   ├── app/
│   │   ├── api/            # Serverless API routes
│   │   │   ├── alerts/     # Broadcast emergency system alerts (GET/POST)
│   │   │   ├── copilot/    # Copilot agent, planner, memory, and chat endpoints
│   │   │   ├── digital-twin/ # Simulation controls, scenario run, and polygon generators
│   │   │   ├── incidents/  # Fetch and submit waterlogging reports (GET/POST)
│   │   │   ├── incidents/[id]/ # Update severity, dispatch agency, or resolve (PATCH)
│   │   │   ├── predictions/ # Flood prediction engine triggers and outputs
│   │   │   ├── safe-route/ # Calculate safe detours avoiding active flood points (GET)
│   │   │   ├── satellite/  # Satellite analysis request handler and heatmaps
│   │   │   ├── upload/     # Image storage local handler (POST)
│   │   │   └── wards/      # Ward profiles & dynamic rainfall risk simulator (GET)
│   │   ├── citizen/        # Citizen page (Interactive reporting, safe routing & AI copilot)
│   │   ├── municipal/      # Municipal control panel (Rainfall slider, crew dispatch & triage copilot)
│   │   ├── digital-twin/   # Digital Twin visualization portal
│   │   ├── satellite/      # Remote Sensing Sentinel data control center
│   │   ├── disaster/       # Disaster Ops room (Broadcast warnings, charts, CSV export)
│   │   ├── globals.css     # Tailwinds setup, scrollbars, and Leaflet custom CSS overrides
│   │   ├── layout.tsx      # SEO metadata configuration and base HTML container
│   │   └── page.tsx        # High-converting Dark Climate-Tech landing page
│   ├── components/
│   │   ├── CitizenCopilot.tsx   # Floating Citizen AI Copilot with spatial awareness
│   │   ├── MunicipalCopilot.tsx # Embedded triage Copilot with tool execution powers
│   │   ├── DigitalTwinMap.tsx   # Leaflet Map visualizing simulated flood polygon overlays
│   │   ├── SatelliteMap.tsx     # Map rendering NDWI / SAR remote sensing overlays
│   │   ├── InteractiveMap.tsx   # Interactive Leaflet.js map for reporting & routing
│   │   ├── MapLoader.tsx        # Dynamic wrapper (SSR: false) for Map components
│   │   └── Navigation.tsx      # Dynamic header linking pages with real-time warning banners
│   ├── services/
│   │   ├── db.ts               # Centralized PrismaClient singleton using better-sqlite3 adapter
│   │   ├── aiService.ts        # Zero-shot HuggingFace AI classification pipeline wrapper
│   │   ├── riskEngine.ts       # Core algorithms for risk scoring and heuristic classification
│   │   ├── digitalTwinEngine.ts # Inundation geometry simulator and population impact calculator
│   │   ├── satelliteFloodService.ts # NDWI / SAR remote sensing analysis pipelines
│   │   ├── floodPredictionEngine.ts # Predictive ward danger levels based on forecasts
│   │   └── wardHelper.ts       # Point-in-polygon math & dynamic ward recalculation handler
```

---

## 🗄️ Database Schema (Prisma)

- **`City`**: Main municipal divisions hosting spatial coordinates and relationships.
- **`Ward`**: Represents administrative boundary zones. Stores GeoJSON boundary polygons, population, road density, dynamic risk scores, and qualitative risk levels (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
- **`IncidentReport`**: Incident logs containing reporting GPS coordinates, reporter details, descriptions, image paths, AI classification results (label and confidence score), status (`REPORTED`, `INVESTIGATING`, `DISPATCHED`, `RESOLVED`), and assigned agency.
- **`EmergencyAlert`**: Broadcast messages showing critical city warning banners.

---

## 📍 Multi-City Geographical Scope

The map, database, and boundary limits are fully configured to support **five major urban centers in India**:

1. **Mumbai** (South Mumbai limits covering Wards A, B, and C)
2. **Bengaluru** (Mahadevapura and Bommanahalli wards)
3. **Chennai** (Velachery and T-Nagar wards)
4. **Hyderabad** (Begumpet and Khairatabad wards)
5. **Guwahati** (Zoo Road and Anil Nagar wards)

Each city features a realistic, non-rectangular geographic boundary polygon mapped in the GIS layer, and comes pre-seeded with localized flood risk parameters, wards, alerts, and active incident hotspots.

---

## 🔌 API Reference Guide

### 1. Incidents API
* **`GET /api/incidents`**: Lists all incidents (filters: `wardId`, `severity`, `status`).
* **`POST /api/incidents`**: Submits a report. Takes `latitude`, `longitude`, `description`, `reporterName`, `reporterPhone`.
  - *Automations*: Automatically parses text via AI engine to set labels (`FLOODED_ROAD`, `BLOCKED_DRAIN`, etc.), maps coordinates to the appropriate ward using a point-in-polygon algorithm, sets priority, and recalculates that ward's risk score in the database.
* **`PATCH /api/incidents/[id]`**: Updates `status` (e.g. `RESOLVED`), `severity`, or sets `assignedTo` (e.g. "Squad B"). Recalculates ward risk scores on save.

### 2. Wards & Simulation API
* **`GET /api/wards`**: Returns all wards, their boundary shapes, and scores.
  - *Simulation*: Passing `?rainfall=60` triggers the engine to dynamically recalculate risk scores for all wards under the new storm intensity, updating the map live.

### 3. Safe Route Planner API
* **`GET /api/safe-route?startLat=x&startLng=y&endLat=a&endLng=b`**: Builds a coordinate path detour. If any segment falls within 250 meters of an active `CRITICAL` or `HIGH` flood report, the algorithm applies a perpendicular offset, detour routing around the flooded hotspot.

### 4. Digital Twin API
* **`POST /api/digital-twin/simulate`**: Runs physical simulations on the city model. Generates flood inundation polygons based on rainfall rate (mm/hr) and simulation duration hours (3h, 6h, 12h, 24h), calculating road damage (km) and affected residents.

### 5. Satellite Analytics API
* **`POST /api/satellite/analyze`**: Runs satellite remote sensing algorithms (Sentinel-1 SAR / Sentinel-2 NDWI) on the target city boundary to detect surface water, returning GeoJSON geometries and detection confidence metrics.

---

## ⚙️ Heuristics & Scoring Formulas

### A. Ward Risk Formula (RiskEngine)
$$\text{Risk Score (0-100)} = R_{rainfall} (30\%) + E_{elevation} (20\%) + P_{proximity} (20\%) + R_{reports} (15\%) + H_{history} (15\%)$$
1. **Rainfall**: Linearly scaled up to 50 mm/hr (max 30 points).
2. **Elevation**: Inverted scale; lower altitude increases risk (max 20 points).
3. **Proximity to Sea/Water discharge**: Inverted distance scale; closer proximity increases risk (max 20 points).
4. **Active Citizen Reports**: Scaled based on active reports in the area (max 15 points).
5. **Historical Frequency**: Vulnerability modifier based on past incidents (max 15 points).

### B. Remote Sensing Indices
- **NDWI (Normalized Difference Water Index)**: Uses Sentinel-2 green ($B03$) and NIR ($B08$) bands to classify water surfaces:
  $$\text{NDWI} = \frac{\text{Green} - \text{NIR}}{\text{Green} + \text{NIR}}$$
  A threshold of $\text{NDWI} > 0.28$ is applied to isolate flooded surfaces.
- **SAR Backscatter Thresholding**: Sentinel-1 Synthetic Aperture Radar detects water surfaces as regions of low backscatter coefficient (specular reflection of radar waves off smooth water surfaces).

---

## 🛠️ Getting Started & Setup

1. **Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL="file:./dev.db"
   OPENROUTER_API_KEY="your_openrouter_api_key_here"
   ```
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Run Database Migrations & Seeds**:
   ```bash
   npx prisma db push
   npx prisma db seed
   ```
4. **Run Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 📊 Pitch Deck / Presentation Guide (10-Slide Structure)

Use this high-impact structure to compile the ultimate hackathon pitch deck for **FloodPulse AI**:

### Slide 1: The Title & Hook
* **Title**: FloodPulse AI
* **Subtitle**: Hyperlocal Flood & Drainage Risk Intelligence for Smart Cities
* **Visual Hook Ideas**: Dark-mode mockup of the live interactive GIS map with glowing critical risk zones and satellite overlays.
* **Key Message**: A real-time, multi-city climate-resilience platform bridging the gap between citizens, municipal engineers, and disaster response teams.

### Slide 2: The Problem
* **Header**: The Cost of Urban Inundation
* **Key Bullet Points**:
  * **Critical Blindspots**: Municipalities lack real-time, block-by-block GIS visibility of waterlogging and clogged drains.
  * **Fragmented Data**: Weather reports, citizen complaints, and satellite imagery operate in silos.
  * **Economic & Human Cost**: Flooded streets block emergency services, damage infrastructure, and disrupt millions of lives.
* **Metric Callout**: *Urban flooding damages cost global smart cities billions annually, with response delays measured in hours instead of minutes.*

### Slide 3: The Solution
* **Header**: FloodPulse AI: The Unified Command Center
* **Key Bullet Points**:
  * **Unified GIS Portal**: Integrates active citizen reports, sensor simulations, and satellite remote sensing.
  * **Intelligent Routing**: Keeps citizens safe via dynamically adjusted detour routing avoiding active hazard zones.
  * **Proactive Response**: Empowers municipal officials with real-time risk maps, rainfall simulators, and automated workforce dispatching.

### Slide 4: Feature Focus — Interactive GIS & Smart Safe Routing
* **Header**: Localized Reporting & Dynamic Obstacle Detouring
* **Key Bullet Points**:
  * **Hyperlocal Pinpointing**: Zero-shot AI classifies citizen reports (e.g. `FLOODED_ROAD` vs `BLOCKED_DRAIN`) and auto-assigns priority.
  * **Point-in-Polygon Engine**: Instantly associates coordinates with municipal boundaries using ray-casting.
  * **Safe-Route Algorithm**: Calculates detours with a 250m perpendicular offset buffer around active critical hazard zones.

### Slide 5: Feature Focus — Digital Twin Simulation Engine
* **Header**: Predictive Inundation & Impact Modeling
* **Key Bullet Points**:
  * **Real-time Recalculation**: Adjust a live rainfall slider to see instant ward-level risk score updates.
  * **Physics-based Inundation**: Models elevation profiles, drainage capacity, and water accumulation over time.
  * **Impact Assessment**: Instantly displays projected metrics for road damage (km) and affected populations to optimize prevention plans.

### Slide 6: Feature Focus — Remote Sensing & Satellite Analytics
* **Header**: Space-Based Flood Detection
* **Key Bullet Points**:
  * **Dual-Satellite Processing**: Support for Sentinel-1 SAR (Radar backscatter) and Sentinel-2 NDWI (Multi-spectral imagery).
  * **Sentinel Hub Integration**: Leverages optimized evalscripts (NDWI water index thresholds) to process live space-borne captures.
  * **Precision Overlays**: Translates complex satellite band data into interactive GIS overlays with confidence scores.

### Slide 7: Feature Focus — Role-Based AI Copilots
* **Header**: Multi-Role Spatial Agents
* **Key Bullet Points**:
  * **Citizen Copilot**: Explains local risks, helps submit geolocated reports, and suggests safe travel routes.
  * **Municipal Copilot**: Triages incident queues, auto-dispatches maintenance crews, and runs scenario simulations.
  * **Autonomous Tool Calling**: LLM planning agent equipped with dynamic API tools to fetch, edit, and analyze platform data.

### Slide 8: Technical Architecture & Production-Grade Stack
* **Header**: Engineered for Scale & Zero-Latency Response
* **Key Bullet Points**:
  * **Framework**: Next.js 15 (App Router) & TypeScript for a fast, responsive UI.
  * **Data Layer**: Prisma 7 ORM with SQLite (custom geospatial adapters simulating PostGIS).
  * **GIS Layer**: Leaflet.js with ESRI World Imagery base maps, geocoding, and custom vector overlays.
  * **AI Stack**: HuggingFace NLP models (zero-shot classification) + OpenRouter LLM orchestration.

### Slide 9: Market Fit & Future Scalability
* **Header**: Scaling Beyond Hackathons
* **Key Bullet Points**:
  * **B2G (Business-to-Government)**: Command dashboards sold to smart city municipal corporations.
  * **B2B Integration**: API licenses for logistics, ride-sharing (safe routing), and property insurance risk modeling.
  * **Community Ecosystem**: Crowdsourced reporting rewards and gamified civic engagement incentives.

### Slide 10: The Vision & Future Roadmap
* **Header**: Engineering a Climate-Resilient Tomorrow
* **Key Bullet Points**:
  * **Phase 1 (Done)**: Live interactive GIS map, multi-city data seeding, Digital Twin simulator, Satellite NDWI/SAR, and AI Copilots.
  * **Phase 2 (Next)**: IoT sensor array integration (ultrasonic water level sensors in sewers) and real-time WebSockets synchronization.
  * **Call to Action**: *FloodPulse AI doesn't just track floods—it predicts, detours, and dispatches to save lives.*

