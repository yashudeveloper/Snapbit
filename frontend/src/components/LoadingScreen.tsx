import React from 'react'

export default function LoadingScreen() {
  return (
    <div className="w-full h-full bg-black flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        {/* SnapHabit Logo */}
        <div className="w-20 h-20 rounded-full bg-snapchat-yellow flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border-4 border-black flex items-center justify-center">
            <div className="w-6 h-6 rounded-full bg-black"></div>
          </div>
        </div>
        
        {/* Loading Spinner */}
        <div className="w-8 h-8 border-2 border-snapchat-gray-600 border-t-snapchat-yellow rounded-full animate-spin"></div>
        
        {/* App Name */}
        <div className="text-white text-xl font-bold tracking-wide">
          SnapHabit
        </div>
        
        {/* Tagline */}
        <div className="text-snapchat-gray-400 text-sm text-center max-w-xs">
          AI-powered habit tracking through snaps
        </div>
      </div>
    </div>
  )
}
