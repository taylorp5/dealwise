"use strict";(()=>{var e={};e.id=9053,e.ids=[9053],e.modules={72934:e=>{e.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:e=>{e.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:e=>{e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},92048:e=>{e.exports=require("fs")},32615:e=>{e.exports=require("http")},35240:e=>{e.exports=require("https")},55315:e=>{e.exports=require("path")},68621:e=>{e.exports=require("punycode")},76162:e=>{e.exports=require("stream")},17360:e=>{e.exports=require("url")},21764:e=>{e.exports=require("util")},6162:e=>{e.exports=require("worker_threads")},71568:e=>{e.exports=require("zlib")},87561:e=>{e.exports=require("node:fs")},84492:e=>{e.exports=require("node:stream")},72477:e=>{e.exports=require("node:stream/web")},83675:(e,t,a)=>{a.r(t),a.d(t,{originalPathname:()=>k,patchFetch:()=>b,requestAsyncStorage:()=>I,routeModule:()=>T,serverHooks:()=>O,staticGenerationAsyncStorage:()=>w});var s={};a.r(s),a.d(s,{POST:()=>g});var r=a(49303),n=a(88716),o=a(60670),i=a(87070),l=a(19692),d=a(8563),c=a(93950),u=a(74918);let h={OTD_CONFIRMATION:{skeleton:"{softOpener}I'm interested in the vehicle and want to confirm the final out-the-door number before coming in. {financing} If the total OTD is ${desiredOTD}, all-in with no additional products added, I'm prepared to move forward. Please confirm the written OTD so we're aligned.{walkAwayClause}",toneModifiers:{friendly:['softOpener: "Hi! "','walkAwayClause: ""'],neutral:['softOpener: ""','walkAwayClause: ""'],firm:['softOpener: ""',"walkAwayClause: \" If ${desiredOTD} doesn't work, I'll continue evaluating other options.\""]},financingInsert:"after opener"},CLOSE_TODAY:{skeleton:"{softOpener}I'm prepared to finalize today if the out-the-door number is ${desiredOTD}, all-in. {financing} {otdOnly}If you can confirm ${desiredOTD} in writing, I'll move forward immediately.{walkAwayClause}",toneModifiers:{friendly:['softOpener: "I\'m ready to move forward. "','walkAwayClause: ""'],neutral:['softOpener: ""','walkAwayClause: ""'],firm:['softOpener: ""',"walkAwayClause: \" If that number isn't available today, I'll continue evaluating other vehicles.\""]},financingInsert:"after opener"},PRICE_PUSHBACK:{skeleton:"{softOpener}I'm still targeting ${desiredOTD} out-the-door based on comparable pricing and total cost. If there's flexibility to get closer, I'm ready to move quickly.{walkAwayClause}",toneModifiers:{friendly:['softOpener: "I\'ve reviewed the numbers. "','walkAwayClause: ""'],neutral:['softOpener: ""','walkAwayClause: ""'],firm:['softOpener: ""','walkAwayClause: " If not, I\'ll continue evaluating other options."']},financingInsert:"after reference"},FEE_OR_ADDON_PUSHBACK:{skeleton:"{softOpener}I'm only considering the all-in out-the-door price. If there are add-ons included, please list which are optional and which are required. I'm open to proceeding without additional products.{walkAwayClause}",toneModifiers:{friendly:['softOpener: "I see some add-ons in the breakdown. "','walkAwayClause: ""'],neutral:['softOpener: ""','walkAwayClause: ""'],firm:['softOpener: ""','walkAwayClause: " If add-ons are mandatory, I\'ll continue evaluating other options."']},financingInsert:"after ask"},PAYMENT_DEFLECTION:{skeleton:"{softOpener}I'm not negotiating based on monthly payment. {financing} {otdOnly}If you can confirm ${desiredOTD}, I'm ready to proceed.{walkAwayClause}",toneModifiers:{friendly:['softOpener: "I appreciate the question, but "','walkAwayClause: ""'],neutral:['softOpener: ""','walkAwayClause: ""'],firm:['softOpener: ""',"walkAwayClause: \" If you can't confirm OTD, I'll continue evaluating other options.\""]},financingInsert:"after opener"}};function p(e,t,a,s){return"financing"===a&&s?"PAYMENT_DEFLECTION":"close_today"===e?"CLOSE_TODAY":"after_counter"===t?"PRICE_PUSHBACK":"reduce_addons"===e?"FEE_OR_ADDON_PUSHBACK":"OTD_CONFIRMATION"}function m(e,t,a,s,r,n,o){let i=function(e,t,a,s,r,n,o,i){let l="get_otd"===t||"reduce_addons"===t||!!s&&["get_otd","reduce_addons","schedule_visit_otd"].includes(t),d="financing"===o&&(!!r||!!n),c=d&&("close_today"===t||!!i||"firm"===a);return{mentionOTD:l,deflectMonthlyPayment:d&&!!i,urgencyLanguage:"close_today"===t,walkAwayLanguage:"firm"===a,hasFinancingDetails:d,financingAsLeverageAllowed:c}}(0,a,t,s,r,n,o?.buyerType,o?.dealerMentionsMonthlyPayment),l=h[e],d=l.skeleton,c={};if(l.toneModifiers[t].forEach(e=>{let t=e.match(/^(\w+):\s*["'](.+)["']$/);if(t){let[,e,a]=t,r=a;if(s&&a.includes("${desiredOTD}")){let e=`$${s.toLocaleString()}`;r=r.replace(/\$\{desiredOTD\}/g,e)}c[e]=r}}),i.financingAsLeverageAllowed||i.deflectMonthlyPayment){let e=function(e,t,a,s){if(!e&&!t)return"";if(s)return e?"I already have financing secured, so I'm not negotiating based on monthly payment.":"I'm not negotiating based on monthly payment.";if(e)switch(a){case"firm":return"I'm already approved at competitive terms.";case"neutral":default:return"I have financing secured.";case"friendly":return"I already have financing lined up."}if(t)switch(a){case"firm":return"I'm already approved.";case"neutral":default:return"I have financing arranged.";case"friendly":return"I've got financing ready."}return""}(r,n,t,i.deflectMonthlyPayment);c.financing=e}else c.financing="";if(i.mentionOTD?(c.otdOnly="This is an OTD discussion only. ",c.otdContext="My financing is already set — this comes down to the final OTD number. "):(c.otdOnly="",c.otdContext=""),i.walkAwayLanguage||(c.walkAwayClause=""),s){let e=`$${s.toLocaleString()}`;d=d.replace(/\$\{desiredOTD\}/g,e)}Object.keys(c).forEach(e=>{let t=c[e];d=t?d.replace(RegExp(`\\{${e}\\}`,"g"),t):d.replace(RegExp(`\\{${e}\\}\\s*`,"g"),"")}),d=(d=(d=d.replace(/\{[^}]+\}/g,"")).replace(/\s+/g," ").trim()).replace(/^\s*[.,]\s*/,"").replace(/\s*[.,]\s*$/,""),[/Thanks!/gi,/Thanks for/gi,/I love this car/gi,/hopefully/gi,/OTD \(out-the-door\)/gi,/out-the-door \(OTD\)/gi,/what OTD means/gi,/OTD means/gi,/out-the-door means/gi].forEach(e=>{d=d.replace(e,"")});let u=(d=(d=d.replace(/\s+/g," ").trim()).replace(/\.\s*\./g,".")).split(/[.!?]+/).filter(e=>e.trim().length>0);return u.length>4&&(d=u.slice(0,4).join(". ")+"."),d}function f(e,t,a,s){let r={OTD_CONFIRMATION:["Asks for written confirmation to avoid surprise fees later","Keeps the conversation on total price, not monthly payment",a?"Signals you're ready to buy (not just shopping numbers)":"Creates a written reference point for final negotiation"],CLOSE_TODAY:["Signals you're ready to buy today (not just shopping numbers)","Sets a clear boundary that prevents drawn-out negotiation","Asks for written confirmation before you come in"],PRICE_PUSHBACK:["Anchors the conversation around total cost, not monthly payment","Signals you have other options without showing desperation","Keeps negotiation door open while asserting your position"],FEE_OR_ADDON_PUSHBACK:["Asks dealer to clarify which add-ons are optional vs required","Prevents fee creep by addressing unnecessary charges upfront","Keeps focus on what you actually need, not what dealer wants to sell"],PAYMENT_DEFLECTION:["Shuts down monthly payment discussion immediately","Forces dealer to discuss total cost, which is what actually matters",a?"Signals you already have financing secured":"Keeps control of the conversation"]};return(r[e]||r.OTD_CONFIRMATION).slice(0,3)}function y(e,t,a){return"close_today"===a&&e?"Confidence check: Strong — clear close, low ambiguity.":e?t&&0!==t?"Confidence check: Strong — all key inputs provided.":"Confidence check: Medium — tax assumptions may change final OTD.":"Confidence check: Medium — add a target OTD to get a cleaner yes/no."}async function g(e){try{var t,s,r;let n,o,h,g;let T=await (0,l.f)(),I=e.headers.get("authorization"),w=null;if(I?.startsWith("Bearer ")){let e=I.replace("Bearer ",""),{data:{user:t}}=await T.auth.getUser(e);t&&(w=t.id)}if(!w){let{data:{session:e}}=await T.auth.getSession();e?.user&&(w=e.user.id)}if(!w)return i.NextResponse.json({success:!1,error:"Unauthorized"},{status:401});let{buyerType:O,stage:k,tone:b,goal:A,vehiclePrice:D,desiredOTD:v,state:R,registrationZip:$,taxRate:C,tradeIn:S,tradeInValue:N,preApprovalApr:E,maxMonthly:x,contextText:M,hasCompetitiveOffers:P,hasCarContext:_,hasInPersonPack:L,mode:F,inPersonSituation:U}=await e.json(),j=F||"free",W="none";if("in_person"===j||"first_time"===j){let{createClient:e}=await Promise.resolve().then(a.bind(a,37857)),t=process.env.SUPABASE_SERVICE_ROLE_KEY;if(t){let a=e("https://vabikejehdmpfcyqrgrs.supabase.co",t,{auth:{persistSession:!1,autoRefreshToken:!1}}),s="in_person"===j?"in_person":"first_time",{data:r}=await a.from("user_packs").select("is_unlocked").eq("user_id",w).eq("pack_id",s).single();r&&r.is_unlocked?W=`verified_${s}_pack`:(W=`downgraded_to_free_missing_${s}_pack`,j="free")}else W="skipped_missing_service_key",console.warn("SUPABASE_SERVICE_ROLE_KEY missing - cannot verify pack entitlements")}let q="in_person"===j;if(!D||!R)return i.NextResponse.json({success:!1,error:"Vehicle price and state are required"},{status:400});if("in_person"===j){if(!v)return i.NextResponse.json({success:!1,error:"Desired OTD is required for in-person mode"},{status:400});if(!U)return i.NextResponse.json({success:!1,error:"Situation selection is required for in-person mode"},{status:400})}else if(("get_otd"===A||"close_today"===A)&&!v)return i.NextResponse.json({success:!1,error:"Desired OTD is required for this goal"},{status:400});let Y=(0,d.$)();if(C&&("number"==typeof C||"string"==typeof C&&parseFloat(C)>0))n="number"==typeof C?C:parseFloat(C);else if(R)try{let e=await (0,u.A)(R,$||void 0);n=void 0!==e.combinedRate?e.combinedRate:e.combinedRateRange?(e.combinedRateRange.low+e.combinedRateRange.high)/2:e.stateBaseRate||(0,c.getTaxRateForState)(R)||6.5}catch(e){console.warn("Tax rate lookup failed, using state base rate:",e),n=(0,c.getTaxRateForState)(R)||6.5}else n=6.5;if("in_person"===j){let e,a,r;let i=M?function(e){if(!e)return[];let t=e.toLowerCase(),a=[];return(t.includes("monthly")||t.includes("payment")||t.includes("per month"))&&a.push("payment_anchoring"),(t.includes("today only")||t.includes("other buyer")||t.includes("someone else")||t.includes("limited time")||t.includes("expires")||t.includes("hurry"))&&a.push("urgency"),(t.includes("add-on")||t.includes("protection")||t.includes("nitrogen")||t.includes("warranty")||t.includes("coating")||t.includes("package"))&&a.push("add_on_push"),(t.includes("manager")||t.includes("supervisor")||t.includes("let me check with"))&&a.push("escalation"),a}(M):[];t=v||0,s=n,e="",U&&(U.includes("monthly payment")?e=`SITUATION-SPECIFIC: Monthly payment question detected.
- "sayThis" MUST refuse monthly payment framing and redirect to OTD
- Example: "I'm focused on the total out-the-door price, not monthly payments. What's your OTD?"
- "ifPushback" should reinforce OTD focus if they persist with monthly talk
- "doNotSay" must include "What's the monthly payment?" or similar`:U.includes("mandatory add-ons")||U.includes("add-ons")?e=`SITUATION-SPECIFIC: Mandatory add-ons detected.
- "sayThis" MUST request add-on removal or itemized breakdown
- Example: "I need to see which add-ons are removable. Can you show me the breakdown?"
- "ifPushback" should offer to adjust sale price to hit OTD if add-ons stay
- Include specific add-on removal language`:U.includes("fees are non-negotiable")||U.includes("fees non-negotiable")?e=`SITUATION-SPECIFIC: Fees non-negotiable claim detected.
- "sayThis" MUST request itemized OTD breakdown
- "ifPushback" should offer to adjust sale price to hit target OTD: "If fees are fixed, let's adjust the sale price to hit $${t} OTD"
- Be firm that OTD is the only number that matters`:U.includes("manager")?e=`SITUATION-SPECIFIC: Manager escalation detected.
- "ifManager" MUST be firm and closing-oriented
- Example: "I need $${t} OTD. Can you make that happen?"
- "sayThis" should prepare for manager escalation
- Be direct, no small talk`:U.includes("sign today")||U.includes("sign today")?e=`SITUATION-SPECIFIC: Sign today pressure detected.
- "sayThis" MUST include: "I sign when the OTD sheet matches $${t}"
- "ifPushback" should reinforce: "Show me the OTD breakdown first"
- "closingLine" should be: "I'm ready to sign when you show me $${t} OTD in writing"`:U.includes("someone else is interested")||U.includes("urgency")?e=`SITUATION-SPECIFIC: Urgency/scarcity pressure detected.
- "sayThis" should acknowledge but stay firm on OTD
- Example: "I understand. I still need $${t} OTD to move forward"
- "redFlags" must include "Pressure to decide without OTD breakdown"`:U.includes("counter OTD")?e=`SITUATION-SPECIFIC: Counter OTD received.
- "sayThis" should acknowledge and restate target: "I appreciate that. I'm still at $${t} OTD"
- "ladder.ask" should be the counter they offered
- "ladder.agree" should be your target OTD
- "ladder.walk" should be your walk-away number`:U.includes("Trade-in lowball")?e=`SITUATION-SPECIFIC: Trade-in lowball detected.
- "sayThis" should separate trade-in from purchase: "Let's handle the trade-in separately. What's the OTD on the car?"
- "ifPushback" should offer to sell trade-in elsewhere if they won't negotiate`:U.includes("close if they hit my OTD")&&(e=`SITUATION-SPECIFIC: Ready to close at target OTD.
- "sayThis" should be direct closing: "If you can do $${t} OTD, I'm ready to move forward"
- "closingLine" should be firm: "I'm ready to sign at $${t} OTD"
- "nextMove" should be: "Wait for their response. If they agree, request written OTD breakdown"`)),a="",i&&i.length>0&&(a=`
DETECTED DEALER TACTICS: ${i.join(", ")}
`,i.includes("payment_anchoring")&&(a+=`- Payment anchoring detected: Refuse monthly payment talk, redirect to OTD
`),i.includes("urgency")&&(a+=`- Urgency pressure detected: Acknowledge but stay firm on OTD
`),i.includes("add_on_push")&&(a+=`- Add-on push detected: Request breakdown, offer to adjust sale price
`),i.includes("escalation")&&(a+=`- Manager escalation detected: Be firm and closing-oriented
`)),o=`You are an expert in-person car buying negotiation coach. Generate SHORT, SPOKEN talk tracks for face-to-face dealership negotiations.

CRITICAL IN-PERSON RULES:
1. ALL responses must be 1-2 sentences MAX - designed to be spoken out loud
2. Use spoken-language tone (natural, conversational, not email-style)
3. End with silence - let the dealer respond, don't over-explain
4. Always focus on OTD (Out-The-Door) price
5. Be firm, calm, and OTD-focused - no hedging or soft language
6. Generate concise, repeatable phrases the user can say immediately
7. Avoid long explanations in the main output
8. Output must be SITUATION-SPECIFIC - directly address the selected situation

BUYER TYPE: ${O}
STAGE: ${k} (IN-PERSON MODE)
TONE: ${b}
GOAL: ${A}
VEHICLE PRICE: $${D}
DESIRED OTD: $${t}
${R?`STATE: ${R}${s?` (Tax rate: ~${s}%)`:""}`:""}
${U?`SITUATION: ${U}`:""}
${e}
${a}

Your response MUST be a JSON object with this EXACT structure. ALL fields are REQUIRED:
{
  "sayThis": "<Primary talk track, 1-2 sentences, spoken language, <= 100 chars. MUST directly address the situation>",
  "ifPushback": "<Response if dealer pushes back, 1-2 sentences, <= 100 chars>",
  "ifManager": "<Response if manager joins, 1-2 sentences, <= 100 chars. Must be firm and closing-oriented>",
  "stopSignal": "<What to do next physically, e.g., 'Repeat $${t} OTD and stay silent', <= 80 chars>",
  "closingLine": "<One firm closing statement, no hedging, <= 100 chars>",
  "nextMove": "<What to do physically next (stand up, wait, request breakdown, etc.), <= 120 chars>",
  "ladder": {
    "ask": "<First number to ask for (usually their counter or a middle ground), <= 80 chars>",
    "agree": "<Number you'll agree to (your target OTD: $${t}), <= 80 chars>",
    "walk": "<Number where you walk away (usually target + $500-1000), <= 80 chars>"
  },
  "redFlags": [
    "<Red flag 1, max 60 chars>",
    "<Red flag 2, max 60 chars>",
    "<Red flag 3, max 60 chars>"
  ],
  "doNotSay": [
    "<Common mistake 1, max 60 chars>",
    "<Common mistake 2, max 60 chars>"
  ],
  "assumptions": {
    "taxBaseRate": ${s||6.5},
    "feeAssumptions": "Doc fee: $150-500, Title/Registration: $50-200",
    "disclaimer": "Tax and fee rules vary by state and locality. Always verify final numbers with the dealer or DMV."
  }
}

CRITICAL: You MUST return ALL fields. Missing fields will cause an error. The output MUST be situation-specific, not generic.`,r=`IN-PERSON NEGOTIATION MODE - SITUATION-SPECIFIC OUTPUT REQUIRED:
`,U&&(r+=`PRIMARY SITUATION: ${U}
Your talk tracks MUST directly address this situation. Do NOT give generic responses.

`),M&&(r+=`DEALER SAID: "${M}"
`,i&&i.length>0&&(r+=`Detected tactics: ${i.join(", ")}
`),r+=`Respond directly to what they said, using situation-specific language.

`),h=r+=`REQUIRED OUTPUT STRUCTURE:
- "sayThis": Primary response RIGHT NOW (1-2 sentences, spoken, <= 100 chars). MUST address the situation.
- "ifPushback": If they resist (1-2 sentences, spoken, <= 100 chars)
- "ifManager": If manager joins (1-2 sentences, firm, closing-oriented, <= 100 chars)
- "stopSignal": Physical action to take next (e.g., "Repeat $${v||"[OTD]"} OTD and stay silent", <= 80 chars)
- "closingLine": ONE firm closing statement (no hedging, <= 100 chars)
- "nextMove": What to do physically next (stand, wait, request breakdown, etc., <= 120 chars)
- "ladder": Your 3-number negotiation ladder:
  - "ask": First number to ask (their counter or middle ground, <= 80 chars)
  - "agree": Your target OTD ($${v||"[OTD]"}, <= 80 chars)
  - "walk": Walk-away number (target + $500-1000, <= 80 chars)
- "redFlags": Exactly 3 things to watch for (max 60 chars each)
- "doNotSay": Exactly 2 common mistakes to avoid (max 60 chars each)

CRITICAL REQUIREMENTS:
- ALL fields are REQUIRED. Missing fields = error.
- Output MUST be situation-specific, not generic.
- Talk tracks must directly address the selected situation.
- Use spoken language, 1-2 sentences max per field.
- Return ONLY valid JSON.`}else if("first_time"===j){let e=!!M&&/monthly\s+payment|payment\s+per\s+month|what.*monthly|monthly\s+amount/i.test(M),t=p(A,k,O,e),a=m(t,b,A,v?parseFloat(v):void 0,E?parseFloat(E):void 0,x?parseFloat(x):void 0,{vehiclePrice:parseFloat(D),stage:k,hasCompetitiveOffers:P||!1,buyerType:O,dealerMentionsMonthlyPayment:e});f(t,A,!!E,P||!1),y(v?parseFloat(v):void 0,n,A),o=`You are an expert car buying negotiation coach. Generate realistic pushback scenarios for negotiation messages.

Your job is to provide:
1. If They Push Back (only 2 realistic responses)
2. What NOT to Say Next

The message itself is already assembled from a playbook. The "Why This Works" section is already provided. Focus ONLY on realistic dealer pushback scenarios and what to avoid saying.

Tone: ${b}
Goal: ${A}
Stage: ${k}
Buyer Type: ${O}
${v?`Desired OTD: $${v}`:""}

Your response must be a JSON object with this exact structure:
{
  "ifTheyPushBack": [
    {"dealerReply": "<realistic pushback 1>", "suggestedResponse": "<short email/text response, <= 120 chars>"},
    {"dealerReply": "<realistic pushback 2>", "suggestedResponse": "<short email/text response, <= 120 chars>"}
  ],
  "whatNotToSay": [
    "What's the monthly payment?",
    "I love this car",
    "This is my first time buying"
  ]
}`,h=`Generate pushback scenarios for this negotiation message:

Message: "${a}"

Playbook: ${t}

Provide:
1. If They Push Back (only 2 realistic dealer responses with short email/text replies)
2. What NOT to Say Next (common mistakes to avoid)`}else{let e;r=n,o=`You are an expert car buying negotiation coach. Generate structured negotiation messages for free-tier users.

CRITICAL RULES:
1. Always focus on OTD (Out-The-Door) price unless user explicitly includes financing details
2. Keep ALL messages concise (<= 800 characters)
3. If desiredOTD is provided, include a clear close: "If you can do $X OTD, I can move forward today"
4. If stage is "after_quote", reference their quote and counter to OTD
5. If contextText (dealer message) is provided, summarize it in 1 line and respond to it
6. Free tier: Light reference to competitive offers (e.g., "I'm comparing a couple options") - no full leverage scripts
7. Match the user's tone preference (${b})
8. Be specific and actionable, ready to copy/paste

BUYER TYPE: ${O}
STAGE: ${k}
TONE: ${b}
GOAL: ${A}
VEHICLE PRICE: $${D}
${v?`DESIRED OTD: $${v}`:""}
${R?`STATE: ${R}${r?` (Tax rate: ~${r}%)`:""}`:""}

Your response must be a JSON object with this exact structure:
{
  "bestNextMessage": "<the best message ready to send, <= 800 chars>",
  "whyThisWorks": "<1-2 sentences explaining why this message works: keeps focus on OTD, avoids monthly payment traps, gets everything in writing>",
  "alternate1": "<more friendly version, <= 800 chars>",
  "alternate2": "<more firm version, <= 800 chars>",
  "checklist": [
    "Written itemized OTD (sale price, tax, doc, title/registration)",
    "Full list of dealer add-ons (and whether removable)",
    "VIN / stock number confirmation",
    "Quote expiration / validity window"
  ],
  "decisionTree": [
    {
      "dealerReply": "<common dealer reply 1>",
      "suggestedResponse": "<your suggested response, <= 200 chars>"
    },
    {
      "dealerReply": "<common dealer reply 2>",
      "suggestedResponse": "<your suggested response, <= 200 chars>"
    },
    {
      "dealerReply": "<common dealer reply 3 - choose a fee-related one>",
      "suggestedResponse": "<partial response that addresses it but leaves room for deeper tactics, <= 200 chars>"
    }
  ],
  "assumptions": {
    "taxBaseRate": ${r||6.5},
    "feeAssumptions": "Doc fee: $150-500, Title/Registration: $50-200",
    "disclaimer": "Tax and fee rules vary by state and locality. Always verify final numbers with the dealer or DMV."
  }
}`,e=`Generate negotiation messages for this situation:

`,M&&(e+=`DEALER MESSAGE TO RESPOND TO:
${M}

Summarize their message in 1 line and craft a response.

`),"after_quote"===k&&(e+=`STAGE: After Quote Received
- Reference their quote
- Counter to OTD price
- Focus on total cost, not monthly payment

`),v&&(e+=`DESIRED OTD: $${v}
- Include clear close: "If you can do $${v} OTD, I can move forward today"

`),"close_today"===A&&v&&(e+=`GOAL: Close Today
- Create urgency
- Use desired OTD as final offer
- Make it clear you're ready to buy if they meet your number

`),E||x?(e+=`FINANCING DETAILS INCLUDED:
`,E&&(e+=`- Pre-approval APR: ${E}%
`),x&&(e+=`- Max monthly: $${x}
`),e+=`- Still focus on OTD first, then mention financing if relevant

`):e+=`NO FINANCING DETAILS: Focus exclusively on OTD price.

`,P&&(e+=`COMPETITIVE CONTEXT: User has other offers. Light reference only (e.g., "I'm comparing a couple options"). Don't provide full leverage scripts.

`),h=e+=`IMPORTANT FOR FREE TIER:
- Keep explanations concise and practical
- Focus on OTD, avoiding monthly payment traps, getting in writing
- Do NOT include pack-level tactics or advanced scripts
- For the third dealer reply, choose a fee-related scenario and provide a partial response that works but hints at deeper tactics
- Never use "AI-ish" language - write naturally and confidently

Generate the structured response now. Return ONLY valid JSON.`}let V={};if("first_time"===j){let e=await Y.chat.completions.create({model:"gpt-4o-mini",messages:[{role:"system",content:o},{role:"user",content:h}],response_format:{type:"json_object"},temperature:.7});V=JSON.parse(e.choices[0].message.content||"{}")}else{let e=await Y.chat.completions.create({model:"gpt-4o-mini",messages:[{role:"system",content:o},{role:"user",content:h}],response_format:{type:"json_object"},temperature:.7});V=JSON.parse(e.choices[0].message.content||"{}")}let B=(e,t)=>e?e.length<=t?e:e.substring(0,t-3)+"...":"";if(q){let e=["sayThis","ifPushback","ifManager","stopSignal","closingLine","nextMove","ladder","redFlags","doNotSay"],t=e.filter(e=>"ladder"===e?!V.ladder||!V.ladder.ask||!V.ladder.agree||!V.ladder.walk:!V[e]);if(t.length>0){console.warn("In-person response missing fields:",t);let a=h+"\n\nCRITICAL: You must return ALL required fields: sayThis, ifPushback, ifManager, stopSignal, closingLine, nextMove, ladder (with ask/agree/walk), redFlags (array of 3), doNotSay (array of 2). Missing fields: "+t.join(", ");try{let t=await Y.chat.completions.create({model:"gpt-4o-mini",messages:[{role:"system",content:o},{role:"user",content:a}],response_format:{type:"json_object"},temperature:.7}),s=JSON.parse(t.choices[0].message.content||"{}"),r=e.filter(e=>"ladder"===e?!s.ladder||!s.ladder.ask||!s.ladder.agree||!s.ladder.walk:!s[e]);if(0===r.length)Object.assign(V,s);else{console.error("In-person response still invalid after retry, using situation-specific fallback");let e=v?v+750:0,t=v?`I need $${v} OTD. Can you show me the breakdown?`:"I need the full out-the-door price breakdown.",a="Wait for their response. If they agree, request written OTD breakdown.";return U?.includes("monthly payment")?(t="I'm focused on the total out-the-door price, not monthly payments. What's your OTD?",a="Wait for OTD breakdown. If they persist with monthly talk, repeat: 'I need the OTD number.'"):U?.includes("add-ons")?(t="I need to see which add-ons are removable. Can you show me the breakdown?",a="Review breakdown. If add-ons are removable, request removal. If not, offer to adjust sale price."):U?.includes("sign today")&&(t=v?`I sign when the OTD sheet matches $${v}. Show me the breakdown.`:"I sign when the OTD sheet matches my target. Show me the breakdown.",a="Wait for written OTD breakdown. Verify it matches your target before signing."),g={sayThis:t,ifPushback:"I understand. I still need the full OTD breakdown to make a decision.",ifManager:v?`I need $${v} OTD. Can you make that happen?`:"I need my target OTD. Can you make that happen?",stopSignal:v?`Repeat $${v} OTD and stay silent.`:"Repeat your target OTD and stay silent.",closingLine:v?`If you can do $${v} OTD, I'm ready to move forward.`:"I need my target OTD to move forward.",nextMove:a,ladder:{ask:v?`Ask for $${v-500} OTD`:"Ask for target OTD minus $500",agree:v?`Agree at $${v} OTD`:"Agree at target OTD",walk:v?`Walk at $${e} OTD`:"Walk at target + $750"},redFlags:["They won't provide written OTD breakdown","Pressure to sign today without seeing all fees","Monthly payment focus instead of total price"],doNotSay:["What's the monthly payment?","I need to think about it"+(v?"":" (without getting OTD first)")],assumptions:{taxBaseRate:n,feeAssumptions:"Doc fee: $150-500, Title/Registration: $50-200",disclaimer:"Tax and fee rules vary by state and locality. Always verify final numbers with the dealer or DMV."}},i.NextResponse.json({success:!0,data:g,effectiveMode:j,entitlementCheck:W})}}catch(s){console.error("Retry failed, using situation-specific fallback:",s);let e=v?v+750:0,t=v?`I need $${v} OTD. Can you show me the breakdown?`:"I need the full out-the-door price breakdown.",a="Wait for their response. If they agree, request written OTD breakdown.";return U?.includes("monthly payment")?(t="I'm focused on the total out-the-door price, not monthly payments. What's your OTD?",a="Wait for OTD breakdown. If they persist with monthly talk, repeat: 'I need the OTD number.'"):U?.includes("add-ons")?(t="I need to see which add-ons are removable. Can you show me the breakdown?",a="Review breakdown. If add-ons are removable, request removal. If not, offer to adjust sale price."):U?.includes("sign today")&&(t=v?`I sign when the OTD sheet matches $${v}. Show me the breakdown.`:"I sign when the OTD sheet matches my target. Show me the breakdown.",a="Wait for written OTD breakdown. Verify it matches your target before signing."),g={sayThis:t,ifPushback:"I understand. I still need the full OTD breakdown to make a decision.",ifManager:v?`I need $${v} OTD. Can you make that happen?`:"I need my target OTD. Can you make that happen?",stopSignal:v?`Repeat $${v} OTD and stay silent.`:"Repeat your target OTD and stay silent.",closingLine:v?`If you can do $${v} OTD, I'm ready to move forward.`:"I need my target OTD to move forward.",nextMove:a,ladder:{ask:v?`Ask for $${v-500} OTD`:"Ask for target OTD minus $500",agree:v?`Agree at $${v} OTD`:"Agree at target OTD",walk:v?`Walk at $${e} OTD`:"Walk at target + $750"},redFlags:["They won't provide written OTD breakdown","Pressure to sign today without seeing all fees","Monthly payment focus instead of total price"],doNotSay:["What's the monthly payment?","I need to think about it"+(v?"":" (without getting OTD first)")],assumptions:{taxBaseRate:n,feeAssumptions:"Doc fee: $150-500, Title/Registration: $50-200",disclaimer:"Tax and fee rules vary by state and locality. Always verify final numbers with the dealer or DMV."}},i.NextResponse.json({success:!0,data:g,effectiveMode:j,entitlementCheck:W})}}let a=v?v+750:0;g={sayThis:B(V.sayThis||(v?`I need $${v} OTD. Can you show me the breakdown?`:"I need the full out-the-door price breakdown."),100),ifPushback:B(V.ifPushback||"I understand. I still need the full OTD breakdown to make a decision.",100),ifManager:B(V.ifManager||(v?`I need $${v} OTD. Can you make that happen?`:"I need my target OTD. Can you make that happen?"),100),stopSignal:B(V.stopSignal||(v?`Repeat $${v} OTD and stay silent.`:"Repeat your target OTD and stay silent."),80),closingLine:B(V.closingLine||(v?`If you can do $${v} OTD, I'm ready to move forward.`:"I need my target OTD to move forward."),100),nextMove:B(V.nextMove||"Wait for their response. If they agree, request written OTD breakdown.",120),ladder:V.ladder&&V.ladder.ask&&V.ladder.agree&&V.ladder.walk?{ask:B(V.ladder.ask,80),agree:B(V.ladder.agree,80),walk:B(V.ladder.walk,80)}:{ask:v?`Ask for $${v-500} OTD`:"Ask for target OTD minus $500",agree:v?`Agree at $${v} OTD`:"Agree at target OTD",walk:v?`Walk at $${a} OTD`:"Walk at target + $750"},redFlags:Array.isArray(V.redFlags)&&V.redFlags.length>=3?V.redFlags.slice(0,3).map(e=>B(e,60)):["They won't provide written OTD breakdown","Pressure to sign today without seeing all fees","Monthly payment focus instead of total price"],doNotSay:Array.isArray(V.doNotSay)&&V.doNotSay.length>=2?V.doNotSay.slice(0,2).map(e=>B(e,60)):["What's the monthly payment?","I need to think about it"+(v?"":" (without getting OTD first)")],assumptions:{taxBaseRate:n,feeAssumptions:V.assumptions?.feeAssumptions||"Doc fee: $150-500, Title/Registration: $50-200",disclaimer:V.assumptions?.disclaimer||"Tax and fee rules vary by state and locality. Always verify final numbers with the dealer or DMV."}}}else if("first_time"===j){let e=!!M&&/monthly\s+payment|payment\s+per\s+month|what.*monthly|monthly\s+amount/i.test(M),t=p(A,k,O,e),a=m(t,b,A,v?parseFloat(v):void 0,E?parseFloat(E):void 0,x?parseFloat(x):void 0,{vehiclePrice:parseFloat(D),stage:k,hasCompetitiveOffers:P||!1,buyerType:O,dealerMentionsMonthlyPayment:e}),s=f(t,A,!!E,P||!1),r=y(v?parseFloat(v):void 0,n,A),o=s.slice(0,3);g={bestNextMessage:B(a,800),whyThisWorks:o,confidenceCheck:r,ifTheyPushBack:Array.isArray(V.ifTheyPushBack)&&V.ifTheyPushBack.length>=2?V.ifTheyPushBack.slice(0,2).map(e=>({dealerReply:e.dealerReply||"Common dealer pushback",suggestedResponse:B(e.suggestedResponse||"Short response",120)})):[{dealerReply:"They ask about monthly payments",suggestedResponse:"I'm only discussing OTD, not payments. Send the breakdown."},{dealerReply:"They add fees or raise the price",suggestedResponse:"Which fees are optional? Remove them and send updated OTD."}],whatNotToSay:Array.isArray(V.whatNotToSay)&&V.whatNotToSay.length>=3?V.whatNotToSay.slice(0,3):["What's the monthly payment?","I love this car","This is my first time buying"],assumptions:{taxBaseRate:n,feeAssumptions:R?`Based on ${R} state fees`:"",disclaimer:"This draft is designed for email or text. For live dealership negotiations, switch to the In-Person Negotiation Pack."}}}else{if(!V.bestNextMessage)throw Error("Invalid response format from AI: missing bestNextMessage");g={bestNextMessage:B(V.bestNextMessage,800),whyThisWorks:V.whyThisWorks||"This keeps the conversation focused on total cost (OTD), avoids monthly payment traps, and asks for everything in writing.",alternate1:B(V.alternate1||V.bestNextMessage,800),alternate2:B(V.alternate2||V.bestNextMessage,800),checklist:Array.isArray(V.checklist)&&V.checklist.length>=4?V.checklist.slice(0,4):["Written itemized OTD (sale price, tax, doc, title/registration)","Full list of dealer add-ons (and whether removable)","VIN / stock number confirmation","Quote expiration / validity window"],decisionTree:Array.isArray(V.decisionTree)&&V.decisionTree.length>=3?V.decisionTree.slice(0,3).map((e,t)=>({dealerReply:e.dealerReply||"Common dealer response",suggestedResponse:B(e.suggestedResponse||"",200),isIncomplete:2===t})):[{dealerReply:"We can't go lower than this",suggestedResponse:"I understand. Can you show me the itemized breakdown? I'd like to see where we can adjust fees or add-ons.",isIncomplete:!1},{dealerReply:"This price is only good today",suggestedResponse:v?`I appreciate the urgency. If you can do $${v} OTD, I can move forward today.`:"I appreciate the urgency. If you can do $[desiredOTD] OTD, I can move forward today.",isIncomplete:!1},{dealerReply:"Our fees are higher than expected",suggestedResponse:v?`I understand. Can you share a full breakdown of the fees? I'm still targeting $${v} OTD.`:"I understand. Can you share a full breakdown of the fees? I'm still targeting $[desiredOTD] OTD.",isIncomplete:!0}],assumptions:{taxBaseRate:n,feeAssumptions:V.assumptions?.feeAssumptions||"Doc fee: $150-500, Title/Registration: $50-200",disclaimer:V.assumptions?.disclaimer||"Tax and fee rules vary by state and locality. Always verify final numbers with the dealer or DMV."}}}return i.NextResponse.json({success:!0,data:g,effectiveMode:j,entitlementCheck:W})}catch(e){return console.error("Error generating copilot response:",e),i.NextResponse.json({success:!1,error:e.message||"Failed to generate response"},{status:500})}}let T=new r.AppRouteRouteModule({definition:{kind:n.x.APP_ROUTE,page:"/api/copilot/generate/route",pathname:"/api/copilot/generate",filename:"route",bundlePath:"app/api/copilot/generate/route"},resolvedPagePath:"C:\\dev\\Dealership Copilot\\app\\api\\copilot\\generate\\route.ts",nextConfigOutput:"",userland:s}),{requestAsyncStorage:I,staticGenerationAsyncStorage:w,serverHooks:O}=T,k="/api/copilot/generate/route";function b(){return(0,o.patchFetch)({serverHooks:O,staticGenerationAsyncStorage:w})}},8563:(e,t,a)=>{a.d(t,{$:()=>n});var s=a(54214);let r=null;function n(){if(!r){let e=process.env.OPENAI_API_KEY;if(!e)throw Error("OPENAI_API_KEY is not set");r=new s.ZP({apiKey:e})}return r}},19692:(e,t,a)=>{a.d(t,{$:()=>i,f:()=>l});var s=a(67721),r=a(71615);let n="https://vabikejehdmpfcyqrgrs.supabase.co",o="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhYmlrZWplaGRtcGZjeXFyZ3JzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NzAzNDAsImV4cCI6MjA4MTA0NjM0MH0.X_Z7szu62swGviqYgtI2mxV3F1vX4UBYpuZYV2n7h4Q";if(!n||!o){let e=[];throw n||e.push("NEXT_PUBLIC_SUPABASE_URL"),o||e.push("NEXT_PUBLIC_SUPABASE_ANON_KEY"),Error(`[CRITICAL] Missing required Supabase environment variables: ${e.join(", ")}. These must be set in Vercel environment variables.`)}if(n.includes("placeholder")||o.includes("placeholder"))throw Error("[CRITICAL] Supabase environment variables contain placeholder values. Please set real values in Vercel environment variables.");if(n.length<10||o.length<10)throw Error("[CRITICAL] Supabase environment variables appear to be invalid (too short). Please verify they are set correctly in Vercel.");function i(){let e=(0,r.cookies)();return(0,s.createServerClient)("https://vabikejehdmpfcyqrgrs.supabase.co","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhYmlrZWplaGRtcGZjeXFyZ3JzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NzAzNDAsImV4cCI6MjA4MTA0NjM0MH0.X_Z7szu62swGviqYgtI2mxV3F1vX4UBYpuZYV2n7h4Q",{cookies:{getAll:()=>e.getAll(),setAll(t){try{t.forEach(({name:t,value:a,options:s})=>{e.set(t,a,s)})}catch(e){}}}})}let l=i},74918:(e,t,a)=>{a.d(t,{A:()=>i});var s=a(93950);async function r(e){let t=process.env.TAXJAR_API_KEY;if(!t)return null;try{let a=await fetch(`https://api.taxjar.com/v2/rates/${e}`,{headers:{Authorization:`Bearer ${t}`,"Content-Type":"application/json"}});if(!a.ok)return null;let s=await a.json();return s.rate?.combined_rate?100*parseFloat(s.rate.combined_rate):null}catch(e){return console.warn("TaxJar lookup failed:",e),null}}async function n(e,t){let a=process.env.AVALARA_ACCOUNT_ID,s=process.env.AVALARA_LICENSE_KEY;if(!a||!s)return null;try{let t=`${a}:${s}`,r="undefined"!=typeof Buffer?Buffer.from(t).toString("base64"):btoa(t),n=await fetch(`https://rest.avatax.com/api/v2/taxrates/bypostalcode?country=US&postalCode=${e}`,{headers:{Authorization:`Basic ${r}`,"Content-Type":"application/json"}});if(!n.ok)return null;let o=await n.json();return o.totalRate?100*parseFloat(o.totalRate):null}catch(e){return console.warn("Avalara lookup failed:",e),null}}function o(e){let t=e.toUpperCase().trim();return["CA","NY","IL","TX","FL","PA"].includes(t)?{low:.5,high:2.5}:["CO","MO","OH","MI","NC","GA"].includes(t)?{low:.25,high:1.5}:{low:0,high:1}}async function i(e,t){let a=e.toUpperCase().trim(),i=(0,s.getTaxRateForState)(a);if(!i&&0!==i)return{stateBaseRate:0,combinedRateRange:{low:0,high:0},confidence:"low",source:"state_estimate",provider:"fallback",disclaimer:"State not found in tax rate table. Please verify tax rate manually."};if(t){let e=t.replace(/[^0-9]/g,"").slice(0,5),s=await r(e);if(null!==s){let e=s-i;return{stateBaseRate:i,estimatedLocalAddOn:e>0?e:0,combinedRate:s,confidence:"high",source:"zip_lookup",provider:"taxjar",disclaimer:"Rate based on ZIP code lookup. Vehicle tax rules vary by state and may differ from general sales tax. Verify with dealer itemization."}}let l=await n(e,a);if(null!==l){let e=l-i;return{stateBaseRate:i,estimatedLocalAddOn:e>0?e:0,combinedRate:l,confidence:"high",source:"zip_lookup",provider:"avalara",disclaimer:"Rate based on ZIP code lookup. Vehicle tax rules vary by state and may differ from general sales tax. Verify with dealer itemization."}}let d=o(a),c=i+d.low,u=i+d.high;return{stateBaseRate:i,estimatedLocalAddOn:(d.low+d.high)/2,combinedRateRange:{low:c,high:u},confidence:"medium",source:"state_table",provider:"fallback",disclaimer:"ZIP lookup unavailable. Using state base rate + estimated local range. Vehicle tax rules vary by state and may differ from general sales tax. Verify with dealer itemization."}}let l=o(a),d=i+l.low,c=i+l.high;return{stateBaseRate:i,estimatedLocalAddOn:(l.low+l.high)/2,combinedRateRange:{low:d,high:c},confidence:"low",source:"state_estimate",provider:"fallback",disclaimer:"ZIP code not provided. Using state base rate + estimated local range. For accurate rates, provide ZIP code. Vehicle tax rules vary by state and may differ from general sales tax. Verify with dealer itemization."}}},93950:(e,t,a)=>{a.r(t),a.d(t,{formatStateName:()=>n,getTaxRateForState:()=>r,stateTaxRates:()=>s});let s={AL:2,AK:0,AZ:5.6,AR:6.5,CA:7.25,CO:2.9,CT:6.35,DE:0,FL:6,GA:4,HI:4.17,ID:6,IL:6.25,IN:7,IA:6,KS:6.5,KY:6,LA:4.45,ME:5.5,MD:6,MA:6.25,MI:6,MN:6.875,MS:5,MO:4.225,MT:0,NE:5.5,NV:6.85,NH:0,NJ:6.625,NM:5.125,NY:4,NC:4.75,ND:5,OH:5.75,OK:4.5,OR:0,PA:6,RI:7,SC:6,SD:4.5,TN:7,TX:6.25,UT:4.85,VT:6,VA:4.3,WA:6.5,WV:6,WI:5,WY:4,DC:6};function r(e){return s[e.toUpperCase().trim()]??null}function n(e){return({AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",CO:"Colorado",CT:"Connecticut",DE:"Delaware",FL:"Florida",GA:"Georgia",HI:"Hawaii",ID:"Idaho",IL:"Illinois",IN:"Indiana",IA:"Iowa",KS:"Kansas",KY:"Kentucky",LA:"Louisiana",ME:"Maine",MD:"Maryland",MA:"Massachusetts",MI:"Michigan",MN:"Minnesota",MS:"Mississippi",MO:"Missouri",MT:"Montana",NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",NJ:"New Jersey",NM:"New Mexico",NY:"New York",NC:"North Carolina",ND:"North Dakota",OH:"Ohio",OK:"Oklahoma",OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",VA:"Virginia",WA:"Washington",WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming",DC:"District of Columbia"})[e.toUpperCase()]||e}}};var t=require("../../../../webpack-runtime.js");t.C(e);var a=e=>t(t.s=e),s=t.X(0,[8948,5972,7857,9702,4214],()=>a(83675));module.exports=s})();