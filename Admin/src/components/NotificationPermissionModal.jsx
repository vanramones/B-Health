import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { Bell, BellOff, Check, X } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import vaccinationReminderService from '../services/vaccinationReminderService';

const PERMISSION_ASKED_KEY = 'bh_notification_permission_asked';

const NotificationPermissionModal = () => {
  const [show, setShow] = useState(false);
  const [permission, setPermission] = useState('default');

  useEffect(() => {
    // Check if we should show the permission request (native-aware)
    const checkPermission = () => {
      const isNative = Capacitor.isNativePlatform();

      // On the web, bail out if Notifications API is unavailable.
      if (!isNative && !('Notification' in window)) {
        return;
      }

      const currentPermission = isNative
        ? vaccinationReminderService.getPermissionStatus()
        : Notification.permission;
      setPermission(currentPermission);

      // Don't prompt again if already granted.
      if (currentPermission === 'granted') return;

      // Respect previous choice timing.
      const hasAsked = localStorage.getItem(PERMISSION_ASKED_KEY);
      const now = Date.now();
      const lastAsked = hasAsked ? parseInt(hasAsked) : 0;
      const daysSinceAsked = (now - lastAsked) / (1000 * 60 * 60 * 24);

      // On native, the OS handles the actual permission dialog, so we always
      // want to surface our explainer modal (unless asked recently / granted).
      const shouldShow = isNative
        ? (currentPermission !== 'granted' && (!hasAsked || daysSinceAsked > 1))
        : (currentPermission === 'default' && (!hasAsked || daysSinceAsked > 7));

      if (shouldShow) {
        setTimeout(() => setShow(true), 2000);
      }
    };

    checkPermission();
  }, []);

  const handleAllow = async () => {
    // Use ensurePermission which triggers the NATIVE Android dialog on mobile
    const result = await vaccinationReminderService.ensurePermission();
    setPermission(result);
    localStorage.setItem(PERMISSION_ASKED_KEY, Date.now().toString());

    if (result === 'granted') {
      // Re-sync schedule now that we have permission, then show success
      vaccinationReminderService.syncScheduledNotifications();
      setTimeout(() => setShow(false), 1500);
    } else {
      setShow(false);
    }
  };

  const handleDeny = () => {
    localStorage.setItem(PERMISSION_ASKED_KEY, Date.now().toString());
    setShow(false);
  };

  const handleRemindLater = () => {
    // Set a shorter reminder period (1 day)
    const oneDayAgo = Date.now() - (6 * 24 * 60 * 60 * 1000); // 6 days ago = remind tomorrow
    localStorage.setItem(PERMISSION_ASKED_KEY, oneDayAgo.toString());
    setShow(false);
  };

  if (!show) return null;

  return (
    <Modal 
      show={show} 
      onHide={handleDeny}
      centered
      backdrop="static"
      keyboard={false}
    >
      <Modal.Body className="p-4">
        {permission === 'granted' ? (
          // Success state
          <div className="text-center py-3">
            <div 
              className="d-flex align-items-center justify-content-center rounded-circle mx-auto mb-3"
              style={{ 
                width: 64, 
                height: 64, 
                background: 'linear-gradient(135deg, #16a34a, #15803d)',
                boxShadow: '0 4px 20px rgba(22,163,74,0.3)'
              }}
            >
              <Check size={32} color="#fff" strokeWidth={2.5} />
            </div>
            <h5 className="fw-bold mb-2" style={{ color: '#111827' }}>
              Notifications Enabled!
            </h5>
            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 0 }}>
              You'll receive vaccination reminders automatically.
            </p>
          </div>
        ) : (
          // Request state
          <>
            <div className="text-center mb-4">
              <div 
                className="d-flex align-items-center justify-content-center rounded-circle mx-auto mb-3"
                style={{ 
                  width: 64, 
                  height: 64, 
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  boxShadow: '0 4px 20px rgba(29,78,216,0.3)'
                }}
              >
                <Bell size={28} color="#fff" strokeWidth={2} />
              </div>
              <h5 className="fw-bold mb-2" style={{ color: '#111827' }}>
                Enable Vaccination Reminders?
              </h5>
              <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6, marginBottom: 0 }}>
                Get automatic notifications for your upcoming vaccinations. 
                We'll remind you 7 days, 3 days, 1 day before, and on the day of your scheduled vaccination.
              </p>
            </div>

            {/* Benefits */}
            <div className="mb-4">
              <div className="d-flex align-items-start gap-3 mb-2">
                <div 
                  className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                  style={{ width: 24, height: 24, backgroundColor: '#dbeafe' }}
                >
                  <Check size={14} color="#1d4ed8" strokeWidth={2.5} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                    Never miss a vaccination
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>
                    Timely reminders keep you on schedule
                  </div>
                </div>
              </div>
              <div className="d-flex align-items-start gap-3 mb-2">
                <div 
                  className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                  style={{ width: 24, height: 24, backgroundColor: '#dbeafe' }}
                >
                  <Check size={14} color="#1d4ed8" strokeWidth={2.5} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                    Phone & desktop alerts
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>
                    Notifications on all your devices
                  </div>
                </div>
              </div>
              <div className="d-flex align-items-start gap-3">
                <div 
                  className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                  style={{ width: 24, height: 24, backgroundColor: '#dbeafe' }}
                >
                  <Check size={14} color="#1d4ed8" strokeWidth={2.5} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                    No spam, just health
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>
                    Only vaccination-related reminders
                  </div>
                </div>
              </div>
            </div>

            {/* Privacy note */}
            <div 
              className="p-3 rounded-3 mb-4"
              style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}
            >
              <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.5 }}>
                🔒 <strong>Your privacy matters:</strong> We only send vaccination reminders. 
                You can disable notifications anytime in your browser settings.
              </div>
            </div>

            {/* Action buttons */}
            <div className="d-flex flex-column gap-2">
              <Button
                className="w-100 d-flex align-items-center justify-content-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  border: 'none',
                  padding: '12px',
                  fontSize: 14,
                  fontWeight: 600,
                  borderRadius: 10,
                  boxShadow: '0 4px 12px rgba(29,78,216,0.3)'
                }}
                onClick={handleAllow}
              >
                <Bell size={16} />
                Enable Notifications
              </Button>
              
              <div className="d-flex gap-2">
                <Button
                  variant="light"
                  className="flex-1 border"
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    padding: '10px',
                    borderRadius: 10
                  }}
                  onClick={handleRemindLater}
                >
                  Remind Me Later
                </Button>
                <Button
                  variant="light"
                  className="flex-1 border"
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    padding: '10px',
                    borderRadius: 10,
                    color: '#6b7280'
                  }}
                  onClick={handleDeny}
                >
                  <X size={14} className="me-1" />
                  Not Now
                </Button>
              </div>
            </div>
          </>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default NotificationPermissionModal;
