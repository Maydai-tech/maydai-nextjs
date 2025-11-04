import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

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

export async function GET(request: NextRequest) {
  try {
    const { supabase, user, error } = await getClientFromAuth(request) as any
    if (error) return NextResponse.json({ error }, { status: 401 })

    // Get plan limit
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan_id')
      .eq('user_id', user.id)
      .maybeSingle()

    let planId = subscription?.plan_id

    if (!planId) {
      const { data: freemiumPlan } = await supabase
        .from('plans')
        .select('id')
        .eq('plan_id', 'freemium')
        .single()
      planId = freemiumPlan?.id
    }

    const { data: plan } = await supabase
      .from('plans')
      .select('max_storage_mb')
      .eq('id', planId)
      .single()

    const maxStorageMb = plan?.max_storage_mb || 250

    // Get all companies where user is owner
    const { data: ownedCompanies } = await supabase
      .from('user_companies')
      .select('company_id')
      .eq('user_id', user.id)
      .in('role', ['owner', 'company_owner'])

    if (!ownedCompanies || ownedCompanies.length === 0) {
      return NextResponse.json({
        usedStorageMb: 0,
        maxStorageMb,
        percentUsed: 0
      })
    }

    // Calculate total storage usage across all owned companies
    let totalSizeBytes = 0

    for (const { company_id } of ownedCompanies) {
      try {
        // List all files for this company
        const { data: files, error: listError } = await (supabase as any).storage
          .from('dossiers')
          .list(company_id, {
            limit: 1000,
            sortBy: { column: 'created_at', order: 'desc' }
          })

        if (listError) {
          console.warn(`Error listing files for company ${company_id}:`, listError)
          continue
        }

        if (files) {
          // For each folder (usecaseId), list its contents
          for (const folder of files) {
            const { data: usecaseFiles } = await (supabase as any).storage
              .from('dossiers')
              .list(`${company_id}/${folder.name}`, {
                limit: 1000
              })

            if (usecaseFiles) {
              // For each doc type folder, list its files
              for (const docTypeFolder of usecaseFiles) {
                const { data: docFiles } = await (supabase as any).storage
                  .from('dossiers')
                  .list(`${company_id}/${folder.name}/${docTypeFolder.name}`, {
                    limit: 1000
                  })

                if (docFiles) {
                  // Sum up file sizes
                  for (const file of docFiles) {
                    if (file.metadata?.size) {
                      totalSizeBytes += file.metadata.size
                    }
                  }
                }
              }
            }
          }
        }
      } catch (err) {
        console.error(`Error processing company ${company_id}:`, err)
      }
    }

    const usedStorageMb = totalSizeBytes / (1024 * 1024)

    return NextResponse.json({
      usedStorageMb: parseFloat(usedStorageMb.toFixed(2)),
      maxStorageMb,
      percentUsed: parseFloat(((usedStorageMb / maxStorageMb) * 100).toFixed(1))
    })
  } catch (e) {
    console.error('Storage usage error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
