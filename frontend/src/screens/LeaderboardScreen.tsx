import React, { useState } from 'react'
import { Trophy, Medal, Award, Crown, Target } from 'lucide-react'

export default function LeaderboardScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'all_time'>('weekly')

  // Mock leaderboard data - in real app, this would come from context/API
  const leaderboardData = [
    { rank: 1, username: 'alex_brown', displayName: 'Alex Brown', score: 312, streak: 25, avatar: null },
    { rank: 2, username: 'mike_wilson', displayName: 'Mike Wilson', score: 234, streak: 12, avatar: null },
    { rank: 3, username: 'john_doe', displayName: 'John Doe', score: 150, streak: 7, avatar: null },
    { rank: 4, username: 'jane_smith', displayName: 'Jane Smith', score: 89, streak: 3, avatar: null },
    { rank: 5, username: 'sarah_jones', displayName: 'Sarah Jones', score: 67, streak: 1, avatar: null },
  ]

  const periods = [
    { key: 'daily', label: 'Today' },
    { key: 'weekly', label: 'This Week' },
    { key: 'monthly', label: 'This Month' },
    { key: 'all_time', label: 'All Time' },
  ]

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown size={20} className="text-snapchat-yellow" />
      case 2:
        return <Medal size={20} className="text-gray-400" />
      case 3:
        return <Award size={20} className="text-yellow-600" />
      default:
        return <span className="text-snapchat-gray-400 font-bold">#{rank}</span>
    }
  }

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'border-snapchat-yellow bg-snapchat-yellow/10'
      case 2:
        return 'border-gray-400 bg-gray-400/10'
      case 3:
        return 'border-yellow-600 bg-yellow-600/10'
      default:
        return 'border-snapchat-gray-700 bg-snapchat-gray-800'
    }
  }

  return (
    <div className="w-full h-full bg-black flex flex-col">
      {/* Header */}
      <div className="safe-area-top bg-snapchat-gray-900 border-b border-snapchat-gray-800">
        <div className="p-4">
          <h1 className="text-2xl font-bold text-white mb-4">Leaderboard</h1>
          
          {/* Period Selector */}
          <div className="flex space-x-2">
            {periods.map((period) => (
              <button
                key={period.key}
                onClick={() => setSelectedPeriod(period.key as any)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedPeriod === period.key
                    ? 'bg-snapchat-yellow text-black'
                    : 'bg-snapchat-gray-800 text-snapchat-gray-400 hover:text-white'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Leaderboard Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Top 3 Podium */}
        <div className="p-6 border-b border-snapchat-gray-800">
          <div className="flex items-end justify-center space-x-4 mb-6">
            {/* 2nd Place */}
            {leaderboardData[1] && (
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-gray-400 flex items-center justify-center mb-2">
                  <span className="text-white font-bold text-lg">
                    {leaderboardData[1].displayName.charAt(0)}
                  </span>
                </div>
                <Medal size={24} className="mx-auto text-gray-400 mb-1" />
                <p className="text-white font-semibold text-sm">{leaderboardData[1].displayName}</p>
                <p className="text-snapchat-gray-400 text-xs">{leaderboardData[1].score} pts</p>
              </div>
            )}

            {/* 1st Place */}
            {leaderboardData[0] && (
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-snapchat-yellow flex items-center justify-center mb-2">
                  <span className="text-black font-bold text-xl">
                    {leaderboardData[0].displayName.charAt(0)}
                  </span>
                </div>
                <Crown size={28} className="mx-auto text-snapchat-yellow mb-1" />
                <p className="text-white font-bold">{leaderboardData[0].displayName}</p>
                <p className="text-snapchat-yellow text-sm font-semibold">{leaderboardData[0].score} pts</p>
              </div>
            )}

            {/* 3rd Place */}
            {leaderboardData[2] && (
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-yellow-600 flex items-center justify-center mb-2">
                  <span className="text-white font-bold text-lg">
                    {leaderboardData[2].displayName.charAt(0)}
                  </span>
                </div>
                <Award size={24} className="mx-auto text-yellow-600 mb-1" />
                <p className="text-white font-semibold text-sm">{leaderboardData[2].displayName}</p>
                <p className="text-snapchat-gray-400 text-xs">{leaderboardData[2].score} pts</p>
              </div>
            )}
          </div>
        </div>

        {/* Full Rankings */}
        <div className="p-4 space-y-3">
          {leaderboardData.map((user) => (
            <div
              key={user.username}
              className={`flex items-center space-x-4 p-4 rounded-2xl border transition-colors ${getRankColor(user.rank)}`}
            >
              {/* Rank */}
              <div className="w-8 flex justify-center">
                {getRankIcon(user.rank)}
              </div>

              {/* Avatar */}
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                user.rank <= 3 ? 'bg-white/20' : 'bg-snapchat-gray-700'
              }`}>
                <span className="text-white font-bold">
                  {user.displayName.charAt(0)}
                </span>
              </div>

              {/* User Info */}
              <div className="flex-1">
                <h3 className="text-white font-semibold">{user.displayName}</h3>
                <p className="text-snapchat-gray-400 text-sm">@{user.username}</p>
              </div>

              {/* Stats */}
              <div className="text-right">
                <div className="text-white font-bold text-lg">{user.score}</div>
                <div className="text-snapchat-gray-400 text-xs">
                  {user.streak} day streak
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Your Rank (if not in top 5) */}
        <div className="p-4 border-t border-snapchat-gray-800">
          <div className="bg-snapchat-blue/20 border border-snapchat-blue/30 rounded-2xl p-4">
            <div className="flex items-center space-x-4">
              <div className="w-8 flex justify-center">
                <span className="text-snapchat-blue font-bold">#12</span>
              </div>
              
              <div className="w-12 h-12 rounded-full bg-snapchat-blue flex items-center justify-center">
                <span className="text-white font-bold">Y</span>
              </div>
              
              <div className="flex-1">
                <h3 className="text-white font-semibold">You</h3>
                <p className="text-snapchat-gray-400 text-sm">Keep going!</p>
              </div>
              
              <div className="text-right">
                <div className="text-white font-bold text-lg">45</div>
                <div className="text-snapchat-gray-400 text-xs">2 day streak</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
