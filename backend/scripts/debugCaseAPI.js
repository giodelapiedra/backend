const mongoose = require('mongoose');
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Create a test express app
const app = express();
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/occupational-rehab', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to database:', mongoose.connection.name);
}).catch(err => {
  console.error('Database connection error:', err);
  process.exit(1);
});

// Import Case model
const Case = mongoose.model('Case', new mongoose.Schema({}, { strict: false }), 'cases');

// Create a test endpoint
app.get('/test-case/:id', async (req, res) => {
  try {
    const caseId = req.params.id;
    console.log('Looking up case:', caseId);
    
    // Find the case
    const caseDoc = await Case.findById(caseId);
    
    if (!caseDoc) {
      console.log('Case not found');
      return res.status(404).json({ message: 'Case not found' });
    }
    
    console.log('Case found:', {
      caseNumber: caseDoc.caseNumber,
      status: caseDoc.status,
      clinician: caseDoc.clinician
    });
    
    // Return the case
    res.json({ case: caseDoc });
  } catch (error) {
    console.error('Error fetching case:', error);
    res.status(500).json({
      message: 'Error fetching case',
      error: error.message,
      stack: error.stack
    });
  }
});

// Start the server
const PORT = 5001;
app.listen(PORT, () => {
  console.log(`Debug server running on port ${PORT}`);
  console.log(`Test endpoint: http://localhost:${PORT}/test-case/68d35022e3e7033f2ade12dd`);
});
