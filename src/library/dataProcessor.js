/**
 * Data Processing Library
 * Handles data cleaning, validation, and transformation
 */

class DataProcessor {
  constructor() {
    this.emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  }

  /**
   * Clean and validate leads data
   * @param {Array} rawLeads - Raw leads from API
   * @returns {Array} Cleaned and validated leads
   */
  cleanLeads(rawLeads) {
    if (!Array.isArray(rawLeads)) {
      return [];
    }

    const cleanedLeads = rawLeads
      .map(lead => this._cleanIndividualLead(lead))
      .filter(lead => this._validateLead(lead))
      .filter((lead, index, self) => this._deduplicateLead(lead, index, self));

    console.log(`Cleaned ${rawLeads.length} leads, ${cleanedLeads.length} valid leads remaining`);
    return cleanedLeads;
  }

  /**
   * Clean individual lead data
   * @param {Object} lead - Raw lead object
   * @returns {Object} Cleaned lead object
   */
  _cleanIndividualLead(lead) {
    return {
      id: lead.id || this._generateId(),
      name: this._cleanName(lead.name),
      title: this._cleanTitle(lead.title),
      company: this._cleanCompanyName(lead.company),
      sector: this._cleanSector(lead.sector),
      employees: this._cleanNumber(lead.employees),
      capital: this._cleanNumber(lead.capital),
      yearFounded: this._cleanYear(lead.yearFounded),
      email: this._cleanEmail(lead.email),
      linkedinUrl: this._cleanUrl(lead.linkedinUrl),
      phone: this._cleanPhone(lead.phone),
      location: this._cleanLocation(lead.location),
      website: this._cleanUrl(lead.website),
      lastUpdated: new Date(),
      contacted: false
    };
  }

  /**
   * Clean and format name
   * @param {String} name - Raw name
   * @returns {String} Cleaned name
   */
  _cleanName(name) {
    if (!name || typeof name !== 'string') return '';
    
    return name
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Clean and format title
   * @param {String} title - Raw title
   * @returns {String} Cleaned title
   */
  _cleanTitle(title) {
    if (!title || typeof title !== 'string') return '';
    
    const titleMap = {
      'ceo': 'CEO',
      'chief executive officer': 'CEO',
      'owner': 'Owner',
      'founder': 'Founder',
      'president': 'President',
      'co-founder': 'Co-Founder',
      'cofounder': 'Co-Founder'
    };

    const cleanTitle = title.trim();
    return titleMap[cleanTitle.toLowerCase()] || cleanTitle;
  }

  /**
   * Clean company name
   * @param {String} company - Raw company name
   * @returns {String} Cleaned company name
   */
  _cleanCompanyName(company) {
    if (!company || typeof company !== 'string') return '';
    
    return company.trim().replace(/\s+/g, ' ');
  }

  /**
   * Clean sector/industry
   * @param {String} sector - Raw sector
   * @returns {String} Cleaned sector
   */
  _cleanSector(sector) {
    if (!sector || typeof sector !== 'string') return 'Unknown';
    
    return sector.trim();
  }

  /**
   * Clean and validate email
   * @param {String} email - Raw email
   * @returns {String} Cleaned email or empty string
   */
  _cleanEmail(email) {
    if (!email || typeof email !== 'string') return '';
    
    const cleanEmail = email.trim().toLowerCase();
    return this.emailRegex.test(cleanEmail) ? cleanEmail : '';
  }

  /**
   * Clean phone number
   * @param {String} phone - Raw phone
   * @returns {String} Cleaned phone
   */
  _cleanPhone(phone) {
    if (!phone || typeof phone !== 'string') return '';
    
    return phone.replace(/\D/g, ''); // Remove non-digits
  }

  /**
   * Clean location
   * @param {String} location - Raw location
   * @returns {String} Cleaned location
   */
  _cleanLocation(location) {
    if (!location || typeof location !== 'string') return '';
    
    return location.trim();
  }

  /**
   * Clean URL
   * @param {String} url - Raw URL
   * @returns {String} Cleaned URL
   */
  _cleanUrl(url) {
    if (!url || typeof url !== 'string') return '';
    
    const cleanUrl = url.trim();
    return cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`;
  }

  /**
   * Clean number values
   * @param {Number|String} value - Raw number
   * @returns {Number} Cleaned number
   */
  _cleanNumber(value) {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const num = parseFloat(value.replace(/[^\d.-]/g, ''));
      return isNaN(num) ? 0 : num;
    }
    return 0;
  }

  /**
   * Clean year value
   * @param {Number|String} year - Raw year
   * @returns {Number} Cleaned year
   */
  _cleanYear(year) {
    const cleanYear = this._cleanNumber(year);
    const currentYear = new Date().getFullYear();
    
    if (cleanYear < 1800 || cleanYear > currentYear) {
      return null;
    }
    
    return cleanYear;
  }

  /**
   * Validate lead data
   * @param {Object} lead - Lead to validate
   * @returns {Boolean} Is valid lead
   */
  _validateLead(lead) {
    // Must have name and company
    if (!lead.name || !lead.company) return false;
    
    // Must have valid email
    if (!lead.email) return false;
    
    // Must have a valid title (CEO, Owner, etc.)
    const validTitles = ['CEO', 'Owner', 'Founder', 'President', 'Co-Founder'];
    if (!validTitles.includes(lead.title)) return false;
    
    return true;
  }

  /**
   * Deduplicate leads based on email
   * @param {Object} lead - Current lead
   * @param {Number} index - Current index
   * @param {Array} leads - All leads
   * @returns {Boolean} Is unique lead
   */
  _deduplicateLead(lead, index, leads) {
    return leads.findIndex(l => l.email === lead.email) === index;
  }

  /**
   * Generate unique ID for lead
   * @returns {String} Unique ID
   */
  _generateId() {
    return Utilities.getUuid();
  }

  /**
   * Export leads to CSV format
   * @param {Array} leads - Leads to export
   * @returns {String} CSV content
   */
  exportToCSV(leads) {
    if (!leads || leads.length === 0) return '';
    
    const headers = [
      'Timestamp', 'Lead Name', 'Title', 'Company Name', 'Sector',
      'Employees', 'Capital', 'Year Founded', 'Email', 'Phone',
      'Location', 'Website', 'LinkedIn', 'Contacted'
    ];
    
    const csvRows = [headers.join(',')];
    
    leads.forEach(lead => {
      const row = [
        lead.lastUpdated.toISOString(),
        `"${lead.name}"`,
        `"${lead.title}"`,
        `"${lead.company}"`,
        `"${lead.sector}"`,
        lead.employees,
        lead.capital,
        lead.yearFounded || '',
        lead.email,
        lead.phone,
        `"${lead.location}"`,
        lead.website,
        lead.linkedinUrl,
        lead.contacted ? 'Yes' : 'No'
      ];
      csvRows.push(row.join(','));
    });
    
    return csvRows.join('\n');
  }

  /**
   * Get lead statistics
   * @param {Array} leads - Leads to analyze
   * @returns {Object} Statistics object
   */
  getLeadStatistics(leads) {
    if (!leads || leads.length === 0) {
      return {
        total: 0,
        bySector: {},
        byTitle: {},
        contacted: 0,
        notContacted: 0
      };
    }

    const stats = {
      total: leads.length,
      bySector: {},
      byTitle: {},
      contacted: 0,
      notContacted: 0
    };

    leads.forEach(lead => {
      // Count by sector
      const sector = lead.sector || 'Unknown';
      stats.bySector[sector] = (stats.bySector[sector] || 0) + 1;
      
      // Count by title
      const title = lead.title || 'Unknown';
      stats.byTitle[title] = (stats.byTitle[title] || 0) + 1;
      
      // Count contacted status
      if (lead.contacted) {
        stats.contacted++;
      } else {
        stats.notContacted++;
      }
    });

    return stats;
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DataProcessor;
}
