import { notFound } from 'next/navigation'

import { BenchSourceSlugSchema } from '@/types/bench-sources.zod'

import BenchSourceDetailClient from './BenchSourceDetailClient'

export default async function BenchSourcePage({
  params,
}: {
  params: Promise<{ source: string }>
}) {
  const { source } = await params
  const parsed = BenchSourceSlugSchema.safeParse(source)
  if (!parsed.success) notFound()
  return <BenchSourceDetailClient source={parsed.data} />
}
