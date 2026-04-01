import { Lock, ShieldCheck, Database } from 'lucide-react'

export default function TrustBadges() {
  const items = [
    {
      key: 'hosting-france',
      Icon: Lock,
      text: 'Hébergé en France (OVHcloud)',
    },
    {
      key: 'rgpd',
      Icon: ShieldCheck,
      text: 'Conforme RGPD',
    },
    {
      key: 'encryption',
      Icon: Database,
      text: 'Données chiffrées (AES-256)',
    },
  ] as const

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-row sm:items-center sm:justify-center sm:gap-6">
        {items.map(({ key, Icon, text }) => (
          <div key={key} className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-[#0080a3]" aria-hidden />
            <span className="text-sm font-medium text-gray-600">{text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

