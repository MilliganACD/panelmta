/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  getStoredData, 
  restoreDefaults,
  saveVenta,
  registerCustomerPayment,
  saveProduct,
  updateProductStock,
  deleteProduct,
  saveCustomer,
  openCashSession,
  closeCashSession,
  saveCashMovement,
  saveUser,
  deleteUser
} from './dbStore';
import { Product, Customer, Venta, CashMovement, CashSession, User, CartItem, PaymentMethod } from './types';
import { supabase, isSupabaseConfigured } from './supabaseClient';

// Modular Subviews
import DashboardView from './components/DashboardView';
import VentaView from './components/VentaView';
import CuentasView from './components/CuentasView';
import InventarioView from './components/InventarioView';
import CajaView from './components/CajaView';
import ClientesView from './components/ClientesView';
import ReportesView from './components/ReportesView';
import ConfiguracionView from './components/ConfiguracionView';
import LoginView from './components/LoginView';

// Nav icons
import { LayoutDashboard, ShoppingCart, Percent, ClipboardList, Wallet, Users, BarChart3, Settings, LogOut } from 'lucide-react';

// Date Formatting Helpers
const getNowString = () => {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
};

const getLogDateString = () => {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(now.getMonth() + 1)}/${pad(now.getDate())}  ${pad(now.getHours())}:${pad(now.getMinutes())}`;
};

const getDebtDateString = () => {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

export default function App() {
  
  // Navigation active tab
  const [activeTab, setActiveTab] = useState<string>('Dashboard');

  // Loading and error states for network DB connection
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Core POS store state
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [session, setSession] = useState<CashSession | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [activeUser, setActiveUser] = useState<User | null>(null);

  // Manual log of inventory adjustments
  const [inventoryLogs, setInventoryLogs] = useState<{ date: string; type: string; productName: string; delta: number }[]>([]);

  // Load from database store on start and setup Realtime subscription
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);
        const data = await getStoredData();
        setProducts(data.products);
        setCustomers(data.customers);
        setVentas(data.ventas);
        setMovements(data.movements);
        setSession(data.session);
        setUsers(data.users);
        
        // Sync active user session from localStorage cache if present and valid
        const cachedUser = localStorage.getItem('pos_active_user');
        if (cachedUser) {
          try {
            const parsed = JSON.parse(cachedUser);
            const matched = data.users.find(u => u.id === parsed.id);
            if (matched) {
              setActiveUser(matched);
            } else {
              setActiveUser(null);
            }
          } catch (e) {
            setActiveUser(null);
          }
        } else {
          setActiveUser(null);
        }
      } catch (err: any) {
        setErrorMsg('Error al conectar con la base de datos de Supabase. Verifique las variables de entorno o la conexión de red.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();

    // Set up Realtime listener if Supabase is configured
    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel('schema-db-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public'
          },
          () => {
            // Reload all data to keep in sync
            getStoredData().then(data => {
              setProducts(data.products);
              setCustomers(data.customers);
              setVentas(data.ventas);
              setMovements(data.movements);
              setSession(data.session);
              setUsers(data.users);
            }).catch(err => {
              console.error('Error reloading data via Realtime:', err);
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, []);

  // Save states helper to update local React states synchronously
  const persistState = (
    newProducts: Product[],
    newCustomers: Customer[],
    newVentas: Venta[],
    newMovements: CashMovement[],
    newSession: CashSession
  ) => {
    setProducts(newProducts);
    setCustomers(newCustomers);
    setVentas(newVentas);
    setMovements(newMovements);
    setSession(newSession);
  };

  // State Mutator Actions

  // 1. Process and save new cash sale
  const handleAddVenta = (ventaData: {
    customerId: string;
    customerName: string;
    items: CartItem[];
    total: number;
    paymentMethod: PaymentMethod;
    paidAmount: number;
    pendingAmount: number;
  }) => {
    if (!session || !activeUser) return;

    const todayStr = getNowString();

    // Generate Venta Item
    const newVenta: Venta = {
      id: `TRX-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: todayStr,
      customerId: ventaData.customerId,
      customerName: ventaData.customerName,
      items: ventaData.items.map(cartItem => ({
        productId: cartItem.product.id,
        productName: cartItem.product.name,
        price: cartItem.product.price,
        quantity: cartItem.quantity
      })),
      total: ventaData.total,
      paymentMethod: ventaData.paymentMethod,
      paidAmount: ventaData.paidAmount,
      pendingAmount: ventaData.pendingAmount,
      status: 'COMPLETADA',
      cashierName: activeUser.name
    };

    // A. Update Inventory Stock Count
    const updatedProducts = products.map(p => {
      const cartItem = ventaData.items.find(item => item.product.id === p.id);
      if (cartItem) {
        // Log movement
        setInventoryLogs(prev => [
          { date: getLogDateString(), type: 'Venta', productName: p.name, delta: -cartItem.quantity },
          ...prev
        ]);
        return {
          ...p,
          stock: Math.max(0, p.stock - cartItem.quantity)
        };
      }
      return p;
    });

    // B. Update Customer Credit History and debt if registered & contains credit parts
    const updatedCustomers = customers.map(c => {
      if (c.id === ventaData.customerId && (ventaData.paymentMethod === 'CREDITO' || ventaData.paymentMethod === 'MIXTO')) {
        const generatedDebts = ventaData.items.map((cartItem, idx) => ({
          id: `debt-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
          productName: cartItem.product.name,
          price: cartItem.product.price * cartItem.quantity,
          quantity: cartItem.quantity,
          date: getDebtDateString()
        }));

        return {
          ...c,
          currentDebt: c.currentDebt + ventaData.pendingAmount,
          totalPurchases: c.totalPurchases + 1,
          debts: [...c.debts, ...generatedDebts]
        };
      } else if (c.id === ventaData.customerId) {
        // Just general register cash buy count
        return {
          ...c,
          totalPurchases: c.totalPurchases + 1
        };
      }
      return c;
    });

    // C. Record automatic Cash Movement if cash is involved
    let updatedMovements = [...movements];
    let newMov: CashMovement | undefined = undefined;
    if (ventaData.paidAmount > 0 && (ventaData.paymentMethod === 'EFECTIVO' || ventaData.paymentMethod === 'MIXTO')) {
      newMov = {
        id: `mov-${Date.now()}`,
        timestamp: todayStr,
        type: 'INGRESO',
        concept: `Venta Registrada - ticket ${newVenta.id}`,
        category: 'Venta',
        amount: ventaData.paidAmount
      };
      updatedMovements = [newMov, ...updatedMovements];
    }

    // Persist local React states instantly
    persistState(updatedProducts, updatedCustomers, [newVenta, ...ventas], updatedMovements, session);

    // Sync to Supabase in background
    saveVenta(newVenta, updatedProducts, updatedCustomers, newMov).catch(err => {
      console.error('Error saving sale to Supabase:', err);
    });
  };

  // 2. Register Client debt payment (abono de deudor)
  const handleRegisterPayment = (customerId: string, amountPaid: number) => {
    if (!session || !activeUser) return;

    const todayStr = getNowString();

    // Update Customer debt totals and debts collection
    const updatedCustomers = customers.map(c => {
      if (c.id === customerId) {
        // Deduct from debts array starting from earliest debt
        let remainingReduction = amountPaid;
        const updatedDebts = [...c.debts].map(d => {
          if (remainingReduction <= 0) return d;
          if (d.price <= remainingReduction) {
            remainingReduction -= d.price;
            return null; // paid off
          } else {
            const newPrice = d.price - remainingReduction;
            remainingReduction = 0;
            return { ...d, price: newPrice };
          }
        }).filter((d): d is any => d !== null);

        return {
          ...c,
          currentDebt: Math.max(0, c.currentDebt - amountPaid),
          debts: updatedDebts
        };
      }
      return c;
    });

    // Register receipt cash movement INGRESO
    const matchedCustomer = customers.find(c => c.id === customerId);
    const newMov: CashMovement = {
      id: `mov-${Date.now()}`,
      timestamp: todayStr,
      type: 'INGRESO',
      concept: `Abono de deuda - ${matchedCustomer?.name || 'Cliente'}`,
      category: 'Cobro de fiado',
      amount: amountPaid
    };

    // Persist local React states instantly
    persistState(products, updatedCustomers, ventas, [newMov, ...movements], session);

    // Sync to Supabase in background
    registerCustomerPayment(customerId, amountPaid, updatedCustomers, newMov).catch(err => {
      console.error('Error saving customer payment to Supabase:', err);
    });
  };

  // 3. Add catalog item (Creator function)
  const handleAddProduct = (newProduct: Product) => {
    if (!session) return;
    persistState([newProduct, ...products], customers, ventas, movements, session);

    // Sync to Supabase in background
    saveProduct(newProduct).catch(err => {
      console.error('Error saving new product to Supabase:', err);
    });
  };

  // 4. Update Stock values manually
  const handleUpdateStock = (productId: string, newStock: number) => {
    if (!session) return;
    const originalPro = products.find(p => p.id === productId);
    const diff = newStock - (originalPro?.stock || 0);
    
    if (diff !== 0) {
      setInventoryLogs(prev => [
        { 
          date: getLogDateString(), 
          type: diff > 0 ? 'Abastecer' : 'Ajuste', 
          productName: originalPro?.name || 'Producto', 
          delta: diff 
        },
        ...prev
      ]);
    }

    const updated = products.map(p => {
      if (p.id === productId) {
        return { ...p, stock: newStock };
      }
      return p;
    });
    
    persistState(updated, customers, ventas, movements, session);

    // Sync to Supabase in background
    updateProductStock(productId, newStock).catch(err => {
      console.error('Error updating product stock in Supabase:', err);
    });
  };

  // 5. Delete product
  const handleDeleteProduct = (productId: string) => {
    if (!session) return;
    const updated = products.filter(p => p.id !== productId);
    persistState(updated, customers, ventas, movements, session);

    // Sync to Supabase in background
    deleteProduct(productId).catch(err => {
      console.error('Error deleting product from Supabase:', err);
    });
  };

  // 6. Add new client customer profiles
  const handleAddCustomer = (newCustomer: Customer) => {
    if (!session) return;
    const updated = [newCustomer, ...customers];
    persistState(products, updated, ventas, movements, session);

    // Sync to Supabase in background
    saveCustomer(newCustomer).catch(err => {
      console.error('Error saving new customer to Supabase:', err);
    });
  };

  // 7. Open Active Drawer shift session
  const handleOpenSession = (amount: number) => {
    const todayStr = '2026-06-08 08:00';
    const updatedSession: CashSession = {
      isOpened: true,
      status: 'ABIERTA',
      initialAmount: amount,
      expectedAmount: amount,
      openedAt: todayStr
    };

    // Register system movement for audit record tracking opening
    const newMov: CashMovement = {
      id: `mov-${Date.now()}`,
      timestamp: todayStr,
      type: 'INGRESO',
      concept: 'Apertura de Caja de Turno',
      category: 'Apertura',
      amount: amount
    };

    persistState(products, customers, ventas, [newMov, ...movements], updatedSession);

    // Sync to Supabase in background
    openCashSession(amount, newMov).catch(err => {
      console.error('Error opening cash session in Supabase:', err);
    });
  };

  // 8. Close drawer shift session
  const handleCloseSession = (countedAmount: number, notes: string) => {
    const updatedSession: CashSession = {
      isOpened: false,
      status: 'CERRADA',
      initialAmount: 0,
      expectedAmount: 0,
      openedAt: '',
      closedAt: '2026-06-08 18:00',
      notes,
      countedAmount
    };
    persistState(products, customers, ventas, [], updatedSession);

    // Sync to Supabase in background
    closeCashSession(countedAmount, notes).catch(err => {
      console.error('Error closing cash session in Supabase:', err);
    });
  };

  // 9. Add custom movement log
  const handleAddMovement = (type: 'INGRESO' | 'EGRESO', concept: string, category: string, amount: number) => {
    if (!session) return;
    const newMov: CashMovement = {
      id: `mov-${Date.now()}`,
      timestamp: '2026-06-08 16:30',
      type,
      concept,
      category,
      amount
    };
    persistState(products, customers, ventas, [newMov, ...movements], session);

    // Sync to Supabase in background
    saveCashMovement(type, concept, category, amount, newMov).catch(err => {
      console.error('Error saving cash movement to Supabase:', err);
    });
  };

  // 10. User Auth Handlers
  const handleLogin = (user: User) => {
    setActiveUser(user);
    localStorage.setItem('pos_active_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setActiveUser(null);
    localStorage.removeItem('pos_active_user');
    setActiveTab('Dashboard');
  };

  // 11. Cashier / Seller Management Handlers
  const handleAddUser = (newUser: User) => {
    setUsers(prev => [newUser, ...prev]);
    saveUser(newUser).catch(err => {
      console.error('Error saving user to database:', err);
    });
  };

  const handleDeleteUser = (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
    deleteUser(userId).catch(err => {
      console.error('Error deleting user from database:', err);
    });
  };

  // 12. Clear state defaults
  const handleRestoreDefaults = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await restoreDefaults();
      setProducts(data.products);
      setCustomers(data.customers);
      setVentas(data.ventas);
      setMovements(data.movements);
      setSession(data.session);
      setUsers(data.users);
      setActiveUser(null); // Log out to require logging back in with AdminMTA/Control2026
      localStorage.removeItem('pos_active_user');
      setActiveTab('Dashboard');
    } catch (err) {
      console.error('Error restoring defaults:', err);
      setErrorMsg('Error al restablecer la base de datos de Supabase.');
    } finally {
      setLoading(false);
    }
  };

  // Quick navigation router helper
  const navigateTo = (tab: string) => {
    setActiveTab(tab);
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-900 font-sans">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-widest uppercase">ADM-MTA</h3>
            <p className="text-[10px] text-slate-400 mt-1">Conectando con la base de datos en Supabase...</p>
          </div>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-900 font-sans p-4">
        <div className="max-w-md p-6 bg-slate-950 border border-rose-500/30 rounded-2xl text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto text-xl">⚠️</div>
          <div>
            <h3 className="text-sm font-black text-white tracking-wider uppercase">Error de Conexión a Base de Datos</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              No se pudo conectar a tu base de datos de Supabase. Asegúrate de configurar las variables de entorno <code className="bg-slate-900 px-1 py-0.5 rounded text-teal-400 font-mono">VITE_SUPABASE_URL</code> y <code className="bg-slate-900 px-1 py-0.5 rounded text-teal-400 font-mono">VITE_SUPABASE_ANON_KEY</code> en tu archivo <code className="bg-slate-900 px-1.5 py-0.5 rounded text-white">.env</code> y tener las tablas creadas con el script SQL.
            </p>
          </div>
          <button 
            onClick={handleRestoreDefaults}
            className="w-full py-2.5 bg-teal-650 hover:bg-teal-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors"
          >
            Reestablecer Semilla y Reintentar Conexión
          </button>
        </div>
      </div>
    );
  }

  if (!activeUser) {
    return <LoginView users={users} onLogin={handleLogin} />;
  }

  if (!session) {
    return null;
  }


  // Define navigational tabs list
  const TABS = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'Nueva Venta', icon: ShoppingCart },
    { name: 'Cuentas por Cobrar', icon: Percent },
    { name: 'Inventario', icon: ClipboardList },
    { name: 'Caja', icon: Wallet },
    { name: 'Clientes', icon: Users },
    { name: 'Reportes', icon: BarChart3 },
    { name: 'Configuración', icon: Settings },
  ] as const;

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-slate-100 font-sans">
      
      {/* Visual Navigation Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-400 flex flex-col justify-between shrink-0 border-r border-slate-800 z-40">
        
        {/* Brand Academy Header */}
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-teal-600 text-white flex items-center justify-center font-black text-sm shadow-md">
            AM
          </div>
          <div>
            <h1 className="font-extrabold text-white text-sm tracking-tight">ADM-MTA</h1>
            <p className="text-[10px] text-slate-500 tracking-wider font-bold">POS SYSTEM</p>
          </div>
        </div>

        {/* Tab Navigation links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.name;

            return (
              <button
                key={tab.name}
                onClick={() => setActiveTab(tab.name)}
                className={`w-full flex items-center gap-3.5 px-4.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/20' 
                    : 'hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-350'}`} />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </nav>

        {/* Action profile footer details with role warnings indicator */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8.5 h-8.5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
                {activeUser.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-black text-white truncate max-w-[120px]">{activeUser.name}</p>
                <p className="text-[9px] text-slate-500">Turno: {activeUser.shift}</p>
              </div>
            </div>

            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
              activeUser.role === 'ADMIN' 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}>
              {activeUser.role}
            </span>
          </div>

          {/* Quick instructions indicator if restricted role */}
          {activeUser.role === 'VENDEDOR' && (
            <div className="bg-amber-950/45 border border-amber-900/80 p-2 rounded text-[10px] text-amber-300 leading-tight">
              ⚠️ Modo Vendedor: Acceso de catálogo limitado. Precios sólo lectura.
            </div>
          )}

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/40 text-rose-400 hover:text-rose-350 font-extrabold text-[10px] uppercase tracking-widest rounded-xl transition duration-155 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Cerrar Sesión
          </button>
        </div>

      </aside>

      {/* Primary Dashboard Layout container area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50">
        
        {/* Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex justify-between items-center shrink-0 z-30">
          <div>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest">{activeTab}</h2>
            <p className="text-[10px] text-slate-400 font-medium">ADM-MTA • POS de Turno</p>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-[11px] font-mono text-slate-400 font-bold bg-slate-50 border border-slate-150 px-2.5 py-1 rounded">
              📆 Sábado, 6 de Junio de 2026
            </span>
          </div>
        </header>

        {/* Tab Subviews Content viewport */}
        <section className="flex-1 overflow-y-auto p-6 relative">
          
          {activeTab === 'Dashboard' && (
            <DashboardView 
              products={products}
              customers={customers}
              ventas={ventas}
              activeUser={activeUser}
              onNavigate={navigateTo}
            />
          )}

          {activeTab === 'Nueva Venta' && (
            <VentaView 
              products={products}
              customers={customers}
              activeUser={activeUser}
              isSessionOpen={session.isOpened}
              onAddVenta={handleAddVenta}
              onOpenSession={handleOpenSession}
            />
          )}

          {activeTab === 'Cuentas por Cobrar' && (
            <CuentasView 
              customers={customers}
              onRegisterPayment={handleRegisterPayment}
            />
          )}

          {activeTab === 'Inventario' && (
            <InventarioView 
              products={products}
              activeUser={activeUser}
              onAddProduct={handleAddProduct}
              onUpdateStock={handleUpdateStock}
              onDeleteProduct={handleDeleteProduct}
              inventoryLogs={inventoryLogs}
            />
          )}

          {activeTab === 'Caja' && (
            <CajaView 
              session={session}
              movements={movements}
              ventas={ventas}
              onOpenSession={handleOpenSession}
              onCloseSession={handleCloseSession}
              onAddMovement={handleAddMovement}
            />
          )}

          {activeTab === 'Clientes' && (
            <ClientesView 
              customers={customers}
              onAddCustomer={handleAddCustomer}
            />
          )}

          {activeTab === 'Reportes' && (
            <ReportesView 
              ventas={ventas}
              customers={customers}
            />
          )}

          {activeTab === 'Configuración' && (
            <ConfiguracionView 
              users={users}
              activeUser={activeUser}
              onAddUser={handleAddUser}
              onDeleteUser={handleDeleteUser}
              onRestoreDefaults={handleRestoreDefaults}
            />
          )}

        </section>

      </main>

    </div>
  );
}
