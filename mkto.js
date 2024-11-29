(function() {
    if (typeof window.MktoForms2 !== 'undefined') {
        window.MktoForms2.whenReady(function(form) {
            form.onSubmit(function() {
                const formValues = form.getValues();
                const email = formValues.Email || formValues.email;
                
                if (email) {
                    window.ClientTracker.track("form_submission", {
                        email: email,
                        form_type: "marketo",
                        form_id: form.getId(),
                        source_type: "form_submission",
                        integration: "Marketo"
                    });
                }
            });
        });
    }
    
    // Keep original message event listener as backup
    window.addEventListener("message", function(o) {
        try {
            const t = JSON.parse(o.data)?.mktoResponse?.data?.formId;
            if (window.MktoForms2) {
                const o = window.MktoForms2.getForm(t).getValues(),
                    e = o?.Email || o?.email;
                e && (o => {
                    window.ClientTracker.track("form_submission", {
                        email: o,
                        form_type: "marketo",
                        source_type: "form_submission",
                        integration: "Marketo"
                    });
                })(e);
            }
        } catch (o) {}
    });
})();
