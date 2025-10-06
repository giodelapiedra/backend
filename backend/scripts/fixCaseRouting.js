const mongoose = require('mongoose');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect('mongodb://localhost:27017/occupational-rehab', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to database:', mongoose.connection.name);
    return mongoose.connection;
  } catch (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  }
}

// Fix the case routing
async function fixCaseRouting() {
  try {
    // Connect to database
    const db = await connectDB();
    
    // Get the case ID from command line arguments
    const caseId = process.argv[2] || '68d35022e3e7033f2ade12dd';
    console.log('Checking case:', caseId);
    
    // Get the case collection
    const caseCollection = db.collection('cases');
    
    // Find the case
    const caseDoc = await caseCollection.findOne({ _id: new mongoose.Types.ObjectId(caseId) });
    
    if (!caseDoc) {
      console.log('❌ Case not found in database');
      return;
    }
    
    console.log('✅ Case found in database:', {
      caseNumber: caseDoc.caseNumber,
      status: caseDoc.status,
      clinician: caseDoc.clinician
    });
    
    // Check clinician reference
    if (caseDoc.clinician) {
      console.log('Clinician reference type:', typeof caseDoc.clinician);
      console.log('Clinician ID:', caseDoc.clinician.toString());
      
      // Find the clinician
      const userCollection = db.collection('users');
      const clinician = await userCollection.findOne({ _id: caseDoc.clinician });
      
      if (clinician) {
        console.log('✅ Clinician found:', {
          name: `${clinician.firstName} ${clinician.lastName}`,
          email: clinician.email,
          role: clinician.role
        });
      } else {
        console.log('❌ Clinician not found in database');
      }
    } else {
      console.log('❌ No clinician assigned to case');
    }
    
    // Create a test express app to verify routing
    const app = express();
    app.use(cors());
    app.use(bodyParser.json());
    
    // Create a test endpoint
    app.get('/api/cases/:id', async (req, res) => {
      try {
        const caseId = req.params.id;
        console.log('API request for case:', caseId);
        
        // Find the case
        const caseDoc = await caseCollection.findOne({ _id: new mongoose.Types.ObjectId(caseId) });
        
        if (!caseDoc) {
          console.log('Case not found');
          return res.status(404).json({ message: 'Case not found' });
        }
        
        console.log('Case found, returning response');
        
        // Return the case with the correct format
        res.json({ case: caseDoc });
      } catch (error) {
        console.error('API error:', error);
        res.status(500).json({
          message: 'Error fetching case',
          error: error.message
        });
      }
    });
    
    // Start the server
    const PORT = 5002;
    app.listen(PORT, () => {
      console.log(`\nTest server running on port ${PORT}`);
      console.log(`Test endpoint: http://localhost:${PORT}/api/cases/${caseId}`);
      console.log('Press Ctrl+C to stop the server');
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the fix
fixCaseRouting();
