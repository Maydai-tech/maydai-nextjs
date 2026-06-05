export default function EmailChangeNotice() {
  return (
    <div
      role="note"
      aria-live="polite"
      className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-relaxed text-amber-900"
    >
      <p>
        Pour des raisons de sécurité, le changement d&apos;adresse e-mail n&apos;est pas modifiable
        directement. Veuillez soumettre une demande via le formulaire ci-dessus en sélectionnant le
        motif « Compte — changement d&apos;email ».
      </p>
    </div>
  )
}
