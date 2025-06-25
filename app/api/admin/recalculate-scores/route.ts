import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Variables d\'environnement Supabase manquantes')
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== STARTING BATCH SCORE RECALCULATION ===')
    
    // Vérification basique d'autorisation (vous pouvez améliorer cela)
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.includes('admin-secret')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(supabaseUrl!, supabaseServiceKey!)
    
    // Récupérer tous les use cases
    const { data: usecases, error: usecasesError } = await supabase
      .from('usecases')
      .select('id')
    
    if (usecasesError) {
      throw new Error(`Erreur lors de la récupération des use cases: ${usecasesError.message}`)
    }

    console.log(`Found ${usecases?.length || 0} use cases to process`)
    
    const results = []
    let successCount = 0
    let errorCount = 0

    for (const usecase of usecases || []) {
      try {
        console.log(`Processing use case: ${usecase.id}`)
        
        // Appeler l'API de score pour recalculer
        const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/usecases/${usecase.id}/score`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json'
          }
        })

        if (response.ok) {
          const scoreData = await response.json()
          results.push({
            usecase_id: usecase.id,
            status: 'success',
            score: scoreData.score,
            category_count: scoreData.category_scores?.length || 0
          })
          successCount++
          console.log(`✅ Success for use case ${usecase.id}`)
        } else {
          const errorData = await response.json()
          results.push({
            usecase_id: usecase.id,
            status: 'error',
            error: errorData.error || 'Unknown error'
          })
          errorCount++
          console.log(`❌ Error for use case ${usecase.id}: ${errorData.error}`)
        }
      } catch (error) {
        results.push({
          usecase_id: usecase.id,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        errorCount++
        console.log(`❌ Exception for use case ${usecase.id}:`, error)
      }
    }

    console.log(`=== BATCH RECALCULATION COMPLETED ===`)
    console.log(`✅ Success: ${successCount}`)
    console.log(`❌ Errors: ${errorCount}`)

    return NextResponse.json({
      message: 'Batch recalculation completed',
      total_processed: usecases?.length || 0,
      success_count: successCount,
      error_count: errorCount,
      results
    })

  } catch (error) {
    console.error('=== ERROR IN BATCH RECALCULATION ===')
    console.error(error)
    
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 