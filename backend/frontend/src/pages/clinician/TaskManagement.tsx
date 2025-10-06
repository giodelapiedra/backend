import React from 'react';
import LayoutWithSidebar from '../../components/LayoutWithSidebar';
import TaskManagementBoard from '../../components/TaskManagementBoard';

const TaskManagement: React.FC = () => {
  return (
    <LayoutWithSidebar>
      <TaskManagementBoard />
    </LayoutWithSidebar>
  );
};

export default TaskManagement;

