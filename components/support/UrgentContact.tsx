import { Mail } from 'lucide-react'

export default function UrgentContact() {
  return (
    <section className="mt-6 rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 sm:px-6">
      <div className="flex items-start gap-3">
        <Mail className="mt-0.5 h-5 w-5 shrink-0 text-[#0080A3]" aria-hidden="true" />
        <p className="text-sm text-gray-700 sm:text-base">
          <span className="font-semibold text-gray-900">Contact urgent :</span>{' '}
          Vous pouvez nous joindre directement à{' '}
          <a
            href="mailto:contact@maydai.io"
            className="font-medium text-[#0080A3] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0080A3] focus-visible:ring-offset-2 rounded"
          >
            contact@maydai.io
          </a>
          .
        </p>
      </div>
    </section>
  )
}
