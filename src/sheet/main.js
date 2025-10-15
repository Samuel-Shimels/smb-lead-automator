/**
 * Main Sheet-bound Script
 * Handles menu creation, API calls, and data operations
 */

// Global instances
let apolloAPI, dataProcessor, sheetManager;

/**
 * Initialize the application
 */
function initializeApp() {
  try {
    apolloAPI = new ApolloAPI();
    dataProcessor = new DataProcessor();
    sheetManager = new SheetManager();
    
    console.log('Application initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing application:', error);
    return false;
  }
}

/**
 * Create custom menu when spreadsheet opens
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  
  ui.createMenu('SMB Leads')
    .addItem('Initialize Sheets', 'initializeSheets')
    .addSeparator()
    .addItem('Fetch Leads', 'showFetchLeadsDialog')
    .addItem('Refresh All Leads', 'refreshAllLeads')
    .addSeparator()
    .addItem('Open Web Interface', 'openWebInterface')
    .addItem('Export to CSV', 'exportToCSV')
    .addSeparator()
    .addItem('Clear All Leads', 'clearAllLeads')
    .addItem('Settings', 'showSettingsDialog')
    .addToUi();
}

/**
 * Initialize both leads and settings sheets
 */
function initializeSheets() {
  try {
    if (!initializeApp()) {
      SpreadsheetApp.getUi().alert('Error', 'Failed to initialize application', SpreadsheetApp.getUi().ButtonSet.OK);
      return;
    }

    const leadsSuccess = sheetManager.initializeLeadsSheet();
    const settingsSuccess = sheetManager.initializeSettingsSheet();
    
    if (leadsSuccess && settingsSuccess) {
      SpreadsheetApp.getUi().alert('Success', 'Sheets initialized successfully!', SpreadsheetApp.getUi().ButtonSet.OK);
    } else {
      SpreadsheetApp.getUi().alert('Warning', 'Some sheets may not have been initialized properly', SpreadsheetApp.getUi().ButtonSet.OK);
    }
  } catch (error) {
    console.error('Error initializing sheets:', error);
    SpreadsheetApp.getUi().alert('Error', 'Failed to initialize sheets: ' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * Show fetch leads dialog
 */
function showFetchLeadsDialog() {
  const html = HtmlService.createHtmlOutputFromFile('index')
    .setWidth(600)
    .setHeight(500);
  
  SpreadsheetApp.getUi().showModalDialog(html, 'Fetch Leads');
}

/**
 * Fetch leads with filters
 * @param {Object} filters - Filter criteria
 * @returns {Object} Result object
 */
function fetchLeads(filters) {
  try {
    if (!initializeApp()) {
      return { success: false, message: 'Failed to initialize application' };
    }

    // Validate API key
    const apiKey = sheetManager.getSetting('Apollo API Key');
    if (!apiKey) {
      return { success: false, message: 'Please set your Apollo API key in Settings' };
    }

    // Set API key
    PropertiesService.getUserProperties().setProperty('APOLLO_API_KEY', apiKey);

    // Fetch leads from Apollo
    const rawLeads = apolloAPI.fetchLeads(filters);
    
    if (!rawLeads || rawLeads.length === 0) {
      return { success: false, message: 'No leads found with the specified criteria' };
    }

    // Clean and validate leads
    const cleanedLeads = dataProcessor.cleanLeads(rawLeads);
    
    if (cleanedLeads.length === 0) {
      return { success: false, message: 'No valid leads found after cleaning' };
    }

    // Append to sheet
    const appendSuccess = sheetManager.appendLeads(cleanedLeads);
    
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
}

/**
 * Refresh all leads (re-fetch with current filters)
 */
function refreshAllLeads() {
  try {
    const response = SpreadsheetApp.getUi().alert(
      'Refresh All Leads',
      'This will clear all existing leads and fetch new ones. Continue?',
      SpreadsheetApp.getUi().ButtonSet.YES_NO
    );

    if (response === SpreadsheetApp.getUi().Button.YES) {
      if (!initializeApp()) {
        SpreadsheetApp.getUi().alert('Error', 'Failed to initialize application', SpreadsheetApp.getUi().ButtonSet.OK);
        return;
      }

      // Clear existing leads
      sheetManager.clearLeads();

      // Fetch with default filters
      const defaultFilters = {
        roles: ['CEO', 'Owner', 'Founder', 'President'],
        perPage: 50
      };

      const result = fetchLeads(defaultFilters);
      
      if (result.success) {
        SpreadsheetApp.getUi().alert('Success', result.message, SpreadsheetApp.getUi().ButtonSet.OK);
      } else {
        SpreadsheetApp.getUi().alert('Error', result.message, SpreadsheetApp.getUi().ButtonSet.OK);
      }
    }
  } catch (error) {
    console.error('Error refreshing leads:', error);
    SpreadsheetApp.getUi().alert('Error', 'Failed to refresh leads: ' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * Open web interface
 */
function openWebInterface() {
  try {
    const html = HtmlService.createHtmlOutputFromFile('index')
      .setWidth(1200)
      .setHeight(800);
    
    SpreadsheetApp.getUi().showModalDialog(html, 'SMB Leads - Web Interface');
  } catch (error) {
    console.error('Error opening web interface:', error);
    SpreadsheetApp.getUi().alert('Error', 'Failed to open web interface: ' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * Export leads to CSV
 */
function exportToCSV() {
  try {
    if (!initializeApp()) {
      SpreadsheetApp.getUi().alert('Error', 'Failed to initialize application', SpreadsheetApp.getUi().ButtonSet.OK);
      return;
    }

    const leads = sheetManager.getLeads();
    
    if (leads.length === 0) {
      SpreadsheetApp.getUi().alert('Info', 'No leads to export', SpreadsheetApp.getUi().ButtonSet.OK);
      return;
    }

    const csvContent = dataProcessor.exportToCSV(leads);
    
    // Create a temporary file
    const fileName = `SMB_Leads_${new Date().toISOString().split('T')[0]}.csv`;
    const blob = Utilities.newBlob(csvContent, 'text/csv', fileName);
    
    // Save to Drive
    const file = DriveApp.createFile(blob);
    const fileUrl = file.getUrl();
    
    SpreadsheetApp.getUi().alert(
      'Export Complete',
      `CSV file exported successfully!\n\nFile: ${fileName}\nURL: ${fileUrl}`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
  } catch (error) {
    console.error('Error exporting CSV:', error);
    SpreadsheetApp.getUi().alert('Error', 'Failed to export CSV: ' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * Clear all leads
 */
function clearAllLeads() {
  try {
    const response = SpreadsheetApp.getUi().alert(
      'Clear All Leads',
      'This will permanently delete all leads. This action cannot be undone. Continue?',
      SpreadsheetApp.getUi().ButtonSet.YES_NO
    );

    if (response === SpreadsheetApp.getUi().Button.YES) {
      if (!initializeApp()) {
        SpreadsheetApp.getUi().alert('Error', 'Failed to initialize application', SpreadsheetApp.getUi().ButtonSet.OK);
        return;
      }

      const success = sheetManager.clearLeads();
      
      if (success) {
        SpreadsheetApp.getUi().alert('Success', 'All leads cleared successfully', SpreadsheetApp.getUi().ButtonSet.OK);
      } else {
        SpreadsheetApp.getUi().alert('Error', 'Failed to clear leads', SpreadsheetApp.getUi().ButtonSet.OK);
      }
    }
  } catch (error) {
    console.error('Error clearing leads:', error);
    SpreadsheetApp.getUi().alert('Error', 'Failed to clear leads: ' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * Show settings dialog
 */
function showSettingsDialog() {
  const html = HtmlService.createHtmlOutputFromFile('index')
    .setWidth(500)
    .setHeight(400);
  
  SpreadsheetApp.getUi().showModalDialog(html, 'Settings');
}

/**
 * Get leads data for web interface
 * @param {Object} filters - Filter criteria
 * @returns {Object} Leads data and statistics
 */
function getLeadsData(filters = {}) {
  try {
    if (!initializeApp()) {
      return { success: false, message: 'Failed to initialize application' };
    }

    const leads = sheetManager.getLeads(filters);
    const statistics = dataProcessor.getLeadStatistics(leads);
    
    return {
      success: true,
      leads: leads,
      statistics: statistics,
      total: leads.length
    };
  } catch (error) {
    console.error('Error getting leads data:', error);
    return { success: false, message: 'Error getting leads data: ' + error.message };
  }
}

/**
 * Update lead contacted status
 * @param {String} email - Lead email
 * @param {Boolean} contacted - Contacted status
 * @returns {Object} Result object
 */
function updateLeadStatus(email, contacted) {
  try {
    if (!initializeApp()) {
      return { success: false, message: 'Failed to initialize application' };
    }

    const success = sheetManager.updateLeadContactedStatus(email, contacted);
    
    return {
      success: success,
      message: success ? 'Lead status updated successfully' : 'Lead not found'
    };
  } catch (error) {
    console.error('Error updating lead status:', error);
    return { success: false, message: 'Error updating lead status: ' + error.message };
  }
}

/**
 * Save settings
 * @param {Object} settings - Settings object
 * @returns {Object} Result object
 */
function saveSettings(settings) {
  try {
    if (!initializeApp()) {
      return { success: false, message: 'Failed to initialize application' };
    }

    // Update each setting
    Object.keys(settings).forEach(key => {
      sheetManager.updateSetting(key, settings[key]);
    });

    // If API key is being updated, also update in PropertiesService
    if (settings['Apollo API Key']) {
      PropertiesService.getUserProperties().setProperty('APOLLO_API_KEY', settings['Apollo API Key']);
    }

    return { success: true, message: 'Settings saved successfully' };
  } catch (error) {
    console.error('Error saving settings:', error);
    return { success: false, message: 'Error saving settings: ' + error.message };
  }
}

/**
 * Get current settings
 * @returns {Object} Settings object
 */
function getSettings() {
  try {
    if (!initializeApp()) {
      return { success: false, message: 'Failed to initialize application' };
    }

    const settings = {
      'Apollo API Key': sheetManager.getSetting('Apollo API Key'),
      'Default Page Size': sheetManager.getSetting('Default Page Size'),
      'Cache Duration': sheetManager.getSetting('Cache Duration'),
      'Auto Refresh': sheetManager.getSetting('Auto Refresh'),
      'Last Updated': sheetManager.getSetting('Last Updated'),
      'Total Leads': sheetManager.getSetting('Total Leads')
    };

    return { success: true, settings: settings };
  } catch (error) {
    console.error('Error getting settings:', error);
    return { success: false, message: 'Error getting settings: ' + error.message };
  }
}

/**
 * Test Apollo.io API connection
 * @param {String} apiKey - API key to test
 * @returns {Object} Test result
 */
function testApolloConnection(apiKey) {
  try {
    if (!apiKey) {
      return { success: false, message: 'API key is required' };
    }

    // Set the API key temporarily
    PropertiesService.getUserProperties().setProperty('APOLLO_API_KEY', apiKey);
    
    // Initialize Apollo API
    const apollo = new ApolloAPI();
    
    // Test with a simple search
    const testFilters = {
      roles: ['CEO'],
      perPage: 1
    };

    const leads = apollo.fetchLeads(testFilters);
    
    return { 
      success: true, 
      message: 'Connection successful',
      leadsCount: leads ? leads.length : 0
    };
  } catch (error) {
    console.error('Error testing Apollo connection:', error);
    return { success: false, message: 'Connection failed: ' + error.message };
  }
}

/**
 * Clear Apollo.io cache
 * @returns {Object} Result object
 */
function clearApolloCache() {
  try {
    if (!initializeApp()) {
      return { success: false, message: 'Failed to initialize application' };
    }

    apolloAPI.clearCache();
    
    return { success: true, message: 'Cache cleared successfully' };
  } catch (error) {
    console.error('Error clearing cache:', error);
    return { success: false, message: 'Error clearing cache: ' + error.message };
  }
}
