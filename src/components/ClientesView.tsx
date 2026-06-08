/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Customer } from '../types';
import { Search, UserPlus, Phone, CreditCard, X, Check, Award, Activity } from 'lucide-react';

interface ClientesViewProps {
  customers: Customer[];
  onAddCustomer: (newCustomer: Customer) => void;
}

export default function ClientesView({
  customers,
  onAddCustomer
}: ClientesViewProps) {
  
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('cust-1'); // Default to Juan
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // Form Fields
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [creditLimit, setCreditLimit] = useState<string>('50.00');

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.phone.includes(searchQuery);
      return matchSearch;
    });
  }, [customers, searchQuery]);

  const activeCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId) || customers[0] || null;
  }, [customers, selectedCustomerId]);

  const handleSubmitCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      alert('⚠️ Por favor llene todos los campos requeridos');
      return;
    }

    const newCustomer: Customer = {
      id: `cust-${Date.now()}`,
      name,
      phone,
      creditLimit: parseFloat(creditLimit) || 50.00,
      currentDebt: 0.00,
      totalPurchases: 0,
      debts: []
    };

    onAddCustomer(newCustomer);
    setShowAddModal(false);
    
    // Clear
    setName('');
    setPhone('');
    setCreditLimit('50.00');
    alert('🎉 ¡Cliente registrado con éxito en el sistema!');
  };

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-hidden -m-6 bg-slate-50">
      
      {/* Left panel: list of registered customers */}
      <div className="flex-1 p-6 flex flex-col min-h-0 border-r border-slate-200">
        
        {/* Header tools row */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-4 shrink-0">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Buscar por Nombre, Teléfono..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
            />
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            Registrar Cliente
          </button>
        </div>

        {/* Roaster wrapper */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-16 bg-white border border-slate-250 rounded-xl p-6">
              <p className="text-slate-400 text-sm">No se encontraron clientes.</p>
            </div>
          ) : (
            filteredCustomers.map(c => {
              const isDefaultSelected = activeCustomer?.id === c.id;
              
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedCustomerId(c.id)}
                  className={`border rounded-xl p-4 flex items-center justify-between cursor-pointer transition-all transform active:scale-99 ${
                    isDefaultSelected 
                      ? 'bg-teal-50 border-teal-500 shadow-sm' 
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 shrink-0">
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-xs">{c.name}</h4>
                      <p className="text-slate-400 text-[11px] mt-0.5">📟 Telf: {c.phone} • Compras: {c.totalPurchases}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-tighter col-span-2">Deuda</span>
                    <span className={`text-sm font-black ${c.currentDebt > 0 ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>
                      S/ {c.currentDebt.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right panel: Profile card detail */}
      <div className="w-full lg:w-[400px] bg-white border-t lg:border-t-0 lg:border-l border-slate-200 flex flex-col h-full shrink-0 z-30 overflow-y-auto">
        {activeCustomer ? (
          <div className="p-6 space-y-6">
            
            {/* Lead profile logo */}
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-teal-50 border-2 border-teal-200 text-teal-700 flex items-center justify-center font-black text-xl mx-auto shadow-sm">
                {activeCustomer.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <h3 className="font-black text-slate-800 text-lg tracking-tight">{activeCustomer.name}</h3>
                <p className="text-xs text-slate-400 font-medium">Ficha de Cliente Integrada • Academia</p>
              </div>
            </div>

            {/* High-fidelity parameters segment */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-150 flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-teal-600 shrink-0" />
                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-400 block leading-none">Teléfono</span>
                  <span className="font-bold text-xs text-slate-800 mt-1 block truncate">{activeCustomer.phone}</span>
                </div>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-150 flex items-center gap-2.5">
                <CreditCard className="w-4 h-4 text-teal-600 shrink-0" />
                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-400 block leading-none">Límite Crédito</span>
                  <span className="font-bold text-xs text-slate-800 mt-1 block">S/ {activeCustomer.creditLimit.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Active balance KPIs */}
            <div className="bg-slate-900 text-slate-200 p-5 rounded-xl border border-slate-800 space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-400 uppercase">Resumen Monetario</span>
                <Award className="w-4 h-4 text-teal-400" />
              </div>
              
              <div className="flex justify-between items-center">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Fianzas Activas</span>
                  <span className={`text-xl font-black ${activeCustomer.currentDebt > 0 ? 'text-rose-500 font-bold' : 'text-slate-300'}`}>
                    S/ {activeCustomer.currentDebt.toFixed(2)}
                  </span>
                </div>
                <div className="text-right space-y-0.5 col-span-2">
                  <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Transacciones Totales</span>
                  <span className="text-xl font-black text-white font-mono">{activeCustomer.totalPurchases}</span>
                </div>
              </div>
            </div>

            {/* Activity details logs */}
            <div className="space-y-3">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <Activity className="w-3.5 h-3.5 text-teal-600" />
                Historial de Deuda / Detalle
              </span>

              {activeCustomer.debts.length === 0 ? (
                <div className="text-center py-6 bg-slate-50 rounded border border-dashed border-slate-200 text-slate-400 text-xs">
                  Este cliente no tiene deudas pendientes acumuladas.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[180px] overflow-y-auto pr-1">
                  {activeCustomer.debts.map((deb, dIdx) => (
                    <div key={deb.id || dIdx} className="flex justify-between items-center text-xs py-1.5 border-b border-slate-100">
                      <div>
                        <p className="font-bold text-slate-700">{deb.productName}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{deb.date} • Cant: {deb.quantity || 1}</p>
                      </div>
                      <span className="font-bold text-slate-800">S/ {deb.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400 p-6 text-center text-sm font-medium">
            Selecciona un cliente de la lista para visualizar sus estadísticas de academia.
          </div>
        )}
      </div>

      {/* Register Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm border border-slate-200 shadow-2xl overflow-hidden animate-[fadeInUp_0.2s_forwards]">
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-sm uppercase">Registrar Nuevo Cliente</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmitCustomer} className="p-5 space-y-4 text-xs font-semibold">
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-500 block mb-1">Nombre Completo *</label>
                  <input 
                    type="text" 
                    placeholder="E.g. Carlos Mendoza"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-500 block mb-1">Teléfono Móvil (WhatsApp) *</label>
                  <input 
                    type="text" 
                    placeholder="987654321"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-500 block mb-1">Límite de Crédito Permitido (S/)</label>
                  <input 
                    type="number" 
                    placeholder="50.00"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-100 justify-end col-span-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-600 rounded text-[11px] font-bold cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded text-[11px] font-bold cursor-pointer transition-colors flex items-center gap-1 shadow-sm"
                >
                  Registrar
                  <Check className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
