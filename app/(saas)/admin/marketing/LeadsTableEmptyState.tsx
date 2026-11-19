import { FolderOpen } from 'lucide-react'

type Props = {
  hasActiveFilters: boolean
  onReset: () => void
}

export function LeadsTableEmptyState({ hasActiveFilters, onReset }: Props) {
  return (
    <div
      className="flex flex-col items-center justify-center p-12 text-center"
      role="status"
      aria-live="polite"
    >
      <FolderOpen className="mb-4 h-12 w-12 text-gray-300" aria-hidden="true" />
      <h3 className="font-sans text-sm font-medium text-gray-900">
        Aucun lead à cette étape
      </h3>
      <p className="mt-1 text-sm text-gray-500">
        Tous vos prospects ont dépassé ce stade ou n&apos;y sont pas encore arrivés.
      </p>
      {hasActiveFilters ? (
        <button
          type="button"
          onClick={onReset}
          className="mt-4 rounded-md px-2 py-1 text-sm font-medium text-[#0080A3] transition-colors hover:text-[#00607a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0080A3]"
          aria-label="Effacer les filtres et afficher tous les leads"
        >
          Réinitialiser les filtres
        </button>
      ) : null}
    </div>
  )
}
