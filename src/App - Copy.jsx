import React, { useState, useEffect } from 'react';
import { supabase } from './utils';

import InvoiceTab from './components/InvoiceTab';
import CustomerTab from './components/CustomerTab';
import ProductTab from './components/ProductTab';
import ReportTab from './components/ReportTab';
import CheckInvoiceTab from './components/CheckInvoiceTab';
import UserTab from './components/UserTab';

export default function App() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isCompactMode, setIsCompactMode] = useState(true);
  const [activeTab, setActiveTab] = useState('');
  
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userTabs, setUserTabs] = useState([]); // ផ្ទុកសិទ្ធិ Checkboxes
  
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => { document.title = "ស្រែមាស - Admin Dashboard"; }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserRole(session.user.id);
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchUserRole(session.user.id);
      else { setUserRole(null); setUserTabs([]); }
    });
  }, []);

  const fetchUserRole = async (userId) => {
    const { data } = await supabase.from('user_roles').select('role, allowed_tabs').eq('user_id', userId).single();
    if (data) {
      setUserRole(data.role);
      const allowed = data.allowed_tabs || [];
      setUserTabs(allowed);
      
      // Auto-Redirect ទៅផ្ទាំងទី១ ដែលគាត់មានសិទ្ធិ
      if (allowed.length > 0 && !allowed.includes(activeTab)) {
        setActiveTab(allowed[0]);
      }
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    if (error) alert("❌ លេខសម្ងាត់មិនត្រឹមត្រូវ: " + error.message);
    setAuthLoading(false);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); };

  if (!session) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
        <div className="card shadow border-0 rounded-4" style={{ maxWidth: '400px', width: '100%' }}>
          <div className="card-header text-center p-4 border-bottom bg-white rounded-top-4">
            <h2 className="fw-black mb-0 text-dark">ស្រែមាស</h2>
            <p className="mb-0 text-muted small mt-1">សូមចូលគណនី</p>
          </div>
          <div className="card-body p-4 p-md-5">
            <form onSubmit={handleLogin}>
              <div className="mb-3"><label className="form-label text-muted small fw-bold">អ៊ីមែល (Email)</label><input type="email" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="form-control bg-light border-0 rounded-3 p-2" /></div>
              <div className="mb-4"><label className="form-label text-muted small fw-bold">លេខសម្ងាត់ (Password)</label><input type="password" required value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="form-control bg-light border-0 rounded-3 p-2" /></div>
              <button type="submit" disabled={authLoading} className="btn btn-dark w-100 fw-bold rounded-3 py-2 shadow-sm">{authLoading ? 'កំពុងភ្ជាប់...' : 'ចូលប្រព័ន្ធ 🔓'}</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ប្រសិនបើអត់មានសិទ្ធិសោះ
  if (userTabs.length === 0) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center min-vh-100 bg-light">
        <h3 className="text-danger fw-bold">🚫 គ្មានសិទ្ធិប្រើប្រាស់</h3>
        <p className="text-muted">គណនីរបស់អ្នកមិនទាន់ត្រូវបានផ្តល់សិទ្ធិឱ្យមើលផ្ទាំងណាមួយឡើយ។</p>
        <button onClick={handleLogout} className="btn btn-dark mt-3">ចាកចេញ (Logout)</button>
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white !important; margin: 0; padding: 0; }
          .card { border: none !important; box-shadow: none !important; }
          .container-fluid { padding: 0 !important; }
          .overflow-auto { overflow: visible !important; max-height: none !important; }
        }
      `}} />

      <div className="container-fluid p-0 min-vh-100 d-flex bg-light" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
        {/* SIDEBAR */}
        <div className="no-print d-flex flex-column flex-shrink-0 bg-white border-end transition-all shadow-sm" style={{ width: isSidebarCollapsed ? '80px' : '260px', minHeight: '100vh', transition: 'width 0.3s ease' }}>
          <div className={`d-flex align-items-center justify-content-between border-bottom w-100 ${isCompactMode ? 'p-2' : 'p-3'}`}>
            {!isSidebarCollapsed && <span className={`${isCompactMode ? 'fs-6' : 'fs-5'} fw-bold text-dark text-truncate px-2`}>🌾 ស្រែមាស</span>}
            <button className={`btn btn-light border-0 mx-auto ${isCompactMode ? 'p-1' : 'p-2'}`} onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}>
              <span className={isCompactMode ? 'fs-6' : 'fs-5'}>☰</span>
            </button>
          </div>
          <ul className="nav nav-pills flex-column mb-auto p-2 gap-1 mt-2">
            
            {/* Conditional Rendering Sidebar Menus based on allowed_tabs */}
            {userTabs.includes('invoice') && (
              <li className="nav-item"><button className={`nav-link w-100 text-start px-3 border-0 fw-bold rounded-3 ${isCompactMode ? 'py-1.5' : 'py-2.5'} ${activeTab === 'invoice' ? 'bg-dark text-white' : 'text-dark hover-bg-light'}`} onClick={() => setActiveTab('invoice')}>📝 {!isSidebarCollapsed && " វិក្កយបត្រ"}</button></li>
            )}
            {userTabs.includes('customer') && (
              <li><button className={`nav-link w-100 text-start px-3 border-0 fw-bold rounded-3 ${isCompactMode ? 'py-1.5' : 'py-2.5'} ${activeTab === 'customer' ? 'bg-dark text-white' : 'text-dark hover-bg-light'}`} onClick={() => setActiveTab('customer')}>👥 {!isSidebarCollapsed && " អតិថិជន"}</button></li>
            )}
            {userTabs.includes('product') && (
              <li><button className={`nav-link w-100 text-start px-3 border-0 fw-bold rounded-3 ${isCompactMode ? 'py-1.5' : 'py-2.5'} ${activeTab === 'product' ? 'bg-dark text-white' : 'text-dark hover-bg-light'}`} onClick={() => setActiveTab('product')}>📦 {!isSidebarCollapsed && " មុខទំនិញ"}</button></li>
            )}
            {userTabs.includes('report') && (
              <li><button className={`nav-link w-100 text-start px-3 border-0 fw-bold rounded-3 ${isCompactMode ? 'py-1.5' : 'py-2.5'} ${activeTab === 'report' ? 'bg-dark text-white' : 'text-dark hover-bg-light'}`} onClick={() => setActiveTab('report')}>📊 {!isSidebarCollapsed && " របាយការណ៍"}</button></li>
            )}
            {userTabs.includes('check') && (
              <li><button className={`nav-link w-100 text-start px-3 border-0 fw-bold rounded-3 ${isCompactMode ? 'py-1.5' : 'py-2.5'} ${activeTab === 'check' ? 'bg-dark text-white' : 'text-dark hover-bg-light'}`} onClick={() => setActiveTab('check')}>🔎 {!isSidebarCollapsed && " ពិនិត្យលេខបាត់"}</button></li>
            )}
            
            {userTabs.includes('users') && (
              <>
                <hr className="my-1 border-secondary opacity-25" />
                <li><button className={`nav-link w-100 text-start px-3 border-0 fw-bold rounded-3 ${isCompactMode ? 'py-1.5' : 'py-2.5'} ${activeTab === 'users' ? 'bg-dark text-white' : 'text-dark hover-bg-light'}`} onClick={() => setActiveTab('users')}>👨‍💻 {!isSidebarCollapsed && " អ្នកប្រើប្រាស់"}</button></li>
              </>
            )}
          </ul>
          
          <div className={`p-3 border-top w-100 ${isSidebarCollapsed ? 'text-center px-2' : ''}`}>
            <button onClick={() => setIsCompactMode(!isCompactMode)} className={`btn btn-sm w-100 rounded fw-bold mb-3 ${isCompactMode ? 'btn-dark' : 'btn-outline-dark'}`}>{isSidebarCollapsed ? (isCompactMode ? '🗜️' : '🖥️') : (isCompactMode ? '🗜️ បិទ Compact' : '🖥️ បើក Compact')}</button>
            {!isSidebarCollapsed && (
              <>
                <div className="badge bg-light text-dark border px-2 py-1 rounded fw-bold text-uppercase mb-2" style={{ fontSize: '10px' }}>{userTabs.includes('users') ? '👑 Admin' : '👤 Staff'}</div>
                <div className="text-muted font-monospace mb-3 truncate" style={{ fontSize: '11px' }}>{session.user.email}</div>
              </>
            )}
            <button onClick={handleLogout} className="btn btn-sm btn-outline-danger w-100 rounded fw-bold">{isSidebarCollapsed ? '🚪' : 'ចាកចេញ'}</button>
          </div>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className={`flex-grow-1 overflow-auto ${isCompactMode ? 'p-2 p-md-3' : 'p-4 p-md-5'}`} style={{ maxHeight: '100vh' }}>
          <div className={`card border-0 shadow-sm bg-white ${isCompactMode ? 'rounded-3 p-3' : 'rounded-4 p-4 p-md-5'}`}>
            {activeTab === 'invoice' && userTabs.includes('invoice') && <InvoiceTab isCompactMode={isCompactMode} />}
            {activeTab === 'customer' && userTabs.includes('customer') && <CustomerTab isCompactMode={isCompactMode} />}
            {activeTab === 'product' && userTabs.includes('product') && <ProductTab isCompactMode={isCompactMode} />}
            {activeTab === 'report' && userTabs.includes('report') && <ReportTab isCompactMode={isCompactMode} />}
            {activeTab === 'check' && userTabs.includes('check') && <CheckInvoiceTab isCompactMode={isCompactMode} />}
            {activeTab === 'users' && userTabs.includes('users') && <UserTab isCompactMode={isCompactMode} />}
          </div>
        </div>
      </div>
    </>
  );
}