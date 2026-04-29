# 🌐 GlobalTrade — B2B International Trade Platform

A full-stack B2B marketplace platform built for international trade, featuring real-time messaging, KYC verification, Smart Deal-Rooms, and multi-currency support.

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | TailwindCSS + Radix UI + Framer Motion |
| Backend | Supabase (Auth, Database, Realtime, Storage) |
| Payments | Stripe |
| i18n | i18next / react-i18next |
| 3D | Three.js / React Three Fiber |
| Deployment | Docker + Google Cloud Run |

---

## ✨ Features

- **Marketplace** — Post and browse international trade listings with verified sellers
- **Smart Deal-Room** — Secure document vault (VDR) with NDA workflows and PDF export
- **KYC / Verified Badge** — Identity verification system with admin review panel
- **Real-time Messaging** — Supabase Realtime-powered chat with conversation management
- **Live Activity Feed** — Live global trade activity stream
- **Multi-language** — Full i18n support (EN / FR / AR / ZH / ES / PT)
- **Dark Mode** — System-aware dark/light theme with liquid-glass design system
- **Analytics Dashboard** — Trade volume, conversion rates, and regional heatmaps
- **Stripe Integration** — Subscription plans and payment processing

---

## ⚙️ Getting Started

### Prerequisites

- Node.js ≥ 18
- pnpm (`npm install -g pnpm`)
- A [Supabase](https://supabase.com) project

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd GlobalTrade3-1

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# → Fill in your Supabase URL, Anon Key, and Stripe keys

# Run database migrations
# Execute setup_database.sql then setup_vdr.sql in your Supabase SQL editor

# Start the dev server
pnpm dev
```

### Environment Variables

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

---

## 🐳 Docker / Production

```bash
# Build Docker image
docker build -t globaltrade .

# Run container
docker run -p 8080:8080 globaltrade
```

Cloud Run deployment is handled via `cloudbuild.yaml`.

---

## 📁 Project Structure

```
src/
├── components/       # Reusable UI components
├── pages/            # Route-level page components
├── hooks/            # Custom React hooks
├── lib/              # Utilities, Supabase client, i18n config
├── types/            # TypeScript type definitions
└── globals.css       # Global styles & design tokens
supabase/             # Supabase Edge Functions & migrations
setup_database.sql    # Main DB schema
setup_vdr.sql         # Virtual Data Room schema
```

---

## 📄 License

Private — All rights reserved © 2026 GlobalTrade
