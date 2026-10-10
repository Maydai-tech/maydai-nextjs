import type { ReactNode } from 'react'

export const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0080A3] focus-visible:ring-offset-2'
export const INPUT_STYLE = 'w-full min-h-11 border border-gray-300 rounded-lg px-3 py-2 text-base text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0080A3] disabled:bg-gray-50'
export const PRIMARY_BUTTON = `inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#0080A3] px-5 py-2.5 font-medium text-white hover:bg-[#006280] transition-colors disabled:opacity-60 disabled:cursor-wait ${FOCUS_RING}`
export type FieldErrors = Record<string, string>
export function fieldId(path: string) { return `procurement-${path.replaceAll('.', '-')}` }
export function errorProps(path: string, errors: FieldErrors) {
  return { 'aria-invalid': Boolean(errors[path]), 'aria-describedby': errors[path] ? `${fieldId(path)}-error` : undefined }
}
export function FieldError({ path, errors }: { path: string; errors: FieldErrors }) {
  return errors[path] ? <p id={`${fieldId(path)}-error`} className="mt-2 text-sm text-red-700">{errors[path]}</p> : null
}
export function FormSection({ number, title, description, children }: { number: number; title: string; description: string; children: ReactNode }) {
  return <section aria-labelledby={`form-section-${number}`} className="rounded-xl border border-gray-200 bg-white p-5 sm:p-7 shadow-sm">
    <div className="flex items-start gap-3 mb-6"><span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0080A3]/10 text-sm font-semibold text-[#0080A3]">{number}</span><div><h2 id={`form-section-${number}`} className="text-lg font-semibold text-gray-900">{title}</h2><p className="mt-1 text-sm text-gray-600">{description}</p></div></div>{children}
  </section>
}
