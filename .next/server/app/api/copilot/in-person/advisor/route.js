"use strict";(()=>{var e={};e.id=5032,e.ids=[5032],e.modules={72934:e=>{e.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:e=>{e.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:e=>{e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},92048:e=>{e.exports=require("fs")},32615:e=>{e.exports=require("http")},35240:e=>{e.exports=require("https")},55315:e=>{e.exports=require("path")},68621:e=>{e.exports=require("punycode")},76162:e=>{e.exports=require("stream")},17360:e=>{e.exports=require("url")},21764:e=>{e.exports=require("util")},6162:e=>{e.exports=require("worker_threads")},71568:e=>{e.exports=require("zlib")},87561:e=>{e.exports=require("node:fs")},84492:e=>{e.exports=require("node:stream")},72477:e=>{e.exports=require("node:stream/web")},14388:(e,t,o)=>{o.r(t),o.d(t,{originalPathname:()=>m,patchFetch:()=>T,requestAsyncStorage:()=>p,routeModule:()=>h,serverHooks:()=>g,staticGenerationAsyncStorage:()=>y});var r={};o.r(r),o.d(r,{POST:()=>d});var s=o(49303),n=o(88716),a=o(60670),i=o(87070),l=o(19692),c=o(54214);let u=process.env.OPENAI_API_KEY?new c.ZP({apiKey:process.env.OPENAI_API_KEY}):null;async function d(e){try{var t;let o=await (0,l.f)(),{data:{session:r}}=await o.auth.getSession();if(!r)return i.NextResponse.json({success:!1,error:"Unauthorized"},{status:401});let s=await e.json();if(!s.userInput||!s.userInput.trim())return i.NextResponse.json({success:!1,error:"User input is required"},{status:400});if(!u){let e=s.context.targetOTD||0,t={whatsReallyHappening:e>0?`The dealer is using negotiation tactics. Your target is $${e.toLocaleString()}.`:"The dealer is using standard negotiation tactics.",whyThisMatters:"If you respond incorrectly, you lose leverage on total price.",yourBestMove:"Do not counter yet. Force written OTD before any further discussion.",exactlyWhatToSay:e>0?`I'm only moving forward based on the total out-the-door price. My target is $${e.toLocaleString()}. Please send the written OTD breakdown.`:"I need the full out-the-door price in writing. What is it?",confidenceSignal:"This is standard, reasonable, and signals you are a serious buyer."};return i.NextResponse.json({success:!0,data:t})}let n=function(e){let t=e.targetOTD||0,o=e.walkAwayOTD||(t>0?t+1e3:0),r=e.vehiclePrice||0,s=e.dealerOTD||null,n=s&&t>0?s-t:null,a=t>0?`BUYER'S NEGOTIATION NUMBERS (TRUST THESE - THEY ARE TRUTH):
- Target OTD: $${t.toLocaleString()}
- Walk-Away Ceiling: $${o.toLocaleString()}
${s?`- Dealer Current OTD: $${s.toLocaleString()}`:""}
${null!==n?`- Gap: $${Math.abs(n).toLocaleString()} (${n>0?"dealer is above":"dealer is below"} your target)`:""}
${r>0?`- Vehicle Price: $${r.toLocaleString()}`:""}
${e.state?`- State: ${e.state}`:""}

Treat these values as truth. Do not contradict or soften them. Reference them explicitly when relevant.`:"Buyer has not set specific numbers yet. Still provide decisive guidance based on the situation described.";return`ROLE

You are a professional car-buying negotiation strategist.

You advise users between dealership interactions, after they have stepped away from the salesperson.
You do not simulate conversation.
You do not ask open-ended questions unless absolutely required.

Your job is to:
- Diagnose the dealer's tactic
- Protect the buyer's leverage
- Tell the buyer exactly what to do next
- Provide one clear script to use

You sound calm, confident, and decisive — never chatty.

${a}

🚫 ABSOLUTE RULES (NON-NEGOTIABLE)

You must never:
- Ask "Would you like to…"
- Say "You could consider…"
- Provide multiple options
- Explain basic concepts unless they directly affect the next move
- Sound like a chatbot or assistant

You must always:
- Make one recommendation
- Reference the buyer's actual numbers
- Speak with authority
- Reduce anxiety, not add to it

If information is missing, say exactly what is needed — nothing more.

🧠 HOW YOU THINK (INTERNAL)

Before responding, silently determine:
- What tactic the dealer is using
- Whether the buyer currently has leverage
- Whether the buyer should: Hold / Push / Counter / Walk
- What mistake the buyer is most likely to make next

Then respond.

🧾 REQUIRED RESPONSE FORMAT (STRICT)

Every response MUST follow this exact structure as a JSON object with these 5 keys:

{
  "whatsReallyHappening": "🔍 Situation Diagnosis - Explain what the dealer is actually doing, in one or two sentences. Example: 'The dealer is deflecting from OTD by redirecting to monthly payments, which hides total cost and weakens your position.'",
  "whyThisMatters": "⚠️ Why This Matters - Explain the risk if the buyer responds incorrectly. Example: 'If you discuss payments now, you lose control of the total price and make it harder to reduce OTD later.'",
  "yourBestMove": "✅ Correct Move - Give one clear instruction. No alternatives. Example: 'Do not counter. Force a written OTD breakdown before continuing.'",
  "exactlyWhatToSay": "🗣️ Say This (Exact Script) - Provide one message, written confidently and naturally. This must be copy-paste ready. Example: 'I'm only moving forward based on the total out-the-door price. Please send the written OTD breakdown so we can continue.'",
  "confidenceSignal": "🧠 Confidence Check - Reassure the user that this move is correct and reasonable. Example: 'This is standard, professional, and signals that you are a serious buyer — not a difficult one.'"
}

🛑 WHEN TO REFUSE TO ANSWER

If the dealer's response is too vague to diagnose, respond with:
"I need the dealer's exact response or number to give you the correct next move."

Do not add anything else.

🎯 TONE GUIDELINES

Your tone should feel:
- Calm
- Experienced
- Unemotional
- Decisive

You are not cheering, educating, or negotiating for them — you are guiding them through pressure.

🧩 DIFFERENTIATION FROM CHATGPT (IMPORTANT)

Your advice must:
- Reference the buyer's exact numbers${t>0?` (Target: $${t.toLocaleString()}, Walk-away: $${o.toLocaleString()})`:""}
- Identify dealership-specific tactics
- Make a decision for the user
- Remove ambiguity

This should feel like:
"Someone who has done this 1,000 times is standing next to me."

Not:
"An assistant helping me think."

✅ SUCCESS CRITERIA

Your response is successful if:
- The user knows exactly what to say next
- The user feels calmer, not more overwhelmed
- The output could be printed and followed step-by-step
- The user would not think "I could've just asked ChatGPT"`}(s.context),a=(t=s.userInput.trim(),`What just happened: "${t}"

Diagnose the dealer's tactic, determine the correct move, and provide the exact 5-section response format.`),c=await u.chat.completions.create({model:"gpt-4o-mini",messages:[{role:"system",content:n+"\n\nCRITICAL: Respond ONLY with a JSON object containing exactly these 5 keys: whatsReallyHappening, whyThisMatters, yourBestMove, exactlyWhatToSay, confidenceSignal. No other text, no explanations, no markdown. Pure JSON only."},{role:"user",content:a}],temperature:.7,max_tokens:800,response_format:{type:"json_object"}}),d=c.choices[0]?.message?.content||"",h={};try{h=JSON.parse(d)}catch(t){let e=d.match(/\{[\s\S]*\}/);if(e)try{h=JSON.parse(e[0])}catch(e){}}let p=h.whatsReallyHappening||h["1"]||"The dealer is using negotiation tactics.",y=h.whyThisMatters||h["2"]||"Responding incorrectly could weaken your position.",g=h.yourBestMove||h["3"]||"Hold firm on your OTD request.",m=h.exactlyWhatToSay||h["4"]||"I need the full out-the-door price in writing.",T=h.confidenceSignal||h["5"]||"You're doing this right.";if(!p||!y||!g||!m||!T){let e=s.context.targetOTD||0,t={whatsReallyHappening:e>0?`The dealer is using negotiation tactics. Your target is $${e.toLocaleString()}.`:"The dealer is using standard negotiation tactics.",whyThisMatters:"If you respond incorrectly, you lose leverage on total price.",yourBestMove:"Do not counter yet. Force written OTD before any further discussion.",exactlyWhatToSay:e>0?`I'm only moving forward based on the total out-the-door price. My target is $${e.toLocaleString()}. Please send the written OTD breakdown.`:"I need the full out-the-door price in writing. What is it?",confidenceSignal:"This is standard, reasonable, and signals you are a serious buyer."};return i.NextResponse.json({success:!0,data:t})}return i.NextResponse.json({success:!0,data:{whatsReallyHappening:p||"The dealer is using negotiation tactics.",whyThisMatters:y||"Responding incorrectly could weaken your position.",yourBestMove:g||"Hold firm on your OTD request.",exactlyWhatToSay:m||"I need the full out-the-door price in writing.",confidenceSignal:T||"You're doing this right."}})}catch(e){return console.error("[Advisor API] Error:",e),i.NextResponse.json({success:!1,error:e.message||"Failed to get advice"},{status:500})}}let h=new s.AppRouteRouteModule({definition:{kind:n.x.APP_ROUTE,page:"/api/copilot/in-person/advisor/route",pathname:"/api/copilot/in-person/advisor",filename:"route",bundlePath:"app/api/copilot/in-person/advisor/route"},resolvedPagePath:"C:\\dev\\Dealership Copilot\\app\\api\\copilot\\in-person\\advisor\\route.ts",nextConfigOutput:"",userland:r}),{requestAsyncStorage:p,staticGenerationAsyncStorage:y,serverHooks:g}=h,m="/api/copilot/in-person/advisor/route";function T(){return(0,a.patchFetch)({serverHooks:g,staticGenerationAsyncStorage:y})}},19692:(e,t,o)=>{o.d(t,{$:()=>i,f:()=>l});var r=o(67721),s=o(71615);let n="https://vabikejehdmpfcyqrgrs.supabase.co",a="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhYmlrZWplaGRtcGZjeXFyZ3JzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NzAzNDAsImV4cCI6MjA4MTA0NjM0MH0.X_Z7szu62swGviqYgtI2mxV3F1vX4UBYpuZYV2n7h4Q";if(!n||!a){let e=[];throw n||e.push("NEXT_PUBLIC_SUPABASE_URL"),a||e.push("NEXT_PUBLIC_SUPABASE_ANON_KEY"),Error(`[CRITICAL] Missing required Supabase environment variables: ${e.join(", ")}. These must be set in Vercel environment variables.`)}if(n.includes("placeholder")||a.includes("placeholder"))throw Error("[CRITICAL] Supabase environment variables contain placeholder values. Please set real values in Vercel environment variables.");if(n.length<10||a.length<10)throw Error("[CRITICAL] Supabase environment variables appear to be invalid (too short). Please verify they are set correctly in Vercel.");function i(){let e=(0,s.cookies)();return(0,r.createServerClient)("https://vabikejehdmpfcyqrgrs.supabase.co","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhYmlrZWplaGRtcGZjeXFyZ3JzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NzAzNDAsImV4cCI6MjA4MTA0NjM0MH0.X_Z7szu62swGviqYgtI2mxV3F1vX4UBYpuZYV2n7h4Q",{cookies:{getAll:()=>e.getAll(),setAll(t){try{t.forEach(({name:t,value:o,options:r})=>{e.set(t,o,r)})}catch(e){}}}})}let l=i}};var t=require("../../../../../webpack-runtime.js");t.C(e);var o=e=>t(t.s=e),r=t.X(0,[8948,5972,7857,9702,4214],()=>o(14388));module.exports=r})();