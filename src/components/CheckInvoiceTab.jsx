import React, { useState } from 'react';
import { supabase } from '../utils';

export default function CheckInvoiceTab({ isCompactMode }) {
  const [startInv, setStartInv] = useState('');
  const [endInv, setEndInv] = useState('');
  
  const [isChecking, setIsChecking] = useState(false);
  const [missingList, setMissingList] = useState([]);
  const [stats, setStats] = useState(null);

  const inputStyle = `w-full bg-white border border-gray-900 rounded-lg focus:ring-2 focus:ring-gray-900 focus:outline-none text-gray-800 transition-all font-mono font-bold tracking-wider ${
    isCompactMode ? 'px-2.5 py-1 text-xs' : 'px-3 py-2 text-sm'
  }`;

  const handleCheck = async (e) => {
    e.preventDefault();
    if (startInv.length !== 8 || endInv.length !== 8) {
      return alert("❌ លេខវិក្កយបត្រត្រូវតែមាន ៨ ខ្ទង់គត់!");
    }

    const startNum = parseInt(startInv, 10);
    const endNum = parseInt(endInv, 10);

    if (startNum > endNum) {
      return alert("❌ លេខចាប់ផ្តើម ត្រូវតូចជាងលេខបញ្ចប់!");
    }

    if (endNum - startNum > 10000) {
      return alert("❌ ចន្លោះលេខធំពេក! សូមជ្រើសរើសចន្លោះត្រឹម ១០០០០ លេខបានហើយ។");
    }

    setIsChecking(true);
    setStats(null);
    setMissingList([]);

    try {
      // ទាញយកតែប្រឡោះ id ដើម្បីឱ្យដើរលឿន
      const { data, error } = await supabase
        .from('invoices')
        .select('id')
        .gte('id', startInv)
        .lte('id', endInv);

      if (error) throw error;

      const existingIds = new Set(data.map(inv => parseInt(inv.id, 10)));
      const missing = [];

      for (let i = startNum; i <= endNum; i++) {
        if (!existingIds.has(i)) {
          missing.push(i.toString());
        }
      }

      setMissingList(missing);
      setStats({
        totalExpected: endNum - startNum + 1,
        totalFound: existingIds.size,
        totalMissing: missing.length
      });

    } catch (err) {
      alert("❌ មានបញ្ហា៖ " + err.message);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="flex flex-column gap-4">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-3 border-b border-gray-200">
        <div>
          <h5 className="text-gray-900 font-bold text-base md:text-lg mb-1">🔎 ពិនិត្យលេខវិក្កយបត្របាត់</h5>
          <p className="text-gray-500 text-xs">វាយលេខចាប់ផ្តើម និងបញ្ចប់ ដើម្បីស្វែងរកវិក្កយបត្រដែលរំលង ឬត្រូវបានគេលុប។</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* FORM SECTION (LEFT COLUMN) */}
        <div className="xl:col-span-4">
          <form onSubmit={handleCheck} className={`bg-gray-50 rounded-xl border border-gray-200 space-y-4 ${isCompactMode ? 'p-3' : 'p-4'}`}>
            <div>
              <label className="block text-gray-600 text-[11px] font-bold mb-1">លេខចាប់ផ្តើម (៨ ខ្ទង់) *</label>
              <input 
                type="text" 
                value={startInv} 
                onChange={(e) => { const n = e.target.value.replace(/[^0-9]/g, ''); if (n.length <= 8) setStartInv(n); }} 
                required 
                maxLength="8" 
                pattern="\d{8}" 
                className={inputStyle} 
                placeholder="ឧ. 20260001" 
              />
            </div>

            <div>
              <label className="block text-gray-600 text-[11px] font-bold mb-1">លេខបញ្ចប់ (៨ ខ្ទង់) *</label>
              <input 
                type="text" 
                value={endInv} 
                onChange={(e) => { const n = e.target.value.replace(/[^0-9]/g, ''); if (n.length <= 8) setEndInv(n); }} 
                required 
                maxLength="8" 
                pattern="\d{8}" 
                className={inputStyle} 
                placeholder="ឧ. 20260100" 
              />
            </div>

            <button 
              type="submit" 
              disabled={isChecking} 
              className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-2.5 rounded-lg text-xs shadow transition-colors disabled:opacity-50"
            >
              {isChecking ? 'កំពុងត្រួតពិនិត្យ...' : '🔍 ពិនិត្យឥឡូវនេះ'}
            </button>
          </form>
        </div>

        {/* RESULTS SECTION (RIGHT COLUMN) */}
        <div className="xl:col-span-8">
          {stats ? (
            <div className="flex flex-col h-full space-y-4">
              {/* SUMMARY CARDS */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
                  <div className="text-gray-500 text-xs font-bold mb-1">ចំនួនគួរមានសរុប</div>
                  <div className="text-2xl md:text-3xl font-black text-gray-900 font-mono">{stats.totalExpected}</div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
                  <div className="text-gray-500 text-xs font-bold mb-1">ចំនួនរកឃើញ</div>
                  <div className="text-2xl md:text-3xl font-black text-emerald-600 font-mono">{stats.totalFound}</div>
                </div>

                <div className={`border rounded-xl p-3 text-center text-white ${
                  stats.totalMissing > 0 ? 'bg-rose-600 border-rose-700' : 'bg-emerald-600 border-emerald-700'
                }`}>
                  <div className="text-white/80 text-xs font-bold mb-1">ចំនួនលេខបាត់</div>
                  <div className="text-2xl md:text-3xl font-black font-mono">{stats.totalMissing}</div>
                </div>
              </div>

              {/* MISSING LIST CONTAINER */}
              <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm flex-1 overflow-y-auto max-h-[calc(100vh-280px)]">
                <h6 className="font-bold text-gray-900 text-sm mb-3 border-b border-gray-100 pb-2">📋 បញ្ជីលេខដែលបាត់៖</h6>
                
                {stats.totalMissing === 0 ? (
                  <div className="text-center text-emerald-600 py-10">
                    <div className="text-5xl mb-2">✅</div>
                    <h6 className="font-bold text-base">អស្ចារ្យណាស់! គ្មានលេខវិក្កយបត្រណាមួយបាត់ឡើយ។</h6>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {missingList.map(num => (
                      <span 
                        key={num} 
                        className="bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-lg font-mono text-xs font-bold shadow-sm"
                      >
                        {num}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[250px] border border-gray-200 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 p-8 text-center">
              <div>
                <div className="text-4xl mb-2">🔍</div>
                <h6 className="text-xs font-medium">សូមវាយបញ្ចូលលេខចាប់ផ្តើម និងបញ្ចប់រួចចុច "ពិនិត្យឥឡូវនេះ"</h6>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}