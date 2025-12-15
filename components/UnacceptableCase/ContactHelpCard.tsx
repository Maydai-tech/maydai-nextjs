'use client'

import { useState } from 'react'
import { MessageCircle, Scale, X, Loader2, CheckCircle, Lightbulb } from 'lucide-react'
import { useAuth } from '@/lib/auth'

interface UserProfile {
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
}

interface ContactHelpCardProps {
  usecaseId: string
  companyId: string
  userProfile?: UserProfile
}

type RequestType = 'maydai_support' | 'lawyer_referral'

export default function ContactHelpCard({ usecaseId, companyId, userProfile }: ContactHelpCardProps) {
  const { getAccessToken } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [requestType, setRequestType] = useState<RequestType | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    fullName: userProfile?.first_name && userProfile?.last_name
      ? `${userProfile.first_name} ${userProfile.last_name}`
      : '',
    email: userProfile?.email || '',
    phone: userProfile?.phone || '',
    message: ''
  })

  const openModal = (type: RequestType) => {
    setRequestType(type)
    setShowModal(true)
    setSubmitted(false)
    setError(null)
    // Reset form with user profile data
    setFormData({
      fullName: userProfile?.first_name && userProfile?.last_name
        ? `${userProfile.first_name} ${userProfile.last_name}`
        : '',
      email: userProfile?.email || '',
      phone: userProfile?.phone || '',
      message: ''
    })
  }

  const closeModal = () => {
    setShowModal(false)
    setRequestType(null)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!requestType) return

    setSubmitting(true)
    setError(null)

    try {
      const token = getAccessToken()
      if (!token) {
        setError('Session expirée. Veuillez vous reconnecter.')
        return
      }

      const response = await fetch('/api/contact-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          usecase_id: usecaseId,
          company_id: companyId,
          request_type: requestType,
          full_name: formData.fullName,
          email: formData.email,
          phone: formData.phone || null,
          message: formData.message || null
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de l\'envoi')
      }

      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setSubmitting(false)
    }
  }

  const getModalTitle = () => {
    if (requestType === 'maydai_support') {
      return 'Contacter les équipes MaydAI'
    }
    return 'Être mis en relation avec un avocat'
  }

  const getModalDescription = () => {
    if (requestType === 'maydai_support') {
      return 'Notre équipe vous contactera dans les plus brefs délais pour vous accompagner dans votre démarche de conformité.'
    }
    return 'Nous vous mettrons en relation avec un avocat spécialisé en droit du numérique et en réglementation IA.'
  }

  return (
    <>
      {/* Help Card */}
      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Lightbulb className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">Besoin d'accompagnement ?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Notre équipe peut vous aider à naviguer les exigences réglementaires pour ce cas d'usage à risque inacceptable.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => openModal('maydai_support')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#0080A3] text-white text-sm font-medium rounded-lg hover:bg-[#006280] transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                Contacter MaydAI
              </button>
              <button
                onClick={() => openModal('lawyer_referral')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                <Scale className="w-4 h-4" />
                Parler avec un avocat
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeModal}
          />

          {/* Modal Content */}
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">{getModalTitle()}</h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6">
              {submitted ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Demande envoyée</h3>
                  <p className="text-gray-600 mb-6">
                    {requestType === 'maydai_support'
                      ? 'Notre équipe vous contactera dans les plus brefs délais.'
                      : 'Nous vous mettrons en relation avec un avocat spécialisé très prochainement.'}
                  </p>
                  <button
                    onClick={closeModal}
                    className="px-6 py-2 bg-[#0080A3] text-white font-medium rounded-lg hover:bg-[#006280] transition-colors"
                  >
                    Fermer
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-6">{getModalDescription()}</p>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nom complet <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0080A3] focus:border-transparent"
                        placeholder="Votre nom"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0080A3] focus:border-transparent"
                        placeholder="votre@email.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Téléphone
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0080A3] focus:border-transparent"
                        placeholder="+33 6 12 34 56 78"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Message
                      </label>
                      <textarea
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0080A3] focus:border-transparent resize-none"
                        placeholder="Décrivez brièvement votre besoin..."
                      />
                    </div>

                    {error && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-3 bg-[#0080A3] text-white font-medium rounded-lg hover:bg-[#006280] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Envoi en cours...
                        </>
                      ) : (
                        'Envoyer ma demande'
                      )}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
