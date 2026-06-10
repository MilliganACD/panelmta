/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Venta, CashMovement, Product, User } from '../types';
import { Calculator, Calendar, TrendingUp, TrendingDown, Layers, DollarSign, ArrowRight, Award, FileText } from 'lucide-react';

interface ContabilidadViewProps {
  ventas: Venta[];
  movements: CashMovement[];
  products: Product[];
  activeUser: User;
}

export default function ContabilidadView({
  ventas,
  movements,
  products,
  activeUser
}: ContabilidadViewProps) {
  
  // Format YYYY-MM from timestamp
  const getYearMonth = (timestampStr: string) => {
    // Expected timestampStr format: "YYYY-MM-DD HH:MM" or similar
    if (!timestampStr || timestampStr.length < 7) return 'Otros';
    return timestampStr.slice(0, 7); // e.g. "2026-06"
  };

  const getMonthNameSpanish = (yearMonth: string) => {
    if (yearMonth === 'Otros') return 'Otros';
    const [year, month] = yearMonth.split('-');
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const mIdx = parseInt(month, 10) - 1;
    return `${months[mIdx] || month} ${year}`;
  };

  // Group all financial data by Month (YYYY-MM)
  const monthlyData = useMemo(() => {
    const data: Record<string, {
      salesTotal: number;
      salesCost: number;
      egresosManuales: number;
      ingresosManuales: number;
      salesCount: number;
      categoryStats: Record<string, { total: number; cost: number }>;
    }> = {};

    // 1. Process Ventas
    ventas.forEach(v => {
      if (v.status !== 'COMPLETADA') return;
      const month = getYearMonth(v.timestamp);
      
      if (!data[month]) {
        data[month] = {
          salesTotal: 0,
          salesCost: 0,
          egresosManuales: 0,
          ingresosManuales: 0,
          salesCount: 0,
          categoryStats: {}
        };
      }

      data[month].salesTotal += v.total;
      data[month].salesCount += 1;

      // Calculate cost (COGS) for each item in the sale
      v.items.forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        const itemCost = (item.cost !== undefined && item.cost !== null ? item.cost : (prod ? prod.cost : 0)) * item.quantity;
        const itemCat = item.category || (prod ? prod.category : 'Otros');

        data[month].salesCost += itemCost;

        if (!data[month].categoryStats[itemCat]) {
          data[month].categoryStats[itemCat] = { total: 0, cost: 0 };
        }
        data[month].categoryStats[itemCat].total += item.price * item.quantity;
        data[month].categoryStats[itemCat].cost += itemCost;
      });
    });

    // 2. Process Cash Movements
    // Exclude automatic sales/debt collection movements to avoid double-counting revenues
    movements.forEach(m => {
      const month = getYearMonth(m.timestamp);
      
      if (!data[month]) {
        data[month] = {
          salesTotal: 0,
          salesCost: 0,
          egresosManuales: 0,
          ingresosManuales: 0,
          salesCount: 0,
          categoryStats: {}
        };
      }

      // Filter out auto-generated sales cash flows
      const isManual = m.category !== 'Venta' && m.category !== 'Cobro de fiado' && m.category !== 'Apertura';

      if (isManual) {
        if (m.type === 'EGRESO') {
          data[month].egresosManuales += m.amount;
        } else if (m.type === 'INGRESO') {
          data[month].ingresosManuales += m.amount;
        }
      }
    });

    return data;
  }, [ventas, movements, products]);

  // List of all months sorted in reverse chronological order
  const monthList = useMemo(() => {
    return Object.keys(monthlyData).sort().reverse();
  }, [monthlyData]);

  // Active selected month
  const [selectedMonth, setSelectedMonth] = useState<string>(
    monthList[0] || new Date().toISOString().slice(0, 7)
  );

  // Financial calculations for the selected month
  const activeMonthStats = useMemo(() => {
    const defaultStats: {
      salesTotal: number;
      salesCost: number;
      egresosManuales: number;
      ingresosManuales: number;
      salesCount: number;
      categoryStats: Record<string, { total: number; cost: number }>;
    } = {
      salesTotal: 0,
      salesCost: 0,
      egresosManuales: 0,
      ingresosManuales: 0,
      salesCount: 0,
      categoryStats: {}
    };
    return monthlyData[selectedMonth] || defaultStats;
  }, [monthlyData, selectedMonth]);

  const salesTotal = activeMonthStats.salesTotal;
  const salesCost = activeMonthStats.salesCost;
  const grossProfit = salesTotal - salesCost;
  const grossMargin = salesTotal > 0 ? (grossProfit / salesTotal) * 100 : 0;
  const expenses = activeMonthStats.egresosManuales;
  const extraIncome = activeMonthStats.ingresosManuales;
  const netProfit = grossProfit - expenses + extraIncome;

  return (
    <div className="space-y-6">
      
      {/* Title Header Card */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <span className="text-slate-400 text-[10px] uppercase font-black font-mono block">Módulo Contable MTA</span>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2 mt-0.5">
            <Calculator className="w-5.5 text-teal-600" />
            Contabilidad y Utilidades por Mes
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Análisis mensual de ventas brutas, costo de mercadería vendida (COGS), gastos de caja y margen de utilidad neto.
          </p>
        </div>

        {/* Month Selector dropdown */}
        <div className="flex items-center gap-2 shrink-0 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
          <Calendar className="w-4 h-4 text-slate-500" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="text-xs font-bold bg-transparent text-slate-700 focus:outline-none border-none cursor-pointer pr-4"
          >
            {monthList.length === 0 ? (
              <option value={new Date().toISOString().slice(0, 7)}>
                {getMonthNameSpanish(new Date().toISOString().slice(0, 7))}
              </option>
            ) : (
              monthList.map(m => (
                <option key={m} value={m}>{getMonthNameSpanish(m)}</option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Financial Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Sales Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-slate-400 text-[10px] font-black uppercase tracking-wider block">Ventas Brutas</span>
            <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-800 mt-2 font-mono">S/ {salesTotal.toFixed(2)}</p>
          <span className="text-[10px] text-slate-400 mt-1 block font-semibold">Total cobrado en {activeMonthStats.salesCount} ventas</span>
        </div>

        {/* Cost (COGS) Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-slate-400 text-[10px] font-black uppercase tracking-wider block">Costo de Ventas (COGS)</span>
            <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-700 mt-2 font-mono">S/ {salesCost.toFixed(2)}</p>
          <span className="text-[10px] text-slate-400 mt-1 block font-semibold">Costo de adquisición de productos</span>
        </div>

        {/* Utilidad Bruta Card */}
        <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-100 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-emerald-700 text-[10px] font-black uppercase tracking-wider block">Utilidad Bruta</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-800 mt-2 font-mono">S/ {grossProfit.toFixed(2)}</p>
          <span className="text-[10px] text-emerald-600 mt-1 block font-black">
            Margen de Utilidad: {grossMargin.toFixed(1)}%
          </span>
        </div>

        {/* Net Flow / Net Profit Card */}
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 text-slate-200 shadow-lg">
          <div className="flex justify-between items-start">
            <span className="text-slate-400 text-[10px] font-black uppercase tracking-wider block">Utilidad Neta Estimada</span>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${netProfit >= 0 ? 'bg-teal-500/10 text-teal-400' : 'bg-rose-500/10 text-rose-400'}`}>
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className={`text-2xl font-black mt-2 font-mono ${netProfit >= 0 ? 'text-teal-400' : 'text-rose-400'}`}>
            S/ {netProfit.toFixed(2)}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block font-semibold">
            {expenses > 0 ? `Descontados S/ ${expenses.toFixed(2)} de egresos` : 'Sin egresos manuales registrados'}
          </span>
        </div>

      </div>

      {/* Detail breakdowns section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Summary table and category statistics */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Sales Breakdown by Category */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Desglose de Ventas por Categoría</h3>
              <span className="text-[10px] bg-slate-200 font-bold px-2 py-0.5 rounded text-slate-600">
                {getMonthNameSpanish(selectedMonth)}
              </span>
            </div>

            {Object.keys(activeMonthStats.categoryStats).length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-semibold">
                No hay transacciones registradas en este mes para generar el desglose por categorías.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100 font-bold text-slate-500 uppercase border-b border-slate-200">
                  <tr>
                    <th className="p-3">Categoría</th>
                    <th className="p-3 text-right">Ingreso Ventas</th>
                    <th className="p-3 text-right">Costo COGS</th>
                    <th className="p-3 text-right">Utilidad Bruta</th>
                    <th className="p-3 text-right">Margen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {(Object.entries(activeMonthStats.categoryStats) as [string, { total: number; cost: number }][]).map(([cat, stats]) => {
                    const diff = stats.total - stats.cost;
                    const marg = stats.total > 0 ? (diff / stats.total) * 100 : 0;
                    return (
                      <tr key={cat} className="hover:bg-slate-50">
                        <td className="p-3 font-semibold text-slate-800">{cat}</td>
                        <td className="p-3 text-right font-mono font-bold text-slate-700">S/ {stats.total.toFixed(2)}</td>
                        <td className="p-3 text-right font-mono text-slate-500">S/ {stats.cost.toFixed(2)}</td>
                        <td className="p-3 text-right font-mono font-bold text-teal-600">S/ {diff.toFixed(2)}</td>
                        <td className="p-3 text-right font-bold font-mono text-slate-600">{marg.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Historical Month Comparison Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-slate-500" />
                Historial Comparativo Mensual
              </h3>
            </div>

            {monthList.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-semibold">
                Aún no hay suficiente historial contable en la base de datos.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 font-bold text-slate-500 uppercase border-b border-slate-200">
                    <tr>
                      <th className="p-3">Mes</th>
                      <th className="p-3 text-right">Ventas Brutas</th>
                      <th className="p-3 text-right">Costo COGS</th>
                      <th className="p-3 text-right">Gastos (Caja)</th>
                      <th className="p-3 text-right">Ganancia Neta</th>
                      <th className="p-3 text-right">Margen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {monthList.map(m => {
                      const mStats = monthlyData[m];
                      if (!mStats) return null;
                      
                      const mGrossProfit = mStats.salesTotal - mStats.salesCost;
                      const mExtraIncome = mStats.ingresosManuales;
                      const mExpenses = mStats.egresosManuales;
                      const mNetProfit = mGrossProfit - mExpenses + mExtraIncome;
                      const mMargin = mStats.salesTotal > 0 ? (mGrossProfit / mStats.salesTotal) * 100 : 0;

                      return (
                        <tr key={m} className={`hover:bg-slate-50 transition-colors ${m === selectedMonth ? 'bg-teal-50/40 font-bold' : ''}`}>
                          <td className="p-3 font-semibold text-slate-800">{getMonthNameSpanish(m)}</td>
                          <td className="p-3 text-right font-mono text-slate-700">S/ {mStats.salesTotal.toFixed(2)}</td>
                          <td className="p-3 text-right font-mono text-slate-500">S/ {mStats.salesCost.toFixed(2)}</td>
                          <td className="p-3 text-right font-mono text-rose-500">S/ {mExpenses.toFixed(2)}</td>
                          <td className={`p-3 text-right font-mono font-bold ${mNetProfit >= 0 ? 'text-teal-600' : 'text-rose-600'}`}>
                            S/ {mNetProfit.toFixed(2)}
                          </td>
                          <td className="p-3 text-right font-mono text-slate-500 font-bold">{mMargin.toFixed(1)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

        {/* Right Side: Expense details and financial guidelines */}
        <div className="space-y-6">
          
          {/* List of Manual Expenses for the Month */}
          <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Detalle de Gastos Manuales</h3>
              <p className="text-slate-400 text-xs">Egresos de caja registrados durante el mes.</p>
            </div>

            {/* Filter manual movements for selected month */}
            {(() => {
              const activeMonthMovements = movements.filter(m => {
                const isManual = m.category !== 'Venta' && m.category !== 'Cobro de fiado' && m.category !== 'Apertura';
                return getYearMonth(m.timestamp) === selectedMonth && m.type === 'EGRESO' && isManual;
              });

              if (activeMonthMovements.length === 0) {
                return (
                  <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    Sin egresos manuales registrados en {getMonthNameSpanish(selectedMonth)}.
                  </div>
                );
              }

              return (
                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                  {activeMonthMovements.map(m => (
                    <div key={m.id} className="flex justify-between items-start p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                      <div>
                        <p className="font-semibold text-slate-800">{m.concept}</p>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">{m.timestamp.slice(5, 16)} • {m.category}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-rose-600 font-mono">- S/ {m.amount.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Audit Guidelines and Warnings */}
          <div className="bg-slate-900 text-slate-200 p-5 border border-slate-800 rounded-xl shadow-lg space-y-4 relative overflow-hidden">
            <div className="absolute top-[-20%] right-[-20%] w-24 h-24 rounded-full bg-teal-500/10 blur-xl"></div>
            
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center shrink-0">
                <Award className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">Análisis de Rentabilidad</h4>
                <p className="text-slate-400 text-xs mt-1">Directrices para la auditoría de caja:</p>
              </div>
            </div>

            <div className="space-y-2.5 text-[11px] text-slate-300 border-t border-slate-800 pt-3">
              <div className="flex items-start gap-2">
                <span className="text-teal-400 font-bold shrink-0 mt-0.5">•</span>
                <p><span className="text-white font-semibold">Costo COGS</span>: Representa lo que costó comprar la mercadería que vendiste. Si es alto, evalúa comprar a mejores distribuidores.</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-teal-400 font-bold shrink-0 mt-0.5">•</span>
                <p><span className="text-white font-semibold">Margen Bruto</span>: Idealmente debe mantenerse sobre el 35% en productos del Kiosco/POS para cubrir gastos operativos.</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-teal-400 font-bold shrink-0 mt-0.5">•</span>
                <p><span className="text-white font-semibold">Egresos Manuales</span>: Registra siempre todas las salidas de caja (pagos a proveedores de agua, galletas, etc.) para tener una contabilidad neta verídica.</p>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
