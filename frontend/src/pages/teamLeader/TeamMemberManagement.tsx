import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import Toast from '../../components/Toast';
import LayoutWithSidebar from '../../components/LayoutWithSidebar';

interface TeamMember {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  username?: string;
  role: string;
  team: string;
  phone?: string;
  isActive: boolean;
  lastLogin?: string;
  profilePicture?: string;
  addedDate?: string;
}

const TeamMemberManagement: React.FC = () => {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/team-leader/team-members');
      setTeamMembers(response.data.teamMembers || []);
    } catch (err: any) {
      setToast({ message: 'Failed to fetch team members', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMember = (memberId: string) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleSelectAll = () => {
    if (selectedMembers.length === teamMembers.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(teamMembers.map(member => member._id));
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await api.delete(`/team-leader/team-members/${memberId}`);
      setToast({ message: 'Team member removed successfully', type: 'success' });
      fetchTeamMembers();
    } catch (err: any) {
      setToast({ message: 'Failed to remove team member', type: 'error' });
    }
  };

  const handleSendInvite = async (memberId: string) => {
    try {
      await api.post(`/team-leader/send-invite/${memberId}`);
      setToast({ message: 'Invitation sent successfully', type: 'success' });
      fetchTeamMembers();
    } catch (err: any) {
      setToast({ message: 'Failed to send invitation', type: 'error' });
    }
  };

  const getStatusInfo = (member: TeamMember) => {
    if (!member.isActive) {
      return {
        text: 'Removed 2 days ago',
        color: '#f59e0b',
        bgColor: 'rgba(245, 158, 11, 0.1)',
        dotColor: '#f59e0b'
      };
    }
    
    const addedDate = member.addedDate ? new Date(member.addedDate) : new Date();
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - addedDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let timeText = '';
    if (diffDays >= 365) {
      const years = Math.floor(diffDays / 365);
      timeText = `Added ${years} year${years > 1 ? 's' : ''} ago`;
    } else if (diffDays >= 30) {
      const months = Math.floor(diffDays / 30);
      timeText = `Added ${months} month${months > 1 ? 's' : ''} ago`;
    } else {
      timeText = `Added ${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }

    return {
      text: timeText,
      color: '#10b981',
      bgColor: 'rgba(16, 185, 129, 0.1)',
      dotColor: '#10b981'
    };
  };

  const generateAvatar = (firstName: string, lastName: string) => {
    const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    const colors = [
      '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
      '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
    ];
    const colorIndex = (firstName.charCodeAt(0) + lastName.charCodeAt(0)) % colors.length;
    
    return {
      initials,
      backgroundColor: colors[colorIndex]
    };
  };

  const handleCloseToast = () => {
    setToast(null);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <LayoutWithSidebar>
      <div style={{ 
        width: '100%',
        padding: '2rem',
        background: '#f8fafc',
        minHeight: '100vh',
        position: 'relative'
      }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: 'bold', 
            color: '#1a202c', 
            marginBottom: '0.5rem',
            textShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            Team Member Management
          </h1>
          <p style={{ 
            color: '#4a5568', 
            marginBottom: '0.25rem',
            textShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}>
            Manage your team members, view their status, and control access
          </p>
        </div>

        {/* Team Members List */}
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          borderRadius: '1rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{ 
            padding: '1.5rem', 
            borderBottom: '1px solid rgba(229, 231, 235, 0.5)',
            backgroundColor: 'rgba(249, 250, 251, 0.8)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ 
                fontSize: '1.25rem', 
                fontWeight: '600', 
                color: '#1f2937',
                margin: '0'
              }}>
                Team Members ({teamMembers.length})
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selectedMembers.length === teamMembers.length && teamMembers.length > 0}
                    onChange={handleSelectAll}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: '500' }}>
                    Select All
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Members List */}
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {teamMembers.length > 0 ? (
              teamMembers.map((member, index) => {
                const statusInfo = getStatusInfo(member);
                const avatar = generateAvatar(member.firstName, member.lastName);
                
                return (
                  <div
                    key={member._id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '1.5rem',
                      borderBottom: index < teamMembers.length - 1 ? '1px solid rgba(229, 231, 235, 0.3)' : 'none',
                      backgroundColor: index % 2 === 0 ? 'rgba(255, 255, 255, 0.5)' : 'rgba(249, 250, 251, 0.3)',
                      transition: 'background-color 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(249, 250, 251, 0.8)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'rgba(255, 255, 255, 0.5)' : 'rgba(249, 250, 251, 0.3)';
                    }}
                  >
                    {/* Checkbox */}
                    <div style={{ marginRight: '1rem' }}>
                      <input
                        type="checkbox"
                        checked={selectedMembers.includes(member._id)}
                        onChange={() => handleSelectMember(member._id)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                    </div>

                    {/* Profile Picture/Avatar */}
                    <div style={{ marginRight: '1rem' }}>
                      {member.profilePicture ? (
                        <img
                          src={member.profilePicture}
                          alt={`${member.firstName} ${member.lastName}`}
                          style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '2px solid rgba(255, 255, 255, 0.8)',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            backgroundColor: avatar.backgroundColor,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '1.125rem',
                            fontWeight: '600',
                            border: '2px solid rgba(255, 255, 255, 0.8)',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                          }}
                        >
                          {avatar.initials}
                        </div>
                      )}
                    </div>

                    {/* Name and Username */}
                    <div style={{ flex: 1, marginRight: '1rem' }}>
                      <div style={{ 
                        fontSize: '1rem', 
                        fontWeight: '600', 
                        color: '#1f2937',
                        marginBottom: '0.25rem'
                      }}>
                        {member.firstName} {member.lastName}
                      </div>
                      <div style={{ 
                        fontSize: '0.875rem', 
                        color: '#6b7280',
                        fontWeight: '500'
                      }}>
                        @{member.username || member.firstName.toLowerCase()}
                      </div>
                    </div>

                    {/* Status Tag */}
                    <div style={{ marginRight: '1rem' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        backgroundColor: statusInfo.bgColor,
                        color: statusInfo.color,
                        padding: '0.5rem 0.75rem',
                        borderRadius: '0.75rem',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        border: `1px solid ${statusInfo.color}20`
                      }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: statusInfo.dotColor
                        }}></div>
                        {statusInfo.text}
                      </div>
                    </div>

                    {/* Email */}
                    <div style={{ 
                      flex: 1, 
                      marginRight: '1rem',
                      fontSize: '0.875rem',
                      color: '#6b7280',
                      fontWeight: '500'
                    }}>
                      {member.email}
                    </div>

                    {/* Action Button */}
                    <div>
                      {member.isActive ? (
                        <button
                          onClick={() => handleRemoveMember(member._id)}
                          style={{
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            padding: '0.5rem 1rem',
                            borderRadius: '0.5rem',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                          }}
                        >
                          Remove
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSendInvite(member._id)}
                          style={{
                            backgroundColor: 'rgba(107, 114, 128, 0.1)',
                            color: '#6b7280',
                            border: '1px solid rgba(107, 114, 128, 0.2)',
                            padding: '0.5rem 1rem',
                            borderRadius: '0.5rem',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(107, 114, 128, 0.2)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(107, 114, 128, 0.1)';
                          }}
                        >
                          Send Invite
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ 
                padding: '3rem', 
                textAlign: 'center', 
                color: '#6b7280',
                fontSize: '1rem',
                fontWeight: '500'
              }}>
                No team members found
              </div>
            )}
          </div>
        </div>

        {toast && (
          <Toast
            open={true}
            message={toast.message}
            type={toast.type}
            onClose={handleCloseToast}
          />
        )}
      </div>
    </LayoutWithSidebar>
  );
};

export default TeamMemberManagement;
