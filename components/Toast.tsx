'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { CheckCircle, X, AlertTriangle, Info } from 'lucide-react'

interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  isVisible: boolean
  onClose: () => void
  duration?: number
}

export default function Toast({
  message,
  type = 'success',
  isVisible,
  onClose,
  duration = 5000
}: ToastProps) {
  const [isAnimating, setIsAnimating] = useState(false)
  const onCloseRef = useRef(onClose)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  const handleClose = useCallback(() => {
    if (closeTimer.current !== null) return
    setIsAnimating(false)
    closeTimer.current = setTimeout(() => {
      closeTimer.current = null
      onCloseRef.current()
    }, 300)
  }, [])

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(false)
      const frame = requestAnimationFrame(() => {
        setIsAnimating(true)
      })

      const timer = setTimeout(handleClose, duration)
      return () => {
        cancelAnimationFrame(frame)
        clearTimeout(timer)
        if (closeTimer.current !== null) {
          clearTimeout(closeTimer.current)
          closeTimer.current = null
        }
      }
    }
  }, [isVisible, message, duration, handleClose])

  if (!isVisible) return null

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 shrink-0 text-green-500" aria-hidden="true" />
      case 'error':
        return <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" aria-hidden="true" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 shrink-0 text-yellow-500" aria-hidden="true" />
      case 'info':
        return <Info className="h-5 w-5 shrink-0 text-blue-500" aria-hidden="true" />
    }
  }

  const getBorderColor = () => {
    switch (type) {
      case 'success':
        return 'border-l-green-500'
      case 'error':
        return 'border-l-red-500'
      case 'warning':
        return 'border-l-yellow-500'
      case 'info':
        return 'border-l-blue-500'
    }
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:bottom-6 sm:left-auto sm:right-6 sm:max-w-md z-50">
      <div
        role="status"
        aria-atomic="true"
        className={`
          flex items-center gap-3 px-4 py-3 bg-white rounded-lg shadow-lg border border-gray-200 border-l-4 ${getBorderColor()}
          transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none motion-reduce:transform-none
          ${isAnimating ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}
        `}
      >
        {getIcon()}
        <p className="min-w-0 text-sm font-medium text-gray-800 break-words">{message}</p>
        <button
          type="button"
          aria-label="Fermer la notification"
          onClick={handleClose}
          className="ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0080A3]"
        >
          <X className="h-4 w-4 text-gray-400" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
