import { normalizeAdTitle, DUPLICATE_TITLE_ERROR_MESSAGE } from '../utils/adTitleValidation';
import { INITIAL_LISTINGS, INITIAL_PACKAGES } from '../data/initialData';
import { Listing, PromotionalPackage, OrderTransaction, BoostAnalyticsSummary } from '../types';
import { isListingBoosted } from '../utils/boostHelper';
import { seedCategoriesWithTenAds } from '../utils/listingsSeeder';

/**
 * Concurrency Mutex lock to prevent race conditions during simultaneous operations.
 */
class AsyncLock {
  private queue: Promise<void> = Promise.resolve();

  async acquire<T>(fn: () => Promise<T> | T): Promise<T> {
    let release: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    const previous = this.queue;
    this.queue = current;
    await previous;
    try {
      return await fn();
    } finally {
      release!();
    }
  }
}

class ListingsDatabase {
  private listings: Map<string, Listing> = new Map();
  // Unique compound index: `${sellerId}:::${normalizedTitle}` -> listingId
  private uniqueTitleIndex: Map<string, string> = new Map();
  // Promotional & Boost packages
  private packages: Map<string, PromotionalPackage> = new Map();
  // Pending boost orders
  private orders: Map<string, {
    orderId: string;
    listingId: string;
    packageId: string;
    userId: string;
    userName: string;
    price: number;
    taxAmount: number;
    totalAmount: number;
    durationHours: number;
    currency: string;
    status: 'pending' | 'completed' | 'cancelled' | 'failed';
    createdAt: string;
  }> = new Map();
  // Recorded transactions
  private transactions: Map<string, OrderTransaction> = new Map();
  // Idempotency cache for webhook events
  private processedWebhookIds: Set<string> = new Set();

  private lock = new AsyncLock();

  constructor() {
    this.resetToInitial();
  }

  /**
   * Resets database state to initial data
   */
  public resetToInitial(): void {
    this.listings.clear();
    this.uniqueTitleIndex.clear();
    this.packages.clear();
    this.orders.clear();
    this.transactions.clear();
    this.processedWebhookIds.clear();

    const seededListings = seedCategoriesWithTenAds(INITIAL_LISTINGS);
    for (const item of seededListings) {
      this.listings.set(item.id, { ...item });
      if (item.status !== 'sold') {
        const norm = normalizeAdTitle(item.title);
        const indexKey = this.getIndexKey(item.sellerId, norm);
        this.uniqueTitleIndex.set(indexKey, item.id);
      }
    }

    for (const pkg of INITIAL_PACKAGES) {
      this.packages.set(pkg.id, { ...pkg });
    }
  }

  private getIndexKey(sellerId: string, normalizedTitle: string): string {
    return `${sellerId.trim()}:::${normalizedTitle}`;
  }

  /**
   * Fast duplicate check for preview/as-you-type validation
   */
  public checkDuplicate(
    sellerId: string,
    title: string,
    excludeListingId?: string
  ): { isDuplicate: boolean; message?: string; conflictingListingId?: string } {
    const normalized = normalizeAdTitle(title);
    if (!normalized || !sellerId) {
      return { isDuplicate: false };
    }

    const indexKey = this.getIndexKey(sellerId, normalized);
    const existingListingId = this.uniqueTitleIndex.get(indexKey);

    if (existingListingId && existingListingId !== excludeListingId) {
      return {
        isDuplicate: true,
        message: DUPLICATE_TITLE_ERROR_MESSAGE,
        conflictingListingId: existingListingId,
      };
    }

    return { isDuplicate: false };
  }

  /**
   * Concurrency-safe listing creation with database-level uniqueness enforcement
   */
  public async createListing(
    listingData: Omit<Listing, 'id' | 'createdAt' | 'views' | 'likes' | 'chatsCount'>
  ): Promise<{ success: boolean; listing?: Listing; error?: string; status: number }> {
    return this.lock.acquire(async () => {
      const normalized = normalizeAdTitle(listingData.title);
      if (!normalized) {
        return {
          success: false,
          error: 'Title cannot be empty',
          status: 400,
        };
      }

      if (!listingData.sellerId) {
        return {
          success: false,
          error: 'Seller ID is required',
          status: 400,
        };
      }

      const indexKey = this.getIndexKey(listingData.sellerId, normalized);

      // Unique constraint check
      if (this.uniqueTitleIndex.has(indexKey)) {
        const existingId = this.uniqueTitleIndex.get(indexKey);
        const existing = this.listings.get(existingId || '');
        if (existing && existing.status !== 'sold') {
          return {
            success: false,
            error: DUPLICATE_TITLE_ERROR_MESSAGE,
            status: 409,
          };
        }
      }

      // Generate ID and create listing
      const id = 'lst_' + Math.floor(1000 + Math.random() * 9000);
      const createdDate = new Date().toISOString();
      const newListing: Listing = {
        ...listingData,
        id,
        createdAt: createdDate,
        views: 1,
        likes: 0,
        chatsCount: 0,
      };

      // Store in table and index
      this.listings.set(id, newListing);
      if (newListing.status !== 'sold') {
        this.uniqueTitleIndex.set(indexKey, id);
      }

      return {
        success: true,
        listing: newListing,
        status: 201,
      };
    });
  }

  /**
   * Concurrency-safe listing update with unique constraint check for edited titles
   */
  public async updateListing(
    id: string,
    updatedData: Partial<Listing>
  ): Promise<{ success: boolean; listing?: Listing; error?: string; status: number }> {
    return this.lock.acquire(async () => {
      const existing = this.listings.get(id);
      if (!existing) {
        return {
          success: false,
          error: 'Listing not found',
          status: 404,
        };
      }

      const sellerId = updatedData.sellerId || existing.sellerId;
      const targetTitle = updatedData.title !== undefined ? updatedData.title : existing.title;
      const normalizedTarget = normalizeAdTitle(targetTitle);

      const oldIndexKey = this.getIndexKey(existing.sellerId, normalizeAdTitle(existing.title));
      const newIndexKey = this.getIndexKey(sellerId, normalizedTarget);

      // If title or seller changed, verify new indexKey isn't occupied by another ad
      if (oldIndexKey !== newIndexKey) {
        const existingHolder = this.uniqueTitleIndex.get(newIndexKey);
        if (existingHolder && existingHolder !== id) {
          const conflictingListing = this.listings.get(existingHolder);
          if (conflictingListing && conflictingListing.status !== 'sold') {
            return {
              success: false,
              error: DUPLICATE_TITLE_ERROR_MESSAGE,
              status: 409,
            };
          }
        }
      }

      // Apply update
      const updatedListing: Listing = {
        ...existing,
        ...updatedData,
        id,
      };

      // Update index
      this.uniqueTitleIndex.delete(oldIndexKey);
      if (updatedListing.status !== 'sold') {
        this.uniqueTitleIndex.set(newIndexKey, id);
      }

      this.listings.set(id, updatedListing);

      return {
        success: true,
        listing: updatedListing,
        status: 200,
      };
    });
  }

  public getAllListings(): Listing[] {
    return Array.from(this.listings.values());
  }

  public getListingById(id: string): Listing | undefined {
    return this.listings.get(id);
  }

  public deleteListing(id: string): boolean {
    const existing = this.listings.get(id);
    if (!existing) return false;
    const indexKey = this.getIndexKey(existing.sellerId, normalizeAdTitle(existing.title));
    this.uniqueTitleIndex.delete(indexKey);
    return this.listings.delete(id);
  }

  // ==========================================
  // BOOST PACKAGES MANAGEMENT (Admin Configurable)
  // ==========================================

  public getPackages(): PromotionalPackage[] {
    return Array.from(this.packages.values());
  }

  public getPackageById(id: string): PromotionalPackage | undefined {
    return this.packages.get(id);
  }

  public createPackage(
    pkgData: Omit<PromotionalPackage, 'id' | 'salesCount'>
  ): PromotionalPackage {
    const id = 'pkg_' + Date.now();
    const newPkg: PromotionalPackage = {
      ...pkgData,
      id,
      salesCount: 0,
      durationHours: pkgData.durationHours || pkgData.durationDays * 24,
      currency: pkgData.currency || 'INR',
    };
    this.packages.set(id, newPkg);
    return newPkg;
  }

  public updatePackage(
    id: string,
    updatedData: Partial<PromotionalPackage>
  ): PromotionalPackage | null {
    const existing = this.packages.get(id);
    if (!existing) return null;

    const updated: PromotionalPackage = {
      ...existing,
      ...updatedData,
      id,
      durationHours:
        updatedData.durationHours ||
        (updatedData.durationDays ? updatedData.durationDays * 24 : existing.durationHours),
    };
    this.packages.set(id, updated);
    return updated;
  }

  public togglePackageStatus(id: string): PromotionalPackage | null {
    const pkg = this.packages.get(id);
    if (!pkg) return null;
    pkg.isActive = !pkg.isActive;
    this.packages.set(id, pkg);
    return pkg;
  }

  // ==========================================
  // BOOST ORDER CREATION & VERIFICATION
  // ==========================================

  /**
   * Creates a pending boost order on the server.
   * NEVER trusts client-submitted pricing or durations.
   */
  public async createBoostOrder(params: {
    listingId: string;
    packageId: string;
    userId: string;
    userName?: string;
  }): Promise<{ success: boolean; order?: any; error?: string; status: number }> {
    const { listingId, packageId, userId, userName = 'Classified User' } = params;

    // 1. Verify Listing exists
    const listing = this.listings.get(listingId);
    if (!listing) {
      return { success: false, error: 'Listing not found', status: 404 };
    }

    // 2. Verify Current User owns this listing
    if (listing.sellerId !== userId) {
      return {
        success: false,
        error: 'Unauthorized: You can only boost your own listings',
        status: 403,
      };
    }

    // 3. Verify Listing is approved and live
    if (listing.status !== 'approved') {
      return {
        success: false,
        error: `Only approved live listings can be boosted (Current status: ${listing.status})`,
        status: 400,
      };
    }

    // 4. Verify ad is not already actively boosted (prevent duplicate overlapping boosts)
    if (isListingBoosted(listing)) {
      return {
        success: false,
        error: 'This ad is currently boosted. You can boost it again after the current boost expires.',
        status: 400,
      };
    }

    // 5. Look up package on server (Never trust frontend price or duration!)
    const pkg = this.packages.get(packageId);
    if (!pkg || !pkg.isActive) {
      return {
        success: false,
        error: 'Selected boost package is invalid or currently disabled',
        status: 400,
      };
    }

    const durationHours = pkg.durationHours || pkg.durationDays * 24;
    const price = pkg.price;
    const taxAmount = Math.round(price * 0.18); // 18% GST standard
    const totalAmount = price + taxAmount;
    const orderId = `ORD-BOOST-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    const orderRecord = {
      orderId,
      listingId,
      packageId: pkg.id,
      userId,
      userName,
      price,
      taxAmount,
      totalAmount,
      durationHours,
      currency: pkg.currency || 'INR',
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
    };

    this.orders.set(orderId, orderRecord);

    return {
      success: true,
      order: orderRecord,
      status: 201,
    };
  }

  /**
   * Verifies payment and activates the boost on the listing atomically.
   */
  public async verifyAndApplyBoost(params: {
    orderId: string;
    listingId: string;
    packageId: string;
    paymentId: string;
    paymentGateway: string;
    userId: string;
    nowMs?: number;
  }): Promise<{ success: boolean; listing?: Listing; transaction?: OrderTransaction; error?: string; status: number }> {
    return this.lock.acquire(async () => {
      const { orderId, listingId, packageId, paymentId, paymentGateway, userId, nowMs = Date.now() } = params;

      // 1. Validate order
      const order = this.orders.get(orderId);
      if (!order) {
        return { success: false, error: 'Boost order not found', status: 404 };
      }

      if (order.status === 'completed') {
        return {
          success: false,
          error: 'This order has already been processed and applied',
          status: 400,
        };
      }

      // 2. Validate listing
      const listing = this.listings.get(listingId);
      if (!listing) {
        return { success: false, error: 'Listing not found', status: 404 };
      }

      if (listing.sellerId !== userId) {
        return { success: false, error: 'Unauthorized user verification', status: 403 };
      }

      // 3. Validate package
      const pkg = this.packages.get(packageId);
      if (!pkg) {
        return { success: false, error: 'Boost package not found', status: 400 };
      }

      // 4. Calculate boost timeframe
      const durationHours = pkg.durationHours || pkg.durationDays * 24;
      const boostStartedAt = new Date(nowMs).toISOString();
      const boostExpiresAt = new Date(nowMs + durationHours * 3600 * 1000).toISOString();

      // 5. Update Listing with boost state
      const updatedListing: Listing = {
        ...listing,
        isBoosted: true,
        boostStatus: 'active',
        boostStartedAt,
        boostExpiresAt,
        boostPackageId: pkg.id,
        boostPackageName: pkg.name,
        boostPrice: pkg.price,
        boostDurationHours: durationHours,
        boostPaymentId: paymentId,
        boostViews: listing.boostViews || 0,
        boostImpressions: listing.boostImpressions || 0,
        boostClicks: listing.boostClicks || 0,
      };

      this.listings.set(listingId, updatedListing);

      // 6. Update order status
      order.status = 'completed';
      this.orders.set(orderId, order);

      // 7. Increment package sales counter
      pkg.salesCount = (pkg.salesCount || 0) + 1;
      this.packages.set(pkg.id, pkg);

      // 8. Record OrderTransaction
      const transactionId = `tx_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
      const transaction: OrderTransaction = {
        id: transactionId,
        orderId,
        userId,
        userName: order.userName,
        packageId: pkg.id,
        packageName: pkg.name,
        amount: pkg.price,
        taxAmount: order.taxAmount,
        totalAmount: order.totalAmount,
        status: 'completed',
        paymentGateway: paymentGateway as any,
        paymentId,
        invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
        createdAt: new Date(nowMs).toISOString(),
      };

      this.transactions.set(transactionId, transaction);

      return {
        success: true,
        listing: updatedListing,
        transaction,
        status: 200,
      };
    });
  }

  /**
   * Idempotent Webhook Handler for Payment Gateway events
   */
  public async handleBoostWebhook(event: {
    eventId: string;
    eventType: string;
    orderId: string;
    paymentId: string;
    paymentGateway: string;
  }): Promise<{ success: boolean; message: string; duplicate?: boolean }> {
    const { eventId, eventType, orderId, paymentId, paymentGateway } = event;

    // Idempotency check: avoid duplicate processing of repeated webhooks
    if (this.processedWebhookIds.has(eventId)) {
      return {
        success: true,
        duplicate: true,
        message: `Webhook event ${eventId} already processed (idempotent skipped)`,
      };
    }

    this.processedWebhookIds.add(eventId);

    if (eventType === 'payment.captured' || eventType === 'checkout.session.completed') {
      const order = this.orders.get(orderId);
      if (!order) {
        return { success: false, message: `Order ${orderId} not found for webhook` };
      }

      if (order.status !== 'completed') {
        const result = await this.verifyAndApplyBoost({
          orderId,
          listingId: order.listingId,
          packageId: order.packageId,
          paymentId,
          paymentGateway,
          userId: order.userId,
        });
        return { success: result.success, message: 'Boost activated via webhook' };
      }
    }

    return { success: true, message: 'Webhook event recorded' };
  }

  /**
   * Scheduled/Manual Cleanup task to transition expired boosts:
   * Sets boostStatus = 'expired', isBoosted = false
   */
  public cleanupExpiredBoosts(nowMs: number = Date.now()): number {
    let expiredCount = 0;
    for (const [id, listing] of this.listings.entries()) {
      if (listing.isBoosted && listing.boostExpiresAt) {
        const expiryMs = new Date(listing.boostExpiresAt).getTime();
        if (expiryMs <= nowMs) {
          listing.isBoosted = false;
          listing.boostStatus = 'expired';
          this.listings.set(id, { ...listing });
          expiredCount++;
        }
      }
    }
    return expiredCount;
  }

  /**
   * Computes comprehensive boost analytics for the platform.
   */
  public getBoostAnalytics(): BoostAnalyticsSummary {
    const allListings = Array.from(this.listings.values());
    const allTransactions = Array.from(this.transactions.values());

    let totalRevenue = 0;
    for (const tx of allTransactions) {
      if (tx.status === 'completed') {
        totalRevenue += tx.amount;
      }
    }

    const now = Date.now();
    let activeBoostsCount = 0;
    let expiredBoostsCount = 0;
    let totalDurationHours = 0;
    let boostedAdViews = 0;
    let boostedAdImpressions = 0;
    let boostedAdClicks = 0;

    for (const listing of allListings) {
      if (listing.boostStartedAt) {
        if (isListingBoosted(listing, now)) {
          activeBoostsCount++;
        } else if (listing.boostStatus === 'expired') {
          expiredBoostsCount++;
        }
        totalDurationHours += listing.boostDurationHours || 0;
        boostedAdViews += listing.boostViews || 0;
        boostedAdImpressions += listing.boostImpressions || 0;
        boostedAdClicks += listing.boostClicks || 0;
      }
    }

    const totalBoosts = activeBoostsCount + expiredBoostsCount || allTransactions.length;
    const avgDurationHours = totalBoosts > 0 ? Math.round(totalDurationHours / totalBoosts) : 24;

    return {
      totalBoostsPurchased: totalBoosts,
      totalBoostRevenue: totalRevenue,
      activeBoostsCount,
      expiredBoostsCount,
      avgDurationHours,
      boostedAdViews,
      boostedAdImpressions,
      boostedAdClicks,
    };
  }

  public getAllTransactions(): OrderTransaction[] {
    return Array.from(this.transactions.values());
  }
}

export const listingsDb = new ListingsDatabase();

