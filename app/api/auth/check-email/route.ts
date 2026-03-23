import { NextRequest, NextResponse } from 'next/server'
import { getUserByEmail } from '@/lib/invite-user'

/**
 * API Route: Check if email already exists
 *
 * Used during signup to validate email availability before sending OTP.
 * Uses service role key to check auth.users table.
 *
 * @param request - Contains email to check
 * @returns { exists: boolean, message?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    // Validate email
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email requis' },
        { status: 400 }
      )
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Format d\'email invalide' },
        { status: 400 }
      )
    }

    // Check if user exists in auth.users (with pagination)
    const { user: existingUser, error } = await getUserByEmail(email)

    if (error) {
      console.error('Error checking email:', error)
      return NextResponse.json(
        { error: 'Erreur lors de la vérification de l\'email' },
        { status: 500 }
      )
    }

    const userExists = !!existingUser

    return NextResponse.json({
      exists: userExists,
      message: userExists
        ? 'Cet email est déjà utilisé'
        : 'Email disponible'
    })

  } catch (error) {
    console.error('Error in check-email API:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
