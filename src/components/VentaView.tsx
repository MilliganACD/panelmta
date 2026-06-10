/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Product, Customer, CartItem, PaymentMethod, User } from '../types';
import { Search, ShoppingCart, Trash2, UserPlus, Users, Sparkles, Check, DollarSign, Coins, QrCode, Smartphone, Layers, Receipt, AlertTriangle, AlertCircle, X } from 'lucide-react';

interface VentaViewProps {
  products: Product[];
  customers: Customer[];
  activeUser: User;
  isSessionOpen: boolean;
  onAddVenta: (ventaData: {
    customerId: string;
    customerName: string;
    items: CartItem[];
    total: number;
    paymentMethod: PaymentMethod;
    paidAmount: number;
    pendingAmount: number;
  }) => void;
  onOpenSession: (amount: number) => void;
}

const CATEGORIES = ['Todos', 'Bebidas', 'Galletas', 'Chocolates', 'Snacks', 'Dulces', 'Accesorios'] as const;

export default function VentaView({
  products,
  customers,
  activeUser,
  isSessionOpen,
  onAddVenta,
  onOpenSession
}: VentaViewProps) {
  
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  const handleImageError = (id: string) => {
    setBrokenImages(prev => ({ ...prev, [id]: true }));
  };
  
  // Checkout States
  const [customerType, setCustomerType] = useState<'GENERAL' | 'REGISTRADO'>('GENERAL');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>('');
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('EFECTIVO');
  
  // Mixed or credit partial inputs
  const [pagoInicial, setPagoInicial] = useState<number>(0);
  const [montoRecibido, setMontoRecibido] = useState<string>(''); // For cash exchange calculations
  
  // Opening Caja modal state if closed
  const [openingAmount, setOpeningAmount] = useState<number>(100);
  const [showToast, setShowToast] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');

  // Filter products based on search & category
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCat = selectedCategory === 'Todos' || p.category === selectedCategory;
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Actions
  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) {
      triggerToast('⚠️ Producto sin stock disponible');
      return;
    }
    
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          triggerToast(`⚠️ Solo quedan ${product.stock} unidades en el stock`);
          return prev;
        }
        return prev.map(item => 
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    triggerToast(`🛒 ${product.name} agregado al carrito`);
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 2000);
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.product.id === productId) {
          const newQty = item.quantity + delta;
          const matchedProd = products.find(p => p.id === productId);
          if (newQty <= 0) return null;
          if (matchedProd && newQty > matchedProd.stock) {
            triggerToast(`⚠️ Límite de stock alcanzado (${matchedProd.stock} unidades)`);
            return item;
          }
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter((item): item is CartItem => item !== null);
    });
  };

  const handleClearCart = () => {
    setCart([]);
    triggerToast('🗑️ Carrito limpiado');
  };

  // Calculations
  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  }, [cart]);

  // Selected Customer Information & limit evaluation
  const targetCustomer = useMemo(() => {
    if (customerType === 'GENERAL') return null;
    return customers.find(c => c.id === selectedCustomerId) || null;
  }, [customerType, selectedCustomerId, customers]);

  // Evaluation of credit risks
  const creditEvaluation = useMemo(() => {
    if (!targetCustomer) return { permissible: true, warning: false, blocked: false, maxAvailable: 0 };
    const maxAvailable = Math.max(0, targetCustomer.creditLimit - targetCustomer.currentDebt);
    
    // Evaluate if paymentMethod is CREDITO or paymentMethod is MIXTO (and there is unpaid parts)
    const pendingToCharge = paymentMethod === 'CREDITO' ? cartTotal : Math.max(0, cartTotal - pagoInicial);
    
    const totalFutureDebt = targetCustomer.currentDebt + (paymentMethod === 'CREDITO' || paymentMethod === 'MIXTO' ? pendingToCharge : 0);
    const blocked = totalFutureDebt > targetCustomer.creditLimit;
    const warning = !blocked && (totalFutureDebt >= targetCustomer.creditLimit * 0.85);

    return {
      permissible: !blocked,
      warning,
      blocked,
      maxAvailable
    };
  }, [targetCustomer, cartTotal, paymentMethod, pagoInicial]);

  // Suggestions filter
  const customerSuggestions = useMemo(() => {
    if (!customerSearchQuery.trim()) return [];
    return customers.filter(c =>
      c.name.toLowerCase().includes(customerSearchQuery.toLowerCase())
    );
  }, [customerSearchQuery, customers]);

  // Handler for Finalizing Checkout
  const handleFinalize = () => {
    if (cart.length === 0) {
      triggerToast('⚠️ Agrege al menos un producto para vender');
      return;
    }
    if (!isSessionOpen) {
      triggerToast('⚠️ Por favor abra la caja antes de registrar ventas');
      return;
    }

    const trimmedQuery = customerSearchQuery.trim();
    if ((paymentMethod === 'CREDITO' || paymentMethod === 'MIXTO') && trimmedQuery === '') {
      triggerToast('⚠️ Para fiar o pago mixto debe ingresar un nombre de Cliente');
      return;
    }

    if (customerType === 'REGISTRADO' && (paymentMethod === 'CREDITO' || paymentMethod === 'MIXTO') && creditEvaluation.blocked) {
      triggerToast('❌ Compra denegada. Límite de crédito excedido.');
      return;
    }

    let paid = cartTotal;
    let pending = 0;

    if (paymentMethod === 'CREDITO') {
      paid = 0;
      pending = cartTotal;
    } else if (paymentMethod === 'MIXTO') {
      paid = Number(pagoInicial) || 0;
      pending = Math.max(0, cartTotal - paid);
    }

    let finalCustomerId = 'general';
    let finalCustomerName = 'Venta General';

    if (trimmedQuery !== '') {
      const exactMatch = customers.find(c => c.name.toLowerCase() === trimmedQuery.toLowerCase());
      if (exactMatch) {
        finalCustomerId = exactMatch.id;
        finalCustomerName = exactMatch.name;
      } else {
        finalCustomerId = 'new-customer';
        finalCustomerName = trimmedQuery;
      }
    }

    onAddVenta({
      customerId: finalCustomerId,
      customerName: finalCustomerName,
      items: cart,
      total: cartTotal,
      paymentMethod,
      paidAmount: paid,
      pendingAmount: pending
    });

    // Reset clean states
    setCart([]);
    setMontoRecibido('');
    setPagoInicial(0);
    setCustomerSearchQuery('');
    setSelectedCustomerId('');
    setCustomerType('GENERAL');
    triggerToast('🎉 ¡Venta procesada con éxito!');
  };

  // Live currency exchange calculations
  const cambioEfectivo = useMemo(() => {
    const recvValue = parseFloat(montoRecibido);
    if (isNaN(recvValue) || recvValue < cartTotal) return 0;
    return recvValue - cartTotal;
  }, [montoRecibido, cartTotal]);

  return (
    <div className="flex h-full flex-col lg:flex-row overflow-hidden -m-6">
      
      {/* Left panel: Catalog Selection */}
      <div className="flex-1 p-6 flex flex-col min-h-0 bg-slate-50 border-r border-slate-200">
        
        {/* Search header & Quick Alerts */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 font-bold" />
            <input 
              type="text" 
              placeholder="Buscar productos (Nombre, Código)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 text-xs font-semibold rounded-lg shrink-0 cursor-pointer transition-colors ${
                  selectedCategory === cat 
                    ? 'bg-teal-600 text-white' 
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid Area */}
        <div className="flex-1 overflow-y-auto pr-1">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl border border-slate-200">
              <p className="text-slate-400 text-sm">No se encontraron productos coincidentes.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map(p => {
                const isLowStock = p.stock <= p.lowStockThreshold;
                const isOutOfStock = p.stock <= 0;
                
                return (
                  <div 
                    key={p.id}
                    onClick={() => !isOutOfStock && handleAddToCart(p)}
                    className={`bg-white border rounded-xl overflow-hidden cursor-pointer flex flex-col justify-between hover:border-teal-500 group transition-all transform active:scale-98 ${
                      isOutOfStock ? 'opacity-50 cursor-not-allowed border-slate-200' : 'border-slate-200 hover:shadow-md'
                    }`}
                  >
                    {/* Visual Photo (Realistic Aspect-Ratio placeholder) */}
                    <div className="aspect-square w-full relative bg-slate-100 overflow-hidden flex items-center justify-center">
                      {!brokenImages[p.id] ? (
                        <img 
                          src={p.imageUrl} 
                          alt={p.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                          onError={() => handleImageError(p.id)}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-teal-50 to-slate-100 flex flex-col items-center justify-center p-4 text-center">
                          <span className="text-teal-700 font-extrabold text-2xl tracking-wider uppercase font-mono">
                            {p.name.split(' ').map(w => w[0]).join('').slice(0, 3)}
                          </span>
                          <span className="text-[10px] text-slate-500 font-semibold mt-1.5 uppercase tracking-wider">{p.category}</span>
                        </div>
                      )}
                      {isOutOfStock && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-2">
                          <span className="text-white text-xs font-bold uppercase tracking-wider">Agotado</span>
                        </div>
                      )}
                      {!isOutOfStock && isLowStock && (
                        <div className="absolute top-2 left-2 bg-rose-500 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded shadow-sm">
                          Bajo Stock
                        </div>
                      )}
                    </div>

                    {/* Meta info */}
                    <div className="p-4 flex flex-col justify-between flex-1">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono">{p.sku}</span>
                        <h4 className="font-bold text-slate-800 text-sm mt-0.5 line-clamp-1 group-hover:text-teal-600 transition-colors">{p.name}</h4>
                        <span className="text-xs text-slate-400 font-medium">{p.category}</span>
                      </div>
                      
                      <div className="mt-3 flex justify-between items-end border-t border-slate-100 pt-2">
                        <span className={`text-[10px] font-bold ${isLowStock ? 'text-rose-500' : 'text-slate-400'}`}>
                          STOCK: {p.stock}
                        </span>
                        <span className="font-black text-teal-600 text-base">S/ {p.price.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right panel: Active Shopping Cart */}
      <div className="w-full lg:w-[400px] bg-white border-t lg:border-t-0 lg:border-l border-slate-200 flex flex-col h-full min-h-0 shrink-0 z-30">
        
        {/* Cart Header */}
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCart className="text-teal-600 w-5 h-5" />
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Detalle del Carrito</h3>
          </div>
          {cart.length > 0 && (
            <button 
              onClick={handleClearCart}
              className="text-rose-600 hover:bg-rose-50 px-2 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Limpiar
            </button>
          )}
        </div>

        {/* Cart List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[160px]">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 py-12">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                <ShoppingCart className="w-6 h-6" />
              </div>
              <p className="text-slate-400 text-sm font-medium">El carrito está vacío.</p>
              <p className="text-slate-400 text-xs mt-1">Haz clic en los productos para agregarlos.</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.product.id} className="flex gap-4 p-3 bg-slate-50 border border-slate-200 rounded-xl relative group">
                <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-slate-200 border border-slate-200/80 flex items-center justify-center">
                  {!brokenImages[item.product.id] ? (
                    <img 
                      src={item.product.imageUrl} 
                      alt={item.product.name} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={() => handleImageError(item.product.id)}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-teal-50 to-slate-100 flex items-center justify-center">
                      <span className="text-teal-700 font-extrabold text-xs tracking-wider uppercase font-mono">
                        {item.product.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0 pr-1 flex flex-col justify-between">
                  <div>
                    <h5 className="font-bold text-slate-900 text-sm leading-tight">{item.product.name}</h5>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">S/ {item.product.price.toFixed(2)} c/u</p>
                  </div>
                  
                  {/* Qty Steppers */}
                  <div className="flex items-center gap-2.5 mt-2">
                    <button 
                      onClick={() => handleUpdateQuantity(item.product.id, -1)}
                      className="w-7 h-7 rounded-lg bg-white hover:bg-slate-100 text-slate-800 font-extrabold flex items-center justify-center text-sm cursor-pointer border border-slate-300 shadow-xs transition active:scale-90"
                    >
                      -
                    </button>
                    <span className="text-sm font-black w-6 text-center text-slate-900">{item.quantity}</span>
                    <button 
                      onClick={() => handleUpdateQuantity(item.product.id, 1)}
                      className="w-7 h-7 rounded-lg bg-white hover:bg-slate-100 text-slate-800 font-extrabold flex items-center justify-center text-sm cursor-pointer border border-slate-300 shadow-xs transition active:scale-90"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="text-right shrink-0 flex flex-col justify-start">
                  <span className="font-extrabold text-teal-700 text-sm">S/ {(item.product.price * item.quantity).toFixed(2)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Checkout Segment */}
        <div className="p-4 bg-white border-t-2 border-slate-900 shadow-[0_-8px_20px_rgba(0,0,0,0.06)] shrink-0 space-y-4 max-h-[60%] overflow-y-auto">
          
          {/* Subtotal & total */}
          <div className="space-y-2.5 bg-gradient-to-r from-teal-50 to-emerald-50/35 p-4 rounded-xl border border-teal-100 shadow-sm">
            <div className="flex justify-between text-xs text-slate-600 font-bold uppercase tracking-wider">
              <span>Subtotal ({cart.reduce((s, i) => s + i.quantity, 0)} ítems)</span>
              <span className="font-extrabold text-slate-900">S/ {cartTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center border-t border-teal-200/50 pt-2.5 mt-1.5">
              <span className="font-extrabold text-slate-950 text-sm tracking-wide">TOTAL A PAGAR</span>
              <span className="text-3xl font-black text-teal-700 tracking-tight">S/ {cartTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Customer Selection segment */}
          <div className="space-y-2 pt-1 border-t border-slate-100 relative">
            <div className="flex justify-between items-center pb-0.5">
              <span className="text-xs font-black tracking-wider uppercase text-slate-700">Cliente (Búsqueda / Nuevo)</span>
              {customerType === 'REGISTRADO' && targetCustomer && (
                <span className={`text-[11px] font-extrabold ${creditEvaluation.blocked ? 'text-rose-600' : 'text-teal-600 font-mono'}`}>
                  Deuda: S/ {targetCustomer.currentDebt.toFixed(2)} / Límite: S/ {targetCustomer.creditLimit.toFixed(2)}
                </span>
              )}
            </div>
            
            <div className="relative">
              <input 
                type="text" 
                placeholder="Escribe el nombre del cliente..."
                value={customerSearchQuery}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => {
                  setTimeout(() => setShowSuggestions(false), 200);
                }}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomerSearchQuery(val);
                  setShowSuggestions(true);
                  if (val.trim() === '') {
                    setSelectedCustomerId('');
                    setCustomerType('GENERAL');
                  } else {
                    setCustomerType('REGISTRADO');
                    const match = customers.find(c => c.name.toLowerCase() === val.trim().toLowerCase());
                    if (match) {
                      setSelectedCustomerId(match.id);
                    } else {
                      setSelectedCustomerId('new-customer');
                    }
                  }
                }}
                className="w-full text-xs font-bold p-2.5 pr-8 border border-slate-305 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-slate-800 shadow-xs"
              />
              {customerSearchQuery.trim() !== '' && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomerSearchQuery('');
                    setSelectedCustomerId('');
                    setCustomerType('GENERAL');
                    setShowSuggestions(false);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-450 hover:text-slate-650 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Suggestions floating list dropdown */}
              {showSuggestions && customerSearchQuery.trim() !== '' && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto z-50 divide-y divide-slate-100">
                  {customerSuggestions.map(c => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setCustomerSearchQuery(c.name);
                        setSelectedCustomerId(c.id);
                        setCustomerType('REGISTRADO');
                        setShowSuggestions(false);
                      }}
                      className="p-2.5 text-xs hover:bg-teal-50 text-slate-750 font-bold cursor-pointer transition-colors flex justify-between items-center"
                    >
                      <span>👤 {c.name}</span>
                      <span className="text-[10px] text-slate-400 font-medium">Deuda: S/ {c.currentDebt.toFixed(2)}</span>
                    </div>
                  ))}
                  {/* Option to create a new customer if typed query has no exact match */}
                  {!customers.some(c => c.name.toLowerCase() === customerSearchQuery.trim().toLowerCase()) && (
                    <div
                      onClick={() => {
                        setSelectedCustomerId('new-customer');
                        setCustomerType('REGISTRADO');
                        setShowSuggestions(false);
                      }}
                      className="p-2.5 text-xs hover:bg-emerald-50 text-emerald-800 font-black cursor-pointer transition-colors"
                    >
                      ➕ Crear nuevo cliente: "{customerSearchQuery.trim()}"
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Display selected customer info if found */}
            {customerType === 'REGISTRADO' && (
              <div className="mt-2">
                {targetCustomer ? (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold space-y-1 shadow-sm">
                    <p className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-500 font-semibold">WhatsApp/Tlf:</span> 
                      <span className="text-slate-900">{targetCustomer.phone || 'Sin registrar'}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-500 font-semibold">Deuda Actual:</span> 
                      <span className="text-amber-850 font-extrabold">S/ {targetCustomer.currentDebt.toFixed(2)} / Límite: S/ {targetCustomer.creditLimit.toFixed(2)}</span>
                    </p>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-150 text-emerald-800 text-xs font-black shadow-xs flex items-center gap-2">
                    <span className="text-base leading-none">✨</span>
                    <span>Cliente Nuevo: El perfil se creará automáticamente al finalizar la venta.</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Formas De Pago selection */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <span className="text-xs font-black tracking-wider uppercase text-slate-700 block mb-1">Forma de Pago</span>
            <div className="grid grid-cols-3 gap-2">
              {(['EFECTIVO', 'YAPE', 'PLIN', 'CREDITO', 'MIXTO'] as const).map(met => {
                const label = met === 'CREDITO' ? 'Fiado' : met === 'MIXTO' ? 'Mixto' : met.charAt(0) + met.slice(1).toLowerCase();
                
                // Icon picker helper
                const getIcon = () => {
                  switch (met) {
                    case 'EFECTIVO':
                      return <Coins className={`w-4 h-4 ${paymentMethod === 'EFECTIVO' ? 'text-white' : 'text-emerald-500'}`} />;
                    case 'YAPE':
                      return <QrCode className={`w-4 h-4 ${paymentMethod === 'YAPE' ? 'text-white' : 'text-fuchsia-600'}`} />;
                    case 'PLIN':
                      return <Smartphone className={`w-4 h-4 ${paymentMethod === 'PLIN' ? 'text-white' : 'text-cyan-550'}`} />;
                    case 'CREDITO':
                      return <Receipt className={`w-4 h-4 ${paymentMethod === 'CREDITO' ? 'text-white' : 'text-amber-500'}`} />;
                    case 'MIXTO':
                      return <Layers className={`w-4 h-4 ${paymentMethod === 'MIXTO' ? 'text-white' : 'text-indigo-500'}`} />;
                  }
                };

                const isCreditAndGeneral = met === 'CREDITO' && customerType === 'GENERAL';

                return (
                  <button
                    key={met}
                    type="button"
                    disabled={isCreditAndGeneral}
                    onClick={() => {
                      if (met === 'CREDITO' && customerType === 'GENERAL') {
                        triggerToast('⚠️ Para fiar debe seleccionar un Cliente Registrado');
                        return;
                      }
                      setPaymentMethod(met);
                      if (met === 'CREDITO') {
                        setPagoInicial(0);
                      } else if (met === 'MIXTO') {
                        setPagoInicial(Math.round(cartTotal / 2));
                      }
                    }}
                    className={`py-2.5 px-1.5 rounded-xl font-black border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                      isCreditAndGeneral 
                        ? 'opacity-40 bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                        : paymentMethod === met
                          ? 'bg-teal-600 text-white border-teal-600 shadow-md ring-2 ring-teal-500/20'
                          : 'bg-slate-50 text-slate-705 border-slate-205 hover:bg-slate-100 hover:text-slate-900 shadow-xs'
                    } ${met === 'MIXTO' ? 'col-span-2' : ''}`}
                  >
                    {getIcon()}
                    <span className="text-xs font-bold block leading-none">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conditional Input Widgets */}
          {paymentMethod === 'EFECTIVO' && (
            <div className="space-y-2 p-3.5 bg-emerald-50/50 border border-emerald-100 rounded-xl">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[10px] font-black uppercase text-slate-600 tracking-wider">Monto Recibido</label>
                  <div className="relative mt-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-extrabold text-slate-500">S/</span>
                    <input 
                      type="number" 
                      placeholder="0.00"
                      value={montoRecibido}
                      onChange={(e) => setMontoRecibido(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm font-black text-slate-900 shadow-xs"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-black uppercase text-slate-600 tracking-wider">Su Cambio</label>
                  <div className="relative mt-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-extrabold text-emerald-750">S/</span>
                    <input 
                      type="text" 
                      readOnly
                      value={cambioEfectivo > 0 ? cambioEfectivo.toFixed(2) : '0.00'}
                      className={`w-full pl-7 pr-3 py-2 border rounded-lg text-sm font-black font-mono outline-none shadow-xs transition-colors ${
                        cambioEfectivo > 0 
                          ? 'bg-emerald-100 border-emerald-250 text-emerald-800 animate-pulse' 
                          : 'bg-slate-100 border-slate-200 text-slate-500'
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {paymentMethod === 'CREDITO' && targetCustomer && (
            <div className="space-y-2 p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-950">
              <div className="flex justify-between items-center text-xs font-extrabold">
                <span>Fiado Total (A Cuenta Vacío)</span>
                <span className="font-mono text-sm bg-amber-100 text-amber-805 px-2 py-0.5 rounded-md">
                  Saldo Deuda: S/ {cartTotal.toFixed(2)}
                </span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                El monto completo de <strong className="text-amber-950">S/ {cartTotal.toFixed(2)}</strong> se registrará en la cuenta corriente de <strong className="text-amber-950">{targetCustomer.name}</strong>.
              </p>
              
              {/* Warnings / Exceeded alerts */}
              {creditEvaluation.blocked && (
                <div className="mt-2 text-xs bg-rose-100 border border-rose-200 text-rose-800 p-2.5 rounded-lg font-bold flex items-start gap-1.5 shadow-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <div>
                    <span className="block font-black text-rose-900">CRÉDITO BLOQUEADO</span>
                    <span className="font-semibold block mt-0.5 text-[11px]">Límite: S/ {targetCustomer.creditLimit.toFixed(2)} | Deuda actual: S/ {targetCustomer.currentDebt.toFixed(2)}</span>
                  </div>
                </div>
              )}
              {!creditEvaluation.blocked && creditEvaluation.warning && (
                <div className="mt-2 text-xs bg-amber-100 border border-amber-200 text-amber-900 p-2.5 rounded-lg font-semibold flex items-start gap-1.5 shadow-xs animate-pulse">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-800 mt-0.5" />
                  <div>
                    <span className="block font-bold">ALERTA DE LÍMITE</span>
                    <span className="block text-[11px] mt-0.5 font-medium">El cliente está muy próximo a superar su saldo máximo autorizado.</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {paymentMethod === 'MIXTO' && (
            <div className="space-y-2.5 p-3.5 bg-teal-50/50 border border-teal-200 rounded-xl text-teal-950 shadow-sm">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-600 block mb-1">Pago Inicial (Efectivo)</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">S/</span>
                    <input 
                      type="number" 
                      value={pagoInicial}
                      max={cartTotal}
                      onChange={(e) => {
                        const val = Math.min(cartTotal, Math.max(0, Number(e.target.value)));
                        setPagoInicial(val);
                      }}
                      className="w-full pl-7 pr-3 py-2 bg-white border border-slate-350 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-black text-teal-900"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-600 block mb-1">Saldo por Cobrar (Fiado)</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-rose-700">S/</span>
                    <input 
                      type="text" 
                      readOnly
                      value={Math.max(0, cartTotal - pagoInicial).toFixed(2)}
                      className="w-full pl-7 pr-3 py-2 bg-rose-50 border border-rose-200 rounded-lg font-black text-sm text-rose-700 outline-none"
                    />
                  </div>
                </div>
              </div>

              {customerType === 'REGISTRADO' && targetCustomer && creditEvaluation.blocked && (
                <div className="text-xs bg-rose-100 text-rose-800 p-2.5 rounded-lg border border-rose-200 font-extrabold mt-1 flex items-start gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <div>
                    <span className="block font-black text-rose-900">LÍMITE EXCEDIDO</span>
                    <span className="font-semibold block text-[11px] mt-0.5">La deuda resultante superaría el límite de S/ {targetCustomer.creditLimit.toFixed(2)}.</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Finalize Button */}
          <button
            onClick={handleFinalize}
            disabled={
              cart.length === 0 || 
              (customerType === 'REGISTRADO' && (paymentMethod === 'CREDITO' || paymentMethod === 'MIXTO') && creditEvaluation.blocked)
            }
            className={`w-full py-4 rounded-xl font-extrabold uppercase tracking-wider text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] ${
              cart.length === 0 || (customerType === 'REGISTRADO' && (paymentMethod === 'CREDITO' || paymentMethod === 'MIXTO') && creditEvaluation.blocked)
                ? 'bg-slate-200 text-slate-450 cursor-not-allowed shadow-none'
                : 'bg-teal-600 hover:bg-teal-700 text-white cursor-pointer hover:shadow-xl'
            }`}
          >
            <span>Finalizar Venta</span>
            <Check className="w-4 h-4 font-bold" />
          </button>
        </div>
      </div>

      {/* Floating Action Toast Alert */}
      {showToast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 border border-slate-800 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 z-50 animate-bounce">
          <Sparkles className="w-4 h-4 text-teal-400" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Caja Closed Modal overlay if not open */}
      {!isSessionOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 max-w-sm w-full rounded-2xl border border-slate-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mx-auto">
              <DollarSign className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">La Caja de Hoy está Cerrada</h3>
            <p className="text-xs text-slate-500">Debes abrir caja con un saldo inicial antes de poder registrar transacciones de venta.</p>
            
            <div className="p-3 bg-slate-100 rounded-lg max-w-xs mx-auto">
              <label className="text-[10px] uppercase font-bold text-slate-500 block">Saldo de Apertura (S/)</label>
              <input 
                type="number" 
                value={openingAmount}
                onChange={(e) => setOpeningAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full text-center text-lg font-black bg-white rounded border border-slate-300 mt-1 focus:ring-1 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <button 
              onClick={() => {
                onOpenSession(openingAmount);
                triggerToast('🔓 Caja abierta con éxito');
              }}
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg text-sm transition-colors cursor-pointer"
            >
              Abrir Caja de Turno
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
