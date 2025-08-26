import { NextRequest, NextResponse } from 'next/server'
import { mistralAI } from '@/lib/mistral-ai'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { formData } = body

    if (!formData) {
      return NextResponse.json(
        { error: 'Données du formulaire requises' },
        { status: 400 }
      )
    }

    // Validation des données minimales
    if (!formData.name || !formData.ai_category) {
      return NextResponse.json(
        { error: 'Le nom et la catégorie d\'IA sont requis pour la génération' },
        { status: 400 }
      )
    }

    const description = await mistralAI.generateDescription(formData)
    
    return NextResponse.json({ 
      description,
      success: true,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Erreur génération description:', error)
    return NextResponse.json(
      { 
        error: 'Erreur lors de la génération de la description',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    )
  }
}
