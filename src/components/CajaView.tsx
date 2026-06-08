/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { CashSession, CashMovement, Venta } from '../types';
import { TrendingUp, TrendingDown, Layers, Lock, LockOpen, Info } from 'lucide-react';

interface CajaViewProps {
  session: CashSession;
  movements: CashMovement[];
  ventas: Venta[];
  onOpenSession: (amount: number) => void;
  onCloseSession: (countedAmount: number, notes: string) => void;
  onAddMovement: (type: 'INGRESO' | 'EGRESO', concept: string, category: string, amount: number) => void;
}

export default function CajaView({
  session,
  movements,
  ventas,
  onOpenSession,
  onCloseSession,
  onAddMovement
}: CajaViewProps) {
  
  // Local opening/closing states
  const [openingCash, setOpeningCash] = useState<string>('250.00'); // default matching mockup initial
  const [physicalCash, setPhysicalCash] = useState<string>('2827.50'); // default matching expected physical counted
  const [closingNotes, setClosingNotes] = useState<string>('Turno Mañana completado sin novedades.');
  const [verifiedCheck, setVerifiedCheck] = useState<boolean>(false);

  // Manual movement logging states
  const [movType, setMovType] = useState<'INGRESO' | 'EGRESO'>('EGRESO');
  const [movConcept, setMovConcept] = useState<string>('');
  const [movCategory, setMovCategory] = useState<string>('Proveedor');
  const [movAmount, setMovAmount] = useState<string>('');

  // Calculate live session values
  // Since session expected amount is mockup-oriented, let's keep seed initial amount plus calculated sales
  const liveSessionSales = useMemo(() => {
    return ventas.reduce((acc, v) => {
      if (v.status !== 'COMPLETADA') return acc;
      acc.total += v.total;
      if (v.paymentMethod === 'EFECTIVO') acc.efectivo += v.total;
      else if (v.paymentMethod === 'YAPE') acc.yape += v.total;
      else if (v.paymentMethod === 'PLIN') acc.plin += v.total;
      else if (v.paymentMethod === 'CREDITO') acc.creditos += v.pendingAmount;
      else if (v.paymentMethod === 'MIXTO') {
        acc.efectivo += v.paidAmount; // mixed cash
        acc.creditos += v.pendingAmount; // mixed credit part
      }
      return acc;
    }, { total: 0, efectivo: 0, yape: 0, plin: 0, creditos: 0 });
  }, [ventas]);

  // Adjust for manual movements
  const totalMovementsCashDiff = useMemo(() => {
    return movements.reduce((sum, m) => {
      return sum + (m.type === 'INGRESO' ? m.amount : -m.amount);
    }, 0);
  }, [movements]);

  const liveExpectedCashTotal = useMemo(() => {
    // Expected in drawer = initial cash + received cash + manual cash differences
    return session.initialAmount + liveSessionSales.efectivo + totalMovementsCashDiff;
  }, [session, liveSessionSales, totalMovementsCashDiff]);

  // Dynamic cash difference evaluation
  const difference = useMemo(() => {
    const counted = parseFloat(physicalCash) || 0;
    return counted - liveExpectedCashTotal;
  }, [physicalCash, liveExpectedCashTotal]);

  const differenceStatus = useMemo(() => {
    if (Math.abs(difference) < 0.05) return { text: 'Cuadrado', style: 'bg-emerald-100 text-emerald-800' };
    if (difference < 0) return { text: 'Faltante', style: 'bg-rose-100 text-rose-800 font-bold animate-pulse' };
    return { text: 'Sobrante', style: 'bg-teal-100 text-teal-800 font-bold' };
  }, [difference]);

  const handleOpen = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(openingCash);
    if (isNaN(val) || val < 0) {
      alert('⚠️ Ingrese un monto de apertura válido');
      return;
    }
    onOpenSession(val);
  };

  const handleClose = (e: React.FormEvent) => {
    e.preventDefault();
    const counted = parseFloat(physicalCash);
    if (isNaN(counted) || counted < 0) {
      alert('⚠️ Ingrese un monto físico válido');
      return;
    }
    if (!verifiedCheck) {
      alert('⚠️ Debe confirmar la verificación física activando la casilla inferior.');
      return;
    }

    onCloseSession(counted, closingNotes);
    alert(`🎉 Caja cerrada con un saldo arquedado de S/ ${counted.toFixed(2)}. Reporte enviado al Administrador.`);
  };

  const handleAddManualMovement = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(movAmount);
    if (!movConcept || isNaN(amount) || amount <= 0) {
      alert('⚠️ Por favor llene todos los campos de movimiento');
      return;
    }

    onAddMovement(movType, movConcept, movCategory, amount);
    setMovConcept('');
    setMovAmount('');
    alert(`✅ Movimiento de ${movType} registrado correctamente por S/ ${amount.toFixed(2)}`);
  };

  return (
    <div className="space-y-6">
      
      {/* Closed State Aperture Screen */}
      {!session.isOpened ? (
        <div className="max-w-md mx-auto bg-white p-6 rounded-2xl border border-slate-200 shadow-xl space-y-6 text-center">
          <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 mx-auto border-2 border-teal-100">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800 tracking-tight">Apertura del Turno de Caja</h3>
            <p className="text-xs text-slate-400 mt-1">Ingresa el monto inicial para comenzar a cobrar ventas en el Kiosco.</p>
          </div>

          <form onSubmit={handleOpen} className="space-y-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl max-w-xs mx-auto">
              <label className="text-[10px] uppercase font-bold text-slate-500 block">Monto Inicial en Efectivo (S/)</label>
              <div className="relative mt-1 max-w-[140px] mx-auto">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">S/</span>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value)}
                  className="w-full text-center text-xl font-extrabold bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-extrabold uppercase rounded-xl text-xs tracking-widest transition-transform active:scale-98 shadow-md hover:shadow-lg cursor-pointer"
            >
              🔓 ABRIR CAJA DE TURNO
            </button>
          </form>
        </div>
      ) : (
        /* Open Active Caja Session Board */
        <div className="space-y-6">
          
          {/* Active Session stats row */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-black font-mono block">Auditoría Financiera Activa</span>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2 mt-0.5">
                <LockOpen className="w-5 text-emerald-500" />
                Arqueo de Caja del Día
              </h2>
              <p className="text-xs text-slate-500 mt-1">Registrado el {session.openedAt} • Encargado de shift: <span className="font-semibold text-slate-700">Admin User</span></p>
            </div>
            
            <div className="bg-emerald-50 text-emerald-800 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
              Caja del Turno Abierta
            </div>
          </div>

          {/* Slices Grid Breakdowns */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            
            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Monto Inicial</span>
              <p className="text-2xl font-black text-slate-800 mt-2 font-mono">S/ {session.initialAmount.toFixed(2)}</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 border-l-4 border-teal-500">
              <span className="text-teal-600 text-[10px] font-bold uppercase tracking-wider block">Ventas Efectivo</span>
              <p className="text-2xl font-black text-teal-600 mt-2 font-mono">S/ {liveSessionSales.efectivo.toFixed(2)}</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Ventas Yape</span>
              <p className="text-2xl font-black text-slate-800 mt-2 font-mono">S/ {liveSessionSales.yape.toFixed(2)}</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Ventas Plin</span>
              <p className="text-2xl font-black text-slate-800 mt-2 font-mono">S/ {liveSessionSales.plin.toFixed(2)}</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl text-slate-200">
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Esperado en Caja</span>
              <p className="text-2xl font-black text-white mt-2 font-mono">S/ {liveExpectedCashTotal.toFixed(2)}</p>
            </div>

          </div>

          {/* Detailed analysis and closing conciliación panel */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="lg:col-span-2 space-y-6">
              
              {/* Daily movements logs table */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Movimientos de Efectivo / Turno</h3>
                  <span className="text-xs bg-slate-200 font-bold px-2 py-0.5 rounded-full text-slate-600">En Caja: S/ {totalMovementsCashDiff >= 0 ? `+S/ ${totalMovementsCashDiff.toFixed(2)}` : `-S/ ${Math.abs(totalMovementsCashDiff).toFixed(2)}`}</span>
                </div>
                
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 font-bold text-slate-500 uppercase border-b border-slate-250">
                    <tr>
                      <th className="p-3 w-10">Tipo</th>
                      <th className="p-3">Concepto</th>
                      <th className="p-3">Categoría</th>
                      <th className="p-3 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {movements.map(m => (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="p-3">
                          {m.type === 'INGRESO' ? (
                            <TrendingUp className="w-4 h-4 text-teal-600" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-rose-600" />
                          )}
                        </td>
                        <td className="p-3 font-semibold text-slate-800 truncate max-w-[200px]">{m.concept}</td>
                        <td className="p-3 text-slate-400">{m.category}</td>
                        <td className={`p-3 text-right font-bold ${m.type === 'INGRESO' ? 'text-teal-600' : 'text-rose-600'}`}>
                          {m.type === 'INGRESO' ? '+' : '-'} S/ {m.amount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Balance dynamic graphic bars */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 flex items-center justify-between gap-6 shadow-sm">
                <div className="relative w-32 h-32 flex-shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <circle className="text-slate-100" cx="18" cy="18" fill="transparent" r="16" stroke="currentColor" strokeWidth="2.5"></circle>
                    <circle className="text-teal-600 transition-all" cx="18" cy="18" fill="transparent" r="16" stroke="currentColor" strokeDasharray="100" strokeDashoffset="20" strokeWidth="2.5"></circle>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-xl font-black text-slate-800 leading-none">80%</span>
                    <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider mt-0.5">Efectivo</span>
                  </div>
                </div>

                <div className="flex-1 space-y-4">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Métodos de Recaudación</h4>
                    <p className="text-slate-400 text-xs">Alineamiento de caja actual por canal de cobro.</p>
                  </div>
                  
                  <div className="space-y-1 bg-slate-50 p-2.5 rounded border border-slate-150">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-semibold flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-teal-600 rounded-full inline-block"></span> Efectivo</span>
                      <span className="font-bold text-slate-700">S/ {liveSessionSales.efectivo.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-semibold flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-slate-900 rounded-full inline-block"></span> Digital (Yape/Plin)</span>
                      <span className="font-bold text-slate-700">S/ {(liveSessionSales.yape + liveSessionSales.plin).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Register manual movement form */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <h4 className="font-bold text-slate-800 text-sm mb-3">Registrar Entrada / Salida Manual</h4>
                <form onSubmit={handleAddManualMovement} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Tipo</label>
                    <select
                      value={movType}
                      onChange={(e) => setMovType(e.target.value as 'INGRESO' | 'EGRESO')}
                      className="w-full text-xs p-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
                    >
                      <option value="EGRESO">💸 Egreso (-)</option>
                      <option value="INGRESO">💵 Ingreso (+)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Concepto</label>
                    <input 
                      type="text" 
                      placeholder="E.g. Compra sánduches..."
                      required
                      value={movConcept}
                      onChange={(e) => setMovConcept(e.target.value)}
                      className="w-full text-xs p-2 border border-slate-300 rounded focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Categoría</label>
                    <input 
                      type="text" 
                      placeholder="E.g. Proveedor, Reparación..."
                      required
                      value={movCategory}
                      onChange={(e) => setMovCategory(e.target.value)}
                      className="w-full text-xs p-2 border border-slate-300 rounded focus:outline-none"
                    />
                  </div>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Monto (S/)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        placeholder="0.00"
                        required
                        value={movAmount}
                        onChange={(e) => setMovAmount(e.target.value)}
                        className="w-full text-xs p-2 border border-slate-300 rounded focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-3.5 py-2 bg-slate-900 text-white font-bold rounded hover:bg-slate-800 text-xs cursor-pointer transition-colors shrink-0 h-9"
                    >
                      Añadir
                    </button>
                  </div>
                </form>
              </div>

            </div>

            {/* Sidebar close action & Conciliación */}
            <div className="space-y-4">
              
              <div className="bg-slate-100 p-5 rounded-2xl border border-slate-200">
                <h4 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-1">
                  <Layers className="w-4 h-4 text-teal-600" />
                  Conciliación Física
                </h4>
                
                <form onSubmit={handleClose} className="space-y-4">
                  {/* Readout esperado */}
                  <div className="p-3.5 bg-white rounded-lg border-l-4 border-slate-900 border border-slate-200">
                    <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Sistema (Esperado en Efectivo)</span>
                    <p className="text-2xl font-black text-slate-900 mt-1 font-mono">S/ {liveExpectedCashTotal.toFixed(2)}</p>
                  </div>

                  {/* Input físico */}
                  <div className="p-3.5 bg-white rounded-lg border-l-4 border-teal-500 border border-slate-200">
                    <span className="text-teal-600 text-[10px] uppercase font-bold tracking-wider">Conteo Físico (Efectivo Real)</span>
                    <div className="flex items-center mt-1">
                      <span className="text-xl font-bold text-teal-600 mr-1.5 font-mono">S/</span>
                      <input 
                        type="number" 
                        step="0.01"
                        required
                        value={physicalCash}
                        onChange={(e) => setPhysicalCash(e.target.value)}
                        className="w-full text-xl font-black text-teal-600 bg-transparent border-none p-0 focus:ring-0 outline-none font-mono"
                      />
                    </div>
                  </div>

                  {/* Diferencia calculated readout */}
                  <div className="p-3.5 bg-white rounded-lg border-l-4 border-rose-500 border border-slate-200">
                    <span className="text-rose-500 text-[10px] uppercase font-bold tracking-wider col-span-2">Diferencia o Cuadre</span>
                    <div className="flex justify-between items-center mt-1">
                      <p className={`text-xl font-black font-mono ${difference < -0.05 ? 'text-rose-600 font-bold' : difference > 0.05 ? 'text-teal-600 font-bold' : 'text-slate-900'}`}>
                        S/ {difference.toFixed(2)}
                      </p>
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${differenceStatus.style}`}>
                        {differenceStatus.text}
                      </span>
                    </div>
                  </div>

                  {/* Notes input */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider">Observaciones del Turno</label>
                    <textarea 
                      value={closingNotes}
                      onChange={(e) => setClosingNotes(e.target.value)}
                      placeholder="Escribe comentarios sobre cortes, faltantes..."
                      rows={3}
                      className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-teal-500"
                    />
                  </div>

                  {/* Verification physical check */}
                  <div className="pt-2">
                    <label className="flex items-start gap-2.5 cursor-pointer group text-xs text-slate-600 font-medium">
                      <input 
                        type="checkbox" 
                        checked={verifiedCheck}
                        onChange={(e) => setVerifiedCheck(e.target.checked)}
                        className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500 mt-0.5 shrink-0"
                      />
                      <span>Confirmo y firmo haber realizado el arqueo físico auditado del dinero en caja de Sports Academy.</span>
                    </label>
                  </div>

                  {/* Close Cash Button */}
                  <button
                    type="submit"
                    className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white text-xs uppercase font-black tracking-widest rounded-xl hover:shadow-lg transition-transform active:scale-[0.98] cursor-pointer"
                  >
                    🔐 CERRAR CAJA DE TURNO
                  </button>

                </form>

              </div>

              {/* Informative advice */}
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3 text-blue-800 text-xs leading-relaxed">
                <Info className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
                <p>El arqueo final será guardado automáticamente en el historial de sesiones y enviado al Administrador por auditoría de turnos.</p>
              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}
