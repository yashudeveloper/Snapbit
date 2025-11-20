import { useEffect } from 'react'

interface ToastProps {
  message: string
  type: 'success' | 'error' | 'info'
  onClose: () => void
  duration?: number
}

export default function Toast({ message, type, onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [onClose, duration])

  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500'
  }[type]

  const icon = {
    success: '✅',
    error: '❌',
    info: 'ℹ️'
  }[type]

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] animate-slide-down px-4">
      <div className={`${bgColor} text-white px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl shadow-2xl flex items-center gap-2 sm:gap-3 min-w-[280px] sm:min-w-[320px] max-w-[90vw] sm:max-w-[500px]`}>
        <span className="text-xl sm:text-2xl flex-shrink-0">{icon}</span>
        <p className="flex-1 font-medium text-sm sm:text-base">{message}</p>
        <button 
          onClick={onClose}
          className="text-white hover:text-gray-200 text-2xl font-bold flex-shrink-0 w-6 h-6 flex items-center justify-center"
          aria-label="Close notification"
        >
          ×
        </button>
      </div>
    </div>
  )
}
