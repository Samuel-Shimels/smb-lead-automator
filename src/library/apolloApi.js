/**
 * LeadLib - Apollo.io API Integration
 * Usage:
 *   LeadLib.fetchLeads(filters);
 *   LeadLib.clearApolloCache();
 *   LeadLib.getApolloUsageStats();
 */

var LeadLib = (function(ns) {
  const self = ns || {};

  // Internal Apollo API class
  self.ApolloAPI = function() {
    this.baseUrl = 'https://api.apollo.io/v1';
    this.apiKey = PropertiesService.getUserProperties().getProperty('APOLLO_API_KEY');
    this.cache = CacheService.getScriptCache();
  };

  /**
   * Fetch leads from Apollo.io API with filters
   * @param {Object} filters - Filter criteria
   * @returns {Array} Array of lead objects
   */
  self.ApolloAPI.prototype.fetchLeads = function(filters) {
    try {
      const cacheKey = this._generateCacheKey(filters);
      const cachedData = this.getCachedLeads(cacheKey);
      
      if (cachedData && cachedData.length > 0) {
        console.log('Returning cached leads');
        return cachedData;
      }

      const payload = this._buildPayload(filters);
      const response = this._makeApiCall('/mixed_people/search', payload);
      
      if (response && response.people) {
        const leads = this._processApiResponse(response.people);
        this.cacheLeads(leads, cacheKey);
        return leads;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching leads:', error);
      throw new Error('Failed to fetch leads from Apollo.io');
    }
  };

  /**
   * Build API payload from filters
   * @param {Object} filters - Filter criteria
   * @returns {Object} API payload
   */
  self.ApolloAPI.prototype._buildPayload = function(filters) {
    const payload = {
      api_key: this.apiKey,
      q_organization_domains: filters.domains || '',
      person_titles: filters.roles || ['CEO', 'Owner', 'Founder', 'President'],
      organization_num_employees_ranges: filters.employeeRanges || '',
      organization_industry_tag_ids: filters.industryTags || '',
      organization_locations: filters.locations || '',
      organization_founded_year: filters.foundedYear || '',
      page: filters.page || 1,
      per_page: Math.min(filters.perPage || 25, 100)
    };

    // Remove empty values
    Object.keys(payload).forEach(key => {
      if (!payload[key] || payload[key] === '') {
        delete payload[key];
      }
    });

    return payload;
  };

  /**
   * Make API call to Apollo.io
   * @param {string} endpoint - API endpoint
   * @param {Object} payload - Request payload
   * @returns {Object} API response
   */
  self.ApolloAPI.prototype._makeApiCall = function(endpoint, payload) {
    const url = this.baseUrl + endpoint;
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      payload: JSON.stringify(payload)
    };

    let retries = 0;
    while (retries < 3) {
      try {
        const response = UrlFetchApp.fetch(url, options);
        const responseCode = response.getResponseCode();
        
        if (responseCode === 200) {
          return JSON.parse(response.getContentText());
        } else if (responseCode === 429) {
          // Rate limit - wait and retry
          console.log('Rate limited, waiting...');
          Utilities.sleep(2000);
          retries++;
        } else {
          console.error('API Error:', responseCode, response.getContentText());
          throw new Error('API request failed with code: ' + responseCode);
        }
      } catch (error) {
        retries++;
        if (retries >= 3) {
          throw error;
        }
        console.log('Retrying API call...');
        Utilities.sleep(1000);
      }
    }
  };

  /**
   * Process API response and extract lead data
   * @param {Array} people - People data from API
   * @returns {Array} Processed leads
   */
  self.ApolloAPI.prototype._processApiResponse = function(people) {
    return people.map(person => ({
      id: person.id || '',
      name: person.name || '',
      title: person.title || '',
      company: person.organization?.name || '',
      industry: person.organization?.industry || '',
      employees: person.organization?.estimated_num_employees || 0,
      foundedYear: person.organization?.founded_year || '',
      email: person.email || '',
      phone: person.phone_numbers?.[0]?.sanitized_number || '',
      location: person.city + ', ' + person.state || '',
      linkedin: person.linkedin_url || '',
      website: person.organization?.website_url || '',
      description: person.organization?.short_description || '',
      lastUpdated: new Date().toISOString(),
      contacted: false
    }));
  };

  /**
   * Generate cache key from filters
   * @param {Object} filters - Filter criteria
   * @returns {string} Cache key
   */
  self.ApolloAPI.prototype._generateCacheKey = function(filters) {
    const keyData = {
      roles: filters.roles || [],
      employeeRanges: filters.employeeRanges || [],
      industryTags: filters.industryTags || [],
      locations: filters.locations || [],
      foundedYear: filters.foundedYear || '',
      page: filters.page || 1
    };
    
    return 'apollo_leads_' + Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, JSON.stringify(keyData));
  };

  /**
   * Cache leads data
   * @param {Array} leads - Leads to cache
   * @param {string} key - Cache key
   */
  self.ApolloAPI.prototype.cacheLeads = function(leads, key) {
    try {
      const cacheData = {
        leads: leads,
        timestamp: new Date().getTime(),
        count: leads.length
      };
      
      this.cache.put(key, JSON.stringify(cacheData), 3600); // 1 hour
      console.log('Leads cached with key:', key);
    } catch (error) {
      console.error('Error caching leads:', error);
    }
  };

  /**
   * Get cached leads
   * @param {string} key - Cache key
   * @returns {Array} Cached leads or empty array
   */
  self.ApolloAPI.prototype.getCachedLeads = function(key) {
    try {
      const cached = this.cache.get(key);
      if (cached) {
        const cacheData = JSON.parse(cached);
        const age = new Date().getTime() - cacheData.timestamp;
        
        // Check if cache is still valid (1 hour)
        if (age < 3600000) {
          console.log('Cache hit for key:', key);
          return cacheData.leads;
        } else {
          console.log('Cache expired for key:', key);
          this.cache.remove(key);
        }
      }
    } catch (error) {
      console.error('Error reading cache:', error);
    }
    
    return [];
  };

  /**
   * Clear all cached leads
   */
  self.ApolloAPI.prototype.clearCache = function() {
    try {
      const keys = this.cache.getKeys();
      keys.forEach(key => {
        if (key.startsWith('apollo_leads_')) {
          this.cache.remove(key);
        }
      });
      console.log('Apollo cache cleared');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  };

  /**
   * Get API usage statistics
   * @returns {Object} Usage stats
   */
  self.ApolloAPI.prototype.getUsageStats = function() {
    try {
      const response = this._makeApiCall('/usage', { api_key: this.apiKey });
      return {
        monthly_usage: response.monthly_usage || 0,
        monthly_limit: response.monthly_limit || 0,
        daily_usage: response.daily_usage || 0,
        daily_limit: response.daily_limit || 0
      };
    } catch (error) {
      console.error('Error getting usage stats:', error);
      return null;
    }
  };

  // ===== CONVENIENCE FUNCTIONS =====

  /**
   * Fetch leads with default processor
   * @param {Object} options - Filter options
   * @returns {Array} Array of leads
   */
  self.fetchLeads = function(options) {
    const api = new self.ApolloAPI();
    return api.fetchLeads(options);
  };

  /**
   * Clear Apollo cache
   */
  self.clearApolloCache = function() {
    const api = new self.ApolloAPI();
    api.clearCache();
  };

  /**
   * Get Apollo usage stats
   * @returns {Object} Usage statistics
   */
  self.getApolloUsageStats = function() {
    const api = new self.ApolloAPI();
    return api.getUsageStats();
  };

  // Return augmented namespace
  return self;
})(typeof LeadLib !== 'undefined' ? LeadLib : {});