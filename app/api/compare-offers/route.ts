import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getOpenAIClient } from '@/lib/openai/client'
import type { CompareOffersRequest, CompareOffersResponse } from '@/lib/types/api'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const body: CompareOffersRequest = await request.json()

    if (!body.offers || body.offers.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Please provide at least 2 offers to compare' },
        { status: 400 }
      )
    }

    const openai = getOpenAIClient()

    // Create comparison prompt
    const systemPrompt = `You are an expert car buying advisor. Your job is to compare multiple dealer offers and provide clear, actionable recommendations.

CRITICAL RULES:
1. Be objective and educational - provide guidance, not financial advice
2. Focus on total cost (OTD price) when available, not just listed price
3. Consider all factors: price, dealer reputation, distance, included features
4. Highlight the best value, not necessarily the lowest price
5. Provide specific, actionable recommendations
6. Never guarantee outcomes

Your response must be a JSON object with this exact structure:
{
  "comparison": "<detailed comparison analysis in 2-3 paragraphs>",
  "bestOffer": <number - the best OTD price or listed price if OTD not available>,
  "recommendations": [<array of 3-5 specific recommendations>],
  "keyPoints": [<array of 3-5 key points to consider>]
}`

    const offersText = body.offers
      .map(
        (offer, i) =>
          `${i + 1}. ${offer.dealer}: $${offer.price.toLocaleString()}${offer.otdPrice ? ` (OTD: $${offer.otdPrice.toLocaleString()})` : ''}${offer.notes ? ` - ${offer.notes}` : ''}`
      )
      .join('\n')

    const userPrompt = `Compare these dealer offers and provide recommendations:

${offersText}

Provide a detailed comparison, identify the best offer, and give specific recommendations on which offer to pursue and why.

Return ONLY valid JSON, no other text.`

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

    // Create or link to deal
    let dealId = body.dealId

    if (!dealId) {
      const { data: deal, error: dealError } = await supabase
        .from('deals')
        .insert({
          user_id: userId,
          title: 'Offer Comparison',
        })
        .select()
        .single()

      if (dealError) {
        console.error('Error creating deal (continuing anyway):', dealError)
      } else {
        dealId = deal.id
      }
    }

    // Save analysis to database
    if (dealId) {
      const { error: analysisError } = await supabase.from('analyses').insert({
        user_id: userId,
        deal_id: dealId,
        analysis_type: 'offer_comparison',
        raw_input: { offers: body.offers },
        ai_output: aiResponse,
      })

      if (analysisError) {
        console.error('Error saving analysis (continuing anyway):', analysisError)
      }
    }

    const response: CompareOffersResponse = {
      success: true,
      analysisId: undefined,
      dealId: dealId,
      data: {
        comparison: aiResponse.comparison || 'Comparison analysis',
        bestOffer: aiResponse.bestOffer || Math.min(...body.offers.map((o) => o.otdPrice || o.price)),
        recommendations: aiResponse.recommendations || [],
        keyPoints: aiResponse.keyPoints || [],
      },
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Error comparing offers:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to compare offers' },
      { status: 500 }
    )
  }
}






