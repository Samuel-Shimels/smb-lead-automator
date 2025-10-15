/**
 * SMB Lead Automator - Main Sheet-bound Script
 * Handles menu creation, API calls, and data operations
 * Uses LeadLib library for core functionality
 */

// ===== CONFIGURATION =====

function getSheetId() {
  // For sheet-bound scripts, use the current spreadsheet ID
  return SpreadsheetApp.getActiveSpreadsheet().getId();
}

/**
 * Get web app URL for the deployed script
 */
function getWebAppUrl() {
  try {
    // Try to get the web app URL from the script
    const scriptId = ScriptApp.getScriptId();
    return `https://script.google.com/macros/s/${scriptId}/exec`;
  } catch (error) {
    console.error('Error getting web app URL:', error);
    return null;
  }
}

// ===== WEB APP ENTRY POINT =====

function doGet(e) {
  try {
    return HtmlService.createHtmlOutputFromFile('index')
      .setTitle('SMB Lead Automator - Modern Lead Generation')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
  } catch (error) {
    console.error('doGet error:', error);
    return HtmlService.createHtmlOutput('<h1>Error loading app</h1><p>' + error.message + '</p>');
  }
}

/**
 * XMLHttpRequest API Handler
 * Provides async, non-blocking API for client-side XMLHttpRequest calls
 */
function doPost(e) {
  try {
    let requestData;
    
    // Parse incoming JSON request
    if (e.postData && e.postData.contents) {
      try {
        requestData = JSON.parse(e.postData.contents);
      } catch (parseError) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: 'Invalid JSON in request body'
        })).setMimeType(ContentService.MimeType.JSON);
      }
    } else {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'No request data provided'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const action = requestData.action;
    const params = requestData.params || {};
    
    // Route to appropriate handler
    let result;
    switch(action) {
      // Dashboard & Stats
      case 'getStats':
        result = getCachedStatsApi();
        break;
      case 'getQuickStats':
        result = getQuickStatsApi();
        break;
        
      // Leads
      case 'listLeads':
        result = listLeadsApi(params);
        break;
      case 'fetchLeads':
        result = fetchLeadsApi(params);
        break;
      case 'updateLeadStatus':
        result = updateLeadStatusApi(params.email, params.contacted);
        break;
        
      // Settings
      case 'getSettings':
        result = getSettingsApi();
        break;
      case 'saveSettings':
        result = saveSettingsApi(params.settings);
        break;
      case 'testApolloConnection':
        result = testApolloConnectionApi(params.apiKey);
        break;
        
      // Export
      case 'exportToCSV':
        result = exportToCSVApi(params);
        break;
        
      // Cache Management
      case 'clearCache':
        result = clearCacheApi(params.cacheType);
        break;
      case 'warmCache':
        result = warmCacheApi();
        break;
        
      // Admin
      case 'initSheets':
        result = initSheetsApi();
        break;
      case 'clearAllLeads':
        result = clearAllLeadsApi();
        break;
        
      default:
        result = {
          success: false,
          error: 'Unknown action: ' + action
        };
    }
    
    // Return JSON response
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('doPost error:', error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.message || 'Server error'
    })).setMimeType(ContentService.MimeType.JSON);
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

// ===== INITIALIZATION API =====

function initSheetsApi() {
  try {
    const spreadsheetId = getSheetId();
    
    // Check if LeadLib is available
    if (typeof LeadLib !== 'undefined' && LeadLib.initSheets) {
      return LeadLib.initSheets(spreadsheetId);
    } else {
      console.warn('LeadLib not available, using fallback initialization');
      return initSheetsFallback(spreadsheetId);
    }
  } catch (error) {
    console.error('initSheetsApi error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Fallback initialization when LeadLib is not available
 */
function initSheetsFallback(spreadsheetId) {
  try {
    const ss = SpreadsheetApp.openById(spreadsheetId);
    
    // Initialize Leads sheet
    let leadsSheet = ss.getSheetByName('Leads');
    if (!leadsSheet) {
      leadsSheet = ss.insertSheet('Leads');
    }
    leadsSheet.clear();
    
    const leadsHeaders = [
      'Timestamp', 'Lead Name', 'Title', 'Company Name', 'Industry',
      'Employees', 'Founded Year', 'Email', 'Phone', 'Location',
      'LinkedIn', 'Website', 'Description', 'Contacted', 'Source'
    ];
    leadsSheet.getRange(1, 1, 1, leadsHeaders.length).setValues([leadsHeaders]);
    
    // Format header row
    const leadsHeaderRange = leadsSheet.getRange(1, 1, 1, leadsHeaders.length);
    leadsHeaderRange.setBackground('#4285f4');
    leadsHeaderRange.setFontColor('white');
    leadsHeaderRange.setFontWeight('bold');
    leadsHeaderRange.setHorizontalAlignment('center');
    
    // Initialize Settings sheet
    let settingsSheet = ss.getSheetByName('Settings');
    if (!settingsSheet) {
      settingsSheet = ss.insertSheet('Settings');
    }
    settingsSheet.clear();
    
    const settingsData = [
      ['Setting', 'Value', 'Description'],
      ['Apollo API Key', '', 'Your Apollo.io API key'],
      ['Default Page Size', '25', 'Number of leads to fetch per request'],
      ['Cache Duration', '3600', 'Cache duration in seconds'],
      ['Auto Refresh', 'FALSE', 'Automatically refresh leads'],
      ['Last Updated', '', 'Last successful data fetch'],
      ['Total Leads', '0', 'Total number of leads in database']
    ];
    settingsSheet.getRange(1, 1, settingsData.length, 3).setValues(settingsData);
    
    // Format settings header row
    const settingsHeaderRange = settingsSheet.getRange(1, 1, 1, 3);
    settingsHeaderRange.setBackground('#34a853');
    settingsHeaderRange.setFontColor('white');
    settingsHeaderRange.setFontWeight('bold');
    settingsHeaderRange.setHorizontalAlignment('center');
    
    console.log('Fallback initialization completed');
    return { 
      success: true, 
      leadsSheet: true,
      settingsSheet: true,
      message: 'Sheets initialized successfully (fallback mode)' 
    };
    
  } catch (error) {
    console.error('Fallback initialization error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Initialize both leads and settings sheets
 */
function initializeSheets() {
  try {
    const result = initSheetsApi();
    
    if (result.success) {
      SpreadsheetApp.getUi().alert('Success', 'Sheets initialized successfully!', SpreadsheetApp.getUi().ButtonSet.OK);
    } else {
      SpreadsheetApp.getUi().alert('Error', 'Failed to initialize sheets: ' + result.error, SpreadsheetApp.getUi().ButtonSet.OK);
    }
  } catch (error) {
    console.error('Error initializing sheets:', error);
    SpreadsheetApp.getUi().alert('Error', 'Failed to initialize sheets: ' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

// ===== DASHBOARD API =====

function getStatsApi() {
  try {
    const spreadsheetId = getSheetId();
    return LeadLib.getStats(spreadsheetId);
  } catch (error) {
    console.error('getStatsApi error:', error);
    return { error: error.message };
  }
}

/**
 * Get cached dashboard stats (1-hour cache, much faster than getStatsApi)
 */
function getCachedStatsApi() {
  try {
    const spreadsheetId = getSheetId();
    if (typeof LeadLib !== 'undefined' && LeadLib.getCachedStats) {
      const stats = LeadLib.getCachedStats(spreadsheetId, false);
      console.log('Stats loaded (execution time: ' + (stats.executionTime || 0) + 'ms)');
      return stats;
    }
    return getStatsApi();
  } catch (error) {
    console.error('getCachedStatsApi error:', error);
    return getStatsApi();
  }
}

/**
 * ULTRA-FAST stats - only row counts (instant!)
 */
function getQuickStatsApi() {
  try {
    const spreadsheetId = getSheetId();
    if (typeof LeadLib !== 'undefined' && LeadLib.getQuickStats) {
      return LeadLib.getQuickStats(spreadsheetId);
    }
    return getCachedStatsApi();
  } catch (error) {
    console.error('getQuickStatsApi error:', error);
    return getCachedStatsApi();
  }
}

// ===== LEADS API =====

/**
 * List leads with caching for better performance
 */
function listLeadsApi(params) {
  try {
    const spreadsheetId = getSheetId();
    
    // Try to use cached full list first
    const cacheKey = 'leads_full_list';
    const cache = CacheService.getScriptCache();
    let leads;
    
    const cached = cache.get(cacheKey);
    if (cached && !params.forceRefresh) {
      leads = JSON.parse(cached);
      console.log('Leads loaded from cache');
    } else {
      // Fetch from sheet using LeadLib
      if (typeof LeadLib !== 'undefined' && LeadLib.getLeads) {
        leads = LeadLib.getLeads(spreadsheetId, params);
      } else {
        // Fallback to direct sheet access
        const ss = SpreadsheetApp.openById(spreadsheetId);
        const sheet = ss.getSheetByName('Leads');
        
        if (!sheet || sheet.getLastRow() < 2) {
          return { rows: [], total: 0 };
        }
        
        const data = sheet.getDataRange().getValues();
        const headers = data[0];
        const rows = data.slice(1);
        
        leads = rows.map(function(row) {
          const obj = {};
          headers.forEach(function(header, idx) {
            obj[header] = row[idx];
          });
          return obj;
        });
      }
      
      // Cache for 10 minutes
      try {
        cache.put(cacheKey, JSON.stringify(leads), 600);
      } catch (e) {
        console.warn('Could not cache leads:', e);
      }
    }
    
    const page = params.page || 1;
    const pageSize = params.pageSize || 10;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    
    return {
      rows: leads.slice(start, end),
      total: leads.length,
      page: page,
      pageSize: pageSize
    };
  } catch (error) {
    console.error('listLeadsApi error:', error);
    return { rows: [], total: 0, error: error.message };
  }
}

function fetchLeadsApi(params) {
  try {
    const spreadsheetId = getSheetId();
    
    // Validate API key
    const apiKey = PropertiesService.getUserProperties().getProperty('APOLLO_API_KEY');
    if (!apiKey) {
      return { success: false, message: 'Please set your Apollo API key in Settings' };
    }

    // Use LeadLib to fetch leads
    if (typeof LeadLib !== 'undefined' && LeadLib.fetchLeads) {
      const result = LeadLib.fetchLeads(spreadsheetId, params, apiKey);
      
      // Invalidate cache after new data
      CacheService.getScriptCache().remove('leads_full_list');
      
      return result;
    } else {
      return { success: false, message: 'LeadLib not available' };
    }
  } catch (error) {
    console.error('fetchLeadsApi error:', error);
    return { success: false, message: 'Error fetching leads: ' + error.message };
  }
}

function updateLeadStatusApi(email, contacted) {
  try {
    const spreadsheetId = getSheetId();
    
    if (typeof LeadLib !== 'undefined' && LeadLib.updateLeadStatus) {
      const result = LeadLib.updateLeadStatus(spreadsheetId, email, contacted);
      
      // Invalidate cache after update
      CacheService.getScriptCache().remove('leads_full_list');
      
      return result;
    } else {
      return { success: false, message: 'LeadLib not available' };
    }
  } catch (error) {
    console.error('updateLeadStatusApi error:', error);
    return { success: false, message: 'Error updating lead status: ' + error.message };
  }
}

// ===== SETTINGS API =====

function getSettingsApi() {
  try {
    const spreadsheetId = getSheetId();
    
    if (typeof LeadLib !== 'undefined' && LeadLib.getSettings) {
      return LeadLib.getSettings(spreadsheetId);
    } else {
      // Fallback to direct sheet access
      const ss = SpreadsheetApp.openById(spreadsheetId);
      const sheet = ss.getSheetByName('Settings');
      
      if (!sheet || sheet.getLastRow() < 2) {
        return { success: true, settings: {} };
      }
      
      const data = sheet.getDataRange().getValues();
      const settings = {};
      
      for (let i = 1; i < data.length; i++) {
        settings[data[i][0]] = data[i][1];
      }
      
      return { success: true, settings: settings };
    }
  } catch (error) {
    console.error('getSettingsApi error:', error);
    return { success: false, error: error.message };
  }
}

function saveSettingsApi(settings) {
  try {
    const spreadsheetId = getSheetId();
    
    if (typeof LeadLib !== 'undefined' && LeadLib.saveSettings) {
      const result = LeadLib.saveSettings(spreadsheetId, settings);
      
      // If API key is being updated, also update in PropertiesService
      if (settings['Apollo API Key']) {
        PropertiesService.getUserProperties().setProperty('APOLLO_API_KEY', settings['Apollo API Key']);
      }
      
      return result;
    } else {
      return { success: false, message: 'LeadLib not available' };
    }
  } catch (error) {
    console.error('saveSettingsApi error:', error);
    return { success: false, error: error.message };
  }
}

function testApolloConnectionApi(apiKey) {
  try {
    if (!apiKey) {
      return { success: false, message: 'API key is required' };
    }

    // Set the API key temporarily
    PropertiesService.getUserProperties().setProperty('APOLLO_API_KEY', apiKey);
    
    // Test with LeadLib
    if (typeof LeadLib !== 'undefined' && LeadLib.testApolloConnection) {
      return LeadLib.testApolloConnection(apiKey);
    } else {
      return { success: false, message: 'LeadLib not available' };
    }
  } catch (error) {
    console.error('testApolloConnectionApi error:', error);
    return { success: false, message: 'Connection failed: ' + error.message };
  }
}

// ===== EXPORT API =====

function exportToCSVApi(params) {
  try {
    const spreadsheetId = getSheetId();
    
    if (typeof LeadLib !== 'undefined' && LeadLib.exportToCSV) {
      return LeadLib.exportToCSV(spreadsheetId, params);
    } else {
      return { success: false, message: 'LeadLib not available' };
    }
  } catch (error) {
    console.error('exportToCSVApi error:', error);
    return { success: false, error: error.message };
  }
}

// ===== CACHE MANAGEMENT API =====

/**
 * Warm cache - preload frequently accessed data for instant performance
 */
function warmCacheApi() {
  try {
    const startTime = new Date().getTime();
    const spreadsheetId = getSheetId();
    
    console.log('Warming all caches...');
    
    // Warm library caches
    if (typeof LeadLib !== 'undefined' && LeadLib.warmCache) {
      LeadLib.warmCache(spreadsheetId);
    }
    
    // Preload list caches
    listLeadsApi({ page: 1, pageSize: 10 });
    console.log('✓ Leads list cached');
    
    const endTime = new Date().getTime();
    const totalTime = endTime - startTime;
    
    console.log('All caches warmed in ' + totalTime + 'ms');
    
    return { 
      success: true, 
      message: 'All caches warmed successfully', 
      executionTime: totalTime 
    };
  } catch (error) {
    console.error('warmCacheApi error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Clear cache by type
 */
function clearCacheApi(cacheType) {
  try {
    if (typeof LeadLib !== 'undefined' && LeadLib.clearCache) {
      return LeadLib.clearCache(cacheType || 'all');
    }
    
    // Fallback to direct cache clearing
    const cache = CacheService.getScriptCache();
    
    switch(cacheType) {
      case 'leads':
        cache.remove('leads_full_list');
        break;
      case 'all':
        cache.remove('leads_full_list');
        break;
    }
    
    return { success: true, message: 'Cache cleared successfully' };
  } catch (error) {
    console.error('clearCacheApi error:', error);
    return { success: false, error: error.message };
  }
}

// ===== ADMIN API =====

function clearAllLeadsApi() {
  try {
    const spreadsheetId = getSheetId();
    
    if (typeof LeadLib !== 'undefined' && LeadLib.clearAllLeads) {
      const result = LeadLib.clearAllLeads(spreadsheetId);
      
      // Invalidate cache after clearing
      CacheService.getScriptCache().remove('leads_full_list');
      
      return result;
    } else {
      return { success: false, message: 'LeadLib not available' };
    }
  } catch (error) {
    console.error('clearAllLeadsApi error:', error);
    return { success: false, error: error.message };
  }
}

// ===== UI DIALOG FUNCTIONS =====

/**
 * Show fetch leads dialog
 */
function showFetchLeadsDialog() {
  try {
    const html = HtmlService.createHtmlOutputFromFile('index')
      .setWidth(600)
      .setHeight(500);
    
    SpreadsheetApp.getUi().showModalDialog(html, 'Fetch Leads');
  } catch (error) {
    console.error('Error showing fetch leads dialog:', error);
    // Fallback: open web interface
    openWebInterface();
  }
}

/**
 * Open web interface
 */
function openWebInterface() {
  try {
    // Try modal dialog first
    const html = HtmlService.createHtmlOutputFromFile('index')
      .setWidth(1200)
      .setHeight(800);
    
    SpreadsheetApp.getUi().showModalDialog(html, 'SMB Leads - Web Interface');
  } catch (error) {
    console.error('Modal dialog failed, trying alternative approach:', error);
    
    try {
      // Alternative: Open in new tab/window using web app URL
      const webAppUrl = getWebAppUrl();
      if (webAppUrl) {
        SpreadsheetApp.getUi().alert(
          'Open Web Interface',
          'Please click OK to open the web interface in a new tab:\n\n' + webAppUrl,
          SpreadsheetApp.getUi().ButtonSet.OK
        );
      } else {
        throw new Error('Web app URL not available');
      }
    } catch (altError) {
      console.error('Alternative approach also failed:', altError);
      SpreadsheetApp.getUi().alert(
        'Error', 
        'Failed to open web interface. Please check the script permissions and try again.\n\nError: ' + error.message, 
        SpreadsheetApp.getUi().ButtonSet.OK
      );
    }
  }
}

/**
 * Export leads to CSV
 */
function exportToCSV() {
  try {
    const result = exportToCSVApi({});
    
    if (result.success) {
      SpreadsheetApp.getUi().alert(
        'Export Complete',
        `CSV file exported successfully!\n\nFile: ${result.fileName}\nURL: ${result.fileUrl}`,
        SpreadsheetApp.getUi().ButtonSet.OK
      );
    } else {
      SpreadsheetApp.getUi().alert('Error', result.message, SpreadsheetApp.getUi().ButtonSet.OK);
    }
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
      const result = clearAllLeadsApi();
      
      if (result.success) {
        SpreadsheetApp.getUi().alert('Success', 'All leads cleared successfully', SpreadsheetApp.getUi().ButtonSet.OK);
      } else {
        SpreadsheetApp.getUi().alert('Error', result.message, SpreadsheetApp.getUi().ButtonSet.OK);
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
  try {
    const html = HtmlService.createHtmlOutputFromFile('index')
      .setWidth(500)
      .setHeight(400);
    
    SpreadsheetApp.getUi().showModalDialog(html, 'Settings');
  } catch (error) {
    console.error('Error showing settings dialog:', error);
    // Fallback: open web interface
    openWebInterface();
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
      // Clear existing leads
      const clearResult = clearAllLeadsApi();
      
      if (!clearResult.success) {
        SpreadsheetApp.getUi().alert('Error', 'Failed to clear existing leads: ' + clearResult.message, SpreadsheetApp.getUi().ButtonSet.OK);
        return;
      }

      // Fetch with default filters
      const defaultFilters = {
        roles: ['CEO', 'Owner', 'Founder', 'President'],
        perPage: 50
      };

      const result = fetchLeadsApi(defaultFilters);
      
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