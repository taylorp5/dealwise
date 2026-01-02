"use strict";(()=>{var e={};e.id=9436,e.ids=[9436],e.modules={72934:e=>{e.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:e=>{e.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:e=>{e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},92048:e=>{e.exports=require("fs")},32615:e=>{e.exports=require("http")},35240:e=>{e.exports=require("https")},55315:e=>{e.exports=require("path")},68621:e=>{e.exports=require("punycode")},76162:e=>{e.exports=require("stream")},17360:e=>{e.exports=require("url")},21764:e=>{e.exports=require("util")},6162:e=>{e.exports=require("worker_threads")},71568:e=>{e.exports=require("zlib")},87561:e=>{e.exports=require("node:fs")},84492:e=>{e.exports=require("node:stream")},72477:e=>{e.exports=require("node:stream/web")},81568:(e,t,s)=>{s.r(t),s.d(t,{originalPathname:()=>I,patchFetch:()=>y,requestAsyncStorage:()=>g,routeModule:()=>h,serverHooks:()=>f,staticGenerationAsyncStorage:()=>m});var i={};s.r(i),s.d(i,{POST:()=>p});var r=s(49303),n=s(88716),o=s(60670),a=s(87070),c=s(19692),l=s(37857),u=s(54214);if(!process.env.OPENAI_API_KEY)throw Error("OPENAI_API_KEY is not set");let d=new u.ZP({apiKey:process.env.OPENAI_API_KEY});async function p(e){try{let t;let s=await (0,c.f)(),{data:{session:i}}=await s.auth.getSession();if(!i?.user)return a.NextResponse.json({success:!1,error:"Unauthorized"},{status:401});let r=i.user.id,n=!1;try{if(process.env.SUPABASE_SERVICE_ROLE_KEY){let e=(0,l.createClient)("https://vabikejehdmpfcyqrgrs.supabase.co",process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:!1}}),{data:t}=await e.from("user_packs").select("pack_id").eq("user_id",r).eq("pack_id","in_person").single();n=!!t}else{let{data:e}=await s.from("user_packs").select("pack_id").eq("user_id",r).eq("pack_id","in_person").single();n=!!e}}catch(e){console.error("Error checking pack entitlement:",e),process.env.SUPABASE_SERVICE_ROLE_KEY||(n=!0)}if(!n)return a.NextResponse.json({success:!1,error:"Pack required",code:"PACK_REQUIRED"},{status:403});let{message:o,context:u}=await e.json();if(!o||"string"!=typeof o||0===o.trim().length)return a.NextResponse.json({success:!1,error:"Message is required"},{status:400});let p=`You are a real-time dealership negotiation coach providing tactical, spoken-language guidance during in-person negotiations.

CRITICAL RULES:
1. Output ONLY the required JSON schema (no extra text)
2. "sayThisNow" must be 1-2 sentences MAX, spoken language (not email-style)
3. "whatItMeans" must be <= 140 characters
4. "doNext" must be one physical/behavioral next step
5. Always identify the tactic if any dealer behavior is detected
6. If user asks "Is this a good deal?" or "What should I do?" with missing info, ALWAYS set clarifyingQuestion (do not answer fully)
7. If user provides enough info, clarifyingQuestion must be null
8. Be calm, firm, OTD-focused - no hedging
9. No long paragraphs, no variations/alternates - one best line only

TACTIC CLASSIFIER:
- monthly/payment -> "Payment anchoring"
- "today only", "someone else", "won't last", "expires" -> "Urgency"
- "mandatory add-on", "protection", "nitrogen", "etch", "coating" -> "Add-on shove"
- "manager", "talk to my manager", "let me check" -> "Manager escalation"
- "fees non-negotiable", "fees are fixed" -> "Fee wall"
- "sign today", "commit now" -> "Commitment pressure"
- "trade" with low offer -> "Trade-in lowball"
- "best price", "final offer" -> "Price anchoring"

Your response MUST be a JSON object with this EXACT structure:
{
  "tactic": "<Tactic name or 'None' if no tactic detected>",
  "whatItMeans": "<Brief explanation <= 140 chars>",
  "sayThisNow": "<1-2 sentences, spoken language, what to say right now>",
  "doNext": "<One physical/behavioral next step>",
  "clarifyingQuestion": "<Question if info missing, or null if enough info>",
  "confidence": "<high|medium|low>"
}

CRITICAL: Return ALL required fields. Missing fields will cause an error.`,h=(t=`USER MESSAGE: "${o}"

`,u.dealerSaid&&(t+=`DEALER SAID: "${u.dealerSaid}"
`),u.inPersonSituation&&(t+=`CURRENT SITUATION: ${u.inPersonSituation}
`),u.desiredOTD&&(t+=`TARGET OTD: $${u.desiredOTD}
`),u.vehiclePrice&&(t+=`VEHICLE PRICE: $${u.vehiclePrice}
`),u.state&&(t+=`STATE: ${u.state}
`),u.ladder&&(t+=`NEGOTIATION LADDER:
- Ask: ${u.ladder.ask}
- Agree: ${u.ladder.agree}
- Walk: ${u.ladder.walk}
`),t+=`
Analyze the user's message and dealer context. Identify any tactics. Provide tactical guidance.
If the user asks "Is this a good deal?" or "What should I do?" without enough context (missing OTD, fees, vehicle details), set clarifyingQuestion.
If enough info is provided, set clarifyingQuestion to null and give direct guidance.
Return ONLY valid JSON with ALL required fields.`),g=await d.chat.completions.create({model:"gpt-4o-mini",messages:[{role:"system",content:p},{role:"user",content:h}],response_format:{type:"json_object"},temperature:.7}),m=JSON.parse(g.choices[0].message.content||"{}"),f=["tactic","whatItMeans","sayThisNow","doNext","clarifyingQuestion","confidence"],I=f.filter(e=>"clarifyingQuestion"===e?!(e in m):!m[e]);if(I.length>0){console.warn("Advisor response missing fields:",I);let e=h+"\n\nCRITICAL: You must return ALL required fields: tactic, whatItMeans, sayThisNow, doNext, clarifyingQuestion (can be null), confidence (high|medium|low). Missing fields: "+I.join(", ");try{let t=await d.chat.completions.create({model:"gpt-4o-mini",messages:[{role:"system",content:p},{role:"user",content:e}],response_format:{type:"json_object"},temperature:.7}),s=JSON.parse(t.choices[0].message.content||"{}"),i=f.filter(e=>"clarifyingQuestion"===e?!(e in s):!s[e]);if(0!==i.length)return console.error("Advisor response still invalid after retry, using fallback"),a.NextResponse.json({success:!0,data:{tactic:"Unknown",whatItMeans:"Unable to analyze. Please provide more context.",sayThisNow:"I need a moment to review the numbers. Can you show me the itemized OTD breakdown?",doNext:"Request written OTD breakdown",clarifyingQuestion:"Can you paste what the dealer said, or describe the situation?",confidence:"low"}});Object.assign(m,s)}catch(e){return console.error("Retry failed, using fallback:",e),a.NextResponse.json({success:!0,data:{tactic:"Unknown",whatItMeans:"Unable to analyze. Please provide more context.",sayThisNow:"I need a moment to review the numbers. Can you show me the itemized OTD breakdown?",doNext:"Request written OTD breakdown",clarifyingQuestion:"Can you paste what the dealer said, or describe the situation?",confidence:"low"}})}}let y={tactic:String(m.tactic||"None").substring(0,100),whatItMeans:String(m.whatItMeans||"").substring(0,140),sayThisNow:String(m.sayThisNow||"").substring(0,300),doNext:String(m.doNext||"").substring(0,200),clarifyingQuestion:null===m.clarifyingQuestion||void 0===m.clarifyingQuestion?null:String(m.clarifyingQuestion).substring(0,200),confidence:["high","medium","low"].includes(m.confidence)?m.confidence:"medium"};return a.NextResponse.json({success:!0,data:y})}catch(e){return console.error("Error in in-person advisor:",e),a.NextResponse.json({success:!1,error:e.message||"Failed to get advisor response"},{status:500})}}let h=new r.AppRouteRouteModule({definition:{kind:n.x.APP_ROUTE,page:"/api/in-person-advisor/route",pathname:"/api/in-person-advisor",filename:"route",bundlePath:"app/api/in-person-advisor/route"},resolvedPagePath:"C:\\dev\\Dealership Copilot\\app\\api\\in-person-advisor\\route.ts",nextConfigOutput:"",userland:i}),{requestAsyncStorage:g,staticGenerationAsyncStorage:m,serverHooks:f}=h,I="/api/in-person-advisor/route";function y(){return(0,o.patchFetch)({serverHooks:f,staticGenerationAsyncStorage:m})}},19692:(e,t,s)=>{s.d(t,{$:()=>a,f:()=>c});var i=s(67721),r=s(71615);let n="https://vabikejehdmpfcyqrgrs.supabase.co",o="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhYmlrZWplaGRtcGZjeXFyZ3JzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NzAzNDAsImV4cCI6MjA4MTA0NjM0MH0.X_Z7szu62swGviqYgtI2mxV3F1vX4UBYpuZYV2n7h4Q";if(!n||!o){let e=[];throw n||e.push("NEXT_PUBLIC_SUPABASE_URL"),o||e.push("NEXT_PUBLIC_SUPABASE_ANON_KEY"),Error(`[CRITICAL] Missing required Supabase environment variables: ${e.join(", ")}. These must be set in Vercel environment variables.`)}if(n.includes("placeholder")||o.includes("placeholder"))throw Error("[CRITICAL] Supabase environment variables contain placeholder values. Please set real values in Vercel environment variables.");if(n.length<10||o.length<10)throw Error("[CRITICAL] Supabase environment variables appear to be invalid (too short). Please verify they are set correctly in Vercel.");function a(){let e=(0,r.cookies)();return(0,i.createServerClient)("https://vabikejehdmpfcyqrgrs.supabase.co","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhYmlrZWplaGRtcGZjeXFyZ3JzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NzAzNDAsImV4cCI6MjA4MTA0NjM0MH0.X_Z7szu62swGviqYgtI2mxV3F1vX4UBYpuZYV2n7h4Q",{cookies:{getAll:()=>e.getAll(),setAll(t){try{t.forEach(({name:t,value:s,options:i})=>{e.set(t,s,i)})}catch(e){}}}})}let c=a}};var t=require("../../../webpack-runtime.js");t.C(e);var s=e=>t(t.s=e),i=t.X(0,[8948,5972,7857,9702,4214],()=>s(81568));module.exports=i})();