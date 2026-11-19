'use client'

import LiteYouTubeEmbed from 'react-lite-youtube-embed'
import 'react-lite-youtube-embed/dist/LiteYouTubeEmbed.css'

export default function VideoSection() {
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

        <div
          className="mx-auto w-full overflow-hidden"
          style={{
            maxWidth: '900px',
            borderRadius: '12px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
          }}
        >
          <LiteYouTubeEmbed
            id="I8xNeoariwg"
            title="Présentation de la plateforme Maydai - Conformité AI Act"
            poster="maxresdefault"
            params="rel=0"
            webp
          />
        </div>
      </div>
    </section>
  )
}
