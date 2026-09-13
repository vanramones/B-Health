import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext(null);

const translations = {
  en: {
    // Navigation
    home: 'Home',
    appointments: 'Appointments',
    records: 'Records',
    services: 'Services',
    profile: 'Profile',
    announcements: 'Announcements',
    vaccinations: 'Vaccinations',
    emergencyContact: 'Emergency Contact',
    healthServices: 'Health Services',
    
    // Common
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    close: 'Close',
    loading: 'Loading...',
    noData: 'No data available',
    search: 'Search',
    filter: 'Filter',
    all: 'All',
    viewAll: 'View All',
    details: 'Details',
    
    // Profile
    myProfile: 'My Profile',
    editProfile: 'Edit Profile',
    personalInfo: 'Personal Information',
    firstName: 'First Name',
    lastName: 'Last Name',
    email: 'Email Address',
    phone: 'Phone Number',
    birthdate: 'Date of Birth',
    gender: 'Gender',
    address: 'Address',
    bloodType: 'Blood Type',
    civilStatus: 'Civil Status',
    occupation: 'Occupation',
    philhealthNo: 'PhilHealth Number',
    emergencyContactInfo: 'Emergency Contact',
    editEmergencyContact: 'Edit Emergency Contact',
    relationship: 'Relationship',
    selectRelationship: 'Select Relationship',
    spouse: 'Spouse',
    parent: 'Parent',
    sibling: 'Sibling',
    child: 'Child',
    friend: 'Friend',
    other: 'Other',
    name: 'Name',
    yearsOld: 'years old',
    male: 'Male',
    female: 'Female',
    single: 'Single',
    married: 'Married',
    widowed: 'Widowed',
    
    // Appointments
    myAppointments: 'My Appointments',
    appointmentHistory: 'Appointment History',
    bookAppointment: 'Book Appointment',
    service: 'Service',
    date: 'Date',
    time: 'Time',
    status: 'Status',
    pending: 'Pending',
    approved: 'Approved',
    completed: 'Completed',
    cancelled: 'Cancelled',
    rejected: 'Rejected',
    upcomingAppointments: 'Upcoming Appointments',
    noAppointments: 'No appointments yet',
    scheduleNow: 'Schedule Now',
    patientName: 'Patient Name',
    notes: 'Notes',
    
    // Vaccinations
    myVaccinations: 'My Vaccinations',
    vaccine: 'Vaccine',
    dose: 'Dose',
    nextDue: 'Next Due',
    administeredBy: 'Administered By',
    trackVaccination: 'Track your vaccination history, schedules, and upcoming doses',
    upcomingScheduled: 'Upcoming & Scheduled',
    vaccinationHistory: 'Vaccination History',
    noVaccinations: 'No vaccinations yet',
    scheduled: 'Scheduled',
    overdue: 'Overdue',
    missed: 'Missed',
    scheduleAppointment: 'Schedule Appointment',
    scheduleImmediately: 'Schedule Immediately',
    completed: 'completed',
    
    // Notifications
    notifications: 'Notifications',
    markAllRead: 'Mark all as read',
    noNotifications: 'No notifications',
    
    // Dashboard
    welcome: 'Welcome',
    quickActions: 'Quick Actions',
    recentActivity: 'Recent Activity',
    goodMorning: 'Good morning',
    goodAfternoon: 'Good afternoon',
    goodEvening: 'Good evening',
    book: 'Book',
    news: 'News',
    upcomingAppointments: 'Upcoming Appointments',
    vaccinationReminders: 'Vaccination Reminders',
    emergencyHotline: 'Emergency Hotline',
    seeAll: 'See all',
    noUpcomingAppointments: 'No upcoming appointments',
    noVaccinationReminders: 'No vaccination reminders',
    stayHealthyStayInformed: 'Stay healthy, stay informed',
    
    // Health Services
    availableServices: 'Available Services',
    viewDetails: 'View Details',
    description: 'Description',
    beneficiaries: 'Beneficiaries',
    schedule: 'Schedule',
    location: 'Location',
    
    // Health Records
    healthRecords: 'Health Records',
    myHealthRecords: 'My Health Records',
    viewMedicalHistory: 'View your medical history and health information',
    diagnosis: 'Diagnosis',
    doctor: 'Doctor',
    prescription: 'Prescription',
    noRecords: 'No health records yet',
    
    // Announcements
    latestAnnouncements: 'Latest Announcements',
    announcementsEvents: 'Announcements & Events',
    viewUpcomingEvents: 'View upcoming health center events and announcements',
    stayUpdated: 'Stay updated with health programs and community news',
    readMore: 'Read More',
    noAnnouncements: 'No announcements yet',
    searchAnnouncements: 'Search announcements',
    new: 'New',
    urgent: 'Urgent',
    important: 'Important',
    info: 'Info',
    
    // Emergency Contact
    emergencyContacts: 'Emergency Contacts',
    category: 'Category',
    available24: 'Available 24/7',
    
    // Additional
    hasPrescription: 'Has Prescription',
    notesRemarks: 'Notes / Remarks',
    stayHealthyStaySafe: 'Stay healthy, stay safe today',
    signInToUnlock: 'Sign in to unlock all features',
    accessHealthRecords: 'Access your health records, book appointments, and more',
    signIn: 'Sign In',
    latestAnnouncementsEvents: 'Latest Announcements',
    seeAllArrow: 'See All →',
    noAnnouncementsYet: 'No announcements yet',
    loadingText: 'Loading...',
    userPortal: 'User Portal',
    browseAsGuest: 'Browse as Guest',
    signOut: 'Sign Out',
  },
  tl: {
    // Navigation
    home: 'Bahay',
    appointments: 'Mga Appointment',
    records: 'Mga Rekord',
    services: 'Mga Serbisyo',
    profile: 'Profile',
    announcements: 'Mga Balita',
    vaccinations: 'Mga Bakuna',
    emergencyContact: 'Emergency Contact',
    healthServices: 'Mga Serbisyong Pangkalusugan',
    
    // Common
    save: 'I-save',
    cancel: 'Kanselahin',
    edit: 'I-edit',
    delete: 'Tanggalin',
    close: 'Isara',
    loading: 'Naglo-load...',
    noData: 'Walang available na datos',
    search: 'Maghanap',
    filter: 'I-filter',
    all: 'Lahat',
    viewAll: 'Tingnan Lahat',
    details: 'Mga Detalye',
    
    // Profile
    myProfile: 'Aking Profile',
    editProfile: 'I-edit ang Profile',
    personalInfo: 'Personal na Impormasyon',
    firstName: 'Pangalan',
    lastName: 'Apelyido',
    email: 'Email Address',
    phone: 'Numero ng Telepono',
    birthdate: 'Petsa ng Kapanganakan',
    gender: 'Kasarian',
    address: 'Tirahan',
    bloodType: 'Uri ng Dugo',
    civilStatus: 'Civil Status',
    occupation: 'Trabaho',
    philhealthNo: 'PhilHealth Number',
    emergencyContactInfo: 'Emergency Contact',
    editEmergencyContact: 'I-edit ang Emergency Contact',
    relationship: 'Relasyon',
    selectRelationship: 'Pumili ng Relasyon',
    spouse: 'Asawa',
    parent: 'Magulang',
    sibling: 'Kapatid',
    child: 'Anak',
    friend: 'Kaibigan',
    other: 'Iba pa',
    name: 'Pangalan',
    yearsOld: 'taong gulang',
    male: 'Lalaki',
    female: 'Babae',
    single: 'Single',
    married: 'Kasal',
    widowed: 'Biyudo/Biyuda',
    
    // Appointments
    myAppointments: 'Aking Mga Appointment',
    appointmentHistory: 'Kasaysayan ng Appointment',
    bookAppointment: 'Mag-book ng Appointment',
    service: 'Serbisyo',
    date: 'Petsa',
    time: 'Oras',
    status: 'Katayuan',
    pending: 'Naghihintay',
    approved: 'Aprubado',
    completed: 'Tapos na',
    cancelled: 'Kinansela',
    rejected: 'Tinanggihan',
    upcomingAppointments: 'Paparating na Appointment',
    noAppointments: 'Wala pang appointment',
    scheduleNow: 'Mag-schedule Ngayon',
    patientName: 'Pangalan ng Pasyente',
    notes: 'Mga Tala',
    
    // Vaccinations
    myVaccinations: 'Aking Mga Bakuna',
    vaccine: 'Bakuna',
    dose: 'Dosis',
    nextDue: 'Susunod na Bakuna',
    administeredBy: 'Ibinigay ni',
    trackVaccination: 'Subaybayan ang iyong kasaysayan ng bakuna, iskedyul, at paparating na dosis',
    upcomingScheduled: 'Paparating at Naka-iskedyul',
    vaccinationHistory: 'Kasaysayan ng Bakuna',
    noVaccinations: 'Wala pang bakuna',
    scheduled: 'Naka-iskedyul',
    overdue: 'Lampas na',
    missed: 'Napalampas',
    scheduleAppointment: 'Mag-schedule ng Appointment',
    scheduleImmediately: 'Mag-schedule Kaagad',
    completed: 'nakumpleto',
    
    // Notifications
    notifications: 'Mga Abiso',
    markAllRead: 'Markahan lahat bilang nabasa',
    noNotifications: 'Walang mga abiso',
    
    // Dashboard
    welcome: 'Maligayang pagdating',
    quickActions: 'Mabilis na Aksyon',
    recentActivity: 'Kamakailang Aktibidad',
    goodMorning: 'Magandang umaga',
    goodAfternoon: 'Magandang hapon',
    goodEvening: 'Magandang gabi',
    book: 'Mag-book',
    news: 'Balita',
    upcomingAppointments: 'Paparating na Appointment',
    vaccinationReminders: 'Paalala sa Bakuna',
    emergencyHotline: 'Emergency Hotline',
    seeAll: 'Tingnan lahat',
    noUpcomingAppointments: 'Walang paparating na appointment',
    noVaccinationReminders: 'Walang paalala sa bakuna',
    stayHealthyStayInformed: 'Manatiling malusog, manatiling may kaalaman',
    
    // Health Services
    availableServices: 'Mga Available na Serbisyo',
    viewDetails: 'Tingnan ang Detalye',
    description: 'Paglalarawan',
    beneficiaries: 'Mga Benepisyaryo',
    schedule: 'Iskedyul',
    location: 'Lokasyon',
    
    // Health Records
    healthRecords: 'Mga Rekord ng Kalusugan',
    myHealthRecords: 'Aking Mga Rekord ng Kalusugan',
    viewMedicalHistory: 'Tingnan ang iyong kasaysayan ng medikal at impormasyon sa kalusugan',
    diagnosis: 'Diagnosis',
    doctor: 'Doktor',
    prescription: 'Reseta',
    noRecords: 'Wala pang rekord ng kalusugan',
    
    // Announcements
    latestAnnouncements: 'Pinakabagong Balita',
    announcementsEvents: 'Mga Balita at Kaganapan',
    viewUpcomingEvents: 'Tingnan ang paparating na kaganapan at balita ng health center',
    stayUpdated: 'Manatiling updated sa mga programa sa kalusugan at balita ng komunidad',
    readMore: 'Magbasa Pa',
    noAnnouncements: 'Wala pang mga balita',
    searchAnnouncements: 'Maghanap ng balita',
    new: 'Bago',
    urgent: 'Agarang',
    important: 'Mahalaga',
    info: 'Impormasyon',
    
    // Emergency Contact
    emergencyContacts: 'Mga Emergency Contact',
    category: 'Kategorya',
    available24: 'Available 24/7',
    
    // Additional
    hasPrescription: 'May Reseta',
    notesRemarks: 'Mga Tala / Puna',
    stayHealthyStaySafe: 'Manatiling malusog, manatiling ligtas ngayong araw',
    signInToUnlock: 'Mag-sign in para ma-unlock ang lahat ng features',
    accessHealthRecords: 'I-access ang iyong health records, mag-book ng appointments, at iba pa',
    signIn: 'Mag-sign In',
    latestAnnouncementsEvents: 'Pinakabagong Balita',
    seeAllArrow: 'Tingnan Lahat →',
    noAnnouncementsYet: 'Wala pang mga balita',
    loadingText: 'Naglo-load...',
    userPortal: 'Portal ng User',
    browseAsGuest: 'Mag-browse bilang Bisita',
    signOut: 'Mag-sign Out',
  },
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('bh_language') || 'en';
  });

  useEffect(() => {
    localStorage.setItem('bh_language', language);
  }, [language]);

  const t = (key) => {
    return translations[language]?.[key] || key;
  };

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'en' ? 'tl' : 'en'));
  };

  const value = {
    language,
    setLanguage,
    t,
    toggleLanguage,
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};
