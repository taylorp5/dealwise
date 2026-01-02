"use strict";(()=>{var e={};e.id=9606,e.ids=[9606],e.modules={20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},92048:e=>{e.exports=require("fs")},32615:e=>{e.exports=require("http")},35240:e=>{e.exports=require("https")},55315:e=>{e.exports=require("path")},68621:e=>{e.exports=require("punycode")},76162:e=>{e.exports=require("stream")},17360:e=>{e.exports=require("url")},21764:e=>{e.exports=require("util")},6162:e=>{e.exports=require("worker_threads")},71568:e=>{e.exports=require("zlib")},87561:e=>{e.exports=require("node:fs")},84492:e=>{e.exports=require("node:stream")},72477:e=>{e.exports=require("node:stream/web")},72864:(e,t,i)=>{i.r(t),i.d(t,{originalPathname:()=>m,patchFetch:()=>g,requestAsyncStorage:()=>p,routeModule:()=>u,serverHooks:()=>f,staticGenerationAsyncStorage:()=>h});var o={};i.r(o),i.d(o,{POST:()=>d});var r=i(49303),s=i(88716),a=i(60670),n=i(54214);if(!process.env.OPENAI_API_KEY)throw Error("OPENAI_API_KEY is not set");let c=new n.ZP({apiKey:process.env.OPENAI_API_KEY});async function l(e,t){let i=e.toLowerCase().trim();if(/how\s+(do|to|can|should)\s+i\s+negotiate/i.test(e)||/how\s+(do|to|can|should)\s+.*negotiate/i.test(e)||/how.*negotiate/i.test(i)||/how.*respond.*dealer|how.*talk.*dealer|how.*deal.*dealer|how.*handle.*dealer/i.test(i)||/what.*say.*dealer|what should i say|what to say|how do i say|how to say/i.test(i)||/negotiation.*copilot|copilot|script|response|reply.*dealer|message.*dealer/i.test(i)||/word.*for.*word|exact.*words|what.*tell|how.*respond/i.test(i)||/(negotiate|negotiation)/i.test(i)&&/(how|what|way|steps|guide|help)/i.test(i))return{intent:"feature_request",confidence:.95,redirectTo:"copilot"};if(/build.*otd|calculate.*otd|otd builder|out.*door.*builder|figure out.*otd|work out.*otd/i.test(i)||/how.*build.*price|how.*calculate.*total|how.*figure.*total.*cost|how.*work.*out.*otd/i.test(i))return{intent:"feature_request",confidence:.9,redirectTo:"otd_builder"};if(/^(what is|what's|define|explain|tell me about|what does|what are|what do)/i.test(e)||/what is \w+/i.test(e)||/meaning of/i.test(e))return/should i|can i|do i|would you|recommend|advice|help me decide/i.test(e)&&/should i finance|should i buy|should i pay|should i go/i.test(i)?{intent:"decision",confidence:.9}:{intent:"definition",confidence:.85};if(/should i|can i|do i|would you recommend|what should i|help me decide/i.test(e)||/is this.*good|is this.*worth|is this.*deal/i.test(i))return{intent:"decision",confidence:.9};if(/dealer says|they said|non-negotiable|won't budge|refusing|pushing back/i.test(i))return{intent:"negotiation",confidence:.85};if(/is.*realistic|is.*reasonable|is.*too high|is.*too low|otd|out.*door|total cost/i.test(i)||/\$\d+.*realistic|\$\d+.*reasonable/i.test(e))return{intent:"numbers",confidence:.9};if(/how do|how to|how can|how should|steps to|way to/i.test(e))return{intent:"how_to",confidence:.85};if(/compare.*offers|compare.*deals|multiple.*offers|different.*dealers|which.*better/i.test(i))return{intent:"feature_request",confidence:.85,redirectTo:"comparison"};if(/pack|library|strategy|advanced.*feature|unlock|specialized/i.test(i)||/first.*time.*pack|in.*person.*pack/i.test(i))return{intent:"feature_request",confidence:.85,redirectTo:"packs"};if(/how does.*work|how do i use|what is.*feature|where is/i.test(e))return{intent:"app_help",confidence:.8};try{let t=await c.chat.completions.create({model:"gpt-4o-mini",messages:[{role:"system",content:`Classify the user's question into one of these intents:
- definition: Asking what something means (e.g., "what is APR?")
- decision: Asking for advice on what to do (e.g., "should I finance?")
- how_to: Asking how to do something (e.g., "how do I negotiate?")
- negotiation: Asking what to say to a dealer (e.g., "dealer says fees are non-negotiable")
- numbers: Asking about price/OTD realism (e.g., "is $28k OTD realistic?")
- app_help: Asking how to use the app
- feature_request: Asking to build/calculate OTD, use copilot, compare offers, or access packs (e.g., "how do I build OTD?", "what should I say to dealer?")

If feature_request, also include "redirectTo": "otd_builder" | "copilot" | "comparison" | "packs"

Respond with JSON: {"intent": "...", "confidence": 0.0-1.0, "redirectTo"?: "..."}`},{role:"user",content:e}],temperature:.3,max_tokens:50}),i=t.choices[0]?.message?.content||"{}",o=JSON.parse(i);return{intent:o.intent||"decision",confidence:o.confidence||.7,redirectTo:o.redirectTo}}catch(e){return{intent:"decision",confidence:.5}}}async function d(e){try{let{messages:t,context:i,mode:o}=await e.json();if(!t||!Array.isArray(t)||0===t.length)return new Response(JSON.stringify({error:"Missing or invalid messages array"}),{status:400,headers:{"Content-Type":"application/json"}});let r=t[t.length-1];if("user"!==r.role)return new Response(JSON.stringify({error:"Last message must be from user"}),{status:400,headers:{"Content-Type":"application/json"}});let s=await l(r.content,t),a=function(e,t,i){let o=`LISTING CONTEXT:
- Dealer: ${t.dealerName||"Not specified"}
- State: ${t.state||"Not specified"}
- Vehicle Price: $${t.vehiclePrice?.toLocaleString()||"Not specified"}
- Estimated Fair Price: $${t.estimatedFairPrice?.toLocaleString()||"Not specified"}
- Vehicle Type: ${t.vehicleType||"Not specified"}
- Trim: ${t.trim||"Not specified"}
- OTD Confirmed: ${t.hasOTD?"Yes":"No"}`,r=`You are the First-Time Buyer Advisor inside a car-buying app.

ADVISOR SCOPE:
- ONLY answer questions related to car pricing, fees, financing, dealer behavior
- If question is educational (APR, OTD, etc.), respond with:
  1. One short explanation (2-3 sentences max)
  2. Two follow-up questions to help apply it to their situation
- NEVER give generic financial advice
- NEVER give investment, retirement, or general money management advice
- Focus ONLY on car buying context

Your role:
- Help first-time car buyers understand what is happening, what is normal, what is risky
- Explain dealer behavior and fees in plain English
- Be conversational, supportive, and educational
- Never assume credit score, debt, goals, etc. If missing and needed, ask.
- Do NOT output pack upsell lines ("unlock pack...") inside the advisor
- Keep tone calm, expert, non-salesy
- Prefer bullets + short paragraphs. Avoid long walls of text.

${o}

IMPORTANT: Always emphasize OTD (Out-the-Door) price is the only number that matters for comparing deals. Monthly payment can be manipulated by extending loan terms.`;switch(e){case"definition":return`${r}

For definition questions (what is APR, what is OTD, etc.):
- Provide ONE short explanation (2-3 sentences max)
- Use plain English, avoid jargon
- Connect it to car buying context when relevant
- ALWAYS include TWO follow-up questions to help apply it to their situation
- Example format:
  1. Short explanation
  2. "To help you apply this: [Question 1]"
  3. "[Question 2]"
- Keep it focused on car buying, not general finance
- Do NOT use the "Decision Help" template
- Do NOT give financing recommendations unless specifically asked

Example: "What is APR?" -> Short explanation of APR, then "To help you apply this: What's your target APR range? How does this compare to dealer financing offers?"`;case"decision":return`${r}

For decision questions:
- Ask 2-4 clarifying questions first if key info is missing (credit score range, budget, goals, timeline)
- Then provide a personalized recommendation
- Use bullets for clarity
- Always explain your reasoning
- Never assume information - ask if needed

Example: "Should I finance?" -> Ask about credit score, pre-approval status, goals, then recommend.`;case"negotiation":return`${r}

For negotiation questions:
- Provide HIGH-LEVEL guidance (2-3 sentences) about the tactic or situation
- Explain the dealer tactic if applicable
- Then redirect: "For word-for-word scripts tailored to this situation, use Negotiation Copilot at /copilot/free. It will generate specific responses based on your exact dealer message."
- Do NOT provide detailed scripts or word-for-word responses
- Do NOT replace Negotiation Copilot functionality
- Keep responses brief and redirect clearly

Example: "Dealer says fees are non-negotiable" -> Explain this is a common pressure tactic (1-2 sentences), then redirect to Negotiation Draft Builder for scripts.`;case"numbers":return`${r}

For numbers/OTD questions:
- If asking HOW to build/calculate OTD: Give high-level explanation (2-3 sentences), then redirect: "For detailed OTD calculations with all fees and taxes, use Smart OTD Builder at /calculator."
- If asking about realism/validation: Provide quick sanity check and explain assumptions
- Request missing numbers if needed
- Compare to market averages if helpful
- Use specific numbers from the listing context when available
- Do NOT do detailed step-by-step OTD calculations - redirect to OTD Builder instead`;case"how_to":return`${r}

For how-to questions:
- Provide clear, step-by-step guidance
- Use bullets or numbered lists
- Be specific and actionable
- Reference the listing context when relevant`;case"app_help":return`${r}

For app help questions:
- Explain how to use the feature
- Reference where to find things in the app
- Be concise and helpful`;case"feature_request":let s=function(e){switch(e){case"otd_builder":return{name:"Smart OTD Builder",route:"/calculator/free",description:"builds detailed out-the-door price calculations with all fees, taxes, and add-ons"};case"copilot":return{name:"Negotiation Draft Builder",route:"/copilot/free",description:"generates word-for-word scripts and responses tailored to your specific dealer messages"};case"comparison":return{name:"Offer Comparison",route:"/research?tab=compare",description:"compares multiple offers side-by-side to help you find the best deal"};case"packs":return{name:"Packs / Library",route:"/packs",description:"unlocks specialized negotiation strategies and advanced features for deeper guidance"};default:return null}}(i);return`${r}

CRITICAL GUARDRAIL: The user is asking about a feature that exists elsewhere in DealWise. You MUST redirect them.

Available DealWise Features:
- Negotiation Draft Builder (/copilot/free): Generates word-for-word scripts and responses for dealer messages. Use for specific negotiation scripts.
- Smart OTD Builder (/calculator): Builds detailed out-the-door price calculations with all fees and taxes. Use for precise OTD calculations.
- Offer Comparison (/research?tab=compare): Compares multiple offers side-by-side. Use for comparing different dealer offers.
- Packs (/packs): Specialized negotiation strategies and advanced features. Use for deeper negotiation guidance.

STRICT RULES FOR FEATURE REQUESTS:
1. Give ONLY a brief 1-2 sentence high-level explanation of the concept
2. Then IMMEDIATELY redirect with: "For [specific feature], use [Feature Name] at [route]. It will [brief benefit]."
3. Do NOT provide detailed step-by-step instructions
4. Do NOT provide guides, lists, numbered steps, or comprehensive advice
5. Do NOT generate scripts if asking about Negotiation Draft Builder
6. Do NOT do detailed OTD calculations if asking about OTD Builder
7. Keep your ENTIRE response under 3 sentences total
8. The redirect should be the main focus of your response
9. Do NOT use markdown formatting, bullets, or numbered lists
10. Your response should be plain text, brief, and redirect immediately

${s?`

User is asking about: ${s.name}
You MUST redirect to: ${s.route}
Brief description: ${s.description}

Your response should be:
1. One sentence explaining the concept
2. "For [specific feature], use ${s.name} at ${s.route}. It will ${s.description}."`:""}`;default:return r}}(s.intent,i||{},s.redirectTo),n=[{role:"system",content:a},...t.slice(-10)],d=await c.chat.completions.create({model:"gpt-4o",messages:n,temperature:.7,stream:!0}),u=new TextEncoder,p=new ReadableStream({async start(e){try{for await(let t of d){let i=t.choices[0]?.delta?.content||"";if(i){let t=JSON.stringify({content:i});e.enqueue(u.encode(`data: ${t}

`))}}e.enqueue(u.encode(`data: [DONE]

`)),e.close()}catch(i){console.error("Streaming error:",i);let t=JSON.stringify({error:i.message||"Stream error"});e.enqueue(u.encode(`data: ${t}

`)),e.close()}}});return new Response(p,{headers:{"Content-Type":"text/event-stream","Cache-Control":"no-cache",Connection:"keep-alive"}})}catch(e){return console.error("Advisor chat error:",e),new Response(JSON.stringify({error:e.message||"Internal server error"}),{status:500,headers:{"Content-Type":"application/json"}})}}let u=new r.AppRouteRouteModule({definition:{kind:s.x.APP_ROUTE,page:"/api/advisor/chat/route",pathname:"/api/advisor/chat",filename:"route",bundlePath:"app/api/advisor/chat/route"},resolvedPagePath:"C:\\dev\\Dealership Copilot\\app\\api\\advisor\\chat\\route.ts",nextConfigOutput:"",userland:o}),{requestAsyncStorage:p,staticGenerationAsyncStorage:h,serverHooks:f}=u,m="/api/advisor/chat/route";function g(){return(0,a.patchFetch)({serverHooks:f,staticGenerationAsyncStorage:h})}},49303:(e,t,i)=>{e.exports=i(30517)}};var t=require("../../../../webpack-runtime.js");t.C(e);var i=e=>t(t.s=e),o=t.X(0,[8948,4214],()=>i(72864));module.exports=o})();