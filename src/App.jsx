import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize your explicit Supabase Client
const SUPABASE_URL = "https://hllsxqjyyoewkbgmwizs.supabase.co";
const SUPABASE_KEY = "sb_publishable_KZbdTXvOcVfnsd9kzEgzAQ_u4T8h2Bt";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default function App() {
  const [activeTab, setActiveTab] = useState('invoice');
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  
  // Search Filters
  const [searchInv, setSearchInv] = useState('');
  const [searchCust, setSearchCust] = useState('');
  const [searchProd, setSearchProd] = useState('');

  // Form States (For Adds/Edits)
  const [invoiceId, setInvoiceId] = useState('');
  const [invoiceStatus, setInvoiceStatus] = useState('Paid');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [invoiceRows, setInvoiceRows] = useState([{ id: 'init', product_id: '', quantity: 1, unit_price: '' }]);
  const [editingInvoiceId, setEditingInvoiceId] = useState(null);

  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [editingCustomerId, setEditingCustomerId] = useState(null);

  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState('Granular Fertilizer');
  const [prodPrice, setProdPrice] = useState('');
  const [editingProductId, setEditingProductId] = useState(null);

  // Initialize Data
  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [searchInv]);

  const fetchInitialData = async () => {
    await fetchCustomers();
    await fetchProducts();
    await fetchInvoices();
  };

  const fetchCustomers = async () => {
    const { data } = await supabase.from('customers').select('*').order('name');
    if (data) setCustomers(data);
  };

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').order('product_name');
    if (data) setProducts(data);
  };

  const fetchInvoices = async () => {
    let query = supabase.from('invoices').select('*, customers(name)').order('invoice_date', { ascending: false });
    if (searchInv.trim() !== '') {
      if (!isNaN(searchInv)) {
        query = query.ilike('id', `%${searchInv}%`);
      } else {
        query = supabase.from('invoices').select('*, customers!inner(name)').ilike('customers.name', `%${searchInv}%`);
      }
    }
    const { data } = await query;
    if (data) setInvoices(data);
  };

  // --- INVOICE DYNAMIC ROW MATHS ---
  const addItemRow = () => {
    setInvoiceRows([...invoiceRows, { id: 'row_' + Date.now() + Math.random(), product_id: '', quantity: 1, unit_price: '' }]);
  };

  const removeItemRow = (id) => {
    if (invoiceRows.length > 1) {
      setInvoiceRows(invoiceRows.filter(r => r.id !== id));
    } else {
      alert("វិក្កយបត្រត្រូវមានទំនិញយ៉ាងហោចណាស់ ១ មុខ!");
    }
  };

  const handleRowChange = (id, field, value) => {
    const updated = invoiceRows.map(row => {
      if (row.id === id) {
        let newRow = { ...row, [field]: value };
        if (field === 'product_id') {
          const matched = products.find(p => p.id == value);
          newRow.unit_price = matched ? matched.default_price_riel : '';
        }
        return newRow;
      }
      return row;
    });
    setInvoiceRows(updated);
  };

  const calculateGrandTotal = () => {
    return invoiceRows.reduce((sum, r) => sum + (Number(r.quantity || 0) * Number(r.unit_price || 0)), 0);
  };

  // --- SUBMISSIONS (CRUD INJECTIONS) ---
  const submitInvoice = async (e) => {
    e.preventDefault();
    const grandTotal = calculateGrandTotal();
    try {
      if (editingInvoiceId) {
        await supabase.from('invoices').update({ customer_id: selectedCustomerId, total_amount: grandTotal, status: invoiceStatus }).eq('id', invoiceId);
        await supabase.from('invoice_items').delete().eq('invoice_id', invoiceId);
      } else {
        const { error } = await supabase.from('invoices').insert([{ id: invoiceId, customer_id: selectedCustomerId, invoice_date: new Date().toISOString(), total_amount: grandTotal, status: invoiceStatus }]);
        if (error) throw error;
      }

      const itemsPayload = invoiceRows.map(row => {
        const p = products.find(prod => prod.id == row.product_id);
        return { invoice_id: invoiceId, product_id: p.id, product_name: p.product_name, category: p.category, quantity: Number(row.quantity), unit_price: Number(row.unit_price) };
      });

      await supabase.from('invoice_items').insert(itemsPayload);
      alert("✅ រក្សាទុកវិក្កយបត្រជោគជ័យ!");
      resetInvoiceForm();
      fetchInvoices();
    } catch (err) { alert(err.message); }
  };

  const submitCustomer = async (e) => {
    e.preventDefault();
    const cleanPhone = custPhone.replace(/[^0-9+]/g, '');
    const calculatedId = cleanPhone.replace(/^\+?855/, '');
    try {
      if (editingCustomerId) {
        await supabase.from('customers').update({ name: custName, phone: cleanPhone }).eq('id', editingCustomerId);
      } else {
        await supabase.from('customers').insert([{ id: calculatedId, name: custName, phone: cleanPhone }]);
      }
      alert("✅ រក្សាទុកអតិថិជនជោគជ័យ!");
      resetCustomerForm();
      fetchCustomers();
    } catch (err) { alert(err.message); }
  };

  const submitProduct = async (e) => {
    e.preventDefault();
    try {
      if (editingProductId) {
        await supabase.from('products').update({ product_name: prodName, category: prodCategory, default_price_riel: Number(prodPrice) }).eq('id', editingProductId);
      } else {
        await supabase.from('products').insert([{ product_name: prodName, category: prodCategory, default_price_riel: Number(prodPrice) }]);
      }
      alert("✅ រក្សាទុកមុខទំនិញជោគជ័យ!");
      resetProductForm();
      fetchProducts();
    } catch (err) { alert(err.message); }
  };

  // --- FORMS LOAD / RESET MECHANICS ---
  const loadInvoiceEdit = async (inv) => {
    setEditingInvoiceId(inv.id);
    setInvoiceId(inv.id);
    setInvoiceStatus(inv.status);
    setSelectedCustomerId(inv.customer_id);
    const { data } = await supabase.from('invoice_items').select('*').eq('invoice_id', inv.id);
    if (data) {
      setInvoiceRows(data.map(d => ({ id: 'row_' + Math.random(), product_id: d.product_id, quantity: d.quantity, unit_price: d.unit_price })));
    }
  };

  const resetInvoiceForm = () => {
    setEditingInvoiceId(null); setInvoiceId(''); setInvoiceStatus('Paid'); setSelectedCustomerId('');
    setInvoiceRows([{ id: 'init', product_id: '', quantity: 1, unit_price: '' }]);
  };

  const resetCustomerForm = () => { setEditingCustomerId(null); setCustName(''); setCustPhone(''); };
  const resetProductForm = () => { setEditingProductId(null); setProdName(''); setProdPrice(''); };

  return (
    <div className="container my-5" style={{ maxWidth: '1000px' }}>
      <div className="bg-success text-white p-4 rounded-top shadow-sm">
        <h1 className="h3 mb-1">🌾 ហាងកសិកម្ម ស្រែមាស (Sremeas) - Admin</h1>
        <p className="mb-0 opacity-75 small">ប្រព័ន្ធគ្រប់គ្រងរួម៖ វិក្កយបត្រ អតិថិជន និងទំនិញ</p>
      </div>

      <ul className="nav nav-tabs bg-white px-3 pt-2 border-start border-end">
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'invoice' ? 'active text-white' : 'text-success'}`} onClick={() => setActiveTab('invoice')}>📝 វិក្កយបត្រ</button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'customer' ? 'active text-white' : 'text-success'}`} onClick={() => setActiveTab('customer')}>👥 អតិថិជន</button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'product' ? 'active text-white' : 'text-success'}`} onClick={() => setActiveTab('product')}>📦 ទំនិញ</button>
        </li>
      </ul>

      <div className="bg-white p-4 rounded-bottom shadow-sm border border-top-0">
        {/* INVOICE TAB */}
        {activeTab === 'invoice' && (
          <div className="row g-4">
            <div className="col-lg-6 border-end pe-lg-3">
              <h5 className="text-success mb-3">{editingInvoiceId ? `⚙️ កែប្រែវិក្កយបត្រ #${editingInvoiceId}` : '➕ បង្កើតវិក្កយបត្រថ្មី'}</h5>
              <form onSubmit={submitInvoice}>
                <div className="row g-2 mb-3 bg-light p-2 rounded border">
                  <div className="col-sm-6">
                    <label className="form-label small fw-bold">លេខវិក្កយបត្រ</label>
                    <input type="text" value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)} disabled={!!editingInvoiceId} required className="form-control form-control-sm" />
                  </div>
                  <div className="col-sm-6">
                    <label className="form-label small fw-bold">ស្ថានភាព</label>
                    <select value={invoiceStatus} onChange={(e) => setInvoiceStatus(e.target.value)} className="form-select form-select-sm">
                      <option value="Paid">ទូទាត់រួចរាល់ ✅</option>
                      <option value="Debt">ជំពាក់ ⚠️</option>
                    </select>
                  </div>
                  <div className="col-12 mt-2">
                    <label className="form-label small fw-bold">អតិថិជន</label>
                    <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} required className="form-select form-select-sm">
                      <option value="">-- ជ្រើសរើសអតិថិជន --</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name} (ID: {c.id})</option>)}
                    </select>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="mb-0 text-secondary small fw-bold">📦 មុខទំនិញ</h6>
                    <button type="button" onClick={addItemRow} className="btn btn-outline-success btn-sm py-0 px-2 small" style={{ fontSize: '11px' }}>+ ថែមទំនិញ</button>
                  </div>
                  {invoiceRows.map((row) => (
                    <div key={row.id} className="row g-1 align-items-center mb-2 bg-white p-1 rounded border shadow-sm mx-0">
                      <div className="col-6">
                        <select value={row.product_id} onChange={(e) => handleRowChange(row.id, 'product_id', e.target.value)} required className="form-select form-select-sm">
                          <option value="">-- ជ្រើសរើសទំនិញ --</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.product_name}</option>)}
                        </select>
                      </div>
                      <div className="col-2">
                        <input type="number" min="1" value={row.quantity} onChange={(e) => handleRowChange(row.id, 'quantity', e.target.value)} required className="form-control form-control-sm text-center" />
                      </div>
                      <div className="col-3">
                        <input type="number" min="0" value={row.unit_price} onChange={(e) => handleRowChange(row.id, 'unit_price', e.target.value)} required className="form-control form-control-sm" />
                      </div>
                      <div className="col-1 text-center">
                        <button type="button" onClick={() => removeItemRow(row.id)} className="text-danger border-0 bg-transparent">❌</button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-3 rounded grand-total-box d-flex justify-content-between align-items-center">
                  <div>សរុប: <span className="fs-5">{calculateGrandTotal().toLocaleString()}</span> ៛</div>
                  <div className="d-flex gap-2">
                    {editingInvoiceId && <button type="button" onClick={resetInvoiceForm} className="btn btn-secondary btn-sm">បោះបង់</button>}
                    <button type="submit" className="btn btn-success btn-sm fw-bold">💾 រក្សាទុក</button>
                  </div>
                </div>
              </form>
            </div>

            <div className="col-lg-6 ps-lg-3">
              <h5 className="text-secondary mb-3">🔍 ប្រវត្តិវិក្កយបត្រ</h5>
              <input type="text" value={searchInv} onChange={(e) => setSearchInv(e.target.value)} placeholder="ស្វែងរកលេខវិក្កយបត្រ ឬ ឈ្មោះអតិថិជន..." className="form-control form-control-sm mb-3" />
              <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
                <table className="table table-sm table-striped table-hover small">
                  <thead className="table-dark">
                    <tr><th>លេខវិក្កយបត្រ</th><th>អតិថិជន</th><th>សរុប ($)</th><th>ស្ថានភាព</th><th>កែ</th></tr>
                  </thead>
                  <tbody>
                    {invoices.map(inv => (
                      <tr key={inv.id}>
                        <td><strong>{inv.id}</strong></td>
                        <td>{inv.customers ? inv.customers.name : 'Unknown'}</td>
                        <td>${(inv.total_amount / 4000).toLocaleString()}</td>
                        <td><span className={`badge ${inv.status === 'Paid' ? 'bg-success' : 'bg-warning text-dark'}`}>{inv.status}</span></td>
                        <td><button className="btn btn-primary btn-xs py-0 px-1 text-xs" onClick={() => loadInvoiceEdit(inv)}>⚙️</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* CUSTOMER TAB */}
        {activeTab === 'customer' && (
          <div className="row g-4">
            <div className="col-md-5 border-end pe-md-4">
              <h5 className="text-success mb-3">{editingCustomerId ? '⚙️ កែប្រែអតិថិជន' : '➕ បន្ថែមអតិថិជនថ្មី'}</h5>
              <form onSubmit={submitCustomer}>
                <div className="mb-3">
                  <label className="form-label small fw-bold">ឈ្មោះអតិថិជន</label>
                  <input type="text" value={custName} onChange={(e) => setCustName(e.target.value)} required className="form-control" />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold">លេខទូរស័ព្ទ</label>
                  <input type="text" value={custPhone} onChange={(e) => setCustPhone(e.target.value)} placeholder="+855..." required className="form-control" />
                </div>
                <div className="d-flex gap-2">
                  {editingCustomerId && <button type="button" onClick={resetCustomerForm} className="btn btn-secondary w-50 btn-sm">បោះបង់</button>}
                  <button type="submit" className="btn btn-success w-100 btn-sm">💾 រក្សាទុក</button>
                </div>
              </form>
            </div>
            <div className="col-md-7 ps-md-4">
              <h5 className="text-secondary mb-3">🔍 ស្វែងរកអតិថិជន</h5>
              <input type="text" value={searchCust} onChange={(e) => setSearchCust(e.target.value)} placeholder="ស្វែងរកតាមឈ្មោះ..." className="form-control mb-3" />
              <table className="table table-striped table-hover small">
                <thead class="table-dark">
                  <tr><th>ID</th><th>ឈ្មោះ</th><th>លេខទូរស័ព្ទ</th><th>កែ</th></tr>
                </thead>
                <tbody>
                  {customers.filter(c => c.name.toLowerCase().includes(searchCust.toLowerCase())).map(c => (
                    <tr key={c.id}><td>{c.id}</td><td><strong>{c.name}</strong></td><td>{c.phone}</td>
                    <td><button className="btn btn-warning btn-xs py-0 px-1 text-xs" onClick={() => { setEditingCustomerId(c.id); setCustName(c.name); setCustPhone(c.phone); }}>✏️</button></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PRODUCT TAB */}
        {activeTab === 'product' && (
          <div className="row g-4">
            <div className="col-md-5 border-end pe-md-4">
              <h5 className="text-success mb-3">{editingProductId ? '⚙️ កែប្រែទំនិញ' : '➕ បន្ថែមទំនិញថ្មី'}</h5>
              <form onSubmit={submitProduct}>
                <div className="mb-3">
                  <label className="form-label small fw-bold">ឈ្មោះទំនិញ</label>
                  <input type="text" value={prodName} onChange={(e) => setProdName(e.target.value)} required className="form-control" />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold">ប្រភេទក្រុមទំនិញ</label>
                  <select value={prodCategory} onChange={(e) => setProdCategory(e.target.value)} className="form-select">
                    <option value="Granular Fertilizer">ជីគ្រាប់ (Granular Fertilizer)</option>
                    <option value="Liquid Fertilizer">ជីទឹក (Liquid Fertilizer)</option>
                    <option value="Powder Fertilizer">ជីម្សៅ (Powder Fertilizer)</option>
                    <option value="Pesticide">ថ្នាំសត្វល្អិត (Pesticide)</option>
                    <option value="Fungicide">ថ្នាំជំងឺ (Fungicide)</option>
                    <option value="Herbicide">ថ្នាំស្មៅ (Herbicide)</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold">តម្លៃគោលរាយ (៛)</label>
                  <input type="number" value={prodPrice} onChange={(e) => setProdPrice(e.target.value)} required className="form-control" />
                </div>
                <div className="d-flex gap-2">
                  {editingProductId && <button type="button" onClick={resetProductForm} className="btn btn-secondary w-50 btn-sm">បោះបង់</button>}
                  <button type="submit" className="btn btn-success w-100 btn-sm">💾 រក្សាទុក</button>
                </div>
              </form>
            </div>
            <div className="col-md-7 ps-md-4">
              <h5 className="text-secondary mb-3">🔍 ស្វែងរកមុខទំនិញ</h5>
              <input type="text" value={searchProd} onChange={(e) => setSearchProd(e.target.value)} placeholder="ស្វែងរកឈ្មោះទំនិញ..." className="form-control mb-3" />
              <table className="table table-striped table-hover small">
                <thead class="table-dark">
                  <tr><th>ឈ្មោះទំនិញ</th><th>ប្រភេទក្រុម</th><th>តម្លៃគោល (៛)</th><th>កែ</th></tr>
                </thead>
                <tbody>
                  {products.filter(p => p.product_name.toLowerCase().includes(searchProd.toLowerCase())).map(p => (
                    <tr key={p.id}><td><strong>{p.product_name}</strong></td><td>{p.category}</td><td>{Number(p.default_price_riel).toLocaleString()} ៛</td>
                    <td><button className="btn btn-warning btn-xs py-0 px-1 text-xs" onClick={() => { setEditingProductId(p.id); setProdName(p.product_name); setProdCategory(p.category); setProdPrice(p.default_price_riel); }}>✏️</button></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}