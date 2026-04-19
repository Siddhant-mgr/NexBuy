import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import ProtectedRoute from './components/ProtectedRoute';
import CustomerLayout from './components/Layout/CustomerLayout';
import SellerLayout from './components/Layout/SellerLayout';
import AdminLayout from './components/Layout/AdminLayout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';

// Customer Pages
import Home from './pages/customer/Home';
import CustomerDashboard from './pages/customer/CustomerDashboard';
import DiscoverStores from './pages/customer/DiscoverStores';
import StoreView from './pages/customer/StoreView';
import ProductDetail from './pages/customer/ProductDetail';
import Navigation from './pages/customer/Navigation';
import Reservations from './pages/customer/Reservations';
import Favorites from './pages/customer/Favorites';
import Chat from './pages/customer/Chat';
import Profile from './pages/customer/Profile';
import Cart from './pages/customer/Cart';
import EsewaResult from './pages/customer/EsewaResult';

// Seller Pages
import SellerDashboard from './pages/seller/SellerDashboard';
import Inventory from './pages/seller/Inventory';
import StoreManagement from './pages/seller/StoreManagement';
import Analytics from './pages/seller/Analytics';
import SellerChat from './pages/seller/SellerChat';
import SellerProfile from './pages/seller/SellerProfile';
import SellerOrders from './pages/seller/SellerOrders';
import SellerNotifications from './pages/seller/SellerNotifications';
import SellerKyc from './pages/seller/SellerKyc';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminStores from './pages/admin/AdminStores';
import AdminProducts from './pages/admin/AdminProducts';
import AdminOrders from './pages/admin/AdminOrders';
import AdminKyc from './pages/admin/AdminKyc';
import AdminNotifications from './pages/admin/AdminNotifications';
import AdminProfile from './pages/admin/AdminProfile';

import './App.css';

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <div className="App">
            <Routes>
            {/* Public Routes */}
            <Route path="/landing" element={<Landing />} />
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Customer Routes */}
            <Route
              path="/customer/*"
              element={
                <ProtectedRoute requiredRole="customer">
                  <CustomerLayout>
                    <Routes>
                      <Route path="home" element={<Home />} />
                      <Route path="dashboard" element={<CustomerDashboard />} />
                      <Route path="discover" element={<DiscoverStores />} />
                      <Route path="store/:id" element={<StoreView />} />
                      <Route path="product/:id" element={<ProductDetail />} />
                      <Route path="navigation" element={<Navigation />} />
                      <Route path="payment/esewa/success" element={<EsewaResult />} />
                      <Route path="payment/esewa/failure" element={<EsewaResult />} />
                      <Route path="reservations" element={<Reservations />} />
                      <Route path="favorites" element={<Favorites />} />
                      <Route path="chat" element={<Chat />} />
                      <Route path="cart" element={<Cart />} />
                      <Route path="profile" element={<Profile />} />
                      <Route path="*" element={<Navigate to="/customer/home" replace />} />
                    </Routes>
                  </CustomerLayout>
                </ProtectedRoute>
              }
            />

            {/* Seller Routes */}
            <Route
              path="/seller/*"
              element={
                <ProtectedRoute requiredRole="seller">
                  <SellerLayout>
                    <Routes>
                      <Route path="dashboard" element={<SellerDashboard />} />
                      <Route path="inventory" element={<Inventory />} />
                      <Route path="store" element={<StoreManagement />} />
                      <Route path="analytics" element={<Analytics />} />
                      <Route path="orders" element={<SellerOrders />} />
                      <Route path="chat" element={<SellerChat />} />
                      <Route path="profile" element={<SellerProfile />} />
                      <Route path="kyc" element={<SellerKyc />} />
                      <Route path="notifications" element={<SellerNotifications />} />
                      <Route path="*" element={<Navigate to="/seller/dashboard" replace />} />
                    </Routes>
                  </SellerLayout>
                </ProtectedRoute>
              }
            />

            {/* Admin Routes */}
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminLayout>
                    <Routes>
                      <Route path="dashboard" element={<AdminDashboard />} />
                      <Route path="users" element={<AdminUsers />} />
                      <Route path="kyc" element={<AdminKyc />} />
                      <Route path="stores" element={<AdminStores />} />
                      <Route path="products" element={<AdminProducts />} />
                      <Route path="orders" element={<AdminOrders />} />
                      <Route path="profile" element={<AdminProfile />} />
                      <Route path="notifications" element={<AdminNotifications />} />
                      <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
                    </Routes>
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            </Routes>
            <ToastContainer />
          </div>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;

