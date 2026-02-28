'use client'

import { useState, useRef } from 'react'
import { Play, Pause } from 'lucide-react'

export default function VideoSection() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const togglePlay = () => {
    if (!videoRef.current) return

    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play()
      setHasStarted(true)
    }
    setIsPlaying(!isPlaying)
  }

  return (
    <section className="py-16 md:py-24 px-5 sm:px-6 bg-white">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">
            Découvrez MaydAI <span className="text-[#0080a3]">en action</span>
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            De la création du cas d&apos;usage au rapport de conformité, voyez
            comment notre plateforme simplifie chaque étape.
          </p>
        </div>

        {/* Video player */}
        <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-200/60 bg-gray-900 aspect-video group">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            poster="/logos/logo-maydai/image_poster_maydai.png"
            preload="none"
            playsInline
            onEnded={() => setIsPlaying(false)}
          >
            {/*
              Remplacer par la vraie source vidéo :
              <source src="/videos/demo-maydai.mp4" type="video/mp4" />
            */}
            Votre navigateur ne supporte pas la lecture vidéo.
          </video>

          {/* Play/Pause overlay */}
          <button
            onClick={togglePlay}
            aria-label={isPlaying ? 'Mettre en pause' : 'Lancer la vidéo'}
            className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
              isPlaying && hasStarted
                ? 'opacity-0 group-hover:opacity-100'
                : 'opacity-100'
            }`}
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#0080a3]/90 backdrop-blur-sm flex items-center justify-center shadow-lg hover:bg-[#006280] transition-colors">
              {isPlaying ? (
                <Pause className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              ) : (
                <Play className="w-7 h-7 sm:w-8 sm:h-8 text-white ml-1" />
              )}
            </div>
          </button>
        </div>

        <p className="text-center text-sm text-gray-400 mt-4">
          Durée : 2 min &middot; Démo de la plateforme MaydAI
        </p>
      </div>
    </section>
  )
}
