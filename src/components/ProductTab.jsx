import React, { useState, useEffect, useMemo } from 'react';
import { supabase, ITEMS_PER_PAGE } from '../utils';

export default function ProductTab({ isCompactMode }) {
  const [products, setProducts] = useState([]);
  const [searchProd, setSearchProd] = useState('');
  const [filterProdCategory, setFilterProdCategory] = useState('All');
  const [sortProd, setSortProd] = useState({ key: 'product_name', dir: 'asc' });
  const [pageProd, setPageProd] = useState(1);

  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState('Granular Fertilizer');
  const [prodPrice, setProdPrice] = useState('');
  const [editingProductId, setEditingProductId] = useState(null);

  useEffect(() => { fetchProducts(); }, []);
  useEffect(() => { setPageProd(1); }, [searchProd, filterProdCategory, sortProd]);

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*');
    if (data) setProducts(data);
  };

  const submitProduct = async (e) => {
    e.preventDefault();
    try {
      if (editingProductId) await supabase.from('products').update({ product_name: prodName, category: prodCategory, default_price_riel: Number(prodPrice) }).eq('id', editingProductId);
      else await supabase.from('products').insert([{ product_name: prodName, category: prodCategory, default_price_riel: Number(prodPrice) }]);
      alert("✅ រក្សាទុកមុខទំនិញជោគជ័យ!");
      resetForm(); fetchProducts();
    } catch (err) { alert(err.message); }
  };

  const deleteProduct = async (id, name) => {
    if (!window.confirm(`តើអ្នកពិតជាចង់លុបទំនិញឈ្មោះ ${name} មែនទេ?`)) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      alert("✅ បានលុបមុខទំនិញជោគជ័យ!");
      if (editingProductId === id) resetForm();
      fetchProducts();
    } catch (err) { alert("❌ មិនអាចលុបបានទេ៖ " + err.message); }
  };

  const resetForm = () => { setEditingProductId(null); setProdName(''); setProdPrice(''); };

  const handleSort = (key) => setSortProd({ key, dir: sortProd.key === key && sortProd.dir === 'asc' ? 'desc' : 'asc' });

  const sortedProducts = useMemo(() => {
    let filtered = products.filter(p => {
      const matchSearch = (p.product_name || '').toLowerCase().includes((searchProd || '').toLowerCase());
      const matchCat = filterProdCategory === 'All' || p.category === filterProdCategory;
      return matchSearch && matchCat;
    });
    return filtered.sort((a, b) => {
      const valA = a[sortProd.key] || '';
      const valB = b[sortProd.key] || '';
      if (valA < valB) return sortProd.dir === 'asc' ? -1 : 1;
      if (valA > valB) return sortProd.dir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [products, searchProd, sortProd, filterProdCategory]);

  const paginatedProducts = sortedProducts.slice((pageProd - 1) * ITEMS_PER_PAGE, pageProd * ITEMS_PER_PAGE);

  const inputStyle = `w-full bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-800 transition-all ${isCompactMode ? 'px-2.5 py-1 text-xs' : 'px-3 py-2 text-sm'}`;
  const selectStyle = `w-full bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-800 transition-all ${isCompactMode ? 'px-2.5 py-1 text-xs' : 'px-3 py-2 text-sm'}`;

  return (
    <div className={`grid grid-cols-1 md:grid-cols-12 ${isCompactMode ? 'gap-4' : 'gap-6'}`}>
      
      {/* FORM SECTION (LEFT COLUMN) */}
      <div className="md:col-span-4 md:border-r md:border-gray-200 md:pr-6">
        <h6 className="text-gray-900 font-bold text-base mb-3">
          {editingProductId ? '⚙️ កែប្រែទំនិញ' : '➕ បន្ថែមទំនិញថ្មី'}
        </h6>

        <form onSubmit={submitProduct} className={`bg-gray-50 rounded-xl border border-gray-200 space-y-3 ${isCompactMode ? 'p-3' : 'p-4'}`}>
          <div>
            <label className="block text-gray-600 text-[11px] font-bold mb-1">ឈ្មោះទំនិញ *</label>
            <input type="text" value={prodName} onChange={(e) => setProdName(e.target.value)} required className={inputStyle} />
          </div>

          <div>
            <label className="block text-gray-600 text-[11px] font-bold mb-1">ប្រភេទក្រុមទំនិញ</label>
            <select value={prodCategory} onChange={(e) => setProdCategory(e.target.value)} className={selectStyle}>
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

          <div>
            <label className="block text-gray-600 text-[11px] font-bold mb-1">តម្លៃគោលរាយ (៛) *</label>
            <input type="number" value={prodPrice} onChange={(e) => setProdPrice(e.target.value)} required className={`${inputStyle} font-mono`} />
          </div>

          <div className="flex gap-2 pt-1">
            {editingProductId && (
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
      <div className="md:col-span-8 flex flex-col h-full">
        <h6 className="text-gray-900 font-bold text-base mb-3">🔍 ស្តុកមុខទំនិញទាំងអស់</h6>
        
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-gray-400">🔎</span>
            <input 
              type="text" 
              value={searchProd} 
              onChange={(e) => setSearchProd(e.target.value)} 
              placeholder="ស្វែងរកឈ្មោះទំនិញ..." 
              className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900" 
            />
          </div>

          <select 
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 w-36" 
            value={filterProdCategory} 
            onChange={e => setFilterProdCategory(e.target.value)}
          >
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

        {/* TABLE CONTAINER */}
        <div className="border border-gray-200 rounded-xl shadow-sm bg-white flex flex-col flex-1 overflow-hidden">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-200 sticky top-0">
                <tr className="cursor-pointer">
                  <th className="py-2.5 px-4" onClick={() => handleSort('product_name')}>ឈ្មោះទំនិញ</th>
                  <th className="py-2.5 px-3" onClick={() => handleSort('category')}>ប្រភេទក្រុម</th>
                  <th className="py-2.5 px-4 text-right" onClick={() => handleSort('default_price_riel')}>តម្លៃគោល</th>
                  <th className="py-2.5 px-4 text-center">សកម្មភាព</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedProducts.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-gray-400">មិនមានទិន្នន័យទេ</td>
                  </tr>
                ) : (
                  paginatedProducts.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-2.5 px-4"><strong className="text-gray-900">{p.product_name}</strong></td>
                      <td className="py-2.5 px-3">
                        <span className="inline-block bg-gray-100 text-gray-600 border border-gray-200 px-2 py-0.5 rounded text-[10px] font-bold">
                          {p.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-gray-900">
                        {Number(p.default_price_riel || 0).toLocaleString()} ៛
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button 
                            className="p-1 text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded transition-colors" 
                            onClick={() => { setEditingProductId(p.id); setProdName(p.product_name); setProdCategory(p.category); setProdPrice(p.default_price_riel); }} 
                            title="កែប្រែ"
                          >
                            ✏️
                          </button>
                          <button 
                            className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 border border-transparent rounded transition-colors" 
                            onClick={() => deleteProduct(p.id, p.product_name)} 
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
          {sortedProducts.length > 0 && (
            <div className="flex items-center justify-between p-2.5 border-t border-gray-200 text-xs text-gray-600 no-print">
              <span className="font-bold">សរុប៖ {sortedProducts.length}</span>
              <div className="flex items-center gap-2">
                <button 
                  className="px-2.5 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40 transition-colors" 
                  disabled={pageProd <= 1} 
                  onClick={() => setPageProd(pageProd - 1)}
                >
                  ⬅️ មុន
                </button>
                <span className="font-mono font-bold text-gray-800">{pageProd} / {Math.ceil(sortedProducts.length / ITEMS_PER_PAGE)}</span>
                <button 
                  className="px-2.5 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40 transition-colors" 
                  disabled={pageProd >= Math.ceil(sortedProducts.length / ITEMS_PER_PAGE)} 
                  onClick={() => setPageProd(pageProd + 1)}
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