/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Product, Customer, Venta, User } from '../types';
import { TrendingUp, AlertTriangle, Users, Wallet, CreditCard, Activity, ShoppingCart } from 'lucide-react';

interface DashboardViewProps {
  products: Product[];
  customers: Customer[];
  ventas: Venta[];
  activeUser: User;
  onNavigate: (tab: string) => void;
}

export default function DashboardView({
  products,
  customers,
  ventas,
  activeUser,
  onNavigate
}: DashboardViewProps) {
  
  // Calculate stats from actual state dynamically
  const today = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const todayPrefix = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  
  const todaySales = ventas
    .filter(v => v.timestamp.startsWith(todayPrefix) && v.status === 'COMPLETADA')
    .reduce((sum, v) => sum + v.total, 0);

  const monthSales = ventas
    .filter(v => v.status === 'COMPLETADA')
    .reduce((sum, v) => sum + v.total, 0);

  const totalDebt = customers.reduce((sum, c) => sum + c.currentDebt, 0);
  const customersWithDebt = customers.filter(c => c.currentDebt > 0).length;
  const lowStockProducts = products.filter(p => p.stock <= p.lowStockThreshold);

  const recentVentas = [...ventas]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Alert Header if stock is critical or user is vendedor */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">¡Hola, {activeUser.name}! 👋</h2>
          <p className="text-slate-500 text-sm mt-1">El quiosco está listo para operar. Turno actual: <span className="font-semibold text-teal-600">{activeUser.shift}</span> (Rol: <span className="font-semibold text-slate-700">{activeUser.role}</span>)</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => onNavigate('Nueva Venta')}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-medium px-4 py-2.5 rounded-lg text-sm shadow-sm transition-colors cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4" />
            Nueva Venta
          </button>
        </div>
      </div>

      {/* KPI Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* KPI 1 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Ventas del Día</span>
            <div className="p-2 bg-teal-50 text-teal-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-bold text-slate-900">S/ {todaySales.toFixed(2)}</span>
            <p className="text-xs text-teal-600 font-semibold mt-1">Ventas reales registradas</p>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Ventas del Mes</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-bold text-slate-900">S/ {monthSales.toFixed(2)}</span>
            <p className="text-xs text-blue-600 font-medium mt-1">Acumulado activo</p>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Cuentas por Cobrar</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-bold text-slate-900 text-amber-600">S/ {totalDebt.toFixed(2)}</span>
            <p className="text-xs text-slate-500 mt-1">Capital pendiente de cobro</p>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Clientes con Deuda</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-bold text-slate-900">{customersWithDebt}</span>
            <p className="text-xs text-purple-600 font-medium mt-1">Con saldo pendiente</p>
          </div>
        </div>

        {/* KPI 5 */}
        <div className={`p-5 rounded-xl border flex flex-col justify-between hover:shadow-md transition-shadow ${
          lowStockProducts.length > 0 ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200'
        }`}>
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Stock Bajo</span>
            <div className={`p-2 rounded-lg ${
              lowStockProducts.length > 0 ? 'bg-rose-100 text-rose-600' : 'bg-slate-50 text-slate-600'
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className={`text-2xl font-bold ${lowStockProducts.length > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {lowStockProducts.length}
            </span>
            <p className="text-xs text-rose-600 mt-1">Requieren reabastecer</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Transactions / Alerts & Low stock */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Recientes */}
        <div className="bg-white rounded-xl border border-slate-200 lg:col-span-2 overflow-hidden shadow-sm flex flex-col">
          <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-600" />
              Últimas Ventas Registradas
            </h3>
            <button 
              onClick={() => onNavigate('Reportes')}
              className="text-teal-600 hover:text-teal-700 text-xs font-bold uppercase tracking-wider cursor-pointer"
            >
              Ver Todas
            </button>
          </div>
          
          <div className="flex-1 divide-y divide-slate-100">
            {recentVentas.map((v) => (
              <div key={v.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${
                    v.paymentMethod === 'CREDITO' ? 'bg-amber-100 text-amber-700' : 'bg-teal-100 text-teal-700'
                  }`}>
                    {v.customerName.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 text-sm">{v.customerName}</h4>
                    <p className="text-xs text-slate-400 font-mono">{v.timestamp} • Método: <span className="font-medium text-slate-600">{v.paymentMethod}</span></p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="font-bold text-slate-800 text-sm">S/ {v.total.toFixed(2)}</p>
                  <p className="text-[10px] uppercase font-bold text-emerald-600">
                    {v.paymentMethod === 'CREDITO' ? (
                      <span className="text-amber-600">Fiar S/ {v.pendingAmount.toFixed(2)}</span>
                    ) : (
                      'Cobrado'
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Col: Low stock widgets details */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
          <div className="p-5 border-b border-slate-200 bg-slate-50">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              Alertas de Inventario
            </h3>
          </div>
          <div className="flex-1 p-5 space-y-4 overflow-y-auto max-h-[360px]">
            {lowStockProducts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-400 text-sm">¡Excelente! Todo el inventario se encuentra con stock óptimo.</p>
              </div>
            ) : (
              lowStockProducts.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-rose-50 border border-rose-100 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-10 bg-rose-500 rounded-lg shrink-0"></span>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 truncate max-w-[150px]">{p.name}</h4>
                      <p className="text-xs text-slate-500">Categoría: {p.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-rose-600 uppercase">Quedan : {p.stock}</p>
                    <p className="text-[10px] font-medium text-slate-400">Min: {p.lowStockThreshold}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="p-4 border-t border-slate-100 bg-slate-50">
            <button 
              onClick={() => onNavigate('Inventario')}
              className="w-full text-center text-teal-600 hover:text-teal-700 text-xs font-bold uppercase tracking-wider block cursor-pointer"
            >
              Gestionar Inventario
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
