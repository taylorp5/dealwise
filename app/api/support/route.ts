import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

// Create Supabase admin client with service role key (bypasses RLS)
// This ensures support tickets can always be submitted, even for anonymous users
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase configuration for support tickets')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, topic, message, pageUrl } = body

    // Server-side validation
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      )
    }

    if (!topic || typeof topic !== 'string') {
      return NextResponse.json(
        { error: 'Topic is required' },
        { status: 400 }
      )
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Try to get current user if authenticated (using anon key client)
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id || null

    // Use service role key for inserts (bypasses RLS, ensures reliability)
    // This is safe because:
    // 1. Server-side validation is performed above
    // 2. This is a server-side API route (not exposed to client)
    // 3. We want support tickets to always be submittable, even for anonymous users
    const adminSupabase = getSupabaseAdmin()

    // Insert support ticket using admin client (bypasses RLS)
    const { data, error: insertError } = await adminSupabase
      .from('support_tickets')
      .insert({
        email: email.trim(),
        topic: topic.trim(),
        message: message.trim(),
        page_url: pageUrl?.trim() || null,
        user_id: userId,
      })
      .select()
      .single()

    if (insertError) {
      console.error('[Support] Error inserting ticket:', {
        message: insertError.message,
        code: insertError.code,
        details: insertError.details,
        hint: insertError.hint,
        fullError: JSON.stringify(insertError, null, 2),
      })
      
      // Check if table doesn't exist
      const errorMessage = insertError.message || ''
      const errorCode = insertError.code || ''
      
      if (
        errorMessage.includes('does not exist') ||
        errorMessage.includes('schema cache') ||
        errorCode === '42P01' || // PostgreSQL: relation does not exist
        errorCode === 'PGRST116' // PostgREST: relation does not exist
      ) {
        return NextResponse.json(
          { 
            error: 'Support system not configured. Please contact the administrator.',
            details: 'Table support_tickets does not exist. Run migration: supabase/migrations/002_support_tickets.sql'
          },
          { status: 500 }
        )
      }

      // Check for RLS policy issues
      if (
        errorCode === '42501' || // PostgreSQL: insufficient privilege
        errorMessage.includes('permission denied') ||
        errorMessage.includes('policy violation')
      ) {
        console.error('[Support] RLS policy issue detected')
        return NextResponse.json(
          { error: 'Permission denied. Please ensure RLS policies are configured correctly.' },
          { status: 500 }
        )
      }

      // Generic error for client
      return NextResponse.json(
        { error: 'Failed to submit message. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, id: data.id })
  } catch (error: any) {
    console.error('[Support] Error:', error)
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    )
  }
}

