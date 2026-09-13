import React from 'react';

const iconBgMap = {
  'bg-green-100 text-green-600': { bg: '#dbeafe', color: '#16a34a' },
  'bg-blue-100 text-blue-600': { bg: '#dbeafe', color: '#2563eb' },
  'bg-yellow-100 text-yellow-600': { bg: '#fef9c3', color: '#ca8a04' },
  'bg-gray-100 text-gray-600': { bg: '#f3f4f6', color: '#4b5563' },
  'bg-pink-100 text-pink-600': { bg: '#fce7f3', color: '#db2777' },
};

const ActivityItem = ({ icon, title, subtitle, time, iconBg }) => {
  const colors = iconBgMap[iconBg] || { bg: '#f3f4f6', color: '#4b5563' };
  return (
    <div className="d-flex align-items-start gap-3 py-3 border-bottom" style={{ borderColor: '#f3f4f6 !important' }}>
      <div
        className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
        style={{ width: 34, height: 34, backgroundColor: colors.bg, color: colors.color }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="fw-bold text-truncate" style={{ fontSize: 13, color: '#111827' }}>{title}</div>
        {subtitle && <div className="text-truncate" style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{subtitle}</div>}
        <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 3 }}>{time}</div>
      </div>
    </div>
  );
};

export default ActivityItem;
