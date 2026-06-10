/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Category = 'Bebidas' | 'Galletas' | 'Chocolates' | 'Snacks' | 'Dulces' | 'Accesorios';

export interface Product {
  id: string;
  name: string;
  category: Category;
  price: number; // Precio de venta (S/)
  cost: number;  // Costo de compra (S/)
  stock: number;
  lowStockThreshold: number;
  sku: string;
  imageUrl: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface DebtItem {
  id: string;
  date: string;
  productName: string;
  price: number;
  quantity: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  creditLimit: number;
  currentDebt: number;
  totalPurchases: number;
  debts: DebtItem[]; // Historial de fiados
}

export type PaymentMethod = 'EFECTIVO' | 'YAPE' | 'PLIN' | 'CREDITO' | 'MIXTO';

export interface Venta {
  id: string;
  timestamp: string;
  customerName: string;
  customerId: string; // "general" for minor, or customer id
  items: {
    productId: string;
    productName: string;
    price: number;
    quantity: number;
    cost?: number;
    category?: Category;
  }[];
  total: number;
  paymentMethod: PaymentMethod;
  paidAmount: number;
  pendingAmount: number;
  cashierName: string;
  status: 'COMPLETADA' | 'ANULADA';
}

export interface CashMovement {
  id: string;
  timestamp: string;
  type: 'INGRESO' | 'EGRESO';
  concept: string;
  category: string;
  amount: number;
}

export interface CashSession {
  status: 'ABIERTA' | 'CERRADA';
  openedAt: string;
  closedAt?: string;
  initialAmount: number;
  expectedAmount: number;
  countedAmount?: number;
  isOpened: boolean;
  notes?: string;
}

export type UserRole = 'ADMIN' | 'VENDEDOR';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  shift: 'MAÑANA' | 'TARDE';
  username?: string;
  email?: string;
  password?: string;
  avatarUrl: string;
}
