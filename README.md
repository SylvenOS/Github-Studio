# GitPulse

A modular, high-performance **developer profile platform** that generates beautiful, completely customizable SVG components and widgets from your GitHub data. Built for speed and reliability, it serves as a foundation for a full developer ecosystem rather than just another static stats clone.

---

## 🚀 The Vision

The goal is to create a platform where developers can generate completely customizable GitHub profile components. Instead of just a single "Stats" image, **GitPulse** generates:
- Stats cards
- Contribution cards
- Project showcases
- Timeline cards
- Tech stack & Skill radar
- Achievements & Trophies
- Multi-platform Social cards

Everything is generated as crisp, dynamic SVG.

---

## 🏗️ High Level Architecture

```text
                   GitHub API
                        │
                GraphQL + REST
                        │
             ----------------------
             │                    │
         Cache Layer         Data Processor
      (Redis/Memory)        (Normalize Data)
             │                    │
             -----------┬----------
                        │
                 Metrics Engine
                        │
          ----------------------------
          │            │            │
      SVG Engine   Theme Engine   Animation Engine
          │            │            │
          --------------
                 │
          API Endpoints
                 │
          README.md Images
```

---

## 🔗 Endpoints

The API is fully stateless and configurable via URL query parameters.

### 1. Stats Card
Returns a comprehensive summary of your GitHub metrics.
\`GET /api/stats?username=yourname\`

### 2. Trophies & Achievements
Generates a responsive SVG grid of your GitHub achievements, ranked from **E** to **SSS+**.
\`GET /api/achievements?username=yourname\`

### 3. Languages Card
Visualizes your top 5 most used programming languages as a sleek progress bar chart.
\`GET /api/languages?username=yourname\`

### 4. Streak Card
Calculates your current and longest contribution streaks by parsing your GitHub contribution graph.
\`GET /api/streak?username=yourname\`

### 5. Contributions Heatmap
Visualizes the last 365 days of your GitHub contributions as a beautifully color-mapped SVG calendar.
\`GET /api/contributions?username=yourname\`

### 6. Repository Pin Card
Showcase an individual repository, displaying its description, primary language, stars, forks, and size.
\`GET /api/repos?username=yourname&repo=reponame\`

### 7. Developer Profile Platform
Aggregates core GitHub metrics, calculated stats, and multi-platform plugin data (Dev.to, WakaTime) into a unified JSON API.
\`GET /api/profile?username=yourname\`

---

## ⚙️ Configuration & Settings

Customize your cards by appending these query parameters to any SVG endpoint:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| \`username\` | \`string\` | **Required** | The GitHub username to fetch data for. |
| \`repo\` | \`string\` | **Required** (repos) | The name of the repository for the Repo Pin Card. |
| \`theme\` | \`string\` | \`default\` | The visual theme. Available options: \`default\`, \`dark\`, \`sylven\`. |
| \`layout\` | \`string\` | \`grid\` | Layout configuration. Available options: \`grid\`, \`compact\`, \`minimal\`. |
| \`radius\` | \`number\` | Theme specific | Overrides the border-radius of the SVG card. (e.g., \`radius=20\`) |
| \`show_icons\`| \`boolean\`| \`false\` | Toggles icons next to the stats. |
| \`animation\` | \`boolean\`| \`true\` | Enables SVG CSS animations (fades, pulses, glows). Set to \`false\` to disable. |
| \`format\` | \`string\` | \`svg\` | Set to \`json\` on supported endpoints to get raw data. |
| \`bg\` | \`string\` | Theme specific | Custom background color hex code (without #). |
| \`fg\` | \`string\` | Theme specific | Custom foreground/text color hex code (without #). |
| \`accent\` | \`string\` | Theme specific | Custom accent color hex code (without #). |
| \`border\` | \`string\` | Theme specific | Custom border color hex code (without #). |
| \`muted\` | \`string\` | Theme specific | Custom muted text color hex code (without #). |

---

## 🛠️ Tech Stack & Folder Structure

**Frontend & Backend:** Next.js, Hono, TypeScript, Tailwind  
**Rendering:** satori, resvg, svg.js  
**Caching & Deployment:** Redis (Upstash), Cloudflare Workers / Vercel

### Core Modules
1. **GitHub API Layer**: Auth, GraphQL, REST, rate limits.
2. **Metrics Engine**: Converts raw data to useful metrics (e.g. Repository Health, Contribution Trend).
3. **Theme Engine**: JSON-driven theming without code changes.
4. **SVG Engine**: Renders dynamic Cards, Charts, Animations, and Layouts.

---

## 🗺️ Roadmap

### Phase 1: Foundation
- [x] API layer & GitHub integrations
- [x] Basic Profile & Stats Cards
- [x] SVG rendering pipeline

### Phase 2: Core Widgets
- [x] Trophies & Achievement Cards
- [ ] Repository & Languages Cards
- [ ] Streak & Contribution Graph
- [x] Theme engine

### Phase 3: Advanced Features
- [ ] SVG Chart Engine (Bar, Line, Radar, Sparkline)
- [ ] SVG Animation Engine (Glows, Fade, Floating Icons)
- [ ] Configurable Layout Engine (Grid, Masonry, Minimal)

### Phase 4: Platform
- [ ] Documentation website
- [ ] Live playground with instant preview
- [ ] Theme editor & Template gallery

### Phase 5: Community
- [ ] CLI (\`create-devcard\`)
- [ ] Theme submission process & Plugin API

---
*Built for the open-source community.*