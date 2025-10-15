/**
 * LeadLib - Google Sheets Management
 * Usage:
 *   LeadLib.initSheets(spreadsheetId);
 *   LeadLib.getLeads(spreadsheetId, filters);
 *   LeadLib.appendLeads(spreadsheetId, leads);
 *   LeadLib.updateLeadStatus(spreadsheetId, email, contacted);
 *   LeadLib.getSettings(spreadsheetId);
 *   LeadLib.saveSettings(spreadsheetId, settings);
 *   LeadLib.getStats(spreadsheetId);
 *   LeadLib.clearAllLeads(spreadsheetId);
 *   LeadLib.exportToCSV(spreadsheetId, params);
 *   LeadLib.testApolloConnection(apiKey);
 *   LeadLib.fetchLeads(spreadsheetId, filters, apiKey);
 */

var LeadLib = (function(ns) {
  const self = ns || {};

  // Internal SheetManager class
  self.SheetManager = function(spreadsheetId) {
    this.spreadsheetId = spreadsheetId;
    this.spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    this.leadsSheetName = 'Leads';
    this.settingsSheetName = 'Settings';
  };

  /**
   * Initialize the leads sheet with proper headers
   * @returns {Boolean} Success status
   */
  self.SheetManager.prototype.initializeLeadsSheet = function() {
    try {
      let sheet = this.spreadsheet.getSheetByName(this.leadsSheetName);
      
      if (!sheet) {
        sheet = this.spreadsheet.insertSheet(this.leadsSheetName);
      }

      // Clear existing data
      sheet.clear();
      
      // Set up headers
      const headers = [
        'Timestamp', 'Lead Name', 'Title', 'Company Name', 'Industry',
        'Employees', 'Founded Year', 'Email', 'Phone', 'Location',
        'LinkedIn', 'Website', 'Description', 'Contacted', 'Source'
      ];
      
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // Format header row
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground('#4285f4');
      headerRange.setFontColor('white');
      headerRange.setFontWeight('bold');
      headerRange.setHorizontalAlignment('center');
      
      // Set column widths
      const columnWidths = [120, 150, 120, 200, 120, 80, 80, 200, 120, 150, 200, 200, 300, 80, 100];
      for (let i = 0; i < columnWidths.length; i++) {
        sheet.setColumnWidth(i + 1, columnWidths[i]);
      }
      
      // Freeze header row
      sheet.setFrozenRows(1);
      
      // Add data validation for Contacted column
      const contactedRange = sheet.getRange(2, 14, sheet.getMaxRows() - 1, 1);
      const validation = SpreadsheetApp.newDataValidation()
        .requireValueInList(['TRUE', 'FALSE'], true)
        .setAllowInvalid(false)
        .build();
      contactedRange.setDataValidation(validation);
      
      console.log('Leads sheet initialized successfully');
      return true;
      
    } catch (error) {
      console.error('Error initializing leads sheet:', error);
      return false;
    }
  };

  /**
   * Initialize settings sheet
   * @returns {Boolean} Success status
   */
  self.SheetManager.prototype.initializeSettingsSheet = function() {
    try {
      let sheet = this.spreadsheet.getSheetByName(this.settingsSheetName);
      
      if (!sheet) {
        sheet = this.spreadsheet.insertSheet(this.settingsSheetName);
      }

      // Clear existing data
      sheet.clear();
      
      // Set up settings
      const settings = [
        ['Setting', 'Value', 'Description'],
        ['Apollo API Key', '', 'Your Apollo.io API key'],
        ['Default Page Size', '25', 'Number of leads to fetch per request'],
        ['Cache Duration', '3600', 'Cache duration in seconds'],
        ['Auto Refresh', 'FALSE', 'Automatically refresh leads'],
        ['Last Updated', '', 'Last successful data fetch'],
        ['Total Leads', '0', 'Total number of leads in database']
      ];
      
      sheet.getRange(1, 1, settings.length, 3).setValues(settings);
      
      // Format header row
      const headerRange = sheet.getRange(1, 1, 1, 3);
      headerRange.setBackground('#34a853');
      headerRange.setFontColor('white');
      headerRange.setFontWeight('bold');
      headerRange.setHorizontalAlignment('center');
      
      // Set column widths
      sheet.setColumnWidth(1, 150);
      sheet.setColumnWidth(2, 200);
      sheet.setColumnWidth(3, 300);
      
      console.log('Settings sheet initialized successfully');
      return true;
      
    } catch (error) {
      console.error('Error initializing settings sheet:', error);
      return false;
    }
  };

  /**
   * Initialize both sheets
   * @returns {Object} Result object
   */
  self.SheetManager.prototype.initSheets = function() {
    try {
      const leadsSuccess = this.initializeLeadsSheet();
      const settingsSuccess = this.initializeSettingsSheet();
      
      return {
        success: leadsSuccess && settingsSuccess,
        leadsSheet: leadsSuccess,
        settingsSheet: settingsSuccess,
        message: leadsSuccess && settingsSuccess ? 
          'Sheets initialized successfully' : 
          'Some sheets may not have been initialized properly'
      };
    } catch (error) {
      console.error('Error initializing sheets:', error);
      return { success: false, error: error.message };
    }
  };

  /**
   * Append leads to the sheet
   * @param {Array} leads - Leads to append
   * @returns {Boolean} Success status
   */
  self.SheetManager.prototype.appendLeads = function(leads) {
    try {
      const sheet = this.spreadsheet.getSheetByName(this.leadsSheetName);
      
      if (!sheet) {
        throw new Error('Leads sheet not found. Please initialize the sheet first.');
      }

      if (!leads || leads.length === 0) {
        console.log('No leads to append');
        return true;
      }

      // Prepare data for sheet
      const sheetData = leads.map(lead => [
        lead.lastUpdated || new Date(),
        lead.name || '',
        lead.title || '',
        lead.company || '',
        lead.industry || '',
        lead.employees || 0,
        lead.foundedYear || '',
        lead.email || '',
        lead.phone || '',
        lead.location || '',
        lead.linkedin || '',
        lead.website || '',
        lead.description || '',
        lead.contacted || false,
        lead.source || 'Apollo.io'
      ]);

      // Append data to sheet
      const lastRow = sheet.getLastRow();
      const range = sheet.getRange(lastRow + 1, 1, sheetData.length, sheetData[0].length);
      range.setValues(sheetData);

      // Update total leads count in settings
      this.updateSetting('Total Leads', sheet.getLastRow() - 1);
      this.updateSetting('Last Updated', new Date().toISOString());

      console.log(`Appended ${leads.length} leads to sheet`);
      return true;

    } catch (error) {
      console.error('Error appending leads:', error);
      return false;
    }
  };

  /**
   * Get all leads from the sheet
   * @param {Object} filters - Optional filters
   * @returns {Array} Array of lead objects
   */
  self.SheetManager.prototype.getLeads = function(filters = {}) {
    try {
      const sheet = this.spreadsheet.getSheetByName(this.leadsSheetName);
      
      if (!sheet) {
        return [];
      }

      const lastRow = sheet.getLastRow();
      if (lastRow <= 1) {
        return [];
      }

      // Get all data except header
      const data = sheet.getRange(2, 1, lastRow - 1, 15).getValues();
      
      // Convert to lead objects
      const leads = data.map(row => ({
        timestamp: row[0],
        name: row[1],
        title: row[2],
        company: row[3],
        industry: row[4],
        employees: row[5],
        foundedYear: row[6],
        email: row[7],
        phone: row[8],
        location: row[9],
        linkedin: row[10],
        website: row[11],
        description: row[12],
        contacted: row[13],
        source: row[14]
      }));

      // Apply filters if provided
      return this._applyFilters(leads, filters);

    } catch (error) {
      console.error('Error getting leads:', error);
      return [];
    }
  };

  /**
   * Apply filters to leads
   * @param {Array} leads - Leads to filter
   * @param {Object} filters - Filter criteria
   * @returns {Array} Filtered leads
   */
  self.SheetManager.prototype._applyFilters = function(leads, filters) {
    if (!filters || Object.keys(filters).length === 0) {
      return leads;
    }

    return leads.filter(lead => {
      // Filter by industry
      if (filters.industry && lead.industry !== filters.industry) {
        return false;
      }

      // Filter by title
      if (filters.title && lead.title !== filters.title) {
        return false;
      }

      // Filter by company size
      if (filters.companySize) {
        const size = this._getCompanySize(lead.employees);
        if (size !== filters.companySize) {
          return false;
        }
      }

      // Filter by contacted status
      if (filters.contacted !== undefined && lead.contacted !== filters.contacted) {
        return false;
      }

      // Filter by search term
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        const searchableFields = [
          lead.name, lead.title, lead.company, lead.industry, lead.email
        ].join(' ').toLowerCase();
        
        if (!searchableFields.includes(searchTerm)) {
          return false;
        }
      }

      return true;
    });
  };

  /**
   * Get company size category from employee count
   * @param {Number} employees - Number of employees
   * @returns {String} Size category
   */
  self.SheetManager.prototype._getCompanySize = function(employees) {
    if (employees <= 10) return '1-10';
    if (employees <= 50) return '11-50';
    if (employees <= 200) return '51-200';
    if (employees <= 500) return '201-500';
    if (employees <= 1000) return '501-1000';
    return '1000+';
  };

  /**
   * Update a lead's contacted status
   * @param {String} email - Lead email
   * @param {Boolean} contacted - Contacted status
   * @returns {Boolean} Success status
   */
  self.SheetManager.prototype.updateLeadContactedStatus = function(email, contacted) {
    try {
      const sheet = this.spreadsheet.getSheetByName(this.leadsSheetName);
      const data = sheet.getDataRange().getValues();
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][7] === email) { // Email is in column 8 (index 7)
          sheet.getRange(i + 1, 14).setValue(contacted); // Contacted is in column 14
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error updating lead status:', error);
      return false;
    }
  };

  /**
   * Update setting value
   * @param {String} settingName - Setting name
   * @param {String} value - Setting value
   * @returns {Boolean} Success status
   */
  self.SheetManager.prototype.updateSetting = function(settingName, value) {
    try {
      const sheet = this.spreadsheet.getSheetByName(this.settingsSheetName);
      const data = sheet.getDataRange().getValues();
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === settingName) {
          sheet.getRange(i + 1, 2).setValue(value);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error updating setting:', error);
      return false;
    }
  };

  /**
   * Get setting value
   * @param {String} settingName - Setting name
   * @returns {String} Setting value
   */
  self.SheetManager.prototype.getSetting = function(settingName) {
    try {
      const sheet = this.spreadsheet.getSheetByName(this.settingsSheetName);
      const data = sheet.getDataRange().getValues();
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === settingName) {
          return data[i][1];
        }
      }
      
      return '';
    } catch (error) {
      console.error('Error getting setting:', error);
      return '';
    }
  };

  /**
   * Get all settings
   * @returns {Object} Settings object
   */
  self.SheetManager.prototype.getSettings = function() {
    try {
      const sheet = this.spreadsheet.getSheetByName(this.settingsSheetName);
      const data = sheet.getDataRange().getValues();
      
      const settings = {};
      for (let i = 1; i < data.length; i++) {
        settings[data[i][0]] = data[i][1];
      }
      
      return { success: true, settings: settings };
    } catch (error) {
      console.error('Error getting settings:', error);
      return { success: false, error: error.message };
    }
  };

  /**
   * Save settings
   * @param {Object} settings - Settings object
   * @returns {Object} Result object
   */
  self.SheetManager.prototype.saveSettings = function(settings) {
    try {
      Object.keys(settings).forEach(key => {
        this.updateSetting(key, settings[key]);
      });
      
      return { success: true, message: 'Settings saved successfully' };
    } catch (error) {
      console.error('Error saving settings:', error);
      return { success: false, error: error.message };
    }
  };

  /**
   * Clear all leads data
   * @returns {Boolean} Success status
   */
  self.SheetManager.prototype.clearLeads = function() {
    try {
      const sheet = this.spreadsheet.getSheetByName(this.leadsSheetName);
      
      if (sheet.getLastRow() > 1) {
        sheet.getRange(2, 1, sheet.getLastRow() - 1, 15).clear();
      }
      
      this.updateSetting('Total Leads', '0');
      console.log('Leads data cleared');
      return true;
      
    } catch (error) {
      console.error('Error clearing leads:', error);
      return false;
    }
  };

  /**
   * Get dashboard statistics
   * @returns {Object} Statistics object
   */
  self.SheetManager.prototype.getStats = function() {
    try {
      const sheet = this.spreadsheet.getSheetByName(this.leadsSheetName);
      
      if (!sheet || sheet.getLastRow() < 2) {
        return {
          totalLeads: 0,
          contactedLeads: 0,
          notContactedLeads: 0,
          byIndustry: {},
          byTitle: {},
          byCompanySize: {}
        };
      }

      const data = sheet.getDataRange().getValues();
      const leads = data.slice(1); // Skip header
      
      const stats = {
        totalLeads: leads.length,
        contactedLeads: 0,
        notContactedLeads: 0,
        byIndustry: {},
        byTitle: {},
        byCompanySize: {}
      };

      leads.forEach(lead => {
        // Contacted status (column 14, index 13)
        if (lead[13] === true || lead[13] === 'TRUE') {
          stats.contactedLeads++;
        } else {
          stats.notContactedLeads++;
        }

        // Industry (column 5, index 4)
        const industry = lead[4] || 'Unknown';
        stats.byIndustry[industry] = (stats.byIndustry[industry] || 0) + 1;

        // Title (column 3, index 2)
        const title = lead[2] || 'Unknown';
        stats.byTitle[title] = (stats.byTitle[title] || 0) + 1;

        // Company size (column 6, index 5)
        const employees = lead[5] || 0;
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
    } catch (error) {
      console.error('Error getting stats:', error);
      return { error: error.message };
    }
  };

  // ===== CONVENIENCE FUNCTIONS =====

  /**
   * Initialize sheets with default manager
   * @param {String} spreadsheetId - Spreadsheet ID
   * @returns {Object} Result object
   */
  self.initSheets = function(spreadsheetId) {
    const manager = new self.SheetManager(spreadsheetId);
    return manager.initSheets();
  };

  /**
   * Get leads with default manager
   * @param {String} spreadsheetId - Spreadsheet ID
   * @param {Object} filters - Filter criteria
   * @returns {Array} Leads array
   */
  self.getLeads = function(spreadsheetId, filters) {
    const manager = new self.SheetManager(spreadsheetId);
    return manager.getLeads(filters);
  };

  /**
   * Append leads with default manager
   * @param {String} spreadsheetId - Spreadsheet ID
   * @param {Array} leads - Leads to append
   * @returns {Boolean} Success status
   */
  self.appendLeads = function(spreadsheetId, leads) {
    const manager = new self.SheetManager(spreadsheetId);
    return manager.appendLeads(leads);
  };

  /**
   * Update lead status with default manager
   * @param {String} spreadsheetId - Spreadsheet ID
   * @param {String} email - Lead email
   * @param {Boolean} contacted - Contacted status
   * @returns {Boolean} Success status
   */
  self.updateLeadStatus = function(spreadsheetId, email, contacted) {
    const manager = new self.SheetManager(spreadsheetId);
    const success = manager.updateLeadContactedStatus(email, contacted);
    return { success: success, message: success ? 'Lead status updated successfully' : 'Lead not found' };
  };

  /**
   * Get settings with default manager
   * @param {String} spreadsheetId - Spreadsheet ID
   * @returns {Object} Settings object
   */
  self.getSettings = function(spreadsheetId) {
    const manager = new self.SheetManager(spreadsheetId);
    return manager.getSettings();
  };

  /**
   * Save settings with default manager
   * @param {String} spreadsheetId - Spreadsheet ID
   * @param {Object} settings - Settings object
   * @returns {Object} Result object
   */
  self.saveSettings = function(spreadsheetId, settings) {
    const manager = new self.SheetManager(spreadsheetId);
    return manager.saveSettings(settings);
  };

  /**
   * Get stats with default manager
   * @param {String} spreadsheetId - Spreadsheet ID
   * @returns {Object} Statistics object
   */
  self.getStats = function(spreadsheetId) {
    const manager = new self.SheetManager(spreadsheetId);
    return manager.getStats();
  };

  /**
   * Clear all leads with default manager
   * @param {String} spreadsheetId - Spreadsheet ID
   * @returns {Object} Result object
   */
  self.clearAllLeads = function(spreadsheetId) {
    const manager = new self.SheetManager(spreadsheetId);
    const success = manager.clearLeads();
    return { success: success, message: success ? 'All leads cleared successfully' : 'Failed to clear leads' };
  };

  /**
   * Export leads to CSV with default manager
   * @param {String} spreadsheetId - Spreadsheet ID
   * @param {Object} params - Export parameters
   * @returns {Object} Result object
   */
  self.exportToCSV = function(spreadsheetId, params) {
    try {
      const manager = new self.SheetManager(spreadsheetId);
      const leads = manager.getLeads(params.filters);
      
      if (leads.length === 0) {
        return { success: false, message: 'No leads to export' };
      }

      const csvContent = self.exportToCSV(leads);
      
      // Create a temporary file
      const fileName = `SMB_Leads_${new Date().toISOString().split('T')[0]}.csv`;
      const blob = Utilities.newBlob(csvContent, 'text/csv', fileName);
      
      // Save to Drive
      const file = DriveApp.createFile(blob);
      const fileUrl = file.getUrl();
      
      return { 
        success: true, 
        message: 'CSV exported successfully',
        fileName: fileName,
        fileUrl: fileUrl
      };
    } catch (error) {
      console.error('Error exporting CSV:', error);
      return { success: false, error: error.message };
    }
  };

  /**
   * Test Apollo connection
   * @param {String} apiKey - API key to test
   * @returns {Object} Test result
   */
  self.testApolloConnection = function(apiKey) {
    try {
      if (!apiKey) {
        return { success: false, message: 'API key is required' };
      }

      // Test with a simple API call
      const api = new self.ApolloAPI();
      api.apiKey = apiKey;
      
      const testFilters = {
        roles: ['CEO'],
        perPage: 1
      };

      const leads = api.fetchLeads(testFilters);
      
      return { 
        success: true, 
        message: 'Connection successful',
        leadsCount: leads ? leads.length : 0
      };
    } catch (error) {
      console.error('Error testing Apollo connection:', error);
      return { success: false, message: 'Connection failed: ' + error.message };
    }
  };

  /**
   * Fetch leads from Apollo and save to sheet
   * @param {String} spreadsheetId - Spreadsheet ID
   * @param {Object} filters - Filter criteria
   * @param {String} apiKey - Apollo API key
   * @returns {Object} Result object
   */
  self.fetchLeads = function(spreadsheetId, filters, apiKey) {
    try {
      // Validate API key
      if (!apiKey) {
        return { success: false, message: 'Please set your Apollo API key in Settings' };
      }

      // Set the API key
      PropertiesService.getUserProperties().setProperty('APOLLO_API_KEY', apiKey);

      // Fetch leads from Apollo
      const api = new self.ApolloAPI();
      const rawLeads = api.fetchLeads(filters);
      
      if (!rawLeads || rawLeads.length === 0) {
        return { success: false, message: 'No leads found with the specified criteria' };
      }

      // Clean and validate leads
      const cleanedLeads = self.cleanLeads(rawLeads);
      
      if (cleanedLeads.length === 0) {
        return { success: false, message: 'No valid leads found after cleaning' };
      }

      // Append to sheet
      const appendSuccess = self.appendLeads(spreadsheetId, cleanedLeads);
      
      if (appendSuccess) {
        return { 
          success: true, 
          message: `Successfully fetched and added ${cleanedLeads.length} leads`,
          leadsCount: cleanedLeads.length
        };
      } else {
        return { success: false, message: 'Failed to save leads to sheet' };
      }

    } catch (error) {
      console.error('Error fetching leads:', error);
      return { success: false, message: 'Error fetching leads: ' + error.message };
    }
  };

  // Return augmented namespace
  return self;
})(typeof LeadLib !== 'undefined' ? LeadLib : {});
