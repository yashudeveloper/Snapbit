import React, { useState, useEffect } from 'react'
import { MapPin, Users, Target, Search } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useHabits } from '../contexts/HabitsContext'

export default function MapScreen() {
  const { profile } = useAuth()
  const { snaps } = useHabits()
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt')

  useEffect(() => {
    requestLocation()
  }, [])

  const requestLocation = async () => {
    if (!navigator.geolocation) {
      setLocationPermission('denied')
      return
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        })
      })

      setUserLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude
      })
      setLocationPermission('granted')
    } catch (error) {
      console.error('Location error:', error)
      setLocationPermission('denied')
    }
  }

  // Filter snaps with location data
  const locationSnaps = snaps.filter(snap => 
    snap.location_lat && 
    snap.location_lng && 
    snap.status === 'approved'
  )

  return (
    <div className="w-full h-full bg-black flex flex-col">
      {/* Header */}
      <div className="safe-area-top bg-snapchat-gray-900 border-b border-snapchat-gray-800">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-white">Snap Map</h1>
            <button className="p-2 rounded-full bg-snapchat-gray-800 text-white">
              <Search size={20} />
            </button>
          </div>

          {/* Location Status */}
          <div className="flex items-center space-x-2 text-sm">
            <MapPin size={16} className={
              locationPermission === 'granted' ? 'text-snapchat-green' : 'text-snapchat-gray-400'
            } />
            <span className="text-snapchat-gray-400">
              {locationPermission === 'granted' 
                ? 'Location enabled' 
                : 'Location disabled'
              }
            </span>
          </div>
        </div>
      </div>

      {/* Map Content */}
      <div className="flex-1 relative">
        {locationPermission === 'denied' ? (
          /* Location Permission Denied */
          <div className="flex flex-col items-center justify-center h-full px-8">
            <MapPin size={64} className="text-snapchat-gray-500 mb-6" />
            <h2 className="text-xl font-bold text-white mb-4">Location Access Needed</h2>
            <p className="text-snapchat-gray-400 text-center mb-6">
              Enable location access to see your snaps on the map and discover nearby friends.
            </p>
            <button
              onClick={requestLocation}
              className="px-6 py-3 bg-snapchat-yellow text-black font-semibold rounded-full"
            >
              Enable Location
            </button>
          </div>
        ) : locationPermission === 'prompt' ? (
          /* Loading Location */
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-snapchat-yellow border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-snapchat-gray-400">Getting your location...</p>
          </div>
        ) : (
          /* Map View */
          <div className="relative w-full h-full bg-snapchat-gray-900">
            {/* Placeholder Map */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <MapPin size={48} className="mx-auto text-snapchat-yellow mb-4" />
                <p className="text-white font-semibold mb-2">Interactive Map</p>
                <p className="text-snapchat-gray-400 text-sm">
                  OpenStreetMap integration would go here
                </p>
              </div>
            </div>

            {/* Map Controls */}
            <div className="absolute top-4 right-4 space-y-2">
              <button className="p-3 rounded-full bg-black/50 backdrop-blur-sm text-white">
                <Users size={20} />
              </button>
              <button className="p-3 rounded-full bg-black/50 backdrop-blur-sm text-white">
                <Target size={20} />
              </button>
            </div>

            {/* Location Stats */}
            <div className="absolute bottom-4 left-4 right-4">
              <div className="bg-black/70 backdrop-blur-sm rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-semibold">Your Activity</h3>
                  <span className="text-snapchat-yellow text-sm font-medium">
                    {locationSnaps.length} snaps
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-bold text-white">{locationSnaps.length}</div>
                    <div className="text-xs text-snapchat-gray-400">Total Snaps</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-white">
                      {new Set(locationSnaps.map(s => s.location_name)).size}
                    </div>
                    <div className="text-xs text-snapchat-gray-400">Locations</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-white">0</div>
                    <div className="text-xs text-snapchat-gray-400">Friends Nearby</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
