<script>
(function() {
  console.log("Script started");

  let sessionNumericId = 1;
  let pageStartTime = new Date();
  let maxScrollDepth = 0;

  // Add these helper functions at the top of your script
  const COMMON_EMAIL_PROVIDERS = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 
    'aol.com', 'icloud.com', 'protonmail.com', 'mail.com'
  ];

  function extractDomain(email) {
    if (!email) return null;
    return email.split('@')[1]?.toLowerCase();
  }

  function isBusinessEmail(email) {
    const domain = extractDomain(email);
    if (!domain) return false;
    return !COMMON_EMAIL_PROVIDERS.includes(domain);
  }

  function extractCompanyName(domain) {
    if (!domain) return null;
    // Remove TLD and common prefixes
    return domain
      .split('.')[0] // Remove TLD (.com, .org, etc)
      .replace(/^(?:www|mail|email|corporate|corp)\./, '') // Remove common prefixes
      .split('-').join(' ') // Replace hyphens with spaces
      .split('_').join(' ') // Replace underscores with spaces
      .replace(/\b\w/g, l => l.toUpperCase()); // Capitalize first letter of each word
  }

  // Helper: Generate simple fingerprint
  function getFingerprint() {
    return navigator.userAgent + screen.width + screen.height;
  }

  // Enhanced: Get URL parameters including UTM and referral information
  function getURLParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Get all UTM parameters
    const utmParams = {
      utm_source: urlParams.get('utm_source'),
      utm_medium: urlParams.get('utm_medium'),
      utm_campaign: urlParams.get('utm_campaign'),
      utm_term: urlParams.get('utm_term'),
      utm_content: urlParams.get('utm_content')
    };

    // Get click IDs from various ad platforms
    const clickIdParams = {
      gclid: urlParams.get('gclid'), // Google Ads
      fbclid: urlParams.get('fbclid'), // Facebook
      ttclid: urlParams.get('ttclid'), // TikTok
      msclkid: urlParams.get('msclkid') // Microsoft/Bing
    };

    // Store UTM parameters in sessionStorage for cross-page tracking
    if (Object.values(utmParams).some(value => value)) {
      sessionStorage.setItem('utm_params', JSON.stringify(utmParams));
    }

    return {
      ...utmParams,
      click_id: Object.entries(clickIdParams).find(([_, value]) => value)?.[1] || null,
      click_id_type: Object.entries(clickIdParams).find(([_, value]) => value)?.[0] || null
    };
  }

  // Enhanced: Get traffic source information with better referrer parsing
  function getTrafficInfo() {
    // First check for stored UTM parameters
    const storedUTMs = sessionStorage.getItem('utm_params');
    if (storedUTMs) {
      const utms = JSON.parse(storedUTMs);
      if (utms.utm_source && utms.utm_medium) {
        return {
          source: utms.utm_source,
          medium: utms.utm_medium,
          channel: getChannelFromUTM(utms.utm_medium)
        };
      }
    }

    // Check current URL parameters
    const urlParams = getURLParameters();
    if (urlParams.utm_source && urlParams.utm_medium) {
      return {
        source: urlParams.utm_source,
        medium: urlParams.utm_medium,
        channel: getChannelFromUTM(urlParams.utm_medium)
      };
    }

    // Enhanced referrer checking
    const referrer = document.referrer;
    if (!referrer) {
      return { source: 'direct', medium: 'none', channel: 'direct' };
    }

    try {
      const referrerDomain = new URL(referrer).hostname;
      
      // Search engines
      const searchEngines = {
        'google': { medium: 'organic', channel: 'Organic Search' },
        'bing': { medium: 'organic', channel: 'Organic Search' },
        'yahoo': { medium: 'organic', channel: 'Organic Search' },
        'duckduckgo': { medium: 'organic', channel: 'Organic Search' }
      };

      // Social platforms
      const socialPlatforms = {
        'facebook.com': { medium: 'social', channel: 'Social Media' },
        'instagram.com': { medium: 'social', channel: 'Social Media' },
        'linkedin.com': { medium: 'social', channel: 'Social Media' },
        'twitter.com': { medium: 'social', channel: 'Social Media' },
        't.co': { medium: 'social', channel: 'Social Media' },
        'tiktok.com': { medium: 'social', channel: 'Social Media' }
      };

      // Check for search engines
      for (const [engine, data] of Object.entries(searchEngines)) {
        if (referrerDomain.includes(engine)) {
          return {
            source: engine.charAt(0).toUpperCase() + engine.slice(1),
            medium: data.medium,
            channel: data.channel
          };
        }
      }

      // Check for social platforms
      for (const [platform, data] of Object.entries(socialPlatforms)) {
        if (referrerDomain.includes(platform)) {
          return {
            source: platform.split('.')[0].charAt(0).toUpperCase() + platform.split('.')[0].slice(1),
            medium: data.medium,
            channel: data.channel
          };
        }
      }

      // Default to referral for unknown sources
      return {
        source: referrerDomain,
        medium: 'referral',
        channel: 'Referral'
      };
    } catch (e) {
      console.error('Error parsing referrer:', e);
      return { source: 'direct', medium: 'none', channel: 'direct' };
    }
  }

  // Enhanced: Channel classification
  function getChannelFromUTM(utmMedium) {
    if (!utmMedium) return 'Other';
    
    const mediumMap = {
      'cpc': 'Paid Search',
      'ppc': 'Paid Search',
      'paidsearch': 'Paid Search',
      'paid-search': 'Paid Search',
      'social-paid': 'Paid Social',
      'social-cpc': 'Paid Social',
      'social_paid': 'Paid Social',
      'display': 'Paid Display',
      'banner': 'Paid Display',
      'cpm': 'Paid Display',
      'email': 'Email',
      'e-mail': 'Email',
      'newsletter': 'Email',
      'social': 'Social Media',
      'social-organic': 'Social Media',
      'affiliate': 'Affiliates',
      'partner': 'Affiliates',
      'organic': 'Organic Search',
      'referral': 'Referral',
      'direct': 'Direct'
    };

    return mediumMap[utmMedium.toLowerCase()] || 'Other';
  }

  // Helper: Get device type
  function getDeviceType() {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return 'Tablet';
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
      return 'Mobile';
    }
    return 'Desktop';
  }

  // Helper: Generate numeric session ID
  function generateNumericId() {
    return Math.floor(Math.random() * 1000000000);
  }

  // Enhanced fingerprint generation
  function generateFingerprint() {
    const components = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenResolution: `${screen.width}x${screen.height}`,
      screenDepth: screen.colorDepth,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
    
    return Object.values(components).join('|');
  }

  // Check for existing visitor
  async function identifyVisitor() {
    const fingerprint = generateFingerprint();
    
    // First check sessionStorage
    let visitorId = sessionStorage.getItem('mp_visitor_id');
    if (visitorId) {
      console.log('Returning visitor from session:', visitorId);
      return { id: visitorId, fingerprint, isNew: false };
    }

    // Then check localStorage
    visitorId = localStorage.getItem('mp_visitor_id');
    if (visitorId) {
      console.log('Returning visitor from local storage:', visitorId);
      await sendTrackingData({
        id: visitorId,
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, 'visitors', 'PATCH');
      return { id: visitorId, fingerprint, isNew: false };
    }

    // If no visitor found, create new one
    const visitorData = {
      first_fingerprint_id: fingerprint,
      first_seen_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      additional_fingerprints: []
    };

    const result = await sendTrackingData(visitorData, 'visitors');
    if (result && result[0]?.id) {
      visitorId = result[0].id;
      sessionStorage.setItem('mp_visitor_id', visitorId);
      localStorage.setItem('mp_visitor_id', visitorId);
      console.log('New visitor created:', visitorId);
      return { id: visitorId, fingerprint, isNew: true };
    }

    console.error('Failed to create or identify visitor');
    return null;
  }

  // Enhanced sendTrackingData to support PATCH
  async function sendTrackingData(eventData, table, method = 'POST') {
    try {
      const endpoint = `https://lwyxvzvyvpqhuocfcbwd.supabase.co/rest/v1/${table}`;
      const url = method === 'PATCH' ? `${endpoint}?id=eq.${eventData.id}` : `${endpoint}?select=id`;
      
      console.log(`Attempting to send data to ${table}:`, eventData);
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3eXh2enZ5dnBxaHVvY2ZjYndkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjc1MTUwNTYsImV4cCI6MjA0MzA5MTA1Nn0.WYwNg-BHhIdbj7pcCuBnqc8-c9NU5sR8hPQLDlGY9RY',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3eXh2enZ5dnBxaHVvY2ZjYndkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjc1MTUwNTYsImV4cCI6MjA0MzA5MTA1Nn0.WYwNg-BHhIdbj7pcCuBnqc8-c9NU5sR8hPQLDlGY9RY',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(eventData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }
      
      const data = await response.json();
      console.log(`Successfully sent data to ${table}:`, data);
      return data;
    } catch (error) {
      console.error(`Failed to send data to ${table}:`, error);
      return null;
    }
  }

  // Helper function to find existing company
  async function findCompany(domain) {
    try {
      const response = await fetch(
        `https://lwyxvzvyvpqhuocfcbwd.supabase.co/rest/v1/companies?domain=eq.${domain}&select=id`,
        {
          headers: {
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3eXh2enZ5dnBxaHVvY2ZjYndkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjc1MTUwNTYsImV4cCI6MjA0MzA5MTA1Nn0.WYwNg-BHhIdbj7pcCuBnqc8-c9NU5sR8hPQLDlGY9RY',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3eXh2enZ5dnBxaHVvY2ZjYndkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjc1MTUwNTYsImV4cCI6MjA0MzA5MTA1Nn0.WYwNg-BHhIdbj7pcCuBnqc8-c9NU5sR8hPQLDlGY9RY'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const companies = await response.json();
      return companies[0];
    } catch (error) {
      console.error('Error finding company:', error);
      return null;
    }
  }

  // Enhanced form tracking with visitor identification
function setupFormTracking() {
  document.addEventListener('submit', async function(e) {
    const form = e.target;
    
    // Find email field
    const emailField = Array.from(form.elements).find(el => 
      el.type === 'email' || 
      el.name?.toLowerCase().includes('email') ||
      el.id?.toLowerCase().includes('email')
    );

    // Find company name field
    const companyField = Array.from(form.elements).find(el =>
      el.name?.toLowerCase().includes('company') ||
      el.name?.toLowerCase().includes('organization') ||
      el.id?.toLowerCase().includes('company') ||
      el.id?.toLowerCase().includes('organization')
    );

    const email = emailField?.value?.trim();
    const companyName = companyField?.value?.trim();
    
    // Extract email domain and check if business email
    let emailDomain = null;
    let isBusinessEmail = false;
    
    if (email) {
      emailDomain = email.split('@')[1]?.toLowerCase();
      // Exclude common personal email domains
      const personalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com'];
      isBusinessEmail = emailDomain && !personalDomains.includes(emailDomain);
    }

    // Get current visitor ID
    const visitorId = sessionStorage.getItem('mp_visitor_id');
    
    if (email && visitorId) {
      // Update visitor record with identification
      const visitorData = {
        id: visitorId,
        email: email,
        email_domain: emailDomain,
        is_identified: true,
        identification_date: new Date().toISOString(),
        identification_source: 'form_submission',
        updated_at: new Date().toISOString()
      };

      try {
        await sendTrackingData(visitorData, 'visitors', 'PATCH');
        console.log('Visitor identified:', visitorId);

        // If business email, handle company identification
        if (isBusinessEmail) {
          await handleCompanyIdentification(emailDomain, companyName, visitorId, email);
        }
      } catch (error) {
        console.error('Error identifying visitor:', error);
      }
    }

    // Track form submission
    const formData = {
      session_id: parseInt(sessionStorage.getItem('mp_session_numeric_id')),
      visitor_id: visitorId,
      form_id: form.id || null,
      form_name: form.getAttribute('name') || null,
      form_action: form.action,
      page_url: window.location.href,
      email_domain: emailDomain,
      email: email,
      is_business_email: isBusinessEmail,
      form_fields: JSON.stringify({
        has_company_field: !!companyField,
        has_email_field: !!emailField,
        company_name: companyName || null
      }),
      metadata: JSON.stringify({
        form_type: detectFormType(form),
        field_count: form.elements.length,
        has_required_fields: Array.from(form.elements).some(el => el.required)
      })
    };

    try {
      await sendTrackingData(formData, 'form_submissions');
    } catch (error) {
      console.error('Error tracking form submission:', error);
    }
  });
}

// Enhanced company identification handling
async function handleCompanyIdentification(domain, companyName, visitorId, email) {
  try {
    // Try to find existing company
    const existingCompany = await findCompany(domain);
    
    if (existingCompany) {
      // Update existing company
      await sendTrackingData({
        id: existingCompany.id,
        last_enrichment_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, 'companies', 'PATCH');

      // Update visitor with company association
      await sendTrackingData({
        id: visitorId,
        company_id: existingCompany.id,
        updated_at: new Date().toISOString()
      }, 'visitors', 'PATCH');
    } else {
      // Create new company
      const companyData = {
        domain: domain,
        name: companyName || domain.split('.')[0],
        identified_via: 'form_submission',
        identified_at: new Date().toISOString(),
        status: 'identified',
        company_data: JSON.stringify({
          first_visitor_id: visitorId,
          first_seen_email: email
        })
      };

      const newCompany = await sendTrackingData(companyData, 'companies');
      if (newCompany?.[0]?.id) {
        // Link visitor to new company
        await sendTrackingData({
          id: visitorId,
          company_id: newCompany[0].id,
          updated_at: new Date().toISOString()
        }, 'visitors', 'PATCH');
      }
    }
  } catch (error) {
    console.error('Error handling company identification:', error);
  }
}

// Helper function to detect form type
function detectFormType(form) {
  const formHtml = form.outerHTML.toLowerCase();
  
  if (formHtml.includes('contact') || form.id?.toLowerCase().includes('contact')) {
    return 'contact';
  } else if (formHtml.includes('subscribe') || formHtml.includes('newsletter')) {
    return 'newsletter';
  } else if (formHtml.includes('demo') || formHtml.includes('trial')) {
    return 'demo';
  }
  return 'other';
}

  // Track file downloads
  function setupDownloadTracking() {
    document.addEventListener('click', function(e) {
      const link = e.target.closest('a');
      if (!link) return;

      const href = link.href || '';
      const fileExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.zip', '.rar'];
      const isDownload = fileExtensions.some(ext => href.toLowerCase().endsWith(ext));

      if (isDownload) {
        trackEvent('file_download', 'LINK', link.id, {
          fileName: href.split('/').pop(),
          fileType: href.split('.').pop().toLowerCase()
        });
      }
    });
  }

  // Track video interactions
  function setupVideoTracking() {
    document.addEventListener('play', function(e) {
      if (e.target.tagName === 'VIDEO') {
        trackEvent('video_play', 'VIDEO', e.target.id, {
          videoSrc: e.target.currentSrc,
          videoDuration: e.target.duration
        });
      }
    }, true);

    document.addEventListener('pause', function(e) {
      if (e.target.tagName === 'VIDEO') {
        trackEvent('video_pause', 'VIDEO', e.target.id, {
          videoSrc: e.target.currentSrc,
          timeStamp: e.target.currentTime
        });
      }
    }, true);
  }

  // Helper: Calculate scroll depth percentage
  function getScrollDepth() {
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    return Math.round((scrollTop + windowHeight) / documentHeight * 100);
  }

  // Helper: Track custom event
  function trackEvent(eventType, elementType = null, elementId = null, additionalData = {}) {
    const eventData = {
      session_id: sessionNumericId,
      event_type: eventType,
      event_timestamp: new Date().toISOString(),
      page_url: window.location.href,
      element_type: elementType,
      element_id: elementId,
      other_data: JSON.stringify(additionalData)
    };
    sendTrackingData(eventData, 'events');
  }

  // Track scroll depth
  function setupScrollTracking() {
    let timer;
    window.addEventListener('scroll', function() {
      clearTimeout(timer);
      timer = setTimeout(function() {
        const currentDepth = getScrollDepth();
        if (currentDepth > maxScrollDepth) {
          maxScrollDepth = currentDepth;
          if (maxScrollDepth % 25 === 0) { // Track at 25%, 50%, 75%, 100%
            trackEvent('scroll_depth', null, null, {
              depth: maxScrollDepth
            });
          }
        }
      }, 100);
    });
  }

  // Track time on page
  function setupTimeOnPageTracking() {
    // Track every 30 seconds
    setInterval(function() {
      const timeSpent = Math.round((new Date() - pageStartTime) / 1000);
      trackEvent('time_on_page', null, null, {
        seconds: timeSpent
      });
    }, 30000);
  }

  // Main tracking logic - Updated to include UTM tracking
  async function startTracking() {
    try {
      // First identify the visitor
      const visitorInfo = await identifyVisitor();
      if (!visitorInfo) {
        console.error('Failed to identify visitor');
        return;
      }

      console.log(`Visitor identified: ${visitorInfo.id}`);

      // Store visitor ID in session
      sessionStorage.setItem('mp_visitor_id', visitorInfo.id);

      // Generate session ID
      sessionNumericId = generateNumericId();
      console.log(`Generated session numeric ID: ${sessionNumericId}`);

      // Get traffic info and URL parameters
      const urlParams = getURLParameters();
      console.log('Retrieved URL Parameters:', urlParams);

      const trafficInfo = getTrafficInfo();
      console.log('Traffic Information:', trafficInfo);

      // Create session with visitor ID
      const sessionData = {
        fingerprint_id: visitorInfo.fingerprint,
        visitor_id: visitorInfo.id,
        session_start: new Date().toISOString(),
        entry_page_url: window.location.href,
        traffic_source: trafficInfo.source,
        traffic_medium: trafficInfo.medium,
        traffic_channel: trafficInfo.channel,
        device_type: getDeviceType(),
        country: Intl.DateTimeFormat().resolvedOptions().timeZone,
        click_id: urlParams.click_id || null
      };

      const sessionResult = await sendTrackingData(sessionData, 'sessions');
      if (!sessionResult?.[0]?.id) {
        console.error('Failed to create session');
        return;
      }

      const sessionUUID = sessionResult[0].id;
      console.log(`Session created with UUID: ${sessionUUID}`);
      sessionStorage.setItem('mp_session_uuid', sessionUUID);
      sessionStorage.setItem('mp_session_numeric_id', sessionNumericId.toString());

      // Store UTM parameters if they exist
      const hasUtmParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']
        .some(param => urlParams[param]);

      if (hasUtmParams) {
        const utmData = {
          session_id: sessionNumericId,
          utm_source: urlParams.utm_source,
          utm_medium: urlParams.utm_medium,
          utm_campaign: urlParams.utm_campaign,
          utm_term: urlParams.utm_term,
          utm_content: urlParams.utm_content
        };
        console.log('Storing UTM parameters:', utmData);
        await sendTrackingData(utmData, 'utmparameters');
      }

      // Record initial page visit
      const pageVisitData = {
        session_id: sessionNumericId,
        page_url: window.location.href,
        visit_timestamp: new Date().toISOString(),
        page_type: 'page'
      };
      console.log('Recording initial page visit:', pageVisitData);
      await sendTrackingData(pageVisitData, 'pagevisits');

      // Set up all event tracking
      setupFormTracking();
      setupDownloadTracking();
      setupVideoTracking();
      setupScrollTracking();
      setupTimeOnPageTracking();

      // Track clicks
      document.addEventListener('click', function (e) {
        console.log(`Tracking click event on element: ${e.target.tagName}, ID: ${e.target.id}`);
        trackEvent('click', e.target.tagName, e.target.id, {
          pageX: e.pageX,
          pageY: e.pageY
        });
      });


      // Track session end
      window.addEventListener('beforeunload', function () {
        console.log('Session ending, tracking session end data...');
        const sessionEndData = {
          id: sessionUUID,
          session_end: new Date().toISOString(),
          exit_page_url: window.location.href
        };
        
        // Use sendBeacon for reliable end-of-session tracking
        try {
          navigator.sendBeacon(
            'https://lwyxvzvyvpqhuocfcbwd.supabase.co/rest/v1/sessions',
            JSON.stringify({
              ...sessionEndData,
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3eXh2enZ5dnBxaHVvY2ZjYndkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjc1MTUwNTYsImV4cCI6MjA0MzA5MTA1Nn0.WYwNg-BHhIdbj7pcCuBnqc8-c9NU5sR8hPQLDlGY9RY',
                'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3eXh2enZ5dnBxaHVvY2ZjYndkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjc1MTUwNTYsImV4cCI6MjA0MzA5MTA1Nn0.WYwNg-BHhIdbj7pcCuBnqc8-c9NU5sR8hPQLDlGY9RY'
              }
            })
          );
          console.log('Session end data successfully sent using sendBeacon.');
        } catch (e) {
          console.error('Failed to send session end data using sendBeacon:', e);
        }

        // Track final scroll depth
        trackEvent('final_scroll_depth', null, null, {
          depth: maxScrollDepth
        });
      });

      console.log('Tracking initialized with session:', sessionUUID);
    } catch (error) {
      console.error('Error during startTracking:', error);
    }
  }

  // Start tracking
  startTracking().catch(console.error);
  console.log("Script finished setup");
})();
</script>
