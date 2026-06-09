/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product, Customer, Venta, CashMovement, CashSession, User, PaymentMethod, CartItem } from './types';
import { supabase, isSupabaseConfigured } from './supabaseClient';

// Helper to format dates
const getNowString = () => {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
};

// --- LOCAL STORAGE FALLBACK DATA & SEED ---
const DEFAULT_PRODUCTS: Product[] = [];
const DEFAULT_CUSTOMERS: Customer[] = [];
const DEFAULT_VENTAS: Venta[] = [];
const DEFAULT_MOVEMENTS: CashMovement[] = [];

const DEFAULT_SESSION: CashSession = {
  status: 'CERRADA',
  openedAt: '',
  initialAmount: 0.00,
  expectedAmount: 0.00,
  isOpened: false
};

const DEFAULT_CASHIER: User = {
  id: 'user-1',
  name: 'Admin MTA',
  role: 'ADMIN',
  shift: 'MAÑANA',
  username: 'AdminMTA',
  email: 'miligantennisacademy@gmail.com',
  password: 'b65efa4c5b68758fcb1bfd441dc24b337aa786852fc88d03fa00015540bc4326',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'
};

const DEFAULT_USERS_LIST: User[] = [
  DEFAULT_CASHIER,
  {
    id: 'user-2',
    name: 'Vendedor MTA',
    role: 'VENDEDOR',
    shift: 'TARDE',
    username: 'vendedor',
    password: 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80'
  }
];

// Helper to save to localStorage in demo mode
const saveLocalData = (data: {
  products: Product[];
  customers: Customer[];
  ventas: Venta[];
  movements: CashMovement[];
  session: CashSession;
  users?: User[];
}) => {
  localStorage.setItem('pos_products', JSON.stringify(data.products));
  localStorage.setItem('pos_customers', JSON.stringify(data.customers));
  localStorage.setItem('pos_ventas', JSON.stringify(data.ventas));
  localStorage.setItem('pos_movements', JSON.stringify(data.movements));
  localStorage.setItem('pos_session', JSON.stringify(data.session));
  if (data.users) {
    localStorage.setItem('pos_users', JSON.stringify(data.users));
  }
};

const getLocalData = () => {
  const products = localStorage.getItem('pos_products');
  const customers = localStorage.getItem('pos_customers');
  const ventas = localStorage.getItem('pos_ventas');
  const movements = localStorage.getItem('pos_movements');
  const session = localStorage.getItem('pos_session');
  const users = localStorage.getItem('pos_users');

  return {
    products: products ? JSON.parse(products) : DEFAULT_PRODUCTS,
    customers: customers ? JSON.parse(customers) : DEFAULT_CUSTOMERS,
    ventas: ventas ? JSON.parse(ventas) : DEFAULT_VENTAS,
    movements: movements ? JSON.parse(movements) : DEFAULT_MOVEMENTS,
    session: session ? JSON.parse(session) : DEFAULT_SESSION,
    users: users ? JSON.parse(users) : DEFAULT_USERS_LIST,
    activeUser: DEFAULT_CASHIER
  };
};

// --- EXPORTED ROUTINES ---

// Helper to enforce timeout on requests
const timeout = (ms: number) => new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms));

// 1. Initial Data Loader
export const getStoredData = async () => {
  // FALLBACK: Local Storage
  if (!isSupabaseConfigured || !supabase) {
    return getLocalData();
  }

  try {
    // Run all database fetches in parallel with a 5 second timeout limit
    const [
      prodRes,
      custRes,
      ventasRes,
      movRes,
      sessionRes,
      usersRes
    ] = await Promise.race([
      Promise.all([
        supabase.from('products').select('*').order('name', { ascending: true }),
        supabase.from('customers').select(`
          id,
          name,
          phone,
          credit_limit,
          current_debt,
          total_purchases,
          customer_debts (
            id,
            date,
            product_name,
            price,
            quantity
          )
        `).order('name', { ascending: true }),
        supabase.from('ventas').select(`
          id,
          timestamp,
          customer_id,
          customer_name,
          total,
          payment_method,
          paid_amount,
          pending_amount,
          cashier_name,
          status,
          venta_items (
            product_id,
            product_name,
            price,
            quantity
          )
        `).order('timestamp', { ascending: false }),
        supabase.from('cash_movements').select('*').order('timestamp', { ascending: false }),
        supabase.from('cash_sessions').select('*').eq('id', 'active').maybeSingle(),
        supabase.from('users').select('*')
      ]),
      timeout(5000)
    ]);

    if (prodRes.error) throw prodRes.error;
    if (custRes.error) throw custRes.error;
    if (ventasRes.error) throw ventasRes.error;
    if (movRes.error) throw movRes.error;
    if (sessionRes.error) throw sessionRes.error;
    if (usersRes.error) throw usersRes.error;

    const dbProducts = prodRes.data || [];
    const dbCustomers = custRes.data || [];
    const dbVentas = ventasRes.data || [];
    const dbMovements = movRes.data || [];
    const dbSessions = sessionRes.data;
    const dbUsers = usersRes.data || [];

    const products: Product[] = dbProducts.map(p => ({
      id: p.id,
      name: p.name,
      category: p.category as any,
      price: Number(p.price),
      cost: Number(p.cost),
      stock: p.stock,
      lowStockThreshold: p.low_stock_threshold,
      sku: p.sku,
      imageUrl: p.image_url || ''
    }));

    const customers: Customer[] = dbCustomers.map(c => ({
      id: c.id,
      name: c.name,
      phone: c.phone || '',
      creditLimit: Number(c.credit_limit),
      currentDebt: Number(c.current_debt),
      totalPurchases: c.total_purchases,
      debts: (c.customer_debts || []).map((d: any) => ({
        id: d.id,
        date: d.date,
        productName: d.product_name,
        price: Number(d.price),
        quantity: d.quantity
      }))
    }));

    const ventas: Venta[] = dbVentas.map(v => ({
      id: v.id,
      timestamp: v.timestamp,
      customerId: v.customer_id,
      customerName: v.customer_name,
      total: Number(v.total),
      paymentMethod: v.payment_method as PaymentMethod,
      paidAmount: Number(v.paid_amount),
      pendingAmount: Number(v.pending_amount),
      cashierName: v.cashier_name,
      status: v.status as 'COMPLETADA' | 'ANULADA',
      items: (v.venta_items || []).map((item: any) => ({
        productId: item.product_id,
        productName: item.product_name,
        price: Number(item.price),
        quantity: item.quantity
      }))
    }));

    const movements: CashMovement[] = dbMovements.map(m => ({
      id: m.id,
      timestamp: m.timestamp,
      type: m.type as 'INGRESO' | 'EGRESO',
      concept: m.concept,
      category: m.category,
      amount: Number(m.amount)
    }));

    let session: CashSession = {
      status: 'CERRADA',
      openedAt: '',
      isOpened: false,
      initialAmount: 0,
      expectedAmount: 0
    };

    if (dbSessions) {
      session = {
        status: dbSessions.status as 'ABIERTA' | 'CERRADA',
        openedAt: dbSessions.opened_at,
        closedAt: dbSessions.closed_at || undefined,
        initialAmount: Number(dbSessions.initial_amount),
        expectedAmount: Number(dbSessions.expected_amount),
        countedAmount: dbSessions.counted_amount !== null ? Number(dbSessions.counted_amount) : undefined,
        isOpened: dbSessions.is_opened,
        notes: dbSessions.notes || undefined
      };
    }

    const users: User[] = dbUsers.map(u => ({
      id: u.id,
      name: u.name,
      role: u.role as any,
      shift: u.shift as any,
      username: u.username,
      email: u.email || '',
      password: u.password,
      avatarUrl: u.avatar_url || ''
    }));

    // G. Fetch Active User from local cache
    let activeUser: User | null = null;
    const cachedUser = localStorage.getItem('pos_active_user');
    if (cachedUser) {
      try {
        activeUser = JSON.parse(cachedUser);
        // Sync attributes with database user list
        const dbMatched = users.find(u => u.id === activeUser?.id);
        if (dbMatched) {
          activeUser = dbMatched;
        }
      } catch (e) {}
    }

    if (!activeUser) {
      activeUser = users.find(u => u.role === 'ADMIN') || users[0] || DEFAULT_CASHIER;
    }

    return {
      products,
      customers,
      ventas,
      movements,
      session,
      users,
      activeUser
    };
  } catch (err) {
    console.error('Error fetching data from Supabase, reverting to Local:', err);
    return getLocalData();
  }
};

// 2. Granite Sync Mutators

// A. Save Venta
export const saveVenta = async (
  newVenta: Venta,
  updatedProducts: Product[],
  updatedCustomers: Customer[],
  newMovement?: CashMovement
) => {
  // FALLBACK
  if (!isSupabaseConfigured || !supabase) {
    const current = getLocalData();
    saveLocalData({
      products: updatedProducts,
      customers: updatedCustomers,
      ventas: [newVenta, ...current.ventas],
      movements: newMovement ? [newMovement, ...current.movements] : current.movements,
      session: current.session,
      users: current.users
    });
    return;
  }

  try {
    // 1. Insert into ventas
    const { error: saleErr } = await supabase.from('ventas').insert({
      id: newVenta.id,
      timestamp: newVenta.timestamp,
      customer_id: newVenta.customerId,
      customer_name: newVenta.customerName,
      total: newVenta.total,
      payment_method: newVenta.paymentMethod,
      paid_amount: newVenta.paidAmount,
      pending_amount: newVenta.pendingAmount,
      cashier_name: newVenta.cashierName,
      status: newVenta.status
    });
    if (saleErr) throw saleErr;

    // 2. Insert items
    const dbItems = newVenta.items.map(item => ({
      venta_id: newVenta.id,
      product_id: item.productId,
      product_name: item.productName,
      price: item.price,
      quantity: item.quantity
    }));
    const { error: itemsErr } = await supabase.from('venta_items').insert(dbItems);
    if (itemsErr) throw itemsErr;

    // 3. Update stock for sold products
    for (const item of newVenta.items) {
      const prod = updatedProducts.find(p => p.id === item.productId);
      if (prod) {
        await supabase
          .from('products')
          .update({ stock: prod.stock })
          .eq('id', prod.id);
      }
    }

    // 4. Update customer debt/totals & insert customer_debts if fiado
    if (newVenta.customerId !== 'general') {
      const cust = updatedCustomers.find(c => c.id === newVenta.customerId);
      if (cust) {
        // Update customer general details
        const { error: custErr } = await supabase
          .from('customers')
          .update({
            current_debt: cust.currentDebt,
            total_purchases: cust.totalPurchases
          })
          .eq('id', cust.id);
        if (custErr) throw custErr;

        // If credit or mixed, register individual debts
        if (newVenta.paymentMethod === 'CREDITO' || newVenta.paymentMethod === 'MIXTO') {
          const newDebts = newVenta.items.map((item, idx) => ({
            id: `debt-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
            customer_id: newVenta.customerId,
            product_name: item.productName,
            price: item.price * item.quantity,
            quantity: item.quantity,
            date: getNowString().slice(5, 10)
          }));

          const { error: debtErr } = await supabase.from('customer_debts').insert(newDebts);
          if (debtErr) throw debtErr;
        }
      }
    }

    // 5. Insert cash movement if cash was transacted
    if (newMovement) {
      await supabase.from('cash_movements').insert({
        id: newMovement.id,
        timestamp: newMovement.timestamp,
        type: newMovement.type,
        concept: newMovement.concept,
        category: newMovement.category,
        amount: newMovement.amount
      });
    }
  } catch (err) {
    console.error('Error saving sale in Supabase:', err);
    throw err;
  }
};

// B. Customer payment register
export const registerCustomerPayment = async (
  customerId: string,
  amountPaid: number,
  updatedCustomers: Customer[],
  newMovement: CashMovement
) => {
  // FALLBACK
  if (!isSupabaseConfigured || !supabase) {
    const current = getLocalData();
    saveLocalData({
      products: current.products,
      customers: updatedCustomers,
      ventas: current.ventas,
      movements: [newMovement, ...current.movements],
      session: current.session,
      users: current.users
    });
    return;
  }

  try {
    const cust = updatedCustomers.find(c => c.id === customerId);
    if (!cust) return;

    // Update customer debt on Supabase
    const { error: custErr } = await supabase
      .from('customers')
      .update({ current_debt: cust.currentDebt })
      .eq('id', customerId);
    if (custErr) throw custErr;

    // Update customer debts collection on Supabase:
    const { error: delErr } = await supabase
      .from('customer_debts')
      .delete()
      .eq('customer_id', customerId);
    if (delErr) throw delErr;

    if (cust.debts.length > 0) {
      const dbDebts = cust.debts.map(d => ({
        id: d.id,
        customer_id: customerId,
        date: d.date,
        product_name: d.productName,
        price: d.price,
        quantity: d.quantity
      }));
      const { error: insErr } = await supabase.from('customer_debts').insert(dbDebts);
      if (insErr) throw insErr;
    }

    // Insert Cash Movement
    await supabase.from('cash_movements').insert({
      id: newMovement.id,
      timestamp: newMovement.timestamp,
      type: newMovement.type,
      concept: newMovement.concept,
      category: newMovement.category,
      amount: newMovement.amount
    });
  } catch (err) {
    console.error('Error registering customer payment in Supabase:', err);
    throw err;
  }
};

// C. Product manipulation
export const saveProduct = async (product: Product) => {
  // FALLBACK
  if (!isSupabaseConfigured || !supabase) {
    const current = getLocalData();
    saveLocalData({
      ...current,
      products: [product, ...current.products]
    });
    return;
  }

  const { error } = await supabase.from('products').insert({
    id: product.id,
    name: product.name,
    category: product.category,
    price: product.price,
    cost: product.cost,
    stock: product.stock,
    low_stock_threshold: product.lowStockThreshold,
    sku: product.sku,
    image_url: product.imageUrl
  });
  if (error) throw error;
};

export const updateProductStock = async (productId: string, newStock: number) => {
  // FALLBACK
  if (!isSupabaseConfigured || !supabase) {
    const current = getLocalData();
    const updated = current.products.map(p => p.id === productId ? { ...p, stock: newStock } : p);
    saveLocalData({
      ...current,
      products: updated
    });
    return;
  }

  const { error } = await supabase
    .from('products')
    .update({ stock: newStock })
    .eq('id', productId);
  if (error) throw error;
};

export const deleteProduct = async (productId: string) => {
  // FALLBACK
  if (!isSupabaseConfigured || !supabase) {
    const current = getLocalData();
    const updated = current.products.filter(p => p.id !== productId);
    saveLocalData({
      ...current,
      products: updated
    });
    return;
  }

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId);
  if (error) throw error;
};

// D. Customer profile creation
export const saveCustomer = async (customer: Customer) => {
  // FALLBACK
  if (!isSupabaseConfigured || !supabase) {
    const current = getLocalData();
    saveLocalData({
      ...current,
      customers: [customer, ...current.customers]
    });
    return;
  }

  const { error } = await supabase.from('customers').insert({
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    credit_limit: customer.creditLimit,
    current_debt: customer.currentDebt,
    total_purchases: customer.totalPurchases
  });
  if (error) throw error;
};

// E. Sessions and cash movements
export const openCashSession = async (amount: number, newMovement: CashMovement) => {
  const todayStr = getNowString();
  const updatedSession: CashSession = {
    isOpened: true,
    status: 'ABIERTA',
    initialAmount: amount,
    expectedAmount: amount,
    openedAt: todayStr
  };

  // FALLBACK
  if (!isSupabaseConfigured || !supabase) {
    const current = getLocalData();
    saveLocalData({
      ...current,
      session: updatedSession,
      movements: [newMovement, ...current.movements]
    });
    return;
  }

  try {
    const { error: sessErr } = await supabase.from('cash_sessions').upsert({
      id: 'active',
      status: 'ABIERTA',
      opened_at: todayStr,
      closed_at: null,
      initial_amount: amount,
      expected_amount: amount,
      is_opened: true,
      notes: 'Turno abierto'
    });
    if (sessErr) throw sessErr;

    // Register movement
    const { error: movErr } = await supabase.from('cash_movements').insert({
      id: newMovement.id,
      timestamp: newMovement.timestamp,
      type: newMovement.type,
      concept: newMovement.concept,
      category: newMovement.category,
      amount: newMovement.amount
    });
    if (movErr) throw movErr;
  } catch (err) {
    console.error('Error opening cash session in Supabase:', err);
    throw err;
  }
};

export const closeCashSession = async (countedAmount: number, notes: string) => {
  const updatedSession: CashSession = {
    isOpened: false,
    status: 'CERRADA',
    initialAmount: 0,
    expectedAmount: 0,
    openedAt: '',
    closedAt: getNowString(),
    notes,
    countedAmount
  };

  // FALLBACK
  if (!isSupabaseConfigured || !supabase) {
    const current = getLocalData();
    saveLocalData({
      ...current,
      session: updatedSession,
      movements: [] // clear active shift movements
    });
    return;
  }

  try {
    const { error: sessErr } = await supabase
      .from('cash_sessions')
      .update({
        status: 'CERRADA',
        closed_at: updatedSession.closedAt,
        counted_amount: countedAmount,
        is_opened: false,
        notes: notes
      })
      .eq('id', 'active');
    if (sessErr) throw sessErr;

    // Clear shift movements for next session
    const { error: delErr } = await supabase.from('cash_movements').delete().neq('id', '');
    if (delErr) throw delErr;
  } catch (err) {
    console.error('Error closing cash session in Supabase:', err);
    throw err;
  }
};

export const saveCashMovement = async (type: 'INGRESO' | 'EGRESO', concept: string, category: string, amount: number, newMovement: CashMovement) => {
  // FALLBACK
  if (!isSupabaseConfigured || !supabase) {
    const current = getLocalData();
    saveLocalData({
      ...current,
      movements: [newMovement, ...current.movements]
    });
    return;
  }

  const { error } = await supabase.from('cash_movements').insert({
    id: newMovement.id,
    timestamp: newMovement.timestamp,
    type,
    concept,
    category,
    amount
  });
  if (error) throw error;
};

// F. Operator User manipulation (Fase 5 Additions)
export const saveUser = async (user: User) => {
  // FALLBACK
  if (!isSupabaseConfigured || !supabase) {
    const current = getLocalData();
    const existing = current.users.find(u => u.id === user.id);
    let updated: User[];
    if (existing) {
      updated = current.users.map(u => u.id === user.id ? user : u);
    } else {
      updated = [user, ...current.users];
    }
    saveLocalData({
      ...current,
      users: updated
    });
    return;
  }

  const { error } = await supabase.from('users').upsert({
    id: user.id,
    name: user.name,
    role: user.role,
    shift: user.shift,
    username: user.username,
    email: user.email,
    password: user.password,
    avatar_url: user.avatarUrl
  });
  if (error) throw error;
};

export const deleteUser = async (userId: string) => {
  // FALLBACK
  if (!isSupabaseConfigured || !supabase) {
    const current = getLocalData();
    const updated = current.users.filter(u => u.id !== userId);
    saveLocalData({
      ...current,
      users: updated
    });
    return;
  }

  const { error } = await supabase.from('users').delete().eq('id', userId);
  if (error) throw error;
};

// 3. System Defaults restoration
export const restoreDefaults = async () => {
  // FALLBACK
  if (!isSupabaseConfigured || !supabase) {
    localStorage.removeItem('pos_products');
    localStorage.removeItem('pos_customers');
    localStorage.removeItem('pos_ventas');
    localStorage.removeItem('pos_movements');
    localStorage.removeItem('pos_session');
    localStorage.removeItem('pos_users');
    return getLocalData();
  }

  try {
    await supabase.from('venta_items').delete().neq('venta_id', '');
    await supabase.from('ventas').delete().neq('id', '');
    await supabase.from('customer_debts').delete().neq('id', '');
    await supabase.from('customers').delete().neq('id', '');
    await supabase.from('products').delete().neq('id', '');
    await supabase.from('cash_movements').delete().neq('id', '');
    await supabase.from('cash_sessions').delete().eq('id', 'active');
    await supabase.from('users').delete().neq('id', '');

    const seedUsers = [
      { id: 'user-1', name: 'Admin MTA', role: 'ADMIN', shift: 'MAÑANA', username: 'AdminMTA', email: 'miligantennisacademy@gmail.com', password: 'b65efa4c5b68758fcb1bfd441dc24b337aa786852fc88d03fa00015540bc4326', avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80' }
    ];
    await supabase.from('users').insert(seedUsers);

    await supabase.from('cash_sessions').insert({
      id: 'active',
      status: 'CERRADA',
      opened_at: '',
      closed_at: null,
      initial_amount: 0.00,
      expected_amount: 0.00,
      is_opened: false,
      notes: 'Sesión inicial cerrada.'
    });

    return getStoredData();
  } catch (err) {
    console.error('Error restoring defaults in Supabase:', err);
    throw err;
  }
};
