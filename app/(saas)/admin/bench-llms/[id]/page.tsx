import BenchLlmDetailPage from './BenchLlmDetailPage'

export default function AdminBenchLlmDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return <BenchLlmDetailPage params={params} />
}
