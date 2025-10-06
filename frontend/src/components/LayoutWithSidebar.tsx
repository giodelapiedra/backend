import React from 'react';
import { SidebarProvider } from '../contexts/SidebarContext';
import Layout from './Layout';

interface LayoutWithSidebarProps {
  children: React.ReactNode;
}

const LayoutWithSidebar: React.FC<LayoutWithSidebarProps> = ({ children }) => {
  return (
    <SidebarProvider>
      <Layout>
        {children}
      </Layout>
    </SidebarProvider>
  );
};

export default LayoutWithSidebar;

