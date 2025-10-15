/**
 * Deployment Script for SMB Leads Generation App
 * This script helps deploy the Google Apps Script project
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 SMB Leads Generation App - Deployment Script');
console.log('================================================\n');

// Check if clasp is installed
function checkClasp() {
  try {
    execSync('clasp --version', { stdio: 'pipe' });
    console.log('✅ Clasp is installed');
    return true;
  } catch (error) {
    console.log('❌ Clasp is not installed. Please install it first:');
    console.log('   npm install -g @google/clasp');
    return false;
  }
}

// Check if user is logged in
function checkLogin() {
  try {
    execSync('clasp whoami', { stdio: 'pipe' });
    console.log('✅ Clasp is logged in');
    return true;
  } catch (error) {
    console.log('❌ Clasp is not logged in. Please login first:');
    console.log('   clasp login');
    return false;
  }
}

// Create .clasp.json if it doesn't exist
function createClaspConfig() {
  const claspConfig = {
    scriptId: '',
    rootDir: 'src'
  };

  if (!fs.existsSync('.clasp.json')) {
    fs.writeFileSync('.clasp.json', JSON.stringify(claspConfig, null, 2));
    console.log('✅ Created .clasp.json configuration file');
    console.log('   Please update the scriptId in .clasp.json with your Google Apps Script project ID');
  } else {
    console.log('✅ .clasp.json already exists');
  }
}

// Deploy the project
function deployProject() {
  try {
    console.log('📦 Deploying project...');
    execSync('clasp push', { stdio: 'inherit' });
    console.log('✅ Project deployed successfully!');
    return true;
  } catch (error) {
    console.log('❌ Deployment failed:', error.message);
    return false;
  }
}

// Create deployment
function createDeployment() {
  try {
    console.log('🚀 Creating deployment...');
    const output = execSync('clasp deploy', { stdio: 'pipe' });
    console.log('✅ Deployment created successfully!');
    console.log(output.toString());
    return true;
  } catch (error) {
    console.log('❌ Deployment creation failed:', error.message);
    return false;
  }
}

// Main deployment process
function main() {
  console.log('Starting deployment process...\n');

  // Check prerequisites
  if (!checkClasp()) {
    process.exit(1);
  }

  if (!checkLogin()) {
    process.exit(1);
  }

  // Create configuration
  createClaspConfig();

  // Deploy project
  if (!deployProject()) {
    process.exit(1);
  }

  // Create deployment
  if (!createDeployment()) {
    process.exit(1);
  }

  console.log('\n🎉 Deployment completed successfully!');
  console.log('\nNext steps:');
  console.log('1. Open your Google Apps Script project');
  console.log('2. Initialize the sheets using the "SMB Leads" menu');
  console.log('3. Set your Apollo.io API key in Settings');
  console.log('4. Start fetching leads!');
}

// Run deployment
main();
