import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = ({ children, title }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen((v) => !v);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="d-flex vh-100" style={{ backgroundColor: '#f0fdfa' }}>
      {/* Overlay for mobile */}
      <div
        className={`bh-sidebar-overlay ${sidebarOpen ? 'show' : ''}`}
        onClick={closeSidebar}
      />
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <div className="d-flex flex-column flex-grow-1" style={{ overflow: 'hidden' }}>
        <Header title={title} onMenuClick={toggleSidebar} />
        <main className="flex-grow-1" style={{ overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
