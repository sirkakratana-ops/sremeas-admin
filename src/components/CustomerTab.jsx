import React, { useState, useEffect, useMemo } from 'react';
import { supabase, ITEMS_PER_PAGE, fetchAllCustomers } from '../utils';

export default function CustomerTab({ isCompactMode }) {
  const [customers, setCustomers] = useState([]);
  const [searchCust, setSearchCust] = useState('');
  const [filterCustSex, setFilterCustSex] = useState('All');
  const [sortCust, setSortCust] = useState({ key: 'name', dir: 'asc' });
  const [pageCust, setPageCust] = useState(1);

  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custSex, setCustSex] = useState('');
  const [custVillage, setCustVillage] = useState('');
  const [custCommune, setCustCommune] = useState('');
  const [custDistrict, setCustDistrict] = useState('');
  const [custProvince, setCustProvince] = useState('');
  const [custCrop, setCustCrop] = useState('');
  const [editingCustomerId, setEditingCustomerId] = useState(null);

  useEffect(() => { fetchCustomers(); }, []);
  useEffect(() => { setPageCust(1); }, [searchCust, filterCustSex, sortCust]);

  const fetchCustomers = async () => {
    const data = await fetchAllCustomers();
    if (data) setCustomers(data);
  };

  const submitCustomer = async (e) => {
    e.preventDefault();
    const cleanPhone = custPhone.replace(/[^0-9+]/g, '');
    const calculatedId = cleanPhone.replace(/^\+?855/, '');
    const customerData = { name: custName, phone: cleanPhone, sex: custSex || null, village: custVillage || null, commune: custCommune || null, district: custDistrict || null, province: custProvince || null, crop: custCrop || null };
    try {
      if (editingCustomerId) await supabase.from('customers').update(customerData).eq('id', editingCustomerId);
      else await supabase.from('customers').insert([{ id: calculatedId, ...customerData }]);
      alert("✅ រក្សាទុកអតិថិជនជោគជ័យ!");
      resetForm(); fetchCustomers();
    } catch (err) { alert(err.message); }
  };

  const deleteCustomer = async (id, name) => {
    if (!window.confirm(`តើអ្នកពិតជាចង់លុបអតិថិជនឈ្មោះ ${name} មែនទេ?`)) return;
    try {
      const { error } = await supabase.from('customers').delete().eq('id', id);
      if (error) throw error;
      alert("✅ បានលុបអតិថិជន!");
      if (editingCustomerId === id) resetForm();
      fetchCustomers();
    } catch (err) { alert("❌ មិនអាចលុបបានទេ (អាចដោយសារគាត់មានវិក្កយបត្រក្នុងប្រព័ន្ធ)៖ " + err.message); }
  };

  const resetForm = () => {
    setEditingCustomerId(null); setCustName(''); setCustPhone(''); setCustSex('');
    setCustVillage(''); setCustCommune(''); setCustDistrict(''); setCustProvince(''); setCustCrop('');
  };

  const handleSort = (key) => setSortCust({ key, dir: sortCust.key === key && sortCust.dir === 'asc' ? 'desc' : 'asc' });

  const sortedCustomers = useMemo(() => {
    const term = (searchCust || '').trim().toLowerCase();
    let filtered = customers.filter(c => {
      const matchSearch = !term ||
        (c.name || '').toLowerCase().includes(term) ||
        (c.phone || '').toLowerCase().includes(term) ||
        (c.id || '').toString().toLowerCase().includes(term) ||
        (c.village || '').toLowerCase().includes(term) ||
        (c.commune || '').toLowerCase().includes(term) ||
        (c.district || '').toLowerCase().includes(term) ||
        (c.province || '').toLowerCase().includes(term);
      const matchSex = filterCustSex === 'All' || c.sex === filterCustSex;
      return matchSearch && matchSex;
    });
    return filtered.sort((a, b) => {
      const valA = a[sortCust.key] || '';
      const valB = b[sortCust.key] || '';
      if (valA < valB) return sortCust.dir === 'asc' ? -1 : 1;
      if (valA > valB) return sortCust.dir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [customers, searchCust, sortCust, filterCustSex]);

  const paginatedCustomers = sortedCustomers.slice((pageCust - 1) * ITEMS_PER_PAGE, pageCust * ITEMS_PER_PAGE);

  const inputStyle = `w-full bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-800 transition-all ${isCompactMode ? 'px-2.5 py-1 text-xs' : 'px-3 py-2 text-sm'}`;
  const selectStyle = `w-full bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-800 transition-all ${isCompactMode ? 'px-2.5 py-1 text-xs' : 'px-3 py-2 text-sm'}`;

  return (
    <div className={`grid grid-cols-1 xl:grid-cols-12 ${isCompactMode ? 'gap-4' : 'gap-6'}`}>
      
      {/* FORM SECTION (LEFT COLUMN) */}
      <div className="xl:col-span-4 xl:border-r xl:border-gray-200 xl:pr-6">
        <h6 className="text-gray-900 font-bold text-base mb-3">
          {editingCustomerId ? '⚙️ កែប្រែអតិថិជន' : '➕ បន្ថែមអតិថិជនថ្មី'}
        </h6>

        <form onSubmit={submitCustomer} className={`bg-gray-50 rounded-xl border border-gray-200 grid grid-cols-12 gap-2.5 ${isCompactMode ? 'p-3' : 'p-4'}`}>
          <div className="col-span-8">
            <label className="block text-gray-600 text-[11px] font-bold mb-1">ឈ្មោះអតិថិជន *</label>
            <input type="text" value={custName} onChange={(e) => setCustName(e.target.value)} required className={inputStyle} />
          </div>

          <div className="col-span-4">
            <label className="block text-gray-600 text-[11px] font-bold mb-1">ភេទ</label>
            <select value={custSex} onChange={(e) => setCustSex(e.target.value)} className={selectStyle}>
              <option value="">(ជ្រើស)</option>
              <option value="ប្រុស">ប្រុស</option>
              <option value="ស្រី">ស្រី</option>
            </select>
          </div>

          <div className="col-span-12">
            <label className="block text-gray-600 text-[11px] font-bold mb-1">លេខទូរស័ព្ទ *</label>
            <input type="text" value={custPhone} onChange={(e) => setCustPhone(e.target.value)} required className={`${inputStyle} font-mono`} placeholder="+855..." />
          </div>

          <div className="col-span-12">
            <label className="block text-gray-600 text-[11px] font-bold mb-1">ដំណាំដាំដុះ</label>
            <input type="text" value={custCrop} onChange={(e) => setCustCrop(e.target.value)} className={inputStyle} placeholder="ស្រូវ, ស្វាយចន្ទី..." />
          </div>

          <div className="col-span-12 mt-1">
            <span className="block text-gray-900 text-xs font-bold border-b border-gray-200 pb-1 mb-2">📍 អាសយដ្ឋាន (ស្រេចចិត្ត)</span>
            <div className="grid grid-cols-2 gap-1.5">
              <input type="text" value={custVillage} onChange={(e) => setCustVillage(e.target.value)} className={inputStyle} placeholder="ភូមិ" />
              <input type="text" value={custCommune} onChange={(e) => setCustCommune(e.target.value)} className={inputStyle} placeholder="ឃុំ" />
              <input type="text" value={custDistrict} onChange={(e) => setCustDistrict(e.target.value)} className={inputStyle} placeholder="ស្រុក" />
              <input type="text" value={custProvince} onChange={(e) => setCustProvince(e.target.value)} className={inputStyle} placeholder="ខេត្ត" />
            </div>
          </div>

          <div className="col-span-12 flex gap-2 mt-2">
            {editingCustomerId && (
              <button type="button" onClick={resetForm} className="w-1/2 border border-gray-300 text-gray-700 hover:bg-gray-100 font-bold py-2 rounded-lg text-xs transition-colors">
                បោះបង់
              </button>
            )}
            <button type="submit" className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-2 rounded-lg text-xs shadow transition-colors">
              💾 រក្សាទុក
            </button>
          </div>
        </form>
      </div>

      {/* TABLE SECTION (RIGHT COLUMN) */}
      <div className="xl:col-span-8 flex flex-col h-full">
        <h6 className="text-gray-900 font-bold text-base mb-3">🔍 បញ្ជីអតិថិជនទាំងអស់</h6>
        
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-gray-400">🔎</span>
            <input 
              type="text" 
              value={searchCust} 
              onChange={(e) => setSearchCust(e.target.value)} 
              placeholder="វាយរកតាមឈ្មោះ លេខទូរស័ព្ទ ឬ ID..." 
              className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900" 
            />
          </div>

          <select 
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 w-28" 
            value={filterCustSex} 
            onChange={e => setFilterCustSex(e.target.value)}
          >
            <option value="All">គ្រប់ភេទ</option>
            <option value="ប្រុស">ប្រុស</option>
            <option value="ស្រី">ស្រី</option>
          </select>
        </div>

        {/* TABLE CONTAINER */}
        <div className="border border-gray-200 rounded-xl shadow-sm bg-white flex flex-col flex-1 overflow-hidden">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-200 sticky top-0">
                <tr className="cursor-pointer">
                  <th className="py-2.5 px-4" onClick={() => handleSort('name')}>ឈ្មោះ / ភេទ</th>
                  <th className="py-2.5 px-3" onClick={() => handleSort('phone')}>លេខទូរស័ព្ទ</th>
                  <th className="py-2.5 px-3" onClick={() => handleSort('crop')}>ដំណាំ</th>
                  <th className="py-2.5 px-3" onClick={() => handleSort('province')}>អាសយដ្ឋាន</th>
                  <th className="py-2.5 px-4 text-center">សកម្មភាព</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedCustomers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-gray-400">មិនមានទិន្នន័យទេ</td>
                  </tr>
                ) : (
                  paginatedCustomers.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-2.5 px-4">
                        <strong className="text-gray-900 block">{c.name}</strong>
                        <span className="text-gray-400 font-mono text-[10px]">
                          {c.sex || '—'}{c.id ? ` • ID: ${c.id}` : ''}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-gray-600">{c.phone}</td>
                      <td className="py-2.5 px-3">
                        <span className="inline-block bg-gray-100 text-gray-700 border border-gray-200 px-2 py-0.5 rounded text-[10px] font-bold">
                          {c.crop || '—'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-gray-500 text-[11px]">
                        {c.village || c.commune || c.district || c.province 
                          ? `${c.village||'-'}, ${c.commune||'-'}, ${c.district||'-'}, ${c.province||'-'}` 
                          : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button 
                            className="p-1 text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded transition-colors" 
                            onClick={() => {
                              setEditingCustomerId(c.id); setCustName(c.name); setCustPhone(c.phone); setCustSex(c.sex || '');
                              setCustVillage(c.village || ''); setCustCommune(c.commune || ''); setCustDistrict(c.district || ''); setCustProvince(c.province || ''); setCustCrop(c.crop || '');
                            }} 
                            title="កែប្រែ"
                          >
                            ✏️
                          </button>
                          <button 
                            className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 border border-transparent rounded transition-colors" 
                            onClick={() => deleteCustomer(c.id, c.name)} 
                            title="លុប"
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
          {sortedCustomers.length > 0 && (
            <div className="flex items-center justify-between p-2.5 border-t border-gray-200 text-xs text-gray-600 no-print">
              <span className="font-bold">សរុប៖ {sortedCustomers.length}</span>
              <div className="flex items-center gap-2">
                <button 
                  className="px-2.5 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40 transition-colors" 
                  disabled={pageCust <= 1} 
                  onClick={() => setPageCust(pageCust - 1)}
                >
                  ⬅️ មុន
                </button>
                <span className="font-mono font-bold text-gray-800">{pageCust} / {Math.ceil(sortedCustomers.length / ITEMS_PER_PAGE)}</span>
                <button 
                  className="px-2.5 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40 transition-colors" 
                  disabled={pageCust >= Math.ceil(sortedCustomers.length / ITEMS_PER_PAGE)} 
                  onClick={() => setPageCust(pageCust + 1)}
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
