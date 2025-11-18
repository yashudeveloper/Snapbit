📸 Snapbit

A mobile-first PWA that blends Snapchat-style UI with AI-powered habit tracking.
Users verify habits through snaps powered by Gemini Vision AI, making habit-building authentic, fun, and social.

⸻

🌟 Features

Core
	•	📱 Mobile-First PWA with Snapchat-inspired UI
	•	🤖 AI Habit Verification (Gemini Vision API)
	•	🔥 Smart Scoring & Streaks (soft penalties + bonuses)
	•	👥 Social Layer: friends, chat, leaderboards
	•	🗺️ Location-based habits (OpenStreetMap)
	•	📊 Realtime updates (chat, streaks, leaderboard)

AI Verification
	•	≥ 70% → Auto-Approve
	•	50–69% → Manual Review
	•	< 50% → Auto-Reject
	•	Anti-Cheat: Image hashing, EXIF validation, duplicate detection

Privacy
	•	🔒 Ghost Mode
	•	Location control
	•	Data deletion & export
	•	Secure storage policies

⸻

🏗️ Tech Stack

Frontend: Vite + React + TypeScript + Tailwind + PWA
Backend: Node.js + Express + TypeScript
Database: Supabase (Postgres + Realtime + Storage + Auth)
AI: Google Gemini Vision
Maps: OpenStreetMap
Deploy: Vercel (FE), Railway/Render (BE)

⸻

📂 Project Structure

Snapbit/
├── frontend/       # Vite React PWA
├── backend/        # Node.js + Express API
└── infra/          # Supabase migrations & seed data


⸻

🚀 Quick Start

1. Clone Repository

git clone https://github.com/yashudeveloper/Snapbit
cd Snapbit
npm install


⸻

2. Set Up Supabase
	•	Create new project at supabase.com
	•	Run SQL migrations:
	•	infra/supabase/migrations/
	•	(Optional) Add sample data from seed.sql
	•	Create a storage bucket named snaps

⸻

3. Get API Keys

Supabase
	•	Project URL
	•	anon key
	•	service_role key (keep secret)

Gemini Vision
	•	Generate API key at Google AI Studio
	•	Enable Gemini API in Google Cloud Console

⸻

4. Add Environment Variables

Frontend .env

VITE_SUPABASE_URL=your-url
VITE_SUPABASE_ANON_KEY=your-key

Backend .env

SUPABASE_URL=your-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GEMINI_API_KEY=your-key
PORT=3001


⸻

▶️ Development

Frontend

cd frontend
npm run dev

Backend

cd backend
npm run dev

App opens at:
➡️ http://localhost:5173 (Frontend)
➡️ http://localhost:3001 (Backend)

⸻

📱 Install as PWA

Mobile:
	•	Open in browser → Add to Home Screen

Desktop:
	•	Click the Install icon in browser toolbar

⸻

🧪 Testing

Run tests:

Frontend

npm test

Backend

npm test

Recommended test areas:
	•	Streak logic
	•	AI confidence thresholds
	•	Auth flows
	•	API endpoints
	•	Realtime events

⸻

🚀 Deployment

Vercel (Frontend)
	•	Connect repo
	•	Add environment variables
	•	Deploy automatically on push

Railway/Render (Backend)
	•	Connect repo
	•	Set env vars
	•	Deploy

⸻

🔒 Security
	•	GDPR/CCPA-ready data retention
	•	Rate limiting & input validation
	•	Secure storage for snaps
	•	Duplicate & fake image detection
	•	Full account deletion

⸻

🤝 Contributing
	1.	Fork repo
	2.	Create feature branch
	3.	Make changes + add tests
	4.	Run:

npm run lint && npm test

	5.	Create a pull request

⸻

📜 License

Licensed under the MIT License.
Copyright (c) 2025
Yash Bhardwaj (yashudeveloper)

⸻

🙏 Acknowledgments
	•	Snapchat – UI inspiration
	•	Supabase – backend magic
	•	Google Gemini – AI verification
	•	React Community – ecosystem & tools
	•	Open-source contributors — thank you!

⸻

❤️ Built for Better Habits

Snapbit — Where habits meet community, powered by AI.
	•	Demo GIF
	•	Project logo
भी डिज़ाइन कर सकता हूँ!
