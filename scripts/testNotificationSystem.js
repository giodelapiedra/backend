const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/occupational-rehab', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const notificationScheduler = require('./services/notificationScheduler');

async function testNotificationSystem() {
  try {
    console.log('🧪 Testing notification system...');
    
    // Test today's appointment notifications
    console.log('\n📅 Testing today\'s appointment notifications...');
    await notificationScheduler.triggerTodaysNotifications();
    
    // Test upcoming appointment reminders
    console.log('\n⏰ Testing upcoming appointment reminders...');
    await notificationScheduler.triggerUpcomingReminders();
    
    console.log('\n✅ Notification system test completed!');
    
  } catch (error) {
    console.error('❌ Error testing notification system:', error);
  } finally {
    mongoose.connection.close();
  }
}

testNotificationSystem();
