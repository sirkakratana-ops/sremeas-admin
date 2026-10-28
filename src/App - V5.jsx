import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://hllsxqjyyoewkbgmwizs.supabase.co";
const SUPABASE_KEY = "sb_publishable_KZbdTXvOcVfnsd9kzEgzAQ_u4T8h2Bt";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- KHMER FORMATTING HELPERS ---
const toKhmerNum = (num) => {
  const khmerNumbers = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
  return num.toString().replace(/\d/g, (d) => khmerNumbers[d]);
};

const readKhmerAmount = (amount) => {
  if (!amount || amount === 0) return 'សូន្យរៀលគត់';
  const digits = ['','មួយ','ពីរ','បី','បួន','ប្រាំ','ប្រាំមួយ','ប្រាំពីរ','ប្រាំបី','ប្រាំបួន'];
  const positions = ['','ដប់','រយ','ពាន់','ម៉ឺន','សែន','លាន'];
  let result = '';
  let str = amount.toString();
  for (let i = 0; i < str.length; i++) {
    let n = parseInt(str[i]);
    let pos = str.length - 1 - i;
    if (n !== 0) result += digits[n] + positions[pos % 6];
    if (pos > 0 && pos % 6 === 0 && parseInt(str.substring(Math.max(0, i - 5), i + 1)) > 0) result += positions[6];
  }
  return result.replace(/មួយដប់/g, 'ដប់') + 'រៀលគត់';
};

export default function App() {
  // --- BROWSER TITLE ---
  useEffect(() => { document.title = "ស្រែមាស - Admin Dashboard"; }, []);

  // --- UI STATES (Default true) ---
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isCompactMode, setIsCompactMode] = useState(true);

  // --- AUTH STATES ---
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // --- DATA STATES ---
  const [activeTab, setActiveTab] = useState('invoice');
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  
  // --- FILTER & SORT STATES ---
  const [searchInv, setSearchInv] = useState('');
  const [searchCust, setSearchCust] = useState('');
  const [searchProd, setSearchProd] = useState('');
  
  const [filterInvStatus, setFilterInvStatus] = useState('All');
  const [filterCustSex, setFilterCustSex] = useState('All');
  const [filterProdCategory, setFilterProdCategory] = useState('All');

  const [sortInv, setSortInv] = useState({ key: 'invoice_date', dir: 'desc' });
  const [sortCust, setSortCust] = useState({ key: 'name', dir: 'asc' });
  const [sortProd, setSortProd] = useState({ key: 'product_name', dir: 'asc' });

  // --- FORM STATES ---
  const [invoiceId, setInvoiceId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceStatus, setInvoiceStatus] = useState('កសិករ');
  const [invoiceDiscount, setInvoiceDiscount] = useState('');
  const [invoiceCrop, setInvoiceCrop] = useState('');
  const [invoiceBranch, setInvoiceBranch] = useState(''); // NEW: Branch State
  const [customerSearchInput, setCustomerSearchInput] = useState('');
  const [invoiceRows, setInvoiceRows] = useState([{ id: 'init', search_input: '', product_id: '', quantity: 1, unit_price: '' }]);
  const [editingInvoiceId, setEditingInvoiceId] = useState(null);

  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custSex, setCustSex] = useState('');
  const [custVillage, setCustVillage] = useState('');
  const [custCommune, setCustCommune] = useState('');
  const [custDistrict, setCustDistrict] = useState('');
  const [custProvince, setCustProvince] = useState('');
  const [custCrop, setCustCrop] = useState('');
  const [editingCustomerId, setEditingCustomerId] = useState(null);

  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState('Granular Fertilizer');
  const [prodPrice, setProdPrice] = useState('');
  const [editingProductId, setEditingProductId] = useState(null);

  // --- AUTH LOGIC ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserRole(session.user.id);
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchUserRole(session.user.id);
      else setUserRole(null);
    });
  }, []);

  const fetchUserRole = async (userId) => {
    const { data } = await supabase.from('user_roles').select('role').eq('user_id', userId).single();
    if (data) setUserRole(data.role);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    if (error) alert("❌ លេខសម្ងាត់មិនត្រឹមត្រូវ: " + error.message);
    setAuthLoading(false);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); };

  // --- FETCHING DATA ---
  useEffect(() => {
    if (session) {
      fetchCustomers();
      fetchProducts();
      fetchInvoices();
    }
  }, [session, searchInv]);

  const fetchCustomers = async () => {
    const { data } = await supabase.from('customers').select('*');
    if (data) setCustomers(data);
  };

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*');
    if (data) setProducts(data);
  };

  const fetchInvoices = async () => {
    let query = supabase.from('invoices').select('*, customers(name)');
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

  // --- SORTING & FILTERING ---
  const handleSort = (type, key) => {
    if (type === 'inv') setSortInv({ key, dir: sortInv.key === key && sortInv.dir === 'asc' ? 'desc' : 'asc' });
    if (type === 'cust') setSortCust({ key, dir: sortCust.key === key && sortCust.dir === 'asc' ? 'desc' : 'asc' });
    if (type === 'prod') setSortProd({ key, dir: sortProd.key === key && sortProd.dir === 'asc' ? 'desc' : 'asc' });
  };

  const sortedInvoices = useMemo(() => {
    let filtered = invoices.filter(inv => {
      if (filterInvStatus !== 'All' && inv.status !== filterInvStatus) return false;
      return true;
    });
    return filtered.sort((a, b) => {
      let valA = sortInv.key === 'customer_name' ? (a.customers?.name || '') : a[sortInv.key];
      let valB = sortInv.key === 'customer_name' ? (b.customers?.name || '') : b[sortInv.key];
      if (valA < valB) return sortInv.dir === 'asc' ? -1 : 1;
      if (valA > valB) return sortInv.dir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [invoices, sortInv, filterInvStatus]);

  const sortedCustomers = useMemo(() => {
    let filtered = customers.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchCust.toLowerCase()) || c.phone.includes(searchCust);
      const matchesSex = filterCustSex === 'All' || c.sex === filterCustSex;
      return matchesSearch && matchesSex;
    });
    return filtered.sort((a, b) => {
      if (a[sortCust.key] < b[sortCust.key]) return sortCust.dir === 'asc' ? -1 : 1;
      if (a[sortCust.key] > b[sortCust.key]) return sortCust.dir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [customers, searchCust, sortCust, filterCustSex]);

  const sortedProducts = useMemo(() => {
    let filtered = products.filter(p => {
      const matchesSearch = p.product_name.toLowerCase().includes(searchProd.toLowerCase());
      const matchesCategory = filterProdCategory === 'All' || p.category === filterProdCategory;
      return matchesSearch && matchesCategory;
    });
    return filtered.sort((a, b) => {
      if (a[sortProd.key] < b[sortProd.key]) return sortProd.dir === 'asc' ? -1 : 1;
      if (a[sortProd.key] > b[sortProd.key]) return sortProd.dir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [products, searchProd, sortProd, filterProdCategory]);

  // --- INVOICE CALCULATIONS ---
  const addItemRow = () => setInvoiceRows([...invoiceRows, { id: 'row_' + Date.now() + Math.random(), search_input: '', product_id: '', quantity: 1, unit_price: '' }]);
  const removeItemRow = (id) => {
    if (invoiceRows.length > 1) setInvoiceRows(invoiceRows.filter(r => r.id !== id));
    else alert("វិក្កយបត្រត្រូវមានទំនិញយ៉ាងហោចណាស់ ១ មុខ!");
  };
  const handleProductSearchChange = (id, typedValue) => {
    const matchedProduct = products.find(p => p.product_name.toLowerCase() === typedValue.toLowerCase());
    setInvoiceRows(invoiceRows.map(row => row.id === id ? { ...row, search_input: typedValue, product_id: matchedProduct ? matchedProduct.id : '', unit_price: matchedProduct ? matchedProduct.default_price_riel : row.unit_price } : row));
  };
  const handleRowChange = (id, field, value) => setInvoiceRows(invoiceRows.map(row => row.id === id ? { ...row, [field]: value } : row));
  
  const calculateSubTotal = () => invoiceRows.reduce((sum, r) => sum + (Number(r.quantity || 0) * Number(r.unit_price || 0)), 0);
  const calculateGrandTotal = () => Math.max(0, calculateSubTotal() - Number(invoiceDiscount || 0));
  const calculateGrandTotalUSD = () => calculateGrandTotal() / 4000;

  // --- CRUD: CREATE & UPDATE ---
  const submitInvoice = async (e) => {
    e.preventDefault();
    if (invoiceId.length !== 8) return alert("❌ លេខវិក្កយបត្រត្រូវតែមាន ៨ ខ្ទង់គត់ (ឧទាហរណ៍៖ 20260001)!");

    const matchedCustomer = customers.find(c => `${c.name} (ID: ${c.id})` === customerSearchInput || c.name === customerSearchInput);
    if (!matchedCustomer) return alert("❌ រកមិនឃើញអតិថិជននេះទេ!");
    if (invoiceRows.find(r => !r.product_id)) return alert("❌ មានទំនិញខ្លះមិនទាន់បានជ្រើសរើសត្រឹមត្រូវទេ!");

    const grandTotal = calculateGrandTotal();
    const parsedDiscount = Number(invoiceDiscount || 0);
    const submissionDate = new Date(invoiceDate).toISOString();

    try {
      if (editingInvoiceId) {
        const { error: updateErr } = await supabase.from('invoices').update({ 
          customer_id: matchedCustomer.id, 
          total_amount: grandTotal, 
          discount: parsedDiscount, 
          status: invoiceStatus, 
          crop_type: invoiceCrop,
          branch: invoiceBranch, // Save Branch
          invoice_date: submissionDate 
        }).eq('id', editingInvoiceId);
        if (updateErr) throw new Error("មិនអាចអាប់ដេតបានទេ៖ " + updateErr.message);

        const { error: deleteErr } = await supabase.from('invoice_items').delete().eq('invoice_id', editingInvoiceId);
        if (deleteErr) throw new Error("មិនអាចលុបទំនិញចាស់ចេញបានទេ៖ " + deleteErr.message);
      } else {
        const { error: insertErr } = await supabase.from('invoices').insert([{ 
          id: invoiceId, 
          customer_id: matchedCustomer.id, 
          invoice_date: submissionDate, 
          total_amount: grandTotal, 
          discount: parsedDiscount, 
          status: invoiceStatus,
          crop_type: invoiceCrop,
          branch: invoiceBranch // Save Branch
        }]);
        if (insertErr) throw new Error("មិនអាចបង្កើតថ្មីបានទេ៖ " + insertErr.message);
      }

      const targetInvoiceId = editingInvoiceId ? editingInvoiceId : invoiceId;
      const itemsPayload = invoiceRows.map(row => {
        const p = products.find(prod => prod.id == row.product_id);
        return { invoice_id: targetInvoiceId, product_id: p.id, product_name: p.product_name, category: p.category, quantity: Number(row.quantity), unit_price: Number(row.unit_price) };
      });
      
      const { error: itemsErr } = await supabase.from('invoice_items').insert(itemsPayload);
      if (itemsErr) throw new Error("បញ្ជូលទំនិញបរាជ័យ៖ " + itemsErr.message);

      alert("✅ រក្សាទុកជោគជ័យ!");
      resetInvoiceForm(); fetchInvoices();
    } catch (err) { alert("❌ មានបញ្ហា៖ " + err.message); }
  };

  const submitCustomer = async (e) => {
    e.preventDefault();
    const cleanPhone = custPhone.replace(/[^0-9+]/g, '');
    const calculatedId = cleanPhone.replace(/^\+?855/, '');
    
    const customerData = {
      name: custName, phone: cleanPhone, sex: custSex || null,
      village: custVillage || null, commune: custCommune || null,
      district: custDistrict || null, province: custProvince || null, crop: custCrop || null
    };

    try {
      if (editingCustomerId) {
        await supabase.from('customers').update(customerData).eq('id', editingCustomerId);
      } else {
        await supabase.from('customers').insert([{ id: calculatedId, ...customerData }]);
      }
      alert("✅ រក្សាទុកទិន្នន័យអតិថិជនជោគជ័យ!");
      resetCustomerForm(); fetchCustomers();
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
      resetProductForm(); fetchProducts();
    } catch (err) { alert(err.message); }
  };

  // --- DELETE FUNCTIONS ---
  const deleteInvoice = async (id) => {
    if (!window.confirm(`តើអ្នកពិតជាចង់លុបវិក្កយបត្រលេខ #${id} មែនទេ?\nការលុបនេះមិនអាចទាញទិន្នន័យត្រឡប់មកវិញបានឡើយ!`)) return;
    try {
      await supabase.from('invoice_items').delete().eq('invoice_id', id);
      const { error } = await supabase.from('invoices').delete().eq('id', id);
      if (error) throw error;
      
      alert("✅ បានលុបវិក្កយបត្រចេញពីប្រព័ន្ធ!");
      if (editingInvoiceId === id) resetInvoiceForm();
      fetchInvoices();
    } catch (err) { alert("❌ មិនអាចលុបបានទេ៖ " + err.message); }
  };

  const deleteCustomer = async (id, name) => {
    if (!window.confirm(`តើអ្នកពិតជាចង់លុបអតិថិជនឈ្មោះ ${name} មែនទេ?\nបញ្ជាក់៖ អ្នកមិនអាចលុបអតិថិជនដែលមានជាប់ប្រវត្តិទិញទំនិញបានឡើយ។`)) return;
    try {
      const { error } = await supabase.from('customers').delete().eq('id', id);
      if (error) throw error;
      
      alert("✅ បានលុបទិន្នន័យអតិថិជន!");
      if (editingCustomerId === id) resetCustomerForm();
      fetchCustomers();
    } catch (err) { alert("❌ មិនអាចលុបបានទេ (អាចដោយសារគាត់មានវិក្កយបត្រក្នុងប្រព័ន្ធ)៖ " + err.message); }
  };

  const deleteProduct = async (id, name) => {
    if (!window.confirm(`តើអ្នកពិតជាចង់លុបទំនិញឈ្មោះ ${name} មែនទេ?`)) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      
      alert("✅ បានលុបមុខទំនិញជោគជ័យ!");
      if (editingProductId === id) resetProductForm();
      fetchProducts();
    } catch (err) { alert("❌ មិនអាចលុបបានទេ (ទំនិញនេះកំពុងជាប់ក្នុងវិក្កយបត្រចាស់ៗ)៖ " + err.message); }
  };

  // --- RESETS & LOADS ---
  const loadInvoiceEdit = async (inv) => {
    setEditingInvoiceId(inv.id); setInvoiceId(inv.id); setInvoiceStatus(inv.status);
    setInvoiceDiscount(inv.discount || '');
    setInvoiceCrop(inv.crop_type || '');
    setInvoiceBranch(inv.branch || ''); // Load Branch
    setInvoiceDate(inv.invoice_date ? inv.invoice_date.split('T')[0] : new Date().toISOString().split('T')[0]);
    const cust = customers.find(c => c.id === inv.customer_id);
    setCustomerSearchInput(cust ? `${cust.name} (ID: ${cust.id})` : '');
    const { data } = await supabase.from('invoice_items').select('*').eq('invoice_id', inv.id);
    if (data) setInvoiceRows(data.map(d => ({ id: 'row_' + Math.random(), search_input: d.product_name, product_id: d.product_id, quantity: d.quantity, unit_price: d.unit_price })));
  };

  const loadCustomerEdit = (c) => {
    setEditingCustomerId(c.id); setCustName(c.name); setCustPhone(c.phone); setCustSex(c.sex || '');
    setCustVillage(c.village || ''); setCustCommune(c.commune || ''); setCustDistrict(c.district || ''); setCustProvince(c.province || ''); setCustCrop(c.crop || '');
  };

  const resetInvoiceForm = () => {
    setEditingInvoiceId(null); setInvoiceId(''); setInvoiceStatus('កសិករ');
    setInvoiceDiscount(''); setInvoiceCrop(''); setInvoiceBranch(''); // Reset Branch
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setInvoiceRows([{ id: 'init', search_input: '', product_id: '', quantity: 1, unit_price: '' }]);
  };
  const resetCustomerForm = () => {
    setEditingCustomerId(null); setCustName(''); setCustPhone(''); setCustSex('');
    setCustVillage(''); setCustCommune(''); setCustDistrict(''); setCustProvince(''); setCustCrop('');
  };
  const resetProductForm = () => { setEditingProductId(null); setProdName(''); setProdPrice(''); };

  // --- UI CLASSES ---
  const paddingMain = isCompactMode ? 'p-2 p-md-3' : 'p-4 p-md-5';
  const paddingCard = isCompactMode ? 'p-3' : 'p-4 p-md-5';
  const gapRows = isCompactMode ? 'g-3' : 'g-4';
  const tableSize = isCompactMode ? 'table-sm' : '';
  const inputSize = isCompactMode ? 'form-control-sm' : '';
  const selectSize = isCompactMode ? 'form-select-sm' : '';
  const btnSize = isCompactMode ? 'btn-sm' : '';

  // --- RENDER ---
  if (!session) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
        <div className="card shadow border-0 rounded-4" style={{ maxWidth: '400px', width: '100%' }}>
          <div className="card-header text-center p-4 border-bottom bg-white rounded-top-4">
            <h2 className="fw-black mb-0 text-dark">ស្រែមាស</h2>
            <p className="mb-0 text-muted small mt-1">សូមចូលគណនី (Login)</p>
          </div>
          <div className="card-body p-4 p-md-5">
            <form onSubmit={handleLogin}>
              <div className="mb-3">
                <label className="form-label text-muted small fw-bold">អ៊ីមែល (Email)</label>
                <input type="email" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="form-control bg-light border-0 rounded-3 p-2" />
              </div>
              <div className="mb-4">
                <label className="form-label text-muted small fw-bold">លេខសម្ងាត់ (Password)</label>
                <input type="password" required value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="form-control bg-light border-0 rounded-3 p-2" />
              </div>
              <button type="submit" disabled={authLoading} className="btn btn-dark w-100 fw-bold rounded-3 py-2 shadow-sm">
                {authLoading ? 'កំពុងភ្ជាប់...' : 'ចូលប្រព័ន្ធ 🔓'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid p-0 min-vh-100 d-flex bg-light" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      
      {/* SIDEBAR */}
      <div className="d-flex flex-column flex-shrink-0 bg-white border-end transition-all shadow-sm" style={{ width: isSidebarCollapsed ? '80px' : '260px', minHeight: '100vh', transition: 'width 0.3s ease' }}>
        <div className={`d-flex align-items-center justify-content-between border-bottom w-100 ${isCompactMode ? 'p-2' : 'p-3'}`}>
          {!isSidebarCollapsed && <span className={`${isCompactMode ? 'fs-6' : 'fs-5'} fw-bold text-dark text-truncate px-2`}>🌾 ស្រែមាស</span>}
          <button className={`btn btn-light border-0 mx-auto ${isCompactMode ? 'p-1' : 'p-2'}`} onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}>
            <span className={isCompactMode ? 'fs-6' : 'fs-5'}>☰</span>
          </button>
        </div>
        
        <ul className="nav nav-pills flex-column mb-auto p-2 gap-1 mt-2">
          <li className="nav-item">
            <button className={`nav-link w-100 text-start px-3 border-0 fw-bold rounded-3 ${isCompactMode ? 'py-1.5' : 'py-2.5'} ${activeTab === 'invoice' ? 'bg-dark text-white' : 'text-dark hover-bg-light'}`} onClick={() => setActiveTab('invoice')}>
              📝 {!isSidebarCollapsed && " វិក្កយបត្រ"}
            </button>
          </li>
          {userRole === 'admin' && (
            <>
              <li>
                <button className={`nav-link w-100 text-start px-3 border-0 fw-bold rounded-3 ${isCompactMode ? 'py-1.5' : 'py-2.5'} ${activeTab === 'customer' ? 'bg-dark text-white' : 'text-dark hover-bg-light'}`} onClick={() => setActiveTab('customer')}>
                  👥 {!isSidebarCollapsed && " អតិថិជន"}
                </button>
              </li>
              <li>
                <button className={`nav-link w-100 text-start px-3 border-0 fw-bold rounded-3 ${isCompactMode ? 'py-1.5' : 'py-2.5'} ${activeTab === 'product' ? 'bg-dark text-white' : 'text-dark hover-bg-light'}`} onClick={() => setActiveTab('product')}>
                  📦 {!isSidebarCollapsed && " មុខទំនិញ"}
                </button>
              </li>
            </>
          )}
        </ul>
        
        <div className={`p-3 border-top w-100 ${isSidebarCollapsed ? 'text-center px-2' : ''}`}>
          <button onClick={() => setIsCompactMode(!isCompactMode)} className={`btn btn-sm w-100 rounded fw-bold mb-3 ${isCompactMode ? 'btn-dark' : 'btn-outline-dark'}`}>
            {isSidebarCollapsed ? (isCompactMode ? '🗜️' : '🖥️') : (isCompactMode ? '🗜️ បិទ Compact' : '🖥️ បើក Compact')}
          </button>
          {!isSidebarCollapsed && (
            <>
              <div className="badge bg-light text-dark border px-2 py-1 rounded fw-bold text-uppercase mb-2" style={{ fontSize: '10px' }}>
                {userRole === 'admin' ? '👑 Admin' : '👤 Staff'}
              </div>
              <div className="text-muted font-monospace mb-3 truncate" style={{ fontSize: '11px' }}>{session.user.email}</div>
            </>
          )}
          <button onClick={handleLogout} className="btn btn-sm btn-outline-danger w-100 rounded fw-bold">
            {isSidebarCollapsed ? '🚪' : 'ចាកចេញ'}
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className={`flex-grow-1 overflow-auto ${paddingMain}`} style={{ maxHeight: '100vh' }}>
        <datalist id="customerPredictPool">{customers.map(c => <option key={c.id} value={`${c.name} (ID: ${c.id})`} />)}</datalist>
        <datalist id="productPredictPool">{products.map(p => <option key={p.id} value={p.product_name} />)}</datalist>
        
        <datalist id="cropPool">
          <option value="ស្រូវ" />
          <option value="ស្វាយចន្ទី" />
          <option value="ដំឡូងមី" />
          <option value="ពោត" />
          <option value="ស្វាយ" />
          <option value="ទុរេន" />
          <option value="ម្រេច" />
          <option value="បន្លែចម្រុះ" />
        </datalist>

        {/* NEW: Datalist for Branches */}
        <datalist id="branchPool">
          <option value="បឹងកុក" />
          <option value="កំពង់ចាម" />
          <option value="ព្រះវិហារ" />
          <option value="មេមត់" />
          <option value="បែកអន្លូង" />
          <option value="សៀមរាប" />
          <option value="បាត់ដំបង" />
          <option value="ស្ទឹងត្រែង" />
          <option value="ចំការលើ" />
        </datalist>

        <div className={`card border-0 shadow-sm bg-white ${isCompactMode ? 'rounded-3 p-3' : 'rounded-4 p-4 p-md-5'}`}>
          
          {/* TAB: INVOICE */}
          {activeTab === 'invoice' && (
            <div className={`row ${gapRows}`}>
              <div className="col-xl-5 border-end-xl">
                <h6 className="text-dark fw-bold mb-3">{editingInvoiceId ? `⚙️ កែប្រែវិក្កយបត្រ #${editingInvoiceId}` : '➕ បង្កើតវិក្កយបត្រថ្មី'}</h6>
                <form onSubmit={submitInvoice}>
                  <div className={`row g-2 bg-light rounded-3 border ${isCompactMode ? 'mb-2 p-2' : 'mb-4 p-3'}`}>
                    <div className="col-sm-6">
                      <label className="form-label text-muted small fw-bold mb-1">លេខវិក្កយបត្រ (៨ ខ្ទង់)</label>
                      <input type="text" value={invoiceId} onChange={(e) => { const onlyNums = e.target.value.replace(/[^0-9]/g, ''); if (onlyNums.length <= 8) setInvoiceId(onlyNums); }} disabled={!!editingInvoiceId} required maxLength="8" pattern="\d{8}" title="សូមបញ្ចូលលេខ ៨ ខ្ទង់គត់" className={`form-control ${inputSize} rounded-2 border-secondary-subtle font-monospace`} placeholder="20260001" />
                    </div>
                    <div className="col-sm-6">
                      <label className="form-label text-muted small fw-bold mb-1">កាលបរិច្ឆេទ</label>
                      <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} required className={`form-control ${inputSize} rounded-2 border-secondary-subtle`} />
                    </div>
                    <div className="col-sm-4">
                      <label className="form-label text-muted small fw-bold mb-1">ប្រភេទអតិថិជន</label>
                      <select value={invoiceStatus} onChange={(e) => setInvoiceStatus(e.target.value)} className={`form-select ${selectSize} rounded-2 border-secondary-subtle`}>
                        <option value="កសិករ">កសិករ 🧑‍🌾</option>
                        <option value="ដេប៉ូ">ដេប៉ូ 🏪</option>
                      </select>
                    </div>
                    <div className="col-sm-4">
                      <label className="form-label text-muted small fw-bold mb-1">ប្រភេទដំណាំ</label>
                      <input type="text" list="cropPool" value={invoiceCrop} onChange={(e) => setInvoiceCrop(e.target.value)} className={`form-control ${inputSize} rounded-2 border-secondary-subtle`} placeholder="វាយបញ្ចូល..." />
                    </div>
                    <div className="col-sm-4">
                      <label className="form-label text-muted small fw-bold mb-1">សាខា</label>
                      {/* NEW: Input with datalist for Branch */}
                      <input type="text" list="branchPool" value={invoiceBranch} onChange={(e) => setInvoiceBranch(e.target.value)} className={`form-control ${inputSize} rounded-2 border-secondary-subtle`} placeholder="ជ្រើសរើសសាខា..." />
                    </div>
                    <div className="col-12">
                      <label className="form-label text-muted small fw-bold mb-1">🔍 ស្វែងរកអតិថិជន</label>
                      <input type="text" list="customerPredictPool" value={customerSearchInput} onChange={(e) => setCustomerSearchInput(e.target.value)} required className={`form-control ${inputSize} rounded-2 border-dark shadow-none`} placeholder="ឈ្មោះ ឬ លេខសម្គាល់..." />
                    </div>
                  </div>

                  <div className={isCompactMode ? 'mb-2' : 'mb-4'}>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="mb-0 text-dark fw-bold small">📦 បញ្ជីទំនិញ</span>
                      <button type="button" onClick={addItemRow} className={`btn btn-outline-dark rounded px-2 fw-bold ${btnSize}`} style={{ fontSize: '12px' }}>+ ថែមជួរ</button>
                    </div>
                    <div className="d-flex flex-column gap-1" style={{ maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
                      <div className="row g-1 px-2 mb-1 text-muted fw-bold text-center" style={{ fontSize: '11px' }}>
                        <div className="col-4 text-start">ទំនិញ</div>
                        <div className="col-2">ចំនួន</div>
                        <div className="col-3 text-end">តម្លៃ(៛)</div>
                        <div className="col-2 text-end">សរុប(៛)</div>
                        <div className="col-1"></div>
                      </div>

                      {invoiceRows.map((row) => {
                        const rowSubtotal = (Number(row.quantity) || 0) * (Number(row.unit_price) || 0);

                        return (
                          <div key={row.id} className={`row g-1 align-items-center bg-white rounded-2 border mx-0 shadow-sm ${isCompactMode ? 'p-1' : 'p-2'}`} style={{ borderLeft: row.product_id ? '3px solid #212529' : '3px solid #dc3545' }}>
                            <div className="col-4">
                              <input type="text" list="productPredictPool" value={row.search_input} onChange={(e) => handleProductSearchChange(row.id, e.target.value)} required className="form-control form-control-sm border-secondary-subtle" placeholder="ស្វែងរក..." />
                            </div>
                            <div className="col-2">
                              <input type="number" min="1" value={row.quantity} onChange={(e) => handleRowChange(row.id, 'quantity', e.target.value)} required className="form-control form-control-sm border-secondary-subtle text-center fw-bold px-1" />
                            </div>
                            <div className="col-3">
                              <input type="number" min="0" value={row.unit_price} onChange={(e) => handleRowChange(row.id, 'unit_price', e.target.value)} required className="form-control form-control-sm border-secondary-subtle font-monospace text-end px-1" />
                            </div>
                            <div className="col-2 text-end text-dark font-monospace fw-bold" style={{ fontSize: '11px', alignSelf: 'center' }}>
                              {rowSubtotal.toLocaleString()}
                            </div>
                            <div className="col-1 text-center">
                              <button type="button" onClick={() => removeItemRow(row.id)} className="btn btn-link btn-sm p-0 text-danger text-decoration-none fw-bold">✕</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className={`bg-light border rounded-3 ${isCompactMode ? 'p-3' : 'p-4'}`}>
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="text-muted small fw-bold">សរុបដើម (Subtotal)</span>
                      <span className="fw-bold">{calculateSubTotal().toLocaleString()} ៛</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="text-muted small fw-bold">បញ្ចុះតម្លៃ (Discount)</span>
                      <div className="input-group input-group-sm" style={{ width: '120px' }}>
                        <input type="number" min="0" value={invoiceDiscount} onChange={(e) => setInvoiceDiscount(e.target.value)} className="form-control text-end border-secondary-subtle px-1" placeholder="0" />
                        <span className="input-group-text bg-white text-muted px-2">៛</span>
                      </div>
                    </div>
                    
                    <hr className="my-2 opacity-25 border-dark" />
                    
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <div className="text-dark small fw-bold mb-1">សរុបរួម (Grand Total)</div>
                        <div className="d-flex align-items-baseline gap-2">
                          <div>
                            <span className={`${isCompactMode ? 'fs-5' : 'fs-4'} fw-black text-dark font-monospace`}>{calculateGrandTotal().toLocaleString()}</span> <span className="text-dark fw-bold small">៛</span>
                          </div>
                          <div className="text-muted fw-bold">/</div>
                          <div>
                            <span className={`${isCompactMode ? 'fs-5' : 'fs-4'} fw-black text-success font-monospace`}>${calculateGrandTotalUSD().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        </div>

                        <div className="text-secondary fw-bold mt-1" style={{ fontSize: '11px' }}>
                          អក្សរ៖ {readKhmerAmount(calculateGrandTotal())}
                        </div>
                      </div>
                      <div className="d-flex flex-column gap-2">
                        <button type="submit" className={`btn btn-dark rounded-2 px-3 fw-bold ${btnSize}`}>💾 រក្សាទុក</button>
                        {editingInvoiceId && <button type="button" onClick={resetInvoiceForm} className={`btn btn-outline-secondary rounded-2 px-2 fw-bold ${btnSize}`}>បោះបង់</button>}
                      </div>
                    </div>
                  </div>
                </form>
              </div>

              <div className="col-xl-7 ps-xl-4 d-flex flex-column" style={{ maxHeight: 'calc(100vh - 100px)' }}>
                <h6 className="text-dark fw-bold mb-2">🔍 ប្រវត្តិលក់ និងស្វែងរក</h6>
                
                <div className="d-flex gap-2 mb-2">
                  <div className="input-group input-group-sm rounded-2 overflow-hidden border flex-grow-1">
                    <span className="input-group-text bg-light border-0 text-muted">🔎</span>
                    <input type="text" value={searchInv} onChange={(e) => setSearchInv(e.target.value)} placeholder="ស្វែងរកលេខ ឬ អតិថិជន..." className="form-control border-0 shadow-none bg-light" />
                  </div>
                  <select className="form-select form-select-sm border rounded-2 bg-light shadow-none" style={{ width: '130px' }} value={filterInvStatus} onChange={e => setFilterInvStatus(e.target.value)}>
                    <option value="All">គ្រប់ប្រភេទ</option>
                    <option value="កសិករ">កសិករ 🧑‍🌾</option>
                    <option value="ដេប៉ូ">ដេប៉ូ 🏪</option>
                  </select>
                </div>
                
                <div className="border rounded-3 flex-grow-1 overflow-auto shadow-sm">
                  <table className={`table table-hover align-middle mb-0 small ${tableSize}`} style={{ minWidth: '450px' }}>
                    <thead className="table-light text-muted sticky-top">
                      <tr style={{ cursor: 'pointer' }}>
                        <th className="py-2 ps-3" onClick={() => handleSort('inv', 'invoice_date')}>កាលបរិច្ឆេទ</th>
                        <th onClick={() => handleSort('inv', 'id')}>វិក្កយបត្រ</th>
                        <th onClick={() => handleSort('inv', 'customer_name')}>អតិថិជន</th>
                        <th className="text-end" onClick={() => handleSort('inv', 'total_amount')}>សរុប ($ / ៛)</th>
                        <th className="text-center" onClick={() => handleSort('inv', 'status')}>ប្រភេទ</th>
                        <th className="text-center pe-3">សកម្មភាព</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedInvoices.map(inv => (
                        <tr key={inv.id}>
                          <td className="ps-3 text-muted">{new Date(inv.invoice_date).toLocaleDateString('km-KH')}</td>
                          <td>
                            <div className="font-monospace fw-bold text-dark">{inv.id}</div>
                            {/* DISPLAY BRANCH HERE */}
                            {inv.branch && <div className="text-muted" style={{fontSize:'10px'}}>📍 {inv.branch}</div>}
                          </td>
                          <td>
                            <div className="fw-semibold text-secondary">{inv.customers ? inv.customers.name : 'Unknown'}</div>
                            {inv.crop_type && <div className="text-muted" style={{fontSize:'10px'}}>🌱 {inv.crop_type}</div>}
                          </td>
                          <td className="text-end">
                            <div className="font-monospace fw-bold text-dark">${(inv.total_amount / 4000).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                            <div className="text-secondary fw-bold" style={{ fontSize: '11px', marginTop: '2px' }}>
                              {toKhmerNum(inv.total_amount.toLocaleString())} ៛
                            </div>
                          </td>
                          <td className="text-center"><span className={`badge rounded px-2 py-1 border ${inv.status === 'ដេប៉ូ' ? 'bg-light text-primary border-primary' : 'bg-light text-success border-success'}`} style={{ fontSize: '10px' }}>{inv.status}</span></td>
                          <td className="text-center pe-3">
                            <div className="d-flex justify-content-center gap-1">
                              <button className="btn btn-sm btn-light border rounded px-2 py-0" onClick={() => loadInvoiceEdit(inv)} title="កែប្រែ">⚙️</button>
                              <button className="btn btn-sm btn-outline-danger border-0 rounded px-2 py-0" onClick={() => deleteInvoice(inv.id)} title="លុប">🗑️</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: CUSTOMER */}
          {activeTab === 'customer' && userRole === 'admin' && (
            <div className={`row ${gapRows}`}>
              <div className="col-12 col-xl-4 border-end-xl">
                <h6 className="text-dark fw-bold mb-3">{editingCustomerId ? '⚙️ កែប្រែអតិថិជន' : '➕ បន្ថែមអតិថិជនថ្មី'}</h6>
                <form onSubmit={submitCustomer} className={`bg-light rounded-3 border row g-2 ${isCompactMode ? 'p-3' : 'p-4'}`}>
                  <div className="col-sm-8">
                    <label className="form-label text-muted small fw-bold mb-1">ឈ្មោះអតិថិជន *</label>
                    <input type="text" value={custName} onChange={(e) => setCustName(e.target.value)} required className={`form-control ${inputSize} rounded-2`} />
                  </div>
                  <div className="col-sm-4">
                    <label className="form-label text-muted small fw-bold mb-1">ភេទ</label>
                    <select value={custSex} onChange={(e) => setCustSex(e.target.value)} className={`form-select ${selectSize} rounded-2`}>
                      <option value="">(ជ្រើស)</option>
                      <option value="ប្រុស">ប្រុស</option>
                      <option value="ស្រី">ស្រី</option>
                    </select>
                  </div>
                  <div className="col-sm-12">
                    <label className="form-label text-muted small fw-bold mb-1">លេខទូរស័ព្ទ *</label>
                    <input type="text" value={custPhone} onChange={(e) => setCustPhone(e.target.value)} required className={`form-control ${inputSize} rounded-2 font-monospace`} placeholder="+855..." />
                  </div>
                  <div className="col-sm-12">
                    <label className="form-label text-muted small fw-bold mb-1">ដំណាំដាំដុះ</label>
                    <input type="text" value={custCrop} onChange={(e) => setCustCrop(e.target.value)} className={`form-control ${inputSize} rounded-2`} placeholder="ស្រូវ, ស្វាយចន្ទី" />
                  </div>
                  <div className="col-12 mt-2">
                    <span className="text-dark small d-block fw-bold border-bottom pb-1 mb-1">📍 អាសយដ្ឋាន (ស្រេចចិត្ត)</span>
                    <div className="row g-1">
                      <div className="col-6"><input type="text" value={custVillage} onChange={(e) => setCustVillage(e.target.value)} className="form-control form-control-sm rounded-2" placeholder="ភូមិ" /></div>
                      <div className="col-6"><input type="text" value={custCommune} onChange={(e) => setCustCommune(e.target.value)} className="form-control form-control-sm rounded-2" placeholder="ឃុំ" /></div>
                      <div className="col-6"><input type="text" value={custDistrict} onChange={(e) => setCustDistrict(e.target.value)} className="form-control form-control-sm rounded-2" placeholder="ស្រុក" /></div>
                      <div className="col-6"><input type="text" value={custProvince} onChange={(e) => setCustProvince(e.target.value)} className="form-control form-control-sm rounded-2" placeholder="ខេត្ត" /></div>
                    </div>
                  </div>
                  <div className="col-12 d-flex gap-2 mt-3">
                    {editingCustomerId && <button type="button" onClick={resetCustomerForm} className={`btn btn-outline-secondary w-50 fw-bold ${btnSize}`}>បោះបង់</button>}
                    <button type="submit" className={`btn btn-dark w-100 fw-bold ${btnSize}`}>💾 រក្សាទុក</button>
                  </div>
                </form>
              </div>
              
              <div className="col-12 col-xl-8 ps-xl-4 d-flex flex-column" style={{ maxHeight: 'calc(100vh - 100px)' }}>
                <h6 className="text-dark fw-bold mb-2">🔍 បញ្ជីអតិថិជនទាំងអស់</h6>
                
                <div className="d-flex gap-2 mb-2">
                  <div className="input-group input-group-sm rounded-2 border flex-grow-1">
                    <span className="input-group-text bg-light border-0 text-muted">🔎</span>
                    <input type="text" value={searchCust} onChange={(e) => setSearchCust(e.target.value)} placeholder="វាយរកតាមឈ្មោះ ឬ លេខ..." className="form-control border-0 shadow-none bg-light" />
                  </div>
                  <select className="form-select form-select-sm border rounded-2 bg-light shadow-none" style={{ width: '110px' }} value={filterCustSex} onChange={e => setFilterCustSex(e.target.value)}>
                    <option value="All">គ្រប់ភេទ</option>
                    <option value="ប្រុស">ប្រុស</option>
                    <option value="ស្រី">ស្រី</option>
                  </select>
                </div>

                <div className="border rounded-3 flex-grow-1 overflow-auto shadow-sm">
                  <table className={`table table-hover align-middle mb-0 small ${tableSize}`} style={{ minWidth: '550px' }}>
                    <thead className="table-light text-muted sticky-top">
                      <tr style={{ cursor: 'pointer' }}>
                        <th className="py-2 ps-3" onClick={() => handleSort('cust', 'name')}>ឈ្មោះ / ភេទ</th>
                        <th onClick={() => handleSort('cust', 'phone')}>លេខទូរស័ព្ទ</th>
                        <th onClick={() => handleSort('cust', 'crop')}>ដំណាំ</th>
                        <th onClick={() => handleSort('cust', 'province')}>អាសយដ្ឋាន</th>
                        <th className="text-center pe-3">សកម្មភាព</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedCustomers.map(c => (
                        <tr key={c.id}>
                          <td className="ps-3"><strong className="text-dark d-block">{c.name}</strong><span className="text-muted font-monospace" style={{fontSize:'10px'}}>{c.sex || '—'}</span></td>
                          <td className="font-monospace text-secondary">{c.phone}</td>
                          <td><span className="badge bg-light text-dark border">{c.crop || '—'}</span></td>
                          <td className="text-muted" style={{ fontSize: '11px' }}>{c.village || c.commune || c.district || c.province ? `${c.village||'-'}, ${c.commune||'-'}, ${c.district||'-'}, ${c.province||'-'}` : '—'}</td>
                          <td className="text-center pe-3">
                            <div className="d-flex justify-content-center gap-1">
                              <button className="btn btn-sm btn-light border rounded px-2 py-0" onClick={() => loadCustomerEdit(c)} title="កែប្រែ">✏️</button>
                              <button className="btn btn-sm btn-outline-danger border-0 rounded px-2 py-0" onClick={() => deleteCustomer(c.id, c.name)} title="លុប">🗑️</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: PRODUCT */}
          {activeTab === 'product' && userRole === 'admin' && (
            <div className={`row ${gapRows}`}>
              <div className="col-md-4 border-end-md">
                <h6 className="text-dark fw-bold mb-3">{editingProductId ? '⚙️ កែប្រែទំនិញ' : '➕ បន្ថែមទំនិញថ្មី'}</h6>
                <form onSubmit={submitProduct} className={`bg-light rounded-3 border ${isCompactMode ? 'p-3' : 'p-4'}`}>
                  <div className="mb-2">
                    <label className="form-label text-muted small fw-bold mb-1">ឈ្មោះទំនិញ</label>
                    <input type="text" value={prodName} onChange={(e) => setProdName(e.target.value)} required className={`form-control ${inputSize} rounded-2`} />
                  </div>
                  <div className="mb-2">
                    <label className="form-label text-muted small fw-bold mb-1">ប្រភេទក្រុមទំនិញ</label>
                    <select value={prodCategory} onChange={(e) => setProdCategory(e.target.value)} className={`form-select ${selectSize} rounded-2`}>
                      <option value="Granular Fertilizer">ជីគ្រាប់</option>
                      <option value="Liquid Fertilizer">ជីទឹក</option>
                      <option value="Powder Fertilizer">ជីម្សៅ</option>
                      <option value="Pesticide">ថ្នាំសត្វល្អិត</option>
                      <option value="Fungicide">ថ្នាំជំងឺ</option>
                      <option value="Herbicide">ថ្នាំស្មៅ</option>
                      <option value="PGRs">ថ្នាំជំរុញការលូតលាស់</option>
                      <option value="Seed">គ្រាប់ពូជ</option>
                      <option value="Others">ផ្សេងៗ</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-muted small fw-bold mb-1">តម្លៃគោលរាយ (៛)</label>
                    <input type="number" value={prodPrice} onChange={(e) => setProdPrice(e.target.value)} required className={`form-control ${inputSize} rounded-2 font-monospace`} />
                  </div>
                  <div className="d-flex gap-2">
                    {editingProductId && <button type="button" onClick={resetProductForm} className={`btn btn-outline-secondary w-50 fw-bold ${btnSize}`}>បោះបង់</button>}
                    <button type="submit" className={`btn btn-dark w-100 fw-bold ${btnSize}`}>💾 រក្សាទុក</button>
                  </div>
                </form>
              </div>
              
              <div className="col-md-8 ps-md-4 d-flex flex-column" style={{ maxHeight: 'calc(100vh - 100px)' }}>
                <h6 className="text-dark fw-bold mb-2">🔍 ស្តុកមុខទំនិញទាំងអស់</h6>
                
                <div className="d-flex gap-2 mb-2">
                  <div className="input-group input-group-sm rounded-2 border flex-grow-1">
                    <span className="input-group-text bg-light border-0 text-muted">🔎</span>
                    <input type="text" value={searchProd} onChange={(e) => setSearchProd(e.target.value)} placeholder="វាយស្វែងរកឈ្មោះទំនិញ..." className="form-control border-0 shadow-none bg-light" />
                  </div>
                  <select className="form-select form-select-sm border rounded-2 bg-light shadow-none" style={{ width: '150px' }} value={filterProdCategory} onChange={e => setFilterProdCategory(e.target.value)}>
                    <option value="All">គ្រប់ប្រភេទ</option>
                    <option value="Granular Fertilizer">ជីគ្រាប់</option>
                    <option value="Liquid Fertilizer">ជីទឹក</option>
                    <option value="Powder Fertilizer">ជីម្សៅ</option>
                    <option value="Pesticide">ថ្នាំសត្វល្អិត</option>
                    <option value="Fungicide">ថ្នាំជំងឺ</option>
                    <option value="Herbicide">ថ្នាំស្មៅ</option>
                    <option value="PGRs">ថ្នាំជំរុញការលូតលាស់</option>
                    <option value="Seed">គ្រាប់ពូជ</option>
                    <option value="Others">ផ្សេងៗ</option>
                  </select>
                </div>

                <div className="border rounded-3 flex-grow-1 overflow-auto shadow-sm">
                  <table className={`table table-hover align-middle mb-0 small ${tableSize}`}>
                    <thead className="table-light text-muted sticky-top">
                      <tr style={{ cursor: 'pointer' }}>
                        <th className="py-2 ps-3" onClick={() => handleSort('prod', 'product_name')}>ឈ្មោះទំនិញ</th>
                        <th onClick={() => handleSort('prod', 'category')}>ប្រភេទក្រុម</th>
                        <th className="text-end" onClick={() => handleSort('prod', 'default_price_riel')}>តម្លៃគោល</th>
                        <th className="text-center pe-3">សកម្មភាព</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedProducts.map(p => (
                        <tr key={p.id}>
                          <td className="ps-3"><strong className="text-dark">{p.product_name}</strong></td>
                          <td><span className="badge bg-light text-secondary border rounded-1">{p.category}</span></td>
                          <td className="text-end font-monospace fw-bold text-dark">{Number(p.default_price_riel).toLocaleString()} ៛</td>
                          <td className="text-center pe-3">
                            <div className="d-flex justify-content-center gap-1">
                              <button className="btn btn-sm btn-light border rounded px-2 py-0" onClick={() => { setEditingProductId(p.id); setProdName(p.product_name); setProdCategory(p.category); setProdPrice(p.default_price_riel); }} title="កែប្រែ">✏️</button>
                              <button className="btn btn-sm btn-outline-danger border-0 rounded px-2 py-0" onClick={() => deleteProduct(p.id, p.product_name)} title="លុប">🗑️</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}