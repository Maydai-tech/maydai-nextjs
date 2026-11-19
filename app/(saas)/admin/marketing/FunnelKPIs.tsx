const eurFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
})

function formaterEnEuros(value: number): string {
  return eurFormatter.format(value)
}

type Props = {
  newLeadsCount: number
  inProgressCount: number
  convertedCount: number
  totalLtv: number
}

export function FunnelKPIs({
  newLeadsCount,
  inProgressCount,
  convertedCount,
  totalLtv,
}: Props) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
      <article
        className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
        aria-label={`Total des nouveaux leads : ${newLeadsCount}`}
      >
        <h2 className="text-sm font-medium text-gray-500">Nouveaux Leads</h2>
        <p className="mt-2 font-mono text-3xl font-semibold text-gray-900">
          {newLeadsCount}
        </p>
      </article>

      <article
        className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
        aria-label={`Total des leads en cours de conversion : ${inProgressCount}`}
      >
        <h2 className="text-sm font-medium text-gray-500">En cours</h2>
        <p className="mt-2 font-mono text-3xl font-semibold text-gray-900">
          {inProgressCount}
        </p>
      </article>

      <article
        className="rounded-lg border border-gray-200 border-l-4 border-l-[#0080A3] bg-white p-5 shadow-sm"
        aria-label={`Total des leads convertis : ${convertedCount}, générant un revenu de ${totalLtv} euros`}
      >
        <h2 className="text-sm font-medium text-gray-500">Convertis</h2>
        <p className="mt-2 font-mono text-3xl font-semibold text-gray-900">
          {convertedCount}
        </p>
        <div className="mt-2 border-t border-gray-100 pt-2">
          <span className="text-xs font-medium text-gray-500">
            Revenu généré :{' '}
          </span>
          <span className="text-sm font-mono font-semibold text-gray-900">
            {formaterEnEuros(totalLtv)}
          </span>
        </div>
      </article>
    </div>
  )
}
