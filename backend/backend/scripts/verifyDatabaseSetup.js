const mongoose = require('mongoose');
const { connectDB } = require('../config/database');

async function verifyDatabaseSetup() {
  try {
    console.log('🔍 Starting database verification...');
    
    // Connect to database
    await connectDB();
    console.log('✅ Connected to database:', mongoose.connection.name);
    
    // Get all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`\n📊 Found ${collections.length} collections:`);
    
    // Check each collection
    for (const collection of collections) {
      const count = await mongoose.connection.db.collection(collection.name).countDocuments();
      console.log(`- ${collection.name}: ${count} documents`);
      
      // Sample a document from each collection
      if (count > 0) {
        const sample = await mongoose.connection.db.collection(collection.name).findOne();
        console.log(`  Sample document ID: ${sample._id}`);
      }
    }
    
    // Specifically check cases collection
    const casesCollection = collections.find(c => c.name === 'cases');
    if (casesCollection) {
      const cases = await mongoose.connection.db.collection('cases').find().limit(5).toArray();
      console.log('\n📋 Recent cases:');
      cases.forEach(c => {
        console.log(`- Case ${c.caseNumber || c._id}:`);
        console.log(`  Worker: ${c.worker}`);
        console.log(`  Clinician: ${c.clinician}`);
        console.log(`  Status: ${c.status}`);
      });
    } else {
      console.log('\n⚠️ Warning: Cases collection not found!');
    }
    
    // Check indexes on cases collection
    if (casesCollection) {
      const indexes = await mongoose.connection.db.collection('cases').indexes();
      console.log('\n📑 Case collection indexes:');
      indexes.forEach(index => {
        console.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error during verification:', error);
  } finally {
    await mongoose.connection.close();
  }
}

// Run verification
verifyDatabaseSetup();
