"use strict";(()=>{var e={};e.id=4790,e.ids=[4790],e.modules={72934:e=>{e.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:e=>{e.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:e=>{e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},92048:e=>{e.exports=require("fs")},32615:e=>{e.exports=require("http")},35240:e=>{e.exports=require("https")},55315:e=>{e.exports=require("path")},68621:e=>{e.exports=require("punycode")},76162:e=>{e.exports=require("stream")},17360:e=>{e.exports=require("url")},21764:e=>{e.exports=require("util")},6162:e=>{e.exports=require("worker_threads")},71568:e=>{e.exports=require("zlib")},87561:e=>{e.exports=require("node:fs")},84492:e=>{e.exports=require("node:stream")},72477:e=>{e.exports=require("node:stream/web")},76717:(e,t,a)=>{a.r(t),a.d(t,{originalPathname:()=>f,patchFetch:()=>y,requestAsyncStorage:()=>h,routeModule:()=>p,serverHooks:()=>g,staticGenerationAsyncStorage:()=>m});var r={};a.r(r),a.d(r,{POST:()=>u});var n=a(49303),o=a(88716),i=a(60670),s=a(87070),c=a(8563),l=a(31832),d=a(19692);async function u(e){try{let t,a;let r=await (0,d.f)(),n=e.headers.get("authorization"),o=null;if(n?.startsWith("Bearer ")){let e=n.replace("Bearer ",""),{data:{user:t},error:a}=await r.auth.getUser(e);!a&&t&&(o=t.id)}if(!o){let{data:{session:e},error:t}=await r.auth.getSession();if(e?.user)o=e.user.id;else{let{data:{user:e},error:a}=await r.auth.getUser();if(a||!e)return console.error("Auth error - sessionError:",t),console.error("Auth error - userError:",a),s.NextResponse.json({success:!1,error:"Unauthorized - Please sign in again",details:t?.message||a?.message},{status:401});o=e.id}}if(!o)return console.error("No userId found after auth check"),s.NextResponse.json({success:!1,error:"Unauthorized"},{status:401});let i=await e.json();if(!i.carContext)return s.NextResponse.json({success:!1,error:"Missing carContext"},{status:400});let u=!!i.wizardAnswers;if(!u&&(!i.tone||!i.goal))return s.NextResponse.json({success:!1,error:"Missing required fields (tone, goal, or wizardAnswers)"},{status:400});let p=(0,c.$)();if(u&&i.wizardAnswers){let e=i.buyerType||"general",r=i.selectedPackId||i.packType,n=r?(0,l.Z)(r):null,o={...i.wizardAnswers,carContext:i.carContext},s=function(e){let t={communicationMethod:"remote",paymentMethod:"unsure",experience:"experienced",stage:"just_starting",helpNeeded:"general_guidance",carContext:"",...{first_time:{displayName:"First-Time Buyer",description:"New to car buying, needs extra guidance",toneAdjustment:"Be patient and educational, explain terms clearly"},cash_buyer:{displayName:"Cash Buyer",description:"Paying with cash, wants to leverage this advantage",toneAdjustment:"Emphasize cash benefits and simplicity"},financing_focused:{displayName:"Financing-Focused",description:"Interested in financing options and terms",toneAdjustment:"Focus on financing details and comparisons"},trade_in_focus:{displayName:"Trade-In Focus",description:"Has a trade-in vehicle to negotiate",toneAdjustment:"Balance trade-in value with purchase price"},in_person_pack:{displayName:"In-Person Negotiator",description:"Prefers face-to-face negotiation",toneAdjustment:"Create short, memorable talking points"}}[e.buyerType||"general"]||{}};return{systemPrompt:function(e){let{answers:t,buyerProfile:a}=e,r=`You are an expert car buying negotiation coach. Your job is to help users write effective negotiation messages or talking points based on their specific situation.

CRITICAL RULES:
1. Write clear, effective messages that get results
2. Be specific - reference the car details provided to show you've done research
3. Be respectful but confident - never aggressive or rude
4. Include a clear call to action
5. Make messages concise but complete
6. Provide educational guidance, not financial or legal advice
7. Never guarantee outcomes - frame suggestions as strategies, not promises
8. If the user has competitive offers from other dealerships, strategically leverage them to create urgency and strengthen negotiating position - but do so naturally and professionally, not aggressively

`;switch(a.toneAdjustment&&(r+=`TONE ADJUSTMENT: ${a.toneAdjustment}

`),"in_person"===t.communicationMethod?r+=`COMMUNICATION STYLE: In-person negotiation
CRITICAL: The user is negotiating FACE-TO-FACE at the dealership. They need SHORT, memorable phrases they can say out loud, NOT written messages.

FORMAT REQUIREMENTS:
- "script" field must contain SHORT talking points (1-2 sentences each, max 3-4 points total)
- Each point should be a phrase the user can remember and say naturally
- Use conversational language, not formal email language
- Format as bullet points or short phrases, NOT paragraphs
- Example format: "I've done some research and found similar cars for $X. What's your best out-the-door price?"

DO NOT create:
- Long paragraphs
- Email-style messages
- Formal written communication
- Anything that sounds like it's meant to be read, not spoken

INSTEAD create:
- Short, punchy phrases
- Natural conversation starters
- Easy-to-remember talking points
- What to say, not what to write
`:r+=`COMMUNICATION STYLE: Remote (email/text)
- Create complete, polished messages ready to send
- 2-4 paragraphs typically
- Professional but personable
- Include follow-up messages for common dealer responses
`,"cash"===t.paymentMethod?r+=`
PAYMENT CONTEXT: Cash buyer
- Emphasize the cash advantage (no financing fees, immediate payment)
- Use cash as leverage for better price
- Mention that cash simplifies the transaction
`:"finance"===t.paymentMethod?r+=`
PAYMENT CONTEXT: Financing
- Include questions about financing terms (APR, term length)
- Ask about dealer financing vs outside financing options
- Request OTD breakdown including financing costs
`:r+=`
PAYMENT CONTEXT: Payment method not yet decided
- Keep options open
- Ask about both cash and financing options
- Compare total costs of each approach
`,"first_time"===t.experienceLevel&&(r+=`
EXPERIENCE LEVEL: First-time buyer
- Provide extra context and education
- Explain common dealer tactics to watch for
- Include reassurance and confidence-building language
- Break down complex terms in simple language
`),t.currentStage){case"just_starting":r+=`
STAGE: Just starting negotiations
- Focus on initial contact and information gathering
- Set expectations and boundaries
- Establish that you're a serious buyer
`;break;case"comparing_offers":r+=`
STAGE: Comparing multiple offers
- Reference that you have other offers
- Ask for best price to compete
- Request written quotes for comparison
`;break;case"sitting_on_offer":r+=`
STAGE: Sitting on an offer, deciding next steps
- Create response to existing offer
- Include counter-offer language if appropriate
- Ask clarifying questions before committing
`;break;case"ready_to_close":r+=`
STAGE: Ready to close the deal
- Final negotiation points
- Request final OTD breakdown
- Confirm all terms before signing
`}switch(t.helpNeeded){case"negotiate_price":r+=`
GOAL: Negotiate a better price
- Reference market research and comparable listings
- Use specific numbers and data
- Create room for negotiation
- Include polite but firm language
`;break;case"ask_otd":r+=`
GOAL: Request out-the-door (OTD) price breakdown
- Ask for itemized breakdown of all fees
- Request tax, doc fees, and any add-ons separately
- Emphasize that you need the total OTD price, not just the listed price
`;break;case"push_back_fees":r+=`
GOAL: Challenge unnecessary fees or add-ons
- Question fees that seem excessive or unnecessary
- Ask what each fee covers
- Request removal or reduction of questionable fees
- Be firm but respectful
`;break;case"trade_in_value":r+=`
GOAL: Negotiate trade-in value
- Request separate valuation for trade-in
- Ask about trade-in vs selling privately
- Negotiate trade-in value independently from purchase price
`;break;case"financing_questions":r+=`
GOAL: Ask about financing terms
- Request APR, term length, and total financing cost
- Ask about dealer financing vs credit union options
- Inquire about any incentives tied to financing
- Ask if rate is contingent on add-ons or warranties
- Provide educational context about financing terms (not financial advice)
`;break;case"general_guidance":r+=`
GOAL: General negotiation guidance
- Provide balanced approach covering multiple negotiation points
- Include tips for effective communication
- Suggest questions to ask
`}return"in_person"===t.communicationMethod&&(r+=`
CONVERSATION FLOW: Since this is in-person, you MUST include a "conversationFlow" section that shows:
- What the user should say (their talking points)
- Potential dealer responses (what the dealer might say back)
- User's options for how to respond to each dealer response
- This creates a back-and-forth conversation guide

Format the conversation flow as a structured dialogue showing multiple paths the conversation might take.
`),r+=`
Your response must be a JSON object with this exact structure:
{
  "script": "<the complete negotiation message or talking points>",
  "followUps": [<array of 2-4 follow-up responses if dealer pushes back>],
  "conversationFlow": ${"in_person"===t.communicationMethod?`{
    "userOpening": "<what user should say first>",
    "scenarios": [
      {
        "dealerResponse": "<what dealer might say>",
        "userOptions": [
          {
            "response": "<what user can say back>",
            "whenToUse": "<when this response is appropriate>"
          }
        ],
        "notes": "<what to watch for in this scenario>"
      }
    ]
  }`:"null"},
  "keyPoints": [<array of 3-5 key points covered>],
  "tips": [<array of 2-4 additional negotiation tips>],
  "educationalHints": [<array of 2-3 hints about dealer tactics, what to watch for, or common pitfalls>]
}`}({answers:e.wizardAnswers,buyerProfile:t}),userPrompt:function(e,t,a,r,n,o){let i="in_person"===e.communicationMethod,s=`Generate a negotiation script based on these details:

Car Context: ${e.carContext}

Communication Method: ${i?"In-person (FACE-TO-FACE at dealership)":"Remote (email/text)"}
Payment Method: ${e.paymentMethod}
Experience Level: ${"first_time"===e.experienceLevel?"First-time buyer":"Experienced buyer"}
Current Stage: ${e.currentStage}
Help Needed: ${e.helpNeeded}
Buyer Profile: ${t.displayName||"General"} - ${t.description||"Standard buyer"}
Pack: ${r||"general"}

`;return o&&o.length>0&&(s+=`Pack Education:
${o.map(e=>`- ${e}`).join("\n")}

`),n&&Object.keys(n).length>0&&(s+=`Pack Answers:
`,Object.entries(n).forEach(([e,t])=>{s+=`- ${e}: ${t}
`}),s+=`
`),a&&a.length>0&&(s+=`
COMPETITIVE LEVERAGE - The user has offers from other dealerships:
`,a.forEach((e,t)=>{s+=`${t+1}. ${e.dealer}: $${e.price.toLocaleString()}`,e.otdPrice&&(s+=` (OTD: $${e.otdPrice.toLocaleString()})`),e.distance&&(s+=` - ${e.distance}`),e.notes&&(s+=` - ${e.notes}`),s+=`
`}),s+=`
CRITICAL: Use these competitive offers strategically in the script. Reference them to show you have alternatives and create urgency. For example:
- "I have a similar car at [Dealer Name] for $[Price]"
- "I'm comparing a few offers, and [Dealer Name] is offering $[Price]"
- "I found a better price nearby at $[Price] - can you match or beat that?"

Make the script leverage this competitive information naturally and confidently, but don't be aggressive or threatening.

`),i?s+=`IMPORTANT: This is an IN-PERSON conversation. Generate SHORT talking points (1-2 sentences each) that the user can say out loud, NOT a written message.

Also create a conversation flow showing:
1. What the user should say to open the negotiation
2. 3-4 common dealer responses (what the dealer might say back)
3. For each dealer response, provide 2-3 options for how the user can respond
4. Notes about what to watch for in each scenario

This creates a practical conversation guide for face-to-face negotiation.

`:s+=`Generate a complete, polished message ready to send via email or text. Make it specific to their situation and car details.

`,n&&Object.keys(n).length>0&&(s+=`
PACK-SPECIFIC ANSWERS:
`,Object.entries(n).forEach(([e,t])=>{s+=`- ${e}: ${t}
`})),s+="Return ONLY valid JSON, no other text."}(e.wizardAnswers,t,e.competitiveOffers,e.packType,e.packAnswers,e.packEducation)}}({wizardAnswers:o,buyerType:e,competitiveOffers:i.competitiveOffers,packType:r,packAnswers:i.packAnswers,packEducation:n?.education});t=s.systemPrompt,a=s.userPrompt}else t=`You are an expert car buying negotiation coach. Your job is to help users write effective negotiation messages to car dealers.

CRITICAL RULES:
1. Write clear, professional messages that get results
2. Adapt your tone to match the user's preference (professional/friendly/firm/casual) while staying effective
3. Be specific - reference the car details provided to show you've done research
4. Be respectful but confident - never aggressive or rude
5. Include a clear call to action based on the user's goal
6. Make the message concise but complete (2-4 paragraphs typically)

Your response must be a JSON object with this exact structure:
{
  "script": "<the complete negotiation message>",
  "keyPoints": [<array of 3-5 key points covered in the script>],
  "tips": [<array of 2-4 additional negotiation tips>]
}`,a=`Write a negotiation message with these specifications:

Tone: ${({professional:"professional and business-like, using formal language",friendly:"warm and personable, building rapport while staying focused",firm:"direct and assertive, showing you mean business without being rude",casual:"conversational and relaxed, but still clear about your goals"})[i.tone]||i.tone}
Goal: ${({negotiate_price:"negotiate a better price on the vehicle",request_info:"request more information about the vehicle (history, condition, etc.)",schedule_test_drive:"schedule a test drive",make_offer:"make a specific offer on the vehicle",counter_offer:"counter an offer the dealer has made"})[i.goal]||i.goal}
Car Context: ${i.carContext}

Generate a complete message that the user can send directly to the dealer. Make it specific to the car details provided and appropriate for the chosen tone and goal.

Return ONLY valid JSON, no other text.`;let h=await p.chat.completions.create({model:"gpt-4o-mini",messages:[{role:"system",content:t},{role:"user",content:a}],response_format:{type:"json_object"},temperature:.8}),m=JSON.parse(h.choices[0].message.content||"{}");if(!m.script)throw Error("Invalid response format from AI");let g=i.dealId;if(!g){let{data:e,error:t}=await r.from("deals").insert({user_id:o,title:"Negotiation Script"}).select().single();t?console.error("Error creating deal (continuing anyway):",t):g=e.id}let f={carContext:i.carContext};u&&i.wizardAnswers?(f.wizardAnswers=i.wizardAnswers,f.buyerType=i.buyerType):(f.tone=i.tone,f.goal=i.goal);let{data:y,error:b}=await r.from("analyses").insert({user_id:o,deal_id:g,analysis_type:"script_generation",raw_input:f,ai_output:m}).select().single();b&&console.error("Error saving analysis (continuing anyway):",b);let v={success:!0,analysisId:y?.id,dealId:g,data:{script:m.script,followUps:m.followUps||[],conversationFlow:m.conversationFlow||null,keyPoints:m.keyPoints||[],tips:m.tips||[],educationalHints:m.educationalHints||[]}};return s.NextResponse.json(v)}catch(e){return console.error("Error generating script:",e),s.NextResponse.json({success:!1,error:e.message||"Failed to generate script"},{status:500})}}let p=new n.AppRouteRouteModule({definition:{kind:o.x.APP_ROUTE,page:"/api/generate-script/route",pathname:"/api/generate-script",filename:"route",bundlePath:"app/api/generate-script/route"},resolvedPagePath:"C:\\dev\\Dealership Copilot\\app\\api\\generate-script\\route.ts",nextConfigOutput:"",userland:r}),{requestAsyncStorage:h,staticGenerationAsyncStorage:m,serverHooks:g}=p,f="/api/generate-script/route";function y(){return(0,i.patchFetch)({serverHooks:g,staticGenerationAsyncStorage:m})}},8563:(e,t,a)=>{a.d(t,{$:()=>o});var r=a(54214);let n=null;function o(){if(!n){let e=process.env.OPENAI_API_KEY;if(!e)throw Error("OPENAI_API_KEY is not set");n=new r.ZP({apiKey:e})}return n}},31832:(e,t,a)=>{a.d(t,{Z:()=>n});let r={first_time:{id:"first_time",name:"First-Time Buyer Pack",description:"Guidance for first-time buyers: financing basics, affordability, clarity.",features:["Budget & credit band questions","APR & term definitions","OTD vs monthly education","First-time friendly scripts"],education:["OTD includes taxes, fees, and registration - focus on OTD, not monthly.","APR is the annualized cost of borrowing - compare against pre-approval if you have one.","Longer terms lower monthly payment but increase total interest paid."],questions:[{id:"budget",label:"Max OTD budget",type:"number",required:!0,placeholder:"e.g., 25000"},{id:"credit_band",label:"Credit range (approx)",type:"select",required:!1,options:[{value:"excellent",label:"Excellent (760+)"},{value:"good",label:"Good (700-759)"},{value:"fair",label:"Fair (640-699)"},{value:"new",label:"Limited/First-time"}]},{id:"down_payment_est",label:"Down payment estimate",type:"number",required:!1,placeholder:"e.g., 4000"},{id:"driving_needs",label:"Primary driving needs",type:"text",required:!1,placeholder:"e.g., commute 40 miles daily"}]},cash:{id:"cash",name:"Cash Buyer Pack",description:"Cash-specific tactics and proof-of-funds handling.",features:["Cash disclosure timing","Proof-of-funds guidance","OTD and fees focus","No monthly payment talk"],education:["Delay disclosing cash until you have negotiated price.","Have proof of funds ready, but share only when it helps close at your price.","Cash can justify lower price: simpler deal, no financing reserve for dealer."],questions:[{id:"proof_of_funds",label:"Do you have proof of funds?",type:"boolean",required:!1},{id:"disclose_cash",label:"When do you want to disclose cash?",type:"select",required:!1,options:[{value:"late",label:"Only after price is agreed"},{value:"mid",label:"After initial counter"},{value:"early",label:"I prefer to disclose early"}]},{id:"open_to_finance",label:"Open to financing if it reduces price?",type:"boolean",required:!1}],comingSoon:!0},financing:{id:"financing",name:"Financing Buyer Pack",description:"Financing coaching: APR, term, pre-approval leverage.",features:["Max monthly & OTD focus","Pre-approval leverage","APR/term questions","Payment anchoring avoidance"],education:["Negotiate OTD first, financing second - do not anchor on monthly payment.","Compare dealer APR against your pre-approval; ask if low APR is contingent on add-ons.","Shorter terms cost more monthly but less interest overall."],questions:[{id:"target_monthly",label:"Target monthly (optional)",type:"number",required:!1,placeholder:"e.g., 400"},{id:"max_otd",label:"Max OTD",type:"number",required:!0,placeholder:"e.g., 25000"},{id:"preferred_term",label:"Preferred term",type:"select",required:!1,options:[{value:"36",label:"36 mo"},{value:"48",label:"48 mo"},{value:"60",label:"60 mo"},{value:"72",label:"72 mo"}]},{id:"pre_approved",label:"Do you have pre-approval?",type:"boolean",required:!1},{id:"pre_approval_rate",label:"Pre-approval APR",type:"number",required:!1,placeholder:"e.g., 5.5"}],comingSoon:!0},in_person:{id:"in_person",name:"In-Person Negotiation Pack",description:"Dealership talk tracks and pressure handling.",features:["Short talk tracks","Manager/pressure tactics","If they say X → say Y","Closing script for OTD"],education:["Practice your talk track - don't rely on recording; use written notes instead.",'If "manager" pressure starts, slow down: ask for written OTD before deciding.',"Have 2-3 calm phrases ready for add-on upsells."],questions:[{id:"comfort_firm",label:"Comfort being firm?",type:"select",required:!1,options:[{value:"low",label:"Prefer soft approach"},{value:"medium",label:"Comfortable pushing back politely"},{value:"high",label:"Very firm when needed"}]},{id:"expected_objections",label:"Objections you expect",type:"textarea",required:!1,placeholder:'e.g., "Price is already low", "Manager approval needed".'},{id:"has_trade_in",label:"Trade-in?",type:"boolean",required:!1}]},bundle:{id:"bundle",name:"Complete Bundle",description:"Get both packs at a discounted price: First-Time Buyer Pack + In-Person Negotiation Pack.",features:["Everything in First-Time Buyer Pack","Everything in In-Person Negotiation Pack","Best value for comprehensive coverage","Unlock both packs with one purchase"],education:["The bundle includes all features from both individual packs.","Perfect if you want complete guidance from first contact through in-person negotiation.","Save money compared to buying packs separately."],questions:[]}};function n(e){return r[e]||r.first_time}},19692:(e,t,a)=>{a.d(t,{$:()=>s,f:()=>c});var r=a(67721),n=a(71615);let o="https://vabikejehdmpfcyqrgrs.supabase.co",i="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhYmlrZWplaGRtcGZjeXFyZ3JzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NzAzNDAsImV4cCI6MjA4MTA0NjM0MH0.X_Z7szu62swGviqYgtI2mxV3F1vX4UBYpuZYV2n7h4Q";if(!o||!i){let e=[];throw o||e.push("NEXT_PUBLIC_SUPABASE_URL"),i||e.push("NEXT_PUBLIC_SUPABASE_ANON_KEY"),Error(`[CRITICAL] Missing required Supabase environment variables: ${e.join(", ")}. These must be set in Vercel environment variables.`)}if(o.includes("placeholder")||i.includes("placeholder"))throw Error("[CRITICAL] Supabase environment variables contain placeholder values. Please set real values in Vercel environment variables.");if(o.length<10||i.length<10)throw Error("[CRITICAL] Supabase environment variables appear to be invalid (too short). Please verify they are set correctly in Vercel.");function s(){let e=(0,n.cookies)();return(0,r.createServerClient)("https://vabikejehdmpfcyqrgrs.supabase.co","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhYmlrZWplaGRtcGZjeXFyZ3JzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NzAzNDAsImV4cCI6MjA4MTA0NjM0MH0.X_Z7szu62swGviqYgtI2mxV3F1vX4UBYpuZYV2n7h4Q",{cookies:{getAll:()=>e.getAll(),setAll(t){try{t.forEach(({name:t,value:a,options:r})=>{e.set(t,a,r)})}catch(e){}}}})}let c=s}};var t=require("../../../webpack-runtime.js");t.C(e);var a=e=>t(t.s=e),r=t.X(0,[8948,5972,7857,9702,4214],()=>a(76717));module.exports=r})();