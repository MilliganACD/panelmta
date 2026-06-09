/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { Venta, Customer } from '../types';
import { Calendar, Download, TrendingUp, TrendingDown, Users, Receipt, ShoppingCart, Percent } from 'lucide-react';

interface ReportesViewProps {
  ventas: Venta[];
  customers: Customer[];
}

export default function ReportesView({ ventas, customers }: ReportesViewProps) {
  
  // Calculate dynamic average ticket in actual live sales
  const completedVentas = useMemo(() => {
    return ventas.filter(v => v.status === 'COMPLETADA');
  }, [ventas]);

  const totalSalesVal = useMemo(() => {
    return completedVentas.reduce((sum, v) => sum + v.total, 0);
  }, [completedVentas]);

  const ticketPromedio = useMemo(() => {
    if (completedVentas.length === 0) return 0;
    return totalSalesVal / completedVentas.length;
  }, [completedVentas, totalSalesVal]);

  const totalDebt = useMemo(() => {
    return customers.reduce((sum, c) => sum + c.currentDebt, 0);
  }, [customers]);

  const customersWithDebt = useMemo(() => {
    return customers.filter(c => c.currentDebt > 0).length;
  }, [customers]);

  const handleSimulatePDF = () => {
    const today = new Date().toLocaleDateString();
    alert(`📥 [PDF GENERATOR] Compilando reporte integral corporativo...\nSe han consolidado las métricas de venta diaria e histórico de deudas.\nArchivo "SPORTS_POS_REPORTE_${today}.pdf" guardado en descargas.`);
  };

  // Last 7 days dynamic chart
  const last7DaysData = useMemo(() => {
    const days = [];
    const weekdayNames = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      
      const pad = (n: number) => n.toString().padStart(2, '0');
      const datePrefix = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      
      // Filter completed sales on this date
      const daySales = completedVentas
        .filter(v => v.timestamp.startsWith(datePrefix))
        .reduce((sum, v) => sum + v.total, 0);
        
      days.push({
        day: weekdayNames[d.getDay()],
        val: daySales,
        price: `S/ ${daySales.toFixed(2)}`,
        datePrefix,
        isToday: i === 0
      });
    }
    
    // Find the max value to scale the bars (up to 100%)
    const maxVal = Math.max(...days.map(d => d.val));
    
    return days.map(d => ({
      ...d,
      heightPct: maxVal > 0 ? (d.val / maxVal) * 100 : 0
    }));
  }, [completedVentas]);

  // Top selling products calculated dynamically
  const topProducts = useMemo(() => {
    const productCounts: Record<string, { name: string; quantity: number }> = {};
    
    completedVentas.forEach(v => {
      v.items.forEach(item => {
        if (!productCounts[item.productId]) {
          productCounts[item.productId] = { name: item.productName, quantity: 0 };
        }
        productCounts[item.productId].quantity += item.quantity;
      });
    });
    
    const sorted = Object.values(productCounts)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
      
    const maxQty = sorted.length > 0 ? sorted[0].quantity : 0;
    
    return sorted.map(p => ({
      ...p,
      pct: maxQty > 0 ? (p.quantity / maxQty) * 100 : 0
    }));
  }, [completedVentas]);

  return (
    <div className="space-y-6">
      
      {/* KPI Stats breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* KPI 1 */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl flex flex-col justify-between hover:shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-slate-400 text-[10px] font-black uppercase tracking-wider">Total Acumulado</span>
            <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
              $
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-black text-slate-800 font-mono">S/ {totalSalesVal.toFixed(2)}</span>
            <p className="text-teal-600 text-[11px] font-bold mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Ventas reales completadas
            </p>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl flex flex-col justify-between hover:shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-rose-600 text-[10px] font-black uppercase tracking-wider">Pendiente de Cobro</span>
            <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              !
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-black text-rose-600 font-mono">S/ {totalDebt.toFixed(2)}</span>
            <p className="text-rose-500 text-[11px] font-bold mt-1">Saldos deudores en cuentas</p>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl flex flex-col justify-between hover:shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-slate-400 text-[10px] font-black uppercase tracking-wider">Clientes Deuda</span>
            <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-black text-slate-800">{customersWithDebt} {customersWithDebt === 1 ? 'Cliente' : 'Clientes'}</span>
            <p className="text-[11px] text-slate-400 font-medium mt-1">Registros con saldos activos</p>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl flex flex-col justify-between hover:shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-slate-400 text-[10px] font-black uppercase tracking-wider">Ticket Promedio</span>
            <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-black text-slate-800 font-mono">S/ {ticketPromedio.toFixed(2)}</span>
            <p className="text-slate-500 text-[11px] font-medium mt-1">Monto medio por transacción</p>
          </div>
        </div>

      </div>

      {/* Main Charts & Top products double panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Sales Chart Section (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-slate-200 p-5 rounded-xl space-y-4">
          <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Ventas de los últimos 7 días</h3>
              <p className="text-[11px] text-slate-400 font-medium">Volumen de ingresos por día de turno</p>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={handleSimulatePDF}
                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                Exportar PDF
              </button>
            </div>
          </div>

          {/* SVG Visual Sales Columns of last 7 days */}
          <div className="h-64 flex items-end justify-between gap-3 pt-6 px-4">
            {last7DaysData.map((col, idx) => {
              return (
                <div key={idx} className="flex-1 flex flex-col items-center group relative">
                  
                  {/* Floating Price tags on Hover */}
                  <div className="absolute -top-10 left-1/2 -translate-y-1 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-black px-2 py-1 rounded shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity font-mono z-40">
                    {col.price}
                  </div>

                  {/* Active bar */}
                  <div 
                    style={{ height: col.heightPct > 0 ? `${col.heightPct}%` : '2px' }}
                    className={`w-full rounded-t-lg transition-all duration-300 transform group-hover:scale-x-105 ${
                      col.val > 0 
                        ? col.isToday
                          ? 'bg-teal-600 shadow-sm shadow-teal-100' 
                          : 'bg-teal-500/80 group-hover:bg-teal-600'
                        : 'bg-slate-200'
                    }`}
                  ></div>

                  <span className={`text-[10px] uppercase font-mono font-black mt-3 ${col.isToday ? 'text-teal-600' : 'text-slate-400'}`}>
                    {col.day}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top selling products (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-slate-200 p-5 rounded-xl flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-slate-800 text-sm">Productos más vendidos</h4>
            <p className="text-[11px] text-slate-400 font-medium">Top 5 por volumen de unidades vendidas</p>
          </div>

          <div className="space-y-4 mt-6 flex-1">
            {topProducts.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center text-xs text-slate-400 py-10">
                No hay ventas registradas para calcular estadísticas.
              </div>
            ) : (
              topProducts.map((p, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-slate-700 truncate max-w-[150px]">{p.name}</span>
                    <span className="text-teal-600 font-bold">{p.quantity} unid.</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-teal-600 h-full rounded-full" style={{ width: `${p.pct}%` }}></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Recientes bottom table logs */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 text-sm">Transacciones / Recibos de Caja Recientes</h3>
          <span className="text-[10px] text-slate-400 font-black uppercase font-mono">Live Logs active</span>
        </div>
        
        {completedVentas.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs font-semibold">
            No se han registrado transacciones de venta completadas.
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-100 font-bold text-slate-500 uppercase border-b border-slate-200 text-[10px]">
              <tr>
                <th className="p-4">ID Transacción</th>
                <th className="p-4">Timestamp</th>
                <th className="p-4">Cliente</th>
                <th className="p-4">Cajero</th>
                <th className="p-4">Monto Cobrado</th>
                <th className="p-4">Método</th>
                <th className="p-4 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 font-medium">
              {completedVentas.map(v => (
                <tr key={v.id} className="hover:bg-slate-50">
                  <td className="p-4 font-mono font-bold text-slate-800">{v.id}</td>
                  <td className="p-4 text-slate-400">{v.timestamp}</td>
                  <td className="p-4 font-semibold text-slate-800">{v.customerName}</td>
                  <td className="p-4 text-slate-400">{v.cashierName}</td>
                  <td className="p-4 font-mono font-black text-slate-900">S/ {v.total.toFixed(2)}</td>
                  <td className="p-4"><span className="text-teal-600 font-bold">{v.paymentMethod}</span></td>
                  <td className="p-4 text-center">
                    <span className="bg-emerald-50 text-emerald-800 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-emerald-200">
                      Completado
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
