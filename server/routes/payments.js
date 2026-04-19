const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');

const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');

const Product = require('../models/Product');
const Store = require('../models/Store');
const Order = require('../models/Order');
const { createNotification } = require('../utils/notifications');

const router = express.Router();

const ESEWA_SCD = process.env.ESEWA_MERCHANT_CODE || process.env.ESEWA_MERCHANT_ID || process.env.ESEWA_SCD || 'EPAYTEST';
const ESEWA_SECRET_KEY = process.env.ESEWA_SECRET_KEY || '';
const ESEWA_BASE_URL = process.env.ESEWA_BASE_URL || '';
const ESEWA_PAYMENT_URL = process.env.ESEWA_PAYMENT_URL
  || (ESEWA_BASE_URL ? `${ESEWA_BASE_URL}/api/epay/main/v2/form` : '')
  || 'https://epay.esewa.com.np/api/epay/main/v2/form';
const ESEWA_VERIFY_URL = process.env.ESEWA_VERIFY_URL || '';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const ESEWA_SUCCESS_URL = process.env.ESEWA_SUCCESS_URL || `${CLIENT_URL}/customer/payment/esewa/success`;
const ESEWA_FAILURE_URL = process.env.ESEWA_FAILURE_URL || `${CLIENT_URL}/customer/payment/esewa/failure`;

const computeStockStatus = ({ quantity, reservedQuantity }) => {
  const availableQuantity = Math.max(0, (quantity || 0) - (reservedQuantity || 0));
  if (availableQuantity === 0) return 'out_of_stock';
  if (availableQuantity < 10) return 'low_stock';
  return 'in_stock';
};

const emitStockUpdate = (req, storeId, productPayload) => {
  const io = req.app.get('io');
  if (!io || !storeId) return;
  io.to(`store:${storeId}`).emit('stock:update', productPayload);
};

const reserveStock = async (items) => {
  const reserved = [];

  for (const item of items) {
    const qty = Number(item.quantity || 0);
    if (!item.productId || !Number.isFinite(qty) || qty <= 0) {
      throw new Error('Invalid cart items');
    }

    const updated = await Product.findOneAndUpdate(
      {
        _id: item.productId,
        isAvailable: true,
        $expr: {
          $gte: [{ $subtract: ['$quantity', '$reservedQuantity'] }, qty]
        }
      },
      { $inc: { reservedQuantity: qty }, $set: { updatedAt: Date.now() } },
      { new: true }
    );

    if (!updated) {
      throw new Error('Not enough stock available');
    }

    reserved.push({ product: updated, quantity: qty });
  }

  return reserved;
};

const releaseReservedStock = async (items) => {
  await Promise.all(
    (items || []).map(async (item) => {
      if (!item?.productId || !item?.quantity) return null;
      await Product.updateOne(
        { _id: item.productId },
        { $inc: { reservedQuantity: -Number(item.quantity) }, $set: { updatedAt: Date.now() } }
      );
      return null;
    })
  );
};

const buildSignature = (fields, values) => {
  if (!ESEWA_SECRET_KEY) {
    throw new Error('Missing eSewa secret key');
  }

  const signatureString = fields.map((name) => `${name}=${values[name]}`).join(',');
  return crypto
    .createHmac('sha256', ESEWA_SECRET_KEY)
    .update(signatureString)
    .digest('base64');
};

const appendQuery = (url, query) => {
  if (!query) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${query}`;
};

const checkPaymentStatus = async ({ transactionUuid, totalAmount }) => {
  if (!ESEWA_VERIFY_URL) return { status: 'SKIPPED' };
  const url = `${ESEWA_VERIFY_URL}?product_code=${encodeURIComponent(ESEWA_SCD)}&total_amount=${encodeURIComponent(totalAmount)}&transaction_uuid=${encodeURIComponent(transactionUuid)}`;
  const res = await axios.get(url, { timeout: 15000 });
  return res.data || {};
};

const formatAmount = (value) => {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return '0';
  if (Number.isInteger(num)) return String(num);
  return num.toFixed(2);
};

// @route   POST /api/payments/esewa/init
// @desc    Create a pending order and return eSewa payment payload
// @access  Private (customer)
router.post(
  '/esewa/init',
  auth,
  requireRole('customer'),
  [
    body('items').isArray({ min: 1 }).withMessage('Cart items are required'),
    body('items.*.productId').custom((value) => mongoose.isValidObjectId(value)).withMessage('Invalid productId'),
    body('items.*.quantity').isInt({ min: 1, max: 99 }).withMessage('quantity must be 1-99')
  ],
  async (req, res) => {
    let reserved = [];

    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const rawItems = req.body.items || [];
      const productIds = rawItems.map((item) => item.productId);
      const products = await Product.find({ _id: { $in: productIds }, isAvailable: true }).lean();

      if (products.length !== productIds.length) {
        return res.status(400).json({ message: 'Some products are unavailable' });
      }

      const storeIds = new Set(products.map((product) => String(product.storeId)));
      if (storeIds.size > 1) {
        return res.status(400).json({ message: 'Checkout supports a single store at a time' });
      }

      reserved = await reserveStock(rawItems);

      const storeId = products[0].storeId;
      const store = await Store.findById(storeId).lean();
      if (!store || !store.isActive) {
        await releaseReservedStock(rawItems);
        return res.status(404).json({ message: 'Store not found' });
      }

      const items = rawItems.map((item) => {
        const product = products.find((p) => String(p._id) === String(item.productId));
        return {
          productId: product._id,
          name: product.name,
          image: Array.isArray(product.images) ? product.images[0] : undefined,
          price: product.price,
          quantity: Number(item.quantity)
        };
      });

      const totalAmount = items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
      const totalAmountString = formatAmount(totalAmount);
      const order = new Order({
        customerId: req.user.userId,
        storeId: storeId,
        items,
        status: 'pending_payment',
        totalAmount,
        paymentStatus: 'pending',
        paymentMethod: 'esewa'
      });

      const transactionUuid = String(order._id);
      order.paymentMeta = { transactionUuid };

      await order.save();

      const successUrl = ESEWA_SUCCESS_URL;
      const failureUrl = appendQuery(ESEWA_FAILURE_URL, `oid=${order._id}`);

      const signedFields = ['total_amount', 'transaction_uuid', 'product_code'];
      const payload = {
        amount: totalAmountString,
        tax_amount: '0',
        total_amount: totalAmountString,
        transaction_uuid: transactionUuid,
        product_code: ESEWA_SCD,
        product_service_charge: '0',
        product_delivery_charge: '0',
        success_url: successUrl,
        failure_url: failureUrl,
        signed_field_names: signedFields.join(','),
      };

      const signatureString = signedFields.map((name) => `${name}=${payload[name]}`).join(',');
      const signature = buildSignature(signedFields, payload);
      payload.signature = signature;


      res.status(201).json({
        orderId: order._id,
        actionUrl: ESEWA_PAYMENT_URL,
        payload
      });
    } catch (error) {
      if (reserved.length) {
        const rollbackItems = reserved.map((entry) => ({
          productId: entry.product._id,
          quantity: entry.quantity
        }));
        await releaseReservedStock(rollbackItems);
      }
      console.error('eSewa init error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   POST /api/payments/esewa/verify
// @desc    Verify eSewa payment and finalize order
// @access  Private (customer)
router.post(
  '/esewa/verify',
  auth,
  requireRole('customer'),
  [body('data').trim().notEmpty().withMessage('data is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const rawData = String(req.body.data || '');
      let decoded;
      let responseBody;
      try {
        decoded = Buffer.from(rawData, 'base64').toString('utf8');
        responseBody = JSON.parse(decoded);
      } catch (decodeError) {
        return res.status(400).json({ message: 'Invalid response payload' });
      }

      const signedNames = String(responseBody?.signed_field_names || '')
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean);
      const signature = responseBody?.signature;

      if (!signedNames.length || !signature) {
        return res.status(400).json({ message: 'Missing signature data' });
      }

      const expectedSignature = buildSignature(signedNames, responseBody);
      if (expectedSignature !== signature) {
        return res.status(400).json({ message: 'Signature verification failed' });
      }

      const transactionUuid = String(responseBody?.transaction_uuid || '');
      const status = String(responseBody?.status || '').toUpperCase();
      const productCode = String(responseBody?.product_code || '');
      const totalAmount = Number(responseBody?.total_amount || 0);
      const transactionCode = String(responseBody?.transaction_code || '');

      if (!transactionUuid) {
        return res.status(400).json({ message: 'Missing transaction UUID' });
      }

      const order = await Order.findById(transactionUuid);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      if (String(order.customerId) !== String(req.user.userId)) {
        return res.status(403).json({ message: 'Access denied' });
      }

      if (order.paymentStatus === 'paid') {
        return res.json({ message: 'Payment already verified', order });
      }

      const orderAmount = Number(order.totalAmount || 0);
      if (!Number.isFinite(orderAmount) || !Number.isFinite(totalAmount) || orderAmount !== totalAmount) {
        return res.status(400).json({ message: 'Payment amount mismatch' });
      }

      if (productCode && productCode !== ESEWA_SCD) {
        return res.status(400).json({ message: 'Invalid product code' });
      }

      if (status !== 'COMPLETE') {
        await releaseReservedStock(order.items);
        order.paymentStatus = 'failed';
        order.status = 'cancelled';
        order.paymentRef = transactionCode || undefined;
        order.paymentAmount = orderAmount;
        order.paymentMeta = { response: responseBody };
        order.updatedAt = Date.now();
        await order.save();
        return res.status(400).json({ message: 'Payment not completed' });
      }

      const statusCheck = await checkPaymentStatus({
        transactionUuid,
        totalAmount: totalAmount
      });
      const statusCheckValue = String(statusCheck?.status || '').toUpperCase();
      if (statusCheckValue && statusCheckValue !== 'COMPLETE') {
        await releaseReservedStock(order.items);
        order.paymentStatus = 'failed';
        order.status = 'cancelled';
        order.paymentRef = transactionCode || statusCheck?.ref_id || undefined;
        order.paymentAmount = orderAmount;
        order.paymentMeta = { response: responseBody, statusCheck };
        order.updatedAt = Date.now();
        await order.save();
        return res.status(400).json({ message: 'Payment status not complete' });
      }

      const items = Array.isArray(order.items) ? order.items : [];
      const updatedProducts = [];

      for (const item of items) {
        const qty = Number(item.quantity || 0);
        const updatedProduct = await Product.findOneAndUpdate(
          {
            _id: item.productId,
            isAvailable: true,
            $expr: {
              $gte: ['$reservedQuantity', qty]
            }
          },
          {
            $inc: { quantity: -qty, reservedQuantity: -qty },
            $set: { updatedAt: Date.now() }
          },
          { new: true }
        );

        if (!updatedProduct) {
          await releaseReservedStock(items);
          order.paymentStatus = 'failed';
          order.status = 'cancelled';
          order.paymentRef = refId;
          order.paymentAmount = orderAmount;
          order.paymentMeta = { verification: verifyText, error: 'Inventory update failed' };
          order.updatedAt = Date.now();
          await order.save();
          return res.status(400).json({ message: 'Inventory update failed' });
        }

        updatedProducts.push(updatedProduct);
      }

      order.paymentStatus = 'paid';
      order.status = 'placed';
      order.paymentRef = transactionCode || statusCheck?.ref_id || undefined;
      order.paymentAmount = orderAmount;
      order.paymentMeta = { response: responseBody, statusCheck };
      order.updatedAt = Date.now();
      await order.save();

      try {
        const store = await Store.findById(order.storeId).select('sellerId storeName').lean();
        if (store?.sellerId) {
          await createNotification(req, {
            userId: store.sellerId,
            type: 'new_order',
            title: 'New order placed',
            message: `Order ${order._id} has been paid.`,
            link: '/seller/orders',
            data: { orderId: order._id, storeId: store._id }
          });
        }
      } catch (notifyError) {
        console.error('Payment notification error:', notifyError);
      }

      updatedProducts.forEach((product) => {
        emitStockUpdate(req, product.storeId, {
          type: 'upsert',
          product: {
            id: product._id,
            storeId: product.storeId,
            name: product.name,
            description: product.description,
            category: product.category,
            price: product.price,
            quantity: product.quantity,
            reservedQuantity: product.reservedQuantity,
            availableQuantity: Math.max(0, (product.quantity || 0) - (product.reservedQuantity || 0)),
            stockStatus: computeStockStatus({
              quantity: product.quantity,
              reservedQuantity: product.reservedQuantity
            }),
            images: product.images,
            isAvailable: product.isAvailable,
            updatedAt: product.updatedAt
          }
        });
      });

      res.json({ message: 'Payment verified', order });
    } catch (error) {
      console.error('eSewa verify error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   POST /api/payments/esewa/fail
// @desc    Mark payment as failed and release stock
// @access  Private (customer)
router.post(
  '/esewa/fail',
  auth,
  requireRole('customer'),
  [body('orderId').custom((value) => mongoose.isValidObjectId(value)).withMessage('Invalid orderId')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const order = await Order.findById(req.body.orderId);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      if (String(order.customerId) !== String(req.user.userId)) {
        return res.status(403).json({ message: 'Access denied' });
      }

      if (order.paymentStatus !== 'paid') {
        await releaseReservedStock(order.items);
        order.paymentStatus = 'failed';
        order.status = 'cancelled';
        order.updatedAt = Date.now();
        await order.save();
      }

      res.json({ message: 'Payment marked as failed', order });
    } catch (error) {
      console.error('eSewa fail error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

module.exports = router;
