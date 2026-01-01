import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getOpenAIClient } from '@/lib/openai/client'
import type { InterpretDealerResponse } from '@/lib/types/api'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { dealerMessage } = body

    if (!dealerMessage || !dealerMessage.trim()) {
      return NextResponse.json(
        { success: false, error: 'Missing dealerMessage' },
        { status: 400 }
      )
    }

    const openai = getOpenAIClient()

    const systemPrompt = `You are an expert car buying negotiation coach. Your job is to help users understand what car dealers are really saying in their messages and provide the best response.

CRITICAL RULES:
1. Decode dealer tactics and hidden meanings
2. Identify what information is missing or unclear
3. Provide a single, best response (not multiple options)
4. Be educational, not prescriptive - explain tactics, not guarantee outcomes
5. Focus on what the user should do next
6. Keep responses clear and actionable

Your response must be a JSON object with this exact structure:
{
  "interpretation": "<plain-language explanation of what the dealer is really saying, what tactics they're using, and what's missing>",
  "keyPoints": ["<key point 1>", "<key point 2>", "<key point 3>"],
  "suggestedResponse": "<the single best response the user should send, ready to copy/paste>",
  "whatsMissing": ["<missing info 1>", "<missing info 2>"],
  "redFlags": ["<red flag 1>", "<red flag 2>"],
  "nextSteps": ["<next step 1>", "<next step 2>"]
}`

    const userPrompt = `Analyze this dealer message and provide interpretation and best response:

Dealer Message:
${dealerMessage}

Provide a clear interpretation, identify what's missing, and give the single best response the user should send.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    })

    const aiResponse = JSON.parse(completion.choices[0].message.content || '{}')

    if (!aiResponse.interpretation && !aiResponse.explanation) {
      throw new Error('Invalid response format from AI')
    }

    // Transform to match expected format
    const response: InterpretDealerResponse = {
      success: true,
      data: {
        explanation: aiResponse.interpretation || aiResponse.explanation,
        keyPoints: aiResponse.keyPoints || [],
        recommendedResponse: aiResponse.suggestedResponse || aiResponse.recommendedResponse || '',
        redFlags: aiResponse.redFlags || [],
        nextSteps: aiResponse.nextSteps || [],
      },
    }
    
    // Add whatsMissing to response data for copilot page
    ;(response.data as any).whatsMissing = aiResponse.whatsMissing || []

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Error interpreting dealer message:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to interpret message' },
      { status: 500 }
    )
  }
}

