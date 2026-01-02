"use strict";(()=>{var e={};e.id=1314,e.ids=[1314],e.modules={72934:e=>{e.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:e=>{e.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:e=>{e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},92048:e=>{e.exports=require("fs")},32615:e=>{e.exports=require("http")},35240:e=>{e.exports=require("https")},55315:e=>{e.exports=require("path")},68621:e=>{e.exports=require("punycode")},76162:e=>{e.exports=require("stream")},17360:e=>{e.exports=require("url")},21764:e=>{e.exports=require("util")},6162:e=>{e.exports=require("worker_threads")},71568:e=>{e.exports=require("zlib")},87561:e=>{e.exports=require("node:fs")},84492:e=>{e.exports=require("node:stream")},72477:e=>{e.exports=require("node:stream/web")},18940:(e,t,r)=>{r.r(t),r.d(t,{originalPathname:()=>_,patchFetch:()=>f,requestAsyncStorage:()=>g,routeModule:()=>m,serverHooks:()=>y,staticGenerationAsyncStorage:()=>h});var a={};r.r(a),r.d(a,{POST:()=>u});var i=r(49303),n=r(88716),o=r(60670),s=r(87070),c=r(19692),l=r(8563),p=r(31832),d=r(71769);async function u(e){try{let t=await (0,c.f)(),{data:{session:r}}=await t.auth.getSession();if(!r?.user)return s.NextResponse.json({success:!1,error:"Unauthorized"},{status:401});let a=r.user.id,i=await e.json();if(!i.pack_type)return s.NextResponse.json({success:!1,error:"Missing pack_type"},{status:400});let{data:n,error:o}=await t.from("negotiation_sessions").insert({user_id:a,pack_type:i.pack_type,car_make:i.car_make,car_model:i.car_model,car_year:i.car_year,car_vin:i.car_vin,listing_url:i.listing_url,asking_price:i.asking_price,payment_method:i.payment_method,max_otd_budget:i.max_otd_budget,timeline:i.timeline,has_trade_in:i.has_trade_in,trade_in_details:i.trade_in_details,communication_method:i.communication_method,tone_preference:i.tone_preference,risk_tolerance:i.risk_tolerance,must_have_features:i.must_have_features,max_monthly_payment:i.max_monthly_payment,down_payment:i.down_payment,pre_approved:i.pre_approved,pre_approval_rate:i.pre_approval_rate,status:"active",current_stage:"initial_contact"}).select().single();if(o)return console.error("Error creating session:",o),s.NextResponse.json({success:!1,error:"Failed to create session"},{status:500});let u=(0,p.Z)(i.pack_type),m=(0,l.$)();try{let e={...u,tips:u.features||[]},r=(0,d.t)(i,e),a=await m.chat.completions.create({model:"gpt-4o-mini",messages:[{role:"system",content:r.systemPrompt},{role:"user",content:r.userPrompt}],response_format:{type:"json_object"},temperature:.8}),o=JSON.parse(a.choices[0].message.content||"{}"),{error:s}=await t.from("negotiation_sessions").update({initial_strategy:o.strategy,initial_script:o.script,in_person_talk_track:o.talk_track}).eq("id",n.id);s&&console.error("Error updating session with strategy:",s),await t.from("session_messages").insert({session_id:n.id,role:"copilot",content:`Here's your initial negotiation strategy:

${o.strategy?.summary||"Strategy generated"}

${o.script?`
Your initial message:
${o.script}`:""}`,message_type:"initial",tactic_explanation:o.strategy?.key_points?.join("\n"),recommended_response:o.script,next_questions:o.strategy?.next_steps||[],checklist_items:o.strategy?.checklist||[]})}catch(e){console.error("Error generating strategy:",e)}return s.NextResponse.json({success:!0,sessionId:n.id})}catch(e){return console.error("Error creating copilot session:",e),s.NextResponse.json({success:!1,error:e.message||"Failed to create session"},{status:500})}}let m=new i.AppRouteRouteModule({definition:{kind:n.x.APP_ROUTE,page:"/api/copilot/sessions/route",pathname:"/api/copilot/sessions",filename:"route",bundlePath:"app/api/copilot/sessions/route"},resolvedPagePath:"C:\\dev\\Dealership Copilot\\app\\api\\copilot\\sessions\\route.ts",nextConfigOutput:"",userland:a}),{requestAsyncStorage:g,staticGenerationAsyncStorage:h,serverHooks:y}=m,_="/api/copilot/sessions/route";function f(){return(0,o.patchFetch)({serverHooks:y,staticGenerationAsyncStorage:h})}},8563:(e,t,r)=>{r.d(t,{$:()=>n});var a=r(54214);let i=null;function n(){if(!i){let e=process.env.OPENAI_API_KEY;if(!e)throw Error("OPENAI_API_KEY is not set");i=new a.ZP({apiKey:e})}return i}},31832:(e,t,r)=>{r.d(t,{Z:()=>i});let a={first_time:{id:"first_time",name:"First-Time Buyer Pack",description:"Guidance for first-time buyers: financing basics, affordability, clarity.",features:["Budget & credit band questions","APR & term definitions","OTD vs monthly education","First-time friendly scripts"],education:["OTD includes taxes, fees, and registration - focus on OTD, not monthly.","APR is the annualized cost of borrowing - compare against pre-approval if you have one.","Longer terms lower monthly payment but increase total interest paid."],questions:[{id:"budget",label:"Max OTD budget",type:"number",required:!0,placeholder:"e.g., 25000"},{id:"credit_band",label:"Credit range (approx)",type:"select",required:!1,options:[{value:"excellent",label:"Excellent (760+)"},{value:"good",label:"Good (700-759)"},{value:"fair",label:"Fair (640-699)"},{value:"new",label:"Limited/First-time"}]},{id:"down_payment_est",label:"Down payment estimate",type:"number",required:!1,placeholder:"e.g., 4000"},{id:"driving_needs",label:"Primary driving needs",type:"text",required:!1,placeholder:"e.g., commute 40 miles daily"}]},cash:{id:"cash",name:"Cash Buyer Pack",description:"Cash-specific tactics and proof-of-funds handling.",features:["Cash disclosure timing","Proof-of-funds guidance","OTD and fees focus","No monthly payment talk"],education:["Delay disclosing cash until you have negotiated price.","Have proof of funds ready, but share only when it helps close at your price.","Cash can justify lower price: simpler deal, no financing reserve for dealer."],questions:[{id:"proof_of_funds",label:"Do you have proof of funds?",type:"boolean",required:!1},{id:"disclose_cash",label:"When do you want to disclose cash?",type:"select",required:!1,options:[{value:"late",label:"Only after price is agreed"},{value:"mid",label:"After initial counter"},{value:"early",label:"I prefer to disclose early"}]},{id:"open_to_finance",label:"Open to financing if it reduces price?",type:"boolean",required:!1}],comingSoon:!0},financing:{id:"financing",name:"Financing Buyer Pack",description:"Financing coaching: APR, term, pre-approval leverage.",features:["Max monthly & OTD focus","Pre-approval leverage","APR/term questions","Payment anchoring avoidance"],education:["Negotiate OTD first, financing second - do not anchor on monthly payment.","Compare dealer APR against your pre-approval; ask if low APR is contingent on add-ons.","Shorter terms cost more monthly but less interest overall."],questions:[{id:"target_monthly",label:"Target monthly (optional)",type:"number",required:!1,placeholder:"e.g., 400"},{id:"max_otd",label:"Max OTD",type:"number",required:!0,placeholder:"e.g., 25000"},{id:"preferred_term",label:"Preferred term",type:"select",required:!1,options:[{value:"36",label:"36 mo"},{value:"48",label:"48 mo"},{value:"60",label:"60 mo"},{value:"72",label:"72 mo"}]},{id:"pre_approved",label:"Do you have pre-approval?",type:"boolean",required:!1},{id:"pre_approval_rate",label:"Pre-approval APR",type:"number",required:!1,placeholder:"e.g., 5.5"}],comingSoon:!0},in_person:{id:"in_person",name:"In-Person Negotiation Pack",description:"Dealership talk tracks and pressure handling.",features:["Short talk tracks","Manager/pressure tactics","If they say X → say Y","Closing script for OTD"],education:["Practice your talk track - don't rely on recording; use written notes instead.",'If "manager" pressure starts, slow down: ask for written OTD before deciding.',"Have 2-3 calm phrases ready for add-on upsells."],questions:[{id:"comfort_firm",label:"Comfort being firm?",type:"select",required:!1,options:[{value:"low",label:"Prefer soft approach"},{value:"medium",label:"Comfortable pushing back politely"},{value:"high",label:"Very firm when needed"}]},{id:"expected_objections",label:"Objections you expect",type:"textarea",required:!1,placeholder:'e.g., "Price is already low", "Manager approval needed".'},{id:"has_trade_in",label:"Trade-in?",type:"boolean",required:!1}]},bundle:{id:"bundle",name:"Complete Bundle",description:"Get both packs at a discounted price: First-Time Buyer Pack + In-Person Negotiation Pack.",features:["Everything in First-Time Buyer Pack","Everything in In-Person Negotiation Pack","Best value for comprehensive coverage","Unlock both packs with one purchase"],education:["The bundle includes all features from both individual packs.","Perfect if you want complete guidance from first contact through in-person negotiation.","Save money compared to buying packs separately."],questions:[]}};function i(e){return a[e]||a.first_time}},71769:(e,t,r)=>{function a(e,t){return{systemPrompt:`You are an expert car buying negotiation coach. Your job is to help users negotiate the best possible deal on a car purchase.

CRITICAL RULES:
1. Provide educational guidance, not financial or legal advice
2. Never guarantee outcomes - frame suggestions as strategies
3. Be specific and actionable
4. Consider the user's pack type (${t.name}) and tailor advice accordingly
5. Generate clear, copy-ready messages the user can send
6. For in-person negotiations, provide short talk tracks (1-2 sentences max per point)

Your response must be a JSON object with this exact structure:
{
  "strategy": {
    "summary": "<2-3 sentence overview of the negotiation approach>",
    "key_points": ["<point 1>", "<point 2>", "<point 3>"],
    "next_steps": ["<step 1>", "<step 2>", "<step 3>"],
    "checklist": ["<item 1>", "<item 2>", "<item 3>"]
  },
  "script": "<the complete initial message ready to send>",
  "talk_track": "<if in-person, short talking points separated by newlines>"
}`,userPrompt:`Generate an initial negotiation strategy and script for this situation:

Pack Type: ${t.name}
${t.description}

Car Information:
${e.car_make?`Make: ${e.car_make}`:""}
${e.car_model?`Model: ${e.car_model}`:""}
${e.car_year?`Year: ${e.car_year}`:""}
${e.asking_price?`Asking Price: $${e.asking_price}`:""}
${e.listing_url?`Listing: ${e.listing_url}`:""}

User Preferences:
- Payment Method: ${e.payment_method}
${e.max_otd_budget?`- Max Budget: $${e.max_otd_budget}`:""}
${e.timeline?`- Timeline: ${e.timeline}`:""}
${e.has_trade_in?"- Has Trade-In: Yes":"- Has Trade-In: No"}
${e.communication_method?`- Communication: ${e.communication_method}`:""}
${e.tone_preference?`- Tone: ${e.tone_preference}`:""}
${e.risk_tolerance?`- Risk Tolerance: ${e.risk_tolerance}`:""}

${"finance"===e.payment_method?`
Financing Details:
${e.max_monthly_payment?`- Max Monthly Payment: $${e.max_monthly_payment}`:""}
${e.down_payment?`- Down Payment: $${e.down_payment}`:""}
${e.pre_approved?`- Pre-Approved: Yes${e.pre_approval_rate?` (${e.pre_approval_rate}% APR)`:""}`:"- Pre-Approved: No"}
`:""}

Generate a personalized strategy and initial message. Make it specific to their situation and pack type.

Return ONLY valid JSON, no other text.`}}function i(e,t,r){let a=`You are an expert car buying negotiation coach analyzing dealer messages in real-time.

Your job is to:
1. Explain what tactic the dealer is using (in plain English)
2. Provide a recommended response (copy-ready)
3. Suggest a counter price range if applicable (with rationale)
4. List next questions to ask
5. Provide checklist items for the user

CRITICAL RULES:
- Never guarantee outcomes
- Frame price suggestions as guidance, not recommendations
- Be educational about dealer tactics
- Keep responses concise and actionable
- Consider the full conversation context

Your response must be a JSON object with this exact structure:
{
  "tactic_explanation": "<plain English explanation of what the dealer is doing and why>",
  "recommended_response": "<complete message the user can copy and send>",
  "suggested_counter_range": {
    "min": <number>,
    "max": <number>,
    "rationale": "<why this range makes sense>"
  },
  "next_questions": ["<question 1>", "<question 2>", "<question 3>"],
  "checklist_items": ["<item 1>", "<item 2>", "<item 3>"]
}`,i=t.slice(-5).map(e=>`${e.role}: ${e.content}`).join("\n");return{systemPrompt:a,userPrompt:`Analyze this dealer message and provide guidance:

Session Context:
- Pack: ${e.pack_type}
- Payment: ${e.payment_method}
- Max Budget: ${e.max_otd_budget?`$${e.max_otd_budget}`:"Not specified"}
- Communication: ${e.communication_method}

Recent Conversation:
${i||"This is the first message from the dealer."}

Dealer's Message:
"${r}"

Provide your analysis and recommendations. Be specific and actionable.

Return ONLY valid JSON, no other text.`}}r.d(t,{N:()=>i,t:()=>a})},19692:(e,t,r)=>{r.d(t,{$:()=>s,f:()=>c});var a=r(67721),i=r(71615);let n="https://vabikejehdmpfcyqrgrs.supabase.co",o="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhYmlrZWplaGRtcGZjeXFyZ3JzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NzAzNDAsImV4cCI6MjA4MTA0NjM0MH0.X_Z7szu62swGviqYgtI2mxV3F1vX4UBYpuZYV2n7h4Q";if(!n||!o){let e=[];throw n||e.push("NEXT_PUBLIC_SUPABASE_URL"),o||e.push("NEXT_PUBLIC_SUPABASE_ANON_KEY"),Error(`[CRITICAL] Missing required Supabase environment variables: ${e.join(", ")}. These must be set in Vercel environment variables.`)}if(n.includes("placeholder")||o.includes("placeholder"))throw Error("[CRITICAL] Supabase environment variables contain placeholder values. Please set real values in Vercel environment variables.");if(n.length<10||o.length<10)throw Error("[CRITICAL] Supabase environment variables appear to be invalid (too short). Please verify they are set correctly in Vercel.");function s(){let e=(0,i.cookies)();return(0,a.createServerClient)("https://vabikejehdmpfcyqrgrs.supabase.co","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhYmlrZWplaGRtcGZjeXFyZ3JzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NzAzNDAsImV4cCI6MjA4MTA0NjM0MH0.X_Z7szu62swGviqYgtI2mxV3F1vX4UBYpuZYV2n7h4Q",{cookies:{getAll:()=>e.getAll(),setAll(t){try{t.forEach(({name:t,value:r,options:a})=>{e.set(t,r,a)})}catch(e){}}}})}let c=s}};var t=require("../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),a=t.X(0,[8948,5972,7857,9702,4214],()=>r(18940));module.exports=a})();