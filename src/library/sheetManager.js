/**
 * Google Sheets Management Library
 * Handles sheet operations, data storage, and retrieval
 */

class SheetManager {
  constructor() {
    this.spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    this.leadsSheetName = 'Leads';
    this.settingsSheetName = 'Settings';
  }

  /**
   * Initialize the leads sheet with proper headers
   * @returns {Boolean} Success status
   */
  initializeLeadsSheet() {
    try {
      let sheet = this.spreadsheet.getSheetByName(this.leadsSheetName);
      
      if (!sheet) {
        sheet = this.spreadsheet.insertSheet(this.leadsSheetName);
      }

      // Clear existing data
      sheet.clear();
      
      // Set up headers
      const headers = [
        'Timestamp', 'Lead Name', 'Title', 'Company Name', 'Sector',
        'Employees', 'Capital', 'Year Founded', 'Email', 'Phone',
        'Location', 'Website', 'LinkedIn', 'Contacted', 'Notes'
      ];
      
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // Format header row
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground('#4285f4');
      headerRange.setFontColor('white');
      headerRange.setFontWeight('bold');
      headerRange.setHorizontalAlignment('center');
      
      // Set column widths
      const columnWidths = [120, 150, 120, 200, 120, 80, 100, 80, 200, 120, 150, 200, 200, 80, 200];
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
  }

  /**
   * Initialize settings sheet
   * @returns {Boolean} Success status
   */
  initializeSettingsSheet() {
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
  }

  /**
   * Append leads to the sheet
   * @param {Array} leads - Leads to append
   * @returns {Boolean} Success status
   */
  appendLeads(leads) {
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
        lead.sector || '',
        lead.employees || 0,
        lead.capital || 0,
        lead.yearFounded || '',
        lead.email || '',
        lead.phone || '',
        lead.location || '',
        lead.website || '',
        lead.linkedinUrl || '',
        lead.contacted || false,
        lead.notes || ''
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
  }

  /**
   * Get all leads from the sheet
   * @param {Object} filters - Optional filters
   * @returns {Array} Array of lead objects
   */
  getLeads(filters = {}) {
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
        sector: row[4],
        employees: row[5],
        capital: row[6],
        yearFounded: row[7],
        email: row[8],
        phone: row[9],
        location: row[10],
        website: row[11],
        linkedinUrl: row[12],
        contacted: row[13],
        notes: row[14]
      }));

      // Apply filters if provided
      return this._applyFilters(leads, filters);

    } catch (error) {
      console.error('Error getting leads:', error);
      return [];
    }
  }

  /**
   * Apply filters to leads
   * @param {Array} leads - Leads to filter
   * @param {Object} filters - Filter criteria
   * @returns {Array} Filtered leads
   */
  _applyFilters(leads, filters) {
    if (!filters || Object.keys(filters).length === 0) {
      return leads;
    }

    return leads.filter(lead => {
      // Filter by sector
      if (filters.sector && lead.sector !== filters.sector) {
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
          lead.name, lead.title, lead.company, lead.sector, lead.email
        ].join(' ').toLowerCase();
        
        if (!searchableFields.includes(searchTerm)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Get company size category from employee count
   * @param {Number} employees - Number of employees
   * @returns {String} Size category
   */
  _getCompanySize(employees) {
    if (employees <= 10) return '1-10';
    if (employees <= 50) return '11-50';
    if (employees <= 200) return '51-200';
    if (employees <= 500) return '201-500';
    if (employees <= 1000) return '501-1000';
    return '1000+';
  }

  /**
   * Update a lead's contacted status
   * @param {String} email - Lead email
   * @param {Boolean} contacted - Contacted status
   * @returns {Boolean} Success status
   */
  updateLeadContactedStatus(email, contacted) {
    try {
      const sheet = this.spreadsheet.getSheetByName(this.leadsSheetName);
      const data = sheet.getDataRange().getValues();
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][8] === email) { // Email is in column 9 (index 8)
          sheet.getRange(i + 1, 14).setValue(contacted); // Contacted is in column 14
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error updating lead status:', error);
      return false;
    }
  }

  /**
   * Update setting value
   * @param {String} settingName - Setting name
   * @param {String} value - Setting value
   * @returns {Boolean} Success status
   */
  updateSetting(settingName, value) {
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
  }

  /**
   * Get setting value
   * @param {String} settingName - Setting name
   * @returns {String} Setting value
   */
  getSetting(settingName) {
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
  }

  /**
   * Clear all leads data
   * @returns {Boolean} Success status
   */
  clearLeads() {
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
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SheetManager;
}
