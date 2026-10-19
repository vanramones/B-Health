/**
 * Seed script — populates the database with initial data.
 * Run:  npm run seed
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db     = require('./db');

const hash = (pw) => bcrypt.hashSync(pw, 10);

async function seed() {
  try {
    console.log('Seeding database...');

    // ── Admins ──
    await db.from('admins').delete().neq('id', 0);
    await db.from('admins').insert([
      { username: 'admin',       password: hash('admin123'), name: 'Marlo Reyes',     email: 'marlo@brgyhc.gov.ph',       role: 'Super Admin', is_active: true,  is_owner: true  },
      { username: 'nurse.cruz',  password: hash('nurse123'), name: 'Ana Cruz',        email: 'ana.cruz@brgyhc.gov.ph',    role: 'Nurse',       is_active: true,  is_owner: false },
      { username: 'doc.santos',  password: hash('doc123'),   name: 'Dr. Jose Santos', email: 'jose.santos@brgyhc.gov.ph', role: 'Doctor',      is_active: true,  is_owner: false },
    ]);
    console.log('✓ Admins seeded');

    // ── Users ──
    await db.from('users').delete().neq('id', 0);
    await db.from('users').insert([
      { username: 'juan.delacruz',   password: hash('user123'), full_name: 'Juan dela Cruz',       phone: '0917-555-6060', purok: 'Purok 2', is_active: true },
      { username: 'maria.lopez',     password: hash('user123'), full_name: 'Maria Lopez',          phone: '0917-555-5050', purok: 'Purok 4', is_active: true },
      { username: 'patricia.santos', password: hash('user123'), full_name: 'Patricia Tran Santos', phone: '0917-555-1010', purok: 'Purok 1', is_active: true },
      { username: 'pedro.mendoza',   password: hash('user123'), full_name: 'Pedro L. Mendoza',     phone: '0917-555-2020', purok: 'Purok 2', is_active: true },
      { username: 'ana.bautista',    password: hash('user123'), full_name: 'Ana Bautista',         phone: '0917-555-3030', purok: 'Purok 3', is_active: true },
    ]);
    console.log('✓ Users seeded');

    // ── Residents ──
    await db.from('residents').delete().neq('id', 0);
    await db.from('residents').insert([
      { name: 'Patricia Tran Santos', age: 28, gender: 'Female', address: 'Block 1, Lot 5',  contact: '0917-555-1010', condition: 'Healthy',      status: 'active'     },
      { name: 'Pedro L. Mendoza',     age: 5,  gender: 'Male',   address: 'Block 2, Lot 12', contact: '0917-555-2020', condition: 'Pediatric',    status: 'active'     },
      { name: 'Ana Bautista',         age: 32, gender: 'Female', address: 'Block 3, Lot 7',  contact: '0917-555-3030', condition: 'Pregnant',     status: 'active'     },
      { name: 'Last Cruz',            age: 45, gender: 'Male',   address: 'Block 1, Lot 9',  contact: '0917-555-4040', condition: 'Hypertension', status: 'monitoring' },
      { name: 'Maria Lopez',          age: 67, gender: 'Female', address: 'Block 4, Lot 3',  contact: '0917-555-5050', condition: 'Diabetes',     status: 'monitoring' },
      { name: 'Juan dela Cruz',       age: 35, gender: 'Male',   address: 'Block 2, Lot 8',  contact: '0917-555-6060', condition: 'Healthy',      status: 'active'     },
      { name: 'Ramon Aquino',         age: 72, gender: 'Male',   address: 'Block 5, Lot 1',  contact: '0917-555-7070', condition: 'Senior Care',  status: 'monitoring' },
      { name: 'Lita Reyes',           age: 24, gender: 'Female', address: 'Block 3, Lot 11', contact: '0917-555-8080', condition: 'Healthy',      status: 'active'     },
      { name: 'Carla Domingo',        age: 8,  gender: 'Female', address: 'Block 1, Lot 14', contact: '0917-555-9090', condition: 'Pediatric',    status: 'inactive'   },
    ]);
    console.log('✓ Residents seeded');

    // ── Appointments ──
    await db.from('appointments').delete().neq('id', 0);
    await db.from('appointments').insert([
      { name: 'Patricia Tran Santos', service: 'General Consultation', date: '2026-05-12', time: '09:00 AM', status: 'pending'   },
      { name: 'Pedro L. Mendoza',     service: 'Vaccination (BCG)',    date: '2026-05-12', time: '10:30 AM', status: 'approved'  },
      { name: 'Ana Bautista',         service: 'Prenatal Checkup',     date: '2026-05-13', time: '08:00 AM', status: 'completed' },
      { name: 'Last Cruz',            service: 'Dental Cleaning',      date: '2026-05-13', time: '01:00 PM', status: 'pending'   },
      { name: 'Maria Lopez',          service: 'Blood Pressure',       date: '2026-05-14', time: '11:00 AM', status: 'rejected'  },
      { name: 'Juan dela Cruz',       service: 'General Consultation', date: '2026-05-14', time: '02:30 PM', status: 'approved'  },
      { name: 'Ramon Aquino',         service: 'Follow-up Checkup',    date: '2026-05-15', time: '09:30 AM', status: 'pending'   },
      { name: 'Lita Reyes',           service: 'Vaccination (Flu)',    date: '2026-05-15', time: '10:00 AM', status: 'completed' },
    ]);
    console.log('✓ Appointments seeded');

    // ── Health Records ──
    await db.from('health_records').delete().neq('id', 0);
    await db.from('health_records').insert([
      { patient: 'Patricia Tran Santos', type: 'Consultation', diagnosis: 'Common Cold',            doctor: 'Dr. Reyes',  date: '2026-05-08', notes: 'Prescribed paracetamol 500mg. Rest 3 days.',              status: 'closed'    },
      { patient: 'Pedro L. Mendoza',     type: 'Vaccination',  diagnosis: 'BCG Vaccination',        doctor: 'Nurse Cruz', date: '2026-05-09', notes: 'BCG dose administered. No adverse reactions.',             status: 'closed'    },
      { patient: 'Ana Bautista',         type: 'Prenatal',     diagnosis: 'Routine Prenatal Check', doctor: 'Dr. Santos', date: '2026-05-10', notes: 'BP 110/70. Fetal HR normal. Next visit in 2 weeks.',       status: 'ongoing'   },
      { patient: 'Last Cruz',            type: 'Consultation', diagnosis: 'Hypertension Stage 1',   doctor: 'Dr. Reyes',  date: '2026-05-10', notes: 'Started losartan 50mg. Diet adjustment advised.',           status: 'ongoing'   },
      { patient: 'Maria Lopez',          type: 'Lab Result',   diagnosis: 'Elevated FBS',           doctor: 'Dr. Santos', date: '2026-05-11', notes: 'FBS 142 mg/dL. Refer to nutritionist.',                    status: 'follow-up' },
      { patient: 'Juan dela Cruz',       type: 'Consultation', diagnosis: 'General Wellness',       doctor: 'Dr. Reyes',  date: '2026-05-11', notes: 'Healthy. Annual checkup completed.',                       status: 'closed'    },
      { patient: 'Ramon Aquino',         type: 'Prescription', diagnosis: 'Senior Multivitamin',    doctor: 'Dr. Santos', date: '2026-05-12', notes: 'Multivitamin daily. Calcium supplement.',                  status: 'ongoing'   },
      { patient: 'Lita Reyes',           type: 'Vaccination',  diagnosis: 'Flu Vaccine',            doctor: 'Nurse Cruz', date: '2026-05-12', notes: 'Annual influenza vaccine administered.',                   status: 'closed'    },
    ]);
    console.log('✓ Health Records seeded');

    // ── Vaccinations ──
    await db.from('vaccinations').delete().neq('id', 0);
    await db.from('vaccinations').insert([
      { patient: 'Pedro L. Mendoza',     age: 5,  vaccine: 'BCG',          dose: '1st',     date: '2026-04-08', next_due: null,         administered_by: 'Nurse Cruz', site: 'Left arm',    status: 'completed' },
      { patient: 'Carla Domingo',        age: 8,  vaccine: 'Measles',      dose: '2nd',     date: '2026-04-12', next_due: null,         administered_by: 'Nurse Cruz', site: 'Right arm',   status: 'completed' },
      { patient: 'Ana Bautista',         age: 32, vaccine: 'Tetanus',      dose: 'Booster', date: '2026-04-20', next_due: '2026-10-20', administered_by: 'Dr. Santos', site: 'Left arm',    status: 'completed' },
      { patient: 'Patricia Tran Santos', age: 28, vaccine: 'Flu',          dose: 'Annual',  date: '2026-04-25', next_due: '2027-04-25', administered_by: 'Nurse Cruz', site: 'Left arm',    status: 'completed' },
      { patient: 'Lita Reyes',           age: 24, vaccine: 'Flu',          dose: 'Annual',  date: '2026-05-01', next_due: '2027-05-01', administered_by: 'Nurse Cruz', site: 'Right arm',   status: 'completed' },
      { patient: 'Ramon Aquino',         age: 72, vaccine: 'Pneumococcal', dose: '1st',     date: '2026-05-05', next_due: '2026-08-05', administered_by: 'Dr. Santos', site: 'Left arm',    status: 'scheduled' },
      { patient: 'Pedro L. Mendoza',     age: 5,  vaccine: 'DPT',          dose: '3rd',     date: '2026-05-10', next_due: null,         administered_by: 'Nurse Cruz', site: 'Right thigh', status: 'scheduled' },
      { patient: 'Carla Domingo',        age: 8,  vaccine: 'Hepatitis B',  dose: '2nd',     date: '2026-05-12', next_due: '2026-11-12', administered_by: 'Nurse Cruz', site: 'Left arm',    status: 'missed'    },
    ]);
    console.log('✓ Vaccinations seeded');

    // ── Services ──
    await db.from('services').delete().neq('id', 0);
    await db.from('services').insert([
      { name: 'Prenatal Checkup',   category: 'Maternal',     icon: 'heart',        accent: '#ec4899', description: 'Routine checkups for pregnant residents.',                beneficiaries: 42,  schedule: 'Mon, Wed, Fri 8AM-12NN', location: 'Maternal Clinic Room 1', staff: 'Dr. Santos, Midwife Bautista', is_active: true },
      { name: 'Child Immunization', category: 'Pediatric',    icon: 'syringe',      accent: '#3b82f6', description: 'Routine immunization for infants and children.',          beneficiaries: 87,  schedule: 'Wed 8AM-4PM',            location: 'Vaccination Room',       staff: 'Nurse Cruz',                   is_active: true },
      { name: 'Family Planning',    category: 'Reproductive', icon: 'hand-heart',   accent: '#a855f7', description: 'Counseling and provision of family planning methods.',   beneficiaries: 56,  schedule: 'Mon-Fri 1PM-5PM',        location: 'Counseling Room 2',      staff: 'Dr. Reyes, Nurse Cruz',        is_active: true },
      { name: 'Consultation',       category: 'General',      icon: 'stethoscope',  accent: '#16a34a', description: 'General medical consultation for common illnesses.',     beneficiaries: 120, schedule: 'Mon-Fri 8AM-5PM',        location: 'OPD Room 1',             staff: 'Dr. Reyes, Dr. Santos',        is_active: true },
      { name: 'TB-DOTS',            category: 'Infectious',   icon: 'bug',          accent: '#ef4444', description: 'Directly observed therapy for tuberculosis patients.',   beneficiaries: 15,  schedule: 'Mon-Sat 7AM-8AM',        location: 'TB Clinic',              staff: 'Nurse Cruz',                   is_active: true },
      { name: 'Senior Care',        category: 'Geriatric',    icon: 'accessibility',accent: '#f59e0b', description: 'Specialized care for elderly residents 60+.',            beneficiaries: 34,  schedule: 'Tue, Thu 8AM-12NN',      location: 'OPD Room 2',             staff: 'Dr. Santos',                   is_active: true },
    ]);
    console.log('✓ Services seeded');

    // ── Announcements ──
    await db.from('announcements').delete().neq('id', 0);
    await db.from('announcements').insert([
      { title: 'Free Anti-Rabies Vaccination Drive', category: 'Vaccination Drive', body: 'A free anti-rabies vaccination for both pets and exposed residents will be conducted this Saturday.', author: 'Dr. Jose Santos',  audience: 'All Residents',        publish_date: '2026-05-08', event_date: '2026-05-15', status: 'published', pinned: true  },
      { title: 'Measles Outbreak Health Advisory',   category: 'Health Advisory',   body: 'Recent reports indicate a rise in measles cases in nearby barangays. Parents are urged to bring children for vaccination.',     author: 'Marlo Reyes',       audience: 'Parents & Guardians',  publish_date: '2026-05-05', event_date: null,         status: 'published', pinned: true  },
      { title: 'Prenatal Checkup Schedule Change',   category: 'Schedule',          body: 'Starting May 12, prenatal checkups will be moved to every Tuesday and Thursday from 8:00 AM to 12:00 NN.',                     author: 'Midwife Bautista',  audience: 'Pregnant Residents',   publish_date: '2026-05-04', event_date: '2026-05-12', status: 'published', pinned: false },
      { title: 'Dengue Prevention Reminder',         category: 'Health Advisory',   body: 'Residents are reminded to clean their surroundings and remove stagnant water to prevent dengue mosquito breeding.',             author: 'Nurse Ana Cruz',    audience: 'All Residents',        publish_date: '2026-05-02', event_date: null,         status: 'published', pinned: false },
    ]);
    console.log('✓ Announcements seeded');

    // ── Emergency Contacts ──
    await db.from('emergency_contacts').delete().neq('id', 0);
    await db.from('emergency_contacts').insert([
      { name: 'Barangay Health Emergency Hotline', category: 'Barangay',  phone: '(02) 8123-4567', alt_phone: '0917-123-4567', email: 'emergency@brgyhc.gov.ph', address: 'Brgy. Hall, Poblacion',    available: '24/7', is_active: true, is_favorite: true,  notes: 'First point of contact for any medical emergency.' },
      { name: 'Poblacion District Hospital',       category: 'Hospital',  phone: '(02) 8234-5678', alt_phone: '0918-234-5678', email: 'er@poblaciondh.ph',       address: '12 Mabini St., Poblacion', available: '24/7', is_active: true, is_favorite: true,  notes: 'Nearest tertiary hospital with full ER.'           },
      { name: 'Rescue 911 - Ambulance',            category: 'Ambulance', phone: '911',            alt_phone: '117',           email: '',                         address: 'Regional Dispatch',        available: '24/7', is_active: true, is_favorite: true,  notes: 'National emergency hotline.'                       },
      { name: 'PNP Brgy. Reyes Station',           category: 'Police',    phone: '(02) 8345-6789', alt_phone: '0919-345-6789', email: '',                         address: '5 Rizal St., Brgy. Reyes', available: '24/7', is_active: true, is_favorite: false, notes: 'Local police station.'                             },
      { name: 'Bureau of Fire Protection',         category: 'Fire',      phone: '(02) 8426-0246', alt_phone: '160',           email: '',                         address: 'Central Fire Station',     available: '24/7', is_active: true, is_favorite: false, notes: 'Fire emergencies and rescue.'                      },
    ]);
    console.log('✓ Emergency Contacts seeded');

    // ── Notifications ──
    await db.from('notifications').delete().neq('id', 0);
    await db.from('notifications').insert([
      { type: 'Appointment',  priority: 'normal', title: 'New appointment booked',        message: 'Maria Santos booked a prenatal checkup on May 14, 2026.',         recipient: 'Marlo Reyes', is_read: false, created_at: '2026-05-11T08:42:00Z' },
      { type: 'Vaccination',  priority: 'urgent', title: 'Vaccination reminder due',      message: 'Pedro L. Mendoza is due for DPT 3rd dose tomorrow.',              recipient: 'Nurse Cruz',  is_read: false, created_at: '2026-05-11T07:30:00Z' },
      { type: 'Health Alert', priority: 'urgent', title: 'Dengue cluster detected nearby',message: 'Two confirmed dengue cases reported in Sitio Bagong Silang.',      recipient: 'All Staff',   is_read: false, created_at: '2026-05-10T16:15:00Z' },
      { type: 'Reminder',     priority: 'normal', title: 'Weekly inventory check',        message: 'Please update the medicine inventory before end of day.',          recipient: 'Encoder',     is_read: false, created_at: '2026-05-10T09:00:00Z' },
      { type: 'System',       priority: 'low',    title: 'Backup completed',              message: 'Daily backup of patient records completed successfully at 2:00 AM.',recipient: 'Admin',       is_read: true,  created_at: '2026-05-10T02:00:00Z' },
    ]);
    console.log('✓ Notifications seeded');

    console.log('\n✓ Database seeded successfully!');
  } catch (err) {
    console.error('✗ Seed failed:', err.message);
  } finally {
    process.exit(0);
  }
}

seed();