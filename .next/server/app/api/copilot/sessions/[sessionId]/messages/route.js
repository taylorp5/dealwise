"use strict";(()=>{var e={};e.id=2126,e.ids=[2126],e.modules={72934:e=>{e.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:e=>{e.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:e=>{e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},92048:e=>{e.exports=require("fs")},32615:e=>{e.exports=require("http")},35240:e=>{e.exports=require("https")},55315:e=>{e.exports=require("path")},68621:e=>{e.exports=require("punycode")},76162:e=>{e.exports=require("stream")},17360:e=>{e.exports=require("url")},21764:e=>{e.exports=require("util")},6162:e=>{e.exports=require("worker_threads")},71568:e=>{e.exports=require("zlib")},87561:e=>{e.exports=require("node:fs")},84492:e=>{e.exports=require("node:stream")},72477:e=>{e.exports=require("node:stream/web")},65734:(e,s,t)=>{t.r(s),t.d(s,{originalPathname:()=>_,patchFetch:()=>y,requestAsyncStorage:()=>d,routeModule:()=>m,serverHooks:()=>h,staticGenerationAsyncStorage:()=>g});var r={};t.r(r),t.d(r,{POST:()=>u});var n=t(49303),o=t(88716),a=t(60670),i=t(87070),c=t(19692),p=t(8563),l=t(71769);async function u(e,{params:s}){try{let t=await (0,c.f)(),{data:{session:r}}=await t.auth.getSession();if(!r?.user)return i.NextResponse.json({success:!1,error:"Unauthorized"},{status:401});let n=r.user.id,o=s.sessionId,a=await e.json(),{data:u,error:m}=await t.from("negotiation_sessions").select("*").eq("id",o).eq("user_id",n).single();if(m||!u)return i.NextResponse.json({success:!1,error:"Session not found"},{status:404});let{data:d,error:g}=await t.from("session_messages").insert({session_id:o,role:a.role,content:a.content,message_type:a.message_type||"response"}).select().single();if(g)return console.error("Error saving message:",g),i.NextResponse.json({success:!1,error:"Failed to save message"},{status:500});let{data:h}=await t.from("session_messages").select("*").eq("session_id",o).order("created_at",{ascending:!0}),_=(0,p.$)(),y=(0,l.N)(u,h||[],a.content);try{let e=await _.chat.completions.create({model:"gpt-4o-mini",messages:[{role:"system",content:y.systemPrompt},{role:"user",content:y.userPrompt}],response_format:{type:"json_object"},temperature:.8}),s=JSON.parse(e.choices[0].message.content||"{}"),{data:r,error:n}=await t.from("session_messages").insert({session_id:o,role:"copilot",content:s.recommended_response||"Analysis complete",message_type:"response",tactic_explanation:s.tactic_explanation,recommended_response:s.recommended_response,suggested_counter_range:s.suggested_counter_range,next_questions:s.next_questions,checklist_items:s.checklist_items}).select().single();return n&&console.error("Error saving copilot message:",n),"initial_contact"===u.current_stage&&await t.from("negotiation_sessions").update({current_stage:"negotiating"}).eq("id",o),i.NextResponse.json({success:!0,copilotResponse:s,messageId:d.id,copilotMessageId:r?.id})}catch(e){return console.error("Error generating copilot response:",e),i.NextResponse.json({success:!1,error:"Failed to generate response"},{status:500})}}catch(e){return console.error("Error processing message:",e),i.NextResponse.json({success:!1,error:e.message||"Failed to process message"},{status:500})}}let m=new n.AppRouteRouteModule({definition:{kind:o.x.APP_ROUTE,page:"/api/copilot/sessions/[sessionId]/messages/route",pathname:"/api/copilot/sessions/[sessionId]/messages",filename:"route",bundlePath:"app/api/copilot/sessions/[sessionId]/messages/route"},resolvedPagePath:"C:\\dev\\Dealership Copilot\\app\\api\\copilot\\sessions\\[sessionId]\\messages\\route.ts",nextConfigOutput:"",userland:r}),{requestAsyncStorage:d,staticGenerationAsyncStorage:g,serverHooks:h}=m,_="/api/copilot/sessions/[sessionId]/messages/route";function y(){return(0,a.patchFetch)({serverHooks:h,staticGenerationAsyncStorage:g})}},8563:(e,s,t)=>{t.d(s,{$:()=>o});var r=t(54214);let n=null;function o(){if(!n){let e=process.env.OPENAI_API_KEY;if(!e)throw Error("OPENAI_API_KEY is not set");n=new r.ZP({apiKey:e})}return n}},71769:(e,s,t)=>{function r(e,s){return{systemPrompt:`You are an expert car buying negotiation coach. Your job is to help users negotiate the best possible deal on a car purchase.

CRITICAL RULES:
1. Provide educational guidance, not financial or legal advice
2. Never guarantee outcomes - frame suggestions as strategies
3. Be specific and actionable
4. Consider the user's pack type (${s.name}) and tailor advice accordingly
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

Pack Type: ${s.name}
${s.description}

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

Return ONLY valid JSON, no other text.`}}function n(e,s,t){let r=`You are an expert car buying negotiation coach analyzing dealer messages in real-time.

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
}`,n=s.slice(-5).map(e=>`${e.role}: ${e.content}`).join("\n");return{systemPrompt:r,userPrompt:`Analyze this dealer message and provide guidance:

Session Context:
- Pack: ${e.pack_type}
- Payment: ${e.payment_method}
- Max Budget: ${e.max_otd_budget?`$${e.max_otd_budget}`:"Not specified"}
- Communication: ${e.communication_method}

Recent Conversation:
${n||"This is the first message from the dealer."}

Dealer's Message:
"${t}"

Provide your analysis and recommendations. Be specific and actionable.

Return ONLY valid JSON, no other text.`}}t.d(s,{N:()=>n,t:()=>r})},19692:(e,s,t)=>{t.d(s,{$:()=>i,f:()=>c});var r=t(67721),n=t(71615);let o="https://vabikejehdmpfcyqrgrs.supabase.co",a="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhYmlrZWplaGRtcGZjeXFyZ3JzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NzAzNDAsImV4cCI6MjA4MTA0NjM0MH0.X_Z7szu62swGviqYgtI2mxV3F1vX4UBYpuZYV2n7h4Q";if(!o||!a){let e=[];throw o||e.push("NEXT_PUBLIC_SUPABASE_URL"),a||e.push("NEXT_PUBLIC_SUPABASE_ANON_KEY"),Error(`[CRITICAL] Missing required Supabase environment variables: ${e.join(", ")}. These must be set in Vercel environment variables.`)}if(o.includes("placeholder")||a.includes("placeholder"))throw Error("[CRITICAL] Supabase environment variables contain placeholder values. Please set real values in Vercel environment variables.");if(o.length<10||a.length<10)throw Error("[CRITICAL] Supabase environment variables appear to be invalid (too short). Please verify they are set correctly in Vercel.");function i(){let e=(0,n.cookies)();return(0,r.createServerClient)("https://vabikejehdmpfcyqrgrs.supabase.co","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhYmlrZWplaGRtcGZjeXFyZ3JzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NzAzNDAsImV4cCI6MjA4MTA0NjM0MH0.X_Z7szu62swGviqYgtI2mxV3F1vX4UBYpuZYV2n7h4Q",{cookies:{getAll:()=>e.getAll(),setAll(s){try{s.forEach(({name:s,value:t,options:r})=>{e.set(s,t,r)})}catch(e){}}}})}let c=i}};var s=require("../../../../../../webpack-runtime.js");s.C(e);var t=e=>s(s.s=e),r=s.X(0,[8948,5972,7857,9702,4214],()=>t(65734));module.exports=r})();