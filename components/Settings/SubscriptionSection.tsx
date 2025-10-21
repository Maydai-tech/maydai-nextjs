'use client'

import SubscriptionPage from '@/components/Subscriptions/SubscriptionPage'

interface SubscriptionSectionProps {
  showSuccessPopup: boolean
  onCloseSuccessPopup: () => void
}

export default function SubscriptionSection({
  showSuccessPopup,
  onCloseSuccessPopup
}: SubscriptionSectionProps) {
  return (
    <SubscriptionPage
      showSuccessPopup={showSuccessPopup}
      onCloseSuccessPopup={onCloseSuccessPopup}
    />
  )
}
