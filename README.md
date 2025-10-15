# SMB Lead Automator

A modern Google Apps Script-based lead generation application that integrates with Apollo.io API to fetch and manage SMB leads using Google Sheets as the database.

## 🚀 Features

- **Apollo.io API Integration** - Fetch leads with advanced filtering
- **Google Sheets Database** - Automatic sheet initialization and management
- **Modern Web Interface** - Built with Tailwind CSS and Bootstrap
- **Advanced Filtering** - Filter by role, company size, sector, location, etc.
- **Export Functionality** - CSV export with custom formatting
- **Performance Optimization** - Caching and batch operations
- **Real-time Updates** - Live data synchronization

## 📁 Project Structure

```
smb-lead-automator/
├── src/
│   ├── library/           # Stand-alone library code
│   │   ├── apolloApi.js   # Apollo.io API integration
│   │   ├── dataProcessor.js # Data cleaning and validation
│   │   └── sheetManager.js # Google Sheets operations
│   └── sheet/             # Sheet-bound script code
│       ├── main.js        # Main script functions
│       └── index.html     # Single web interface
├── appsscript.json        # Apps Script configuration
├── package.json           # Node.js dependencies
├── deploy.js              # Deployment script
└── README.md              # This file
```

## 🛠️ Quick Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Login to Google**
   ```bash
   clasp login
   ```

3. **Deploy the project**
   ```bash
   npm run deploy
   ```

4. **Initialize sheets**
   - Open your Google Sheet
   - Use the "SMB Leads" menu
   - Click "Initialize Sheets"

5. **Configure API**
   - Go to Settings
   - Enter your Apollo.io API key
   - Test connection

## 📊 Usage

### Dashboard
- View lead statistics
- Filter and search leads
- Manage lead status
- Export data

### Fetch Leads
- Configure search criteria
- Select target roles and company filters
- Fetch leads from Apollo.io
- Automatic data cleaning and validation

### Settings
- API configuration
- Performance settings
- Data management
- System information

## 🔧 Configuration

Set your Apollo.io API key in the Settings tab or through the Google Apps Script properties.

## 📈 Database Schema

| Column | Type | Description |
|--------|------|-------------|
| Timestamp | DateTime | Last update time |
| Lead Name | String | Full name of the lead |
| Title | String | Job title (CEO/Owner/etc.) |
| Company Name | String | Company name |
| Sector | String | Industry sector |
| Employees | Number | Company size |
| Capital | Number | Capital/revenue |
| Year Founded | Number | Founding year |
| Email | String | Validated email |
| Phone | String | Phone number |
| Location | String | City, State |
| Website | String | Company website |
| LinkedIn | String | LinkedIn profile |
| Contacted | Boolean | Contact status |
| Notes | String | Additional notes |

## 🚨 Troubleshooting

- **API Issues**: Check your Apollo.io API key and credits
- **Permission Errors**: Ensure you have edit access to the sheet
- **Data Issues**: Use the "Initialize Sheets" function to reset

## 📝 License

MIT License - see LICENSE file for details.
