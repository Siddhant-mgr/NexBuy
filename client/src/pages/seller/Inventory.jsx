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
  const [form, setForm] = useState({
    name: '',
    category: 'Electronics',
    price: '',
    quantity: '',
    description: '',
    sku: '',
    brand: '',
    unit: '',
    origin: '',
    expiryDate: '',
    ingredients: '',
    nutrition: '',
    details: []
  });
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
    setForm({
      name: '',
      category: 'Electronics',
      price: '',
      quantity: '',
      description: '',
      sku: '',
      brand: '',
      unit: '',
      origin: '',
      expiryDate: '',
      ingredients: '',
      nutrition: '',
      details: []
    });
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
      description: product.description || '',
      sku: product.sku || '',
      brand: product.brand || '',
      unit: product.unit || '',
      origin: product.origin || '',
      expiryDate: product.expiryDate ? String(product.expiryDate).slice(0, 10) : '',
      ingredients: product.ingredients || '',
      nutrition: product.nutrition || '',
      details: Array.isArray(product.details) ? product.details : []
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
      sku: form.sku,
      brand: form.brand,
      unit: form.unit,
      origin: form.origin,
      expiryDate: form.expiryDate || undefined,
      ingredients: form.ingredients,
      nutrition: form.nutrition,
      details: (form.details || []).filter((row) => row.label && row.value),
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
              <th>Approval</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7">Loading...</td>
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
                  <td>NRS {product.price}</td>
                  <td>{product.quantity}</td>
                  <td>
                    <span className={`status-pill status-${product.approvalStatus || 'approved'}`}>
                      {product.approvalStatus || 'approved'}
                    </span>
                  </td>
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
                <label>SKU</label>
                <input
                  type="text"
                  value={form.sku}
                  onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Brand</label>
                <input
                  type="text"
                  value={form.brand}
                  onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Unit (e.g. 200g, 1L)</label>
                <input
                  type="text"
                  value={form.unit}
                  onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Origin</label>
                <input
                  type="text"
                  value={form.origin}
                  onChange={(e) => setForm((f) => ({ ...f, origin: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Expiry Date</label>
                <input
                  type="date"
                  value={form.expiryDate}
                  onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Ingredients</label>
                <textarea
                  rows="2"
                  value={form.ingredients}
                  onChange={(e) => setForm((f) => ({ ...f, ingredients: e.target.value }))}
                ></textarea>
              </div>
              <div className="form-group">
                <label>Nutrition</label>
                <textarea
                  rows="2"
                  value={form.nutrition}
                  onChange={(e) => setForm((f) => ({ ...f, nutrition: e.target.value }))}
                ></textarea>
              </div>
              <div className="form-group">
                <label>Extra Details</label>
                <div className="details-list">
                  {(form.details || []).map((detail, index) => (
                    <div key={`${detail.label}-${index}`} className="details-row">
                      <input
                        type="text"
                        placeholder="Label"
                        value={detail.label || ''}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            details: (f.details || []).map((row, idx) =>
                              idx === index ? { ...row, label: e.target.value } : row
                            )
                          }))
                        }
                      />
                      <input
                        type="text"
                        placeholder="Value"
                        value={detail.value || ''}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            details: (f.details || []).map((row, idx) =>
                              idx === index ? { ...row, value: e.target.value } : row
                            )
                          }))
                        }
                      />
                      <button
                        type="button"
                        className="details-remove"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            details: (f.details || []).filter((_, idx) => idx !== index)
                          }))
                        }
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="details-add"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        details: [...(f.details || []), { label: '', value: '' }]
                      }))
                    }
                  >
                    Add Detail
                  </button>
                </div>
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

