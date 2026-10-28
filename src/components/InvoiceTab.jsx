import React, { useState, useEffect, useMemo } from 'react';
import { supabase, toKhmerNum, readKhmerAmount, ITEMS_PER_PAGE, fetchAllCustomers } from '../utils';

export default function InvoiceTab({ isCompactMode }) {
  const [invoices, setInvoices] = useState([]);
  const [totalInvoiceCount, setTotalInvoiceCount] = useState(0);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  
  const [searchInv, setSearchInv] = useState('');
  const [filterInvStatus, setFilterInvStatus] = useState('All');
  const [sortInv, setSortInv] = useState({ key: 'invoice_date', dir: 'desc' });
  const [pageInv, setPageInv] = useState(1);

  const [invoiceId, setInvoiceId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceStatus, setInvoiceStatus] = useState('កសិករ');
  const [invoiceDiscount, setInvoiceDiscount] = useState('');
  const [invoiceCrop, setInvoiceCrop] = useState('');
  const [invoiceBranch, setInvoiceBranch] = useState('');
  const [customerSearchInput, setCustomerSearchInput] = useState('');
  const [invoiceRows, setInvoiceRows] = useState([{ id: 'init', search_input: '', product_id: '', quantity: 1, unit_price: '' }]);
  const [editingInvoiceId, setEditingInvoiceId] = useState(null);

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { setPageInv(1); }, [searchInv, filterInvStatus, sortInv]);

  const fetchAll = async () => {
    const resCust = await fetchAllCustomers();
    if (resCust) setCustomers(resCust);
    const resProd = await supabase.from('products').select('*');
    if (resProd.data) setProducts(resProd.data);
    fetchInvoices();
  };

  // ✅ ទាញយកទិន្នន័យព្រមទាំង count សរុបពិតប្រាកដចេញពី Supabase (បំបែក batch ដើម្បីកុំឱ្យជាប់ limit 1000 របស់ PostgREST)
  const fetchInvoices = async () => {
    const { count } = await supabase.from('invoices').select('*', { count: 'exact', head: true });
    if (count !== null) setTotalInvoiceCount(count);

    const step = 1000;
    const maxRows = 5000;
    const limit = count ? Math.min(count, maxRows) : maxRows;
    const ranges = [];
    for (let from = 0; from < limit; from += step) {
      ranges.push([from, Math.min(from + step - 1, limit - 1)]);
    }

    const promises = ranges.map(([from, to]) =>
      supabase
        .from('invoices')
        .select('*, customers(name, phone)')
        .order('invoice_date', { ascending: false })
        .range(from, to)
    );

    const results = await Promise.all(promises);
    let all = [];
    results.forEach(res => {
      if (res.data) all = all.concat(res.data);
    });
    setInvoices(all);
  };

  const cropOptions = useMemo(() => Array.from(new Set(['ស្រូវ', 'ស្វាយចន្ទី', 'ដំឡូងមី', 'ពោត', 'ស្វាយ', 'ទុរេន', 'ម្រេច', 'បន្លែចម្រុះ', ...customers.map(c=>c.crop).filter(Boolean), ...invoices.map(i=>i.crop_type).filter(Boolean)])), [customers, invoices]);
  const branchOptions = useMemo(() => Array.from(new Set(['បឹងកុក', 'កំពង់ចាម', 'ព្រះវិហារ', 'មេមត់', 'បែកអន្លូង', 'សៀមរាប', 'បាត់ដំបង', 'ស្ទឹងត្រែង', 'ចំការលើ', ...invoices.map(i=>i.branch).filter(Boolean)])), [invoices]);

  const handleCustomerSearchChange = (val) => {
    setCustomerSearchInput(val);
    const trimmed = (val || '').trim().toLowerCase();
    const matched = customers.find(c => 
      `${c.name} (ID: ${c.id})`.toLowerCase() === trimmed || 
      c.name.toLowerCase() === trimmed ||
      c.id.toString().toLowerCase() === trimmed ||
      (c.phone && c.phone.toLowerCase() === trimmed)
    );
    if (matched?.crop && !invoiceCrop) setInvoiceCrop(matched.crop);
  };

  const addItemRow = () => setInvoiceRows([...invoiceRows, { id: 'r_'+Date.now(), search_input: '', product_id: '', quantity: 1, unit_price: '' }]);
  const removeItemRow = (id) => invoiceRows.length > 1 ? setInvoiceRows(invoiceRows.filter(r => r.id !== id)) : alert("ត្រូវមានទំនិញយ៉ាងហោច ១ មុខ!");
  
  const handleProductSearchChange = (id, val) => {
    const matched = products.find(p => (p.product_name || '').toLowerCase() === (val || '').toLowerCase());
    setInvoiceRows(invoiceRows.map(r => r.id === id ? { ...r, search_input: val, product_id: matched?.id||'', unit_price: matched?.default_price_riel||r.unit_price } : r));
  };
  
  const handleRowChange = (id, f, val) => setInvoiceRows(invoiceRows.map(r => r.id === id ? { ...r, [f]: val } : r));
  
  const calculateSubTotal = () => invoiceRows.reduce((sum, r) => sum + (Number(r.quantity||0) * Number(r.unit_price||0)), 0);
  const calculateGrandTotal = () => Math.max(0, calculateSubTotal() - Number(invoiceDiscount||0));
  const calculateGrandTotalUSD = () => calculateGrandTotal() / 4000;

  const submitInvoice = async (e) => {
    e.preventDefault();
    if (invoiceId.length !== 8) return alert("❌ លេខវិក្កយបត្រត្រូវតែមាន ៨ ខ្ទង់គត់ (ឧទាហរណ៍៖ 20260001)!");
    const trimmedCust = (customerSearchInput || '').trim().toLowerCase();
    const matchedCust = customers.find(c => 
      `${c.name} (ID: ${c.id})`.toLowerCase() === trimmedCust || 
      c.name.toLowerCase() === trimmedCust ||
      c.id.toString().toLowerCase() === trimmedCust ||
      (c.phone && c.phone.toLowerCase() === trimmedCust)
    );
    if (!matchedCust) return alert("❌ រកមិនឃើញអតិថិជននេះទេ!");
    if (invoiceRows.some(r => !r.product_id)) return alert("❌ មានទំនិញខ្លះមិនទាន់ជ្រើសរើសត្រឹមត្រូវទេ!");

    const payload = { customer_id: matchedCust.id, invoice_date: new Date(invoiceDate).toISOString(), total_amount: calculateGrandTotal(), discount: Number(invoiceDiscount||0), status: invoiceStatus, crop_type: invoiceCrop, branch: invoiceBranch };

    try {
      if (editingInvoiceId) {
        await supabase.from('invoice_items').delete().eq('invoice_id', editingInvoiceId);
        const { error: updateErr } = await supabase.from('invoices').update({ id: invoiceId, ...payload }).eq('id', editingInvoiceId);
        if (updateErr) throw new Error("លេខវិក្កយបត្រថ្មីនេះអាចមានរួចហើយ៖ " + updateErr.message);
      } else {
        const { error: insertErr } = await supabase.from('invoices').insert([{ id: invoiceId, ...payload }]);
        if (insertErr) throw new Error("មិនអាចបង្កើតថ្មីបានទេ៖ " + insertErr.message);
      }

      const itemsPayload = invoiceRows.map(row => {
        const p = products.find(prod => prod.id == row.product_id);
        return { invoice_id: invoiceId, product_id: p.id, product_name: p.product_name, category: p.category, quantity: Number(row.quantity), unit_price: Number(row.unit_price) };
      });
      await supabase.from('invoice_items').insert(itemsPayload);

      if (invoiceCrop && invoiceCrop !== matchedCust.crop) {
        await supabase.from('customers').update({ crop: invoiceCrop }).eq('id', matchedCust.id);
        const resCust = await fetchAllCustomers();
        if (resCust) setCustomers(resCust);
      }

      alert("✅ រក្សាទុកជោគជ័យ!");
      resetForm(); fetchInvoices();
    } catch (err) { alert("❌ មានបញ្ហា៖ " + err.message); }
  };

  const deleteInvoice = async (id) => {
    if (!window.confirm(`តើអ្នកពិតជាចង់លុបវិក្កយបត្រលេខ #${id} មែនទេ?`)) return;
    try {
      await supabase.from('invoice_items').delete().eq('invoice_id', id);
      await supabase.from('invoices').delete().eq('id', id);
      alert("✅ បានលុបវិក្កយបត្រ!");
      if (editingInvoiceId === id) resetForm();
      fetchInvoices();
    } catch (err) { alert("❌ មិនអាចលុបបានទេ៖ " + err.message); }
  };

  const loadInvoiceEdit = async (inv) => {
    setEditingInvoiceId(inv.id); setInvoiceId(inv.id); setInvoiceStatus(inv.status);
    setInvoiceDiscount(inv.discount || ''); setInvoiceCrop(inv.crop_type || ''); setInvoiceBranch(inv.branch || '');
    setInvoiceDate(inv.invoice_date?.split('T')[0] || new Date().toISOString().split('T')[0]);
    const cust = customers.find(c => c.id === inv.customer_id);
    setCustomerSearchInput(cust ? `${cust.name} (ID: ${cust.id})` : (inv.customer_id ? `ID: ${inv.customer_id}` : ''));
    const { data } = await supabase.from('invoice_items').select('*').eq('invoice_id', inv.id);
    if (data) setInvoiceRows(data.map(d => ({ id: 'r_'+Math.random(), search_input: d.product_name, product_id: d.product_id, quantity: d.quantity, unit_price: d.unit_price })));
  };

  const resetForm = () => {
    setEditingInvoiceId(null); setInvoiceId(''); setInvoiceStatus('កសិករ');
    setInvoiceDiscount(''); setInvoiceCrop(''); setInvoiceBranch('');
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setInvoiceRows([{ id: 'init', search_input: '', product_id: '', quantity: 1, unit_price: '' }]);
  };

  const sortedInvoices = useMemo(() => {
    let filtered = invoices.filter(inv => {
      const matchStatus = filterInvStatus === 'All' || inv.status === filterInvStatus;
      const s = searchInv.trim().toLowerCase();
      
      const matchSearch = s === '' || 
                          inv.id?.toString().toLowerCase().includes(s) || 
                          (inv.customer_id && inv.customer_id.toString().toLowerCase().includes(s)) ||
                          (inv.customers?.name || '').toLowerCase().includes(s) ||
                          (inv.customers?.phone || '').toLowerCase().includes(s);
                          
      return matchStatus && matchSearch;
    });

    return filtered.sort((a, b) => {
      let valA = sortInv.key === 'customer_name' ? (a.customers?.name || '') : (a[sortInv.key] || '');
      let valB = sortInv.key === 'customer_name' ? (b.customers?.name || '') : (b[sortInv.key] || '');
      if (valA < valB) return sortInv.dir === 'asc' ? -1 : 1;
      if (valA > valB) return sortInv.dir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [invoices, sortInv, filterInvStatus, searchInv]);

  const paginatedInvoices = sortedInvoices.slice((pageInv - 1) * ITEMS_PER_PAGE, pageInv * ITEMS_PER_PAGE);

  const inputStyle = `w-full bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-800 transition-all ${isCompactMode ? 'px-2.5 py-1 text-xs' : 'px-3 py-2 text-sm'}`;
  const selectStyle = `w-full bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-800 transition-all ${isCompactMode ? 'px-2.5 py-1 text-xs' : 'px-3 py-2 text-sm'}`;

  return (
    <>
      <datalist id="customerPredictPool">{customers.map(c => <option key={c.id} value={`${c.name} (ID: ${c.id})`} />)}</datalist>
      <datalist id="productPredictPool">{products.map(p => <option key={p.id} value={p.product_name} />)}</datalist>
      <datalist id="cropPool">{cropOptions.map((c, idx) => <option key={idx} value={c} />)}</datalist>
      <datalist id="branchPool">{branchOptions.map((b, idx) => <option key={idx} value={b} />)}</datalist>

      <div className={`grid grid-cols-1 xl:grid-cols-12 ${isCompactMode ? 'gap-4' : 'gap-6'}`}>
        
        {/* FORM SECTION (LEFT COLUMN) */}
        <div className="xl:col-span-5 xl:border-r xl:border-gray-200 xl:pr-6">
          <h6 className="text-gray-900 font-bold text-base mb-3">
            {editingInvoiceId ? `⚙️ កែប្រែវិក្កយបត្រ #${editingInvoiceId}` : '➕ បង្កើតវិក្កយបត្រថ្មី'}
          </h6>

          <form onSubmit={submitInvoice} className="space-y-3">
            <div className={`grid grid-cols-12 gap-2 bg-gray-50 rounded-xl border border-gray-200 ${isCompactMode ? 'p-3' : 'p-4'}`}>
              <div className="col-span-6">
                <label className="block text-gray-600 text-[11px] font-bold mb-1">លេខវិក្កយបត្រ *</label>
                <input 
                  type="text" 
                  value={invoiceId} 
                  onChange={(e) => { const n = e.target.value.replace(/[^0-9]/g, ''); if (n.length <= 8) setInvoiceId(n); }} 
                  required 
                  maxLength="8" 
                  pattern="\d{8}" 
                  className={`${inputStyle} font-mono font-bold tracking-wider`} 
                  placeholder="20260001" 
                />
              </div>

              <div className="col-span-6">
                <label className="block text-gray-600 text-[11px] font-bold mb-1">កាលបរិច្ឆេទ *</label>
                <input 
                  type="date" 
                  value={invoiceDate} 
                  onChange={e => setInvoiceDate(e.target.value)} 
                  required 
                  className={inputStyle} 
                />
              </div>

              <div className="col-span-4">
                <label className="block text-gray-600 text-[11px] font-bold mb-1">ប្រភេទអតិថិជន</label>
                <select value={invoiceStatus} onChange={e => setInvoiceStatus(e.target.value)} className={selectStyle}>
                  <option value="កសិករ">កសិករ 🧑‍🌾</option>
                  <option value="ដេប៉ូ">ដេប៉ូ 🏪</option>
                </select>
              </div>

              <div className="col-span-4">
                <label className="block text-gray-600 text-[11px] font-bold mb-1">ប្រភេទដំណាំ</label>
                <input type="text" list="cropPool" value={invoiceCrop} onChange={e => setInvoiceCrop(e.target.value)} className={inputStyle} placeholder="ជ្រើសរើស..." />
              </div>

              <div className="col-span-4">
                <label className="block text-gray-600 text-[11px] font-bold mb-1">សាខា</label>
                <input type="text" list="branchPool" value={invoiceBranch} onChange={e => setInvoiceBranch(e.target.value)} className={inputStyle} placeholder="ជ្រើសរើស..." />
              </div>

              <div className="col-span-12">
                <label className="block text-gray-600 text-[11px] font-bold mb-1">🔍 ស្វែងរកអតិថិជន *</label>
                <input 
                  type="text" 
                  list="customerPredictPool" 
                  value={customerSearchInput} 
                  onChange={e => handleCustomerSearchChange(e.target.value)} 
                  required 
                  className={inputStyle} 
                  placeholder="ឈ្មោះ ឬ លេខសម្គាល់..." 
                />
              </div>
            </div>

            {/* PRODUCT ROWS */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-xs text-gray-800">📦 បញ្ជីទំនិញ</span>
                <button 
                  type="button" 
                  onClick={addItemRow} 
                  className="px-2.5 py-1 border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white font-bold rounded-lg text-xs transition-colors"
                >
                  + ថែមជួរ
                </button>
              </div>

              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {invoiceRows.map((row) => (
                  <div 
                    key={row.id} 
                    className="flex items-center gap-1.5 bg-white rounded-lg border border-gray-200 p-1.5 shadow-sm" 
                    style={{ borderLeftWidth: '4px', borderLeftColor: row.product_id ? '#111827' : '#ef4444' }}
                  >
                    <div className="flex-1">
                      <input 
                        type="text" 
                        list="productPredictPool" 
                        value={row.search_input} 
                        onChange={e => handleProductSearchChange(row.id, e.target.value)} 
                        required 
                        className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs text-gray-800 focus:bg-white focus:outline-none" 
                        placeholder="ស្វែងរក..." 
                      />
                    </div>
                    
                    <div className="w-16">
                      <input 
                        type="number" 
                        min="1" 
                        value={row.quantity} 
                        onChange={e => handleRowChange(row.id, 'quantity', e.target.value)} 
                        required 
                        className="w-full bg-gray-50 border border-gray-200 rounded px-1.5 py-1 text-xs text-center font-bold text-gray-900 focus:bg-white focus:outline-none" 
                      />
                    </div>

                    <div className="w-24">
                      <input 
                        type="number" 
                        min="0" 
                        value={row.unit_price} 
                        onChange={e => handleRowChange(row.id, 'unit_price', e.target.value)} 
                        required 
                        className="w-full bg-gray-50 border border-gray-200 rounded px-1.5 py-1 text-xs text-right font-mono text-gray-900 focus:bg-white focus:outline-none" 
                      />
                    </div>

                    <div className="w-20 text-right font-mono font-bold text-[11px] text-gray-900">
                      {((Number(row.quantity)||0)*(Number(row.unit_price)||0)).toLocaleString()}
                    </div>

                    <button 
                      type="button" 
                      onClick={() => removeItemRow(row.id)} 
                      className="text-red-500 hover:text-red-700 font-bold px-1 text-sm"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* TOTAL CALCULATION CARD */}
            <div className={`bg-gray-50 border border-gray-200 rounded-xl space-y-2 ${isCompactMode ? 'p-3' : 'p-4'}`}>
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-gray-600">សរុបដើម</span>
                <span className="font-bold font-mono text-gray-900">{calculateSubTotal().toLocaleString()} ៛</span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-gray-600">បញ្ចុះតម្លៃ</span>
                <input 
                  type="number" 
                  min="0" 
                  value={invoiceDiscount} 
                  onChange={e=>setInvoiceDiscount(e.target.value)} 
                  className="w-24 bg-white border border-gray-300 rounded px-2 py-0.5 text-right font-mono text-xs focus:ring-1 focus:ring-gray-900" 
                  placeholder="0" 
                />
              </div>

              <hr className="border-gray-200 my-1" />

              <div className="flex justify-between items-end pt-1">
                <div>
                  <div className="text-gray-900 text-xs font-bold">សរុបរួម</div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black font-mono text-gray-900">{calculateGrandTotal().toLocaleString()}៛</span>
                    <span className="text-xl font-black font-mono text-emerald-600">${calculateGrandTotalUSD().toLocaleString(undefined, {minimumFractionDigits:2})}</span>
                  </div>
                  <div className="text-gray-500 font-bold text-[11px] mt-0.5">{readKhmerAmount(calculateGrandTotal())}</div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <button type="submit" className="bg-gray-900 hover:bg-gray-800 text-white font-bold px-4 py-2 rounded-lg text-xs shadow transition-colors">
                    💾 រក្សាទុក
                  </button>
                  {editingInvoiceId && (
                    <button type="button" onClick={resetForm} className="border border-gray-300 text-gray-700 hover:bg-gray-100 font-bold px-4 py-1.5 rounded-lg text-xs transition-colors">
                      បោះបង់
                    </button>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* TABLE SECTION (RIGHT COLUMN) */}
        <div className="xl:col-span-7 flex flex-col h-full">
          <h6 className="text-gray-900 font-bold text-base mb-3">🔍 ប្រវត្តិលក់ និងស្វែងរក</h6>
          
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-gray-400">🔎</span>
              <input 
                type="text" 
                value={searchInv} 
                onChange={e => setSearchInv(e.target.value)} 
                placeholder="ស្វែងរកលេខ, ឈ្មោះ ឬ លេខទូរស័ព្ទ..." 
                className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900" 
              />
            </div>

            <select 
              className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 w-32" 
              value={filterInvStatus} 
              onChange={e => setFilterInvStatus(e.target.value)}
            >
              <option value="All">គ្រប់ប្រភេទ</option>
              <option value="កសិករ">កសិករ</option>
              <option value="ដេប៉ូ">ដេប៉ូ</option>
            </select>
          </div>

          {/* TABLE CONTAINER */}
          <div className="border border-gray-200 rounded-xl shadow-sm bg-white flex flex-col flex-1 overflow-hidden">
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-200 sticky top-0">
                  <tr className="cursor-pointer">
                    <th className="py-2.5 px-4" onClick={() => setSortInv({key:'invoice_date', dir: sortInv.dir==='asc'?'desc':'asc'})}>កាលបរិច្ឆេទ</th>
                    <th className="py-2.5 px-3" onClick={() => setSortInv({key:'id', dir: sortInv.dir==='asc'?'desc':'asc'})}>វិក្កយបត្រ</th>
                    <th className="py-2.5 px-3" onClick={() => setSortInv({key:'customer_name', dir: sortInv.dir==='asc'?'desc':'asc'})}>អតិថិជន</th>
                    <th className="py-2.5 px-4 text-right" onClick={() => setSortInv({key:'total_amount', dir: sortInv.dir==='asc'?'desc':'asc'})}>សរុប ($ / ៛)</th>
                    <th className="py-2.5 px-4 text-center">សកម្មភាព</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedInvoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-2.5 px-4 text-gray-500">{new Date(inv.invoice_date).toLocaleDateString('km-KH')}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-mono font-bold text-gray-900">{inv.id}</div>
                        <div className="text-[10px] text-gray-400">📍 {inv.branch||'—'}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-gray-800">
                          {inv.customers?.name || 'Unknown'} 
                          <span className="text-gray-400 text-[10px] font-normal"> (ID: {inv.customer_id})</span>
                        </div>
                        <div className="text-[10px] text-emerald-600 font-bold">🌱 {inv.crop_type||'—'}</div>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="font-mono font-bold text-gray-900">${(Number(inv.total_amount || 0)/4000).toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                        <div className="text-[11px] font-bold text-gray-500">{toKhmerNum(Number(inv.total_amount || 0).toLocaleString())} ៛</div>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button 
                            className="p-1 text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded transition-colors" 
                            onClick={() => loadInvoiceEdit(inv)} 
                            title="កែប្រែ"
                          >
                            ⚙️
                          </button>
                          <button 
                            className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 border border-transparent rounded transition-colors" 
                            onClick={() => deleteInvoice(inv.id)} 
                            title="លុប"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* PAGINATION FOOTER */}
            {sortedInvoices.length > 0 && (
              <div className="flex items-center justify-between p-2.5 border-t border-gray-200 text-xs text-gray-600 no-print">
                <span className="font-bold">
                  សរុប៖ {totalInvoiceCount || sortedInvoices.length} វិក្កយបត្រ 
                  {searchInv && ` (តម្រងរកឃើញ៖ ${sortedInvoices.length})`}
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    className="px-2.5 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40 transition-colors" 
                    disabled={pageInv <= 1} 
                    onClick={() => setPageInv(pageInv - 1)}
                  >
                    ⬅️ មុន
                  </button>
                  <span className="font-mono font-bold text-gray-800">{pageInv} / {Math.ceil(sortedInvoices.length / ITEMS_PER_PAGE)}</span>
                  <button 
                    className="px-2.5 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40 transition-colors" 
                    disabled={pageInv >= Math.ceil(sortedInvoices.length / ITEMS_PER_PAGE)} 
                    onClick={() => setPageInv(pageInv + 1)}
                  >
                    បន្ទាប់ ➡️
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </>
  );
}
