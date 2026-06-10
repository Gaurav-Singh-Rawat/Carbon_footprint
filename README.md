# EcoTrace | Carbon Footprint Awareness & Reduction Platform

EcoTrace is a premium, interactive Single Page Application (SPA) designed to help individuals understand, track, and reduce their carbon footprint through quantitative calculations, daily challenges, and real-time habit simulators.

Built for the **Hac2Skill AI PromptWars Challenge 3**.

---

## 1. Chosen Vertical
**Climate Change & Sustainability: Carbon Footprint Tracking and Awareness**
EcoTrace addresses the individual carbon footprint by providing a transparent, visual, and gamified interface that translates complex greenhouse gas (GHG) calculations into simple, daily actions.

---

## 2. Approach & Logic

The application logic (built in vanilla ES6+ JS) implements a modular calculation engine that updates dashboard metrics dynamically:

### Calculation Formula Rules (Annual Emissions in Tons CO₂e):
* **Transportation**:
  ```text
  Car Emissions = (Weekly Miles × 52 × Vehicle Factor) / 1000
  Flight Emissions = (Annual Flight Hours × 90) / 1000
  Transit Emissions = (Weekly Public Transit Hours × 52 × 1.2) / 1000
  ```
  *(Factors in kg CO₂e/mile: Large SUV = 0.45, Medium Sedan = 0.35, Diesel = 0.31, Hybrid = 0.20, EV = 0.08, None = 0.0)*
* **Home Energy**:
  ```text
  Electricity Emissions = ((Electricity Bill / 0.15) × 12 × 0.38 × (1 - Clean Energy Ratio)) / (Roommates × 1000)
  Natural Gas Emissions = ((Gas Bill / 1.00) × 12 × 5.3) / (Roommates × 1000)
  ```
* **Diet & Food**:
  ```text
  Food Impact = Diet Profile Base + Waste Adjustment + Local Sourcing Adjustment
  ```
  *(Diet Bases: Meat Lover = 3.0T, Balanced = 2.0T, Flexitarian = 1.5T, Vegetarian = 1.1T, Vegan = 0.6T)*
* **Waste & Shopping**:
  ```text
  Waste Impact = Shopping Profile Base + Recycler Credit + Composting Credit
  ```
  *(Shopping Bases: Minimalist = 0.4T, Average = 0.9T, Heavy = 2.0T)*

### Core Feature Interactions:
* **Interactive Simulator**: Scales down baseline emissions dynamically as sliders are moved (e.g. reducing car commute by 50% reduces the transport car emission sector by half in real time).
* **Gamification (XP/Leveling)**: Completing daily challenges increases points. Level is calculated as:
  ```text
  Level = floor(XP / 100) + 1
  ```
* **Prioritized Recommendations**: The Reduction Roadmap dynamically parses computed scores to place suggestions related to the user's highest emitting category at the top of the interface.

---

## 3. How the Solution Works (User Flow)
1. **Onboarding / Calculator**: The user completes the 4-step calculator (Transport, Home, Diet, Waste) to build their base carbon footprint profile.
2. **Dashboard Review**: The user inspects their total emissions, visualizes category breakdowns via a Donut Chart, and compares their performance against global/US averages.
3. **Simulate Shifting Habits**: Users drag sliders on the simulator card to immediately preview how future lifestyle changes (e.g., green electricity or plant-based days) would upgrade their carbon letter grade (A to F).
4. **Take Action (Eco-Challenges)**: Users check off completed daily checklist actions (e.g., short showers, bicycling), gaining XP and reducing today's carbon footprint pill indicator.
5. **Personalized Roadmap**: Users read detailed implementation steps for high-impact carbon offset adjustments, customized dynamically to target their highest-emitting areas first.

---

## 4. Assumptions Made
1. **Utility Rates**: Assumed a national average household rate of \$0.15 per kWh for electricity and \$1.00 per therm for natural gas.
2. **Flight Factors**: Radiative forcing and typical airline consumption are combined into a standardized factor of 90 kg CO₂e per flight hour.
3. **Food and Waste Averages**: Baseline diet profiles and waste credits are adapted from standard EPA and IPCC lifestyle carbon intensity index estimates.
4. **Data Persistence**: Client-side data is persisted locally in the browser's `localStorage` to bypass database and network overhead.

---

## 5. Evaluation Focus Areas

### 💻 Code Quality
* **Separation of Concerns**: Built strictly using decoupled files: `index.html` (semantic layout), `style.css` (design system tokens & responsiveness), and `app.js` (application state & chart renders).
* **Readability**: Code includes extensive inline documentation and clean, descriptive variable names.
* **No Framework Bloat**: Developed in vanilla JS to minimize third-party loading delays.

### 🛡️ Security
* **Zero Input Injection**: Inputs are validated client-side with explicit numeric constraints and HTML attributes.
* **No Server Vulnerability Surface**: Because data handles locally in the client context, there are zero risks of server hacks or database SQL injection/XSS vulnerabilities.

### ⚡ Efficiency
* **Resource Optimization**: Core libraries (Chart.js and Lucide Icons) are loaded via high-availability CDNs.
* **Performance**: Visual animations and layout rendering utilize optimized CSS hardware-acceleration elements (`transform`, `opacity`, CSS grid transitions).

### 🧪 Testing
* **Verification**: Fully tested using automated browser agents verifying navigation flows, form submission computations, dark/light theme switching, and real-time math correctness.

### ♿ Accessibility (A11y)
* **High Contrast**: Dark theme colors meet WCAG contrast guidelines, using clean Obsidian backgrounds and vibrant colored tags.
* **Theme-Adaptive Dropdowns**: Custom select styling fixes white-on-white text dropdown visibility issues across operating systems.
* **Aria & Semantics**: Utilizes native HTML5 elements (`<aside>`, `<main>`, `<header>`) and buttons with clear labels for screen readers.
