import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { dbResponsesToQuestionnaireAnswers } from '@/lib/scoring-v2-server'
import { normalizeQuestionnaireVersion, QUESTIONNAIRE_VERSION_V3 } from '@/lib/questionnaire-version'
import { logger, createRequestContext } from '@/lib/secure-logger'
import { PDFV3PrediagnosticDocument } from '@/app/usecases/[id]/components/pdf/PDFV3PrediagnosticDocument'
import { buildV3PrediagnosticPdfModel } from '@/app/usecases/[id]/utils/v3-prediagnostic-pdf-model'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Les variables d\'environnement NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY doivent être définies'
  )
}

function pdfBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    ''
  ).replace(/\/$/, '')
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser(token)
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { id: useCaseId } = await params

    const { data: useCase, error: useCaseError } = await supabase
      .from('usecases')
      .select(
        `
        id,
        name,
        company_id,
        system_type,
        questionnaire_version,
        companies ( name )
      `
      )
      .eq('id', useCaseId)
      .single()

    if (useCaseError) {
      if (useCaseError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Use case not found' }, { status: 404 })
      }
      const context = createRequestContext(request)
      logger.error('prediagnostic-pdf: use case fetch', useCaseError, { ...context, useCaseId })
      return NextResponse.json({ error: 'Error fetching use case' }, { status: 500 })
    }

    const { data: userCompany, error: userCompanyError } = await supabase
      .from('user_companies')
      .select('company_id')
      .eq('user_id', authUser.id)
      .eq('company_id', useCase.company_id)
      .single()

    if (userCompanyError || !userCompany) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const qv = normalizeQuestionnaireVersion(
      (useCase as { questionnaire_version?: number | null }).questionnaire_version
    )
    if (qv !== QUESTIONNAIRE_VERSION_V3) {
      return NextResponse.json(
        { error: 'Le PDF pré-diagnostic court est disponible uniquement pour les cas en questionnaire V3.' },
        { status: 400 }
      )
    }

    const { data: responses, error: responsesError } = await supabase
      .from('usecase_responses')
      .select('*')
      .eq('usecase_id', useCaseId)

    if (responsesError) {
      const context = createRequestContext(request)
      logger.error('prediagnostic-pdf: responses', responsesError, { ...context, useCaseId })
      return NextResponse.json({ error: 'Error fetching responses' }, { status: 500 })
    }

    const answers = dbResponsesToQuestionnaireAnswers(responses || [])

    const companies = (useCase as { companies?: { name?: string } | { name?: string }[] | null }).companies
    const companyName = Array.isArray(companies) ? companies[0]?.name : companies?.name

    const model = buildV3PrediagnosticPdfModel({
      useCaseId,
      useCaseName: (useCase as { name?: string }).name,
      companyId: useCase.company_id,
      companyName: companyName ?? null,
      systemType: (useCase as { system_type?: string | null }).system_type,
      answers,
      baseUrl: pdfBaseUrl(),
    })

    const pdfElement = React.createElement(PDFV3PrediagnosticDocument, { model })
    const buffer = await renderToBuffer(pdfElement as any)

    const rawName = ((useCase as { name?: string }).name ?? 'cas').replace(/[^a-zA-Z0-9]+/g, '-').slice(0, 48)
    const date = new Date().toISOString().split('T')[0]
    const filename = `maydai-prediagnostic-court-${rawName || 'cas'}-${date}.pdf`

    const context = createRequestContext(request)
    logger.info('prediagnostic-pdf generated', { ...context, useCaseId, filename })

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    })
  } catch (error) {
    const context = createRequestContext(request)
    logger.error('prediagnostic-pdf error', error, context)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
