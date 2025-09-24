import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { toast } from '@/hooks/use-toast';

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  sku: string;
  description?: string;
  image?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Sale {
  id: string;
  items: CartItem[];
  total: number;
  date: Date;
  paymentMethod: 'cash' | 'card';
}

interface POSState {
  products: Product[];
  cart: CartItem[];
  sales: Sale[];
}

type POSAction =
  | { type: 'ADD_PRODUCT'; product: Product }
  | { type: 'UPDATE_PRODUCT'; id: string; product: Partial<Product> }
  | { type: 'DELETE_PRODUCT'; id: string }
  | { type: 'ADD_TO_CART'; product: Product; quantity: number }
  | { type: 'UPDATE_CART_ITEM'; productId: string; quantity: number }
  | { type: 'REMOVE_FROM_CART'; productId: string }
  | { type: 'CLEAR_CART' }
  | { type: 'COMPLETE_SALE'; paymentMethod: 'cash' | 'card' };

// Sample seed data
const initialProducts: Product[] = [
  {
    id: '1',
    name: 'Premium Coffee Beans',
    price: 24.99,
    stock: 50,
    category: 'Beverages',
    sku: 'BEV-001',
    description: 'High-quality arabica coffee beans'
  },
  {
    id: '2',
    name: 'Organic Green Tea',
    price: 15.99,
    stock: 30,
    category: 'Beverages',
    sku: 'BEV-002',
    description: 'Premium organic green tea leaves'
  },
  {
    id: '3',
    name: 'Chocolate Croissant',
    price: 4.50,
    stock: 15,
    category: 'Bakery',
    sku: 'BAK-001',
    description: 'Fresh baked chocolate croissant'
  },
  {
    id: '4',
    name: 'Blueberry Muffin',
    price: 3.75,
    stock: 8,
    category: 'Bakery',
    sku: 'BAK-002',
    description: 'Homemade blueberry muffin'
  },
  {
    id: '5',
    name: 'Caesar Salad',
    price: 12.99,
    stock: 20,
    category: 'Food',
    sku: 'FOO-001',
    description: 'Fresh caesar salad with parmesan'
  }
];

const initialState: POSState = {
  products: initialProducts,
  cart: [],
  sales: []
};

const posReducer = (state: POSState, action: POSAction): POSState => {
  switch (action.type) {
    case 'ADD_PRODUCT':
      return {
        ...state,
        products: [...state.products, action.product]
      };

    case 'UPDATE_PRODUCT':
      return {
        ...state,
        products: state.products.map(p =>
          p.id === action.id ? { ...p, ...action.product } : p
        )
      };

    case 'DELETE_PRODUCT':
      return {
        ...state,
        products: state.products.filter(p => p.id !== action.id)
      };

    case 'ADD_TO_CART': {
      const existingItem = state.cart.find(item => item.product.id === action.product.id);
      
      if (existingItem) {
        const newQuantity = existingItem.quantity + action.quantity;
        if (newQuantity > action.product.stock) {
          toast({
            title: "Insufficient Stock",
            description: `Only ${action.product.stock} items available`,
            variant: "destructive"
          });
          return state;
        }
        
        return {
          ...state,
          cart: state.cart.map(item =>
            item.product.id === action.product.id
              ? { ...item, quantity: newQuantity }
              : item
          )
        };
      } else {
        if (action.quantity > action.product.stock) {
          toast({
            title: "Insufficient Stock",
            description: `Only ${action.product.stock} items available`,
            variant: "destructive"
          });
          return state;
        }
        
        return {
          ...state,
          cart: [...state.cart, { product: action.product, quantity: action.quantity }]
        };
      }
    }

    case 'UPDATE_CART_ITEM': {
      if (action.quantity <= 0) {
        return {
          ...state,
          cart: state.cart.filter(item => item.product.id !== action.productId)
        };
      }
      
      const product = state.products.find(p => p.id === action.productId);
      if (product && action.quantity > product.stock) {
        toast({
          title: "Insufficient Stock",
          description: `Only ${product.stock} items available`,
          variant: "destructive"
        });
        return state;
      }
      
      return {
        ...state,
        cart: state.cart.map(item =>
          item.product.id === action.productId
            ? { ...item, quantity: action.quantity }
            : item
        )
      };
    }

    case 'REMOVE_FROM_CART':
      return {
        ...state,
        cart: state.cart.filter(item => item.product.id !== action.productId)
      };

    case 'CLEAR_CART':
      return {
        ...state,
        cart: []
      };

    case 'COMPLETE_SALE': {
      const total = state.cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
      const sale: Sale = {
        id: Date.now().toString(),
        items: [...state.cart],
        total,
        date: new Date(),
        paymentMethod: action.paymentMethod
      };

      // Update stock levels
      const updatedProducts = state.products.map(product => {
        const cartItem = state.cart.find(item => item.product.id === product.id);
        if (cartItem) {
          return { ...product, stock: product.stock - cartItem.quantity };
        }
        return product;
      });

      return {
        ...state,
        products: updatedProducts,
        cart: [],
        sales: [...state.sales, sale]
      };
    }

    default:
      return state;
  }
};

interface POSContextType {
  state: POSState;
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  addToCart: (product: Product, quantity: number) => void;
  updateCartItem: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  completeSale: (paymentMethod: 'cash' | 'card') => void;
}

const POSContext = createContext<POSContextType | undefined>(undefined);

export const POSProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(posReducer, initialState);

  const addProduct = (product: Omit<Product, 'id'>) => {
    const newProduct: Product = {
      ...product,
      id: Date.now().toString()
    };
    dispatch({ type: 'ADD_PRODUCT', product: newProduct });
  };

  const updateProduct = (id: string, product: Partial<Product>) => {
    dispatch({ type: 'UPDATE_PRODUCT', id, product });
  };

  const deleteProduct = (id: string) => {
    dispatch({ type: 'DELETE_PRODUCT', id });
  };

  const addToCart = (product: Product, quantity: number = 1) => {
    dispatch({ type: 'ADD_TO_CART', product, quantity });
  };

  const updateCartItem = (productId: string, quantity: number) => {
    dispatch({ type: 'UPDATE_CART_ITEM', productId, quantity });
  };

  const removeFromCart = (productId: string) => {
    dispatch({ type: 'REMOVE_FROM_CART', productId });
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

  const completeSale = (paymentMethod: 'cash' | 'card') => {
    dispatch({ type: 'COMPLETE_SALE', paymentMethod });
    toast({
      title: "Sale Completed",
      description: "Transaction has been processed successfully",
      variant: "default"
    });
  };

  const contextValue: POSContextType = {
    state,
    addProduct,
    updateProduct,
    deleteProduct,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    completeSale
  };

  return (
    <POSContext.Provider value={contextValue}>
      {children}
    </POSContext.Provider>
  );
};

export const usePOS = () => {
  const context = useContext(POSContext);
  if (!context) {
    throw new Error('usePOS must be used within a POSProvider');
  }
  return context;
};