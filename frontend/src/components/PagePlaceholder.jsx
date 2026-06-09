import React from 'react';
import { Card } from 'react-bootstrap';

const PagePlaceholder = ({ icon, title, description, accent = '#16a34a' }) => {
  return (
    <div className="p-4" style={{ backgroundColor: '#f8fafc' }}>
      <Card className="border rounded-4 bh-fade-up" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <Card.Body className="p-5 text-center">
          <div
            className="d-inline-flex align-items-center justify-content-center rounded-4 mb-3"
            style={{ width: 64, height: 64, backgroundColor: `${accent}1a`, color: accent }}
          >
            {icon}
          </div>
          <h5 className="fw-bold mb-2" style={{ color: '#111827', letterSpacing: '-0.01em' }}>{title}</h5>
          <p className="mb-0" style={{ fontSize: 13, color: '#6b7280', maxWidth: 480, margin: '0 auto' }}>
            {description}
          </p>
        </Card.Body>
      </Card>
    </div>
  );
};

export default PagePlaceholder;
