import React, { useState, useEffect, useMemo } from 'react';
import { supabase, ITEMS_PER_PAGE } from '../utils';
import { createClient } from '@supabase/supabase-js';

// បង្កើត Client ទី២ ដើម្បីកុំឱ្យដាច់ Session របស់ Admin ពេលកំពុងបង្កើតគណនីថ្មី
const SUPABASE_URL = "https://hllsxqjyyoewkbgmwizs.supabase.co";
const SUPABASE_KEY = "sb_publishable_KZbdTXvOcVfnsd9kzEgzAQ_u4T8h2Bt";
const authSupabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

export default function UserTab({ isCompactMode }) {
  const [users, setUsers] = useState([]);
  const [searchUser, setSearchUser] = useState('');
  const [pageUser, setPageUser] = useState(1);

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('staff');
  const [editingUserId, setEditingUserId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase.from('user_roles').select('*').order('email', { ascending: true });
    if (data) setUsers(data);
    if (error) console.error(error);
  };

  const submitUser = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingUserId) {
        // កែប្រែតែតួនាទី (Role) ប៉ុណ្ណោះ
        const { error } = await supabase.from('user_roles').update({ role }).eq('user_id', editingUserId);
        if (error) throw error;
        alert("✅ បានកែប្រែសិទ្ធិជោគជ័យ!");
      } else {
        // បង្កើតគណនីថ្មីក្នុង Auth
        const { data: authData, error: authError } = await authSupabase.auth.signUp({
          email: email,
          password: password,
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("មិនអាចបង្កើតគណនីបានទេ!");

        // រក្សាទុកចូលក្នុងតារាងសិទ្ធិ (user_roles) រួមទាំងអ៊ីមែល
        const { error: roleError } = await supabase.from('user_roles').insert([
          { user_id: authData.user.id, email: email, role: role }
        ]);

        if (roleError) throw roleError;
        alert("✅ បានបង្កើតគណនីបុគ្គលិកថ្មីជោគជ័យ!");
      }

      resetForm();
      fetchUsers();
    } catch (err) {
      alert("❌ មានបញ្ហា៖ " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (id, userEmail) => {
    const displayEmail = userEmail || id;
    if (!window.confirm(`តើអ្នកពិតជាចង់ដកសិទ្ធិប្រើប្រាស់របស់គណនី ${displayEmail} មែនទេ?\n(គណនីនេះនឹងលែងអាចមើលឃើញទិន្នន័យក្នុងប្រព័ន្ធទៀតហើយ)`)) return;
    try {
      const { error } = await supabase.from('user_roles').delete().eq('user_id', id);
      if (error) throw error;
      alert("✅ បានលុបសិទ្ធិប្រើប្រាស់!");
      if (editingUserId === id) resetForm();
      fetchUsers();
    } catch (err) {
      alert("❌ មិនអាចលុបបានទេ៖ " + err.message);
    }
  };

  const resetForm = () => {
    setEditingUserId(null);
    setEmail('');
    setPassword('');
    setRole('staff');
  };

  // ✅ ស្វែងរកដោយការពារតម្លៃ Null
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const userEmail = u.email || u.user_id || '';
      return userEmail.toLowerCase().includes(searchUser.toLowerCase());
    });
  }, [users, searchUser]);

  const paginatedUsers = filteredUsers.slice((pageUser - 1) * ITEMS_PER_PAGE, pageUser * ITEMS_PER_PAGE);

  const inputStyle = `w-full bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-800 transition-all ${isCompactMode ? 'px-2.5 py-1 text-xs' : 'px-3 py-2 text-sm'}`;
  const selectStyle = `w-full bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-800 transition-all ${isCompactMode ? 'px-2.5 py-1 text-xs' : 'px-3 py-2 text-sm'}`;

  return (
    <div className={`grid grid-cols-1 xl:grid-cols-12 ${isCompactMode ? 'gap-4' : 'gap-6'}`}>
      
      {/* FORM SECTION (LEFT COLUMN) */}
      <div className="xl:col-span-4 xl:border-r xl:border-gray-200 xl:pr-6">
        <h6 className="text-gray-900 font-bold text-base mb-3">
          {editingUserId ? '⚙️ កែប្រែសិទ្ធិអ្នកប្រើប្រាស់' : '➕ បង្កើតគណនីថ្មី'}
        </h6>

        <form onSubmit={submitUser} className={`bg-gray-50 rounded-xl border border-gray-200 space-y-3 ${isCompactMode ? 'p-3' : 'p-4'}`}>
          <div>
            <label className="block text-gray-600 text-[11px] font-bold mb-1">អ៊ីមែល (Email) *</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              disabled={!!editingUserId} 
              className={`${inputStyle} disabled:bg-gray-100 disabled:text-gray-500`} 
              placeholder="staff@sremeas.com" 
            />
          </div>

          {!editingUserId && (
            <div>
              <label className="block text-gray-600 text-[11px] font-bold mb-1">លេខសម្ងាត់ (Password) *</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                minLength="6" 
                className={inputStyle} 
                placeholder="យ៉ាងហោច ៦ ខ្ទង់..." 
              />
            </div>
          )}

          <div>
            <label className="block text-gray-600 text-[11px] font-bold mb-1">តួនាទី (Role) *</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className={selectStyle}>
              <option value="staff">បុគ្គលិក (Staff) - មើលបានតែវិក្កយបត្រ</option>
              <option value="admin">មេ (Admin) - មើលបានទាំងអស់</option>
            </select>
          </div>

          <div className="flex gap-2 pt-1">
            {editingUserId && (
              <button 
                type="button" 
                onClick={resetForm} 
                className="w-1/2 border border-gray-300 text-gray-700 hover:bg-gray-100 font-bold py-2 rounded-lg text-xs transition-colors"
              >
                បោះបង់
              </button>
            )}
            <button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-2 rounded-lg text-xs shadow transition-colors disabled:opacity-50"
            >
              {loading ? 'កំពុងដំណើរការ...' : '💾 រក្សាទុក'}
            </button>
          </div>
        </form>
      </div>

      {/* TABLE SECTION (RIGHT COLUMN) */}
      <div className="xl:col-span-8 flex flex-col h-full">
        <h6 className="text-gray-900 font-bold text-base mb-3">🔍 បញ្ជីអ្នកប្រើប្រាស់ទាំងអស់</h6>
        
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-gray-400">🔎</span>
            <input 
              type="text" 
              value={searchUser} 
              onChange={(e) => setSearchUser(e.target.value)} 
              placeholder="ស្វែងរកតាមអ៊ីមែល..." 
              className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900" 
            />
          </div>
        </div>

        {/* TABLE CONTAINER */}
        <div className="border border-gray-200 rounded-xl shadow-sm bg-white flex flex-col flex-1 overflow-hidden">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="py-2.5 px-4">អ៊ីមែល (Email) / User ID</th>
                  <th className="py-2.5 px-3 text-center">តួនាទី (Role)</th>
                  <th className="py-2.5 px-4 text-center">សកម្មភាព</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="py-8 text-center text-gray-400">មិនមានទិន្នន័យទេ</td>
                  </tr>
                ) : (
                  paginatedUsers.map(u => (
                    <tr key={u.user_id} className="hover:bg-gray-50/80 transition-colors">
                      {/* ✅ បង្ហាញ Email ប្រសិនបើមាន ឬបង្ហាញ User ID បើគ្មាន Email */}
                      <td className="py-2.5 px-4 font-bold text-gray-900">
                        {u.email ? (
                          u.email
                        ) : (
                          <div>
                            <span className="text-gray-400 italic text-[11px] font-normal block">(គ្មានអ៊ីមែល)</span>
                            <span className="text-gray-500 font-mono text-[10px]">{u.user_id}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                          u.role === 'admin' 
                            ? 'bg-rose-50 text-rose-700 border-rose-200' 
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {u.role === 'admin' ? '👑 Admin' : '👤 Staff'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button 
                            className="p-1 text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded transition-colors" 
                            onClick={() => { setEditingUserId(u.user_id); setEmail(u.email || ''); setRole(u.role); }} 
                            title="កែប្រែសិទ្ធិ"
                          >
                            ✏️
                          </button>
                          <button 
                            className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 border border-transparent rounded transition-colors" 
                            onClick={() => deleteUser(u.user_id, u.email)} 
                            title="លុបសិទ្ធិ"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          {filteredUsers.length > 0 && (
            <div className="flex items-center justify-between p-2.5 border-t border-gray-200 text-xs text-gray-600 no-print">
              <span className="font-bold">សរុប៖ {filteredUsers.length}</span>
              <div className="flex items-center gap-2">
                <button 
                  className="px-2.5 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40 transition-colors" 
                  disabled={pageUser <= 1} 
                  onClick={() => setPageUser(pageUser - 1)}
                >
                  ⬅️ មុន
                </button>
                <span className="font-mono font-bold text-gray-800">{pageUser} / {Math.ceil(filteredUsers.length / ITEMS_PER_PAGE)}</span>
                <button 
                  className="px-2.5 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40 transition-colors" 
                  disabled={pageUser >= Math.ceil(filteredUsers.length / ITEMS_PER_PAGE)} 
                  onClick={() => setPageUser(pageUser + 1)}
                >
                  បន្ទាប់ ➡️
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}