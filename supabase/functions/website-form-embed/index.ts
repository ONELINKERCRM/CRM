// OneLinker CRM - Website Form Embed Script
// This script auto-captures form submissions and sends them to your CRM

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/javascript',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Return the embed script
  const script = `
(function() {
  'use strict';
  
  // Find the script tag and get configuration
  var scripts = document.getElementsByTagName('script');
  var currentScript = scripts[scripts.length - 1];
  var formUrl = currentScript.getAttribute('data-form-url') || '';
  var formSelector = currentScript.getAttribute('data-form-selector') || 'form';
  var successMessage = currentScript.getAttribute('data-success-message') || 'Thank you! We will contact you soon.';
  var errorMessage = currentScript.getAttribute('data-error-message') || 'Something went wrong. Please try again.';
  
  if (!formUrl) {
    console.error('OneLinker: Missing data-form-url attribute');
    return;
  }
  
  // Wait for DOM to be ready
  function init() {
    var forms = document.querySelectorAll(formSelector);
    
    forms.forEach(function(form) {
      // Skip if already processed
      if (form.hasAttribute('data-olcrm-processed')) return;
      form.setAttribute('data-olcrm-processed', 'true');
      
      // Add honeypot field for spam protection
      if (!form.querySelector('[name="_honeypot"]')) {
        var honeypot = document.createElement('input');
        honeypot.type = 'text';
        honeypot.name = '_honeypot';
        honeypot.style.cssText = 'position:absolute;left:-9999px;opacity:0;height:0;width:0;';
        honeypot.tabIndex = -1;
        honeypot.autocomplete = 'off';
        form.appendChild(honeypot);
      }
      
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Check honeypot
        var honeypotField = form.querySelector('[name="_honeypot"]');
        if (honeypotField && honeypotField.value) {
          console.log('OneLinker: Spam detected');
          return;
        }
        
        // Collect form data
        var formData = new FormData(form);
        var data = {};
        formData.forEach(function(value, key) {
          if (key !== '_honeypot') {
            data[key] = value;
          }
        });
        
        // Add metadata
        data._page_url = window.location.href;
        data._referrer = document.referrer;
        data._timestamp = new Date().toISOString();
        
        // Disable submit button
        var submitBtn = form.querySelector('[type="submit"]');
        var originalBtnText = submitBtn ? submitBtn.innerHTML : '';
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = 'Sending...';
        }
        
        // Send to CRM
        fetch(formUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
        .then(function(response) { return response.json(); })
        .then(function(result) {
          if (result.success) {
            // Handle redirect
            if (result.redirect_url) {
              window.location.href = result.redirect_url;
              return;
            }
            
            // Show success message
            var successDiv = document.createElement('div');
            successDiv.className = 'olcrm-success';
            successDiv.style.cssText = 'padding:20px;background:#10B981;color:white;text-align:center;border-radius:8px;margin-top:10px;';
            successDiv.innerHTML = result.message || successMessage;
            
            form.style.display = 'none';
            form.parentNode.insertBefore(successDiv, form.nextSibling);
            
            // Trigger custom event
            window.dispatchEvent(new CustomEvent('olcrm:success', { detail: result }));
          } else {
            throw new Error(result.error || errorMessage);
          }
        })
        .catch(function(error) {
          console.error('OneLinker:', error);
          alert(error.message || errorMessage);
          
          // Re-enable button
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
          }
          
          // Trigger custom event
          window.dispatchEvent(new CustomEvent('olcrm:error', { detail: { error: error.message } }));
        });
      });
    });
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  // Also watch for dynamically added forms
  if (typeof MutationObserver !== 'undefined') {
    var observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.addedNodes.length) {
          setTimeout(init, 100);
        }
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
  
  console.log('OneLinker CRM: Form capture initialized');
})();
`;

  return new Response(script, { 
    headers: corsHeaders 
  });
});
