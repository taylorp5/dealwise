"use strict";(()=>{var e={};e.id=6698,e.ids=[6698],e.modules={72934:e=>{e.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:e=>{e.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:e=>{e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},92048:e=>{e.exports=require("fs")},32615:e=>{e.exports=require("http")},35240:e=>{e.exports=require("https")},55315:e=>{e.exports=require("path")},68621:e=>{e.exports=require("punycode")},76162:e=>{e.exports=require("stream")},17360:e=>{e.exports=require("url")},21764:e=>{e.exports=require("util")},6162:e=>{e.exports=require("worker_threads")},71568:e=>{e.exports=require("zlib")},87561:e=>{e.exports=require("node:fs")},84492:e=>{e.exports=require("node:stream")},72477:e=>{e.exports=require("node:stream/web")},92451:(e,t,a)=>{a.r(t),a.d(t,{originalPathname:()=>w,patchFetch:()=>E,requestAsyncStorage:()=>T,routeModule:()=>y,serverHooks:()=>O,staticGenerationAsyncStorage:()=>f});var n={};a.r(n),a.d(n,{POST:()=>m});var r=a(49303),s=a(88716),o=a(60670),i=a(87070),l=a(19692),d=a(37857),c=a(54214);function u(e){let t=e.toLowerCase();return t.includes("monthly payment")?"Payment anchoring":t.includes("add-ons")||t.includes("mandatory")?"Add-on shove":t.includes("fees")&&t.includes("non-negotiable")?"Fee wall":t.includes("manager")?"Manager escalation":t.includes("sign today")||t.includes("commit")?"Commitment pressure":t.includes("someone else")||t.includes("urgency")?"Urgency":t.includes("trade-in")||t.includes("lowball")?"Trade-in lowball":t.includes("counter")?"Counter offer":"Standard negotiation"}function g(e){let t=e.toLowerCase(),a=[];return(t.includes("monthly")||t.includes("payment"))&&a.push("Payment anchoring"),(t.includes("today only")||t.includes("someone else")||t.includes("won't last"))&&a.push("Urgency"),(t.includes("add-on")||t.includes("protection")||t.includes("nitrogen")||t.includes("etch"))&&a.push("Add-on shove"),(t.includes("manager")||t.includes("talk to my manager"))&&a.push("Manager escalation"),t.includes("fees")&&(t.includes("non-negotiable")||t.includes("fixed"))&&a.push("Fee wall"),(t.includes("sign today")||t.includes("commit now"))&&a.push("Commitment pressure"),t.includes("trade")&&(t.includes("low")||t.includes("best"))&&a.push("Trade-in lowball"),a.length>0?a:["Standard negotiation"]}let p=process.env.OPENAI_API_KEY?new c.ZP({apiKey:process.env.OPENAI_API_KEY}):null;function h(e){let t=e.dealerCurrentOTD?e.dealerCurrentOTD-e.targetOTD:void 0,a=function(e,t){let a=u(e),n=t?g(t):[a],r="Standard negotiation tactic",s="Low",o="Stay firm on your target OTD";return n.includes("Payment anchoring")?(r="They want to shift focus from total cost to monthly payment",s="High - can hide true cost",o='Redirect to OTD: "I focus on total out-the-door price, not monthly payments"'):n.includes("Urgency")?(r="Creating false scarcity to pressure quick decision",s="Medium - may cause rushed decision",o='Acknowledge but stay firm: "I understand, but I still need $X OTD"'):n.includes("Add-on shove")?(r="Adding mandatory items to increase total cost",s="High - can inflate OTD significantly",o="Request breakdown and ask which add-ons are removable"):n.includes("Manager escalation")?(r="Using authority figure to apply pressure",s="Medium - psychological pressure",o='Be firm and direct: "I need $X OTD. Can you make that happen?"'):n.includes("Fee wall")?(r="Claiming fees are fixed to prevent negotiation",s="Medium - may be negotiable despite claim",o="Request itemized breakdown and offer to adjust sale price to hit target OTD"):n.includes("Commitment pressure")&&(r="Pushing for immediate commitment before full disclosure",s="High - may hide costs",o='Set condition: "I sign when the OTD sheet matches $X"'),{tactic:n[0],whyNow:r,risk:s,bestResponse:o}}(e.situation||"",e.dealerSaid),n=e.dealerSaid?g(e.dealerSaid):e.situation?[u(e.situation)]:["Standard negotiation"],r=`I need $${e.targetOTD.toLocaleString()} OTD. Can you show me the breakdown?`,s="I understand. I still need the full OTD breakdown to make a decision.",o=`I need $${e.targetOTD.toLocaleString()} OTD. Can you make that happen?`,i=`If you can do $${e.targetOTD.toLocaleString()} OTD, I'm ready to move forward.`;e.situation?.includes("monthly payment")||"monthly_payment"===e.quickAction?(r="I'm focused on the total out-the-door price, not monthly payments. What's your OTD?",s="I need the OTD number, not monthly payment talk."):e.situation?.includes("add-ons")||"mandatory_addons"===e.quickAction?(r="I need to see which add-ons are removable. Can you show me the breakdown?",s="If add-ons are fixed, let's adjust the sale price to hit my target OTD."):(e.situation?.includes("sign today")||"sign_today"===e.quickAction)&&(r=`I sign when the OTD sheet matches $${e.targetOTD.toLocaleString()}. Show me the breakdown.`,i=`I'm ready to sign at $${e.targetOTD.toLocaleString()} OTD.`),e.ladder.locked&&(e.dealerCurrentOTD&&e.dealerCurrentOTD>e.ladder.walk?(r=`That's above my walk-away number. I need $${e.ladder.agree.toLocaleString()} OTD.`,i=`I can't go above $${e.ladder.walk.toLocaleString()}. My target is $${e.ladder.agree.toLocaleString()} OTD.`):i=`If you can do $${e.ladder.agree.toLocaleString()} OTD, I'm ready to move forward.`);let l="Request written itemized OTD breakdown";1===e.step?l="wont_give"===e.quickAction?'Stay firm: "I need the written OTD worksheet before we discuss anything else."':"monthly_payment"===e.quickAction?'Redirect: "I\'m focused on the total out-the-door price. Can you print the OTD worksheet?"':"has_addons"===e.quickAction||"mandatory_addons"===e.quickAction?'Request clarification: "Which add-ons are removable? Show me the breakdown."':"Get the full itemized OTD breakdown on one sheet before proceeding":2===e.step?l=e.dealerCurrentOTD?a.bestResponse||"Stay firm on your target OTD":a.bestResponse||"Continue pushing for the written OTD worksheet":3===e.step?l=e.dealerCurrentOTD?e.targetOTD&&0!==e.targetOTD?t&&t>1e3?"Request itemized breakdown and negotiate sale price reduction, or walk if they refuse":t&&t<=0?"Review breakdown and confirm it matches your target OTD, then close":"Push for your target OTD using the closing line":"Set a target OTD based on the dealer's offer, then negotiate from there":"You still need the written OTD worksheet. Go back to Step 1 and use those scripts.":4===e.step&&(l="Update dealer OTD and get new coaching based on the latest offer");let d={"Monthly payment push":"payment_anchoring","Urgency pressure":"urgency","Mandatory add-ons":"addons","Fee justification":"fees","Manager involvement":"manager","Counter OTD":"counter_otd","Trade-in lowball":"trade_in_lowball",Stalling:"stalling"}[n[0]]||"standard";return{tacticLabel:n[0],tacticType:d,nextMove:l,sayThis:r,ifPushback:s,ifManager:o,stopSignal:`Repeat $${e.targetOTD.toLocaleString()} OTD and stay silent.`,closingLine:i,redFlags:["They won't provide written OTD breakdown","Pressure to sign today without seeing all fees","Monthly payment focus instead of total price"],doNotSay:["What's the monthly payment?","I need to think about it"+(e.dealerCurrentOTD?"":" (without getting OTD first)")]}}async function m(e){try{var t,a;let n=null,r=e.headers.get("authorization");if(r?.startsWith("Bearer ")){let e=r.substring(7),t=await (0,l.f)(),{data:{user:a},error:s}=await t.auth.getUser(e);a&&!s&&(n=a.id)}if(!n){let e=await (0,l.f)(),{data:{session:t}}=await e.auth.getSession();t?.user&&(n=t.user.id)}if(!n)return i.NextResponse.json({success:!1,error:"Unauthorized"},{status:401});let s=!1,o=!1;try{if(process.env.SUPABASE_SERVICE_ROLE_KEY){let e=(0,d.createClient)("https://vabikejehdmpfcyqrgrs.supabase.co",process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:!1}}),{data:t}=await e.from("user_packs").select("pack_id").eq("user_id",n).eq("pack_id","in_person").single();s=!!t,o=!!p&&!!process.env.SUPABASE_SERVICE_ROLE_KEY}else{let e=await (0,l.f)(),{data:t}=await e.from("user_packs").select("pack_id").eq("user_id",n).eq("pack_id","in_person").single();s=!!t,o=!!p}}catch(e){console.error("Error checking pack entitlement:",e),process.env.SUPABASE_SERVICE_ROLE_KEY||(s=!0,o=!!p)}if(!s)return i.NextResponse.json({success:!1,error:"Pack required",code:"PACK_REQUIRED"},{status:403});let c=await e.json();if(!c.stateCode||"number"!=typeof c.step||c.step<0||c.step>4||!c.ladder||"number"!=typeof c.ladder.ask||"number"!=typeof c.ladder.agree||"number"!=typeof c.ladder.walk||"boolean"!=typeof c.ladder.locked)return i.NextResponse.json({success:!1,error:"Invalid request schema"},{status:400});if(!o){let e=h(c);return i.NextResponse.json({success:!0,data:e,aiEnabled:!1,source:"deterministic"})}let u=c.vehiclePrice||0,g=c.targetOTD||0,m=c.dealerCurrentOTD&&g>0?c.dealerCurrentOTD-g:null,y=null;c.dealerCurrentOTD&&c.lastDealerOTD&&(y=c.dealerCurrentOTD<c.lastDealerOTD?"improving":c.dealerCurrentOTD>c.lastDealerOTD?"worsening":"stalled");let T=(t=c.ladder,a=y,`You are a real-time dealership negotiation coach providing tactical, spoken-language guidance during in-person negotiations. You are sitting next to the user during the negotiation, providing protective, state-aware coaching.

CRITICAL RULES:
1. ALL responses must be 1-2 sentences MAX - designed to be spoken out loud
2. Use spoken-language tone (natural, conversational, not email-style)
3. End with silence - let the dealer respond, don't over-explain
4. Always focus on OTD (Out-The-Door) price - NEVER discuss monthly payments
5. Be firm, calm, and OTD-focused - no hedging or soft language
6. Generate concise, repeatable phrases the user can say immediately
7. Avoid long explanations in the main output
8. NO email framing, NO upsell copy, NO "Best Next Message" language
9. You are protective of the user's position - never weaken it unless explicitly necessary
10. You are reactive to the current deal state - use gap and trend to inform confidence

CURRENT DEAL STATE:
${null!==m?`- GAP: $${m>=0?"+":""}${Math.abs(m).toLocaleString()} ${m<=0?"(DEALER BELOW TARGET - GOOD)":m<=500?"(CLOSE - NEGOTIABLE)":"(LARGE GAP - NEEDS WORK)"}`:"- GAP: Unknown (waiting for dealer OTD)"}
${a?`- TREND: ${"improving"===a?"IMPROVING (dealer coming down)":"worsening"===a?"WORSENING (dealer going up)":"STALLED (no movement)"}`:"- TREND: Unknown"}

LADDER CONSTRAINTS:
- ASK: $${t.ask.toLocaleString()} (opening ask)
- AGREE: $${t.agree.toLocaleString()} (target OTD)
- WALK: $${t.walk.toLocaleString()} (walk-away ceiling)
- LOCKED: ${t.locked?"YES":"NO"}

${t.locked?`CRITICAL GUARDRAIL: Ladder is LOCKED. You MUST NOT suggest accepting any amount above $${t.walk.toLocaleString()}. All talk tracks must anchor to ladder.agree ($${t.agree.toLocaleString()}) or ladder.ask ($${t.ask.toLocaleString()}), but NEVER exceed ladder.walk. If dealer offers above walk-away, you must instruct user to walk.`:"Ladder is unlocked - you can suggest adjustments, but still protect user position."}

GUARDRAILS (ENFORCED):
- NEVER suggest accepting above WALK if ladder is locked
- NEVER discuss monthly payments when goal is OTD focus
- NEVER weaken the user's position (e.g., "maybe we can go higher")
- ALWAYS protect the user's target OTD
- If gap is large (>$1000), confidence must be RED and suggest walking
- If trend is worsening, increase urgency to close or walk

Your response MUST be a JSON object with this EXACT structure. ALL fields are REQUIRED:
{
  "tacticLabel": "<Human-readable tactic name, e.g., 'Payment Anchoring', 'Manager Escalation', 'Add-On Push'>",
  "tacticType": "<Tactic code: payment_anchoring | urgency | addons | fees | manager | counter_otd | trade_in_lowball | stalling | standard>",
  "nextMove": "<ONE sentence instruction, what user should do next, <= 120 chars>",
  "sayThis": "<Primary talk track, 1-2 sentences, spoken language, <= 100 chars. MUST respect ladder if locked>",
  "ifPushback": "<Response if dealer pushes back, 1-2 sentences, <= 100 chars>",
  "ifManager": "<Response if manager joins, 1-2 sentences, <= 100 chars. Must be firm and closing-oriented>",
  "stopSignal": "<What to do next physically, e.g., 'Repeat $${t.agree.toLocaleString()} OTD and stay silent', <= 80 chars>",
  "closingLine": "<One firm closing statement, no hedging, <= 100 chars. MUST respect ladder if locked>",
  "redFlags": ["<Red flag 1, max 60 chars>", "<Red flag 2, max 60 chars>", "<Red flag 3, max 60 chars>"],
  "doNotSay": ["<Common mistake 1, max 60 chars>", "<Common mistake 2, max 60 chars>"]
}

CRITICAL: You MUST return ALL required fields. Missing fields will cause an error. The output MUST be situation-specific, not generic.`),f=function(e,t,a,n,r,s,o,i,l,d){let c=a&&t&&t>0?a-t:null,u=null;a&&n&&(u=a<n?"improving":a>n?"worsening":"stalled");let g=`IN-PERSON NEGOTIATION MODE - REAL-TIME COACHING OUTPUT REQUIRED:

`;return g+=`=== DEAL STATE ===
`,e&&e>0?g+=`VEHICLE PRICE: $${e.toLocaleString()}
`:g+=`VEHICLE PRICE: Not provided
`,t&&t>0?g+=`TARGET OTD: $${t.toLocaleString()}
`:g+=`TARGET OTD: Not set yet (user will set after getting dealer OTD)
`,a?(g+=`DEALER CURRENT OTD: $${a.toLocaleString()}
`,t&&t>0?g+=`GAP: $${c>=0?"+":""}${c.toLocaleString()} ${c<=0?"(DEALER BELOW TARGET)":c<=500?"(CLOSE)":"(LARGE GAP)"}
`:g+=`GAP: Cannot compute (no target OTD set yet)
`):g+=`DEALER CURRENT OTD: Not provided yet
GAP: Unknown
`,u&&(g+=`TREND: ${"improving"===u?"IMPROVING (dealer coming down)":"worsening"===u?"WORSENING (dealer going up)":"STALLED"}
`),g+=`STATE: ${r}
CURRENT STEP: ${i}
`,l&&(g+=`QUICK ACTION: ${l}
`),s&&(g+=`SITUATION: ${s}
`),o&&(g+=`
=== DEALER MESSAGE ===
"${o}"

Parse this message for:
- Tactic being used (payment anchoring, urgency, add-on push, etc.)
- Any dollar amounts mentioned
- Pressure tactics or red flags
`),1===i?g+=`
STEP 1 CONTEXT: User is trying to get the written OTD worksheet from the dealer. This is the foundation - they need the full breakdown in writing. Focus on:
- Getting the worksheet printed/emailed
- Handling refusal (they won't give it)
- Handling monthly payment diversion (they ask about payments instead)
- Handling incomplete breakdowns (missing fees/add-ons)
- Handling mandatory add-ons push
The talk tracks must be about GETTING THE WORKSHEET, not negotiating price yet.
`:2===i?g+=`
STEP 2 CONTEXT: User needs to handle a dealer tactic. Provide specific talk tracks. ${a?"Dealer has provided OTD: $"+a.toLocaleString():"User still does NOT have dealer OTD yet - focus on getting it."}
`:3===i?a?(g+=`
STEP 3 CONTEXT: User is at counter/close/walk decision point. ${c&&c>1e3?"Large gap - consider walking.":c&&c<=0?"Dealer below target - good position to close.":"Gap is negotiable - push for target."}
`,t&&0!==t||(g+=`
IMPORTANT: User does NOT have a target OTD set. Generate a recommended target based on vehiclePrice (if provided) + estimated tax/fees, and clearly label it as an estimate.
`)):g+=`
STEP 3 CONTEXT: User does NOT have dealer OTD yet. They should NOT be at counter/close/walk. Prompt them to go back to Step 1.
`:4===i&&(g+=`
STEP 4 CONTEXT: User is updating deal state. Provide next move based on new information.
`),g+=`
=== NEGOTIATION LADDER ===
ASK: $${d.ask.toLocaleString()} (opening ask)
AGREE: $${d.agree.toLocaleString()} (target OTD - user will accept at this)
WALK: $${d.walk.toLocaleString()} (walk-away ceiling)
LOCKED: ${d.locked?"YES - MUST NOT exceed walk-away":"NO - can adjust"}
`,null!==c&&c>1e3&&d.locked&&(g+=`
⚠️ CRITICAL: Large gap ($${c.toLocaleString()}) AND ladder is locked. User should walk if dealer won't come down to target.
`),g+=`
REQUIRED OUTPUT:
- "tacticLabel": Human-readable tactic name (e.g., "Payment Anchoring", "Manager Escalation")
- "tacticType": One of: payment_anchoring | urgency | addons | fees | manager | counter_otd | trade_in_lowball | stalling | standard
- "nextMove": ONE sentence instruction for what user should do next (<= 120 chars)
- "sayThis": Primary response RIGHT NOW (1-2 sentences, spoken, <= 100 chars). MUST address the situation and respect ladder if locked.
- "ifPushback": If they resist (1-2 sentences, spoken, <= 100 chars)
- "ifManager": If manager joins (1-2 sentences, firm, closing-oriented, <= 100 chars)
- "stopSignal": Physical action to take next (<= 80 chars)
- "closingLine": ONE firm closing statement (no hedging, <= 100 chars). MUST respect ladder if locked.
- "redFlags": Exactly 3 things to watch for (max 60 chars each)
- "doNotSay": Exactly 2 common mistakes to avoid (max 60 chars each)
`,d.locked&&(g+=`
CRITICAL: Ladder is LOCKED. You MUST NOT suggest accepting any amount above $${d.walk.toLocaleString()}. All outputs must respect this constraint.
`),g+=`
Return ONLY valid JSON with ALL required fields.`}(u,g,c.dealerCurrentOTD,c.lastDealerOTD,c.stateCode,c.situation||"",c.dealerSaid,c.step,c.quickAction,c.ladder),O=await p.chat.completions.create({model:"gpt-4o-mini",messages:[{role:"system",content:T},{role:"user",content:f}],response_format:{type:"json_object"},temperature:.7}),w=JSON.parse(O.choices[0].message.content||"{}"),E=["tacticLabel","tacticType","nextMove","sayThis","ifPushback","ifManager","stopSignal","closingLine","redFlags","doNotSay"],S=E.filter(e=>"redFlags"===e||"doNotSay"===e?!Array.isArray(w[e])||0===w[e].length:!w[e]);if(S.length>0){console.warn("In-person response missing fields:",S);let e=f+"\n\nCRITICAL: You must return ALL required fields. Missing: "+S.join(", ");try{let t=await p.chat.completions.create({model:"gpt-4o-mini",messages:[{role:"system",content:T},{role:"user",content:e}],response_format:{type:"json_object"},temperature:.7}),a=JSON.parse(t.choices[0].message.content||"{}"),n=E.filter(e=>"redFlags"===e||"doNotSay"===e?!Array.isArray(a[e])||0===a[e].length:!a[e]);if(0===n.length)Object.assign(w,a);else{console.error("In-person response still invalid after retry, using deterministic fallback");let e=h(c);return i.NextResponse.json({success:!0,data:e,aiEnabled:!0,source:"deterministic_fallback"})}}catch(t){console.error("Retry failed, using deterministic fallback:",t);let e=h(c);return i.NextResponse.json({success:!0,data:e,aiEnabled:!0,source:"deterministic_fallback"})}}let k={tacticLabel:String(w.tacticLabel||w.tactic||"Standard negotiation").substring(0,100),tacticType:["payment_anchoring","urgency","addons","fees","manager","counter_otd","trade_in_lowball","stalling","standard"].includes(w.tacticType)?w.tacticType:"standard",nextMove:String(w.nextMove||w.nextBestMove||"").substring(0,120),sayThis:String(w.sayThis||"").substring(0,100),ifPushback:String(w.ifPushback||"").substring(0,100),ifManager:String(w.ifManager||"").substring(0,100),stopSignal:String(w.stopSignal||"").substring(0,80),closingLine:String(w.closingLine||"").substring(0,100),redFlags:Array.isArray(w.redFlags)?w.redFlags.slice(0,3).map(e=>String(e).substring(0,60)):[],doNotSay:Array.isArray(w.doNotSay)?w.doNotSay.slice(0,2).map(e=>String(e).substring(0,60)):[]};if(c.ladder.locked){let e=k.sayThis.match(/\$[\d,]+/g)?.map(e=>parseFloat(e.replace(/[$,]/g,""))).filter(e=>e>1e3&&e<2e5),t=k.closingLine.match(/\$[\d,]+/g)?.map(e=>parseFloat(e.replace(/[$,]/g,""))).filter(e=>e>1e3&&e<2e5);(e&&e.some(e=>e>c.ladder.walk)||t&&t.some(e=>e>c.ladder.walk)||c.dealerCurrentOTD&&c.dealerCurrentOTD>c.ladder.walk&&!k.sayThis.toLowerCase().includes("walk"))&&(c.dealerCurrentOTD&&c.dealerCurrentOTD>c.ladder.walk?(k.sayThis=`That's above my walk-away number of $${c.ladder.walk.toLocaleString()}. I need $${c.ladder.agree.toLocaleString()} OTD.`,k.closingLine=`I can't go above $${c.ladder.walk.toLocaleString()}. My target is $${c.ladder.agree.toLocaleString()} OTD.`):(k.closingLine=`If you can do $${c.ladder.agree.toLocaleString()} OTD, I'm ready to move forward.`,k.sayThis=`I need $${c.ladder.agree.toLocaleString()} OTD. Can you show me the breakdown?`))}if((k.sayThis.toLowerCase().includes("monthly")||k.sayThis.toLowerCase().includes("payment"))&&(k.sayThis="I'm focused on the total out-the-door price, not monthly payments. What's your OTD?"),["maybe we can","perhaps","could consider","might be able","flexible"].some(e=>k.sayThis.toLowerCase().includes(e))){let e=g>0?g:c.targetOTD||0;e>0?k.sayThis=`I need $${e.toLocaleString()} OTD. Can you show me the breakdown?`:k.sayThis="I need the full OTD breakdown. Can you show me the worksheet?"}return i.NextResponse.json({success:!0,data:k,aiEnabled:!0,source:"ai"})}catch(e){return console.error("Error in in-person copilot:",e),i.NextResponse.json({success:!1,error:e.message||"Failed to generate response"},{status:500})}}let y=new r.AppRouteRouteModule({definition:{kind:s.x.APP_ROUTE,page:"/api/copilot/in-person/route",pathname:"/api/copilot/in-person",filename:"route",bundlePath:"app/api/copilot/in-person/route"},resolvedPagePath:"C:\\dev\\Dealership Copilot\\app\\api\\copilot\\in-person\\route.ts",nextConfigOutput:"",userland:n}),{requestAsyncStorage:T,staticGenerationAsyncStorage:f,serverHooks:O}=y,w="/api/copilot/in-person/route";function E(){return(0,o.patchFetch)({serverHooks:O,staticGenerationAsyncStorage:f})}},19692:(e,t,a)=>{a.d(t,{$:()=>i,f:()=>l});var n=a(67721),r=a(71615);let s="https://vabikejehdmpfcyqrgrs.supabase.co",o="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhYmlrZWplaGRtcGZjeXFyZ3JzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NzAzNDAsImV4cCI6MjA4MTA0NjM0MH0.X_Z7szu62swGviqYgtI2mxV3F1vX4UBYpuZYV2n7h4Q";if(!s||!o){let e=[];throw s||e.push("NEXT_PUBLIC_SUPABASE_URL"),o||e.push("NEXT_PUBLIC_SUPABASE_ANON_KEY"),Error(`[CRITICAL] Missing required Supabase environment variables: ${e.join(", ")}. These must be set in Vercel environment variables.`)}if(s.includes("placeholder")||o.includes("placeholder"))throw Error("[CRITICAL] Supabase environment variables contain placeholder values. Please set real values in Vercel environment variables.");if(s.length<10||o.length<10)throw Error("[CRITICAL] Supabase environment variables appear to be invalid (too short). Please verify they are set correctly in Vercel.");function i(){let e=(0,r.cookies)();return(0,n.createServerClient)("https://vabikejehdmpfcyqrgrs.supabase.co","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhYmlrZWplaGRtcGZjeXFyZ3JzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NzAzNDAsImV4cCI6MjA4MTA0NjM0MH0.X_Z7szu62swGviqYgtI2mxV3F1vX4UBYpuZYV2n7h4Q",{cookies:{getAll:()=>e.getAll(),setAll(t){try{t.forEach(({name:t,value:a,options:n})=>{e.set(t,a,n)})}catch(e){}}}})}let l=i}};var t=require("../../../../webpack-runtime.js");t.C(e);var a=e=>t(t.s=e),n=t.X(0,[8948,5972,7857,9702,4214],()=>a(92451));module.exports=n})();