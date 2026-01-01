import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const sessionId = params.sessionId

    // Get session with messages
    const { data: sessionData, error: sessionError } = await supabase
      .from('negotiation_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single()

    if (sessionError || !sessionData) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 })
    }

    // Get all messages for this session
    const { data: messages, error: messagesError } = await supabase
      .from('session_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (messagesError) {
      console.error('Error fetching messages:', messagesError)
    }

    return NextResponse.json({
      success: true,
      session: sessionData,
      messages: messages || [],
    })
  } catch (error: any) {
    console.error('Error fetching session:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch session' },
      { status: 500 }
    )
  }
}






