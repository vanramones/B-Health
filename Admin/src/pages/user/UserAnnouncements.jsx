import React, { useState, useEffect } from 'react';
import { Card, Badge, Form, Row, Col, Modal } from 'react-bootstrap';
import {
  Megaphone, Calendar, AlertTriangle, Info, CheckCircle,
  Heart, Syringe, Users, Search, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { userApi } from '../../context/UserAuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { socket } from '../../config/socket';

const typeConfig = {
  'Program': { icon: <Heart size={16} />, bg: '#dbeafe', color: '#1e40af' },
  'Vaccination': { icon: <Syringe size={16} />, bg: '#dbeafe', color: '#1d4ed8' },
  'Health Alert': { icon: <AlertTriangle size={16} />, bg: '#fee2e2', color: '#991b1b' },
  'Announcement': { icon: <Megaphone size={16} />, bg: '#fef3c7', color: '#92400e' },
};

const getPriorityConfig = (t) => ({
  urgent: { bg: '#fee2e2', color: '#991b1b', label: t('urgent') },
  important: { bg: '#fef3c7', color: '#92400e', label: t('important') },
  normal: { bg: '#f3f4f6', color: '#374151', label: t('info') },
});

const UserAnnouncements = () => {
  const { t } = useLanguage();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState('');
  const [filter, setFilter]               = useState('all');
  const [currentDate, setCurrentDate]     = useState(new Date());
  const [selectedDate, setSelectedDate]   = useState(null);
  const [viewItem, setViewItem]           = useState(null);

  const loadAnnouncements = async () => {
    try {
      const data = await userApi.get('/user/announcements');
      const list = (Array.isArray(data) ? data : [])
        .map((a) => ({
          id:       a.id,
          title:    a.title,
          content:  a.body || '',
          type:     a.category || 'Announcement',
          priority: a.pinned ? 'important' : 'normal',
          date:     (a.event_date || a.publish_date || a.created_at)?.slice(0, 10),
          isNew:    new Date() - new Date(a.created_at) < 3 * 24 * 60 * 60 * 1000,
          image:    a.image_url || '',
        }));
      setAnnouncements(list);
    } catch { setAnnouncements([]); }
    setLoading(false);
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  useEffect(() => {
    socket.on('announcement-created', (data) => {
      console.log('[Socket] New announcement:', data);
      loadAnnouncements();
    });

    socket.on('announcement-updated', (data) => {
      console.log('[Socket] Announcement updated:', data);
      loadAnnouncements();
    });

    socket.on('announcement-deleted', (data) => {
      console.log('[Socket] Announcement deleted:', data);
      loadAnnouncements();
    });

    return () => {
      socket.off('announcement-created');
      socket.off('announcement-updated');
      socket.off('announcement-deleted');
    };
  }, []);

  const filteredAnnouncements = announcements.filter((a) => {
    const matchesSearch =
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.content.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || a.type === filter;
    return matchesSearch && matchesFilter;
  });

  const types = ['all', 'Program', 'Vaccination', 'Health Alert', 'Announcement'];

  // Calendar helpers
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedDate(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedDate(null);
  };

  const getEventsForDate = (day) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return announcements.filter((a) => a.date === dateStr);
  };

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Day headers
    const headers = dayNames.map((d) => (
      <div
        key={d}
        className="text-center fw-semibold"
        style={{ fontSize: 11, color: '#6b7280', padding: '8px 0' }}
      >
        {d}
      </div>
    ));

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} />);
    }

    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const events = getEventsForDate(day);
      const hasEvents = events.length > 0;
      const isSelected = selectedDate === day;
      const today = new Date();
      const isToday = day === today.getDate() && currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();

      days.push(
        <div
          key={day}
          onClick={() => setSelectedDate(day)}
          className="d-flex flex-column align-items-center justify-content-center position-relative"
          style={{
            aspectRatio: '1',
            cursor: 'pointer',
            borderRadius: 8,
            backgroundColor: isSelected ? '#1d4ed8' : hasEvents ? '#eff6ff' : 'transparent',
            border: isToday ? '2px solid #2563eb' : 'none',
            transition: 'all 0.2s',
          }}
        >
          <span
            style={{
              fontSize: 14,
              fontWeight: isSelected || hasEvents ? 600 : 400,
              color: isSelected ? '#fff' : hasEvents ? '#1d4ed8' : '#374151',
            }}
          >
            {day}
          </span>
          {hasEvents && !isSelected && (
            <div className="d-flex gap-1 mt-1">
              {events.slice(0, 3).map((e, i) => {
                const tc = typeConfig[e.type];
                return (
                  <span
                    key={i}
                    className="rounded-circle"
                    style={{ width: 6, height: 6, backgroundColor: tc?.color || '#1d4ed8' }}
                  />
                );
              })}
            </div>
          )}
          {hasEvents && isSelected && (
            <span style={{ fontSize: 10, color: '#fff' }}>{events.length}</span>
          )}
        </div>
      );
    }

    return { headers, days };
  };

  const { headers, days } = renderCalendar();

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <h4 className="fw-bold mb-1" style={{ color: '#111827' }}>{t('announcementsEvents')}</h4>
        <p className="mb-0" style={{ fontSize: 13, color: '#6b7280' }}>
          {t('viewUpcomingEvents')}
        </p>
      </div>

      <Row className="g-4">
        {/* Calendar */}
        <Col xs={12} lg={5}>
          <Card className="border-0 rounded-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <Card.Body className="p-3">
              {/* Month Navigation */}
              <div className="d-flex align-items-center justify-content-between mb-3">
                <button
                  onClick={prevMonth}
                  className="btn btn-light border-0 p-2"
                  style={{ borderRadius: 8 }}
                >
                  <ChevronLeft size={18} color="#374151" />
                </button>
                <h6 className="fw-bold mb-0" style={{ fontSize: 15, color: '#111827' }}>
                  {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h6>
                <button
                  onClick={nextMonth}
                  className="btn btn-light border-0 p-2"
                  style={{ borderRadius: 8 }}
                >
                  <ChevronRight size={18} color="#374151" />
                </button>
              </div>

              {/* Calendar Grid */}
              <div
                className="d-grid"
                style={{ gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}
              >
                {headers}
                {days}
              </div>

              {/* Legend */}
              <div className="d-flex flex-wrap gap-3 mt-3 pt-3" style={{ borderTop: '1px solid #e5e7eb' }}>
                {Object.entries(typeConfig).map(([type, config]) => (
                  <div key={type} className="d-flex align-items-center gap-1">
                    <span
                      className="rounded-circle"
                      style={{ width: 8, height: 8, backgroundColor: config.color }}
                    />
                    <span style={{ fontSize: 11, color: '#6b7280' }}>{type}</span>
                  </div>
                ))}
              </div>
            </Card.Body>
          </Card>

          {/* Selected Date Events */}
          {selectedDate && selectedDateEvents.length > 0 && (
            <Card className="border-0 rounded-4 mt-3" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <Card.Body className="p-3">
                <h6 className="fw-bold mb-3" style={{ fontSize: 14, color: '#111827' }}>
                  <Calendar size={16} className="me-2" style={{ color: '#1d4ed8' }} />
                  {new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </h6>
                {selectedDateEvents.length === 0 ? (
                  <div className="text-center py-3" style={{ color: '#9ca3af', fontSize: 13 }}>
                    No events on this date
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-2">
                    {selectedDateEvents.map((event) => {
                      const tc = typeConfig[event.type] || typeConfig.Announcement;
                      return (
                        <div
                          key={event.id}
                          className="p-3 rounded-3"
                          style={{ backgroundColor: tc.bg, cursor: 'pointer', border: `1px solid ${tc.color}22` }}
                          onClick={() => setViewItem(event)}
                        >
                          <div className="d-flex align-items-center justify-content-between mb-1">
                            <div className="d-flex align-items-center gap-2">
                              <span style={{ color: tc.color }}>{tc.icon}</span>
                              <Badge style={{ backgroundColor: tc.color, color: '#fff', fontSize: 10 }}>
                                {event.type}
                              </Badge>
                            </div>
                            <span style={{ fontSize: 10, color: tc.color, fontWeight: 600 }}>Tap to view →</span>
                          </div>
                          <div className="fw-semibold" style={{ fontSize: 13, color: '#111827' }}>
                            {event.title}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card.Body>
            </Card>
          )}
        </Col>

        {/* Announcements List */}
        <Col xs={12} lg={7}>
          {/* Search & Filter */}
          <Card className="border-0 rounded-4 mb-3" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <Card.Body className="p-3">
              <div className="position-relative mb-3">
                <Search
                  size={18}
                  color="#9ca3af"
                  style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
                />
                <Form.Control
                  placeholder={t('searchAnnouncements') + '...'}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ paddingLeft: 40, fontSize: 14, borderColor: '#e5e7eb' }}
                />
              </div>
              <div className="d-flex gap-2 flex-wrap">
                {types.map((type) => {
                  const tc = typeConfig[type];
                  return (
                    <button
                      key={type}
                      onClick={() => setFilter(type)}
                      className="border-0 rounded-3 px-3 py-2"
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        backgroundColor: filter === type ? (tc?.bg || '#dbeafe') : '#f3f4f6',
                        color: filter === type ? (tc?.color || '#1d4ed8') : '#6b7280',
                        cursor: 'pointer',
                      }}
                    >
                      {type === 'all' ? t('all') : type}
                    </button>
                  );
                })}
              </div>
            </Card.Body>
          </Card>

          {/* Announcements List */}
          {loading ? (
            <Card className="border-0 rounded-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <Card.Body className="p-5 text-center" style={{ color: '#9ca3af' }}>
                <div style={{ fontSize: 14 }}>{t('loading')}</div>
              </Card.Body>
            </Card>
          ) : filteredAnnouncements.length === 0 ? (
            <Card className="border-0 rounded-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <Card.Body className="p-5 text-center" style={{ color: '#9ca3af' }}>
                <Megaphone size={40} className="mb-3" />
                <div style={{ fontSize: 14 }}>{t('noAnnouncements')}</div>
              </Card.Body>
            </Card>
          ) : (
            <div className="d-flex flex-column gap-3">
              {filteredAnnouncements.map((announcement) => {
                const tc = typeConfig[announcement.type] || typeConfig.Announcement;
                const pc = getPriorityConfig(t)[announcement.priority];
                return (
                  <Card
                    key={announcement.id}
                    className="border-0 rounded-4"
                    style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)', cursor: 'pointer' }}
                    onClick={() => setViewItem(announcement)}
                  >
                    <Card.Body className="p-3">
                      <div className="d-flex align-items-start gap-3">
                        <div
                          className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                          style={{ width: 40, height: 40, backgroundColor: tc.bg, color: tc.color }}
                        >
                          {tc.icon}
                        </div>
                        <div className="flex-grow-1" style={{ minWidth: 0 }}>
                          <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                            <Badge style={{ backgroundColor: tc.bg, color: tc.color, fontSize: 10 }}>
                              {announcement.type}
                            </Badge>
                            {announcement.priority !== 'normal' && (
                              <Badge style={{ backgroundColor: pc.bg, color: pc.color, fontSize: 10 }}>
                                {pc.label}
                              </Badge>
                            )}
                            {announcement.isNew && (
                              <Badge style={{ backgroundColor: '#dbeafe', color: '#1d4ed8', fontSize: 10 }}>
                                {t('new')}
                              </Badge>
                            )}
                          </div>
                          <div className="fw-semibold mb-1" style={{ fontSize: 14, color: '#111827' }}>
                            {announcement.title}
                          </div>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>
                            <Calendar size={11} className="me-1" />
                            {new Date(announcement.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </div>
                          {announcement.image && (
                            <img
                              src={announcement.image}
                              alt=""
                              style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 10, marginTop: 8, border: '1px solid #eef2f7' }}
                            />
                          )}
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                );
              })}
            </div>
          )}
        </Col>
      </Row>

      {/* Announcement Detail Modal */}
      <Modal show={!!viewItem} onHide={() => setViewItem(null)} centered>
        {viewItem && (() => {
          const tc = typeConfig[viewItem.type] || typeConfig.Announcement;
          const pc = getPriorityConfig(t)[viewItem.priority] || getPriorityConfig(t).normal;
          return (
            <>
              <Modal.Header closeButton style={{ borderBottom: `3px solid ${tc.color}` }}>
                <Modal.Title style={{ fontSize: 15 }}>
                  <span style={{ color: tc.color, marginRight: 8 }}>{tc.icon}</span>
                  {t('announcementsEvents')} - {t('details')}
                </Modal.Title>
              </Modal.Header>
              <Modal.Body className="p-4">
                <div className="d-flex flex-wrap gap-2 mb-3">
                  <Badge style={{ backgroundColor: tc.bg, color: tc.color, fontSize: 11 }}>
                    {viewItem.type}
                  </Badge>
                  {viewItem.priority !== 'normal' && (
                    <Badge style={{ backgroundColor: pc.bg, color: pc.color, fontSize: 11 }}>
                      {pc.label}
                    </Badge>
                  )}
                  {viewItem.isNew && (
                    <Badge style={{ backgroundColor: '#dbeafe', color: '#1d4ed8', fontSize: 11 }}>{t('new')}</Badge>
                  )}
                </div>
                <h5 className="fw-bold mb-3" style={{ color: '#111827', fontSize: 16 }}>
                  {viewItem.title}
                </h5>
                <div className="d-flex align-items-center gap-1 mb-3" style={{ fontSize: 12, color: '#6b7280' }}>
                  <Calendar size={13} className="me-1" />
                  {viewItem.date ? new Date(viewItem.date).toLocaleDateString('en-US', {
                    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                  }) : 'No date'}
                </div>
                {viewItem.image && (
                  <img
                    src={viewItem.image}
                    alt=""
                    style={{ width: '100%', maxHeight: 320, objectFit: 'cover', borderRadius: 12, marginBottom: 12, border: '1px solid #e5e7eb' }}
                  />
                )}
                <div
                  className="p-3 rounded-3"
                  style={{ backgroundColor: tc.bg, fontSize: 13, color: '#374151', lineHeight: 1.7 }}
                >
                  {viewItem.content || 'No details provided.'}
                </div>
              </Modal.Body>
              <Modal.Footer>
                <button
                  className="btn btn-light border"
                  style={{ fontSize: 13 }}
                  onClick={() => setViewItem(null)}
                >
                  {t('close')}
                </button>
              </Modal.Footer>
            </>
          );
        })()}
      </Modal>
    </div>
  );
};

export default UserAnnouncements;
