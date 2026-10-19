require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./config/db');
const setupSocket = require('./config/socket');

const app = express();

// ── Middleware ──
app.use(cors({
  origin: (origin, cb) => {
    if (
      !origin ||
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
      /^capacitor:\/\/localhost$/.test(origin) ||
      /^ionic:\/\/localhost$/.test(origin)
    ) {
      return cb(null, true);
    }
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());

// ── Routes ──
app.use('/api/auth',                require('./routes/authRoutes'));
app.use('/api/residents',           require('./routes/residentRoutes'));
app.use('/api/appointments',        require('./routes/appointmentRoutes'));
app.use('/api/health-records',      require('./routes/healthRecordRoutes'));
app.use('/api/vaccinations',        require('./routes/vaccinationRoutes'));
app.use('/api/services',            require('./routes/serviceRoutes'));
app.use('/api/announcements',       require('./routes/announcementRoutes'));
app.use('/api/emergency-contacts',  require('./routes/emergencyContactRoutes'));
app.use('/api/notifications',       require('./routes/notificationRoutes'));
app.use('/api/user/appointments',   require('./routes/userAppointmentRoutes'));
app.use('/api/user',                require('./routes/userRoutes'));

// ── Root ──
app.get('/', (req, res) => res.json({
  name: 'B-Health API',
  status: 'running',
  message: 'This is the backend API server. The frontend runs separately (e.g. http://localhost:5173).',
  health: '/api/health',
}));

// ── Health check ──
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// ── Error handler ──
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ── Start ──
const PORT = process.env.PORT || 5000;

async function start() {
  try {
    // Test Supabase connection
    const { error } = await db.from('admins').select('id').limit(1);
    if (error) throw error;
    console.log('✓ Supabase connected');

    const { server, io } = setupSocket(app);
    server.listen(PORT, () => console.log(`✓ Server running on http://localhost:${PORT}`));
    global.io = io;
  } catch (err) {
    console.error('✗ Supabase connection failed:', err.message);
    process.exit(1);
  }
}

start();