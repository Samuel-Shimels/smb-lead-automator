/**
 * Apollo.io API Integration Library
 * Handles API calls, data fetching, and response processing
 */

class ApolloAPI {
  constructor() {
    this.baseUrl = 'https://api.apollo.io/v1';
    this.apiKey = PropertiesService.getUserProperties().getProperty('APOLLO_API_KEY');
    this.cache = CacheService.getScriptCache();
  }

  /**
   * Fetch leads from Apollo.io API with filters
   * @param {Object} filters - Filter criteria
   * @returns {Array} Array of lead objects
   */
  fetchLeads(filters) {
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
  }

  /**
   * Build API payload from filters
   * @param {Object} filters - Filter criteria
   * @returns {Object} API payload
   */
  _buildPayload(filters) {
    const payload = {
      api_key: this.apiKey,
      q_organization_domains: filters.domains || [],
      person_titles: filters.roles || ['CEO', 'Owner', 'Founder', 'President'],
      organization_num_employees_ranges: this._mapCompanySize(filters.companySize),
      organization_locations: filters.locations || [],
      page: filters.page || 1,
      per_page: filters.perPage || 25
    };

    // Add sector filter if provided
    if (filters.sector) {
      payload.organization_industry_tag_ids = [filters.sector];
    }

    // Add year founded filter
    if (filters.yearFounded) {
      payload.organization_founded_year = filters.yearFounded;
    }

    // Add capital/revenue filter
    if (filters.capital) {
      payload.organization_annual_revenue_ranges = this._mapCapitalRange(filters.capital);
    }

    return payload;
  }

  /**
   * Map company size to Apollo.io format
   * @param {String} companySize - Company size filter
   * @returns {Array} Apollo.io employee range
   */
  _mapCompanySize(companySize) {
    const sizeMap = {
      '1-10': ['1,10'],
      '11-50': ['11,50'],
      '51-200': ['51,200'],
      '201-500': ['201,500'],
      '501-1000': ['501,1000'],
      '1000+': ['1001,10000']
    };
    return sizeMap[companySize] || [];
  }

  /**
   * Map capital range to Apollo.io format
   * @param {String} capital - Capital filter
   * @returns {Array} Apollo.io revenue range
   */
  _mapCapitalRange(capital) {
    const capitalMap = {
      '0-100k': ['0,100000'],
      '100k-500k': ['100000,500000'],
      '500k-1m': ['500000,1000000'],
      '1m-5m': ['1000000,5000000'],
      '5m+': ['5000000,100000000']
    };
    return capitalMap[capital] || [];
  }

  /**
   * Make API call to Apollo.io
   * @param {String} endpoint - API endpoint
   * @param {Object} payload - Request payload
   * @returns {Object} API response
   */
  _makeApiCall(endpoint, payload) {
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      payload: JSON.stringify(payload)
    };

    const response = UrlFetchApp.fetch(this.baseUrl + endpoint, options);
    
    if (response.getResponseCode() !== 200) {
      throw new Error(`API call failed with status: ${response.getResponseCode()}`);
    }

    return JSON.parse(response.getContentText());
  }

  /**
   * Process API response and extract lead data
   * @param {Array} people - People data from API
   * @returns {Array} Processed leads
   */
  _processApiResponse(people) {
    return people.map(person => ({
      id: person.id,
      name: person.name,
      title: person.title,
      company: person.organization?.name || '',
      sector: person.organization?.industry || '',
      employees: person.organization?.estimated_num_employees || 0,
      capital: person.organization?.annual_revenue || 0,
      yearFounded: person.organization?.founded_year || null,
      email: person.email || '',
      linkedinUrl: person.linkedin_url || '',
      phone: person.phone_numbers?.[0]?.sanitized_number || '',
      location: person.city + ', ' + person.state || '',
      website: person.organization?.website_url || '',
      lastUpdated: new Date()
    }));
  }

  /**
   * Generate cache key from filters
   * @param {Object} filters - Filter criteria
   * @returns {String} Cache key
   */
  _generateCacheKey(filters) {
    return 'leads_' + Utilities.base64Encode(JSON.stringify(filters));
  }

  /**
   * Cache leads data
   * @param {Array} leads - Leads to cache
   * @param {String} key - Cache key
   */
  cacheLeads(leads, key) {
    this.cache.put(key, JSON.stringify(leads), 3600); // 1 hour cache
  }

  /**
   * Get cached leads
   * @param {String} key - Cache key
   * @returns {Array} Cached leads
   */
  getCachedLeads(key) {
    const cached = this.cache.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.removeAll(['leads_']);
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ApolloAPI;
}
