import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { listingsDb } from './src/server/listingsDb';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON Body Parser for API requests
  app.use(express.json());

  // API health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Check duplicate title API
  app.post('/api/listings/check-duplicate', (req, res) => {
    const { sellerId, title, excludeListingId } = req.body || {};
    if (!sellerId || !title) {
      return res.status(400).json({ isDuplicate: false, error: 'sellerId and title are required' });
    }
    const result = listingsDb.checkDuplicate(sellerId, title, excludeListingId);
    return res.json(result);
  });

  // Get all listings
  app.get('/api/listings', (_req, res) => {
    const all = listingsDb.getAllListings();
    res.json(all);
  });

  // Create listing with database duplicate check
  app.post('/api/listings', async (req, res) => {
    const result = await listingsDb.createListing(req.body);
    if (!result.success) {
      return res.status(result.status).json({
        error: result.status === 409 ? 'DUPLICATE_TITLE' : 'VALIDATION_ERROR',
        message: result.error,
      });
    }
    return res.status(201).json(result.listing);
  });

  // Update listing with duplicate check
  app.put('/api/listings/:id', async (req, res) => {
    const result = await listingsDb.updateListing(req.params.id, req.body);
    if (!result.success) {
      return res.status(result.status).json({
        error: result.status === 409 ? 'DUPLICATE_TITLE' : 'VALIDATION_ERROR',
        message: result.error,
      });
    }
    return res.status(200).json(result.listing);
  });

  // Reset listings and packages (for test environment)
  app.post('/api/listings/reset', (_req, res) => {
    listingsDb.resetToInitial();
    res.json({ success: true, message: 'Listings reset to initial state' });
  });

  // Delete single listing
  app.delete('/api/listings/:id', (req, res) => {
    const deleted = listingsDb.deleteListing(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    res.json({ success: true, message: 'Listing deleted successfully' });
  });

  // Bulk listings operations (delete, approve, reject, renew)
  app.post('/api/listings/bulk-action', async (req, res) => {
    const { action, ids, data } = req.body || {};
    if (!action || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Action and non-empty IDs array are required' });
    }

    const results = [];
    for (const id of ids) {
      if (action === 'delete') {
        const deleted = listingsDb.deleteListing(id);
        results.push({ id, success: deleted });
      } else if (action === 'update') {
        const result = await listingsDb.updateListing(id, data || {});
        results.push({ id, success: result.success });
      }
    }

    res.json({ success: true, results });
  });

  // ====================================================
  // BOOST YOUR AD TO TOP API ENDPOINTS
  // ====================================================

  // Get active boost packages
  app.get('/api/boost/packages', (_req, res) => {
    const packages = listingsDb.getPackages();
    res.json(packages);
  });

  // Admin create boost package
  app.post('/api/boost/packages', (req, res) => {
    const newPkg = listingsDb.createPackage(req.body);
    res.status(201).json(newPkg);
  });

  // Admin update boost package
  app.put('/api/boost/packages/:id', (req, res) => {
    const updated = listingsDb.updatePackage(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Package not found' });
    }
    res.json(updated);
  });

  // Admin toggle package status (enable/disable)
  app.patch('/api/boost/packages/:id/toggle', (req, res) => {
    const updated = listingsDb.togglePackageStatus(req.params.id);
    if (!updated) {
      return res.status(404).json({ error: 'Package not found' });
    }
    res.json(updated);
  });

  // Create Boost Order (Server-authoritative pricing & duration)
  app.post('/api/boost/create-order', async (req, res) => {
    const { listingId, packageId, userId, userName } = req.body || {};
    if (!listingId || !packageId || !userId) {
      return res.status(400).json({
        error: 'listingId, packageId, and userId are required',
      });
    }

    const result = await listingsDb.createBoostOrder({
      listingId,
      packageId,
      userId,
      userName,
    });

    if (!result.success) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.status(201).json(result.order);
  });

  // Verify and Apply Boost Payment
  app.post('/api/boost/verify-payment', async (req, res) => {
    const { orderId, listingId, packageId, paymentId, paymentGateway, userId, nowMs } = req.body || {};
    if (!orderId || !listingId || !packageId || !paymentId || !userId) {
      return res.status(400).json({
        error: 'orderId, listingId, packageId, paymentId, and userId are required',
      });
    }

    const result = await listingsDb.verifyAndApplyBoost({
      orderId,
      listingId,
      packageId,
      paymentId,
      paymentGateway: paymentGateway || 'UPI',
      userId,
      nowMs,
    });

    if (!result.success) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.json({
      success: true,
      listing: result.listing,
      transaction: result.transaction,
    });
  });

  // Idempotent Payment Gateway Webhook
  app.post('/api/boost/webhook', async (req, res) => {
    const { eventId, eventType, orderId, paymentId, paymentGateway } = req.body || {};
    if (!eventId || !orderId) {
      return res.status(400).json({ error: 'eventId and orderId are required' });
    }

    const result = await listingsDb.handleBoostWebhook({
      eventId,
      eventType: eventType || 'payment.captured',
      orderId,
      paymentId: paymentId || `pay_wh_${Date.now()}`,
      paymentGateway: paymentGateway || 'Razorpay',
    });

    return res.json(result);
  });

  // Cleanup Expired Boosts
  app.post('/api/boost/cleanup-expired', (req, res) => {
    const { nowMs } = req.body || {};
    const count = listingsDb.cleanupExpiredBoosts(nowMs ? Number(nowMs) : undefined);
    res.json({ success: true, expiredCount: count });
  });

  // Boost Analytics
  app.get('/api/boost/analytics', (_req, res) => {
    const analytics = listingsDb.getBoostAnalytics();
    res.json(analytics);
  });

  // Boost Transactions
  app.get('/api/boost/transactions', (_req, res) => {
    const transactions = listingsDb.getAllTransactions();
    res.json(transactions);
  });

  // Development vs Production middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
