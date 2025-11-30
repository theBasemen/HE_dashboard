# Himmelstrup Events - Business Command Center

Et moderne dashboard til at samle virksomhedens vigtigste nøgletal (Økonomi, SEO og AI/LLM synlighed) ét sted.

## Teknisk Stack

- **Vite** - Build tool og dev server
- **React 18** - UI framework
- **TypeScript** - Type safety
- **React Router DOM v6** - Routing
- **Tailwind CSS** - Styling (moderne SaaS dashboard look)
- **Lucide React** - Icons
- **Recharts** - Charts og visualiseringer

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

Åbn browseren på `http://localhost:5173`

## Build

```bash
npm run build
```

## Projektstruktur

```
src/
├── components/
│   └── DashboardLayout.tsx    # Hovedlayout med sidebar
├── pages/
│   ├── FinancePage.tsx         # Økonomi & Likviditet (hovedside)
│   ├── SEOPage.tsx            # SEO & Trafik (placeholder)
│   └── LLMPage.tsx            # LLM / AI Synlighed (placeholder)
├── data/
│   └── financeMock.ts         # Mock data for økonomi
├── App.tsx                    # Router setup
├── main.tsx                   # Entry point
└── index.css                  # Tailwind imports
```

## Features

### Økonomi & Likviditet (Hjem)
- **KPI Kort**: Likviditet (Bank), Skyldig Moms, Runway (Måneder)
- **Likviditetsudvikling**: 24 måneders prognose med AreaChart
- **Dynamisk farvekodning**: Grøn når positiv, rød når negativ
- **Scenarie Toggle**: "Inkluder 2x nye ansættelser" for at se effekten af nye ansættelser

### SEO & Trafik
- Placeholder side med KPI kort (Clicks, Impressions, Avg Position)
- Månedlig trafik bar chart med dummy data

### LLM / AI Synlighed
- Eksperimentelt dashboard
- "Share of Model" card
- Liste over seneste AI-Audit tjek

## Responsiv Design

Dashboardet er fuldt responsivt med:
- Kollapsbar sidebar på mobil
- Responsive grid layouts
- Mobile-first approach

## Næste Skridt

- Integrer rigtige data kilder
- Implementer scenarie toggle logik
- Tilføj flere visualiseringer
- Tilføj data refresh funktionalitet




