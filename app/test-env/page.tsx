'use client'

export default function TestEnvPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test des Variables d'Environnement</h1>
      
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">NEXT_PUBLIC_SUPABASE_URL</h2>
          <p className="text-sm text-gray-600">
            {supabaseUrl ? `✅ ${supabaseUrl}` : '❌ Non définie'}
          </p>
        </div>
        
        <div>
          <h2 className="text-lg font-semibold">NEXT_PUBLIC_SUPABASE_ANON_KEY</h2>
          <p className="text-sm text-gray-600">
            {supabaseKey ? `✅ ${supabaseKey.substring(0, 20)}...` : '❌ Non définie'}
          </p>
        </div>
        
        <div>
          <h2 className="text-lg font-semibold">Status</h2>
          <p className="text-sm text-gray-600">
            {supabaseUrl && supabaseKey ? '✅ Variables chargées correctement' : '❌ Problème de chargement'}
          </p>
        </div>
      </div>
    </div>
  )
}



