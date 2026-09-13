import Dashboard from '../pages/admin/Dashboard';
import Appointments from '../pages/admin/Appointments';
import Residents from '../pages/admin/Residents';
import HealthRecords from '../pages/admin/HealthRecords';
import Services from '../pages/admin/Services';
import Vaccination from '../pages/admin/Vaccination';
import Notifications from '../pages/admin/Notifications';
import Announcements from '../pages/admin/Announcements';
import EmergencyContacts from '../pages/admin/EmergencyContacts';
import Reports from '../pages/admin/Reports';
import Settings from '../pages/admin/Settings';
import AdminAccounts from '../pages/admin/AdminAccounts';
import RegisteredUsers from '../pages/admin/RegisteredUsers';
import Trash from '../pages/admin/Trash';

export const routes = [
  { path: '/admin/dashboard',      component: Dashboard,         title: 'Dashboard',          exact: true },
  { path: '/admin/appointments',   component: Appointments,      title: 'Appointments' },
  { path: '/admin/residents',      component: Residents,         title: 'Residents' },
  { path: '/admin/registered-users', component: RegisteredUsers,   title: 'Registered Users' },
  { path: '/admin/health-records', component: HealthRecords,     title: 'Health Records' },
  { path: '/admin/services',       component: Services,          title: 'Services' },
  { path: '/admin/vaccination',    component: Vaccination,       title: 'Vaccination' },
  { path: '/admin/notifications',  component: Notifications,     title: 'Notifications' },
  { path: '/admin/announcements',  component: Announcements,     title: 'Announcements' },
  { path: '/admin/emergency-contacts', component: EmergencyContacts, title: 'Emergency Contacts' },
  { path: '/admin/reports',        component: Reports,           title: 'Reports' },
  { path: '/admin/admin-accounts', component: AdminAccounts,     title: 'Admin Accounts' },
  { path: '/admin/settings',       component: Settings,          title: 'Settings' },
  { path: '/admin/trash',          component: Trash,             title: 'Trash' },
];
