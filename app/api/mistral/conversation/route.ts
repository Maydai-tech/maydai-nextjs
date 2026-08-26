import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedSupabaseClient } from '@/lib/api-auth'
import {
  completeMistralAgent,
  type MistralAgentMessage,
  type MistralAgentRole,
} from '@/lib/mistral/agents'

const ALLOWED_ROLES: readonly MistralAgentRole[] = ['user', 'assistant', 'system']

function parseMessages(raw: unknown): MistralAgentMessage[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null

  const messages: MistralAgentMessage[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') return null
    const role = (item as { role?: unknown }).role
    const content = (item as { content?: unknown }).content
    if (typeof role !== 'string' || !ALLOWED_ROLES.includes(role as MistralAgentRole)) {
      return null
    }
    if (typeof content !== 'string' || !content.trim()) return null
    messages.push({ role: role as MistralAgentRole, content: content.trim() })
  }
  return messages
}

export async function POST(request: NextRequest) {
  try {
    await getAuthenticatedSupabaseClient(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  const messages = parseMessages(
    body && typeof body === 'object' ? (body as { messages?: unknown }).messages : null
  )
  if (!messages) {
    return NextResponse.json(
      { error: 'messages requis (tableau { role, content } non vide)' },
      { status: 400 }
    )
  }

  try {
    const content = await completeMistralAgent(messages)
    return NextResponse.json({ success: true, content })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Erreur lors de l’appel à l’agent Mistral',
        details: error instanceof Error ? error.message : 'Erreur inconnue',
      },
      { status: 500 }
    )
  }
}
