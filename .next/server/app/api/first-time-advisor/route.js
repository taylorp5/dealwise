"use strict";(()=>{var e={};e.id=6714,e.ids=[6714],e.modules={72934:e=>{e.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:e=>{e.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:e=>{e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},92048:e=>{e.exports=require("fs")},32615:e=>{e.exports=require("http")},35240:e=>{e.exports=require("https")},55315:e=>{e.exports=require("path")},68621:e=>{e.exports=require("punycode")},76162:e=>{e.exports=require("stream")},17360:e=>{e.exports=require("url")},21764:e=>{e.exports=require("util")},6162:e=>{e.exports=require("worker_threads")},71568:e=>{e.exports=require("zlib")},87561:e=>{e.exports=require("node:fs")},84492:e=>{e.exports=require("node:stream")},72477:e=>{e.exports=require("node:stream/web")},66196:(e,t,s)=>{s.r(t),s.d(t,{originalPathname:()=>y,patchFetch:()=>I,requestAsyncStorage:()=>m,routeModule:()=>h,serverHooks:()=>f,staticGenerationAsyncStorage:()=>g});var o={};s.r(o),s.d(o,{POST:()=>p});var r=s(49303),n=s(88716),i=s(60670),a=s(87070),l=s(19692),c=s(8563);let u=`You are the First-Time Buyer Advisor inside a car-buying app.

Your role:
You help first-time car buyers understand what is happening, what is normal, what is risky, and what they should clarify before moving forward.

You are NOT a negotiation script generator.
You do NOT tell the user exactly what to say word-for-word.
You do NOT attempt to "win" negotiations.

Your goals:
- Reduce confusion and anxiety
- Explain dealer behavior and fees in plain English
- Help users understand financing, taxes, and hidden costs
- Guide users on what to confirm next, not how to argue
- Support users as they return with new dealer responses ("they came back with XYZ")

IMPORTANT EDUCATIONAL CONCEPTS TO REINFORCE (when relevant):
- OTD (Out-the-Door) vs Monthly Payment: When discussing financing or pricing, always emphasize that OTD (total cost including all fees, taxes, and add-ons) is the only number that matters for comparing deals. Monthly payment can be manipulated by extending loan terms, which costs more in total interest. Always negotiate OTD first, then discuss financing separately.
- APR & Loan Term: When discussing financing, explain that APR (Annual Percentage Rate) is the interest rate, and loan term is how long they'll pay. A lower monthly payment from a longer term costs more in total interest. Always compare total cost, not just monthly payment.

Tone:
- Calm, supportive, non-judgmental
- Assume the user is new and unsure
- Never shame or overwhelm
- Avoid jargon unless you explain it

Context:
You may use:
- Vehicle price
- State / city (if known)
- New vs used
- Whether OTD is confirmed
- Prior advisor messages in this listing flow

You may NOT:
- Generate negotiation scripts
- Recommend deceptive tactics
- Replace financing-specific or in-person negotiation packs

Response rules:
Always respond using ONE of the structured formats below.
Never free-chat.
Never exceed what is needed.

CRITICAL: If an ActiveModule is specified in the context (e.g., "ActiveModule: FINANCING_DECISION"), you MUST use FORMAT C and structure your response for that specific module. Do NOT infer, guess, or change the module. Use ONLY the designated ActiveModule.

--------------------------------
FORMAT A: Dealer Message / Situation
--------------------------------
Use when the user pastes a dealer response or describes what happened.

1) Is this normal?
   - Yes / Caution / Red Flag (choose one)

2) What it usually means
   - Explain dealer intent or standard practice in plain language

3) What to clarify or think about next
   - 1–3 actions (high-level, not scripts)

--------------------------------
FORMAT B: Fee Explanation
--------------------------------
Use when the user asks about a fee or charge.

1) What this fee usually represents
2) Typical range (if applicable)
3) Is it negotiable? (Yes / Sometimes / Rarely)
4) What to clarify before agreeing

--------------------------------
FORMAT C: Decision Help (e.g., Financing)
--------------------------------
Use when the user asks "Should I finance?" or similar.

SPECIAL CASE: GOOD_DEAL_DECISION Module (Two-Phase Required)

For GOOD_DEAL_DECISION, you MUST respond in TWO PHASES:

PHASE 1: Clarifying Questions (when no moduleAnswers provided)
- Output ONLY:
  - A brief explanation (1–2 sentences max) of what makes a "good deal"
  - Clarifying Questions section with EXACTLY these 5 mandatory questions (MUST be rendered as chip inputs):
    * urgency (this_week / 2-4_weeks / 1-3_months / researching)
    * primaryGoal (lowest_total / lowest_monthly / reliability / resale / build_credit)
    * ownershipHorizon (1-2_years / 3-5_years / 6+_years)
    * repairComfort (low / medium / high)
    * competingOptions (yes / no / not_sure)
- CRITICAL: The response is INVALID if these 5 questions are not present. All 5 must be included.
- Do NOT provide:
  * Recommendation
  * Bottom Line
  * Best Path
  * What to Confirm
  * Red Flags
  * What Would Change This Recommendation
- Response structure:
  {
    "responseType": "decision_help",
    "whatItMeans": "1-2 sentence explanation of what makes a good deal",
    "clarifyingQuestions": [
      "Question about urgency (this_week / 2-4_weeks / 1-3_months / researching)",
      "Question about primaryGoal (lowest_total / lowest_monthly / reliability / resale / build_credit)",
      "Question about ownershipHorizon (1-2_years / 3-5_years / 6+_years)",
      "Question about repairComfort (low / medium / high)",
      "Question about competingOptions (yes / no / not_sure)"
    ],
    "phase": "1"
  }

PHASE 2: Recommendation (when moduleAnswers are provided)
- Only allowed AFTER clarifying questions are answered
- May include:
  * recommendation (personalized paragraph)
  * bestPath (3 bullets)
  * whatToConfirm (3 bullets)
  * redFlags (if applicable)
  * bottomLine (2-4 sentences, required)
  * whatWouldChange (2-4 bullet points, required)
- Response structure:
  {
    "responseType": "decision_help",
    "recommendation": "Personalized recommendation",
    "bestPath": ["Path 1", "Path 2", "Path 3"],
    "whatToConfirm": ["Confirm 1", "Confirm 2", "Confirm 3"],
    "redFlags": ["Flag 1", "Flag 2"],
    "bottomLine": "Bottom line for you",
    "whatWouldChange": ["Change 1", "Change 2", "Change 3"],
    "phase": "2"
  }

1) What this decision means (plain English)
2) Pros & cons for first-time buyers
3) Factors that matter in THIS situation
4) What to understand before deciding
5) Clarifying Questions (REQUIRED)
   - Ask 4–7 targeted questions to personalize advice
   - Use ranges, not sensitive specifics
   - Questions should cover:
     * credit score range
     * pre-approval status / APR
     * monthly budget / max monthly
     * existing debt burden (range)
     * emergency fund preference (range)
     * goals (lowest monthly vs lowest total vs build credit)
     * dealer incentives for financing (yes/no/not sure)
     * timeline/urgency (this week vs flexible)
6) Provisional guidance (optional but helpful)
   - Provide a short "if X then Y" guidance based on common scenarios
   - Clearly label as provisional until user answers the questions
7) Scenario fork (REQUIRED for financing decisions)
   - If preApproval == "no" or "not_sure": include "Next Step: Get pre-approved (credit union/bank) so you can compare dealer offers."
   - If dealerIncentives == "yes": include "Ask for the incentive details and compare total cost against pre-approval."
8) Guardrail math (REQUIRED for financing if apr and termMonths provided)
   - Compute rough payment estimate and total interest estimate (basic amortization)
   - Reference it in 1 sentence
   - If not provided, recommend user provides APR/term or gets pre-approval
9) Bottom line for you (ALWAYS REQUIRED)
   - 2-4 sentences max
   - Must explicitly anchor to user's chosen inputs (creditScoreRange, debtRange, emergencyFund, goal, preApproval, timeline, etc.)
   - Should commit to a recommendation direction ("Financing makes sense IF...", "I'd lean cash IF...", etc.), while still being non-absolute
10) What would change this recommendation (ALWAYS REQUIRED)
   - 2-4 bullet points max
   - Examples: "APR above X%", "dealer adds mandatory add-ons", "monthly payment exceeds comfort range", "emergency fund drops below target"

--------------------------------
FORMAT D: "What am I missing?"
--------------------------------
Use when the user is unsure or anxious.

1) Common first-time buyer surprises for this situation
2) Why buyers miss these
3) What to double-check before moving forward

--------------------------------

If the user asks for scripts or negotiation tactics:
- Explain the concept at a high level
- Gently redirect them to the Negotiation Copilot or relevant pack`;function d(e,t,s){let o=`LISTING CONTEXT:
- State: ${t.state||"Not specified"}
- Vehicle Price: $${t.vehiclePrice?.toLocaleString()||"Not specified"}
- Estimated Fair Price: $${t.estimatedFairPrice?.toLocaleString()||"Not specified"}
- Vehicle Type: ${t.vehicleType||"Not specified"}
- OTD Confirmed: ${t.hasOTD?"Yes":"No"}${s?`
- ActiveModule: ${s}`:""}`;return`${o}

USER QUESTION/INPUT:
"${e}"

${s?`IMPORTANT: The ActiveModule is ${s}. You MUST use the format and structure for this specific module. Do NOT infer or change the module.`:"Analyze the user's input and respond using the appropriate structured format (A, B, C, or D)."}
Remember:
- Do NOT generate negotiation scripts
- Do NOT give word-for-word messages
- Focus on explaining what dealers don't proactively explain
- Be reassuring and educational for first-time buyers
- Use the exact format structure specified in your instructions`}async function p(e){try{var t;let o,r,n,i;let p=e.headers.get("authorization"),h=await (0,l.f)(),m=null;if(p?.startsWith("Bearer ")){let e=p.replace("Bearer ",""),{data:{user:t},error:o}=await h.auth.getUser(e);if(o||!t)return a.NextResponse.json({success:!1,error:"Invalid token"},{status:401});m=t.id;let{createClient:r}=await Promise.resolve().then(s.bind(s,37857)),n="https://vabikejehdmpfcyqrgrs.supabase.co",i=process.env.SUPABASE_SERVICE_ROLE_KEY;i?h=r(n,i,{auth:{persistSession:!1,autoRefreshToken:!1}}):(h=r(n,"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhYmlrZWplaGRtcGZjeXFyZ3JzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NzAzNDAsImV4cCI6MjA4MTA0NjM0MH0.X_Z7szu62swGviqYgtI2mxV3F1vX4UBYpuZYV2n7h4Q",{global:{headers:{Authorization:`Bearer ${e}`}},auth:{persistSession:!1}}),console.warn("SUPABASE_SERVICE_ROLE_KEY not set - RLS may block this operation. Set it in .env.local for server-side operations."))}else{let{data:{session:e}}=await h.auth.getSession();e?.user&&(m=e.user.id)}if(!m)return a.NextResponse.json({success:!1,error:"Unauthorized"},{status:401});try{o=await e.json()}catch(e){return console.error("[first-time-advisor] Request body parse error:",e),a.NextResponse.json({success:!1,error:"Invalid request body"},{status:400})}let{mode:g,context:f,dealerMessage:y,feeLine:I,userInput:A,financingAnswers:w,moduleType:O,moduleAnswers:E,savedMemory:v}=o;try{r=(0,c.$)()}catch(e){return console.error("[first-time-advisor] OpenAI client initialization error:",e),a.NextResponse.json({success:!1,error:`OpenAI client error: ${e.message||"Failed to initialize OpenAI client"}`},{status:500})}let b="",C="",_="general",N=null;A&&(N=function(e){if(!e||"string"!=typeof e)return null;let t=e.toLowerCase().trim();return/(should i|finance|financing|loan|credit|apr|monthly payment|interest rate|financing|borrow|car loan)/i.test(t)?"FINANCING_DECISION":/(good deal|fair price|worth it|good value|fair value|overpriced|underpriced|reasonable price|good price|fair deal)/i.test(t)?"GOOD_DEAL_DECISION":/(new|used|new vs used|new or used|new versus used|should i buy new|should i buy used|new car|used car)/i.test(t)?"NEW_VS_USED_DECISION":/(payment safe|afford|monthly payment safe|can i afford|affordable|payment too high|budget|monthly budget)/i.test(t)?"PAYMENT_SAFETY_DECISION":/(come in|go in|visit|dealer wants|should i go|should i visit|should i come|dealer asking|dealer invited)/i.test(t)?"GO_IN_DECISION":/(fees|walk|walk away|added fees|should i walk|too many fees|hidden fees|extra fees|mandatory fees)/i.test(t)?"FEES_WALK_DECISION":/(down payment|down|put down|more down|down payment amount|how much down|down payment size)/i.test(t)?"DOWN_PAYMENT_DECISION":null}(A));let R=O||N&&(t=N)&&({FINANCING_DECISION:"financing",GOOD_DEAL_DECISION:"good_deal",NEW_VS_USED_DECISION:"new_vs_used",PAYMENT_SAFETY_DECISION:"payment_safe",GO_IN_DECISION:"go_in",FEES_WALK_DECISION:"fees_walk",DOWN_PAYMENT_DECISION:"down_payment"})[t]||null;if("conversational"===g){if(!A)return a.NextResponse.json({success:!1,error:"Missing userInput"},{status:400});b=u;let e=d(A,f||{},N||void 0),t=v?`

PREVIOUS ANSWERS (for context, do not re-ask):
${JSON.stringify(v,null,2)}`:"",s=w||E?`

USER'S ${R?.toUpperCase()||"MODULE"} ANSWERS:
${JSON.stringify(w||E,null,2)}

Based on these answers, provide a personalized recommendation. Do NOT ask the same questions again.`:"";C=`${e}${t}${s}

Return your response as a JSON object. Based on the input, use the appropriate format:

${"GOOD_DEAL_DECISION"!==N||w||E?"":'CRITICAL: This is GOOD_DEAL_DECISION - PHASE 1. You MUST output ONLY clarifying questions. Do NOT provide recommendation, bottomLine, bestPath, whatToConfirm, redFlags, or whatWouldChange. Include "phase": "1" in your response.'}
${"GOOD_DEAL_DECISION"===N&&(w||E)?'CRITICAL: This is GOOD_DEAL_DECISION - PHASE 2. User has provided answers. You MUST provide a full recommendation with bottomLine, bestPath, whatToConfirm, redFlags (if applicable), and whatWouldChange. Do NOT ask clarifying questions again. Include "phase": "2" in your response.':""}
${N&&"GOOD_DEAL_DECISION"!==N?`CRITICAL: ActiveModule is ${N}. You MUST use FORMAT C and structure your response for this specific module. Do NOT infer or change the module.`:""}
${R&&!(w||E)&&"GOOD_DEAL_DECISION"!==N?`IMPORTANT: This is a ${R} decision question. You MUST use FORMAT C and include the REQUIRED clarifying questions section.`:""}
${(w||E)&&"GOOD_DEAL_DECISION"!==N?`IMPORTANT: User has provided ${R||"module"} answers. Use FORMAT C with personalized recommendation structure. Include scenarioFork and guardrailMath if this is a financing module. Do NOT ask clarifying questions again.`:""}

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
${"GOOD_DEAL_DECISION"!==N||w||E?"GOOD_DEAL_DECISION"===N&&(w||E)?`
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

CRITICAL: Do NOT ask clarifying questions again. Provide full recommendation.`:w||E?`
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
- Provide tailored guidance based on their answers`:`
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
}`:`
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
- Do NOT include recommendation, bottomLine, bestPath, whatToConfirm, redFlags, or whatWouldChange in Phase 1`}

FORMAT D (What am I missing?):
{
  "responseType": "checklist",
  "surprises": ["Surprise 1", "Surprise 2", "Surprise 3"],
  "whyBuyersMiss": "Why buyers miss these",
  "whatToDoubleCheck": "What to double-check before moving forward"
}

Return ONLY the JSON object.`}else if("what-am-i-missing"===g){b=u,_="checklist";let e=d("What am I missing?",f||{});C=`${e}

Use FORMAT D. Return ONLY the JSON object with responseType "checklist".`}else if("is-this-normal"===g){if(!y)return a.NextResponse.json({success:!1,error:"Missing dealerMessage"},{status:400});b=u,_="dealer_message";let e=d(y,f||{});C=`${e}

Use FORMAT A. Return ONLY the JSON object with responseType "dealer_message".`}else{if("fee-explanation"!==g)return a.NextResponse.json({success:!1,error:"Invalid mode"},{status:400});if(!I)return a.NextResponse.json({success:!1,error:"Missing feeLine"},{status:400});b=u,_="fee_explanation";let e=d(I,f||{});C=`${e}

Use FORMAT B. Return ONLY the JSON object with responseType "fee_explanation".`}if(!r)return a.NextResponse.json({success:!1,error:"OpenAI client not available. OPENAI_API_KEY may be missing."},{status:500});try{n=await r.chat.completions.create({model:"gpt-4o-mini",messages:[{role:"system",content:b},{role:"user",content:C}],response_format:{type:"json_object"},temperature:.7})}catch(e){return console.error("[first-time-advisor] OpenAI API error:",e),a.NextResponse.json({success:!1,error:`OpenAI API error: ${e.message||"Unknown error"}`},{status:500})}if(!n.choices||!n.choices[0]||!n.choices[0].message)return console.error("[first-time-advisor] Invalid OpenAI response:",n),a.NextResponse.json({success:!1,error:"Invalid response from OpenAI API"},{status:500});let S=n.choices[0].message.content;if(!S)return console.error("[first-time-advisor] Empty response from OpenAI"),a.NextResponse.json({success:!1,error:"Empty response from OpenAI API"},{status:500});try{i=JSON.parse(S)}catch(e){return console.error("[first-time-advisor] JSON parse error:",e),console.error("[first-time-advisor] Content that failed to parse:",S.substring(0,500)),a.NextResponse.json({success:!1,error:`Failed to parse AI response: ${e.message}`},{status:500})}if("conversational"===g||i.responseType||(i.responseType=_),"GOOD_DEAL_DECISION"!==N||w||E)"GOOD_DEAL_DECISION"===N&&(w||E)&&(i.phase="2");else{let e=JSON.stringify(i.clarifyingQuestions||[]).toLowerCase();["urgency","primaryGoal","ownershipHorizon","repairComfort","competingOptions"].filter(t=>!e.includes(t.toLowerCase())).length>0&&(i.clarifyingQuestions=["What's your timeline urgency? (this_week / 2-4_weeks / 1-3_months / researching)","What's your primary goal? (lowest_total / lowest_monthly / reliability / resale / build_credit)","What's your ownership horizon? (1-2_years / 3-5_years / 6+_years)","What's your comfort level with repairs? (low / medium / high)","Do you have competing options? (yes / no / not_sure)"]),delete i.recommendation,delete i.bestPath,delete i.whatToConfirm,delete i.redFlags,delete i.bottomLine,delete i.whatWouldChange,delete i.provisionalGuidance,i.phase="1"}if("financing"===R&&(w||E)){let e=w||E,t=function(e,t,s,o){if(!e||!t||!s)return null;let r=s-0,n=e/100/12,i=n*Math.pow(1+n,t)*r/(Math.pow(1+n,t)-1);return`Based on ${e}% APR over ${t} months, your estimated monthly payment would be around $${Math.round(i)}, with approximately $${Math.round(i*t-r)} in total interest over the loan term.`}(e.apr,e.termMonths,f?.vehiclePrice,0);t&&!i.guardrailMath&&(i.guardrailMath=t)}return i.whatWouldChange&&"string"==typeof i.whatWouldChange&&(i.whatWouldChange=[i.whatWouldChange]),a.NextResponse.json({success:!0,data:i})}catch(t){console.error("[first-time-advisor] Unexpected error:",t),console.error("[first-time-advisor] Error stack:",t.stack),console.error("[first-time-advisor] Error details:",{message:t.message,name:t.name,code:t.code});let e=t.message||"Failed to get advisor response";return t.message?.includes("OPENAI_API_KEY")?e="OpenAI API key is not configured. Please set OPENAI_API_KEY environment variable.":t.message?.includes("fetch")?e="Network error connecting to OpenAI API. Please try again.":t.message?.includes("rate limit")&&(e="OpenAI API rate limit exceeded. Please try again in a moment."),a.NextResponse.json({success:!1,error:e},{status:500})}}let h=new r.AppRouteRouteModule({definition:{kind:n.x.APP_ROUTE,page:"/api/first-time-advisor/route",pathname:"/api/first-time-advisor",filename:"route",bundlePath:"app/api/first-time-advisor/route"},resolvedPagePath:"C:\\dev\\Dealership Copilot\\app\\api\\first-time-advisor\\route.ts",nextConfigOutput:"",userland:o}),{requestAsyncStorage:m,staticGenerationAsyncStorage:g,serverHooks:f}=h,y="/api/first-time-advisor/route";function I(){return(0,i.patchFetch)({serverHooks:f,staticGenerationAsyncStorage:g})}},8563:(e,t,s)=>{s.d(t,{$:()=>n});var o=s(54214);let r=null;function n(){if(!r){let e=process.env.OPENAI_API_KEY;if(!e)throw Error("OPENAI_API_KEY is not set");r=new o.ZP({apiKey:e})}return r}},19692:(e,t,s)=>{s.d(t,{$:()=>a,f:()=>l});var o=s(67721),r=s(71615);let n="https://vabikejehdmpfcyqrgrs.supabase.co",i="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhYmlrZWplaGRtcGZjeXFyZ3JzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NzAzNDAsImV4cCI6MjA4MTA0NjM0MH0.X_Z7szu62swGviqYgtI2mxV3F1vX4UBYpuZYV2n7h4Q";if(!n||!i){let e=[];throw n||e.push("NEXT_PUBLIC_SUPABASE_URL"),i||e.push("NEXT_PUBLIC_SUPABASE_ANON_KEY"),Error(`[CRITICAL] Missing required Supabase environment variables: ${e.join(", ")}. These must be set in Vercel environment variables.`)}if(n.includes("placeholder")||i.includes("placeholder"))throw Error("[CRITICAL] Supabase environment variables contain placeholder values. Please set real values in Vercel environment variables.");if(n.length<10||i.length<10)throw Error("[CRITICAL] Supabase environment variables appear to be invalid (too short). Please verify they are set correctly in Vercel.");function a(){let e=(0,r.cookies)();return(0,o.createServerClient)("https://vabikejehdmpfcyqrgrs.supabase.co","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhYmlrZWplaGRtcGZjeXFyZ3JzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NzAzNDAsImV4cCI6MjA4MTA0NjM0MH0.X_Z7szu62swGviqYgtI2mxV3F1vX4UBYpuZYV2n7h4Q",{cookies:{getAll:()=>e.getAll(),setAll(t){try{t.forEach(({name:t,value:s,options:o})=>{e.set(t,s,o)})}catch(e){}}}})}let l=a}};var t=require("../../../webpack-runtime.js");t.C(e);var s=e=>t(t.s=e),o=t.X(0,[8948,5972,7857,9702,4214],()=>s(66196));module.exports=o})();