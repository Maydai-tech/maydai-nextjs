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

        {/* YouTube embed */}
        <div className="mx-auto w-full" style={{ maxWidth: '900px' }}>
          <iframe
            width="100%"
            style={{
              aspectRatio: '16/9',
              borderRadius: '12px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
              display: 'block',
            }}
            src="https://www.youtube.com/embed/r5uoW_Hbwok?si=z4f54sVaUzeyNF4u&rel=0"
            title="Présentation de la plateforme Maydai - Conformité AI Act"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      </div>
    </section>
  )
}
