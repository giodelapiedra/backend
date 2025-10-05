const fs = require('fs');
const path = require('path');

// Configuration
const oldDbString = 'mongodb://localhost:27017/occupational-rehab';
const newDbString = 'mongodb://localhost:27017/occupational-rehab';
const rootDir = path.join(__dirname, '..');

// Function to recursively find all JavaScript files
function findJsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && file !== 'node_modules') {
      fileList = findJsFiles(filePath, fileList);
    } else if (stat.isFile() && file.endsWith('.js')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Function to update database connection string in a file
function updateDbConnectionInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Replace database connection string
    content = content.replace(new RegExp(oldDbString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newDbString);
    
    // Write back to file if changes were made
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated database connection in: ${path.relative(rootDir, filePath)}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error updating file ${filePath}:`, error.message);
    return false;
  }
}

// Main function
async function updateAllDatabaseConnections() {
  console.log(`🔍 Searching for JavaScript files with database connection string: ${oldDbString}`);
  console.log(`🔄 Will replace with: ${newDbString}`);
  
  // Find all JavaScript files
  const jsFiles = findJsFiles(rootDir);
  console.log(`Found ${jsFiles.length} JavaScript files to check`);
  
  // Update database connection in each file
  let updatedCount = 0;
  
  jsFiles.forEach(filePath => {
    const updated = updateDbConnectionInFile(filePath);
    if (updated) updatedCount++;
  });
  
  console.log(`\n✨ Database connection update complete!`);
  console.log(`📊 Summary:`);
  console.log(`- Total files checked: ${jsFiles.length}`);
  console.log(`- Files updated: ${updatedCount}`);
}

// Run the update
updateAllDatabaseConnections();
