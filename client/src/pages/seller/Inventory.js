import React, { useEffect, useMemo, useState } from 'react';
import { FaPlus, FaEdit, FaTrash, FaSearch } from 'react-icons/fa';
import axios from 'axios';
import './SellerPages.css';

const Inventory = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState({ name: '', category: 'Electronics', price: '', quantity: '', description: '' });
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [imageUploading, setImageUploading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const storeRes = await axios.get('/api/stores/mine');
      setStore(storeRes.data.store);

      const productsRes = await axios.get(`/api/stores/${storeRes.data.store._id}/products/all`);
      setProducts(productsRes.data.products || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Could not load inventory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!imageFile || !imagePreview) return undefined;
    const previewUrl = imagePreview;
    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [imageFile, imagePreview]);

  const filteredProducts = useMemo(() => {
    return (products || []).filter((product) =>
      (product.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);


  const openAdd = () => {
    setEditingProduct(null);
    setForm({ name: '', category: 'Electronics', price: '', quantity: '', description: '' });
    setImageFile(null);
    setImageUrl('');
    setImagePreview('');
    setShowAddModal(true);
  };

  const openEdit = (product) => {
    setEditingProduct(product);
    const firstImageUrl = Array.isArray(product.images) && product.images.length ? product.images[0] : '';
    setForm({
      name: product.name || '',
      category: product.category || 'Electronics',
      price: product.price ?? '',
      quantity: product.quantity ?? '',
      description: product.description || ''
    });
    setImageFile(null);
    setImageUrl(firstImageUrl || '');
    setImagePreview(firstImageUrl || '');
    setShowAddModal(true);
  };

  const uploadImage = async (file) => {
    const data = new FormData();
    data.append('image', file);
    const res = await axios.post('/api/uploads', data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data.url;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!store?._id) return;

    let finalImageUrl = imageUrl;

    if (imageFile) {
      setImageUploading(true);
      try {
        finalImageUrl = await uploadImage(imageFile);
      } catch (err) {
        setImageUploading(false);
        setError(err.response?.data?.message || 'Image upload failed.');
        return;
      }
    }

    const payload = {
      name: form.name,
      category: form.category,
      price: Number(form.price),
      quantity: Number(form.quantity),
      description: form.description,
      images: finalImageUrl ? [finalImageUrl] : []
    };

    try {
      if (editingProduct?.id) {
        await axios.put(`/api/products/${editingProduct.id}`, payload);
      } else {
        await axios.post(`/api/stores/${store._id}/products`, payload);
      }
      setShowAddModal(false);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save product.');
    } finally {
      setImageUploading(false);
    }
  };

  const remove = async (product) => {
    if (!window.confirm(`Delete "${product.name}"?`)) return;
    try {
      await axios.delete(`/api/products/${product.id}`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete product.');
    }
  };

  return (
    <div className="inventory-page">
      <div className="page-header">
        <div>
          <h1>Inventory Management</h1>
          <p>Manage your product stock and availability</p>
        </div>
        <button className="btn-primary" onClick={openAdd}>
          <FaPlus /> Add Product
        </button>
      </div>

      {error && (
        <div className="no-results">
          <p>{error}</p>
        </div>
      )}

      <div className="inventory-toolbar">
        <div className="search-bar">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select className="filter-select">
          <option>All Categories</option>
          <option>Electronics</option>
          <option>Accessories</option>
        </select>
      </div>

      <div className="inventory-table-container">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Image</th>
              <th>Product Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Quantity</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6">Loading...</td>
              </tr>
            ) : filteredProducts.map((product) => {
              const imageUrl = Array.isArray(product.images) && product.images.length ? product.images[0] : '';
              return (
                <tr key={product.id}>
                  <td>
                    {imageUrl ? (
                      <img className="inventory-thumb" src={imageUrl} alt={product.name} loading="lazy" />
                    ) : (
                      <div className="inventory-thumb placeholder" />
                    )}
                  </td>
                  <td>{product.name}</td>
                  <td>{product.category}</td>
                  <td>${product.price}</td>
                  <td>{product.quantity}</td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-edit" title="Edit" onClick={() => openEdit(product)}>
                        <FaEdit />
                      </button>
                      <button className="btn-delete" title="Delete" onClick={() => remove(product)}>
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
            <form onSubmit={submit}>
              <div className="form-group">
                <label>Product Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select
                  required
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                >
                  <option>Electronics</option>
                  <option>Accessories</option>
                </select>
              </div>
              <div className="form-group">
                <label>Price</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Quantity</label>
                <input
                  type="number"
                  required
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  rows="3"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                ></textarea>
              </div>
              <div className="form-group">
                <label>Product Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files && e.target.files[0];
                    if (!file) return;
                    setImageFile(file);
                    setImageUrl('');
                    setImagePreview(URL.createObjectURL(file));
                  }}
                />
                {imagePreview ? (
                  <div className="image-preview">
                    <img src={imagePreview} alt="Preview" />
                  </div>
                ) : null}
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={imageUploading}>
                  {imageUploading ? 'Uploading...' : editingProduct ? 'Save' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;

