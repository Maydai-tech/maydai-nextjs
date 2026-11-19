'use client'

import ContactForm from '@/components/contact/ContactForm'
import SupportFAQ from '@/components/support/SupportFAQ'

interface DashboardSupportPageProps {
  companyId: string
  userId: string
  userRole: 'owner' | 'collaborator'
  defaultEmail: string
  defaultFirstName: string
  defaultLastName: string
}

export default function DashboardSupportPage({
  companyId,
  userId,
  userRole,
  defaultEmail,
  defaultFirstName,
  defaultLastName,
}: DashboardSupportPageProps) {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-8">
          <h1 className="mb-2 font-sans text-2xl font-bold text-slate-900">
            Support &amp; Centre d&apos;aide
          </h1>
          <p className="max-w-2xl text-base text-slate-600">
            Notre équipe est à votre disposition pour vous accompagner dans votre mise en
            conformité et l&apos;utilisation de la plateforme MaydAI. Décrivez votre besoin, nous
            vous répondrons dans les plus brefs délais.
          </p>
        </header>

        <div className="space-y-12">
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <ContactForm
              source="dashboard_support"
              userId={userId}
              companyId={companyId}
              defaultEmail={defaultEmail}
              defaultFirstName={defaultFirstName}
              defaultLastName={defaultLastName}
            />
          </section>

          <section aria-labelledby="support-faq-heading">
            <SupportFAQ role={userRole} />
          </section>
        </div>
      </div>
    </main>
  )
}
