const axios = require('axios');

class ZoomService {
  constructor() {
    // Fallback credentials for development only - should be replaced with env vars in production
    this.accountId = process.env.ZOOM_ACCOUNT_ID || 'Vs4M5C2RTqCGhFTSbYi4zQ';
    this.clientId = process.env.ZOOM_CLIENT_ID || 'E46Tv0TTSreuxqpLKGK_2A';
    this.clientSecret = process.env.ZOOM_CLIENT_SECRET || '76pQzlr6Hcw96HPoW9xHpULHxyQBgnzd';
    this.baseUrl = 'https://api.zoom.us/v2';
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  // Get OAuth access token
  async getAccessToken() {
    try {
      // Check if we have a valid token
      if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
        return this.accessToken;
      }

      const response = await axios.post('https://zoom.us/oauth/token', null, {
        params: {
          grant_type: 'account_credentials',
          account_id: this.accountId
        },
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in * 1000));
      
      return this.accessToken;
    } catch (error) {
      console.error('Error getting Zoom access token:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with Zoom API');
    }
  }

  // Create a Zoom meeting
  async createMeeting(meetingData) {
    try {
      const token = await this.getAccessToken();
      
      const meetingPayload = {
        topic: meetingData.topic || 'Occupational Rehabilitation Appointment',
        type: 2, // Scheduled meeting
        start_time: meetingData.startTime, // ISO 8601 format
        duration: meetingData.duration || 60, // minutes
        timezone: 'UTC',
        agenda: meetingData.agenda || 'Occupational rehabilitation appointment',
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: false,
          mute_upon_entry: true,
          watermark: false,
          use_pmi: false,
          approval_type: 0, // Automatically approve
          audio: 'both',
          auto_recording: 'none',
          enforce_login: false,
          enforce_login_domains: '',
          alternative_hosts: '',
          close_registration: false,
          show_share_button: true,
          allow_multiple_devices: true,
          registrants_confirmation_email: true,
          waiting_room: false,
          request_permission_to_unmute_participants: false,
          registrants_email_notification: true
        }
      };

      const response = await axios.post(`${this.baseUrl}/users/me/meetings`, meetingPayload, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        meeting: {
          id: response.data.id,
          topic: response.data.topic,
          startTime: response.data.start_time,
          duration: response.data.duration,
          joinUrl: response.data.join_url,
          password: response.data.password,
          meetingId: response.data.id,
          hostId: response.data.host_id,
          createdAt: response.data.created_at
        }
      };
    } catch (error) {
      console.error('Error creating Zoom meeting:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to create Zoom meeting'
      };
    }
  }

  // Get meeting details
  async getMeeting(meetingId) {
    try {
      const token = await this.getAccessToken();
      
      const response = await axios.get(`${this.baseUrl}/meetings/${meetingId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      return {
        success: true,
        meeting: {
          id: response.data.id,
          topic: response.data.topic,
          startTime: response.data.start_time,
          duration: response.data.duration,
          joinUrl: response.data.join_url,
          password: response.data.password,
          meetingId: response.data.id,
          hostId: response.data.host_id,
          status: response.data.status
        }
      };
    } catch (error) {
      console.error('Error getting Zoom meeting:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get Zoom meeting'
      };
    }
  }

  // Update meeting
  async updateMeeting(meetingId, updateData) {
    try {
      const token = await this.getAccessToken();
      
      const response = await axios.patch(`${this.baseUrl}/meetings/${meetingId}`, updateData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        meeting: response.data
      };
    } catch (error) {
      console.error('Error updating Zoom meeting:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update Zoom meeting'
      };
    }
  }

  // Delete meeting
  async deleteMeeting(meetingId) {
    try {
      const token = await this.getAccessToken();
      
      await axios.delete(`${this.baseUrl}/meetings/${meetingId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      return {
        success: true
      };
    } catch (error) {
      console.error('Error deleting Zoom meeting:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to delete Zoom meeting'
      };
    }
  }

  // Get meeting participants
  async getMeetingParticipants(meetingId) {
    try {
      const token = await this.getAccessToken();
      
      const response = await axios.get(`${this.baseUrl}/meetings/${meetingId}/registrants`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      return {
        success: true,
        participants: response.data.registrants || []
      };
    } catch (error) {
      console.error('Error getting meeting participants:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get meeting participants'
      };
    }
  }
}

module.exports = new ZoomService();
