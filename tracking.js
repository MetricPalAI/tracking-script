!function(e){if(e.ClientTracker)return;const t={supabaseUrl:"https://lwyxvzvyvpqhuocfcbwd.supabase.co",supabaseKey:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3eXh2enZ5dnBxaHVvY2ZjYndkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjc1MTUwNTYsImV4cCI6MjA0MzA5MTA1Nn0.WYwNg-BHhIdbj7pcCuBnqc8-c9NU5sR8hPQLDlGY9RY",debug:e.location.search.includes("hsdebug=true"),batchSize:10,batchDelay:2e3,sessionTimeout:30,retryAttempts:3};let i,n=t,o=new Date,a=0,r=!1,s=new Date,c=!0,l=[];const u=["gmail.com","yahoo.com","hotmail.com","outlook.com","aol.com","icloud.com","protonmail.com","mail.com"];const d="mp_session_id",m="mp_session_start",g="mp_visitor_id";async function f(e,t,i="POST",o=0){try{const o=`${n.supabaseUrl}/rest/v1/${t}`,a="PATCH"===i?`${o}?id=eq.${e.id}`:o;n.debug&&console.log(`Attempting to send data to ${t}:`,e);const r=await fetch(a,{method:i,headers:{"Content-Type":"application/json",Authorization:`Bearer ${n.supabaseKey}`,apikey:n.supabaseKey,Prefer:"POST"===i?"return=representation":"return=minimal"},body:JSON.stringify(Array.isArray(e)?e:[e])});if(!r.ok){const e=await r.text();throw new Error(`HTTP error! status: ${r.status}, message: ${e}`)}if("POST"===i||r.headers.get("content-type")?.includes("application/json"))try{const e=await r.json();return n.debug&&console.log(`Successfully sent data to ${t}:`,e),e}catch(o){if("PATCH"===i&&204===r.status)return n.debug&&console.log(`Successfully updated ${t}`),[{id:e.id}];throw new Error(`Failed to parse response: ${o.message}`)}return"PATCH"===i&&204===r.status?[{id:e.id}]:null}catch(a){if(n.debug&&console.error(`Failed to send data to ${t}:`,a),o<3)return await new Promise((e=>setTimeout(e,1e3*(o+1)))),f(e,t,i,o+1);console.error("Failed after all retries:",{table:t,data:e,error:a.message});const r=JSON.parse(localStorage.getItem("failed_events")||"[]");return r.push({eventData:e,table:t,method:i,timestamp:(new Date).toISOString()}),localStorage.setItem("failed_events",JSON.stringify(r)),null}}function _(){const e=navigator.userAgent;return/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(e)?"Tablet":/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(e)?"Mobile":"Desktop"}function p(){const t=new URLSearchParams(e.location.search),i={utm_source:t.get("utm_source"),utm_medium:t.get("utm_medium"),utm_campaign:t.get("utm_campaign"),utm_term:t.get("utm_term"),utm_content:t.get("utm_content")},n={gclid:t.get("gclid"),fbclid:t.get("fbclid"),ttclid:t.get("ttclid"),msclkid:t.get("msclkid")};return Object.values(i).some((e=>e))&&(sessionStorage.setItem("utm_params",JSON.stringify(i)),console.log("UTM parameters stored in session:",i)),{...i,click_id:Object.entries(n).find((([e,t])=>t))?.[1]||null,click_id_type:Object.entries(n).find((([e,t])=>t))?.[0]||null}}function h(e){if(!e)return"Other";return{cpc:"Paid Search",ppc:"Paid Search",paidsearch:"Paid Search","paid-search":"Paid Search","social-paid":"Paid Social","social-cpc":"Paid Social",social_paid:"Paid Social",display:"Paid Display",banner:"Paid Display",cpm:"Paid Display",email:"Email","e-mail":"Email",newsletter:"Email",social:"Social Media","social-organic":"Social Media",affiliate:"Affiliates",partner:"Affiliates",organic:"Organic Search",referral:"Referral",direct:"Direct"}[e.toLowerCase()]||"Other"}async function S(){const e=function(){const e={userAgent:navigator.userAgent,language:navigator.language,platform:navigator.platform,screenResolution:`${screen.width}x${screen.height}`,screenDepth:screen.colorDepth,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone};return Object.values(e).join("|")}();let t=sessionStorage.getItem("mp_visitor_id");if(t)return console.log("Returning visitor from session:",t),{id:t,fingerprint:e,isNew:!1};if(t=localStorage.getItem("mp_visitor_id"),t)return console.log("Returning visitor from local storage:",t),await f({id:t,last_seen_at:(new Date).toISOString(),updated_at:(new Date).toISOString()},"visitors","PATCH"),{id:t,fingerprint:e,isNew:!1};const i={first_fingerprint_id:e,first_seen_at:(new Date).toISOString(),last_seen_at:(new Date).toISOString(),additional_fingerprints:[]},n=await f(i,"visitors");return n&&n[0]?.id?(t=n[0].id,sessionStorage.setItem("mp_visitor_id",t),localStorage.setItem("mp_visitor_id",t),console.log("New visitor created:",t),{id:t,fingerprint:e,isNew:!0}):(console.error("Failed to create or identify visitor"),null)}async function y(t,i={}){const o={session_uuid:sessionStorage.getItem("mp_session_id"),event_type:"error",event_timestamp:(new Date).toISOString(),page_url:e.location.href,element_type:null,element_id:null,other_data:JSON.stringify({error_message:t.message,error_stack:t.stack,...i,userAgent:navigator.userAgent,timestamp:(new Date).toISOString()})};try{await f([o],"events"),n.debug&&console.log("Error logged:",o)}catch(e){console.error("Failed to log error:",e);const t=JSON.parse(localStorage.getItem("failed_error_logs")||"[]");t.push(o),localStorage.setItem("failed_error_logs",JSON.stringify(t))}}async function w(t,i=null,n=null,o={}){try{let a=sessionStorage.getItem(d);if(!a&&(a=await D(),!a))throw new Error("Failed to create/retrieve session");const l={session_uuid:a,event_type:t,event_timestamp:(new Date).toISOString(),page_url:e.location.href,element_type:i||null,element_id:n||null,other_data:JSON.stringify({...o,tab_active:c,time_since_last_activity:s?Math.round((new Date-s)/1e3):0,active_tab_time:Math.round(0),session_ending:r})};return function(e){const t=["session_uuid","event_type","event_timestamp"].filter((t=>!e[t]));if(t.length>0)throw new Error(`Missing required fields: ${t.join(", ")}`)}(l),await f([l],"events")}catch(e){return await y(e,{event_type:t}),null}}function v(){document.addEventListener("submit",(async function(t){try{let i=sessionStorage.getItem(d);if(!i&&(i=await D(),!i))return void console.error("Failed to create session for form submission");const n=t.target,o=Array.from(n.elements).find((e=>"email"===e.type||e.name?.toLowerCase().includes("email")||e.id?.toLowerCase().includes("email"))),a=Array.from(n.elements).find((e=>e.name?.toLowerCase().includes("company")||e.name?.toLowerCase().includes("organization")||e.id?.toLowerCase().includes("company")||e.id?.toLowerCase().includes("organization"))),r=o?.value?.trim(),s=a?.value?.trim();let c=null,l=!1;r&&(c=r.split("@")[1]?.toLowerCase(),l=c&&!u.includes(c));const m=sessionStorage.getItem(g);if(r&&m){const e={id:m,email:r,email_domain:c,is_identified:!0,identification_date:(new Date).toISOString(),identification_source:"form_submission",updated_at:(new Date).toISOString()};try{await f(e,"visitors","PATCH"),console.log("Visitor identified:",m),l&&await handleCompanyIdentification(c,s,m,r)}catch(e){await y(e,{context:"visitor_identification",visitorId:m})}}const _={session_uuid:i,session_id:null,visitor_id:m,form_id:n.id||null,form_name:n.getAttribute("name")||null,form_action:n.action,page_url:e.location.href,email_domain:c,email:r,is_business_email:l,submission_timestamp:(new Date).toISOString(),form_fields:JSON.stringify({has_company_field:!!a,has_email_field:!!o,company_name:s||null}),metadata:JSON.stringify({form_type:T(n),field_count:n.elements.length,has_required_fields:Array.from(n.elements).some((e=>e.required))})};!function(e){const t=["session_uuid","visitor_id","submission_timestamp"].filter((t=>!e[t]));if(t.length>0)throw new Error(`Missing required form fields: ${t.join(", ")}`)}(_),await Promise.all([f(_,"form_submissions"),w("form_complete","FORM",n.id,{formType:T(n),hasEmail:!!o,hasCompany:!!a,isBusinessEmail:l})]).catch((e=>{y(e,{context:"form_submission",formId:n.id,sessionId:i})}))}catch(e){await y(e,{context:"form_tracking"})}})),document.addEventListener("change",(async function(e){const t=e.target;t.form&&await w("form_field_complete",t.tagName,t.id,{fieldType:t.type,fieldName:t.name,isRequired:t.required,formId:t.form.id,formType:T(t.form)}).catch((e=>{y(e,{context:"field_change",fieldId:t.id})}))}))}function I(){let t=0;e.addEventListener("scroll",function(e,t){let i;return function(...n){clearTimeout(i),i=setTimeout((()=>e.apply(this,n)),t)}}((function(){const i=function(){const t=e.innerHeight,i=document.documentElement.scrollHeight,n=e.pageYOffset||document.documentElement.scrollTop;return Math.round((n+t)/i*100)}();i>a&&(a=i,Math.floor(i/25)>Math.floor(t/25)&&(w("scroll_depth",null,null,{depth:25*Math.floor(i/25)}),t=i))}),200))}let b=0,O=Date.now();function T(e){const t=e.outerHTML.toLowerCase();return t.includes("contact")||e.id?.toLowerCase().includes("contact")?"contact":t.includes("subscribe")||t.includes("newsletter")?"newsletter":t.includes("demo")||t.includes("trial")?"demo":"other"}async function D(){try{const t=await S();if(!t)return n.debug&&console.error("Failed to identify visitor"),null;console.log(`Visitor identified: ${t.id}`),sessionStorage.setItem("mp_visitor_id",t.id);const i=sessionStorage.getItem(d),o=sessionStorage.getItem(m);if(i&&o){if(Date.now()-new Date(o).getTime()<60*n.sessionTimeout*1e3)return i}const a=function(){const e=sessionStorage.getItem("utm_params");if(e){const t=JSON.parse(e);if(t.utm_source&&t.utm_medium)return{source:t.utm_source,medium:t.utm_medium,channel:h(t.utm_medium)}}const t=p();if(t.utm_source&&t.utm_medium)return{source:t.utm_source,medium:t.utm_medium,channel:h(t.utm_medium)};const i=document.referrer;if(!i)return{source:"direct",medium:"none",channel:"direct"};try{const e=new URL(i).hostname,t={google:{medium:"organic",channel:"Organic Search"},bing:{medium:"organic",channel:"Organic Search"},yahoo:{medium:"organic",channel:"Organic Search"},duckduckgo:{medium:"organic",channel:"Organic Search"}},n={"facebook.com":{medium:"social",channel:"Social Media"},"instagram.com":{medium:"social",channel:"Social Media"},"linkedin.com":{medium:"social",channel:"Social Media"},"twitter.com":{medium:"social",channel:"Social Media"},"t.co":{medium:"social",channel:"Social Media"},"tiktok.com":{medium:"social",channel:"Social Media"}};for(const[i,n]of Object.entries(t))if(e.includes(i))return{source:i.charAt(0).toUpperCase()+i.slice(1),medium:n.medium,channel:n.channel};for(const[t,i]of Object.entries(n))if(e.includes(t))return{source:t.split(".")[0].charAt(0).toUpperCase()+t.split(".")[0].slice(1),medium:i.medium,channel:i.channel};return{source:e,medium:"referral",channel:"Referral"}}catch(e){return console.error("Error parsing referrer:",e),{source:"direct",medium:"none",channel:"direct"}}}(),r=p(),s={fingerprint_id:t.fingerprint,visitor_id:t.id,session_start:(new Date).toISOString(),entry_page_url:e.location.href,traffic_source:a.source,traffic_medium:a.medium,traffic_channel:a.channel,device_type:_(),country:Intl.DateTimeFormat().resolvedOptions().timeZone,click_id:r.click_id||null},c=await f(s,"sessions");if(!c?.[0]?.id)return null;const l=c[0].id;if(sessionStorage.setItem(d,l),sessionStorage.setItem(m,s.session_start),r.utm_source||r.utm_medium||r.utm_campaign){const e={session_uuid:l,utm_source:r.utm_source||null,utm_medium:r.utm_medium||null,utm_campaign:r.utm_campaign||null,utm_term:r.utm_term||null,utm_content:r.utm_content||null};try{console.log("Storing UTM parameters:",e),await f(e,"utmparameters")}catch(t){console.error("Failed to store UTM parameters:",t);const i=JSON.parse(localStorage.getItem("failed_events")||"[]");i.push({eventData:e,table:"utmparameters",method:"POST",timestamp:(new Date).toISOString()}),localStorage.setItem("failed_events",JSON.stringify(i))}}const u={session_uuid:l,page_url:e.location.href,visit_timestamp:(new Date).toISOString(),page_type:"page",time_on_page:null};return console.log("Recording initial page visit:",u),await f(u,"pagevisits"),console.log("Tracking initialized with session:",l),l}catch(e){return n.debug&&console.error("Error during startTracking:",e),null}}async function k(e={}){try{if(n={...t,...e},!n.supabaseUrl||!n.supabaseKey)throw new Error("Supabase URL and API key are required");if(!await D())throw new Error("Failed to initialize tracking session");v(),document.addEventListener("click",(function(e){const t=e.target.closest("a");if(!t)return;const i=t.href||"";[".pdf",".doc",".docx",".xls",".xlsx",".zip",".rar"].some((e=>i.toLowerCase().endsWith(e)))&&w("file_download","LINK",t.id,{fileName:i.split("/").pop(),fileType:i.split(".").pop().toLowerCase()})})),document.addEventListener("play",(function(e){"VIDEO"===e.target.tagName&&w("video_play","VIDEO",e.target.id,{videoSrc:e.target.currentSrc,videoDuration:e.target.duration})}),!0),document.addEventListener("pause",(function(e){"VIDEO"===e.target.tagName&&w("video_pause","VIDEO",e.target.id,{videoSrc:e.target.currentSrc,timeStamp:e.target.currentTime})}),!0),I(),document.addEventListener("visibilitychange",(()=>{c="visible"===document.visibilityState,c&&(s=new Date,r&&(r=!1,console.log("Session restored due to user activity")))})),["mousedown","keydown","scroll","touchstart"].forEach((e=>{document.addEventListener(e,(()=>{s=new Date,r&&(r=!1,console.log("Session restored due to user activity"))}))})),i=setInterval((()=>{if(!c)return;const e=(new Date-s)/1e3/60;e>=10&&!r&&(r=!0,w("session_inactive",null,null,{inactiveTime:e}))}),6e4),setInterval((function(){if(c){const e=Date.now();b+=e-O,O=e}}),1e3),setInterval((function(){c&&w("page_time_checkpoint",null,null,{activeTime:Math.round(b/1e3),totalTime:Math.round((Date.now()-o)/1e3)})}),3e5),setInterval((async()=>{if(!navigator.onLine)return;const e=JSON.parse(localStorage.getItem("failed_error_logs")||"[]");if(e.length>0){const t=[];for(const i of e)try{const e={session_uuid:i.session_uuid,event_type:"error",event_timestamp:(new Date).toISOString(),page_url:i.page_url,element_type:null,element_id:null,other_data:JSON.stringify(i.other_data)};await f([e],"events"),t.push(i)}catch(e){console.error("Failed to resend error log:",e)}localStorage.setItem("failed_error_logs",JSON.stringify(e.filter((e=>!t.includes(e)))))}const t=JSON.parse(localStorage.getItem("failed_events")||"[]");if(t.length>0){const e=[];for(const i of t)try{await f(i.eventData,i.table,i.method),e.push(i)}catch(e){console.error("Failed to resend event:",e)}localStorage.setItem("failed_events",JSON.stringify(t.filter((t=>!e.includes(t)))))}}),6e4),document.addEventListener("click",(function(e){const t=e.target.closest('a, button, [role="button"], input[type="submit"]');if(t){const e={type:t.tagName.toLowerCase(),id:t.id||"",text:t.innerText||t.value||"",href:t.href||"",classes:t.className};(t.closest("[data-track]")||e.href||"submit"===e.type||e.classes.includes("cta")||e.classes.includes("btn-primary"))&&w("click",e.type,e.id,{text:e.text,href:e.href})}}))}catch(e){console.error("Fatal initialization error:",e)}}if(e.initializeClientTracker=async function(e){try{await k(e)}catch(e){console.error("Error initializing tracker:",e)}},e.ClientTracker={init:e.initializeClientTracker,track:function(e,t){w(e,null,null,t)}},e.google_tag_manager)try{const t=e.dataLayer?.find((e=>e.trackerConfig))?.trackerConfig;t&&e.initializeClientTracker(t)}catch(e){console.error("GTM initialization error:",e)}e.addEventListener("beforeunload",(function(){const t=sessionStorage.getItem("mp_session_id");if(!t)return;console.log("Session ending, tracking session end data..."),w("page_time_summary",null,null,{activeTime:Math.round(b/1e3),totalTime:Math.round((Date.now()-o)/1e3),isActive:c}),w("final_scroll_depth",null,null,{depth:a});const i={id:t,session_end:(new Date).toISOString(),exit_page_url:e.location.href,other_data:JSON.stringify({total_active_time:Math.round(b/1e3),total_time:Math.round((Date.now()-o)/1e3),final_scroll_depth:a,tab_switches:0,last_active:s.toISOString(),inactivity_periods:l,is_tab_active:c,device_info:{userAgent:navigator.userAgent,screenSize:`${e.screen.width}x${e.screen.height}`,viewportSize:`${e.innerWidth}x${e.innerHeight}`}})};try{navigator.sendBeacon(`${n.supabaseUrl}/rest/v1/sessions?id=eq.${t}`,JSON.stringify({...i,headers:{"Content-Type":"application/json",Authorization:`Bearer ${n.supabaseKey}`,apikey:n.supabaseKey,Prefer:"return=minimal"}})),console.log("Session end data successfully sent using sendBeacon.")}catch(e){console.error("Failed to send session end data using sendBeacon:",e)}}))}(window);
