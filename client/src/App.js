import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './context/AuthContext';
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
import Reservations from './pages/customer/Reservations';
import Chat from './pages/customer/Chat';
import Profile from './pages/customer/Profile';

// Seller Pages
import SellerDashboard from './pages/seller/SellerDashboard';
import Inventory from './pages/seller/Inventory';
import StoreManagement from './pages/seller/StoreManagement';
import Analytics from './pages/seller/Analytics';
import SellerChat from './pages/seller/SellerChat';
import SellerProfile from './pages/seller/SellerProfile';
import SellerOrders from './pages/seller/SellerOrders';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminSellers from './pages/admin/AdminSellers';
import AdminStores from './pages/admin/AdminStores';
import AdminProducts from './pages/admin/AdminProducts';
import AdminOrders from './pages/admin/AdminOrders';

import './App.css';

function App() {
  return (
    <AuthProvider>
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
                      <Route path="reservations" element={<Reservations />} />
                      <Route path="chat" element={<Chat />} />
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
                      <Route path="sellers" element={<AdminSellers />} />
                      <Route path="stores" element={<AdminStores />} />
                      <Route path="products" element={<AdminProducts />} />
                      <Route path="orders" element={<AdminOrders />} />
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
    </AuthProvider>
  );
}

export default App;

