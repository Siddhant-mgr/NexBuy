import React, { useEffect, useState } from 'react';
import { FaChartLine, FaDollarSign, FaShoppingCart, FaUsers } from 'react-icons/fa';
import axios from 'axios';
import './SellerPages.css';

const Analytics = () => {
  const [timeRange, setTimeRange] = useState('month');
  const [stats, setStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    totalCustomers: 0,
    averageOrderValue: 0
  });
  const [statsChange, setStatsChange] = useState({});
  const [recentOrders, setRecentOrders] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadAnalytics = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await axios.get('/api/analytics/seller', {
          params: { range: timeRange }
        });
        if (cancelled) return;
        setStats(res.data.stats || {});
        setStatsChange(res.data.statsChange || {});
        setRecentOrders(res.data.recentOrders || []);
        setTopProducts(res.data.topProducts || []);
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.message || 'Could not load analytics.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadAnalytics();
    const interval = setInterval(loadAnalytics, 20000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [timeRange]);

  const renderChange = (value) => {
    if (value === null || value === undefined) return '—';
    const sign = value > 0 ? '+' : '';
    return `${sign}${value}% from last period`;
  };

  return (
    <div className="analytics-page">
      <div className="page-header">
        <div>
          <h1>Sales & Analytics</h1>
          <p>Track your store performance and sales</p>
        </div>
        <select className="time-range-select" value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
        </select>
      </div>

      <div className="analytics-stats">
        <div className="stat-card-large">
          <div className="stat-icon-large">
            <FaDollarSign />
          </div>
          <div className="stat-info-large">
            <h3>${Number(stats.totalSales || 0).toLocaleString()}</h3>
            <p>Total Sales</p>
            <span className="stat-change positive">
              {loading ? 'Updating...' : renderChange(statsChange.totalSales)}
            </span>
          </div>
        </div>

        <div className="stat-card-large">
          <div className="stat-icon-large">
            <FaShoppingCart />
          </div>
          <div className="stat-info-large">
            <h3>{stats.totalOrders || 0}</h3>
            <p>Total Orders</p>
            <span className="stat-change positive">
              {loading ? 'Updating...' : renderChange(statsChange.totalOrders)}
            </span>
          </div>
        </div>

        <div className="stat-card-large">
          <div className="stat-icon-large">
            <FaUsers />
          </div>
          <div className="stat-info-large">
            <h3>{stats.totalCustomers || 0}</h3>
            <p>Total Customers</p>
            <span className="stat-change positive">
              {loading ? 'Updating...' : renderChange(statsChange.totalCustomers)}
            </span>
          </div>
        </div>

        <div className="stat-card-large">
          <div className="stat-icon-large">
            <FaChartLine />
          </div>
          <div className="stat-info-large">
            <h3>${Number(stats.averageOrderValue || 0).toFixed(2)}</h3>
            <p>Average Order Value</p>
            <span className="stat-change positive">
              {loading ? 'Updating...' : renderChange(statsChange.averageOrderValue)}
            </span>
          </div>
        </div>
      </div>

      <div className="analytics-sections">
        <div className="analytics-card">
          <h2>Recent Orders</h2>
          {error && <div className="seller-inline-message seller-inline-message-error">{error}</div>}
          <div className="orders-table">
            <table>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Product</th>
                  <th>Amount</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan="5">{loading ? 'Loading...' : 'No recent orders.'}</td>
                  </tr>
                ) : (
                  recentOrders.map((order) => (
                    <tr key={order.id}>
                      <td>#{String(order.id).slice(-6)}</td>
                      <td>{order.customer}</td>
                      <td>{order.item?.name || 'Order items'}</td>
                      <td>${Number(order.totalAmount || 0).toFixed(2)}</td>
                      <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="analytics-card">
          <h2>Top Products</h2>
          <div className="top-products">
            {topProducts.length === 0 ? (
              <div className="seller-inline-message">{loading ? 'Loading...' : 'No sales yet.'}</div>
            ) : (
              topProducts.map((product, index) => (
                <div key={product.productId} className="top-product-item">
                  <div className="product-rank">#{index + 1}</div>
                  <div className="product-details">
                    <h4>{product.name}</h4>
                    <p>{product.sales} sales • ${Number(product.revenue || 0).toFixed(2)} revenue</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;

