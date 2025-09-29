const mongoose = require('mongoose');
require('dotenv').config();

const Notification = require('../models/Notification');
const User = require('../models/User');

async function checkNotifications() {
  try {
    console.log('Connecting to MongoDB...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/occupational-rehab', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Find all notifications
    const notifications = await Notification.find({}).populate('recipient', 'firstName lastName email role').populate('sender', 'firstName lastName email');
    console.log(`Found ${notifications.length} notifications:`);
    
    notifications.forEach(notification => {
      console.log(`\n- Type: ${notification.type}`);
      console.log(`  Title: ${notification.title}`);
      console.log(`  Message: ${notification.message}`);
      console.log(`  Priority: ${notification.priority}`);
      console.log(`  Recipient: ${notification.recipient?.firstName} ${notification.recipient?.lastName} (${notification.recipient?.role})`);
      console.log(`  Sender: ${notification.sender?.firstName} ${notification.sender?.lastName}`);
      console.log(`  Created: ${notification.createdAt}`);
      console.log(`  Read: ${notification.isRead}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

checkNotifications();
