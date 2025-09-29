const mongoose = require('mongoose');
require('dotenv').config();

const Notification = require('../models/Notification');
const User = require('../models/User');

async function checkNotificationActionUrls() {
  try {
    console.log('Connecting to MongoDB...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/occupational-rehab', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Find high pain notifications
    const notifications = await Notification.find({ type: 'high_pain' })
      .populate('recipient', 'firstName lastName email role')
      .populate('sender', 'firstName lastName email')
      .sort({ createdAt: -1 });
    
    console.log(`Found ${notifications.length} high pain notifications:`);
    
    notifications.forEach((notification, index) => {
      console.log(`\n${index + 1}. Notification:`);
      console.log(`   - Type: ${notification.type}`);
      console.log(`   - Title: ${notification.title}`);
      console.log(`   - Message: ${notification.message}`);
      console.log(`   - Priority: ${notification.priority}`);
      console.log(`   - Action URL: ${notification.actionUrl}`);
      console.log(`   - Created: ${notification.createdAt}`);
      console.log(`   - Recipient: ${notification.recipient?.firstName} ${notification.recipient?.lastName}`);
      console.log(`   - Sender: ${notification.sender?.firstName} ${notification.sender?.lastName}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

checkNotificationActionUrls();
