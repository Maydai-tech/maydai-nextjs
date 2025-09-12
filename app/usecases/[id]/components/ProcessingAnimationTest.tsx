'use client'

import React, { useState } from 'react'
import { ProcessingAnimation } from './ProcessingAnimation'

export function ProcessingAnimationTest() {
  const [showAnimation, setShowAnimation] = useState(false)

  const handleStart = () => {
    setShowAnimation(true)
  }

  const handleComplete = () => {
    console.log('Animation terminée !')
    setShowAnimation(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Test de l'animation de traitement
        </h1>
        <p className="text-gray-600 mb-8">
          Cliquez sur le bouton pour tester l'animation de progression
        </p>
        
        <button
          onClick={handleStart}
          disabled={showAnimation}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            showAnimation
              ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
              : 'bg-[#0080A3] text-white hover:bg-[#006280]'
          }`}
        >
          {showAnimation ? 'Animation en cours...' : 'Démarrer l\'animation'}
        </button>

        <ProcessingAnimation 
          isVisible={showAnimation}
          onComplete={handleComplete}
        />
      </div>
    </div>
  )
}
