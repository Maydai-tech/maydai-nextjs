export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 relative z-0">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 relative z-10">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Page non trouvée
          </h2>
          <p className="text-gray-600 mb-6">
            Désolé, la page que vous recherchez n&apos;existe pas.
          </p>
          {/* Lien natif + Link : navigation garantie même sans hydratation React */}
          <a
            href="/"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors pointer-events-auto"
          >
            Retour à l&apos;accueil
          </a>
          <noscript>
            <p className="mt-4 text-sm text-gray-500">
              JavaScript est désactivé — utilisez le lien ci-dessus.
            </p>
          </noscript>
        </div>
      </div>
    </div>
  )
}
