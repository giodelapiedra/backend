const mongoose = require('mongoose');
require('dotenv').config();

async function simpleTest() {
  try {
    console.log('Starting simple alert test...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/data5', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Import models
    const User = require('../models/User');
    const Case = require('../models/Case');
    const Notification = require('../models/Notification');

    // Check if we have any clinicians
    const clinicians = await User.find({ role: 'clinician', isActive: true });
    console.log(`Found ${clinicians.length} clinicians`);

    // Check if we have any cases with clinicians assigned
    const casesWithClinicians = await Case.find({ clinician: { $exists: true } })
      .populate('clinician', 'firstName lastName email')
      .populate('worker', 'firstName lastName email');
    console.log(`Found ${casesWithClinicians.length} cases with clinicians assigned`);

    // Check notifications
    const notifications = await Notification.find({})
      .populate('recipient', 'firstName lastName role')
      .populate('sender', 'firstName lastName role')
      .sort({ createdAt: -1 })
      .limit(10);
    
    console.log(`Found ${notifications.length} total notifications`);
    
    notifications.forEach((notif, index) => {
      console.log(`${index + 1}. ${notif.type} - ${notif.title}`);
      console.log(`   To: ${notif.recipient?.firstName} ${notif.recipient?.lastName} (${notif.recipient?.role})`);
      console.log(`   From: ${notif.sender?.firstName} ${notif.sender?.lastName} (${notif.sender?.role})`);
      console.log(`   Priority: ${notif.priority}`);
      console.log(`   Read: ${notif.isRead}`);
      console.log(`   Created: ${notif.createdAt}`);
      console.log('');
    });

    // Check unread notifications for clinicians
    for (const clinician of clinicians) {
      const unreadCount = await Notification.countDocuments({ 
        recipient: clinician._id, 
        isRead: false 
      });
      console.log(`Clinician ${clinician.firstName} ${clinician.lastName} has ${unreadCount} unread notifications`);
    }

  } catch (error) {
    console.error('Error in simple test:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the test
simpleTest();
