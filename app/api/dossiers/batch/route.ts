import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  coalesceTrainingDocumentRows,
  getAcceptedDossierApiDocTypeParams,
  resolveCanonicalDocType,
  trainingDocTypesForQuery,
} from '@/lib/canonical-actions'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const allowedDocTypes = getAcceptedDossierApiDocTypeParams()

async function getClientFromAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return { error: 'No authorization header' }
  const token = authHeader.replace('Bearer ', '')
  const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return { error: 'Invalid token' }
  return { supabase, user }
}

interface DocumentResult {
  usecaseId: string
  docType: string
  formData: any
  fileUrl: string | null
  status: 'incomplete' | 'complete' | 'validated'
  updatedAt: string | null
}

/**
 * Batch endpoint to fetch multiple documents for multiple use cases
 * Query params:
 *   - usecaseIds: comma-separated list of use case IDs
 *   - docTypes: comma-separated list of document types
 *
 * Example: /api/dossiers/batch?usecaseIds=id1,id2&docTypes=system_prompt,technical_documentation
 *
 * Returns: Array of document results with usecaseId and docType for identification
 */
export async function GET(request: NextRequest) {
  try {
    const { supabase, user, error } = await getClientFromAuth(request) as any
    if (error) return NextResponse.json({ error }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const usecaseIdsParam = searchParams.get('usecaseIds')
    const docTypesParam = searchParams.get('docTypes')

    if (!usecaseIdsParam || !docTypesParam) {
      return NextResponse.json({
        error: 'Missing required parameters: usecaseIds and docTypes'
      }, { status: 400 })
    }

    const usecaseIds = usecaseIdsParam.split(',').filter(Boolean)
    const docTypes = docTypesParam.split(',').filter(Boolean)

    // Validate document types
    const invalidDocTypes = docTypes.filter(dt => !allowedDocTypes.has(dt))
    if (invalidDocTypes.length > 0) {
      return NextResponse.json({
        error: `Invalid docTypes: ${invalidDocTypes.join(', ')}`
      }, { status: 400 })
    }

    // Fetch all dossiers for the requested use cases in one query
    const { data: dossiers } = await supabase
      .from('dossiers')
      .select('id, usecase_id, company_id')
      .in('usecase_id', usecaseIds)

    if (!dossiers || dossiers.length === 0) {
      // No dossiers found - return empty results for all requested combinations
      const emptyResults: DocumentResult[] = []
      for (const usecaseId of usecaseIds) {
        for (const docType of docTypes) {
          emptyResults.push({
            usecaseId,
            docType,
            formData: null,
            fileUrl: null,
            status: 'incomplete',
            updatedAt: null
          })
        }
      }
      return NextResponse.json({ documents: emptyResults })
    }

    // Get unique company IDs
    const companyIds = Array.from(new Set(dossiers.map((d: any) => d.company_id)))

    // Verify user has access to all companies in one query
    const { data: userCompanies } = await supabase
      .from('user_companies')
      .select('company_id')
      .eq('user_id', user.id)
      .in('company_id', companyIds)

    const accessibleCompanyIds = new Set(userCompanies?.map((uc: any) => uc.company_id) || [])

    // Filter dossiers to only those the user can access
    const accessibleDossiers = dossiers.filter((d: any) => accessibleCompanyIds.has(d.company_id))

    if (accessibleDossiers.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get all dossier IDs
    const dossierIds = accessibleDossiers.map((d: any) => d.id)

    const expandedDocTypeSet = new Set<string>()
    for (const dt of docTypes) {
      const c = resolveCanonicalDocType(dt)
      if (c === 'training_plan') {
        trainingDocTypesForQuery().forEach(t => expandedDocTypeSet.add(t))
      } else {
        expandedDocTypeSet.add(c)
      }
    }
    const expandedDocTypes = [...expandedDocTypeSet]

    // Fetch all documents in one query
    const { data: documents } = await supabase
      .from('dossier_documents')
      .select('dossier_id, doc_type, form_data, file_url, status, updated_at')
      .in('dossier_id', dossierIds)
      .in('doc_type', expandedDocTypes)

    // Create a map of dossier_id -> usecase_id for quick lookup
    const dossierToUseCaseMap = new Map(
      accessibleDossiers.map((d: any) => [d.id, d.usecase_id])
    )

    // Create a map of (usecaseId + docType) -> document data
    const documentMap = new Map<string, any>()
    documents?.forEach((doc: any) => {
      const usecaseId = dossierToUseCaseMap.get(doc.dossier_id)
      if (usecaseId) {
        const key = `${usecaseId}:${doc.doc_type}`
        documentMap.set(key, doc)
      }
    })

    // Build results for all requested combinations
    const results: DocumentResult[] = []
    for (const usecaseId of usecaseIds) {
      // Only include use cases the user has access to
      const dossier = accessibleDossiers.find((d: any) => d.usecase_id === usecaseId)
      if (!dossier) continue

      for (const docType of docTypes) {
        const canonical = resolveCanonicalDocType(docType)
        let doc: any = null
        if (canonical === 'training_plan') {
          const a = documentMap.get(`${usecaseId}:training_plan`)
          const b = documentMap.get(`${usecaseId}:training_census`)
          doc = coalesceTrainingDocumentRows([a, b].filter(Boolean))
        } else {
          doc = documentMap.get(`${usecaseId}:${canonical}`) ?? null
        }

        const st = doc?.status ?? 'incomplete'
        const status: 'incomplete' | 'complete' | 'validated' =
          st === 'complete' || st === 'validated' ? st : 'incomplete'

        results.push({
          usecaseId,
          docType,
          formData: doc?.form_data ?? null,
          fileUrl: doc?.file_url ?? null,
          status,
          updatedAt: doc?.updated_at ?? null
        })
      }
    }

    return NextResponse.json({ documents: results })
  } catch (e) {
    console.error('Batch endpoint error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
