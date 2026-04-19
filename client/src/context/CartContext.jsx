import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';

const CartContext = createContext();

const readCart = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const writeCart = (key, items) => {
  localStorage.setItem(key, JSON.stringify(items));
};

const mergeItems = (baseItems, extraItems) => {
  const merged = [...baseItems];
  extraItems.forEach((item) => {
    const match = merged.find(
      (existing) => String(existing.id) === String(item.id) && String(existing.storeId) === String(item.storeId)
    );
    if (match) {
      match.quantity += item.quantity;
    } else {
      merged.push({ ...item });
    }
  });
  return merged;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);

  const cartKey = useMemo(() => (user?.id ? `cart_user_${user.id}` : 'cart_guest'), [user?.id]);

  useEffect(() => {
    if (user?.id) {
      const guestItems = readCart('cart_guest');
      const userItems = readCart(cartKey);
      if (guestItems.length) {
        const merged = mergeItems(userItems, guestItems);
        setItems(merged);
        writeCart(cartKey, merged);
        localStorage.removeItem('cart_guest');
      } else {
        setItems(userItems);
      }
    } else {
      setItems(readCart('cart_guest'));
    }
  }, [cartKey, user?.id]);

  useEffect(() => {
    writeCart(cartKey, items);
  }, [cartKey, items]);

  const addItem = (product, quantity = 1, store) => {
    const qty = Math.max(1, Number(quantity) || 1);
    const nextItem = {
      id: product.id,
      name: product.name,
      price: product.price,
      imageUrl: Array.isArray(product.images) && product.images.length ? product.images[0] : '',
      quantity: qty,
      storeId: product.storeId,
      storeName: store?.storeName || store?.name || 'Store'
    };

    setItems((prev) => {
      const existing = prev.find(
        (item) => String(item.id) === String(nextItem.id) && String(item.storeId) === String(nextItem.storeId)
      );
      if (!existing) {
        return [...prev, nextItem];
      }
      return prev.map((item) =>
        String(item.id) === String(nextItem.id) && String(item.storeId) === String(nextItem.storeId)
          ? { ...item, quantity: item.quantity + qty }
          : item
      );
    });
  };

  const updateQuantity = (itemId, storeId, quantity) => {
    const qty = Math.max(1, Number(quantity) || 1);
    setItems((prev) =>
      prev.map((item) =>
        String(item.id) === String(itemId) && String(item.storeId) === String(storeId)
          ? { ...item, quantity: qty }
          : item
      )
    );
  };

  const removeItem = (itemId, storeId) => {
    setItems((prev) =>
      prev.filter((item) =>
        !(String(item.id) === String(itemId) && String(item.storeId) === String(storeId))
      )
    );
  };

  const clearCart = () => setItems([]);

  const value = {
    items,
    addItem,
    updateQuantity,
    removeItem,
    clearCart
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
