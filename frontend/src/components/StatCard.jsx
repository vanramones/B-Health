import React from 'react';
import { Card } from 'react-bootstrap';
import { TrendingUp } from 'lucide-react';

const iconBgMap = {
  'bg-blue-50': '#eff6ff',
  'bg-orange-50': '#fff7ed',
  'bg-green-50': '#eff6ff',
  'bg-purple-50': '#faf5ff',
};

const trendColorMap = {
  'text-blue-500': '#3b82f6',
  'text-red-500': '#ef4444',
  'text-green-500': '#22c55e',
};

const StatCard = ({ icon, title, value, iconBg, trend, trendColor }) => {
  return (
    <Card className="border rounded-4 h-100" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <Card.Body className="p-4">
        <div
          className="d-flex align-items-center justify-content-center rounded-3 mb-3"
          style={{ width: 42, height: 42, backgroundColor: iconBgMap[iconBg] || '#f3f4f6' }}
        >
          {icon}
        </div>
        <div className="fw-bold" style={{ fontSize: 32, color: '#111827', lineHeight: 1, letterSpacing: '-0.02em' }}>
          {value}
        </div>
        <div className="mt-1" style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>{title}</div>
        {trend && (
          <div className="d-flex align-items-center gap-1 mt-2" style={{ color: trendColorMap[trendColor] || '#9ca3af' }}>
            <TrendingUp size={12} />
            <span style={{ fontSize: 11, fontWeight: 600 }}>{trend}</span>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default StatCard;
