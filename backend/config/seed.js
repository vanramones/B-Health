/**
 * Seed script — populates the database with initial data.
 * Run:  npm run seed
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db     = require('./db');

const hash = (pw) => bcrypt.hashSync(pw, 10);

async function seed() {
  const conn = await db.getConnection();
  try {
    console.log('Seeding database...');

    // ── Admins ──
    await conn.query('DELETE FROM admins');
    await conn.query(
      `INSERT INTO admins (username, password, name, email, role, is_active, is_owner) VALUES
       ('admin',      '${hash('admin123')}',  'Marlo Reyes',      'marlo@brgyhc.gov.ph',          'Super Admin', 1, 1),
       ('nurse.cruz', '${hash('nurse123')}',  'Ana Cruz',         'ana.cruz@brgyhc.gov.ph',       'Nurse',       1, 0),
       ('doc.santos', '${hash('doc123')}',    'Dr. Jose Santos',  'jose.santos@brgyhc.gov.ph',    'Doctor',      1, 0)`
    );

    // ── Users (residents/patients) ──
    await conn.query('DELETE FROM users');
    await conn.query(
      `INSERT INTO users (username, password, full_name, phone, purok, is_active) VALUES
       ('juan.delacruz', '${hash('user123')}',  'Juan dela Cruz',     '0917-555-6060', 'Purok 2', 1),
       ('maria.lopez',   '${hash('user123')}',  'Maria Lopez',        '0917-555-5050', 'Purok 4', 1),
       ('patricia.santos','${hash('user123')}', 'Patricia Tran Santos','0917-555-1010', 'Purok 1', 1),
       ('pedro.mendoza', '${hash('user123')}',  'Pedro L. Mendoza',   '0917-555-2020', 'Purok 2', 1),
       ('ana.bautista',  '${hash('user123')}',  'Ana Bautista',       '0917-555-3030', 'Purok 3', 1)`
    );

    // ── Residents ──
    await conn.query('DELETE FROM residents');
    await conn.query(
      `INSERT INTO residents (name, age, gender, address, contact, \`condition\`, status) VALUES
       ('Patricia Tran Santos', 28, 'Female', 'Block 1, Lot 5',  '0917-555-1010', 'Healthy',      'active'),
       ('Pedro L. Mendoza',     5,  'Male',   'Block 2, Lot 12', '0917-555-2020', 'Pediatric',    'active'),
       ('Ana Bautista',         32, 'Female', 'Block 3, Lot 7',  '0917-555-3030', 'Pregnant',     'active'),
       ('Last Cruz',            45, 'Male',   'Block 1, Lot 9',  '0917-555-4040', 'Hypertension', 'monitoring'),
       ('Maria Lopez',          67, 'Female', 'Block 4, Lot 3',  '0917-555-5050', 'Diabetes',     'monitoring'),
       ('Juan dela Cruz',       35, 'Male',   'Block 2, Lot 8',  '0917-555-6060', 'Healthy',      'active'),
       ('Ramon Aquino',         72, 'Male',   'Block 5, Lot 1',  '0917-555-7070', 'Senior Care',  'monitoring'),
       ('Lita Reyes',           24, 'Female', 'Block 3, Lot 11', '0917-555-8080', 'Healthy',      'active'),
       ('Carla Domingo',         8, 'Female', 'Block 1, Lot 14', '0917-555-9090', 'Pediatric',    'inactive')`
    );

    // ── Appointments ──
    await conn.query('DELETE FROM appointments');
    await conn.query(
      `INSERT INTO appointments (name, service, date, time, status) VALUES
       ('Patricia Tran Santos', 'General Consultation', '2026-05-12', '09:00 AM', 'pending'),
       ('Pedro L. Mendoza',     'Vaccination (BCG)',    '2026-05-12', '10:30 AM', 'approved'),
       ('Ana Bautista',         'Prenatal Checkup',     '2026-05-13', '08:00 AM', 'completed'),
       ('Last Cruz',            'Dental Cleaning',      '2026-05-13', '01:00 PM', 'pending'),
       ('Maria Lopez',          'Blood Pressure',       '2026-05-14', '11:00 AM', 'rejected'),
       ('Juan dela Cruz',       'General Consultation', '2026-05-14', '02:30 PM', 'approved'),
       ('Ramon Aquino',         'Follow-up Checkup',    '2026-05-15', '09:30 AM', 'pending'),
       ('Lita Reyes',           'Vaccination (Flu)',    '2026-05-15', '10:00 AM', 'completed')`
    );

    // ── Health Records ──
    await conn.query('DELETE FROM health_records');
    await conn.query(
      `INSERT INTO health_records (patient, type, diagnosis, doctor, date, notes, status) VALUES
       ('Patricia Tran Santos', 'Consultation', 'Common Cold',           'Dr. Reyes',  '2026-05-08', 'Prescribed paracetamol 500mg. Rest 3 days.', 'closed'),
       ('Pedro L. Mendoza',     'Vaccination',  'BCG Vaccination',       'Nurse Cruz', '2026-05-09', 'BCG dose administered. No adverse reactions.', 'closed'),
       ('Ana Bautista',         'Prenatal',     'Routine Prenatal Check','Dr. Santos',  '2026-05-10', 'BP 110/70. Fetal HR normal. Next visit in 2 weeks.', 'ongoing'),
       ('Last Cruz',            'Consultation', 'Hypertension Stage 1',  'Dr. Reyes',  '2026-05-10', 'Started losartan 50mg. Diet adjustment advised.', 'ongoing'),
       ('Maria Lopez',          'Lab Result',   'Elevated FBS',          'Dr. Santos', '2026-05-11', 'FBS 142 mg/dL. Refer to nutritionist.', 'follow-up'),
       ('Juan dela Cruz',       'Consultation', 'General Wellness',      'Dr. Reyes',  '2026-05-11', 'Healthy. Annual checkup completed.', 'closed'),
       ('Ramon Aquino',         'Prescription', 'Senior Multivitamin',   'Dr. Santos', '2026-05-12', 'Multivitamin daily. Calcium supplement.', 'ongoing'),
       ('Lita Reyes',           'Vaccination',  'Flu Vaccine',           'Nurse Cruz', '2026-05-12', 'Annual influenza vaccine administered.', 'closed')`
    );

    // ── Vaccinations ──
    await conn.query('DELETE FROM vaccinations');
    await conn.query(
      `INSERT INTO vaccinations (patient, age, vaccine, dose, date, next_due, administered_by, site, status) VALUES
       ('Pedro L. Mendoza',     5,  'BCG',          '1st',     '2026-04-08', NULL,         'Nurse Cruz', 'Left arm',    'completed'),
       ('Carla Domingo',        8,  'Measles',      '2nd',     '2026-04-12', NULL,         'Nurse Cruz', 'Right arm',   'completed'),
       ('Ana Bautista',         32, 'Tetanus',      'Booster', '2026-04-20', '2026-10-20', 'Dr. Santos', 'Left arm',    'completed'),
       ('Patricia Tran Santos', 28, 'Flu',          'Annual',  '2026-04-25', '2027-04-25', 'Nurse Cruz', 'Left arm',    'completed'),
       ('Lita Reyes',           24, 'Flu',          'Annual',  '2026-05-01', '2027-05-01', 'Nurse Cruz', 'Right arm',   'completed'),
       ('Ramon Aquino',         72, 'Pneumococcal', '1st',     '2026-05-05', '2026-08-05', 'Dr. Santos', 'Left arm',    'scheduled'),
       ('Pedro L. Mendoza',     5,  'DPT',          '3rd',     '2026-05-10', NULL,         'Nurse Cruz', 'Right thigh', 'scheduled'),
       ('Carla Domingo',        8,  'Hepatitis B',  '2nd',     '2026-05-12', '2026-11-12', 'Nurse Cruz', 'Left arm',    'missed')`
    );

    // ── Services ──
    await conn.query('DELETE FROM services');
    await conn.query(
      `INSERT INTO services (name, category, icon, accent, description, beneficiaries, schedule, location, staff, is_active) VALUES
       ('Prenatal Checkup',    'Maternal',     'heart',       '#ec4899', 'Routine checkups for pregnant residents.',                 42, 'Mon, Wed, Fri 8AM-12NN', 'Maternal Clinic Room 1', 'Dr. Santos, Midwife Bautista', 1),
       ('Child Immunization',  'Pediatric',    'syringe',     '#3b82f6', 'Routine immunization for infants and children.',           87, 'Wed 8AM-4PM',            'Vaccination Room',       'Nurse Cruz',                   1),
       ('Family Planning',     'Reproductive', 'hand-heart',  '#a855f7', 'Counseling and provision of family planning methods.',     56, 'Mon-Fri 1PM-5PM',        'Counseling Room 2',      'Dr. Reyes, Nurse Cruz',        1),
       ('Consultation',        'General',      'stethoscope', '#16a34a', 'General medical consultation for common illnesses.',      120, 'Mon-Fri 8AM-5PM',        'OPD Room 1',             'Dr. Reyes, Dr. Santos',        1),
       ('TB-DOTS',             'Infectious',   'bug',         '#ef4444', 'Directly observed therapy for tuberculosis patients.',     15, 'Mon-Sat 7AM-8AM',        'TB Clinic',              'Nurse Cruz',                   1),
       ('Senior Care',         'Geriatric',    'accessibility','#f59e0b','Specialized care for elderly residents 60+.',              34, 'Tue, Thu 8AM-12NN',      'OPD Room 2',             'Dr. Santos',                   1)`
    );

    // ── Announcements ──
    await conn.query('DELETE FROM announcements');
    await conn.query(
      `INSERT INTO announcements (title, category, body, author, audience, publish_date, event_date, status, pinned) VALUES
       ('Free Anti-Rabies Vaccination Drive', 'Vaccination Drive', 'A free anti-rabies vaccination for both pets and exposed residents will be conducted this Saturday.', 'Dr. Jose Santos', 'All Residents', '2026-05-08', '2026-05-15', 'published', 1),
       ('Measles Outbreak Health Advisory',   'Health Advisory',   'Recent reports indicate a rise in measles cases in nearby barangays. Parents are urged to bring children for vaccination.', 'Marlo Reyes', 'Parents & Guardians', '2026-05-05', NULL, 'published', 1),
       ('Prenatal Checkup Schedule Change',   'Schedule',          'Starting May 12, prenatal checkups will be moved to every Tuesday and Thursday from 8:00 AM to 12:00 NN.', 'Midwife Bautista', 'Pregnant Residents', '2026-05-04', '2026-05-12', 'published', 0),
       ('Dengue Prevention Reminder',         'Health Advisory',   'Residents are reminded to clean their surroundings and remove stagnant water to prevent dengue mosquito breeding.', 'Nurse Ana Cruz', 'All Residents', '2026-05-02', NULL, 'published', 0)`
    );

    // ── Emergency Contacts ──
    await conn.query('DELETE FROM emergency_contacts');
    await conn.query(
      `INSERT INTO emergency_contacts (name, category, phone, alt_phone, email, address, available, is_active, is_favorite, notes) VALUES
       ('Barangay Health Emergency Hotline', 'Barangay',  '(02) 8123-4567', '0917-123-4567', 'emergency@brgyhc.gov.ph', 'Brgy. Hall, Poblacion',   '24/7', 1, 1, 'First point of contact for any medical emergency.'),
       ('Poblacion District Hospital',       'Hospital',  '(02) 8234-5678', '0918-234-5678', 'er@poblaciondh.ph',       '12 Mabini St., Poblacion','24/7', 1, 1, 'Nearest tertiary hospital with full ER.'),
       ('Rescue 911 - Ambulance',            'Ambulance', '911',            '117',            '',                         'Regional Dispatch',       '24/7', 1, 1, 'National emergency hotline.'),
       ('PNP Brgy. Reyes Station',           'Police',    '(02) 8345-6789', '0919-345-6789', '',                         '5 Rizal St., Brgy. Reyes','24/7', 1, 0, 'Local police station.'),
       ('Bureau of Fire Protection',         'Fire',      '(02) 8426-0246', '160',            '',                         'Central Fire Station',    '24/7', 1, 0, 'Fire emergencies and rescue.')`
    );

    // ── Notifications ──
    await conn.query('DELETE FROM notifications');
    await conn.query(
      `INSERT INTO notifications (type, priority, title, message, recipient, is_read, created_at) VALUES
       ('Appointment',  'normal', 'New appointment booked',       'Maria Santos booked a prenatal checkup on May 14, 2026.',          'Marlo Reyes', 0, '2026-05-11 08:42:00'),
       ('Vaccination',  'urgent', 'Vaccination reminder due',     'Pedro L. Mendoza is due for DPT 3rd dose tomorrow.',               'Nurse Cruz',  0, '2026-05-11 07:30:00'),
       ('Health Alert', 'urgent', 'Dengue cluster detected nearby','Two confirmed dengue cases reported in Sitio Bagong Silang.',     'All Staff',   0, '2026-05-10 16:15:00'),
       ('Reminder',     'normal', 'Weekly inventory check',       'Please update the medicine inventory before end of day.',           'Encoder',     0, '2026-05-10 09:00:00'),
       ('System',       'low',    'Backup completed',             'Daily backup of patient records completed successfully at 2:00 AM.','Admin',       1, '2026-05-10 02:00:00')`
    );

    console.log('✓ Database seeded successfully!');
  } catch (err) {
    console.error('✗ Seed failed:', err.message);
  } finally {
    conn.release();
    process.exit(0);
  }
}

seed();
