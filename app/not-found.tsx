export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Page non trouvée
          </h2>
          <p className="text-gray-600 mb-6">
            Désolé, la page que vous recherchez n'existe pas.
          </p>
          <a
            href="/"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            Retour à l'accueil
          </a>
        </div>
      </div>
    </div>
  )
}
