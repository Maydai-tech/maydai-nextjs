import { redirect } from 'next/navigation'
import ContactForm from '@/components/contact/ContactForm'
import { createSupabaseServerClient } from '@/lib/supabase/server'

interface DashboardSupportPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function DashboardSupportPage({ params }: DashboardSupportPageProps) {
  const { id: companyId } = await params
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Support registre</h1>
          <p className="mt-2 text-sm text-gray-600 sm:text-base">
            Décrivez votre demande : notre équipe reviendra vers vous avec le contexte de votre
            registre.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
          <ContactForm
            source="dashboard_support"
            userId={user.id}
            companyId={companyId}
          />
        </div>
      </div>
    </main>
  )
}
