# 📸 Snapbit
A mobile-first PWA that blends Snapchat-style UI with AI-powered habit tracking.  
Users verify habits through snaps powered by **Gemini Vision AI**, making habit-building *authentic, fun, and social*.

---

## 🌟 Features

### Core
- 📱 **Mobile-First PWA** with Snapchat-inspired UI  
- 🤖 **AI Habit Verification** (Gemini Vision API)  
- 🔥 **Smart Scoring & Streaks** (soft penalties + bonuses)  
- 👥 **Social Layer:** friends, chat, leaderboards  
- 🗺️ **Location-based habits** (OpenStreetMap)  
- 📊 **Realtime updates** (chat, streaks, leaderboard)

### AI Verification Logic
- ≥ 70% → Auto-Approve  
- 50–69% → Manual Review  
- < 50% → Auto-Reject  
- Anti-Cheat: Image hashing, EXIF validation, duplicate detection

### Privacy
- 🔒 Ghost Mode  
- Manual location controls  
- Full data deletion & export  
- Secure storage

---

## 🏗️ Tech Stack

**Frontend:** Vite + React + TypeScript + Tailwind + PWA  
**Backend:** Node.js + Express + TypeScript  
**Database:** Supabase (Postgres + Realtime + Storage + Auth)  
**AI:** Google Gemini Vision  
**Maps:** OpenStreetMap  
**Deployment:** Vercel (FE) & Railway/Render (BE)

---

## 📂 Project Structure
