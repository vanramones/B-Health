const fs = require('fs');
const old = fs.readFileSync('C:/B-Health/frontend/src/components/Header.jsx', 'utf8');

// Find the Header function and replace it
const headerStart = 'const Header = ({ title, onMenuClick }) => {';
const headerEnd = 'export default Header;';
const idx = old.indexOf(headerStart);
const before = old.substring(0, idx);
const after = old.substring(old.indexOf(headerEnd));

const newHeader = \const Header = ({ title, onMenuClick }) => {
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const performSearch = useCallback(async (q) => {
    if (!q.trim()) { setSearchResults([]); setSearchLoading(false); return; }
    setSearchLoading(true);
    try {
      const [residents, healthRecords, appointments, services] = await Promise.all([
        api.get('/residents'),
        api.get('/health-records'),
        api.get('/appointments'),
        api.get('/services'),
      ]);
      const query = q.toLowerCase().trim();
      const results = [];
      (Array.isArray(residents) ? residents : []).forEach((r) => {
        if (r.name?.toLowerCase().includes(query) || r.condition?.toLowerCase().includes(query) || r.address?.toLowerCase().includes(query))
          results.push({ type: 'Resident', label: r.name, sub: (r.condition||'Healthy')+' - '+(r.address||'N/A'), path: '/admin/residents', id: r.id });
      });
      (Array.isArray(healthRecords) ? healthRecords : []).forEach((h) => {
        if (h.patient?.toLowerCase().includes(query) || h.diagnosis?.toLowerCase().includes(query) || h.doctor?.toLowerCase().includes(query))
          results.push({ type: 'Health Record', label: h.patient, sub: h.diagnosis+' - Dr. '+h.doctor, path: '/admin/health-records', id: h.id });
      });
      (Array.isArray(appointments) ? appointments : []).forEach((a) => {
        if (a.name?.toLowerCase().includes(query) || a.service?.toLowerCase().includes(query)) {
          const d = a.date ? new Date(a.date).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : 'N/A';
          results.push({ type: 'Appointment', label: a.name, sub: a.service+' - '+d+' at '+a.time, path: '/admin/appointments', id: a.id });
        }
      });
      (Array.isArray(services) ? services : []).forEach((s) => {
        if (s.name?.toLowerCase().includes(query) || s.category?.toLowerCase().includes(query))
          results.push({ type: 'Service', label: s.name, sub: s.category+' - '+(s.schedule||'N/A'), path: '/admin/services', id: s.id });
      });
      setSearchResults(results.slice(0, 20));
    } catch { setSearchResults([]); }
    setSearchLoading(false);
  }, []);

  useEffect(() => { const d = setTimeout(() => performSearch(searchQuery), 300); return () => clearTimeout(d); }, [searchQuery, performSearch]);
  useEffect(() => {
    if (!showSearch) return;
    const h = (e) => { if (searchRef.current && !searchRef.current.contains(e.target)) setShowSearch(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showSearch]);

  const handleResultClick = (r) => { setShowSearch(false); setSearchQuery(''); navigate(r.path); };
  const groupResults = searchResults.reduce((a,r) => { if(!a[r.type]) a[r.type]=[]; a[r.type].push(r); return a; }, {});

  return (
    <Navbar bg="white" className="px-3 px-lg-4 flex-shrink-0" style={{ height: 60, borderBottom: '1px solid #ccfbf1', boxShadow: '0 1px 4px rgba(15,118,110,0.04)' }}>
      <div className="d-flex align-items-center gap-2 gap-lg-3">
        <Button variant="light" size="sm" className="d-lg-none border-0 p-2 rounded-3" style={{ backgroundColor: '#f0fdfa' }} onClick={onMenuClick}><Menu size={20} color="#0d9488" /></Button>
        <Navbar.Brand className="fw-bold mb-0 d-flex align-items-center gap-2" style={{ fontSize: 16, color: '#0f766e' }}>
          <span className="d-none d-sm-flex align-items-center justify-content-center rounded-2" style={{ width: 28, height: 28, backgroundColor: '#ccfbf1', color: '#0f766e' }}><Stethoscope size={15} strokeWidth={2.5} /></span>
          <span style={{ color: '#111827' }}>{title}</span>
        </Navbar.Brand>
        <span className="d-none d-xl-inline-flex align-items-center gap-1" style={{ fontSize: 11, fontWeight: 600, color: '#0f766e', backgroundColor: '#f0fdfa', border: '1px solid #99f6e4', padding: '4px 10px', borderRadius: 999 }}><MapPin size={11} /> Brgy. Health Center</span>
      </div>
      <div className="d-flex align-items-center gap-2 ms-auto">
        <div className="position-relative d-none d-md-block" ref={searchRef}>
          <InputGroup size="sm" style={{ width: 240 }}>
            <InputGroup.Text className="border-end-0" style={{ borderColor: '#ccfbf1', backgroundColor: '#f0fdfa' }}><Search size={14} color="#0d9488" /></InputGroup.Text>
            <Form.Control placeholder="Search residents, records..." className="border-start-0" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setShowSearch(true); }} onFocus={() => { if (searchQuery.trim()) setShowSearch(true); }} style={{ borderColor: '#ccfbf1', backgroundColor: '#f0fdfa', fontSize: 13 }} />
          </InputGroup>
          {showSearch && searchQuery.trim() && (
            <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', zIndex: 9999, width: 380, backgroundColor: '#fff', borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.14)', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
              {searchLoading ? (
                <div className="text-center py-4" style={{ fontSize: 13, color: '#9ca3af' }}>Searching...</div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-4" style={{ fontSize: 13, color: '#9ca3af' }}>No results found for "{searchQuery}"</div>
              ) : (
                <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                  {Object.entries(groupResults).map(([type, items]) => (
                    <div key={type}>
                      <div style={{ padding: '6px 14px 4px', backgroundColor: '#f0fdfa', borderBottom: '1px solid #ccfbf1' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#0f766e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{type}{type.endsWith('s')?'':'s'} ({items.length})</span>
                      </div>
                      {items.map((r, i) => (
                        <div key={\\_\_\\} style={{ padding: '10px 14px', borderBottom: '1px solid #f9fafb', cursor: 'pointer' }} onClick={() => handleResultClick(r)} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0fdfa'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{r.label}</div>
                          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>{r.sub}</div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <NotificationBell />
        <Button variant="light" size="sm" className="d-none d-sm-flex border-0 p-2 rounded-3" style={{ backgroundColor: '#f0fdfa' }}><Settings size={17} color="#0d9488" /></Button>
      </div>
    </Navbar>
  );
};

\;

const result = before + newHeader + after;
fs.writeFileSync('C:/B-Health/frontend/src/components/Header.jsx', result);
console.log('OK - wrote', result.length, 'bytes');
