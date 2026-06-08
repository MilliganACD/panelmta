/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product, Customer, Venta, CashMovement, CashSession, User, PaymentMethod, CartItem } from './types';
import { supabase } from './supabaseClient';

// Helper to format dates
const getNowString = () => {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
};

// 1. Initial Data Loader from Supabase
export const getStoredData = async () => {
  try {
    // A. Fetch Products
    const { data: dbProducts, error: prodErr } = await supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true });
    if (prodErr) throw prodErr;

    const products: Product[] = (dbProducts || []).map(p => ({
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

    // B. Fetch Customers and their debts
    const { data: dbCustomers, error: custErr } = await supabase
      .from('customers')
      .select(`
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
      `)
      .order('name', { ascending: true });
    if (custErr) throw custErr;

    const customers: Customer[] = (dbCustomers || []).map(c => ({
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

    // C. Fetch Ventas and their items
    const { data: dbVentas, error: ventaErr } = await supabase
      .from('ventas')
      .select(`
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
      `)
      .order('timestamp', { ascending: false });
    if (ventaErr) throw ventaErr;

    const ventas: Venta[] = (dbVentas || []).map(v => ({
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

    // D. Fetch Cash Movements (only current session movements, or all)
    const { data: dbMovements, error: movErr } = await supabase
      .from('cash_movements')
      .select('*')
      .order('timestamp', { ascending: false });
    if (movErr) throw movErr;

    const movements: CashMovement[] = (dbMovements || []).map(m => ({
      id: m.id,
      timestamp: m.timestamp,
      type: m.type as 'INGRESO' | 'EGRESO',
      concept: m.concept,
      category: m.category,
      amount: Number(m.amount)
    }));

    // E. Fetch Active Session
    const { data: dbSessions, error: sessionErr } = await supabase
      .from('cash_sessions')
      .select('*')
      .eq('id', 'active')
      .maybeSingle();
    if (sessionErr) throw sessionErr;

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

    // F. Fetch Active User (Read localstorage caching to keep cajero local to device)
    let activeUser: User | null = null;
    const cachedUser = localStorage.getItem('pos_active_user');
    if (cachedUser) {
      try {
        activeUser = JSON.parse(cachedUser);
      } catch (e) {}
    }

    // Fallback if not cached
    if (!activeUser) {
      const { data: dbUsers } = await supabase.from('users').select('*').limit(1).maybeSingle();
      if (dbUsers) {
        activeUser = {
          id: dbUsers.id,
          name: dbUsers.name,
          role: dbUsers.role as any,
          shift: dbUsers.shift as any,
          avatarUrl: dbUsers.avatar_url || ''
        };
      } else {
        activeUser = {
          id: 'user-1',
          name: 'Admin User',
          role: 'ADMIN',
          shift: 'MAÑANA',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'
        };
      }
    }

    return {
      products,
      customers,
      ventas,
      movements,
      session,
      activeUser
    };
  } catch (err) {
    console.error('Error fetching data from Supabase:', err);
    throw err;
  }
};

// 2. Granite Sync Mutators

// A. Save Venta with transaction semantics (or batch calls)
export const saveVenta = async (
  newVenta: Venta,
  updatedProducts: Product[],
  updatedCustomers: Customer[],
  newMovement?: CashMovement
) => {
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
            date: getNowString().slice(5, 10) // e.g. "06-08"
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
    // Drop all existing debts and insert the updated ones
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
  const { error } = await supabase
    .from('products')
    .update({ stock: newStock })
    .eq('id', productId);
  if (error) throw error;
};

export const deleteProduct = async (productId: string) => {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId);
  if (error) throw error;
};

// D. Customer profile creation
export const saveCustomer = async (customer: Customer) => {
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
  try {
    const todayStr = getNowString();
    
    // Upsert the 'active' session
    const { error: sessErr } = await supabase.from('cash_sessions').upsert({
      id: 'active',
      status: 'ABIERTA',
      opened_at: todayStr,
      closed_at: null,
      initial_amount: amount,
      expected_amount: amount, // starts with initial amount
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
  try {
    const todayStr = getNowString();
    const { error: sessErr } = await supabase
      .from('cash_sessions')
      .update({
        status: 'CERRADA',
        closed_at: todayStr,
        counted_amount: countedAmount,
        is_opened: false,
        notes: notes
      })
      .eq('id', 'active');
    if (sessErr) throw sessErr;

    // In a production POS, we might clear or archive current shift movements.
    // For this app, we will clear cash_movements so the next session starts fresh.
    const { error: delErr } = await supabase.from('cash_movements').delete().neq('id', '');
    if (delErr) throw delErr;
  } catch (err) {
    console.error('Error closing cash session in Supabase:', err);
    throw err;
  }
};

export const saveCashMovement = async (type: 'INGRESO' | 'EGRESO', concept: string, category: string, amount: number, newMovement: CashMovement) => {
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

// 3. System Defaults restoration (Demo database wipe & re-seeding)
export const restoreDefaults = async () => {
  try {
    // Run delete cascades via deleting main records
    await supabase.from('venta_items').delete().neq('venta_id', '');
    await supabase.from('ventas').delete().neq('id', '');
    await supabase.from('customer_debts').delete().neq('id', '');
    await supabase.from('customers').delete().neq('id', '');
    await supabase.from('products').delete().neq('id', '');
    await supabase.from('cash_movements').delete().neq('id', '');
    await supabase.from('cash_sessions').delete().eq('id', 'active');
    await supabase.from('users').delete().neq('id', '');

    // Re-seed Users
    const seedUsers = [
      { id: 'user-1', name: 'Admin User', role: 'ADMIN', shift: 'MAÑANA', avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80' },
      { id: 'user-2', name: 'Vendedor User', role: 'VENDEDOR', shift: 'TARDE', avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80' }
    ];
    await supabase.from('users').insert(seedUsers);

    // Re-seed Products
    const seedProducts = [
      { id: 'prod-1', name: 'Gatorade Cool Blue 500ml', category: 'Bebidas', price: 4.50, cost: 2.20, stock: 24, low_stock_threshold: 5, sku: 'GAT-CB500', image_url: 'https://images.unsplash.com/photo-1571175351749-e8d06f275d85?w=500&auto=format&fit=crop&q=60' },
      { id: 'prod-2', name: 'Quest Protein Bar Choco', category: 'Snacks', price: 12.00, cost: 6.85, stock: 12, low_stock_threshold: 3, sku: 'QS-PB-CHO', image_url: 'https://images.unsplash.com/photo-1622484211148-716598e04141?w=500&auto=format&fit=crop&q=60' },
      { id: 'prod-3', name: 'Agua San Mateo 600ml', category: 'Bebidas', price: 2.50, cost: 1.10, stock: 5, low_stock_threshold: 10, sku: 'ASM-600', image_url: 'https://images.unsplash.com/photo-1608885898957-a599fb16ec18?w=500&auto=format&fit=crop&q=60' },
      { id: 'prod-4', name: 'Galletas Integrales 6pk', category: 'Galletas', price: 3.80, cost: 1.90, stock: 40, low_stock_threshold: 8, sku: 'GAL-INT-6', image_url: 'https://images.unsplash.com/photo-1558961309-dbdf0003ed31?w=500&auto=format&fit=crop&q=60' },
      { id: 'prod-5', name: 'Coca Cola 500ml', category: 'Bebidas', price: 3.50, cost: 1.50, stock: 50, low_stock_threshold: 10, sku: 'CC-500ML', image_url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&auto=format&fit=crop&q=60' },
      { id: 'prod-6', name: 'Oreo Original', category: 'Galletas', price: 2.50, cost: 1.20, stock: 15, low_stock_threshold: 5, sku: 'OREO-1R', image_url: 'https://images.unsplash.com/photo-1558961309-dbdf000efec1?w=500&auto=format&fit=crop&q=60' },
      { id: 'prod-7', name: 'Chizitos Clasicos', category: 'Snacks', price: 1.50, cost: 0.70, stock: 4, low_stock_threshold: 5, sku: 'CHZ-001', image_url: 'https://images.unsplash.com/photo-1599490659213-e2b9527ec087?w=500&auto=format&fit=crop&q=60' },
      { id: 'prod-8', name: 'Sublime Chocolate', category: 'Chocolates', price: 3.00, cost: 1.30, stock: 35, low_stock_threshold: 8, sku: 'SUB-CHO', image_url: 'https://images.unsplash.com/photo-1511381939415-e44015466834?w=500&auto=format&fit=crop&q=60' },
      { id: 'prod-9', name: 'Agua Mineral H2O 500ml', category: 'Bebidas', price: 2.00, cost: 0.85, stock: 142, low_stock_threshold: 15, sku: 'H2O-102', image_url: 'https://images.unsplash.com/photo-1548839130-ad1c2e08c4f8?w=500&auto=format&fit=crop&q=60' },
      { id: 'prod-10', name: 'Isotónica Blue 600ml', category: 'Bebidas', price: 3.25, cost: 1.50, stock: 64, low_stock_threshold: 10, sku: 'ISO-882', image_url: 'https://images.unsplash.com/photo-1548839130-ad1c2e08c4f8?w=500&auto=format&fit=crop&q=60' },
      { id: 'prod-11', name: 'Gomitas Loops Dulces', category: 'Dulces', price: 2.00, cost: 0.90, stock: 55, low_stock_threshold: 10, sku: 'GOMI-L1', image_url: 'https://images.unsplash.com/photo-1581798459219-318e76aeef7b?w=500&auto=format&fit=crop&q=60' }
    ];
    await supabase.from('products').insert(seedProducts);

    // Re-seed Customers
    const seedCustomers = [
      { id: 'cust-1', name: 'Juan Pérez', phone: '987654321', credit_limit: 50.00, current_debt: 25.00, total_purchases: 125 },
      { id: 'cust-2', name: 'Carlos Ramos', phone: '912345678', credit_limit: 50.00, current_debt: 12.00, total_purchases: 62 },
      { id: 'cust-3', name: 'María López', phone: '951357246', credit_limit: 50.00, current_debt: 8.50, total_purchases: 45 },
      { id: 'cust-4', name: 'Roberto Gómez', phone: '999888777', credit_limit: 100.00, current_debt: 0.00, total_purchases: 15 },
      { id: 'cust-5', name: 'Esteban Quispe', phone: '933555222', credit_limit: 40.00, current_debt: 0.00, total_purchases: 32 }
    ];
    await supabase.from('customers').insert(seedCustomers);

    // Re-seed customer debts
    const seedDebts = [
      { id: 'deb-1', customer_id: 'cust-1', date: '06-04', product_name: 'Gatorade Blue Bolt', price: 8.50, quantity: 1 },
      { id: 'deb-2', customer_id: 'cust-1', date: '06-05', product_name: 'Coca Cola 500ml', price: 4.50, quantity: 1 },
      { id: 'deb-3', customer_id: 'cust-1', date: '06-06', product_name: 'Barra Proteica Quest', price: 12.00, quantity: 1 },
      { id: 'deb-4', customer_id: 'cust-2', date: '06-05', product_name: 'Agua San Luis 1L', price: 3.50, quantity: 1 },
      { id: 'deb-5', customer_id: 'cust-2', date: '06-05', product_name: 'Galletones Avena', price: 8.50, quantity: 1 },
      { id: 'deb-6', customer_id: 'cust-3', date: '06-06', product_name: 'Gatorade Tropical', price: 8.50, quantity: 1 }
    ];
    await supabase.from('customer_debts').insert(seedDebts);

    // Re-seed Ventas
    const seedVentas = [
      { id: 'TRX-8921', timestamp: '2026-06-06 14:22', customer_id: 'cust-1', customer_name: 'Juan Pérez', total: 26.50, payment_method: 'EFECTIVO', paid_amount: 26.50, pending_amount: 0, cashier_name: 'Admin User', status: 'COMPLETADA' },
      { id: 'TRX-8920', timestamp: '2026-06-06 14:15', customer_id: 'general', customer_name: 'Venta General', total: 5.00, payment_method: 'YAPE', paid_amount: 5.00, pending_amount: 0, cashier_name: 'Admin User', status: 'COMPLETADA' },
      { id: 'TRX-8919', timestamp: '2026-06-06 14:02', customer_id: 'cust-3', customer_name: 'María López', total: 18.50, payment_method: 'MIXTO', paid_amount: 10.00, pending_amount: 8.50, cashier_name: 'Admin User', status: 'COMPLETADA' },
      { id: 'TRX-8910', timestamp: '2026-06-05 10:15', customer_id: 'cust-2', customer_name: 'Carlos Ramos', total: 24.00, payment_method: 'CREDITO', paid_amount: 0, pending_amount: 24.00, cashier_name: 'Admin User', status: 'COMPLETADA' }
    ];
    await supabase.from('ventas').insert(seedVentas);

    // Re-seed Venta Items
    const seedVentaItems = [
      { venta_id: 'TRX-8921', product_id: 'prod-2', product_name: 'Quest Protein Bar Choco', price: 12.00, quantity: 2 },
      { venta_id: 'TRX-8921', product_id: 'prod-3', product_name: 'Agua San Mateo 600ml', price: 2.50, quantity: 1 },
      { venta_id: 'TRX-8920', product_id: 'prod-3', product_name: 'Agua San Mateo 600ml', price: 2.50, quantity: 2 },
      { venta_id: 'TRX-8919', product_id: 'prod-1', product_name: 'Gatorade Cool Blue 500ml', price: 4.50, quantity: 2 },
      { venta_id: 'TRX-8919', product_id: 'prod-5', product_name: 'Coca Cola 500ml', price: 3.50, quantity: 2 },
      { venta_id: 'TRX-8919', product_id: 'prod-6', product_name: 'Oreo Original', price: 2.50, quantity: 1 },
      { venta_id: 'TRX-8910', product_id: 'prod-2', product_name: 'Quest Protein Bar Choco', price: 12.00, quantity: 2 }
    ];
    await supabase.from('venta_items').insert(seedVentaItems);

    // Re-seed Cash Movements
    const seedMovements = [
      { id: 'mov-1', timestamp: '2026-06-06 08:15', type: 'EGRESO', concept: 'Pago Proveedor Bebidas', category: 'Proveedor', amount: 150.00 },
      { id: 'mov-2', timestamp: '2026-06-06 09:40', type: 'INGRESO', concept: 'Venta Kit Entrenamiento', category: 'Oficina / Merch', amount: 450.00 },
      { id: 'mov-3', timestamp: '2026-06-06 11:10', type: 'EGRESO', concept: 'Reparación Cafetera', category: 'Mantenimiento', amount: 85.00 },
      { id: 'mov-4', timestamp: '2026-06-06 13:05', type: 'INGRESO', concept: 'Venta Suplementos', category: 'Suplementos Extra', amount: 120.00 }
    ];
    await supabase.from('cash_movements').insert(seedMovements);

    // Re-seed Cash Sessions
    const seedSession = {
      id: 'active',
      status: 'ABIERTA',
      opened_at: '2026-06-06 08:00',
      closed_at: null,
      initial_amount: 250.00,
      expected_amount: 2827.50,
      is_opened: true,
      notes: 'Turno de mañana activo.'
    };
    await supabase.from('cash_sessions').insert(seedSession);

    return getStoredData();
  } catch (err) {
    console.error('Error restoring defaults in Supabase:', err);
    throw err;
  }
};
