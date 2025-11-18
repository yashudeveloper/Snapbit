# SnapHabit 📸

A mobile-first PWA that combines Snapchat's engaging UI with AI-powered habit tracking. Every habit completion is verified through snaps using Gemini Vision AI, creating an authentic and social approach to building lasting habits.

## 🌟 Features

### Core Features
- **📱 Mobile-First PWA**: Pixel-perfect Snapchat-inspired UI optimized for mobile devices
- **🤖 AI Habit Verification**: Gemini Vision API verifies habit completion through photos
- **🔥 Smart Scoring System**: Progressive streaks with soft penalty system for missed days
- **👥 Social Features**: Friends, chat, leaderboards, and shared habit journeys
- **📊 Real-time Updates**: Live chat, streak updates, and leaderboard changes
- **🗺️ Location Integration**: OpenStreetMap integration for location-based habits
- **🔒 Privacy Controls**: Ghost mode, location settings, and data retention controls

### AI Verification System
- **Balanced Confidence Thresholds**: 
  - ≥70% = Auto-approve
  - 50-69% = Manual review queue
  - <50% = Auto-reject
- **Anti-cheat Protection**: Image hashing, EXIF validation, duplicate detection
- **Smart Categories**: Fitness, nutrition, mindfulness, productivity, learning, social, creativity, health, custom

### Scoring & Streaks
- **Progressive Penalties**: Soft decay system for missed days
  - First miss: -1 point, -1 streak
  - Second consecutive miss: -2 points, -1 streak  
  - Third+ miss: -3 points, streak stays at 0
- **Streak Bonuses**: Extra points for maintaining long streaks
- **Leaderboards**: Daily, weekly, monthly, and all-time rankings

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Vite + React + TypeScript + Tailwind CSS + PWA
- **Backend**: Node.js + Express + TypeScript
- **Database**: Supabase (PostgreSQL + Realtime + Storage + Auth)
- **AI**: Google Gemini Vision API
- **Maps**: OpenStreetMap with vector tiles
- **Deployment**: Vercel (Frontend) + Railway/Render (Backend)

### Project Structure
```
SnapHabit/
├── frontend/                 # Vite React TypeScript PWA
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── screens/         # Main app screens
│   │   ├── contexts/        # React contexts for state
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Supabase client & utilities
│   │   └── services/        # API service functions
│   ├── public/              # PWA assets & icons
│   └── package.json
├── backend/                 # Node.js Express API
│   ├── src/
│   │   ├── routes/          # API route handlers
│   │   ├── services/        # Business logic services
│   │   ├── middleware/      # Express middleware
│   │   ├── config/          # Configuration files
│   │   └── types/           # TypeScript type definitions
│   └── package.json
├── infra/                   # Infrastructure & database
│   └── supabase/
│       ├── migrations/      # Database schema migrations
│       └── seed.sql         # Sample data for development
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account
- Google Cloud account (for Gemini API)

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/snaphabit.git
cd snaphabit
npm install
```

### 2. Set Up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Run the database migration:
```sql
-- Copy and paste the contents of infra/supabase/migrations/001_initial_schema.sql
-- into your Supabase SQL editor and run it
```
3. (Optional) Add sample data:
```sql
-- Copy and paste the contents of infra/supabase/seed.sql
-- into your Supabase SQL editor and run it
```
4. Set up Storage bucket:
   - Go to Storage in Supabase dashboard
   - Create a public bucket named `snaps`
   - Set appropriate RLS policies for image uploads

### 3. Get API Keys

#### Supabase Keys
- Go to Settings > API in your Supabase dashboard
- Copy the `URL` and `anon public` key
- Copy the `service_role` key (keep this secret!)

#### Gemini API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Enable the Gemini API in Google Cloud Console

### 4. Configure Environment Variables

#### Frontend (.env)
```bash
# Frontend environment variables
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

#### Backend (.env)
```bash
# Copy from backend/env.example and fill in your values
PORT=3001
NODE_ENV=development

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Gemini AI Configuration
GEMINI_API_KEY=your-gemini-api-key

# Other configurations...
```

### 5. Install Dependencies & Run

```bash
# Install all dependencies
npm install

# Run both frontend and backend in development
npm run dev

# Or run separately:
npm run dev:frontend  # Frontend on http://localhost:5173
npm run dev:backend   # Backend on http://localhost:3001
```

### 6. Access the App
- Open http://localhost:5173 in your mobile browser or desktop
- Create an account and start tracking habits!

## 📱 PWA Installation

### Mobile (iOS/Android)
1. Open the app in your mobile browser
2. Tap the "Add to Home Screen" option
3. The app will install as a native-like PWA

### Desktop
1. Look for the install icon in your browser's address bar
2. Click to install as a desktop app

## 🔧 Development

### Frontend Development
```bash
cd frontend
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm test             # Run tests
```

### Backend Development
```bash
cd backend
npm run dev          # Start with hot reload
npm run build        # Build TypeScript
npm run start        # Start production server
npm run lint         # Run ESLint
npm test             # Run tests
```

### Database Management
```bash
# Run migrations (in Supabase SQL editor)
# Add new migrations to infra/supabase/migrations/

# Reset database (development only)
# Drop all tables and re-run migration
```

## 🧪 Testing

### Frontend Tests
```bash
cd frontend
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # With coverage report
```

### Backend Tests
```bash
cd backend
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:integration   # Integration tests only
```

### Key Test Areas
- **Scoring Logic**: Streak calculations and penalty system
- **AI Integration**: Mock Gemini responses and confidence thresholds
- **API Endpoints**: Request/response validation
- **Authentication**: JWT token handling
- **Real-time Features**: WebSocket connections

## 🚀 Deployment

### Frontend (Vercel)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

```bash
# Or deploy manually
npm run build
npx vercel --prod
```

### Backend (Railway/Render)
1. Connect repository to Railway or Render
2. Set environment variables
3. Configure auto-deployment

```bash
# Or deploy manually to Railway
railway login
railway link
railway up
```

### Environment Variables for Production
Make sure to set all required environment variables in your deployment platform:

**Frontend (Vercel)**:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

**Backend (Railway/Render)**:
- All variables from `backend/env.example`
- Set `NODE_ENV=production`
- Configure proper CORS origins

## 📊 Monitoring & Analytics

### Health Checks
- Backend: `GET /health` - API health status
- Frontend: Service worker status in DevTools

### Logging
- Backend: Morgan HTTP logging + custom error logging
- Frontend: Console logging in development, structured logging in production

### Performance
- Lighthouse PWA audits
- Core Web Vitals monitoring
- API response time tracking

## 🔒 Security & Privacy

### Data Protection
- **GDPR/CCPA Compliance**: 30-day data retention, deletion endpoints
- **Image Security**: Hash-based duplicate detection, secure storage
- **Rate Limiting**: API protection against abuse
- **Input Validation**: Zod schema validation on all endpoints

### Privacy Features
- **Ghost Mode**: Hide from leaderboards and friend discovery
- **Location Control**: Granular location sharing settings
- **Data Export**: Download personal data in JSON format
- **Account Deletion**: Complete data removal option

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Run linting and tests: `npm run lint && npm test`
5. Commit with conventional commits: `git commit -m 'feat: add amazing feature'`
6. Push and create a Pull Request

### Code Style
- **TypeScript**: Strict mode enabled
- **ESLint**: Airbnb configuration with custom rules
- **Prettier**: Automatic code formatting
- **Conventional Commits**: For clear commit history

### Pull Request Process
1. Ensure all tests pass
2. Update documentation if needed
3. Add screenshots for UI changes
4. Request review from maintainers

## 📄 API Documentation

### Authentication
All API endpoints (except `/auth/*`) require a Bearer token:
```bash
Authorization: Bearer <supabase-jwt-token>
```

### Key Endpoints

#### Authentication
- `POST /api/auth/signup` - Create account
- `POST /api/auth/signin` - Sign in
- `GET /api/auth/me` - Get current user

#### Habits
- `GET /api/habits` - Get user's habits
- `POST /api/habits` - Create new habit
- `PUT /api/habits/:id` - Update habit
- `DELETE /api/habits/:id` - Soft delete habit

#### Snaps
- `POST /api/snaps` - Upload snap with AI verification
- `GET /api/snaps` - Get user's snaps
- `PATCH /api/snaps/:id` - Update snap status (manual review)

#### Social Features
- `GET /api/friends` - Get friends list
- `POST /api/friends/add` - Send friend request
- `GET /api/leaderboard/:period` - Get leaderboard
- `POST /api/chat/rooms/:id/messages` - Send message

### Response Format
```json
{
  "data": { ... },
  "error": null,
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## 🐛 Troubleshooting

### Common Issues

#### "Camera not working"
- Ensure HTTPS (required for camera access)
- Check browser permissions
- Verify camera is not used by other apps

#### "AI verification failing"
- Check Gemini API key is valid
- Verify API quota limits
- Check image format (JPEG/PNG/WebP only)

#### "Real-time features not working"
- Verify Supabase Realtime is enabled
- Check WebSocket connection in DevTools
- Ensure proper RLS policies

#### "PWA not installing"
- Verify HTTPS connection
- Check manifest.json is accessible
- Ensure service worker is registered

### Debug Mode
Enable debug logging by setting:
```bash
# Frontend
localStorage.setItem('debug', 'snaphabit:*')

# Backend
DEBUG=snaphabit:* npm run dev
```

## 📞 Support

- **Documentation**: Check this README and inline code comments
- **Issues**: Create a GitHub issue with detailed description
- **Discussions**: Use GitHub Discussions for questions
- **Email**: support@snaphabit.com (if deployed)

## 📋 Roadmap

### Phase 1 (MVP) ✅
- [x] Core habit tracking with AI verification
- [x] User authentication and profiles
- [x] Basic social features (friends, chat)
- [x] Scoring and streak system
- [x] Mobile-first PWA

### Phase 2 (Social Enhancement)
- [ ] Group challenges and competitions
- [ ] Habit templates and recommendations
- [ ] Advanced analytics and insights
- [ ] Push notifications
- [ ] Offline support improvements

### Phase 3 (Advanced Features)
- [ ] Habit coaching with AI insights
- [ ] Integration with fitness trackers
- [ ] Gamification elements (badges, achievements)
- [ ] Community features (public habits, inspiration feed)
- [ ] Premium features and monetization

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Snapchat**: UI/UX inspiration for the mobile-first design
- **Supabase**: Amazing backend-as-a-service platform
- **Google Gemini**: Powerful AI vision capabilities
- **React Community**: Excellent ecosystem and tools
- **Open Source Contributors**: All the amazing libraries that make this possible

---

**Built with ❤️ for habit formation and social accountability**

*SnapHabit - Where habits meet community, powered by AI*
