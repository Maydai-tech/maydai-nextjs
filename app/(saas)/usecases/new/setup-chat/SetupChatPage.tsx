'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react'
import ProtectedRoute from '@/components/ProtectedRoute'
import WelcomeChatInterviewer from '@/components/chat/WelcomeChatInterviewer'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { useCaseRoutes } from '@/app/(saas)/usecases/[id]/utils/routes'
import {
  displayCompanyProfileValue,
  formatAddressForContext,
  formatIndustryForContext,
  formatSubCategoryForContext,
  mergeRegisterWithAccountFallback,
  type CompanyProfileFields,
  type CompanyProfileSources,
} from '@/lib/mistral/company-profile-tool'
import ChatFlowStepper from '../components/ChatFlowStepper'
import GuidedChat from '../components/GuidedChat/GuidedChat'

type OnboardingStep = 'welcome' | 'welcome_done' | 'guided_draft'

interface SetupChatPageProps {
  companyIdFromUrl: string | null
}

function asNullableString(raw: unknown): string | null {
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null
}

export default function SetupChatPage({ companyIdFromUrl }: SetupChatPageProps) {
  return (
    <ProtectedRoute>
      <SetupChatPageContent companyIdFromUrl={companyIdFromUrl} />
    </ProtectedRoute>
  )
}

function SetupChatPageContent({ companyIdFromUrl }: SetupChatPageProps) {
  const { user } = useAuth()
  const [companyId, setCompanyId] = useState<string | null>(companyIdFromUrl)
  const [resolvingCompany, setResolvingCompany] = useState(!companyIdFromUrl)
  const [step, setStep] = useState<OnboardingStep>('welcome')
  const [profile, setProfile] = useState<CompanyProfileFields | null>(null)
  const [profileSources, setProfileSources] = useState<CompanyProfileSources | undefined>(undefined)
  const [profileError, setProfileError] = useState('')

  const loadCompanyProfile = useCallback(async (id: string) => {
    setProfileError('')
    const companyQuery = supabase
      .from('companies')
      .select('name, industry, sub_category_id, country, street_address, postal_code, city')
      .eq('id', id)
      .maybeSingle()

    const accountQuery = user?.id
      ? supabase
          .from('profiles')
          .select('company_name, industry, sub_category_id')
          .eq('id', user.id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null })

    const [{ data, error }, { data: account }] = await Promise.all([companyQuery, accountQuery])

    if (error) {
      setProfileError('Impossible de charger le profil du registre.')
      setProfile(null)
      setProfileSources(undefined)
      return
    }

    const merged = mergeRegisterWithAccountFallback(
      {
        name: asNullableString(data?.name),
        industry: asNullableString(data?.industry),
        sub_category_id: asNullableString(data?.sub_category_id),
        country: asNullableString(data?.country),
        street_address: asNullableString(data?.street_address),
        postal_code: asNullableString(data?.postal_code),
        city: asNullableString(data?.city),
      },
      {
        company_name: asNullableString(account?.company_name),
        industry: asNullableString(account?.industry),
        sub_category_id: asNullableString(account?.sub_category_id),
      }
    )

    setProfile(merged.profile)
    setProfileSources(merged.sources)
  }, [user?.id])

  useEffect(() => {
    if (companyIdFromUrl) {
      setCompanyId(companyIdFromUrl)
      setResolvingCompany(false)
      return
    }

    if (!user?.id) return

    let cancelled = false

    const resolveFromUserContext = async () => {
      setResolvingCompany(true)
      try {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user.id)
          .maybeSingle()

        if (cancelled) return

        if (typeof userProfile?.company_id === 'string' && userProfile.company_id) {
          setCompanyId(userProfile.company_id)
          return
        }

        const { data: links } = await supabase
          .from('user_companies')
          .select('company_id')
          .eq('user_id', user.id)
          .limit(1)

        if (cancelled) return

        const fallbackId = links?.[0]?.company_id
        setCompanyId(typeof fallbackId === 'string' && fallbackId ? fallbackId : null)
      } catch {
        if (!cancelled) setCompanyId(null)
      } finally {
        if (!cancelled) setResolvingCompany(false)
      }
    }

    void resolveFromUserContext()

    return () => {
      cancelled = true
    }
  }, [companyIdFromUrl, user?.id])

  useEffect(() => {
    if (!companyId) {
      setProfile(null)
      return
    }
    void loadCompanyProfile(companyId)
  }, [companyId, loadCompanyProfile])

  const showDraftWorkspace = Boolean(companyId && profile && step === 'guided_draft')

  const hubHref = companyId ? useCaseRoutes.create(companyId) : useCaseRoutes.companies()
  const hubLinkLabel = companyId
    ? 'Choisir un autre type d’interaction'
    : 'Retour aux registres'

  if (showDraftWorkspace && companyId && profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-2xl px-4 pt-6 sm:px-6 lg:px-8">
          <Link
            href={hubHref}
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-[#0080A3]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {hubLinkLabel}
          </Link>
          <ChatFlowStepper current={2} />
        </div>
        <div className="pt-2">
          <GuidedChat
            companyId={companyId}
            company={{
              id: companyId,
              name: profile.name || 'Registre',
              industry: profile.industry || '',
              city: profile.city || '',
              country: profile.country || '',
            }}
          />
        </div>
      </div>
    )
  }

  const title = step === 'welcome_done' ? 'Profil enregistré' : 'Accueil de l’organisation'
  const subtitle =
    step === 'welcome_done'
      ? 'L’étape 1 est validée. Ces données sont stockées sur le registre et réutilisées.'
      : 'Confirmez le profil de l’entreprise, puis décrivez le cas d’usage IA.'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:px-8">
        <Link
          href={hubHref}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-[#0080A3]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {hubLinkLabel}
        </Link>
        <h1 className="mb-1 text-2xl font-semibold text-gray-900">{title}</h1>
        <p className="mb-4 text-sm text-gray-600">{subtitle}</p>
        <ChatFlowStepper current={1} />

        {resolvingCompany ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-[#0080A3]" />
              <p className="text-gray-600">Chargement du registre…</p>
            </div>
          </div>
        ) : !companyId ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-medium">Aucun registre associé.</p>
            <p className="mt-1">
              Ouvrez cette page depuis un registre, ou{' '}
              <Link href={useCaseRoutes.companies()} className="underline hover:text-[#0080A3]">
                retournez à la liste des registres
              </Link>
              .
            </p>
          </div>
        ) : profileError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {profileError}
          </div>
        ) : !profile ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-[#0080A3]" />
              <p className="text-gray-600">Chargement du profil…</p>
            </div>
          </div>
        ) : step === 'welcome' ? (
          <WelcomeChatInterviewer
            companyId={companyId}
            profile={profile}
            sources={profileSources}
            onProfileConfirmed={(savedProfile) => {
              setProfile(savedProfile)
              setStep('welcome_done')
            }}
          />
        ) : (
          <WelcomeStepConfirmed
            profile={profile}
            onContinue={() => {
              if (typeof window !== 'undefined' && companyId) {
                const url = new URL(window.location.href)
                if (url.searchParams.get('company') !== companyId) {
                  url.searchParams.set('company', companyId)
                  url.searchParams.delete('company_id')
                  window.history.replaceState(null, '', `${url.pathname}${url.search}`)
                }
              }
              setStep('guided_draft')
            }}
          />
        )}
      </div>
    </div>
  )
}

function WelcomeStepConfirmed({
  profile,
  onContinue,
}: {
  profile: CompanyProfileFields
  onContinue: () => void
}) {
  const rows = [
    { label: 'Nom', value: displayCompanyProfileValue(profile.name) },
    { label: 'Secteur', value: formatIndustryForContext(profile.industry) },
    { label: 'Sous-secteur', value: formatSubCategoryForContext(profile.industry, profile.sub_category_id) },
    { label: 'Pays', value: displayCompanyProfileValue(profile.country) },
    { label: 'Adresse', value: formatAddressForContext(profile) },
  ]

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#0080A3]/10">
        <CheckCircle2 className="h-6 w-6 text-[#0080A3]" aria-hidden />
      </div>
      <h2 className="text-lg font-semibold text-gray-900">Étape 1 validée</h2>
      <p className="mt-2 text-sm text-gray-600">
        Le profil de l’organisation est enregistré sur le <strong>registre</strong>, pas
        seulement sur votre compte utilisateur. Il sera réutilisé pour les prochains cas
        d’usage de ce registre.
      </p>
      <dl className="mt-5 space-y-2 rounded-xl bg-gray-50 p-4">
        {rows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-1 gap-0.5 text-sm sm:grid-cols-[8.5rem_1fr] sm:gap-3"
          >
            <dt className="font-medium text-gray-500">{row.label}</dt>
            <dd className="text-gray-900">{row.value}</dd>
          </div>
        ))}
      </dl>
      <button
        type="button"
        onClick={onContinue}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0080A3] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#006280] sm:w-auto"
      >
        Continuer vers le cadrage
        <ArrowRight className="h-4 w-4" aria-hidden />
      </button>
    </div>
  )
}
