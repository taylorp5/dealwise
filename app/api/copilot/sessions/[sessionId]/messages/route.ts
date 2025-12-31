import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getOpenAIClient } from '@/lib/openai/client'
import { analyzeDealerMessage } from '@/lib/prompts/copilot'
import type { AddMessageRequest, CopilotResponse } from '@/lib/types/copilot'

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const supabase = await createServerClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const sessionId = params.sessionId
    const body: AddMessageRequest = await request.json()

    // Verify session belongs to user
    const { data: sessionData, error: sessionError } = await supabase
      .from('negotiation_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single()

    if (sessionError || !sessionData) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 })
    }

    // Save user/dealer message
    const { data: userMessage, error: messageError } = await supabase
      .from('session_messages')
      .insert({
        session_id: sessionId,
        role: body.role,
        content: body.content,
        message_type: body.message_type || 'response',
      })
      .select()
      .single()

    if (messageError) {
      console.error('Error saving message:', messageError)
      return NextResponse.json(
        { success: false, error: 'Failed to save message' },
        { status: 500 }
      )
    }

    // Get message history for context
    const { data: messageHistory } = await supabase
      .from('session_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    // Generate copilot response using AI
    const openai = getOpenAIClient()
    const prompts = analyzeDealerMessage(sessionData, messageHistory || [], body.content)

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: prompts.systemPrompt },
          { role: 'user', content: prompts.userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.8,
      })

      const aiResponse: CopilotResponse = JSON.parse(
        completion.choices[0].message.content || '{}'
      )

      // Save copilot response
      const { data: copilotMessage, error: copilotError } = await supabase
        .from('session_messages')
        .insert({
          session_id: sessionId,
          role: 'copilot',
          content: aiResponse.recommended_response || 'Analysis complete',
          message_type: 'response',
          tactic_explanation: aiResponse.tactic_explanation,
          recommended_response: aiResponse.recommended_response,
          suggested_counter_range: aiResponse.suggested_counter_range,
          next_questions: aiResponse.next_questions,
          checklist_items: aiResponse.checklist_items,
        })
        .select()
        .single()

      if (copilotError) {
        console.error('Error saving copilot message:', copilotError)
      }

      // Update session stage if needed
      if (sessionData.current_stage === 'initial_contact') {
        await supabase
          .from('negotiation_sessions')
          .update({ current_stage: 'negotiating' })
          .eq('id', sessionId)
      }

      return NextResponse.json({
        success: true,
        copilotResponse: aiResponse,
        messageId: userMessage.id,
        copilotMessageId: copilotMessage?.id,
      })
    } catch (aiError: any) {
      console.error('Error generating copilot response:', aiError)
      return NextResponse.json(
        { success: false, error: 'Failed to generate response' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Error processing message:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process message' },
      { status: 500 }
    )
  }
}


