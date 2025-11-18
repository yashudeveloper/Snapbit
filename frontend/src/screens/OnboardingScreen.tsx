import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, ChevronRight, Calendar, MapPin, ArrowLeft } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

interface OnboardingData {
  // Step 1: Account Setup
  name: string
  email: string
  password: string
  
  // Step 2: Personal Details
  dateOfBirth: string
  gender: 'male' | 'female' | 'other' | ''
  
  // Step 3: Habit Selection
  selectedHabit: string
  
  // Step 4: Profile Completion
  occupation: string
  location: string
}

const HABIT_OPTIONS = [
  'Coding',
  'Fitness', 
  'Reading',
  'Meditation',
  'Content Creation',
  'Language Learning'
]

const OCCUPATION_OPTIONS = [
  'Student',
  'Software Engineer',
  'Designer',
  'Teacher',
  'Entrepreneur',
  'Healthcare Worker',
  'Other'
]

interface OnboardingScreenProps {
  onBack?: () => void
}

export default function OnboardingScreen({ onBack }: OnboardingScreenProps) {
  const { signUp, loading } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<OnboardingData>({
    name: '',
    email: '',
    password: '',
    dateOfBirth: '',
    gender: '',
    selectedHabit: '',
    occupation: 'Student',
    location: ''
  })

  const updateData = (field: keyof OnboardingData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }))
    if (error) setError('')
  }

  const nextStep = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => Math.min(prev + 1, 4))
    }
  }

  const validateCurrentStep = (): boolean => {
    setError('')
    
    switch (currentStep) {
      case 1:
        if (!data.name.trim()) {
          setError('Name is required')
          return false
        }
        if (!data.email.trim()) {
          setError('Email is required')
          return false
        }
        if (!data.password || data.password.length < 6) {
          setError('Password must be at least 6 characters')
          return false
        }
        return true
        
      case 2:
        if (!data.dateOfBirth) {
          setError('Date of birth is required')
          return false
        }
        if (!data.gender) {
          setError('Please select your gender')
          return false
        }
        return true
        
      case 3:
        if (!data.selectedHabit) {
          setError('Please select a habit to track')
          return false
        }
        return true
        
      case 4:
        if (!data.location.trim()) {
          setError('Location is required')
          return false
        }
        return true
        
      default:
        return true
    }
  }

  const handleFinish = async () => {
    if (!validateCurrentStep()) return
    
    try {
      // Create username from name (lowercase, no spaces)
      const username = data.name.toLowerCase().replace(/[^a-z0-9]/g, '')
      
      const { error } = await signUp(
        data.email,
        data.password,
        username,
        data.name,
        {
          dateOfBirth: data.dateOfBirth,
          gender: data.gender,
          occupation: data.occupation,
          location: data.location,
          selectedHabit: data.selectedHabit
        }
      )
      
      if (error) {
        setError(error.message || 'Failed to create account')
      } else {
        // Success! Add vibration feedback and excitement
        if ('vibrate' in navigator) {
          navigator.vibrate([100, 50, 100])
        }
        // AuthContext will handle the redirect to camera screen
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    }
  }

  const ProgressDots = () => (
    <div className="flex justify-center space-x-3 mb-12">
      {[1, 2, 3, 4].map((step) => (
        <div
          key={step}
          className={`w-3 h-3 rounded-full transition-colors duration-300 ${
            step === currentStep 
              ? 'bg-snapchat-yellow' 
              : step < currentStep 
                ? 'bg-snapchat-yellow/60' 
                : 'bg-gray-600'
          }`}
        />
      ))}
    </div>
  )

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="w-full max-w-sm space-y-6"
          >
            <h2 className="text-3xl font-bold text-white text-center mb-8">CREATE ACCOUNT</h2>
            
            <div>
              <input
                type="text"
                placeholder="Name"
                value={data.name}
                onChange={(e) => updateData('name', e.target.value)}
                className="w-full px-6 py-4 bg-white/10 text-white rounded-2xl border border-gray-600 focus:border-snapchat-yellow focus:outline-none transition-colors placeholder-gray-400"
                maxLength={50}
              />
            </div>
            
            <div>
              <input
                type="email"
                placeholder="Email"
                value={data.email}
                onChange={(e) => updateData('email', e.target.value)}
                className="w-full px-6 py-4 bg-white/10 text-white rounded-2xl border border-gray-600 focus:border-snapchat-yellow focus:outline-none transition-colors placeholder-gray-400"
              />
            </div>
            
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={data.password}
                onChange={(e) => updateData('password', e.target.value)}
                className="w-full px-6 py-4 pr-12 bg-white/10 text-white rounded-2xl border border-gray-600 focus:border-snapchat-yellow focus:outline-none transition-colors placeholder-gray-400"
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </motion.div>
        )
        
      case 2:
        return (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="w-full max-w-sm space-y-6"
          >
            <h2 className="text-3xl font-bold text-white text-center mb-8">ABOUT YOU</h2>
            
            <div className="relative">
              <Calendar size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                value={data.dateOfBirth}
                onChange={(e) => updateData('dateOfBirth', e.target.value)}
                className="w-full pl-12 pr-6 py-4 bg-white/10 text-white rounded-2xl border border-gray-600 focus:border-snapchat-yellow focus:outline-none transition-colors"
              />
            </div>
            
            <div className="space-y-4">
              <p className="text-white text-lg font-medium">Gender:</p>
              <div className="flex flex-col space-y-3">
                {[
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' },
                  { value: 'other', label: 'Other' }
                ].map((option) => (
                  <label key={option.value} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      value={option.value}
                      checked={data.gender === option.value}
                      onChange={(e) => updateData('gender', e.target.value)}
                      className="w-5 h-5 text-snapchat-yellow bg-transparent border-2 border-gray-600 focus:ring-snapchat-yellow focus:ring-2"
                    />
                    <span className="text-white text-lg">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </motion.div>
        )
        
      case 3:
        return (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="w-full max-w-sm space-y-6"
          >
            <h2 className="text-3xl font-bold text-white text-center mb-8">SELECT YOUR HABIT</h2>
            
            <div className="space-y-4">
              {HABIT_OPTIONS.map((habit) => (
                <label key={habit} className="flex items-center space-x-3 cursor-pointer p-4 rounded-2xl border border-gray-600 hover:border-snapchat-yellow/50 transition-colors">
                  <input
                    type="radio"
                    name="habit"
                    value={habit}
                    checked={data.selectedHabit === habit}
                    onChange={(e) => updateData('selectedHabit', e.target.value)}
                    className="w-5 h-5 text-snapchat-yellow bg-transparent border-2 border-gray-600 focus:ring-snapchat-yellow focus:ring-2"
                  />
                  <span className="text-white text-lg">{habit}</span>
                </label>
              ))}
            </div>
            
            <p className="text-gray-400 text-sm text-center mt-6">
              * Only ONE habit can be selected at signup.
            </p>
          </motion.div>
        )
        
      case 4:
        return (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="w-full max-w-sm space-y-6"
          >
            <h2 className="text-3xl font-bold text-white text-center mb-8">FINAL STEP: YOUR PROFILE</h2>
            
            <div>
              <select
                value={data.occupation}
                onChange={(e) => updateData('occupation', e.target.value)}
                className="w-full px-6 py-4 bg-white/10 text-white rounded-2xl border border-gray-600 focus:border-snapchat-yellow focus:outline-none transition-colors"
              >
                {OCCUPATION_OPTIONS.map((occupation) => (
                  <option key={occupation} value={occupation} className="bg-gray-800">
                    {occupation}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="relative">
              <MapPin size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="City, Country"
                value={data.location}
                onChange={(e) => updateData('location', e.target.value)}
                className="w-full pl-12 pr-6 py-4 bg-white/10 text-white rounded-2xl border border-gray-600 focus:border-snapchat-yellow focus:outline-none transition-colors placeholder-gray-400"
                maxLength={100}
              />
            </div>
          </motion.div>
        )
        
      default:
        return null
    }
  }

  return (
    <div className="w-full h-full bg-black flex flex-col">
      {/* Back Button */}
      {onBack && currentStep === 1 && (
        <div className="absolute top-8 left-8 z-10">
          <button
            onClick={onBack}
            className="p-2 text-white hover:text-snapchat-yellow transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
        </div>
      )}
      
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        {/* Logo */}
        <div className="mb-8">
          <div className="w-20 h-20 rounded-full bg-snapchat-yellow flex items-center justify-center mb-4">
            <div className="w-12 h-12 rounded-full border-4 border-black flex items-center justify-center">
              <div className="w-6 h-6 rounded-full bg-black"></div>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white text-center">SnapHabit</h1>
        </div>

        {/* Progress Dots */}
        <ProgressDots />

        {/* Step Content */}
        <AnimatePresence mode="wait">
          {renderStep()}
        </AnimatePresence>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-2xl max-w-sm w-full"
          >
            <p className="text-red-400 text-sm text-center">{error}</p>
          </motion.div>
        )}

        {/* Next/Finish Button */}
        <motion.button
          onClick={currentStep === 4 ? handleFinish : nextStep}
          disabled={loading}
          className="mt-8 px-8 py-4 bg-snapchat-yellow text-black font-bold rounded-2xl flex items-center space-x-2 active:scale-95 transition-transform duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          whileTap={{ scale: 0.95 }}
        >
          {loading ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
              <span>Creating Account...</span>
            </div>
          ) : (
            <>
              <span>{currentStep === 4 ? 'Finish & Start' : 'Next'}</span>
              {currentStep < 4 && <ChevronRight size={20} />}
            </>
          )}
        </motion.button>
      </div>

      {/* Footer */}
      <div className="p-6 text-center">
        <p className="text-gray-500 text-xs">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  )
}
