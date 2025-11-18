import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { Eye, EyeOff } from 'lucide-react'

interface AuthFormData {
  email: string
  password: string
  username?: string
  displayName?: string
}

const AuthScreen = () => {
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm<AuthFormData>()
  
  const onSubmit = async (data: AuthFormData) => {
    setLoading(true)
    setError(null)
    
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: {
              username: data.username,
              display_name: data.displayName,
            }
          }
        })
        if (error) throw error
      }
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }
  
  const toggleMode = () => {
    setIsLogin(!isLogin)
    setError(null)
    reset()
  }
  
  return (
    <div className="h-full bg-gradient-to-br from-snap-black via-snap-gray-900 to-snap-black flex flex-col">
      {/* Header */}
      <div className="safe-top flex-1 flex flex-col justify-center px-6">
        {/* Logo Area */}
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="w-24 h-24 bg-snap-yellow rounded-full mx-auto mb-4 flex items-center justify-center">
            <span className="text-3xl font-bold text-snap-black">SH</span>
          </div>
          <h1 className="text-3xl font-bold text-snap-white mb-2">SnapHabit</h1>
          <p className="text-snap-gray-400 text-sm">
            Build habits, one snap at a time
          </p>
        </motion.div>
        
        {/* Auth Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <div>
                    <input
                      {...register('username', { 
                        required: !isLogin ? 'Username is required' : false,
                        minLength: { value: 3, message: 'Username must be at least 3 characters' }
                      })}
                      type="text"
                      placeholder="Username"
                      className="input-snap"
                    />
                    {errors.username && (
                      <p className="text-snap-red text-sm mt-1">{errors.username.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <input
                      {...register('displayName', { 
                        required: !isLogin ? 'Display name is required' : false 
                      })}
                      type="text"
                      placeholder="Display Name"
                      className="input-snap"
                    />
                    {errors.displayName && (
                      <p className="text-snap-red text-sm mt-1">{errors.displayName.message}</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            <div>
              <input
                {...register('email', { 
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address'
                  }
                })}
                type="email"
                placeholder="Email"
                className="input-snap"
              />
              {errors.email && (
                <p className="text-snap-red text-sm mt-1">{errors.email.message}</p>
              )}
            </div>
            
            <div className="relative">
              <input
                {...register('password', { 
                  required: 'Password is required',
                  minLength: { value: 6, message: 'Password must be at least 6 characters' }
                })}
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                className="input-snap pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-snap-gray-400 hover:text-snap-white"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
              {errors.password && (
                <p className="text-snap-red text-sm mt-1">{errors.password.message}</p>
              )}
            </div>
            
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-snap-red/10 border border-snap-red/20 rounded-snap p-3"
              >
                <p className="text-snap-red text-sm">{error}</p>
              </motion.div>
            )}
            
            <motion.button
              type="submit"
              disabled={loading}
              className="btn-snap w-full disabled:opacity-50 disabled:cursor-not-allowed"
              whileTap={{ scale: 0.98 }}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-snap-black mr-2"></div>
                  {isLogin ? 'Signing In...' : 'Creating Account...'}
                </div>
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </motion.button>
          </form>
          
          {/* Toggle Mode */}
          <div className="text-center mt-6">
            <button
              onClick={toggleMode}
              className="text-snap-gray-400 hover:text-snap-white transition-colors"
            >
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <span className="text-snap-yellow font-semibold">
                {isLogin ? 'Sign Up' : 'Sign In'}
              </span>
            </button>
          </div>
        </motion.div>
      </div>
      
      {/* Footer */}
      <div className="safe-bottom p-6 text-center">
        <p className="text-snap-gray-500 text-xs">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  )
}

export default AuthScreen
