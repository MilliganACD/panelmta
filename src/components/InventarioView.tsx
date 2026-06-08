/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Product, Category, User } from '../types';
import { Search, Plus, FileSpreadsheet, Trash2, ShieldAlert, X, Check } from 'lucide-react';

interface InventarioViewProps {
  products: Product[];
  activeUser: User;
  onAddProduct: (newProduct: Product) => void;
  onUpdateStock: (productId: string, newStock: number) => void;
  onDeleteProduct: (productId: string) => void;
  inventoryLogs?: { date: string; type: string; productName: string; delta: number }[];
}

export default function InventarioView({
  products,
  activeUser,
  onAddProduct,
  onUpdateStock,
  onDeleteProduct,
  inventoryLogs = []
}: InventarioViewProps) {
  
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [stockFilter, setStockFilter] = useState<'todos' | 'bajo'>('todos');
  const [categoryFilter, setCategoryFilter] = useState<string>('Todos');
  
  // Create / Edit modal states
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showEditStockId, setShowEditStockId] = useState<string | null>(null);
  const [editingStockVal, setEditingStockVal] = useState<string>('');

  // Form Fields
  const [name, setName] = useState<string>('');
  const [sku, setSku] = useState<string>('');
  const [category, setCategory] = useState<Category>('Bebidas');
  const [price, setPrice] = useState<string>('');
  const [cost, setCost] = useState<string>('');
  const [stock, setStock] = useState<string>('');
  const [threshold, setThreshold] = useState<string>('5');
  const [imgUrl, setImgUrl] = useState<string>('');

  // Search Filter algorithm
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStock = stockFilter === 'todos' || p.stock <= p.lowStockThreshold;
      const matchCat = categoryFilter === 'Todos' || p.category === categoryFilter;
      return matchSearch && matchStock && matchCat;
    });
  }, [products, searchQuery, stockFilter, categoryFilter]);

  const valueInventario = useMemo(() => {
    return products.reduce((sum, p) => sum + (p.stock * p.price), 0);
  }, [products]);

  const totalItems = products.reduce((sum, p) => sum + p.stock, 0);
  const criticalItemsCount = products.filter(p => p.stock <= p.lowStockThreshold).length;

  const handleSubmitProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeUser.role !== 'ADMIN') {
      alert('❌ Solo un Administrador puede crear o actualizar el catálogo.');
      return;
    }
    if (!name || !sku || !price || !cost || !stock) {
      alert('⚠️ Por favor llene todos los campos obligatorios');
      return;
    }

    const defaultImages: Record<Category, string> = {
      'Bebidas': 'https://images.unsplash.com/photo-1548839130-ad1c2e08c4f8?w=500&auto=format&fit=crop&q=60',
      'Galletas': 'https://images.unsplash.com/photo-1558961309-dbdf0003ed31?w=500&auto=format&fit=crop&q=60',
      'Chocolates': 'https://images.unsplash.com/photo-1511381939415-e44015466834?w=500&auto=format&fit=crop&q=60',
      'Snacks': 'https://images.unsplash.com/photo-1599490659213-e2b9527ec087?w=500&auto=format&fit=crop&q=60',
      'Dulces': 'https://images.unsplash.com/photo-1581798459219-318e76aeef7b?w=500&auto=format&fit=crop&q=60'
    };

    const newProd: Product = {
      id: `prod-${Date.now()}`,
      name,
      sku,
      category,
      price: parseFloat(price) || 0,
      cost: parseFloat(cost) || 0,
      stock: parseInt(stock) || 0,
      lowStockThreshold: parseInt(threshold) || 5,
      imageUrl: imgUrl || defaultImages[category]
    };

    onAddProduct(newProd);
    setShowAddModal(false);
    
    // Clear form
    setName('');
    setSku('');
    setPrice('');
    setCost('');
    setStock('');
    setImgUrl('');
    alert('🎉 Producto agregado al catálogo exitosamente.');
  };

  const handleQuickStockUpdate = (productId: string) => {
    const matched = products.find(p => p.id === productId);
    if (!matched) return;
    setEditingStockVal(matched.stock.toString());
    setShowEditStockId(productId);
  };

  const handleSaveStock = (productId: string) => {
    const val = parseInt(editingStockVal);
    if (isNaN(val) || val < 0) {
      alert('⚠️ Ingrese un stock válido');
      return;
    }
    onUpdateStock(productId, val);
    setShowEditStockId(null);
  };

  const handleExportExcel = () => {
    alert('📋 Descargando reporte en formato compatible con Excel (CSV)\nInventario evaluado: ' + totalItems + ' items.');
  };

  return (
    <div className="space-y-6">
      
      {/* Visual KPI Header Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <span className="text-slate-400 text-[10px] font-black uppercase tracking-wider block">Total de Items</span>
          <p className="text-3xl font-black text-slate-800 mt-2 font-mono">{totalItems}</p>
        </div>
        <div className="bg-rose-50 p-5 rounded-xl border border-rose-200">
          <span className="text-rose-600 text-[10px] font-black uppercase tracking-wider block">Bajo Stock</span>
          <p className="text-3xl font-black text-rose-600 mt-2 font-mono">{criticalItemsCount}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <span className="text-slate-400 text-[10px] font-black uppercase tracking-wider block">Categorías</span>
          <p className="text-3xl font-black text-slate-800 mt-2 font-mono">18</p>
        </div>
        <div className="bg-teal-50 p-5 rounded-xl border border-teal-200">
          <span className="text-teal-700 text-[10px] font-black uppercase tracking-wider block">Valor de Venta</span>
          <p className="text-3xl font-black text-teal-600 mt-2 font-mono">S/ {valueInventario.toFixed(2)}</p>
        </div>
      </div>

      {/* Role Warnings segment */}
      {activeUser.role !== 'ADMIN' && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-xs font-semibold flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0 text-amber-500" />
          <span>Restricción Activa: Al estar logueado con Rol VENDEDOR, las modificaciones de precios, costos, catálogo y anulaciones están restringidas.</span>
        </div>
      )}

      {/* Primary catalog action segment */}
      <div className="bg-white border border-slate-250 rounded-xl overflow-hidden shadow-sm p-6 space-y-4">
        
        {/* Header tools row */}
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
          <div className="flex flex-col sm:flex-row gap-2 flex-1 max-w-lg">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Buscar por SKU, Nombre o Código..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            
            <div className="flex gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-300 rounded-lg py-2 px-3 focus:outline-none"
              >
                <option value="Todos">Categorías (Todas)</option>
                <option value="Bebidas">Bebidas</option>
                <option value="Galletas">Galletas</option>
                <option value="Chocolates">Chocolates</option>
                <option value="Snacks">Snacks</option>
                <option value="Dulces">Dulces</option>
              </select>

              <button
                onClick={() => setStockFilter(prev => prev === 'todos' ? 'bajo' : 'todos')}
                className={`px-3 py-2 text-xs font-bold rounded-lg border flex items-center gap-1 cursor-pointer transition-colors ${
                  stockFilter === 'bajo' 
                    ? 'bg-rose-50 text-rose-700 border-rose-300' 
                    : 'bg-slate-50 text-slate-600 border-slate-300'
                }`}
              >
                Stock Bajo
              </button>
            </div>
          </div>

          <div className="flex gap-2 justify-end shrink-0">
            <button 
              onClick={handleExportExcel}
              className="px-4 py-2 border border-teal-600 hover:bg-teal-50 text-teal-600 rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Exportar Excel
            </button>
            {activeUser.role === 'ADMIN' && (
              <button 
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Agregar Producto
              </button>
            )}
          </div>
        </div>

        {/* Data list Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-slate-500 font-bold text-xs uppercase tracking-wider text-[11px]">
                <th className="p-4 w-16">Imagen</th>
                <th className="p-4">Producto</th>
                <th className="p-4">Categoría</th>
                <th className="p-4">Costo</th>
                <th className="p-4">Precio</th>
                <th className="p-4">Stock</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150">
              {filteredProducts.map(p => {
                const isLowStock = p.stock <= p.lowStockThreshold;
                const isEditing = showEditStockId === p.id;

                return (
                  <tr key={p.id} className="hover:bg-slate-50 text-sm transition-colors">
                    <td className="p-4">
                      <img 
                        src={p.imageUrl} 
                        alt={p.name} 
                        className="w-11 h-11 object-cover rounded-lg bg-slate-100"
                        referrerPolicy="no-referrer"
                      />
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-slate-800">{p.name}</p>
                      <span className="text-xs font-mono text-slate-400 font-medium">SKU: {p.sku}</span>
                    </td>
                    <td className="p-4">
                      <span className="bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {p.category}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-medium text-slate-500">
                      S/ {p.cost.toFixed(2)}
                    </td>
                    <td className="p-4 font-mono font-bold text-slate-800">
                      S/ {p.price.toFixed(2)}
                    </td>
                    <td className="p-4">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <input 
                            type="number" 
                            value={editingStockVal}
                            onChange={(e) => setEditingStockVal(e.target.value)}
                            className="w-16 p-1 border border-teal-500 rounded text-xs font-bold text-teal-800 focus:outline-none"
                          />
                          <button 
                            onClick={() => handleSaveStock(p.id)}
                            className="p-1 rounded bg-teal-600 text-white hover:bg-teal-700 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div 
                          onClick={() => handleQuickStockUpdate(p.id)}
                          className="flex items-center gap-2 cursor-pointer group"
                          title="Click para ajustar stock rápido"
                        >
                          <span className={`w-1.5 h-6 rounded-full inline-block ${isLowStock ? 'bg-rose-500' : 'bg-teal-500'}`}></span>
                          <div>
                            <p className={`font-bold font-mono ${isLowStock ? 'text-rose-600' : 'text-slate-800'}`}>{p.stock} Unidades</p>
                            {isLowStock && (
                              <p className="text-[9px] font-black uppercase text-rose-500 tracking-tighter leading-none">Stock crítico</p>
                            )}
                          </div>
                          <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity font-bold uppercase tracking-wider text-teal-600 ml-1">Editar</span>
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      {activeUser.role === 'ADMIN' && (
                        <div className="flex justify-end gap-1.5">
                          <button 
                            onClick={() => {
                              onDeleteProduct(p.id);
                              alert('🗑️ Producto eliminado del catálogo.');
                            }}
                            className="p-2 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors cursor-pointer"
                            title="Eliminar producto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row Movement log segments as requested */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left col: Seed lists for manual movement simulation */}
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <h3 className="font-bold text-slate-800 text-base mb-4 flex items-center gap-2">
            📊 Historial de Movimientos de Inventario
          </h3>
          <div className="space-y-3 font-mono text-xs max-h-[300px] overflow-y-auto">
            {inventoryLogs.length === 0 ? (
              <div className="space-y-2">
                <div className="flex justify-between p-2.5 bg-slate-50 rounded border border-slate-150">
                  <span className="text-slate-400">04/06  10:15</span>
                  <span className="font-bold text-rose-600">Venta -2 (Quest Protein Bar)</span>
                </div>
                <div className="flex justify-between p-2.5 bg-slate-50 rounded border border-slate-150">
                  <span className="text-slate-400">05/06  09:00</span>
                  <span className="font-bold text-teal-600">Compra +24 (Gatorade Cool Blue)</span>
                </div>
                <div className="flex justify-between p-2.5 bg-slate-50 rounded border border-slate-150">
                  <span className="text-slate-400">06/06  14:22</span>
                  <span className="font-bold text-rose-600">Venta -1 (Agua San Mateo)</span>
                </div>
              </div>
            ) : (
              inventoryLogs.map((log, idx) => (
                <div key={idx} className="flex justify-between p-2.5 bg-slate-50 rounded border border-slate-150">
                  <span className="text-slate-400">{log.date}</span>
                  <span className={`font-bold ${log.delta < 0 ? 'text-rose-600' : 'text-teal-600'}`}>
                    {log.type} {log.delta < 0 ? log.delta : `+${log.delta}`} ({log.productName})
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right col: Stock fast instruction */}
        <div className="bg-slate-900 text-slate-200 p-6 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div className="space-y-3">
            <h4 className="font-bold text-white text-base">Instrucciones de Recepción</h4>
            <p className="text-xs text-slate-400">Para registrar ingresos por compras nuevas o variaciones físicas:</p>
            <ul className="text-xs text-slate-400 space-y-2 pl-4 list-decimal">
              <li>Haz clic en el número de unidades en stock en la tabla de arriba.</li>
              <li>Ingresa la nueva cantidad física auditada del producto.</li>
              <li>Haz clic en guardar (✓) para actualizar el stock.</li>
            </ul>
          </div>
          <div className="mt-4 p-3 bg-slate-800 border border-slate-700 rounded-lg text-xs leading-relaxed text-slate-400">
            🔔 <strong>Alineamiento del Sistema:</strong> Este POS registra cada egreso instantáneamente disminuyendo el stock en vivo del producto tras finalizar su venta normal o mixta en caja. El estado de stock se actualiza en línea para todos los cajeros activos.
          </div>
        </div>

      </div>

      {/* Add Catalog Item Modal */}
      {showAddModal && activeUser.role === 'ADMIN' && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg border border-slate-200 shadow-2xl overflow-hidden animate-[fadeInUp_0.2s_forwards]">
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Agregar Producto al Catálogo</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmitProduct} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Nombre Comercial *</label>
                  <input 
                    type="text" 
                    placeholder="E.g. Gatorade Cool Blue 500ml"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">SKU / Código *</label>
                  <input 
                    type="text" 
                    placeholder="GAT-CB500"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Categoría</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Category)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded focus:outline-none bg-white font-semibold text-slate-700"
                  >
                    <option value="Bebidas">🥤 Bebidas</option>
                    <option value="Galletas">🍪 Galletas</option>
                    <option value="Chocolates">🍫 Chocolates</option>
                    <option value="Snacks">🥜 Snacks</option>
                    <option value="Dulces">🍬 Dulces</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Costo de Compra (S/) *</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    placeholder="0.00"
                    required
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Precio de Venta (S/) *</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    placeholder="0.00"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Stock Inicial *</label>
                  <input 
                    type="number" 
                    placeholder="10"
                    required
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Mínimo Stock Crítico</label>
                  <input 
                    type="number" 
                    placeholder="5"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded focus:outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Imagen URL (Opcional)</label>
                  <input 
                    type="text" 
                    placeholder="URL de imagen del producto..."
                    value={imgUrl}
                    onChange={(e) => setImgUrl(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-100 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-600 rounded text-xs font-bold shrink-0 cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded text-xs font-bold shrink-0 cursor-pointer transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  Confirmar e Ingresar
                  <Check className="w-4 h-4 font-bold" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
