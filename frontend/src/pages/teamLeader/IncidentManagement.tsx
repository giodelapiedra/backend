import React from 'react';
import LayoutWithSidebar from '../../components/LayoutWithSidebar';
import IncidentManagement from '../../components/IncidentManagement';
import { useAuth } from '../../contexts/AuthContext.supabase';

const IncidentManagementPage: React.FC = () => {
  const { user } = useAuth();

  // Debug logging
  console.log('🔍 IncidentManagementPage - User data:', user);
  console.log('🔍 IncidentManagementPage - Team Leader ID:', user?.id);
  console.log('🔍 IncidentManagementPage - Team:', user?.team);

  // Get team - use user's team or fallback to 'default' if not set
  const teamName = user?.team || 'default';

  return (
    <LayoutWithSidebar>
      <IncidentManagement 
        teamLeaderId={user?.id || ''} 
        team={teamName} 
      />
    </LayoutWithSidebar>
  );
};

export default IncidentManagementPage;
