import React from 'react';
import { Card } from 'react-bootstrap';
import { TrendingUp } from 'lucide-react';

const iconBgMap = {
  'bg-blue-50': { bg: '#eff6ff', gradient: 'linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)' },
  'bg-orange-50': { bg: '#fff7ed', gradient: 'linear-gradient(135deg, #ffedd5 0%, #fff7ed 100%)' },
  'bg-green-50': { bg: '#f0fdf4', gradient: 'linear-gradient(135deg, #dcfce7 0%, #f0fdf4 100%)' },
  'bg-purple-50': { bg: '#faf5ff', gradient: 'linear-gradient(135deg, #f3e8ff 0%, #faf5ff 100%)' },
  'bg-cyan-50': { bg: '#ecfeff', gradient: 'linear-gradient(135deg, #cffafe 0%, #ecfeff 100%)' },
};

const trendColorMap = {
  'text-blue-500': '#3b82f6',
  'text-red-500': '#ef4444',
  'text-green-500': '#22c55e',
  'text-cyan-500': '#06b6d4',
  'text-orange-500': '#f97316',
  'text-purple-500': '#a855f7',
};

const StatCard = ({ icon, title, value, iconBg, trend, trendColor }) => {
  const theme = iconBgMap[iconBg] || iconBgMap['bg-blue-50'];
  return (
    <Card className="border-0 rounded-4 h-100" style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.08)', transition: 'transform 0.2s ease, box-shadow 0.2s ease' }}>
      <Card.Body className="p-4">
        <div
          className="d-flex align-items-center justify-content-center rounded-3 mb-3"
          style={{ width: 50, height: 50, background: theme.gradient, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        >
          {icon}
        </div>
        <div className="fw-bold" style={{ fontSize: 34, color: '#0f172a', lineHeight: 1, letterSpacing: '-0.02em' }}>
          {value}
        </div>
        <div className="mt-2" style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{title}</div>
        {trend && (
          <div className="d-flex align-items-center gap-1 mt-2" style={{ color: trendColorMap[trendColor] || '#9ca3af' }}>
            <TrendingUp size={13} />
            <span style={{ fontSize: 12, fontWeight: 600 }}>{trend}</span>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default StatCard;
