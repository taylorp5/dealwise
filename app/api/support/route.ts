import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

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

    // Get Supabase client (server-side, can use service role if needed)
    const supabase = createServerSupabaseClient()

    // Try to get current user if authenticated
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id || null

    // Insert support ticket
    const { data, error: insertError } = await supabase
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
      console.error('[Support] Error inserting ticket:', insertError)
      
      // Check if table doesn't exist
      if (insertError.message?.includes('does not exist') || insertError.message?.includes('schema cache')) {
        return NextResponse.json(
          { 
            error: 'Support system not configured. Please contact the administrator.',
            details: 'Table support_tickets does not exist. Run migration: supabase/migrations/002_support_tickets.sql'
          },
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

