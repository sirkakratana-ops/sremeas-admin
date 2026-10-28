import React, { useState, useEffect } from 'react';
import { supabase } from './utils';

import InvoiceTab from './components/InvoiceTab';
import CustomerTab from './components/CustomerTab';
import ProductTab from './components/ProductTab';
import ReportTab from './components/ReportTab';
import UserTab from './components/UserTab';

export default function App() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isCompactMode, setIsCompactMode] = useState(true);
  const [activeTab, setActiveTab] = useState('invoice');
  
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userPerms, setUserPerms] = useState({});
  
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => { document.title = "SM - Admin Dashboard"; }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserRole(session.user.id);
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchUserRole(session.user.id);
      else {
        setUserRole(null);
        setUserPerms({});
      }
    });
  }, []);

  const fetchUserRole = async (userId) => {
    const { data } = await supabase.from('user_roles').select('*').eq('user_id', userId).single();
    if (data) {
      setUserRole(data.role);
      setUserPerms(data.permissions || {});
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

  // --- LOGIN SCREEN (TAILWIND CSS) ---
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4 font-sans">
        <div className="bg-white shadow-xl rounded-2xl border border-gray-100 w-full max-w-md overflow-hidden">
          <div className="text-center p-6 border-b border-gray-100 bg-white">
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">SM</h2>
            <p className="text-gray-500 text-sm mt-1">សូមចូលគណនី (Login)</p>
          </div>
          <div className="p-6 md:p-8">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-gray-600 text-xs font-bold mb-1 uppercase tracking-wider">អ៊ីមែល (Email)</label>
                <input 
                  type="email" 
                  required 
                  value={loginEmail} 
                  onChange={(e) => setLoginEmail(e.target.value)} 
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all" 
                  placeholder="name@sremeas.com"
                />
              </div>
              <div>
                <label className="block text-gray-600 text-xs font-bold mb-1 uppercase tracking-wider">លេខសម្ងាត់ (Password)</label>
                <input 
                  type="password" 
                  required 
                  value={loginPassword} 
                  onChange={(e) => setLoginPassword(e.target.value)} 
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all" 
                  placeholder="••••••••"
                />
              </div>
              <button 
                type="submit" 
                disabled={authLoading} 
                className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-2.5 rounded-lg shadow-sm hover:shadow transition-all disabled:opacity-50 text-sm"
              >
                {authLoading ? 'កំពុងភ្ជាប់...' : 'ចូលប្រព័ន្ធ 🔓'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // --- MAIN APP DASHBOARD (TAILWIND CSS) ---
  return (
    <div className="min-h-screen flex bg-gray-100 font-sans antialiased">
      
      {/* SIDEBAR */}
      <aside 
        className={`no-print flex flex-col flex-shrink-0 bg-white border-r border-gray-200 shadow-sm transition-all duration-300 ${
          isSidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Header Logo */}
        <div className={`flex items-center justify-between border-b border-gray-200 ${isCompactMode ? 'p-2.5' : 'p-4'}`}>
          {!isSidebarCollapsed && (
            <span className="text-lg font-bold text-gray-900 truncate px-2">🌾 SM</span>
          )}
          <button 
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors mx-auto" 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            title="Toggle Sidebar"
          >
            ☰
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 p-2 space-y-1 mt-2">
          {(userRole === 'admin' || userPerms.invoice) && (
            <button 
              onClick={() => setActiveTab('invoice')}
              className={`w-full flex items-center px-3 font-bold rounded-lg text-sm transition-all ${
                isCompactMode ? 'py-2' : 'py-3'
              } ${
                activeTab === 'invoice' 
                  ? 'bg-gray-900 text-white shadow-sm' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="text-base">📝</span>
              {!isSidebarCollapsed && <span className="ml-3 truncate">វិក្កយបត្រ</span>}
            </button>
          )}

          {(userRole === 'admin' || userPerms.customer) && (
            <button 
              onClick={() => setActiveTab('customer')}
              className={`w-full flex items-center px-3 font-bold rounded-lg text-sm transition-all ${
                isCompactMode ? 'py-2' : 'py-3'
              } ${
                activeTab === 'customer' 
                  ? 'bg-gray-900 text-white shadow-sm' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="text-base">👥</span>
              {!isSidebarCollapsed && <span className="ml-3 truncate">អតិថិជន</span>}
            </button>
          )}

          {(userRole === 'admin' || userPerms.product) && (
            <button 
              onClick={() => setActiveTab('product')}
              className={`w-full flex items-center px-3 font-bold rounded-lg text-sm transition-all ${
                isCompactMode ? 'py-2' : 'py-3'
              } ${
                activeTab === 'product' 
                  ? 'bg-gray-900 text-white shadow-sm' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="text-base">📦</span>
              {!isSidebarCollapsed && <span className="ml-3 truncate">មុខទំនិញ</span>}
            </button>
          )}

          {(userRole === 'admin' || userPerms.report) && (
            <button 
              onClick={() => setActiveTab('report')}
              className={`w-full flex items-center px-3 font-bold rounded-lg text-sm transition-all ${
                isCompactMode ? 'py-2' : 'py-3'
              } ${
                activeTab === 'report' 
                  ? 'bg-gray-900 text-white shadow-sm' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="text-base">📊</span>
              {!isSidebarCollapsed && <span className="ml-3 truncate">របាយការណ៍</span>}
            </button>
          )}

          {(userRole === 'admin' || userPerms.users) && (
            <button 
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center px-3 font-bold rounded-lg text-sm transition-all ${
                isCompactMode ? 'py-2' : 'py-3'
              } ${
                activeTab === 'users' 
                  ? 'bg-gray-900 text-white shadow-sm' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="text-base">🛡️</span>
              {!isSidebarCollapsed && <span className="ml-3 truncate">អ្នកប្រើប្រាស់</span>}
            </button>
          )}
        </nav>

        {/* Footer Actions */}
        <div className={`p-3 border-t border-gray-200 ${isSidebarCollapsed ? 'text-center' : ''}`}>
          <button 
            onClick={() => setIsCompactMode(!isCompactMode)} 
            className={`w-full mb-3 text-xs font-bold py-1.5 px-2 rounded transition-colors ${
              isCompactMode 
                ? 'bg-gray-900 text-white hover:bg-gray-800' 
                : 'border border-gray-300 text-gray-700 hover:bg-gray-100'
            }`}
          >
            {isSidebarCollapsed ? (isCompactMode ? '🗜️' : '🖥️') : (isCompactMode ? '🗜️ បិទ Compact' : '🖥️ បើក Compact')}
          </button>

          {!isSidebarCollapsed && (
            <div className="mb-3 space-y-1">
              <span className="inline-block bg-gray-100 text-gray-800 text-[10px] font-extrabold px-2 py-0.5 rounded border border-gray-200 uppercase">
                {userRole === 'admin' ? '👑 Admin' : '👤 Staff'}
              </span>
              <p className="text-gray-500 text-[11px] font-mono truncate">{session.user.email}</p>
            </div>
          )}

          <button 
            onClick={handleLogout} 
            className="w-full text-xs font-bold text-red-600 border border-red-200 hover:bg-red-50 py-1.5 rounded transition-colors"
          >
            {isSidebarCollapsed ? '🚪' : 'ចាកចេញ'}
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className={`flex-1 overflow-y-auto ${isCompactMode ? 'p-2 md:p-4' : 'p-4 md:p-8'}`} style={{ maxHeight: '100vh' }}>
        <div className={`bg-white shadow-sm border border-gray-200 ${isCompactMode ? 'rounded-xl p-4' : 'rounded-2xl p-6 md:p-8'}`}>
          {activeTab === 'invoice' && <InvoiceTab isCompactMode={isCompactMode} />}
          {activeTab === 'customer' && <CustomerTab isCompactMode={isCompactMode} />}
          {activeTab === 'product' && <ProductTab isCompactMode={isCompactMode} />}
          {activeTab === 'report' && <ReportTab isCompactMode={isCompactMode} />}
          {activeTab === 'users' && <UserTab isCompactMode={isCompactMode} />}
        </div>
      </main>

    </div>
  );
}