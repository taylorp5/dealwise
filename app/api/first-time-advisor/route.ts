import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getOpenAIClient } from '@/lib/openai/client'
import {
  FIRST_TIME_BUYER_ADVISOR_SYSTEM_PROMPT,
  buildFirstTimeBuyerAdvisorUserPrompt,
} from '@/lib/prompts/first-time-buyer-advisor'
import type { AdvisorModule, FinancingAdvisorAnswers } from '@/lib/types/financing-advisor'

type AdvisorMode = 'what-am-i-missing' | 'is-this-normal' | 'fee-explanation'

// Decision module types for hard routing
type DecisionModule = 
  | 'FINANCING_DECISION'
  | 'GOOD_DEAL_DECISION'
  | 'NEW_VS_USED_DECISION'
  | 'PAYMENT_SAFETY_DECISION'
  | 'GO_IN_DECISION'
  | 'FEES_WALK_DECISION'
  | 'DOWN_PAYMENT_DECISION'
  | null

// Helper to classify user input into a specific decision module (hard routing)
function classifyDecisionModule(input: string): DecisionModule {
  if (!input || typeof input !== 'string') return null
  
  const lower = input.toLowerCase().trim()
  
  // FINANCING_DECISION
  if (/(should i|finance|financing|loan|credit|apr|monthly payment|interest rate|financing|borrow|car loan)/i.test(lower)) {
    return 'FINANCING_DECISION'
  }
  
  // GOOD_DEAL_DECISION
  if (/(good deal|fair price|worth it|good value|fair value|overpriced|underpriced|reasonable price|good price|fair deal)/i.test(lower)) {
    return 'GOOD_DEAL_DECISION'
  }
  
  // NEW_VS_USED_DECISION
  if (/(new|used|new vs used|new or used|new versus used|should i buy new|should i buy used|new car|used car)/i.test(lower)) {
    return 'NEW_VS_USED_DECISION'
  }
  
  // PAYMENT_SAFETY_DECISION
  if (/(payment safe|afford|monthly payment safe|can i afford|affordable|payment too high|budget|monthly budget)/i.test(lower)) {
    return 'PAYMENT_SAFETY_DECISION'
  }
  
  // GO_IN_DECISION
  if (/(come in|go in|visit|dealer wants|should i go|should i visit|should i come|dealer asking|dealer invited)/i.test(lower)) {
    return 'GO_IN_DECISION'
  }
  
  // FEES_WALK_DECISION
  if (/(fees|walk|walk away|added fees|should i walk|too many fees|hidden fees|extra fees|mandatory fees)/i.test(lower)) {
    return 'FEES_WALK_DECISION'
  }
  
  // DOWN_PAYMENT_DECISION
  if (/(down payment|down|put down|more down|down payment amount|how much down|down payment size)/i.test(lower)) {
    return 'DOWN_PAYMENT_DECISION'
  }
  
  return null
}

// Helper to map DecisionModule to AdvisorModule for backward compatibility
function mapDecisionModuleToAdvisorModule(decisionModule: DecisionModule | null): AdvisorModule | null {
  if (!decisionModule) return null
  
  const mapping: Record<string, AdvisorModule> = {
    'FINANCING_DECISION': 'financing',
    'GOOD_DEAL_DECISION': 'good_deal',
    'NEW_VS_USED_DECISION': 'new_vs_used',
    'PAYMENT_SAFETY_DECISION': 'payment_safe',
    'GO_IN_DECISION': 'go_in',
    'FEES_WALK_DECISION': 'fees_walk',
    'DOWN_PAYMENT_DECISION': 'down_payment',
  }
  
  return mapping[decisionModule] || null
}

// Helper to calculate guardrail math for financing
function calculateGuardrailMath(apr?: number, termMonths?: number, vehiclePrice?: number, downPayment?: number): string | null {
  if (!apr || !termMonths || !vehiclePrice) return null
  
  const principal = vehiclePrice - (downPayment || 0)
  const monthlyRate = apr / 100 / 12
  const numPayments = termMonths
  
  // Basic amortization: M = P * [r(1+r)^n] / [(1+r)^n - 1]
  const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1)
  const totalInterest = (monthlyPayment * numPayments) - principal
  
  return `Based on ${apr}% APR over ${termMonths} months, your estimated monthly payment would be around $${Math.round(monthlyPayment)}, with approximately $${Math.round(totalInterest)} in total interest over the loan term.`
}

export async function POST(request: NextRequest) {
  try {
    // Support Authorization header (Bearer token) and cookie session
    const authHeader = request.headers.get('authorization')
    let supabase = await createServerSupabaseClient()
    let userId: string | null = null

    // If Bearer token is provided, create a client with that token for RLS
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      // First verify the token and get user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser(token)
      
      if (userError || !user) {
        return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 })
      }
      
      userId = user.id
      
      // For server-side operations, use service role key to bypass RLS
      const { createClient } = await import('@supabase/supabase-js')
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      
      if (serviceRoleKey) {
        // Use service role key - bypasses RLS (secure because we've already verified the user)
        supabase = createClient(supabaseUrl, serviceRoleKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        })
      } else {
        // Fallback: use anon key with token in headers (may not work with RLS)
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        supabase = createClient(supabaseUrl, supabaseAnonKey, {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
          auth: {
            persistSession: false,
          },
        })
        console.warn('SUPABASE_SERVICE_ROLE_KEY not set - RLS may block this operation. Set it in .env.local for server-side operations.')
      }
    } else {
      // Use cookie-based session
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session?.user) userId = session.user.id
    }

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    let body
    try {
      body = await request.json()
    } catch (parseError: any) {
      console.error('[first-time-advisor] Request body parse error:', parseError)
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      )
    }

    const { mode, context, dealerMessage, feeLine, userInput, financingAnswers, moduleType, moduleAnswers, savedMemory } = body

    let openai
    try {
      openai = getOpenAIClient()
    } catch (openaiError: any) {
      console.error('[first-time-advisor] OpenAI client initialization error:', openaiError)
      return NextResponse.json(
        { 
          success: false, 
          error: `OpenAI client error: ${openaiError.message || 'Failed to initialize OpenAI client'}` 
        },
        { status: 500 }
      )
    }

    let systemPrompt = ''
    let userPrompt = ''
    let responseType = 'general'
    
    // Hard route: Classify user input into a specific decision module BEFORE calling the model
    let activeDecisionModule: DecisionModule = null
    if (userInput) {
      activeDecisionModule = classifyDecisionModule(userInput)
    }
    
    // Map to AdvisorModule for backward compatibility
    const detectedModule = moduleType || (activeDecisionModule ? mapDecisionModuleToAdvisorModule(activeDecisionModule) : null)

    // Conversational mode - auto-detect input type
    if (mode === 'conversational') {
      if (!userInput) {
        return NextResponse.json({ success: false, error: 'Missing userInput' }, { status: 400 })
      }

      // Use the dedicated First-Time Buyer Advisor system prompt
      systemPrompt = FIRST_TIME_BUYER_ADVISOR_SYSTEM_PROMPT

      // Build user prompt with context and JSON response format instructions
      // Pass activeDecisionModule explicitly so the model uses the hard-routed module
      const baseUserPrompt = buildFirstTimeBuyerAdvisorUserPrompt(userInput, context || {}, activeDecisionModule || undefined)
      
      // Get saved memory for context
      const memoryContext = savedMemory ? `\n\nPREVIOUS ANSWERS (for context, do not re-ask):\n${JSON.stringify(savedMemory, null, 2)}` : ''

      // If moduleAnswers are provided, include them in the prompt
      const moduleAnswersText = (financingAnswers || moduleAnswers)
        ? `\n\nUSER'S ${detectedModule?.toUpperCase() || 'MODULE'} ANSWERS:\n${JSON.stringify(financingAnswers || moduleAnswers, null, 2)}\n\nBased on these answers, provide a personalized recommendation. Do NOT ask the same questions again.`
        : ''

      // Add JSON format instructions based on detected format type
      userPrompt = `${baseUserPrompt}${memoryContext}${moduleAnswersText}

Return your response as a JSON object. Based on the input, use the appropriate format:

${activeDecisionModule === 'GOOD_DEAL_DECISION' && !(financingAnswers || moduleAnswers) ? `CRITICAL: This is GOOD_DEAL_DECISION - PHASE 1. You MUST output ONLY clarifying questions. Do NOT provide recommendation, bottomLine, bestPath, whatToConfirm, redFlags, or whatWouldChange. Include "phase": "1" in your response.` : ''}
${activeDecisionModule === 'GOOD_DEAL_DECISION' && (financingAnswers || moduleAnswers) ? `CRITICAL: This is GOOD_DEAL_DECISION - PHASE 2. User has provided answers. You MUST provide a full recommendation with bottomLine, bestPath, whatToConfirm, redFlags (if applicable), and whatWouldChange. Do NOT ask clarifying questions again. Include "phase": "2" in your response.` : ''}
${activeDecisionModule && activeDecisionModule !== 'GOOD_DEAL_DECISION' ? `CRITICAL: ActiveModule is ${activeDecisionModule}. You MUST use FORMAT C and structure your response for this specific module. Do NOT infer or change the module.` : ''}
${detectedModule && !(financingAnswers || moduleAnswers) && activeDecisionModule !== 'GOOD_DEAL_DECISION' ? `IMPORTANT: This is a ${detectedModule} decision question. You MUST use FORMAT C and include the REQUIRED clarifying questions section.` : ''}
${(financingAnswers || moduleAnswers) && activeDecisionModule !== 'GOOD_DEAL_DECISION' ? `IMPORTANT: User has provided ${detectedModule || 'module'} answers. Use FORMAT C with personalized recommendation structure. Include scenarioFork and guardrailMath if this is a financing module. Do NOT ask clarifying questions again.` : ''}

FORMAT A (Dealer Message/Situation):
{
  "responseType": "dealer_message",
  "classification": "normal" | "caution" | "red_flag",
  "whatItMeans": "Explanation of dealer intent or standard practice",
  "actions": ["Action 1", "Action 2", "Action 3"]
}

FORMAT B (Fee Explanation):
{
  "responseType": "fee_explanation",
  "whatItIs": "What this fee usually represents",
  "typicalRange": "Typical range or 'Varies'",
  "negotiable": "Yes" | "Sometimes" | "Rarely",
  "whatToClarify": "What to clarify before agreeing"
}

FORMAT C (Decision Help):
${activeDecisionModule === 'GOOD_DEAL_DECISION' && !(financingAnswers || moduleAnswers) ? `
GOOD_DEAL_DECISION - PHASE 1 (clarifying questions only):
{
  "responseType": "decision_help",
  "whatItMeans": "1-2 sentence explanation of what makes a 'good deal'",
  "clarifyingQuestions": [
    "Question about urgency (this_week / 2-4_weeks / 1-3_months / researching)",
    "Question about primaryGoal (lowest_total / lowest_monthly / reliability / resale / build_credit)",
    "Question about ownershipHorizon (1-2_years / 3-5_years / 6+_years)",
    "Question about repairComfort (low / medium / high)",
    "Question about competingOptions (yes / no / not_sure)"
  ],
  "phase": "1"
}

CRITICAL REQUIREMENTS:
- You MUST include EXACTLY these 5 questions: urgency, primaryGoal, ownershipHorizon, repairComfort, competingOptions
- The response is INVALID if any of these 5 questions are missing
- Do NOT include recommendation, bottomLine, bestPath, whatToConfirm, redFlags, or whatWouldChange in Phase 1` : activeDecisionModule === 'GOOD_DEAL_DECISION' && (financingAnswers || moduleAnswers) ? `
GOOD_DEAL_DECISION - PHASE 2 (recommendation after answers):
{
  "responseType": "decision_help",
  "recommendation": "Personalized recommendation paragraph based on their answers",
  "bestPath": ["Path item 1", "Path item 2", "Path item 3"],
  "whatToConfirm": ["Confirm item 1", "Confirm item 2", "Confirm item 3"],
  "redFlags": ["Red flag 1 (if applicable)", "Red flag 2 (if applicable)"],
  "bottomLine": "Bottom line for you - 2-4 sentences max, explicitly anchor to user's chosen inputs (urgency, goal, comfort_with_repairs, planned_ownership, competing_offers), commit to recommendation direction while being non-absolute (ALWAYS REQUIRED)",
  "whatWouldChange": ["Change factor 1", "Change factor 2", "Change factor 3"] - 2-4 bullet points max (ALWAYS REQUIRED),
  "phase": "2"
}

CRITICAL: Do NOT ask clarifying questions again. Provide full recommendation.` : (financingAnswers || moduleAnswers) ? `
When moduleAnswers are provided, return a personalized recommendation:
{
  "responseType": "decision_help",
  "recommendation": "Personalized recommendation paragraph based on their answers",
  "bestPath": ["Path item 1", "Path item 2", "Path item 3"],
  "whatToConfirm": ["Confirm item 1", "Confirm item 2", "Confirm item 3"],
  "redFlags": ["Red flag 1 (if applicable)", "Red flag 2 (if applicable)"],
  "upsell": "If you want scripts for negotiation, unlock relevant pack or use Negotiation Draft Builder.",
  "scenarioFork": "Scenario-specific next step (REQUIRED for financing: 'Get pre-approved' if preApproval is no/not_sure, or 'Ask for incentive details' if dealerIncentives is yes)",
  "guardrailMath": "If financing module with apr and termMonths: compute rough payment and total interest, reference in 1 sentence. Otherwise: recommend providing APR/term or getting pre-approval.",
  "bottomLine": "Bottom line for you - 2-4 sentences max, explicitly anchor to user's chosen inputs (creditScoreRange, debtRange, emergencyFund, goal, preApproval, timeline, etc.), commit to recommendation direction while being non-absolute (ALWAYS REQUIRED)",
  "whatWouldChange": ["Change factor 1 (e.g., 'APR above X%')", "Change factor 2 (e.g., 'dealer adds mandatory add-ons')", "Change factor 3 (e.g., 'monthly payment exceeds comfort range')"] - 2-4 bullet points max (ALWAYS REQUIRED)
}

IMPORTANT:
- For financing module: Include scenarioFork and guardrailMath
- Explicitly reference the user's chosen inputs
- Do NOT ask the same clarifying questions again
- Provide tailored guidance based on their answers` : `
When NO moduleAnswers are provided, ask clarifying questions:
{
  "responseType": "decision_help",
  "whatItMeans": "What this decision means in plain English",
  "pros": ["Pro 1", "Pro 2"],
  "cons": ["Con 1", "Con 2"],
  "factors": ["Factor 1", "Factor 2"],
  "whatToUnderstand": "What to understand before deciding",
  "clarifyingQuestions": [
    "Question 1 (about credit score range, pre-approval, budget, debt, emergency fund, goals, dealer incentives, or timeline)",
    "Question 2",
    "Question 3",
    "Question 4",
    "Question 5 (4-7 questions total)"
  ],
  "provisionalGuidance": "Optional: Short 'if X then Y' guidance based on common scenarios, clearly labeled as provisional",
  "bottomLine": "Bottom line for you - clear, concise summary (ALWAYS REQUIRED)",
  "whatWouldChange": "What would change this recommendation - explain what factors would alter it (ALWAYS REQUIRED)"
}`}

FORMAT D (What am I missing?):
{
  "responseType": "checklist",
  "surprises": ["Surprise 1", "Surprise 2", "Surprise 3"],
  "whyBuyersMiss": "Why buyers miss these",
  "whatToDoubleCheck": "What to double-check before moving forward"
}

Return ONLY the JSON object.`

    } else if (mode === 'what-am-i-missing') {
      // Legacy mode - use dedicated system prompt
      systemPrompt = FIRST_TIME_BUYER_ADVISOR_SYSTEM_PROMPT
      responseType = 'checklist'
      
      const baseUserPrompt = buildFirstTimeBuyerAdvisorUserPrompt('What am I missing?', context || {})
      userPrompt = `${baseUserPrompt}

Use FORMAT D. Return ONLY the JSON object with responseType "checklist".`

    } else if (mode === 'is-this-normal') {
      // Legacy mode - use dedicated system prompt
      if (!dealerMessage) {
        return NextResponse.json({ success: false, error: 'Missing dealerMessage' }, { status: 400 })
      }

      systemPrompt = FIRST_TIME_BUYER_ADVISOR_SYSTEM_PROMPT
      responseType = 'dealer_message'
      
      const baseUserPrompt = buildFirstTimeBuyerAdvisorUserPrompt(dealerMessage, context || {})
      userPrompt = `${baseUserPrompt}

Use FORMAT A. Return ONLY the JSON object with responseType "dealer_message".`

    } else if (mode === 'fee-explanation') {
      // Legacy mode - use dedicated system prompt
      if (!feeLine) {
        return NextResponse.json({ success: false, error: 'Missing feeLine' }, { status: 400 })
      }

      systemPrompt = FIRST_TIME_BUYER_ADVISOR_SYSTEM_PROMPT
      responseType = 'fee_explanation'
      
      const baseUserPrompt = buildFirstTimeBuyerAdvisorUserPrompt(feeLine, context || {})
      userPrompt = `${baseUserPrompt}

Use FORMAT B. Return ONLY the JSON object with responseType "fee_explanation".`
    } else {
      return NextResponse.json({ success: false, error: 'Invalid mode' }, { status: 400 })
    }

    if (!openai) {
      return NextResponse.json(
        { success: false, error: 'OpenAI client not available. OPENAI_API_KEY may be missing.' },
        { status: 500 }
      )
    }

    let completion
    try {
      completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      })
    } catch (openaiError: any) {
      console.error('[first-time-advisor] OpenAI API error:', openaiError)
      return NextResponse.json(
        { 
          success: false, 
          error: `OpenAI API error: ${openaiError.message || 'Unknown error'}` 
        },
        { status: 500 }
      )
    }

    if (!completion.choices || !completion.choices[0] || !completion.choices[0].message) {
      console.error('[first-time-advisor] Invalid OpenAI response:', completion)
      return NextResponse.json(
        { success: false, error: 'Invalid response from OpenAI API' },
        { status: 500 }
      )
    }

    const content = completion.choices[0].message.content
    if (!content) {
      console.error('[first-time-advisor] Empty response from OpenAI')
      return NextResponse.json(
        { success: false, error: 'Empty response from OpenAI API' },
        { status: 500 }
      )
    }

    let aiResponse
    try {
      aiResponse = JSON.parse(content)
    } catch (parseError: any) {
      console.error('[first-time-advisor] JSON parse error:', parseError)
      console.error('[first-time-advisor] Content that failed to parse:', content.substring(0, 500))
      return NextResponse.json(
        { 
          success: false, 
          error: `Failed to parse AI response: ${parseError.message}` 
        },
        { status: 500 }
      )
    }
    
    // Ensure responseType is set for non-conversational modes
    if (mode !== 'conversational' && !aiResponse.responseType) {
      aiResponse.responseType = responseType
    }

    // For GOOD_DEAL_DECISION Phase 1, ensure no recommendation fields are included and validate required questions
    if (activeDecisionModule === 'GOOD_DEAL_DECISION' && !(financingAnswers || moduleAnswers)) {
      // Phase 1: Validate that all 5 mandatory questions are present
      const requiredQuestions = ['urgency', 'primaryGoal', 'ownershipHorizon', 'repairComfort', 'competingOptions']
      const questionsText = JSON.stringify(aiResponse.clarifyingQuestions || []).toLowerCase()
      
      const missingQuestions = requiredQuestions.filter(q => !questionsText.includes(q.toLowerCase()))
      
      if (missingQuestions.length > 0) {
        // If questions are missing, add them explicitly
        aiResponse.clarifyingQuestions = [
          "What's your timeline urgency? (this_week / 2-4_weeks / 1-3_months / researching)",
          "What's your primary goal? (lowest_total / lowest_monthly / reliability / resale / build_credit)",
          "What's your ownership horizon? (1-2_years / 3-5_years / 6+_years)",
          "What's your comfort level with repairs? (low / medium / high)",
          "Do you have competing options? (yes / no / not_sure)"
        ]
      }
      
      // Remove any recommendation fields that shouldn't be there
      delete aiResponse.recommendation
      delete aiResponse.bestPath
      delete aiResponse.whatToConfirm
      delete aiResponse.redFlags
      delete aiResponse.bottomLine
      delete aiResponse.whatWouldChange
      delete aiResponse.provisionalGuidance
      // Ensure phase is set to 1
      aiResponse.phase = '1'
    } else if (activeDecisionModule === 'GOOD_DEAL_DECISION' && (financingAnswers || moduleAnswers)) {
      // Phase 2: Ensure phase is set to 2
      aiResponse.phase = '2'
    }

    // Add guardrail math for financing if applicable
    if (detectedModule === 'financing' && (financingAnswers || moduleAnswers)) {
      const answers = (financingAnswers || moduleAnswers) as FinancingAdvisorAnswers
      const guardrailMath = calculateGuardrailMath(
        answers.apr,
        answers.termMonths,
        context?.vehiclePrice,
        0 // downPayment not in financingAnswers, could be added
      )
      if (guardrailMath && !aiResponse.guardrailMath) {
        aiResponse.guardrailMath = guardrailMath
      }
    }

    // Ensure whatWouldChange is an array if provided as string
    if (aiResponse.whatWouldChange && typeof aiResponse.whatWouldChange === 'string') {
      aiResponse.whatWouldChange = [aiResponse.whatWouldChange]
    }

    return NextResponse.json({
      success: true,
      data: aiResponse,
    })
  } catch (error: any) {
    console.error('[first-time-advisor] Unexpected error:', error)
    console.error('[first-time-advisor] Error stack:', error.stack)
    console.error('[first-time-advisor] Error details:', {
      message: error.message,
      name: error.name,
      code: error.code,
    })
    
    // Provide more helpful error messages
    let errorMessage = error.message || 'Failed to get advisor response'
    
    if (error.message?.includes('OPENAI_API_KEY')) {
      errorMessage = 'OpenAI API key is not configured. Please set OPENAI_API_KEY environment variable.'
    } else if (error.message?.includes('fetch')) {
      errorMessage = 'Network error connecting to OpenAI API. Please try again.'
    } else if (error.message?.includes('rate limit')) {
      errorMessage = 'OpenAI API rate limit exceeded. Please try again in a moment.'
    }
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}

