import React, { useState, useEffect, useMemo } from 'react';
import { supabase, ITEMS_PER_PAGE } from '../utils';

export default function ReportTab({ isCompactMode }) {
  const [invoices, setInvoices] = useState([]);
  const [pageRep, setPageRep] = useState(1);

  const todayStr = new Date().toISOString().split('T')[0];
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const [reportStartDate, setReportStartDate] = useState(firstDayOfMonth);
  const [reportEndDate, setReportEndDate] = useState(todayStr);

  useEffect(() => { fetchInvoices(); }, []);
  useEffect(() => { setPageRep(1); }, [reportStartDate, reportEndDate]);

  const fetchInvoices = async () => {
    const { data } = await supabase.from('invoices').select('*, customers(name)');
    if (data) setInvoices(data);
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

  const reportData = useMemo(() => {
    const filtered = invoices.filter(inv => {
      if (!inv.invoice_date) return false;
      const d = inv.invoice_date.split('T')[0];
      return d >= reportStartDate && d <= reportEndDate;
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
  }, [invoices, reportStartDate, reportEndDate]);

  const exportToExcel = () => {
    let csvContent = "\uFEFFកាលបរិច្ឆេទ,លេខវិក្កយបត្រ,ឈ្មោះអតិថិជន,ប្រភេទអតិថិជន,សាខា,ប្រភេទដំណាំ\n";
    reportData.list.forEach(inv => {
      csvContent += `${inv.invoice_date?.split('T')[0] || ''},${inv.id},${inv.customers?.name || 'Unknown'},${inv.status || ''},${inv.branch || ''},${inv.crop_type || ''}\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Crop_Report_${reportStartDate}_to_${reportEndDate}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const paginatedReport = reportData.list.slice((pageRep - 1) * ITEMS_PER_PAGE, pageRep * ITEMS_PER_PAGE);

  return (
    <div className="d-flex flex-column gap-3">
      <div className="no-print d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-3 pb-3 border-bottom">
        <div>
          <h5 className="text-dark fw-bold mb-2">📊 របាយការណ៍សាខា និង ដំណាំ</h5>
          <div className="d-flex gap-2">
            <button onClick={() => setPresetDate('week')} className="btn btn-sm btn-outline-dark fw-bold">សប្តាហ៍នេះ</button>
            <button onClick={() => setPresetDate('month')} className="btn btn-sm btn-outline-dark fw-bold">ខែនេះ</button>
            <button onClick={() => setPresetDate('year')} className="btn btn-sm btn-outline-dark fw-bold">ឆ្នាំនេះ</button>
          </div>
        </div>
        <div className="d-flex flex-column align-items-md-end mt-3 mt-md-0 gap-2">
          <div className="d-flex align-items-center gap-2">
            <input type="date" className={`form-control ${isCompactMode ? 'form-control-sm' : ''} border-dark`} value={reportStartDate} onChange={e=>setReportStartDate(e.target.value)} />
            <span className="fw-bold">ដល់</span>
            <input type="date" className={`form-control ${isCompactMode ? 'form-control-sm' : ''} border-dark`} value={reportEndDate} onChange={e=>setReportEndDate(e.target.value)} />
          </div>
          <div className="d-flex gap-2">
            <button onClick={exportToExcel} className="btn btn-success btn-sm fw-bold px-3">📄 យកចេញ Excel</button>
            <button onClick={() => window.print()} className="btn btn-danger btn-sm fw-bold px-3">🖨️ យកចេញ PDF</button>
          </div>
        </div>
      </div>

      <div className="d-none print-only text-center mb-4">
        <h3 className="fw-black">របាយការណ៍សាខា និង ដំណាំ</h3>
        <p>ចាប់ពី៖ {new Date(reportStartDate).toLocaleDateString('km-KH')} ដល់ {new Date(reportEndDate).toLocaleDateString('km-KH')}</p>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="bg-light border rounded-3 p-3 text-center h-100">
            <div className="text-muted small fw-bold mb-1">វិក្កយបត្រសរុប</div>
            <div className="fs-3 fw-black text-dark font-monospace">{reportData.count}</div>
          </div>
        </div>
        
        {/* PIE CHART SECTION */}
        <div className="col-md-9">
          <div className="bg-white border rounded-3 p-3 h-100 d-flex flex-column flex-md-row align-items-center gap-4">
            {reportData.totalCrops === 0 ? (
              <div className="w-100 text-center text-muted">មិនមានទិន្នន័យដំណាំទេ</div>
            ) : (
              <>
                <div style={{ width: '140px', height: '140px', borderRadius: '50%', background: reportData.pieGradient, flexShrink: 0, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}></div>
                <div className="flex-grow-1 w-100">
                  <h6 className="fw-bold mb-2">ចំណែកប្រភេទដំណាំសរុប (%)</h6>
                  <div className="row g-2">
                    {reportData.pieSlices.map(slice => (
                      <div className="col-6 col-md-4 d-flex align-items-center small" key={slice.crop}>
                        <span style={{width: '12px', height: '12px', backgroundColor: slice.color, borderRadius: '2px', display: 'inline-block', marginRight: '6px'}}></span>
                        <span className="fw-bold me-1 text-truncate" style={{maxWidth: '80px'}} title={slice.crop}>{slice.crop}</span>
                        <span className="text-muted">({slice.pct.toFixed(1)}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <h6 className="fw-bold mb-2">📋 បញ្ជីប្រវត្តិវិក្កយបត្រលម្អិត</h6>
      <div className="border rounded-3 flex-grow-1 shadow-sm d-flex flex-column">
        <div className="overflow-auto">
          <table className={`table table-hover align-middle mb-0 small ${isCompactMode ? 'table-sm' : ''}`}>
            <thead className="table-light text-muted sticky-top">
              <tr>
                <th className="py-2 ps-3">កាលបរិច្ឆេទ</th>
                <th>វិក្កយបត្រ</th>
                <th>អតិថិជន</th>
                <th>សាខា</th>
                <th>ប្រភេទដំណាំ</th>
                <th className="text-center pe-3">ប្រភេទអតិថិជន</th>
              </tr>
            </thead>
            <tbody>
              {paginatedReport.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-4 text-muted">មិនមានទិន្នន័យទេ</td></tr>
              ) : (
                paginatedReport.map(inv => (
                  <tr key={inv.id}>
                    <td className="ps-3 text-muted">{new Date(inv.invoice_date).toLocaleDateString('km-KH')}</td>
                    <td className="font-monospace fw-bold text-dark">{inv.id}</td>
                    <td className="fw-semibold text-dark">{inv.customers?.name || 'Unknown'}</td>
                    <td className="text-muted fw-bold">{inv.branch || '—'}</td>
                    <td className="text-success fw-bold">{inv.crop_type ? `🌱 ${inv.crop_type}` : '—'}</td>
                    <td className="text-center pe-3"><span className={`badge rounded px-2 py-1 border ${inv.status === 'ដេប៉ូ' ? 'bg-light text-primary border-primary' : 'bg-light text-success border-success'}`} style={{ fontSize: '10px' }}>{inv.status}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {reportData.list.length > 0 && (
          <div className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top px-1 small no-print">
            <span className="text-muted fw-bold">សរុប៖ {reportData.count}</span>
            <div className="d-flex gap-2 align-items-center">
              <button className="btn btn-sm btn-outline-secondary py-0 px-2" disabled={pageRep <= 1} onClick={() => setPageRep(pageRep - 1)}>⬅️ មុន</button>
              <span className="fw-bold text-dark font-monospace">{pageRep} / {Math.ceil(reportData.count / ITEMS_PER_PAGE)}</span>
              <button className="btn btn-sm btn-outline-secondary py-0 px-2" disabled={pageRep >= Math.ceil(reportData.count / ITEMS_PER_PAGE)} onClick={() => setPageRep(pageRep + 1)}>បន្ទាប់ ➡️</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}