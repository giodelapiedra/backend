const mongoose = require('mongoose');
require('dotenv').config();

// Database connection URL
const DB_URL = 'mongodb://localhost:27017/occupational-rehab';

// Connect to MongoDB and fix any issues
async function fixDatabaseConnection() {
  try {
    console.log('Connecting to database:', DB_URL);
    
    // Connect to database
    await mongoose.connect(DB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Successfully connected to database:', mongoose.connection.name);
    
    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`\nFound ${collections.length} collections:`);
    collections.forEach(collection => console.log(` - ${collection.name}`));
    
    // Check for cases collection
    const casesCollection = collections.find(c => c.name === 'cases');
    if (casesCollection) {
      console.log('\n✅ Cases collection found');
      
      // Count cases
      const casesCount = await mongoose.connection.db.collection('cases').countDocuments();
      console.log(`Found ${casesCount} cases in database`);
      
      // Check for specific case
      const caseId = process.argv[2] || '68d35022e3e7033f2ade12dd';
      console.log(`\nChecking for case: ${caseId}`);
      
      try {
        const caseDoc = await mongoose.connection.db.collection('cases').findOne({ 
          _id: new mongoose.Types.ObjectId(caseId) 
        });
        
        if (caseDoc) {
          console.log('✅ Case found:', {
            caseNumber: caseDoc.caseNumber,
            status: caseDoc.status,
            clinician: caseDoc.clinician
          });
          
          // Create indexes for better performance
          console.log('\nEnsuring indexes are created...');
          await mongoose.connection.db.collection('cases').createIndex({ caseNumber: 1 });
          await mongoose.connection.db.collection('cases').createIndex({ worker: 1 });
          await mongoose.connection.db.collection('cases').createIndex({ employer: 1 });
          await mongoose.connection.db.collection('cases').createIndex({ caseManager: 1 });
          await mongoose.connection.db.collection('cases').createIndex({ clinician: 1 });
          await mongoose.connection.db.collection('cases').createIndex({ status: 1 });
          await mongoose.connection.db.collection('cases').createIndex({ priority: 1 });
          console.log('✅ Indexes created successfully');
        } else {
          console.log('❌ Case not found in database');
        }
      } catch (err) {
        console.error('Error finding case:', err);
      }
    } else {
      console.log('❌ Cases collection not found in database');
    }
    
    console.log('\nDatabase connection test completed');
  } catch (error) {
    console.error('❌ Database connection error:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('Connection closed');
  }
}

// Run the fix
fixDatabaseConnection();
