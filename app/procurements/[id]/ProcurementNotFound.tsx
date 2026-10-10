import Link from 'next/link'
import { PRIMARY_BUTTON } from '../components/form-ui'
export default function ProcurementNotFound() {
  return <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4"><div className="max-w-md rounded-xl bg-white p-8 shadow-sm text-center"><h1 className="text-2xl font-bold text-gray-900">Appel d’offres introuvable</h1><p className="mt-3 mb-6 text-gray-600">Cet appel d’offres n’existe pas ou vous n’y avez pas accès.</p><Link href="/dashboard/registries" className={PRIMARY_BUTTON}>Retour à mon compte</Link></div></main>
}
