import React, { useState, useEffect, useMemo } from 'react';
import { supabase, ITEMS_PER_PAGE } from '../utils';

export default function ReportTab({ isCompactMode }) {
  const [invoices, setInvoices] = useState([]);
  const [pageRep, setPageRep] = useState(1);

  const todayStr = new Date().toISOString().split('T')[0];
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const [reportStartDate, setReportStartDate] = useState(firstDayOfMonth);
  const [reportEndDate, setReportEndDate] = useState(todayStr);
  
  // State សម្រាប់កំណត់តម្រងសាខា
  const [filterBranch, setFilterBranch] = useState('All');

  useEffect(() => { 
    fetchInvoices(); 
  }, [reportStartDate, reportEndDate]);
  
  // ពេលដូរថ្ងៃខែ ឬដូរសាខា ត្រូវ Reset លេខទំព័រទៅ ១ វិញ
  useEffect(() => { setPageRep(1); }, [reportStartDate, reportEndDate, filterBranch]);

  const fetchInvoices = async () => {
    if (!reportStartDate || !reportEndDate) return;
    let all = [];
    let from = 0;
    const step = 1000;
    while (true) {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, customers(name)')
        .gte('invoice_date', `${reportStartDate}T00:00:00`)
        .lte('invoice_date', `${reportEndDate}T23:59:59`)
        .order('invoice_date', { ascending: false })
        .range(from, from + step - 1);

      if (error) {
        console.error("Error fetching report invoices:", error);
        break;
      }
      if (data && data.length > 0) {
        all = all.concat(data);
        if (data.length < step) break;
        from += step;
      } else {
        break;
      }
    }
    setInvoices(all);
  };

  const setPresetDate = (type) => {
    const today = new Date();
    const endStr = today.toISOString().split('T')[0];
    let startObj = new Date();
    if (type === 'week') startObj.setDate(startObj.getDate() - 7);
    else if (type === 'month') startObj = new Date(today.getFullYear(), today.getMonth(), 1);
    else if (type === 'year') startObj = new Date(today.getFullYear(), 0, 1);
    setReportStartDate(startObj.toISOString().split('T')[0]);
    setReportEndDate(endStr);
  };

  // ទាញយកបញ្ជីឈ្មោះសាខាទាំងអស់ដែលមានក្នុងវិក្កយបត្រ
  const branchOptions = useMemo(() => {
    return Array.from(new Set(invoices.map(i => i.branch).filter(Boolean)));
  }, [invoices]);

  const reportData = useMemo(() => {
    const filtered = invoices.filter(inv => {
      if (!inv.invoice_date) return false;
      const d = inv.invoice_date.split('T')[0];
      const matchDate = d >= reportStartDate && d <= reportEndDate;
      const matchBranch = filterBranch === 'All' || inv.branch === filterBranch;

      return matchDate && matchBranch;
    });

    const branchData = {};
    const cropCounts = {};
    let totalCrops = 0;

    filtered.forEach(inv => {
      const b = inv.branch || 'មិនបញ្ជាក់សាខា';
      const c = inv.crop_type || 'មិនបញ្ជាក់';
      
      if (!branchData[b]) branchData[b] = {};
      branchData[b][c] = (branchData[b][c] || 0) + 1;
      
      cropCounts[c] = (cropCounts[c] || 0) + 1;
      totalCrops++;
    });

    const colors = ['#0d6efd', '#198754', '#ffc107', '#dc3545', '#0dcaf0', '#6f42c1', '#fd7e14', '#20c997'];
    let currentPercent = 0;
    const pieSlices = Object.entries(cropCounts).sort((a,b) => b[1] - a[1]).map(([crop, count], index) => {
      const pct = (count / totalCrops) * 100;
      const start = currentPercent;
      const end = currentPercent + pct;
      currentPercent = end;
      return { crop, count, pct, color: colors[index % colors.length], gradientStr: `${colors[index % colors.length]} ${start}% ${end}%` };
    });

    const pieGradient = totalCrops > 0 ? `conic-gradient(${pieSlices.map(s => s.gradientStr).join(', ')})` : 'conic-gradient(#e9ecef 0% 100%)';
    const mostPopularCrop = pieSlices.length > 0 ? pieSlices[0].crop : 'គ្មាន';

    return { list: filtered, count: filtered.length, branchData, activeBranchesCount: Object.keys(branchData).length, mostPopularCrop, pieSlices, pieGradient, totalCrops };
  }, [invoices, reportStartDate, reportEndDate, filterBranch]);

  const exportToExcel = () => {
    let csvContent = "\uFEFFកាលបរិច្ឆេទ,លេខវិក្កយបត្រ,ឈ្មោះអតិថិជន,ប្រភេទអតិថិជន,សាខា,ប្រភេទដំណាំ\n";
    reportData.list.forEach(inv => {
      csvContent += `${inv.invoice_date?.split('T')[0] || ''},${inv.id},${inv.customers?.name || 'Unknown'},${inv.status || ''},${inv.branch || ''},${inv.crop_type || ''}\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Crop_Report_${filterBranch === 'All' ? 'All_Branches' : filterBranch}_${reportStartDate}_to_${reportEndDate}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const paginatedReport = reportData.list.slice((pageRep - 1) * ITEMS_PER_PAGE, pageRep * ITEMS_PER_PAGE);

  const inputStyle = `bg-white border border-gray-900 rounded-lg focus:ring-2 focus:ring-gray-900 focus:outline-none text-gray-800 transition-all ${isCompactMode ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'}`;

  return (
    <div className="flex flex-col gap-4">
      {/* TOP CONTROLS (NO PRINT) */}
      <div className="no-print flex flex-col md:flex-row justify-between md:items-center pb-4 border-b border-gray-200 gap-4">
        <div>
          <h5 className="text-gray-900 font-bold text-base md:text-lg mb-1.5">
            📊 របាយការណ៍ដំណាំ {filterBranch !== 'All' && <span className="text-blue-600">({filterBranch})</span>}
          </h5>
          <div className="flex gap-2">
            <button onClick={() => setPresetDate('week')} className="px-2.5 py-1 text-xs font-bold text-gray-700 border border-gray-900 rounded-lg hover:bg-gray-100 transition-colors">សប្តាហ៍នេះ</button>
            <button onClick={() => setPresetDate('month')} className="px-2.5 py-1 text-xs font-bold text-gray-700 border border-gray-900 rounded-lg hover:bg-gray-100 transition-colors">ខែនេះ</button>
            <button onClick={() => setPresetDate('year')} className="px-2.5 py-1 text-xs font-bold text-gray-700 border border-gray-900 rounded-lg hover:bg-gray-100 transition-colors">ឆ្នាំនេះ</button>
          </div>
        </div>

        <div className="flex flex-col items-start md:items-end gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {/* DROP DOWN សម្រាប់ជ្រើសរើសសាខា */}
            <select 
              className={`${inputStyle} min-w-[140px]`}
              value={filterBranch} 
              onChange={e => setFilterBranch(e.target.value)}
            >
              <option value="All">📍 គ្រប់សាខា</option>
              {branchOptions.map((b, idx) => <option key={idx} value={b}>{b}</option>)}
            </select>
            
            <input type="date" className={inputStyle} value={reportStartDate} onChange={e=>setReportStartDate(e.target.value)} />
            <span className="font-bold text-xs text-gray-600">ដល់</span>
            <input type="date" className={inputStyle} value={reportEndDate} onChange={e=>setReportEndDate(e.target.value)} />
          </div>

          <div className="flex gap-2">
            <button onClick={exportToExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-colors shadow-sm">📄 យកចេញ Excel</button>
            <button onClick={() => window.print()} className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-colors shadow-sm">🖨️ យកចេញ PDF</button>
          </div>
        </div>
      </div>

      {/* PRINT HEADING */}
      <div className="hidden print:block text-center mb-6">
        <h3 className="text-2xl font-black text-gray-900">របាយការណ៍សាខា និង ដំណាំ {filterBranch !== 'All' ? `- សាខា៖ ${filterBranch}` : ''}</h3>
        <p className="text-sm text-gray-600 mt-1">ចាប់ពី៖ {new Date(reportStartDate).toLocaleDateString('km-KH')} ដល់ {new Date(reportEndDate).toLocaleDateString('km-KH')}</p>
      </div>

      {/* STATS & PIE CHART CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* TOTAL INVOICES */}
        <div className="md:col-span-3 bg-gray-50 border border-gray-200 rounded-xl p-4 text-center flex flex-col justify-center">
          <div className="text-gray-500 text-xs font-bold mb-1">វិក្កយបត្រសរុប</div>
          <div className="text-3xl font-black text-gray-900 font-mono">{reportData.count}</div>
        </div>
        
        {/* PIE CHART SECTION */}
        <div className="md:col-span-9 bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-center gap-6">
          {reportData.totalCrops === 0 ? (
            <div className="w-full text-center text-gray-400 py-4 text-sm">មិនមានទិន្នន័យដំណាំទេ នៅក្នុងការជ្រើសរើសនេះ</div>
          ) : (
            <>
              <div 
                className="w-32 h-32 rounded-full flex-shrink-0 shadow-md" 
                style={{ background: reportData.pieGradient }}
              />
              <div className="flex-1 w-full">
                <h6 className="font-bold text-gray-900 text-sm mb-3">ចំណែកប្រភេទដំណាំសរុប (%)</h6>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {reportData.pieSlices.map(slice => (
                    <div className="flex items-center text-xs" key={slice.crop}>
                      <span className="w-3 h-3 rounded-sm mr-2 flex-shrink-0" style={{ backgroundColor: slice.color }} />
                      <span className="font-bold text-gray-800 truncate max-w-[80px]" title={slice.crop}>{slice.crop}</span>
                      <span className="text-gray-500 ml-1">({slice.pct.toFixed(1)}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* DETAILED TABLE */}
      <h6 className="font-bold text-gray-900 text-sm mt-2">📋 បញ្ជីប្រវត្តិវិក្កយបត្រលម្អិត</h6>
      
      <div className="border border-gray-200 rounded-xl shadow-sm bg-white flex flex-col overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-200 sticky top-0">
              <tr>
                <th className="py-2.5 px-4">កាលបរិច្ឆេទ</th>
                <th className="py-2.5 px-3">វិក្កយបត្រ</th>
                <th className="py-2.5 px-3">អតិថិជន</th>
                <th className="py-2.5 px-3">សាខា</th>
                <th className="py-2.5 px-3">ប្រភេទដំណាំ</th>
                <th className="py-2.5 px-4 text-center">ប្រភេទអតិថិជន</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedReport.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-8 text-gray-400">មិនមានទិន្នន័យទេ</td></tr>
              ) : (
                paginatedReport.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-2.5 px-4 text-gray-500 font-medium">{new Date(inv.invoice_date).toLocaleDateString('km-KH')}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-gray-900">{inv.id}</td>
                    <td className="py-2.5 px-3 font-semibold text-gray-800">{inv.customers?.name || 'Unknown'}</td>
                    <td className="py-2.5 px-3 text-gray-500 font-bold">{inv.branch || '—'}</td>
                    <td className="py-2.5 px-3 text-emerald-600 font-bold">{inv.crop_type ? `🌱 ${inv.crop_type}` : '—'}</td>
                    <td className="py-2.5 px-4 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                        inv.status === 'ដេប៉ូ' 
                          ? 'bg-blue-50 text-blue-700 border-blue-200' 
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {reportData.list.length > 0 && (
          <div className="flex items-center justify-between p-2.5 border-t border-gray-200 text-xs text-gray-600 no-print">
            <span className="font-bold">សរុប៖ {reportData.count}</span>
            <div className="flex items-center gap-2">
              <button 
                className="px-2.5 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40 transition-colors" 
                disabled={pageRep <= 1} 
                onClick={() => setPageRep(pageRep - 1)}
              >
                ⬅️ មុន
              </button>
              <span className="font-mono font-bold text-gray-800">{pageRep} / {Math.ceil(reportData.count / ITEMS_PER_PAGE)}</span>
              <button 
                className="px-2.5 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40 transition-colors" 
                disabled={pageRep >= Math.ceil(reportData.count / ITEMS_PER_PAGE)} 
                onClick={() => setPageRep(pageRep + 1)}
              >
                បន្ទាប់ ➡️
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
