import RegistrySettingsPage from './RegistrySettingsPage'

interface SettingsProps {
  params: Promise<{ id: string }>
}

export default function RegistrySettings({ params }: SettingsProps) {
  return <RegistrySettingsPage params={params} />
}
