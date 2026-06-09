/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User } from '../types';
import { Lock, User as UserIcon, ShieldAlert } from 'lucide-react';
import { hashPassword } from '../utils/crypto';

interface LoginViewProps {
  users: User[];
  onLogin: (user: User) => void;
}

export default function LoginView({ users, onLogin }: LoginViewProps) {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [shaking, setShaking] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password.trim()) {
      triggerError('⚠️ Ingrese usuario y contraseña.');
      return;
    }

    const hashedPassword = await hashPassword(password);

    // Find the user by username & password case sensitive/insensitive depending on preferences
    const matched = users.find(
      u => (u.username?.toLowerCase() === username.trim().toLowerCase() || u.email?.toLowerCase() === username.trim().toLowerCase()) && u.password === hashedPassword
    );

    if (matched) {
      onLogin(matched);
    } else {
      triggerError('❌ Usuario o contraseña incorrectos.');
    }
  };

  const triggerError = (msg: string) => {
    setError(msg);
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-slate-950 font-sans p-4 relative overflow-hidden">
      {/* Background gradients for premium glassmorphic feel */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-teal-900/20 blur-[120px]"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-emerald-900/15 blur-[120px]"></div>

      <div className={`w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10 transition-all ${
        shaking ? 'animate-shake' : ''
      }`}>
        
        {/* Brand Header */}
        <div className="text-center space-y-2 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-black text-2xl shadow-xl shadow-teal-900/30 mx-auto">
            AM
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-wider uppercase">ADM-MTA</h2>
            <p className="text-xs text-slate-400 font-semibold tracking-wider uppercase mt-1">Control de Turnos y POS</p>
          </div>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div className="mb-6 p-4.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-2xl text-xs font-bold flex items-start gap-3 shadow-md">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Usuario de Acceso</label>
            <div className="relative">
              <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
              <input 
                type="text" 
                placeholder="E.g. AdminMTA"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-semibold text-white placeholder-slate-600 transition"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
              <input 
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-semibold text-white placeholder-slate-600 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-4.5 bg-teal-600 hover:bg-teal-700 text-white font-extrabold uppercase tracking-widest text-xs rounded-xl shadow-lg hover:shadow-teal-900/20 active:scale-98 transition cursor-pointer mt-2"
          >
            Iniciar Turno de Caja
          </button>
        </form>

        <p className="text-[10px] text-center text-slate-500 mt-8 font-semibold tracking-wide uppercase">
          Sports POS System • Todos los derechos reservados 2026
        </p>

      </div>
    </div>
  );
}
