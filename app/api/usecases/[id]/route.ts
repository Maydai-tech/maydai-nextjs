import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger, createRequestContext } from '@/lib/secure-logger'
import { recordFieldChanges, FIELD_LABELS } from '@/lib/usecase-history'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Les variables d\'environnement NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY doivent être définies'
  )
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
    
    // Create Supabase client with the user's token
    const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    })
    
    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Resolve params
    const resolvedParams = await params
    const useCaseId = resolvedParams.id

    // Fetch the use case with company information
    // Note: We fetch the model separately to avoid schema cache issues with PostgREST
    const { data: useCase, error: useCaseError } = await supabase
      .from('usecases')
      .select(`
        *,
        companies(
          id,
          name,
          industry,
          city,
          country
        )
      `)
      .eq('id', useCaseId)
      .single()

    if (useCaseError) {
      if (useCaseError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Use case not found' }, { status: 404 })
      }
      const context = createRequestContext(request)
      logger.error('Failed to fetch use case', useCaseError, { ...context, useCaseId })
      // Include error details in dev for debugging
      const errorDetails = process.env.NODE_ENV === 'development'
        ? { supabaseError: useCaseError.message, code: useCaseError.code, hint: useCaseError.hint }
        : {}
      return NextResponse.json({ error: 'Error fetching use case', ...errorDetails }, { status: 500 })
    }

    // Récupérer le profil si updated_by existe
    if (useCase?.updated_by) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('id', useCase.updated_by)
        .single()
      
      if (profile) {
        useCase.updated_by_profile = {
          first_name: profile.first_name,
          last_name: profile.last_name
        }
      }
    }

    // Check if user has access to this use case via user_companies
    const { data: userCompany, error: userCompanyError } = await supabase
      .from('user_companies')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('company_id', useCase.company_id)
      .single()

    if (userCompanyError || !userCompany) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Fetch the model separately if primary_model_id exists
    // This avoids schema cache issues with PostgREST embedded relations
    if (useCase.primary_model_id) {
      const { data: model } = await supabase
        .from('compl_ai_models')
        .select('id, model_name, model_provider, model_type, version')
        .eq('id', useCase.primary_model_id)
        .single()

      if (model) {
        useCase.compl_ai_models = model
      }
    }

    return NextResponse.json(useCase)

  } catch (error) {
    const context = createRequestContext(request)
    logger.error('Use case API error', error, context)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Create Supabase client with the user's token
    const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    })
    
    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Resolve params
    const resolvedParams = await params
    const useCaseId = resolvedParams.id

    // Parse request body
    const body = await request.json()
    const { primary_model_id, deployment_countries, deployment_date, description } = body

    // Validate model_id if provided
    if (primary_model_id !== null && primary_model_id !== undefined) {
      const { data: model, error: modelError } = await supabase
        .from('compl_ai_models')
        .select('id')
        .eq('id', primary_model_id)
        .single()

      if (modelError || !model) {
        return NextResponse.json({ error: 'Invalid model ID' }, { status: 400 })
      }
    }

    // Verify user has access to this use case and get current values for history tracking
    const { data: existingUseCase, error: useCaseError } = await supabase
      .from('usecases')
      .select('company_id, primary_model_id, deployment_countries, deployment_date, description')
      .eq('id', useCaseId)
      .single()

    if (useCaseError) {
      return NextResponse.json({ error: 'Use case not found' }, { status: 404 })
    }

    // Check if user has access via user_companies
    const { data: userCompany, error: userCompanyError } = await supabase
      .from('user_companies')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('company_id', existingUseCase.company_id)
      .single()

    if (userCompanyError || !userCompany) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Build update data object with only provided fields
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      updated_by: user.id
    }
    if (primary_model_id !== undefined) updateData.primary_model_id = primary_model_id
    if (deployment_countries !== undefined) updateData.deployment_countries = deployment_countries
    if (deployment_date !== undefined) updateData.deployment_date = deployment_date
    if (description !== undefined) updateData.description = description

    // Update the use case
    // Note: We fetch the model separately to avoid schema cache issues with PostgREST
    const { data: updatedUseCase, error: updateError } = await supabase
      .from('usecases')
      .update(updateData)
      .eq('id', useCaseId)
      .select(`
        *,
        companies(
          id,
          name,
          industry,
          city,
          country
        )
      `)
      .single()

    if (updateError) {
      const context = createRequestContext(request)
      logger.error('Failed to update use case', updateError, { ...context, useCaseId })
      return NextResponse.json({ error: 'Error updating use case' }, { status: 500 })
    }

    // Fetch the model separately if primary_model_id exists
    if (updatedUseCase.primary_model_id) {
      const { data: model } = await supabase
        .from('compl_ai_models')
        .select('id, model_name, model_provider, model_type, version')
        .eq('id', updatedUseCase.primary_model_id)
        .single()

      if (model) {
        updatedUseCase.compl_ai_models = model
      }
    }

    // Enregistrer les modifications dans l'historique
    const changes: Array<{ fieldName: string; oldValue: string | null; newValue: string | null }> = []

    // Helper pour convertir les valeurs en string pour l'historique
    const valueToString = (val: unknown): string | null => {
      if (val === null || val === undefined) return null
      if (Array.isArray(val)) return val.join(', ')
      return String(val)
    }

    // Comparer et enregistrer les changements
    if (primary_model_id !== undefined && existingUseCase.primary_model_id !== primary_model_id) {
      changes.push({
        fieldName: 'primary_model_id',
        oldValue: valueToString(existingUseCase.primary_model_id),
        newValue: valueToString(primary_model_id)
      })
    }
    if (deployment_countries !== undefined) {
      const oldCountries = valueToString(existingUseCase.deployment_countries)
      const newCountries = valueToString(deployment_countries)
      if (oldCountries !== newCountries) {
        changes.push({
          fieldName: 'deployment_countries',
          oldValue: oldCountries,
          newValue: newCountries
        })
      }
    }
    if (deployment_date !== undefined && existingUseCase.deployment_date !== deployment_date) {
      changes.push({
        fieldName: 'deployment_date',
        oldValue: existingUseCase.deployment_date,
        newValue: deployment_date
      })
    }
    if (description !== undefined && existingUseCase.description !== description) {
      changes.push({
        fieldName: 'description',
        oldValue: existingUseCase.description,
        newValue: description
      })
    }

    // Enregistrer les changements si il y en a
    if (changes.length > 0) {
      await recordFieldChanges(supabase, useCaseId, user.id, changes)
    }

    // Récupérer le profil si updated_by existe
    if (updatedUseCase?.updated_by) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('id', updatedUseCase.updated_by)
        .single()
      
      if (profile) {
        updatedUseCase.updated_by_profile = {
          first_name: profile.first_name,
          last_name: profile.last_name
        }
      }
    }

    // Recalcul automatique du score lors d'un changement de modèle IA
    // Ce processus assure que le score de conformité est mis à jour immédiatement
    if (primary_model_id !== undefined) {
      try {
        // Construction de l'URL complète pour l'appel serveur-à-serveur
        // Les appels serveur nécessitent une URL absolue contrairement aux appels client
        const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
        const host = request.headers.get('host') || 'localhost:3000'
        const calculateUrl = `${protocol}://${host}/api/usecases/${useCaseId}/calculate-score`
        
        logger.info(`Calling calculate score endpoint: ${calculateUrl}`, { useCaseId, primary_model_id })
        
        // Appel à l'endpoint de calcul de score avec authentification
        const calcResponse = await fetch(calculateUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ usecase_id: useCaseId })
        })

        // Vérification du succès de l'appel
        if (!calcResponse.ok) {
          const errorText = await calcResponse.text()
          logger.error('Failed to calculate score via API', { 
            status: calcResponse.status, 
            error: errorText,
            useCaseId,
            primary_model_id 
          })
          throw new Error(`Score calculation failed: ${calcResponse.status}`)
        }

        const calcResult = await calcResponse.json()
        logger.info(`Score recalculated successfully after model update - Final score: ${calcResult.scores?.score_final}`, { 
          useCaseId, 
          primary_model_id
        })
        
        // Récupération du use case avec les scores fraîchement calculés
        // Cette requête garantit que l'API retourne les données à jour
        // Note: We fetch the model separately to avoid schema cache issues with PostgREST
        const { data: useCaseWithNewScore, error: fetchError } = await supabase
          .from('usecases')
          .select(`
            *,
            companies(
              id,
              name,
              industry,
              city,
              country
            )
          `)
          .eq('id', useCaseId)
          .single()

        if (fetchError) {
          logger.error('Failed to fetch updated use case after score calculation', fetchError, { useCaseId })
          // En cas d'échec, on retourne quand même le use case avec le modèle mis à jour
          return NextResponse.json(updatedUseCase)
        }

        // Fetch the model separately (we know primary_model_id exists in this block)
        if (useCaseWithNewScore.primary_model_id) {
          const { data: model } = await supabase
            .from('compl_ai_models')
            .select('id, model_name, model_provider, model_type, version')
            .eq('id', useCaseWithNewScore.primary_model_id)
            .single()

          if (model) {
            useCaseWithNewScore.compl_ai_models = model
          }
        }

        // Récupérer le profil si updated_by existe
        if (useCaseWithNewScore?.updated_by) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, first_name, last_name')
            .eq('id', useCaseWithNewScore.updated_by)
            .single()

          if (profile) {
            useCaseWithNewScore.updated_by_profile = {
              first_name: profile.first_name,
              last_name: profile.last_name
            }
          }
        }

        // Retour du use case avec les scores recalculés
        return NextResponse.json(useCaseWithNewScore)
      } catch (scoreError) {
        // Gestion d'erreur gracieuse : le changement de modèle reste valide même si le calcul échoue
        const context = createRequestContext(request)
        logger.error('Failed to recalculate score after model update', scoreError, { 
          ...context, 
          useCaseId, 
          primary_model_id 
        })
        // Retour du use case avec le nouveau modèle mais sans les scores mis à jour
        return NextResponse.json(updatedUseCase)
      }
    }

    return NextResponse.json(updatedUseCase)

  } catch (error) {
    const context = createRequestContext(request)
    logger.error('Use case PUT API error', error, context)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Create Supabase client with the user's token
    const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    })
    
    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Resolve params
    const resolvedParams = await params
    const useCaseId = resolvedParams.id

    // Verify user has access to this use case
    const { data: existingUseCase, error: useCaseError } = await supabase
      .from('usecases')
      .select('company_id, name')
      .eq('id', useCaseId)
      .single()

    if (useCaseError) {
      if (useCaseError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Use case not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Error fetching use case' }, { status: 500 })
    }

    // Check if user has access to this use case via user_companies
    const { data: userCompany, error: userCompanyError } = await supabase
      .from('user_companies')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('company_id', existingUseCase.company_id)
      .single()

    if (userCompanyError || !userCompany) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const context = createRequestContext(request)
    logger.info('Deleting use case and associated data', {
      ...context,
      useCaseId,
      useCaseName: existingUseCase.name,
      deletedBy: user.email
    })

    // Delete all related data in the correct order (respecting foreign key constraints)

    // 1. Delete usecase_responses
    const { error: deleteResponsesError } = await supabase
      .from('usecase_responses')
      .delete()
      .eq('usecase_id', useCaseId)

    if (deleteResponsesError) {
      logger.error('Failed to delete usecase_responses', deleteResponsesError, { ...context, useCaseId })
      return NextResponse.json({ error: 'Error deleting use case responses' }, { status: 500 })
    }

    // 2. Delete usecase_history
    const { error: deleteHistoryError } = await supabase
      .from('usecase_history')
      .delete()
      .eq('usecase_id', useCaseId)

    if (deleteHistoryError) {
      logger.error('Failed to delete usecase_history', deleteHistoryError, { ...context, useCaseId })
      return NextResponse.json({ error: 'Error deleting use case history' }, { status: 500 })
    }

    // 3. Delete usecase_nextsteps
    const { error: deleteNextstepsError } = await supabase
      .from('usecase_nextsteps')
      .delete()
      .eq('usecase_id', useCaseId)

    if (deleteNextstepsError) {
      logger.error('Failed to delete usecase_nextsteps', deleteNextstepsError, { ...context, useCaseId })
      return NextResponse.json({ error: 'Error deleting use case nextsteps' }, { status: 500 })
    }

    // 4. Delete user_usecases (collaborators)
    const { error: deleteUserUsecasesError } = await supabase
      .from('user_usecases')
      .delete()
      .eq('usecase_id', useCaseId)

    if (deleteUserUsecasesError) {
      logger.error('Failed to delete user_usecases', deleteUserUsecasesError, { ...context, useCaseId })
      return NextResponse.json({ error: 'Error deleting use case collaborators' }, { status: 500 })
    }

    // 5. Delete contact_requests
    const { error: deleteContactRequestsError } = await supabase
      .from('contact_requests')
      .delete()
      .eq('usecase_id', useCaseId)

    if (deleteContactRequestsError) {
      logger.error('Failed to delete contact_requests', deleteContactRequestsError, { ...context, useCaseId })
      return NextResponse.json({ error: 'Error deleting contact requests' }, { status: 500 })
    }

    // 6. Delete dossiers
    const { error: deleteDossiersError } = await supabase
      .from('dossiers')
      .delete()
      .eq('usecase_id', useCaseId)

    if (deleteDossiersError) {
      logger.error('Failed to delete dossiers', deleteDossiersError, { ...context, useCaseId })
      return NextResponse.json({ error: 'Error deleting dossiers' }, { status: 500 })
    }

    // Delete the use case itself
    const { error: deleteUseCaseError } = await supabase
      .from('usecases')
      .delete()
      .eq('id', useCaseId)

    if (deleteUseCaseError) {
      logger.error('Failed to delete use case', deleteUseCaseError, { 
        ...context, 
        useCaseId 
      })
      return NextResponse.json({ error: 'Error deleting use case' }, { status: 500 })
    }

    logger.info('Successfully deleted use case and all associated data', { 
      ...context, 
      useCaseId,
      useCaseName: existingUseCase.name,
      deletedBy: user.email 
    })

    // Return 204 No Content on successful deletion
    return new NextResponse(null, { status: 204 })

  } catch (error) {
    const context = createRequestContext(request)
    logger.error('Use case DELETE API error', error, context)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 