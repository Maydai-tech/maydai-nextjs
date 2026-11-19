import SetupChatPage from './SetupChatPage'

export const dynamic = 'force-dynamic'

type SetupChatSearchParams = {
  company?: string | string[]
  company_id?: string | string[]
}

function firstParam(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  return trimmed || null
}

export default async function SetupChatRoute({
  searchParams,
}: {
  searchParams: Promise<SetupChatSearchParams>
}) {
  const params = await searchParams
  const companyIdFromUrl = firstParam(params.company) ?? firstParam(params.company_id)

  return <SetupChatPage companyIdFromUrl={companyIdFromUrl} />
}
