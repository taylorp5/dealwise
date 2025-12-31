import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getOpenAIClient } from '@/lib/openai/client'
import { getPackConfig } from '@/lib/packs/config'
import { generateInitialStrategy } from '@/lib/prompts/copilot'
import type { CreateSessionRequest } from '@/lib/types/copilot'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const body: CreateSessionRequest = await request.json()

    if (!body.pack_type) {
      return NextResponse.json({ success: false, error: 'Missing pack_type' }, { status: 400 })
    }

    // Create session in database
    const { data: sessionData, error: sessionError } = await supabase
      .from('negotiation_sessions')
      .insert({
        user_id: userId,
        pack_type: body.pack_type,
        car_make: body.car_make,
        car_model: body.car_model,
        car_year: body.car_year,
        car_vin: body.car_vin,
        listing_url: body.listing_url,
        asking_price: body.asking_price,
        payment_method: body.payment_method,
        max_otd_budget: body.max_otd_budget,
        timeline: body.timeline,
        has_trade_in: body.has_trade_in,
        trade_in_details: body.trade_in_details,
        communication_method: body.communication_method,
        tone_preference: body.tone_preference,
        risk_tolerance: body.risk_tolerance,
        must_have_features: body.must_have_features,
        max_monthly_payment: body.max_monthly_payment,
        down_payment: body.down_payment,
        pre_approved: body.pre_approved,
        pre_approval_rate: body.pre_approval_rate,
        status: 'active',
        current_stage: 'initial_contact',
      })
      .select()
      .single()

    if (sessionError) {
      console.error('Error creating session:', sessionError)
      return NextResponse.json(
        { success: false, error: 'Failed to create session' },
        { status: 500 }
      )
    }

    // Generate initial strategy and script using AI
    const packConfig = getPackConfig(body.pack_type)
    const openai = getOpenAIClient()

    try {
      const strategyPrompt = generateInitialStrategy(body, packConfig)
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: strategyPrompt.systemPrompt,
          },
          {
            role: 'user',
            content: strategyPrompt.userPrompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.8,
      })

      const aiResponse = JSON.parse(completion.choices[0].message.content || '{}')

      // Update session with generated strategy
      const { error: updateError } = await supabase
        .from('negotiation_sessions')
        .update({
          initial_strategy: aiResponse.strategy,
          initial_script: aiResponse.script,
          in_person_talk_track: aiResponse.talk_track,
        })
        .eq('id', sessionData.id)

      if (updateError) {
        console.error('Error updating session with strategy:', updateError)
      }

      // Create initial copilot message
      await supabase.from('session_messages').insert({
        session_id: sessionData.id,
        role: 'copilot',
        content: `Here's your initial negotiation strategy:\n\n${aiResponse.strategy?.summary || 'Strategy generated'}\n\n${aiResponse.script ? `\nYour initial message:\n${aiResponse.script}` : ''}`,
        message_type: 'initial',
        tactic_explanation: aiResponse.strategy?.key_points?.join('\n'),
        recommended_response: aiResponse.script,
        next_questions: aiResponse.strategy?.next_steps || [],
        checklist_items: aiResponse.strategy?.checklist || [],
      })
    } catch (aiError: any) {
      console.error('Error generating strategy:', aiError)
      // Continue even if AI generation fails
    }

    return NextResponse.json({
      success: true,
      sessionId: sessionData.id,
    })
  } catch (error: any) {
    console.error('Error creating copilot session:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create session' },
      { status: 500 }
    )
  }
}


