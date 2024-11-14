(function(window) {
  // Prevent double initialization
  if (window.ClientTracker) return;

  // Default configuration
  const DEFAULT_CONFIG = {
    supabaseUrl: 'https://lwyxvzvyvpqhuocfcbwd.supabase.co',
    supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3eXh2enZ5dnBxaHVvY2ZjYndkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjc1MTUwNTYsImV4cCI6MjA0MzA5MTA1Nn0.WYwNg-BHhIdbj7pcCuBnqc8-c9NU5sR8hPQLDlGY9RY',
    debug: window.location.search.includes('hsdebug=true'),
    batchSize: 10,
    batchDelay: 2000,
    sessionTimeout: 30,
    retryAttempts: 3
  };

  let config = DEFAULT_CONFIG;
  let pageStartTime = new Date();
  let maxScrollDepth = 0;
  let inactivityInterval;
  let inactivityTimeout = 10; // Max inactive minutes before ending session
  let isSessionEnding = false;
  let lastActivityTime = new Date();
  let activeTabTime = 0;
  let isTabActive = true;
  let tabSwitchCount = 0;
  let inactivityPeriods = [];

  // Constants
  const COMMON_EMAIL_PROVIDERS = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 
    'aol.com', 'icloud.com', 'protonmail.com', 'mail.com'
  ];

  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000;
  const eventQueue = [];
  const MAX_QUEUE_SIZE = 10;
  const QUEUE_TIMEOUT = 5000;
  let queueTimeout;

  const DEBOUNCE_DELAY = 200;
  const SESSION_STORAGE_KEYS = {
    SESSION_ID: 'mp_session_id',
    SESSION_START: 'mp_session_start',
    VISITOR_ID: 'mp_visitor_id'
};


  // Add this helper function
  function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  // Core Functions
  async function sendTrackingData(eventData, table, method = 'POST', retryCount = 0) {
    try {
        const endpoint = `${config.supabaseUrl}/rest/v1/${table}`;
        const url = method === 'PATCH' ? `${endpoint}?id=eq.${eventData.id}` : endpoint;
        
        config.debug && console.log(`Attempting to send data to ${table}:`, eventData);
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.supabaseKey}`,
                'apikey': config.supabaseKey,
                'Prefer': method === 'POST' ? 'return=representation' : 'return=minimal'
            },
            body: JSON.stringify(Array.isArray(eventData) ? eventData : [eventData])
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        // Only try to parse JSON for POST requests or when expecting a response
        if (method === 'POST' || response.headers.get('content-type')?.includes('application/json')) {
            try {
                const data = await response.json();
                config.debug && console.log(`Successfully sent data to ${table}:`, data);
                return data;
            } catch (parseError) {
                // If JSON parsing fails but the request was successful (PATCH with no content)
                if (method === 'PATCH' && response.status === 204) {
                    config.debug && console.log(`Successfully updated ${table}`);
                    return [{ id: eventData.id }];
                }
                throw new Error(`Failed to parse response: ${parseError.message}`);
            }
        }

        // For successful PATCH requests that don't return content
        if (method === 'PATCH' && response.status === 204) {
            return [{ id: eventData.id }];
        }

        return null;
    } catch (error) {
        config.debug && console.error(`Failed to send data to ${table}:`, error);
        
        if (retryCount < MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
            return sendTrackingData(eventData, table, method, retryCount + 1);
        }

        // Log the actual error data for debugging
        console.error('Failed after all retries:', {
            table,
            data: eventData,
            error: error.message
        });

        // Store failed request for later retry
        const failedEvents = JSON.parse(localStorage.getItem('failed_events') || '[]');
        failedEvents.push({
            eventData,
            table,
            method,
            timestamp: new Date().toISOString()
        });
        localStorage.setItem('failed_events', JSON.stringify(failedEvents));

        return null;
    }
}

  // Helper Functions
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

  function getURLParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Handle UTM parameters
    const utmParams = {
      utm_source: urlParams.get('utm_source'),
      utm_medium: urlParams.get('utm_medium'),
      utm_campaign: urlParams.get('utm_campaign'),
      utm_term: urlParams.get('utm_term'),
      utm_content: urlParams.get('utm_content')
    };

    // Handle click IDs
    const clickIdParams = {
      gclid: urlParams.get('gclid'),
      fbclid: urlParams.get('fbclid'),
      ttclid: urlParams.get('ttclid'),
      msclkid: urlParams.get('msclkid')
    };

    // Store UTM params in session if they exist
    if (Object.values(utmParams).some(value => value)) {
      sessionStorage.setItem('utm_params', JSON.stringify(utmParams));
      console.log('UTM parameters stored in session:', utmParams);
    }

    return {
      ...utmParams,
      click_id: Object.entries(clickIdParams).find(([_, value]) => value)?.[1] || null,
      click_id_type: Object.entries(clickIdParams).find(([_, value]) => value)?.[0] || null
    };
  }

  function getTrafficInfo() {
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

    const urlParams = getURLParameters();
    if (urlParams.utm_source && urlParams.utm_medium) {
      return {
        source: urlParams.utm_source,
        medium: urlParams.utm_medium,
        channel: getChannelFromUTM(urlParams.utm_medium)
      };
    }

    const referrer = document.referrer;
    if (!referrer) {
      return { source: 'direct', medium: 'none', channel: 'direct' };
    }

    try {
      const referrerDomain = new URL(referrer).hostname;
      
      const searchEngines = {
        'google': { medium: 'organic', channel: 'Organic Search' },
        'bing': { medium: 'organic', channel: 'Organic Search' },
        'yahoo': { medium: 'organic', channel: 'Organic Search' },
        'duckduckgo': { medium: 'organic', channel: 'Organic Search' }
      };

      const socialPlatforms = {
        'facebook.com': { medium: 'social', channel: 'Social Media' },
        'instagram.com': { medium: 'social', channel: 'Social Media' },
        'linkedin.com': { medium: 'social', channel: 'Social Media' },
        'twitter.com': { medium: 'social', channel: 'Social Media' },
        't.co': { medium: 'social', channel: 'Social Media' },
        'tiktok.com': { medium: 'social', channel: 'Social Media' }
      };

      for (const [engine, data] of Object.entries(searchEngines)) {
        if (referrerDomain.includes(engine)) {
          return {
            source: engine.charAt(0).toUpperCase() + engine.slice(1),
            medium: data.medium,
            channel: data.channel
          };
        }
      }

      for (const [platform, data] of Object.entries(socialPlatforms)) {
        if (referrerDomain.includes(platform)) {
          return {
            source: platform.split('.')[0].charAt(0).toUpperCase() + platform.split('.')[0].slice(1),
            medium: data.medium,
            channel: data.channel
          };
        }
      }

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

  async function identifyVisitor() {
    const fingerprint = generateFingerprint();
    
    let visitorId = sessionStorage.getItem('mp_visitor_id');
    if (visitorId) {
      console.log('Returning visitor from session:', visitorId);
      return { id: visitorId, fingerprint, isNew: false };
    }

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

  async function logError(error, metadata = {}) {
    const eventData = {
      session_uuid: sessionStorage.getItem('mp_session_id'),
      event_type: 'error',
      event_timestamp: new Date().toISOString(),
      page_url: window.location.href,
      element_type: null,
      element_id: null,
      other_data: JSON.stringify({
        error_message: error.message,
        error_stack: error.stack,
        ...metadata,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      })
    };

    try {
      await sendTrackingData([eventData], 'events');
      config.debug && console.log('Error logged:', eventData);
    } catch (e) {
      console.error('Failed to log error:', e);
      const failedLogs = JSON.parse(localStorage.getItem('failed_error_logs') || '[]');
      failedLogs.push(eventData);
      localStorage.setItem('failed_error_logs', JSON.stringify(failedLogs));
    }
  }


function validateEventData(data) {
  const required = ['session_uuid', 'event_type', 'event_timestamp'];
  const missing = required.filter(field => !data[field]);
  if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
  return true;
}
  // Update the trackEvent function
  async function trackEvent(eventType, elementType = null, elementId = null, additionalData = {}) {
    try {
        let sessionId = sessionStorage.getItem(SESSION_STORAGE_KEYS.SESSION_ID);
        const visitorId = sessionStorage.getItem(SESSION_STORAGE_KEYS.VISITOR_ID);
        
        if (!sessionId) {
            sessionId = await startTracking();
            if (!sessionId) throw new Error('Failed to create/retrieve session');
        }

        const eventData = {
            session_uuid: sessionId,
            visitor_id: visitorId,  // Add visitor_id
            event_type: eventType,
            event_timestamp: new Date().toISOString(),
            page_url: window.location.href,
            element_type: elementType || null,
            element_id: elementId || null,
            other_data: JSON.stringify({
                ...additionalData,
                tab_active: isTabActive,
                time_since_last_activity: lastActivityTime ? 
                    Math.round((new Date() - lastActivityTime) / 1000) : 0,
                active_tab_time: Math.round(activeTabTime),
                session_ending: isSessionEnding
            })
        };

        validateEventData(eventData);
        eventQueue.push(eventData);

        // Process queue if it reaches the max size
        if (eventQueue.length >= MAX_QUEUE_SIZE) {
            clearTimeout(queueTimeout);
            await processQueue();
        } else {
            // Set a timeout to process the queue
            clearTimeout(queueTimeout);
            queueTimeout = setTimeout(processQueue, QUEUE_TIMEOUT);
        }
    } catch (error) {
        await logError(error, { event_type: eventType });
    }
}

// Add form data validation function
function validateFormData(data) {
  const required = ['session_uuid', 'visitor_id', 'submission_timestamp'];
  const missing = required.filter(field => !data[field]);
  if (missing.length > 0) {
      throw new Error(`Missing required form fields: ${missing.join(', ')}`);
  }
  return true;
}


// Enhanced form tracking setup
function setupFormTracking() {
    document.addEventListener('submit', async function(e) {
        try {
            // 1. Check/Create Session
            let sessionId = sessionStorage.getItem(SESSION_STORAGE_KEYS.SESSION_ID);
            if (!sessionId) {
                sessionId = await startTracking();
                if (!sessionId) {
                    console.error('Failed to create session for form submission');
                    return;
                }
            }

            const form = e.target;
            
            // 2. Field Detection
            const emailField = Array.from(form.elements).find(el => 
                el.type === 'email' || 
                el.name?.toLowerCase().includes('email') ||
                el.id?.toLowerCase().includes('email')
            );

            const companyField = Array.from(form.elements).find(el =>
                el.name?.toLowerCase().includes('company') ||
                el.name?.toLowerCase().includes('organization') ||
                el.id?.toLowerCase().includes('company') ||
                el.id?.toLowerCase().includes('organization')
            );

            // 3. Email Processing
            const email = emailField?.value?.trim();
            const companyName = companyField?.value?.trim();
            
            let emailDomain = null;
            let isBusinessEmail = false;
            
            if (email) {
                emailDomain = email.split('@')[1]?.toLowerCase();
                isBusinessEmail = emailDomain && !COMMON_EMAIL_PROVIDERS.includes(emailDomain);
            }

            // 4. Visitor Update
            const visitorId = sessionStorage.getItem(SESSION_STORAGE_KEYS.VISITOR_ID);
            if (email && visitorId) {
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

                    if (isBusinessEmail) {
                        await handleCompanyIdentification(emailDomain, companyName, visitorId, email);
                    }
                } catch (error) {
                    await logError(error, { context: 'visitor_identification', visitorId });
                }
            }

            // 5. Form Submission Tracking
            const formData = {
                session_uuid: sessionId,           // New UUID field
                session_id: null, 
                visitor_id: visitorId,
                form_id: form.id || null,
                form_name: form.getAttribute('name') || null,
                form_action: form.action,
                page_url: window.location.href,
                email_domain: emailDomain,
                email: email,
                is_business_email: isBusinessEmail,
                submission_timestamp: new Date().toISOString(),
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

            // Validate form data
            validateFormData(formData);

            // 6. Track Form Submission
            await Promise.all([
                sendTrackingData(formData, 'form_submissions'),
                trackEvent('form_complete', 'FORM', form.id, {
                    formType: detectFormType(form),
                    hasEmail: !!emailField,
                    hasCompany: !!companyField,
                    isBusinessEmail: isBusinessEmail
                })
            ]).catch(error => {
                logError(error, { 
                    context: 'form_submission',
                    formId: form.id,
                    sessionId 
                });
            });

        } catch (error) {
            await logError(error, { context: 'form_tracking' });
        }
    });

    // 7. Field Change Tracking
    document.addEventListener('change', async function(e) {
        const field = e.target;
        if (field.form) {
            await trackEvent('form_field_complete', field.tagName, field.id, {
                fieldType: field.type,
                fieldName: field.name,
                isRequired: field.required,
                formId: field.form.id,
                formType: detectFormType(field.form)
            }).catch(error => {
                logError(error, { 
                    context: 'field_change',
                    fieldId: field.id 
                });
            });
        }
    });
}

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

function getScrollDepth() {
  const windowHeight = window.innerHeight;
  const documentHeight = document.documentElement.scrollHeight;
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  return Math.round((scrollTop + windowHeight) / documentHeight * 100);
}

function setupScrollTracking() {
  let lastTrackedDepth = 0;

  window.addEventListener('scroll', debounce(function() {
      const currentDepth = getScrollDepth();
      
      if (currentDepth > maxScrollDepth) {
          maxScrollDepth = currentDepth;
          
          if (Math.floor(currentDepth / 25) > Math.floor(lastTrackedDepth / 25)) {
              trackEvent('scroll_depth', null, null, {
                  depth: Math.floor(currentDepth / 25) * 25
              });
              lastTrackedDepth = currentDepth;
          }
      }
  }, DEBOUNCE_DELAY));
}

function setupEnhancedSessionTracking() {
  document.addEventListener('visibilitychange', () => {
    isTabActive = document.visibilityState === 'visible';
    if (isTabActive) {
        lastActivityTime = new Date();
        if (isSessionEnding) {
            isSessionEnding = false;
            console.log('Session restored due to user activity');
        }
    }
  });

  const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
  activityEvents.forEach(eventType => {
    document.addEventListener(eventType, () => {
        lastActivityTime = new Date();
        if (isSessionEnding) {
            isSessionEnding = false;
            console.log('Session restored due to user activity');
        }
    });
  });

  inactivityInterval = setInterval(() => {
    if (!isTabActive) return;
    
    const inactiveTime = (new Date() - lastActivityTime) / 1000 / 60;
    if (inactiveTime >= inactivityTimeout && !isSessionEnding) {
        isSessionEnding = true;
        trackEvent('session_inactive', null, null, {
            inactiveTime: inactiveTime
        });
    }
  }, 60000);
}

// Update the time tracking variables at the top with other state variables
let activeTimeSum = 0;
let lastActiveTime = Date.now();

// Update the setupTimeOnPageTracking function
function setupTimeOnPageTracking() {
  // Track active time every second when tab is active
  setInterval(function() {
      if (isTabActive) {
          const currentTime = Date.now();
          activeTimeSum += (currentTime - lastActiveTime);
          lastActiveTime = currentTime;
      }
  }, 1000);
  
  // Track a checkpoint every 5 minutes as backup
  setInterval(function() {
      if (isTabActive) {
          trackEvent('page_time_checkpoint', null, null, {
              activeTime: Math.round(activeTimeSum / 1000),
              totalTime: Math.round((Date.now() - pageStartTime) / 1000)
          });
      }
  }, 300000); // 5 minutes
}

function setupFailedEventRecovery() {
  setInterval(async () => {
    if (!navigator.onLine) return;

    const failedLogs = JSON.parse(localStorage.getItem('failed_error_logs') || '[]');
    if (failedLogs.length > 0) {
      const successfulLogs = [];
      for (const log of failedLogs) {
        try {
          // Make sure the log data matches the events schema
          const eventData = {
            session_uuid: log.session_uuid,
            event_type: 'error',
            event_timestamp: new Date().toISOString(),
            page_url: log.page_url,
            element_type: null,
            element_id: null,
            other_data: JSON.stringify(log.other_data)
          };
          await sendTrackingData([eventData], 'events');
          successfulLogs.push(log);
        } catch (e) {
          console.error('Failed to resend error log:', e);
        }
      }
      localStorage.setItem('failed_error_logs', 
        JSON.stringify(failedLogs.filter(log => !successfulLogs.includes(log)))
      );
    }

    const failedEvents = JSON.parse(localStorage.getItem('failed_events') || '[]');
    if (failedEvents.length > 0) {
      const successfulEvents = [];
      for (const event of failedEvents) {
        try {
          await sendTrackingData(event.eventData, event.table, event.method);
          successfulEvents.push(event);
        } catch (e) {
          console.error('Failed to resend event:', e);
        }
      }
      localStorage.setItem('failed_events', 
        JSON.stringify(failedEvents.filter(event => !successfulEvents.includes(event)))
      );
    }
  }, 60000);
}

// New function: Detect form type
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

// New function: Find company
async function findCompany(domain) {
  try {
    const response = await fetch(
      `${config.supabaseUrl}/rest/v1/companies?domain=eq.${domain}&select=id`,
      {
        headers: {
          'Authorization': `Bearer ${config.supabaseKey}`,
          'apikey': config.supabaseKey
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

// New function: Process event queue
const processQueue = async () => {
  if (eventQueue.length === 0) return;
  
  const events = [...eventQueue];
  eventQueue.length = 0; // Clear queue
  
  try {
    await sendTrackingData(events, 'events');
    config.debug && console.log(`Processed ${events.length} events from queue`);
  } catch (error) {
    console.error('Error processing queue:', error);
    eventQueue.push(...events);
  }
};

async function startTracking() {
  try {
    const visitorInfo = await identifyVisitor();
    if (!visitorInfo) {
      config.debug && console.error('Failed to identify visitor');
      return null;
    }

    console.log(`Visitor identified: ${visitorInfo.id}`);
    sessionStorage.setItem('mp_visitor_id', visitorInfo.id);

    // Check for existing session
    const existingSessionId = sessionStorage.getItem(SESSION_STORAGE_KEYS.SESSION_ID);
    const sessionStart = sessionStorage.getItem(SESSION_STORAGE_KEYS.SESSION_START);
    
    if (existingSessionId && sessionStart) {
        // Validate session age
        const sessionAge = Date.now() - new Date(sessionStart).getTime();
        if (sessionAge < config.sessionTimeout * 60 * 1000) {
            return existingSessionId;
        }
        // Session expired, continue to create new session
    }

    // Get traffic info and URL parameters
    const trafficInfo = getTrafficInfo();
    const urlParams = getURLParameters();

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
    if (!sessionResult?.[0]?.id) return null;

    const sessionId = sessionResult[0].id;
    sessionStorage.setItem(SESSION_STORAGE_KEYS.SESSION_ID, sessionId);
    sessionStorage.setItem(SESSION_STORAGE_KEYS.SESSION_START, sessionData.session_start);

    // Handle UTM parameters
    await handleUTMParameters(sessionId, urlParams);

    // Record initial page visit
    const pageVisitData = {
        session_uuid: sessionId,
        page_url: window.location.href,
        visit_timestamp: new Date().toISOString(),
        page_type: 'page',
        time_on_page: null
    };
    
    console.log('Recording initial page visit:', pageVisitData);
    await sendTrackingData(pageVisitData, 'pagevisits');

    console.log('Tracking initialized with session:', sessionId);
    return sessionId;
  } catch (error) {
    config.debug && console.error('Error during startTracking:', error);
    return null;
  }
}

function validateUTMData(data) {
    // Check required fields based on our constraints
    if (!data.session_uuid) {
        throw new Error('Missing required field: session_uuid');
    }
    
    // Validate UTM parameter format if present
    const utmFields = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
    utmFields.forEach(field => {
        if (data[field] && typeof data[field] !== 'string') {
            throw new Error(`Invalid ${field} format`);
        }
    });

    return true;
}

async function handleUTMParameters(sessionId, urlParams) {
    if (!sessionId) {
        throw new Error('Session ID is required for UTM parameters');
    }

    if (urlParams.utm_source || urlParams.utm_medium || urlParams.utm_campaign) {
        const utmData = {
            session_uuid: sessionId,
            utm_source: urlParams.utm_source || null,
            utm_medium: urlParams.utm_medium || null,
            utm_campaign: urlParams.utm_campaign || null,
            utm_term: urlParams.utm_term || null,
            utm_content: urlParams.utm_content || null
        };

        try {
            validateUTMData(utmData);
            console.log('Storing UTM parameters:', utmData);
            return await sendTrackingData(utmData, 'utmparameters');
        } catch (error) {
            console.error('Failed to store UTM parameters:', error);
            const failedEvents = JSON.parse(localStorage.getItem('failed_events') || '[]');
            failedEvents.push({
                eventData: utmData,
                table: 'utmparameters',
                method: 'POST',
                timestamp: new Date().toISOString()
            });
            localStorage.setItem('failed_events', JSON.stringify(failedEvents));
            throw error;
        }
    }
    return null;
}

// Add recordPageVisit function before initializeTracker
async function recordPageVisit(sessionId, pageUrl) {
    if (!sessionId || !pageUrl) {
        throw new Error('Session ID and page URL are required');
    }

    const visitorId = sessionStorage.getItem(SESSION_STORAGE_KEYS.VISITOR_ID);
    
    const pageVisitData = {
        session_uuid: sessionId,
        visitor_id: visitorId,
        page_url: pageUrl,
        visit_timestamp: new Date().toISOString(),
        page_type: 'page',
        time_on_page: null
    };
    
    // Validate required fields
    if (!pageVisitData.page_url || !pageVisitData.visit_timestamp || !pageVisitData.page_type) {
        throw new Error('Missing required pagevisit fields');
    }
    
    return await sendTrackingData(pageVisitData, 'pagevisits');
}

// Add a cleanup function for duplicate UTMs (optional)
async function cleanupDuplicateUTMs(sessionId) {
    if (!sessionId) {
        throw new Error('Session ID is required for UTM cleanup');
    }

    try {
        const response = await fetch(
            `${config.supabaseUrl}/rest/v1/utmparameters?session_uuid=eq.${sessionId}`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${config.supabaseKey}`,
                    'apikey': config.supabaseKey
                }
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const utms = await response.json();
        if (!Array.isArray(utms) || utms.length <= 1) return;

        // Keep only the first UTM set for this session
        const [first, ...duplicates] = utms;
        await Promise.all(duplicates.map(dup => 
            sendTrackingData({ id: dup.id }, 'utmparameters', 'DELETE')
        ));
    } catch (error) {
        console.error('Error cleaning up duplicate UTMs:', error);
        throw error;
    }
}

async function initializeTracker(userConfig = {}) {
  try {
    config = { ...DEFAULT_CONFIG, ...userConfig };
    
    if (!config.supabaseUrl || !config.supabaseKey) {
      throw new Error('Supabase URL and API key are required');
    }

    // Start tracking first
    const sessionId = await startTracking();
    if (!sessionId) {
      throw new Error('Failed to initialize tracking session');
    }

    // Then set up all event handlers
    setupFormTracking();
    setupDownloadTracking();
    setupVideoTracking();
    setupScrollTracking();
    setupEnhancedSessionTracking();
    setupTimeOnPageTracking();
    setupFailedEventRecovery();

    // Set up click tracking once
    document.addEventListener('click', function(e) {
      const target = e.target.closest('a, button, [role="button"], input[type="submit"]');
      if (target) {
        const elementInfo = {
          type: target.tagName.toLowerCase(),
          id: target.id || '',
          text: target.innerText || target.value || '',
          href: target.href || '',
          classes: target.className
        };
        
        if (
          target.closest('[data-track]') ||
          elementInfo.href ||
          elementInfo.type === 'submit' ||
          elementInfo.classes.includes('cta') ||
          elementInfo.classes.includes('btn-primary')
        ) {
          trackEvent('click', elementInfo.type, elementInfo.id, {
            text: elementInfo.text,
            href: elementInfo.href
          });
        }
      }
    });

  } catch (error) {
    console.error('Fatal initialization error:', error);
  }
}

window.initializeClientTracker = async function(userConfig) {
  try {
    await initializeTracker(userConfig);
  } catch (error) {
    console.error('Error initializing tracker:', error);
  }
};

window.ClientTracker = {
  init: window.initializeClientTracker,
  track: function(eventName, data) {
    trackEvent(eventName, null, null, data);
  }
};

if (window.google_tag_manager) {
  try {
    const gtmConfig = window.dataLayer?.find(item => item.trackerConfig)?.trackerConfig;
    if (gtmConfig) {
      window.initializeClientTracker(gtmConfig);
    }
  } catch (error) {
    console.error('GTM initialization error:', error);
  }
}

// Update beforeunload handler
window.addEventListener('beforeunload', function() {
  const sessionId = sessionStorage.getItem('mp_session_id');
  if (!sessionId) return;

  console.log('Session ending, tracking session end data...');
  
  // Track final time summary
  trackEvent('page_time_summary', null, null, {
    activeTime: Math.round(activeTimeSum / 1000),
    totalTime: Math.round((Date.now() - pageStartTime) / 1000),
    isActive: isTabActive
  });

  // Track final scroll depth
  trackEvent('final_scroll_depth', null, null, {
    depth: maxScrollDepth
  });

  const sessionEndData = {
    id: sessionId,
    session_end: new Date().toISOString(),
    exit_page_url: window.location.href,
    other_data: JSON.stringify({
      total_active_time: Math.round(activeTimeSum / 1000),
      total_time: Math.round((Date.now() - pageStartTime) / 1000),
      final_scroll_depth: maxScrollDepth,
      tab_switches: tabSwitchCount,
      last_active: lastActivityTime.toISOString(),
      inactivity_periods: inactivityPeriods,
      is_tab_active: isTabActive,
      device_info: {
        userAgent: navigator.userAgent,
        screenSize: `${window.screen.width}x${window.screen.height}`,
        viewportSize: `${window.innerWidth}x${window.innerHeight}`
      }
    })
  };

  try {
    navigator.sendBeacon(
      `${config.supabaseUrl}/rest/v1/sessions?id=eq.${sessionId}`,
      JSON.stringify({
        ...sessionEndData,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.supabaseKey}`,
          'apikey': config.supabaseKey,
          'Prefer': 'return=minimal'
        }
      })
    );
    console.log('Session end data successfully sent using sendBeacon.');
  } catch (e) {
    console.error('Failed to send session end data using sendBeacon:', e);
  }
});

})(window);
