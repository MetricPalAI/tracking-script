!function(){const e=o=>{void 0!==window.ClientTracker?window.ClientTracker.track("form_submission","FORM",null,{email:o,form_type:"marketo",source_type:"form_submission",integration:"Marketo"}):(Array.isArray(window.clientTrackerQueue)||(window.clientTrackerQueue=[]),window.clientTrackerQueue.push((()=>e(o))))};window.addEventListener("message",(function(o){try{const i=JSON.parse(o.data)?.mktoResponse?.data?.formId;if(void 0!==window.MktoForms2){const o=window.MktoForms2.getForm(i).getValues(),r=o?.Email||o?.email;r&&e(r)}}catch(e){}}))}();