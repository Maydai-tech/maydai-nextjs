import { Lock, ShieldCheck, Flag } from 'lucide-react'

export default function TrustBadges() {
  const items = [
    {
      key: 'hosting-france',
      Icon: Lock,
      text: 'Hébergé en France (OVHcloud)',
    },
    {
      key: 'rgpd',
      Icon: Flag,
      text: 'Conforme RGPD',
    },
    {
      key: 'security',
      Icon: ShieldCheck,
      text: 'Données sécurisées (Chiffrement AES-256)',
    },
  ] as const

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-3 sm:gap-6">
        {items.map(({ key, Icon, text }) => (
          <div
            key={key}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/70 px-3 py-1.5 text-gray-700"
          >
            <Icon className="h-4 w-4 text-gray-500" aria-hidden />
            <span className="text-xs sm:text-sm font-medium">{text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

