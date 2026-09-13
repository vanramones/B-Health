import React from 'react';
import { Card } from 'react-bootstrap';

const iconBgMap = {
  'bg-green-100': '#dbeafe', 'bg-blue-100': '#dbeafe', 'bg-amber-100': '#fef3c7',
  'bg-pink-100': '#fce7f3', 'bg-indigo-100': '#e0e7ff', 'bg-cyan-100': '#cffafe',
  'bg-red-100': '#fee2e2', 'bg-orange-100': '#ffedd5', 'bg-yellow-100': '#fef9c3',
};
const iconColorMap = {
  'text-green-600': '#16a34a', 'text-blue-600': '#2563eb', 'text-amber-600': '#d97706',
  'text-pink-600': '#db2777', 'text-indigo-600': '#4f46e5', 'text-cyan-600': '#0891b2',
  'text-red-600': '#dc2626', 'text-orange-600': '#ea580c', 'text-yellow-600': '#ca8a04',
};

const QuickActionCard = ({ icon, title, iconBg, iconColor }) => {
  return (
    <Card
      className="border text-center h-100"
      style={{ cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderRadius: 14, transition: 'all 0.2s' }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; }}
    >
      <Card.Body className="d-flex flex-column align-items-center justify-content-center py-4 px-3">
        <div
          className="d-flex align-items-center justify-content-center rounded-3 mb-2"
          style={{ width: 44, height: 44, backgroundColor: iconBgMap[iconBg] || '#f3f4f6', color: iconColorMap[iconColor] || '#4b5563' }}
        >
          {icon}
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#4b5563', lineHeight: 1.3 }}>{title}</span>
      </Card.Body>
    </Card>
  );
};

export default QuickActionCard;
