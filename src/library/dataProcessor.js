/**
 * Data Processing Library
 * Handles data cleaning, validation, and export functionality
 * LeadLib Library - Version 1
 */

// ===== LEADLIB NAMESPACE =====

var LeadLib = LeadLib || {};

LeadLib.DataProcessor = function() {
  this.emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  this.nameRegex = /^[a-zA-Z\s\-\.]+$/;
};

/**
 * Clean and validate leads data
 * @param {Array} rawLeads - Raw leads from API
 * @returns {Array} Cleaned and validated leads
 */
LeadLib.DataProcessor.prototype.cleanLeads = function(rawLeads) {
  if (!Array.isArray(rawLeads)) {
    console.warn('Invalid leads data provided');
    return [];
  }

  const cleanedLeads = [];
  const seenEmails = new Set();
  const seenNames = new Set();

  rawLeads.forEach((lead, index) => {
    try {
      // Validate required fields
      if (!lead.email || !this.isValidEmail(lead.email)) {
        console.warn(`Lead ${index + 1}: Invalid email - ${lead.email}`);
        return;
      }

      if (!lead.name || !this.isValidName(lead.name)) {
        console.warn(`Lead ${index + 1}: Invalid name - ${lead.name}`);
        return;
      }

      // Check for duplicates
      if (seenEmails.has(lead.email.toLowerCase())) {
        console.warn(`Lead ${index + 1}: Duplicate email - ${lead.email}`);
        return;
      }

      if (seenNames.has(lead.name.toLowerCase())) {
        console.warn(`Lead ${index + 1}: Duplicate name - ${lead.name}`);
        return;
      }

      // Clean and format data
      const cleanedLead = {
        id: lead.id || this.generateLeadId(),
        name: this.cleanName(lead.name),
        title: this.cleanTitle(lead.title),
        company: this.cleanCompany(lead.company),
        industry: this.cleanIndustry(lead.industry),
        employees: this.cleanEmployees(lead.employees),
        foundedYear: this.cleanFoundedYear(lead.foundedYear),
        email: lead.email.toLowerCase().trim(),
        phone: this.cleanPhone(lead.phone),
        location: this.cleanLocation(lead.location),
        linkedin: this.cleanLinkedIn(lead.linkedin),
        website: this.cleanWebsite(lead.website),
        description: this.cleanDescription(lead.description),
        lastUpdated: new Date().toISOString(),
        contacted: false,
        source: 'Apollo.io'
      };

      cleanedLeads.push(cleanedLead);
      seenEmails.add(lead.email.toLowerCase());
      seenNames.add(lead.name.toLowerCase());

    } catch (error) {
      console.error(`Error processing lead ${index + 1}:`, error);
    }
  });

  console.log(`Cleaned ${cleanedLeads.length} leads from ${rawLeads.length} raw leads`);
  return cleanedLeads;
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} Is valid email
 */
LeadLib.DataProcessor.prototype.isValidEmail = function(email) {
  return this.emailRegex.test(email);
};

/**
 * Validate name format
 * @param {string} name - Name to validate
 * @returns {boolean} Is valid name
 */
LeadLib.DataProcessor.prototype.isValidName = function(name) {
  return this.nameRegex.test(name) && name.length > 1;
};

/**
 * Clean and format name
 * @param {string} name - Name to clean
 * @returns {string} Cleaned name
 */
LeadLib.DataProcessor.prototype.cleanName = function(name) {
  if (!name) return '';
  
  return name.trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Clean and format title
 * @param {string} title - Title to clean
 * @returns {string} Cleaned title
 */
LeadLib.DataProcessor.prototype.cleanTitle = function(title) {
  if (!title) return '';
  
  // Common title mappings
  const titleMappings = {
    'ceo': 'CEO',
    'chief executive officer': 'CEO',
    'owner': 'Owner',
    'founder': 'Founder',
    'president': 'President',
    'coo': 'COO',
    'chief operating officer': 'COO',
    'cto': 'CTO',
    'chief technology officer': 'CTO',
    'cfo': 'CFO',
    'chief financial officer': 'CFO'
  };

  const cleanTitle = title.toLowerCase().trim();
  return titleMappings[cleanTitle] || title;
};

/**
 * Clean and format company name
 * @param {string} company - Company name to clean
 * @returns {string} Cleaned company name
 */
LeadLib.DataProcessor.prototype.cleanCompany = function(company) {
  if (!company) return '';
  
  return company.trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s\-\.&]/g, '');
};

/**
 * Clean and format industry
 * @param {string} industry - Industry to clean
 * @returns {string} Cleaned industry
 */
LeadLib.DataProcessor.prototype.cleanIndustry = function(industry) {
  if (!industry) return '';
  
  // Common industry mappings
  const industryMappings = {
    'technology': 'Technology',
    'software': 'Software',
    'healthcare': 'Healthcare',
    'finance': 'Finance',
    'retail': 'Retail',
    'manufacturing': 'Manufacturing',
    'education': 'Education',
    'consulting': 'Consulting',
    'real estate': 'Real Estate',
    'automotive': 'Automotive'
  };

  const cleanIndustry = industry.toLowerCase().trim();
  return industryMappings[cleanIndustry] || industry;
};

/**
 * Clean and format employee count
 * @param {number|string} employees - Employee count to clean
 * @returns {number} Cleaned employee count
 */
LeadLib.DataProcessor.prototype.cleanEmployees = function(employees) {
  if (!employees) return 0;
  
  const num = parseInt(employees);
  return isNaN(num) ? 0 : Math.max(0, num);
};

/**
 * Clean and format founded year
 * @param {number|string} year - Founded year to clean
 * @returns {number} Cleaned founded year
 */
LeadLib.DataProcessor.prototype.cleanFoundedYear = function(year) {
  if (!year) return '';
  
  const num = parseInt(year);
  const currentYear = new Date().getFullYear();
  
  if (isNaN(num) || num < 1800 || num > currentYear) {
    return '';
  }
  
  return num;
};

/**
 * Clean and format phone number
 * @param {string} phone - Phone number to clean
 * @returns {string} Cleaned phone number
 */
LeadLib.DataProcessor.prototype.cleanPhone = function(phone) {
  if (!phone) return '';
  
  // Remove all non-digit characters except + and -
  return phone.replace(/[^\d\+\-]/g, '');
};

/**
 * Clean and format location
 * @param {string} location - Location to clean
 * @returns {string} Cleaned location
 */
LeadLib.DataProcessor.prototype.cleanLocation = function(location) {
  if (!location) return '';
  
  return location.trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s\-\,]/g, '');
};

/**
 * Clean and format LinkedIn URL
 * @param {string} linkedin - LinkedIn URL to clean
 * @returns {string} Cleaned LinkedIn URL
 */
LeadLib.DataProcessor.prototype.cleanLinkedIn = function(linkedin) {
  if (!linkedin) return '';
  
  // Ensure it starts with https://
  if (!linkedin.startsWith('http')) {
    return 'https://' + linkedin;
  }
  
  return linkedin.trim();
};

/**
 * Clean and format website URL
 * @param {string} website - Website URL to clean
 * @returns {string} Cleaned website URL
 */
LeadLib.DataProcessor.prototype.cleanWebsite = function(website) {
  if (!website) return '';
  
  // Ensure it starts with https://
  if (!website.startsWith('http')) {
    return 'https://' + website;
  }
  
  return website.trim();
};

/**
 * Clean and format description
 * @param {string} description - Description to clean
 * @returns {string} Cleaned description
 */
LeadLib.DataProcessor.prototype.cleanDescription = function(description) {
  if (!description) return '';
  
  return description.trim()
    .replace(/\s+/g, ' ')
    .substring(0, 500); // Limit to 500 characters
};

/**
 * Generate unique lead ID
 * @returns {string} Unique lead ID
 */
LeadLib.DataProcessor.prototype.generateLeadId = function() {
  return 'lead_' + Utilities.getUuid();
};

/**
 * Get lead statistics
 * @param {Array} leads - Leads to analyze
 * @returns {Object} Statistics object
 */
LeadLib.DataProcessor.prototype.getLeadStatistics = function(leads) {
  if (!Array.isArray(leads) || leads.length === 0) {
    return {
      total: 0,
      contacted: 0,
      notContacted: 0,
      byIndustry: {},
      byTitle: {},
      byCompanySize: {}
    };
  }

  const stats = {
    total: leads.length,
    contacted: 0,
    notContacted: 0,
    byIndustry: {},
    byTitle: {},
    byCompanySize: {}
  };

  leads.forEach(lead => {
    // Contacted status
    if (lead.contacted) {
      stats.contacted++;
    } else {
      stats.notContacted++;
    }

    // Industry distribution
    const industry = lead.industry || 'Unknown';
    stats.byIndustry[industry] = (stats.byIndustry[industry] || 0) + 1;

    // Title distribution
    const title = lead.title || 'Unknown';
    stats.byTitle[title] = (stats.byTitle[title] || 0) + 1;

    // Company size distribution
    const employees = lead.employees || 0;
    let sizeCategory = 'Unknown';
    if (employees === 0) sizeCategory = 'Unknown';
    else if (employees <= 10) sizeCategory = '1-10';
    else if (employees <= 50) sizeCategory = '11-50';
    else if (employees <= 200) sizeCategory = '51-200';
    else if (employees <= 500) sizeCategory = '201-500';
    else sizeCategory = '500+';

    stats.byCompanySize[sizeCategory] = (stats.byCompanySize[sizeCategory] || 0) + 1;
  });

  return stats;
};

/**
 * Export leads to CSV format
 * @param {Array} leads - Leads to export
 * @returns {string} CSV content
 */
LeadLib.DataProcessor.prototype.exportToCSV = function(leads) {
  if (!Array.isArray(leads) || leads.length === 0) {
    return 'No leads to export';
  }

  // CSV headers
  const headers = [
    'ID', 'Name', 'Title', 'Company', 'Industry', 'Employees', 'Founded Year',
    'Email', 'Phone', 'Location', 'LinkedIn', 'Website', 'Description',
    'Contacted', 'Last Updated', 'Source'
  ];

  // Build CSV content
  let csvContent = headers.join(',') + '\n';

  leads.forEach(lead => {
    const row = [
      lead.id || '',
      `"${(lead.name || '').replace(/"/g, '""')}"`,
      `"${(lead.title || '').replace(/"/g, '""')}"`,
      `"${(lead.company || '').replace(/"/g, '""')}"`,
      `"${(lead.industry || '').replace(/"/g, '""')}"`,
      lead.employees || 0,
      lead.foundedYear || '',
      lead.email || '',
      lead.phone || '',
      `"${(lead.location || '').replace(/"/g, '""')}"`,
      lead.linkedin || '',
      lead.website || '',
      `"${(lead.description || '').replace(/"/g, '""')}"`,
      lead.contacted ? 'Yes' : 'No',
      lead.lastUpdated || '',
      lead.source || ''
    ];
    
    csvContent += row.join(',') + '\n';
  });

  return csvContent;
};

/**
 * Filter leads based on criteria
 * @param {Array} leads - Leads to filter
 * @param {Object} filters - Filter criteria
 * @returns {Array} Filtered leads
 */
LeadLib.DataProcessor.prototype.filterLeads = function(leads, filters) {
  if (!Array.isArray(leads) || leads.length === 0) {
    return [];
  }

  return leads.filter(lead => {
    // Industry filter
    if (filters.industry && lead.industry !== filters.industry) {
      return false;
    }

    // Title filter
    if (filters.title && lead.title !== filters.title) {
      return false;
    }

    // Company size filter
    if (filters.companySize) {
      const employees = lead.employees || 0;
      let sizeCategory = 'Unknown';
      if (employees === 0) sizeCategory = 'Unknown';
      else if (employees <= 10) sizeCategory = '1-10';
      else if (employees <= 50) sizeCategory = '11-50';
      else if (employees <= 200) sizeCategory = '51-200';
      else if (employees <= 500) sizeCategory = '201-500';
      else sizeCategory = '500+';

      if (sizeCategory !== filters.companySize) {
        return false;
      }
    }

    // Contacted status filter
    if (filters.contacted !== undefined && lead.contacted !== filters.contacted) {
      return false;
    }

    // Search term filter
    if (filters.searchTerm) {
      const searchTerm = filters.searchTerm.toLowerCase();
      const searchableText = [
        lead.name, lead.title, lead.company, lead.industry, lead.email
      ].join(' ').toLowerCase();

      if (!searchableText.includes(searchTerm)) {
        return false;
      }
    }

    return true;
  });
};

// ===== CONVENIENCE FUNCTIONS =====

/**
 * Clean leads with default processor
 * @param {Array} rawLeads - Raw leads to clean
 * @returns {Array} Cleaned leads
 */
LeadLib.cleanLeads = function(rawLeads) {
  const processor = new LeadLib.DataProcessor();
  return processor.cleanLeads(rawLeads);
};

/**
 * Get lead statistics
 * @param {Array} leads - Leads to analyze
 * @returns {Object} Statistics
 */
LeadLib.getLeadStatistics = function(leads) {
  const processor = new LeadLib.DataProcessor();
  return processor.getLeadStatistics(leads);
};

/**
 * Export leads to CSV
 * @param {Array} leads - Leads to export
 * @returns {string} CSV content
 */
LeadLib.exportToCSV = function(leads) {
  const processor = new LeadLib.DataProcessor();
  return processor.exportToCSV(leads);
};

/**
 * Filter leads
 * @param {Array} leads - Leads to filter
 * @param {Object} filters - Filter criteria
 * @returns {Array} Filtered leads
 */
LeadLib.filterLeads = function(leads, filters) {
  const processor = new LeadLib.DataProcessor();
  return processor.filterLeads(leads, filters);
};