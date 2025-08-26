export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#0080A3]"></div>
        <p className="mt-6 text-gray-600 text-lg">Chargement...</p>
      </div>
    </div>
  )
}
