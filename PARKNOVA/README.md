# PARKNOVA – Smart Parking Discovery and Reservation Platform
> **Tagline:** Find Your Space. Park with Confidence.  
> **Type:** College Major Project Frontend Prototype  
> **Tech Stack:** HTML5, CSS3, Vanilla JavaScript (ES6+), Leaflet.js, OpenStreetMap, Chart.js, QRCode.js

---

## 1. Project Overview
**PARKNOVA** is a commercial SaaS-grade smart mobility web platform engineered to eliminate urban traffic congestion and parking hunt delays. It connects drivers seeking guaranteed parking bays with commercial parking owners and platform administrators through real-time geospatial discovery, interactive visual multi-tier slot selectors, contactless digital QR parking passes, transparent GST tariff calculators, and analytical reporting.

---

## 2. Technology Stack & Strict Standards
- **HTML5:** Semantic architecture, accessible forms, data attributes, and modal dialogs.
- **CSS3:** Custom design tokens, CSS Grid, Flexbox, responsive typography, soft shadow elevations, and print-ready ticket styling (`window.print()`).
- **Vanilla JavaScript:** 10 decoupled, reusable modules with zero frontend framework dependencies (No React, Angular, Vue, or TypeScript).
- **Libraries (CDN Only):**
  - **Leaflet.js 1.9.4 & OpenStreetMap:** Real-time geospatial mapping, custom color-coded availability heatmap pins, and user geolocation.
  - **Chart.js:** Revenue progression and bay occupancy ratio charts.
  - **QRCode.js:** High-density 2D digital ticket barcode generation.
  - **FontAwesome 6.5:** Vector icons for transport categories and dashboard navigation.

---

## 3. User Roles & Capabilities

### Driver Portal
- User registration and login with route guards.
- Live geospatial parking discovery with proximity distance calculation.
- Dynamic availability heatmap indicators (**Green**: High Availability, **Yellow**: Limited, **Red**: Full).
- Multi-floor visual slot selection with color-coded bay status (`Available`, `Occupied`, `Reserved`, `Selected`, `Maintenance`).
- Transparent parking fee breakdown (Base Tariff + 18% GST).
- Double-booking prevention algorithm guarding shared LocalStorage state.
- Digital QR code parking pass generation with real-time countdown timer.
- Booking cancellation with instant slot release.
- Complete parking history with simulated gate entry and exit timestamps.
- Profile and saved vehicle registry (Cars, Bikes, EVs).

### Parking Owner Portal
- Isolated access: Owners can exclusively view and manage their own facilities.
- Facility listing module with city coordinate presets, operating hours, and initial bay generation.
- Facilities submitted enter a **Pending** status awaiting platform Admin approval.
- Visual multi-floor slot manager: Add floors, configure slots, and override bay states (`Available`, `Occupied`, `Maintenance`).
- Gate barrier control: Verify digital QR tickets, execute **Barrier IN** (Check-In) and **Barrier OUT** (Check-Out).
- Financial audits with daily revenue bar charts and CSV report downloads.

### Platform SuperAdmin Portal
- Global KPI metrics: Total drivers, owners, facilities, approved/pending lots, and platform GMV.
- Verification and approval queue: Inspect submitted facilities, grant approval, or record rejection notes.
- Master user directory: Search drivers and owners, toggle account status (`Active` / `Deactivated`).
- Master bookings ledger: Search all platform transactions, filter by date, and execute administrative cancellations.
- Helpdesk and feedback manager: Review driver tickets, update status (`Pending`, `In-Progress`, `Resolved`), and append admin remarks.
- Multi-dataset RFC-4180 CSV export engine (Bookings, Revenue, and User accounts).

---

## 4. Single-Click Demo Credentials

On the `login.html` page, click any of the demo pills for instant credential population and role selection:

| Role | Name | Email | Password | Pre-seeded Context |
| :--- | :--- | :--- | :--- | :--- |
| **SuperAdmin** | Admin | `admin@parknova.demo` | `Password@123` | Master platform control, approval queue, all bookings & users |
| **Parking Owner** | Rajesh Sharma | `owner1@parknova.demo` | `Password@123` | Central Plaza (Trichy) & Srirangam Heritage Lot |
| **Parking Owner** | Kavita Sundaram | `owner2@parknova.demo` | `Password@123` | T. Nagar Tower (Chennai) & MG Road Metro (Bengaluru) |
| **Driver** | Arjun Das | `driver1@parknova.demo` | `Password@123` | Saved vehicles, active upcoming booking & completed logs |
| **Driver** | Priya Nair | `driver2@parknova.demo` | `Password@123` | Saved EV vehicle & resolved platform feedback ticket |

---

## 5. Storage Architecture (Demo Notice)

All data is stored inside the browser's `LocalStorage` with prefix `parknova_`.
- `users`: User profiles, passwords, roles, avatars, and account standing.
- `parkings`: Facility metadata, addresses, coordinates, approval states, and hourly tariffs.
- `floors`: Facility floor tiers and names.
- `slots`: Individual bays with vehicle classification and operational base status.
- `bookings`: Reservations, timestamps, amounts, payment simulation, and QR data payloads.
- `vehicles`: Registered driver vehicles with default flags.
- `complaints`: User grievance tickets with resolution logs.

> **Important Demo Limitation:** LocalStorage is suitable only for a single-browser prototype demonstration. It is not an enterprise cryptographic multi-user database and does not sync across separate physical devices.

---

## 6. How to Run the Application

1. Open the project root in VS Code or any static web server:
   ```bash
   cd PARKNOVA
   ```
2. Run with VS Code **Live Server** extension, or start an HTTP server:
   ```bash
   npx serve .
   # OR
   python -m http.server 8080
   ```
3. Open `http://localhost:8080` in your web browser.
