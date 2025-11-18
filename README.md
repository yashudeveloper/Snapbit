# Snapbit – AI Powered Habit Tracking PWA (Open Source)

Snapbit is an AI‑powered habit tracker with real‑time updates, streak protection, smart reminders, and proof‑based habit verification.  
This project is fully open‑source and includes **frontend (PWA), backend (Node.js API), and Supabase infra**.

---

## 🚀 Features

### ✅ Core Features
- AI‑verified habit completion  
- Photo/video proof submission  
- Smart reminders & habit nudges  
- Real‑time sync (Supabase)  
- Chat interface with AI coach  
- Offline‑ready PWA  
- Multi-device support  

### 🧠 AI Features
- Proof validation (image/video)  
- AI suggestions for habit improvement  
- Natural‑language habit creation  
- AI‑generated insights  

---

## 📁 Project Structure

```
Snapbit/
├── frontend/                 # Vite + React + TypeScript PWA
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── screens/         # App screens (Home, Habit, Chat, Camera…)
│   │   ├── contexts/        # Global state (Auth, Habits, Realtime)
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Supabase client, utilities
│   │   └── services/        # API & AI service functions
│   ├── public/              # PWA icons & manifest
│   └── package.json
│
├── backend/                  # Node.js + Express API
│   ├── src/
│   │   ├── routes/          # All API routes
│   │   ├── services/        # Business logic & AI verification
│   │   ├── middleware/      # Auth checks, rate limiting
│   │   ├── config/          # Env, supabase config
│   │   └── types/           # TypeScript types
│   └── package.json
│
├── infra/
│   └── supabase/
│       ├── migrations/      # DB schema
│       └── seed.sql         # Sample data
│
├── .env.example              # Environment variable template
├── README.md
└── LICENSE
```

---

## 🛠️ Tech Stack

### **Frontend**
- React (Vite + TypeScript)
- TailwindCSS
- React Router
- PWA support
- Supabase Realtime

### **Backend**
- Node.js + Express
- Supabase DB
- JWT Auth
- AI Verification Service

### **Infra**
- Supabase (DB + Auth + Edge Functions)
- Optional: Docker (coming soon)

---

## ⚙️ Setup Instructions

### 1️⃣ Clone The Repo
```bash
git clone https://github.com/yourusername/snapbit.git
cd snapbit
```

---

## 🧩 Environment Variables

Copy `.env.example` → `.env` in both frontend & backend.

### **Frontend ENV**
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_URL=
```

### **Backend ENV**
```
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
JWT_SECRET=
AI_API_KEY=
```

---

## ▶️ Run Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## ▶️ Run Backend

```bash
cd backend
npm install
npm run dev
```

---

## 🗄️ Database Setup

### Apply migrations:
```bash
cd infra/supabase
supabase db push
```

### Optional: Seed data
```bash
supabase db reset
```

---

## 📌 TODO – Roadmap

- [ ] Add AI-based habit scoring  
- [ ] Create habit-sharing communities  
- [ ] Add weekly reports  
- [ ] Add push notifications  
- [ ] Dark mode  
- [ ] Offline habit proof queue  

---

## 🤝 Contributing

PRs are welcome!  
Create a branch → Push changes → Open Pull Request.

---

## 🪪 License

This project is open‑source under **MIT License**.  
Free for commercial + personal use.

---

## 🌟 Support

If this project helps you, consider ⭐ starring the repo!  
