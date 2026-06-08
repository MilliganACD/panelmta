/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { User } from '../types';
import { ShieldCheck, UserCheck, Trash2, Database, Info, Settings, ShieldAlert, Check, X } from 'lucide-react';

interface ConfiguracionViewProps {
  users: User[];
  activeUser: User;
  onSwitchUser: (userId: string) => void;
  onRestoreDefaults: () => void;
}

export default function ConfiguracionView({
  users,
  activeUser,
  onSwitchUser,
  onRestoreDefaults
}: ConfiguracionViewProps) {
  
  const handleReset = () => {
    if (confirm('⚠️ ¿Está completamente seguro de restablecer el sistema del Kiosco?\nSe perderán todas las ventas y deudas agregadas en la sesión actual y retornará a los valores demo por defecto.')) {
      onRestoreDefaults();
      alert('♻️ Datos del POS restablecidos con éxito.');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Settings Header */}
      <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Settings className="w-5 h-5 text-teal-600" />
          Configuración Global del Sistema POS (Kiosco)
        </h2>
        <p className="text-slate-500 text-xs mt-1">Administración de perfiles, permisos activos de cajero, y restauración integral de bases de datos.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Switch Profiler selection (Left Side) */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl space-y-4">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-teal-600" />
            Cambiar de Perfil / Turno
          </h3>
          <p className="text-slate-400 text-xs">Haz clic en un perfil para cambiar inmediatamente los permisos de operación de la interfaz.</p>
          
          <div className="space-y-3 pt-2">
            {users.map(u => {
              const isActive = activeUser.id === u.id;
              return (
                <div 
                  key={u.id}
                  onClick={() => {
                    onSwitchUser(u.id);
                  }}
                  className={`border rounded-xl p-4 flex items-center justify-between cursor-pointer transition-all transform active:scale-98 ${
                    isActive 
                      ? 'bg-teal-50 border-teal-500 shadow-sm' 
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${
                      isActive ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {u.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-xs">{u.name}</h4>
                      <p className="text-slate-400 text-[10px] mt-0.5">Turno: {u.shift} • Rol: <span className="font-bold">{u.role}</span></p>
                    </div>
                  </div>

                  {isActive && (
                    <span className="w-4 h-4 rounded-full bg-teal-600 border border-teal-100 flex items-center justify-center text-white">
                      ✓
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Detailed chart Permissions Indicator matrix (Center/Right 2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Permissions Matrix */}
          <div className="bg-white border border-slate-200 p-5 rounded-xl space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              Matriz de Control de Accesos y Privilegios
            </h3>
            
            <div className="overflow-hidden border border-slate-150 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Módulo o Función en Quiosco</th>
                    <th className="p-3 text-center">Administrador</th>
                    <th className="p-3 text-center">Vendedor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  <tr>
                    <td className="p-3 text-slate-700">🛒 Registrar Ventas en Caja (Efectivo, Digital, Fiado)</td>
                    <td className="p-3 text-center"><Check className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                    <td className="p-3 text-center"><Check className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="p-3 text-slate-700">💰 Apertura y Arqueo / Cierre Físico de Caja</td>
                    <td className="p-3 text-center"><Check className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                    <td className="p-3 text-center"><Check className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="p-3 text-slate-700 font-bold text-rose-600">💸 Autorizar Ventas por Encima del Límite de Deuda</td>
                    <td className="p-3 text-center"><Check className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                    <td className="p-3 text-center"><X className="w-4 h-4 text-rose-600 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="p-3 text-slate-700 font-bold text-rose-600">📝 Modificar Catálogo (Nuevo Item, Modificar Precios)</td>
                    <td className="p-3 text-center"><Check className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                    <td className="p-3 text-center"><X className="w-4 h-4 text-rose-600 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="p-3 text-slate-700 font-bold text-rose-600">🗑️ Borrar Productos, Eliminar Varios del Inventario</td>
                    <td className="p-3 text-center"><Check className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                    <td className="p-3 text-center"><X className="w-4 h-4 text-rose-600 mx-auto" /></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Current Context Warning Badge */}
            {activeUser.role === 'VENDEDOR' && (
              <div className="bg-rose-50 border border-rose-100 text-rose-800 p-3.5 rounded-lg text-xs font-semibold flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
                <span>Usted se encuentra en modo Vendedor. Las funciones de creación, eliminación y precios críticos están bloqueadas para prevenir descuadres de auditoría.</span>
              </div>
            )}
          </div>

          {/* Database Reset controls */}
          <div className="bg-white border border-slate-200 p-5 rounded-xl space-y-4 shadow-sm">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 text-rose-600">
              <Database className="w-4 h-4" />
              Restablecer Datos del Sistema
            </h3>
            
            <p className="text-slate-500 text-xs leading-relaxed">
              ¿Desea retornar a la configuración inicial por defecto? Esto restaurará todo el stock original catalogado (Agua San Mateo, Gatorade, Snickers, Oreo) y limpiará las ventas y abonos del historial para demostraciones limpias o entrega de turnos.
            </p>

            <button
              onClick={handleReset}
              className="px-4 py-2 bg-rose-100 hover:bg-rose-200 border border-rose-200 text-rose-700 rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Restablecer Datos de Caja a Cero
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
