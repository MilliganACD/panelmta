/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { ShieldCheck, UserPlus, Trash2, Database, Settings, ShieldAlert, Plus, Layers, UserX } from 'lucide-react';
import { hashPassword } from '../utils/crypto';

interface ConfiguracionViewProps {
  users: User[];
  activeUser: User;
  onAddUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
  onRestoreDefaults: () => void;
}

export default function ConfiguracionView({
  users,
  activeUser,
  onAddUser,
  onDeleteUser,
  onRestoreDefaults
}: ConfiguracionViewProps) {
  
  // Create operator form states
  const [name, setName] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [role, setRole] = useState<UserRole>('VENDEDOR');
  const [shift, setShift] = useState<'MAÑANA' | 'TARDE'>('TARDE');

  const handleReset = () => {
    if (confirm('⚠️ ¿Está completamente seguro de restablecer el sistema del Kiosco?\nSe perderán todas las ventas y deudas agregadas y retornará a los valores de base de datos vacíos iniciales.')) {
      onRestoreDefaults();
      alert('♻️ Datos del POS restablecidos con éxito.');
    }
  };

  const handleAddOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeUser.role !== 'ADMIN') return;

    if (!name.trim() || !username.trim() || !password.trim()) {
      alert('⚠️ Por favor llene todos los campos obligatorios del formulario.');
      return;
    }

    // Check if username is already taken
    const exists = users.some(u => u.username?.toLowerCase() === username.trim().toLowerCase());
    if (exists) {
      alert('❌ El nombre de usuario ya está registrado por otro operador.');
      return;
    }

    // Check if email is already taken
    if (email.trim() !== '') {
      const emailExists = users.some(u => u.email?.toLowerCase() === email.trim().toLowerCase());
      if (emailExists) {
        alert('❌ El correo electrónico ya está registrado por otro operador.');
        return;
      }
    }

    const defaultAvatars: Record<UserRole, string> = {
      'ADMIN': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
      'VENDEDOR': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80'
    };

    const hashedPassword = await hashPassword(password);

    const newOperator: User = {
      id: `user-${Date.now()}`,
      name: name.trim(),
      username: username.trim(),
      email: email.trim() || undefined,
      password: hashedPassword,
      role,
      shift,
      avatarUrl: defaultAvatars[role]
    };

    onAddUser(newOperator);
    
    // Clear form
    setName('');
    setUsername('');
    setEmail('');
    setPassword('');
    alert(`🎉 Operador "${newOperator.name}" registrado con éxito.`);
  };

  const handleDeleteOperator = (userId: string, userName: string) => {
    if (userId === activeUser.id) {
      alert('❌ No puedes eliminar tu propio usuario de la sesión activa.');
      return;
    }

    if (confirm(`⚠️ ¿Está seguro de dar de baja al operador "${userName}"?\nYa no podrá ingresar al POS.`)) {
      onDeleteUser(userId);
      alert(`🗑️ Operador "${userName}" eliminado.`);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Settings Header */}
      <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Settings className="w-5 h-5 text-teal-600" />
          Configuración Global del Sistema POS (ADM-MTA)
        </h2>
        <p className="text-slate-500 text-xs mt-1">Administración de perfiles cajeros, credenciales de turnos y mantenimiento de bases de datos.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Cashier Creation panel (Left Side - Admin Only) */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl space-y-4">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-teal-600" />
            Registrar Nuevo Operador
          </h3>
          
          {activeUser.role === 'ADMIN' ? (
            <form onSubmit={handleAddOperator} className="space-y-3.5 pt-2">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Nombre Completo</label>
                <input 
                  type="text" 
                  required
                  placeholder="E.g. María Gómez"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Nombre de Usuario</label>
                <input 
                  type="text" 
                  required
                  placeholder="E.g. mariag"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Correo Electrónico (Opcional)</label>
                <input 
                  type="email" 
                  placeholder="E.g. maria@gmail.com (Opcional)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Contraseña</label>
                <input 
                  type="password" 
                  required
                  placeholder="E.g. Control999"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Rol</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
                  >
                    <option value="VENDEDOR">Vendedor</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Turno</label>
                  <select
                    value={shift}
                    onChange={(e) => setShift(e.target.value as 'MAÑANA' | 'TARDE')}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
                  >
                    <option value="MAÑANA">Mañana</option>
                    <option value="TARDE">Tarde</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-teal-650 hover:bg-teal-700 text-white font-bold rounded-lg text-xs tracking-wider flex items-center justify-center gap-1.5 cursor-pointer mt-3 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Registrar Operador
              </button>
            </form>
          ) : (
            <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl text-center text-xs text-slate-500 leading-relaxed py-8">
              🔒 Acceso Restringido.
              <span className="block mt-1.5 font-semibold text-slate-600">Solo administradores pueden registrar nuevos cajeros o cambiar sus claves.</span>
            </div>
          )}
        </div>

        {/* Detailed chart Permissions Indicator matrix (Center/Right 2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Active Operator list (Visible for Admin only, or shows user profile details for Vendor) */}
          <div className="bg-white border border-slate-200 p-5 rounded-xl space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-teal-600" />
              Operadores Activos en Sistema
            </h3>
            
            {activeUser.role === 'ADMIN' ? (
              <div className="divide-y divide-slate-100 max-h-[280px] overflow-y-auto pr-1">
                {users.map(u => {
                  const isActiveSession = u.id === activeUser.id;
                  return (
                    <div key={u.id} className="py-3 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-700">
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                            {u.name}
                            {isActiveSession && (
                              <span className="bg-teal-50 text-teal-700 font-bold px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider border border-teal-100">Sesión</span>
                            )}
                          </h4>
                          <p className="text-slate-400 text-[10px] mt-0.5">
                            Usuario: <span className="font-semibold text-slate-600">{u.username}</span>{u.email && <span> • Correo: <span className="font-semibold text-slate-600">{u.email}</span></span>} • Clave: <span className="font-semibold text-slate-600 font-mono">{u.password}</span> • Turno: {u.shift}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          u.role === 'ADMIN' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                            : 'bg-amber-50 text-amber-700 border-amber-100'
                        }`}>
                          {u.role}
                        </span>
                        
                        {!isActiveSession && (
                          <button
                            onClick={() => handleDeleteOperator(u.id, u.name)}
                            className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition hover:text-rose-700 cursor-pointer"
                            title="Dar de baja operador"
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-700">
                    {activeUser.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs">{activeUser.name}</h4>
                    <p className="text-slate-400 text-[10px] mt-0.5">Usuario: <span className="font-mono font-bold">{activeUser.username}</span> • Turno: {activeUser.shift}</p>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full border border-amber-200">
                  {activeUser.role}
                </span>
              </div>
            )}
          </div>

          {/* Permissions Matrix */}
          <div className="bg-white border border-slate-200 p-5 rounded-xl space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              Matriz de Control de Accesos y Privilegios
            </h3>
            
            <div className="overflow-hidden border border-slate-150 rounded-lg">
              <table className="w-full text-left text-xs bg-white">
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
                    <td className="p-3 text-center">✓</td>
                    <td className="p-3 text-center">✓</td>
                  </tr>
                  <tr>
                    <td className="p-3 text-slate-700">💰 Apertura y Arqueo / Cierre Físico de Caja</td>
                    <td className="p-3 text-center">✓</td>
                    <td className="p-3 text-center">✓</td>
                  </tr>
                  <tr>
                    <td className="p-3 text-slate-700 font-bold text-rose-600">💸 Autorizar Ventas por Encima del Límite de Deuda</td>
                    <td className="p-3 text-center">✓</td>
                    <td className="p-3 text-center">✗</td>
                  </tr>
                  <tr>
                    <td className="p-3 text-slate-700 font-bold text-rose-600">📝 Modificar Catálogo (Nuevo Item, Modificar Precios)</td>
                    <td className="p-3 text-center">✓</td>
                    <td className="p-3 text-center">✗</td>
                  </tr>
                  <tr>
                    <td className="p-3 text-slate-700 font-bold text-rose-600">🗑️ Borrar Productos, Eliminar Varios del Inventario</td>
                    <td className="p-3 text-center">✓</td>
                    <td className="p-3 text-center">✗</td>
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
              ¿Desea retornar a la configuración inicial por defecto? Esto restaurará la sesión inicial a CERRADA, vaciará todos los productos e inventarios catalogados, y eliminará todos los vendedores registrados dejando únicamente el usuario administrador principal (`AdminMTA`).
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
