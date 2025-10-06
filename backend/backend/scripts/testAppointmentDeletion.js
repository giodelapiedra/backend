const axios = require('axios');

// API URL
const API_URL = 'http://localhost:5000/api';

// Test appointment deletion
async function testAppointmentDeletion() {
  try {
    console.log('🧪 Testing appointment deletion functionality...');
    
    // First, let's get all appointments to see what we have
    console.log('\n📋 Getting all appointments...');
    const appointmentsResponse = await axios.get(`${API_URL}/appointments`);
    const appointments = appointmentsResponse.data.appointments || [];
    
    console.log(`Found ${appointments.length} appointments:`);
    appointments.forEach((apt, index) => {
      console.log(`${index + 1}. ${apt._id} - ${apt.appointmentType} - ${apt.status} - ${apt.location}`);
      if (apt.zoomMeeting) {
        console.log(`   Zoom Meeting ID: ${apt.zoomMeeting.meetingId}`);
      }
    });
    
    if (appointments.length === 0) {
      console.log('❌ No appointments found to test deletion');
      return;
    }
    
    // Find a telehealth appointment with Zoom meeting
    const telehealthAppointment = appointments.find(apt => 
      apt.location === 'telehealth' && apt.zoomMeeting && apt.zoomMeeting.meetingId
    );
    
    if (telehealthAppointment) {
      console.log(`\n🎯 Testing deletion of telehealth appointment: ${telehealthAppointment._id}`);
      console.log(`   Zoom Meeting ID: ${telehealthAppointment.zoomMeeting.meetingId}`);
      
      // Test deletion
      const deleteResponse = await axios.delete(`${API_URL}/appointments/${telehealthAppointment._id}`);
      
      console.log('✅ Appointment deleted successfully!');
      console.log('Response:', deleteResponse.data);
      
    } else {
      console.log('\n⚠️  No telehealth appointments with Zoom meetings found');
      
      // Test with any appointment
      const testAppointment = appointments[0];
      console.log(`🎯 Testing deletion of appointment: ${testAppointment._id}`);
      
      const deleteResponse = await axios.delete(`${API_URL}/appointments/${testAppointment._id}`);
      
      console.log('✅ Appointment deleted successfully!');
      console.log('Response:', deleteResponse.data);
    }
    
  } catch (error) {
    console.log('\n❌ Test failed!');
    console.log('Error:', error.response?.data?.message || error.message);
    
    if (error.response) {
      console.log('Status code:', error.response.status);
      console.log('Response data:', error.response.data);
    }
  }
}

// Run the test
testAppointmentDeletion();

















