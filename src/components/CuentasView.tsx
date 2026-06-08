/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Customer } from '../types';
import { Search, Share2, Receipt, CheckCircle, UserCheck } from 'lucide-react';

interface CuentasViewProps {
  customers: Customer[];
  onRegisterPayment: (customerId: string, amountPaid: number) => void;
}

export default function CuentasView({
  customers,
  onRegisterPayment
}: CuentasViewProps) {
  
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('cust-1'); // Default to Juan
  
  // Payment registering states
  const [montoAbonado, setMontoAbonado] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Search filtered customers with debt
  const debtors = useMemo(() => {
    return customers.filter(c => {
      const matchSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.phone.includes(searchQuery);
      return matchSearch;
    });
  }, [customers, searchQuery]);

  const activeDebtor = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId) || customers[0] || null;
  }, [customers, selectedCustomerId]);

  const totalPorCobrar = useMemo(() => {
    return customers.reduce((sum, c) => sum + c.currentDebt, 0);
  }, [customers]);

  const handlePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDebtor) return;
    const amount = parseFloat(montoAbonado);
    if (isNaN(amount) || amount <= 0) {
      alert('⚠️ Por favor ingrese un monto válido para abonar');
      return;
    }
    if (amount > activeDebtor.currentDebt) {
      alert(`⚠️ El monto de abono (S/ ${amount}) no puede ser mayor que la deuda actual (S/ ${activeDebtor.currentDebt})`);
      return;
    }

    setIsProcessing(true);
    
    setTimeout(() => {
      onRegisterPayment(activeDebtor.id, amount);
      setIsProcessing(false);
      setMontoAbonado('');
      setSuccessMsg(`✅ ¡Se registró un abono de S/ ${amount.toFixed(2)} para ${activeDebtor.name}!`);
      setTimeout(() => {
        setSuccessMsg('');
      }, 3500);
    }, 1000);
  };

  const handleSimulateWhatsApp = () => {
    if (!activeDebtor) return;
    alert(`📱 [WhatsApp SIMULATION] Enviando cobranza a ${activeDebtor.name} (${activeDebtor.phone}):\n"Estimado ${activeDebtor.name}, le recordamos de forma cordial que mantiene un saldo pendiente de S/ ${activeDebtor.currentDebt.toFixed(2)} en el Kiosko de Sports Academy. Agradecemos su gentil atención."`);
  };

  const handleSimulateTicket = () => {
    if (!activeDebtor) return;
    alert(`🖨️ [TICKET SIMULATION] Imprimiendo estado de cuenta para ${activeDebtor.name}:\n\nSPORTS ACADEMY POS - ESTADO DE DEUDA\nCliente: ${activeDebtor.name}\nWhatsApp: ${activeDebtor.phone}\nDeuda Acumulada: S/ ${activeDebtor.currentDebt.toFixed(2)}\nLímite Máximo: S/ ${activeDebtor.creditLimit.toFixed(2)}\n\n¡Gracias por su puntual colaboración!`);
  };

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-hidden -m-6 bg-slate-50">
      
      {/* Left panel: Debtors lists */}
      <div className="flex-1 p-6 flex flex-col min-h-0 border-r border-slate-200">
        
        {/* Banner metadata */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest font-mono">Resumen de Cartera</span>
            <h3 className="text-lg font-bold text-slate-800 mt-0.5">Control de Cuentas por Cobrar (Fiados)</h3>
          </div>
          <div className="bg-rose-50 border border-rose-100 text-rose-700 font-extrabold px-4 py-2 rounded-lg text-sm flex items-center gap-2">
            <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse shrink-0"></span>
            Total por Cobrar: S/ {totalPorCobrar.toFixed(2)}
          </div>
        </div>

        {/* Search tool block */}
        <div className="relative mb-4 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Buscar por nombre de cliente o teléfono..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
          />
        </div>

        {/* Debtors roster */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {debtors.length === 0 ? (
            <div className="text-center py-16 bg-white border border-slate-200 rounded-xl p-6">
              <p className="text-slate-400 text-sm">No se encontraron deudores.</p>
            </div>
          ) : (
            debtors.map(c => {
              const isDefaultSelected = activeDebtor?.id === c.id;
              const isLimitDanger = c.currentDebt >= c.creditLimit * 0.85;
              const isOverLimit = c.currentDebt > c.creditLimit;

              return (
                <div
                  key={c.id}
                  onClick={() => {
                    setSelectedCustomerId(c.id);
                    setSuccessMsg('');
                  }}
                  className={`border rounded-xl p-4 flex items-center justify-between cursor-pointer transition-all transform active:scale-99 ${
                    isDefaultSelected 
                      ? 'bg-teal-50 border-teal-500 shadow-sm' 
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                      c.currentDebt > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {c.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        {c.name}
                        {isOverLimit && (
                          <span className="text-[10px] bg-rose-500 text-white font-bold uppercase tracking-wider px-1.5 py-0.5 rounded">Excedido</span>
                        )}
                        {!isOverLimit && isLimitDanger && (
                          <span className="text-[10px] bg-amber-500 text-white font-bold uppercase tracking-wider px-1.5 py-0.5 rounded">Riesgo</span>
                        )}
                      </h4>
                      <p className="text-slate-400 text-xs mt-0.5">📱 Telf: {c.phone} • Límite: S/ {c.creditLimit.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Deuda Activa</span>
                    <span className={`text-base font-black ${c.currentDebt > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                      S/ {c.currentDebt.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right panel: Active Client Debt Record History & Payment Calculator */}
      <div className="w-full lg:w-[400px] bg-white border-t lg:border-t-0 lg:border-l border-slate-200 flex flex-col h-full shrink-0 z-30">
        {activeDebtor ? (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Customer Details Head */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 shrink-0">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-black text-slate-800 text-lg tracking-tight">{activeDebtor.name}</h3>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-rose-600">Estado de Préstamo: Pendiente</span>
                </div>
                <div className="p-1 border border-slate-200 rounded-lg bg-white p-1.5 font-bold text-slate-500 text-[10px] text-center shrink-0 leading-tight">
                  <p className="text-[9px]">LÍMITE</p>
                  <p className="font-black text-slate-800 text-xs">S/ {activeDebtor.creditLimit.toFixed(2)}</p>
                </div>
              </div>

              {/* Debt Large readout */}
              <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex justify-between items-center mt-3">
                <span className="text-xs font-bold text-rose-700 uppercase">Saldo a Pagar</span>
                <span className="text-2xl font-black text-rose-600">S/ {activeDebtor.currentDebt.toFixed(2)}</span>
              </div>
            </div>

            {/* Debt items lists */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Historial de Productos Fiados</span>
              
              {activeDebtor.debts.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-slate-400 text-xs">No hay items pendientes registrados para este cliente.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeDebtor.debts.map((item, idx) => (
                    <div key={item.id || idx} className="flex items-center justify-between py-2 border-b border-slate-100 border-dashed">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-slate-700 truncate">{item.productName}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{item.date} • Cant: {item.quantity || 1}</p>
                        </div>
                      </div>
                      <span className="font-bold text-xs text-slate-800 ml-2 shrink-0">S/ {item.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Alert Warning Credit Near Limit limit */}
              {activeDebtor.currentDebt >= activeDebtor.creditLimit * 0.85 && (
                <div className="bg-rose-100 border border-rose-200 text-rose-800 text-xs p-3 rounded-lg font-bold">
                  ⚠️ Alerta: El cliente está próximo o ha superado su límite de crédito de S/ {activeDebtor.creditLimit.toFixed(2)}. Préstamos bloqueados.
                </div>
              )}
            </div>

            {/* Payment calculator / register widget */}
            <div className="p-5 border-t border-slate-200 bg-slate-50 shrink-0 space-y-4">
              
              {successMsg && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-lg font-bold text-center">
                  {successMsg}
                </div>
              )}

              {/* Form trigger register payment */}
              {activeDebtor.currentDebt > 0 ? (
                <form onSubmit={handlePayment} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Pagar Monto</label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">S/</span>
                        <input 
                          type="number" 
                          step="0.01"
                          placeholder="0.00"
                          value={montoAbonado}
                          onChange={(e) => setMontoAbonado(e.target.value)}
                          className="w-full pl-7 pr-2 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-teal-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Nuevo Saldo</label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-rose-600">S/</span>
                        <input 
                          type="text" 
                          readOnly
                          value={
                            Math.max(0, activeDebtor.currentDebt - (parseFloat(montoAbonado) || 0)).toFixed(2)
                          }
                          className="w-full pl-7 pr-2 py-2 bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-rose-600 focus:outline-none focus:ring-0 outline-none font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Complete full debt quick payment */}
                  <div className="flex justify-between items-center">
                    <button
                      type="button"
                      onClick={() => setMontoAbonado(activeDebtor.currentDebt.toString())}
                      className="text-[10px] text-teal-600 hover:text-teal-700 font-bold uppercase tracking-wider cursor-pointer"
                    >
                      💡 Liquidar Deuda Completa
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white text-xs uppercase font-black rounded-xl tracking-widest flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <span>{isProcessing ? 'Registrando...' : 'Confirmar Pago'}</span>
                    <CheckCircle className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <div className="text-center py-4 bg-emerald-50 text-emerald-800 font-bold text-xs rounded-xl flex items-center justify-center gap-2">
                  <UserCheck className="w-4 h-4" />
                  Cliente al día sin deudas pendientes.
                </div>
              )}

              {/* Utility report sharing */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleSimulateTicket}
                  className="py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-800 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  Imprimir Estado
                </button>
                <button
                  type="button"
                  onClick={handleSimulateWhatsApp}
                  className="py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-800 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Enviar WhatsApp
                </button>
              </div>

            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400 p-6 text-center text-sm font-medium">
            Selecciona un cliente de la lista para gestionar sus deudas.
          </div>
        )}
      </div>

    </div>
  );
}
