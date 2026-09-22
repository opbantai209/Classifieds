import { checkDuplicateAdTitle, normalizeAdTitle, DUPLICATE_TITLE_ERROR_MESSAGE } from '../src/utils/adTitleValidation';
import { listingsDb } from '../src/server/listingsDb';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
    failed++;
  }
}

async function runAllTests() {
  console.log('\n--- STARTING DUPLICATE TITLE DETECTION TEST SUITE ---\n');

  // Test 1: Title Normalization
  {
    const norm1 = normalizeAdTitle('  iPhone   15    Pro  ');
    assert(norm1 === 'iphone 15 pro', 'Normalization trims and collapses multiple spaces and lowercases');
  }

  // Test 2: Same user + same title -> rejected
  {
    const mockListings = [
      { id: '1', sellerId: 'usr_user1', title: 'MacBook Air M2 16GB', status: 'approved' },
      { id: '2', sellerId: 'usr_user2', title: 'Royal Enfield Classic 350', status: 'approved' },
    ];

    const result = checkDuplicateAdTitle({
      title: 'MacBook Air M2 16GB',
      sellerId: 'usr_user1',
      existingListings: mockListings,
    });

    assert(result.isDuplicate === true, 'Same user + same title -> rejected');
    assert(result.message === DUPLICATE_TITLE_ERROR_MESSAGE, 'Returns correct user-facing error message');
  }

  // Test 3: Same user + different title -> allowed
  {
    const mockListings = [
      { id: '1', sellerId: 'usr_user1', title: 'MacBook Air M2 16GB', status: 'approved' },
    ];

    const result = checkDuplicateAdTitle({
      title: 'Dell XPS 15 32GB',
      sellerId: 'usr_user1',
      existingListings: mockListings,
    });

    assert(result.isDuplicate === false, 'Same user + different title -> allowed');
  }

  // Test 4: Different users + same title -> allowed
  {
    const mockListings = [
      { id: '1', sellerId: 'usr_user1', title: 'iPhone 15 Pro 128GB', status: 'approved' },
    ];

    const result = checkDuplicateAdTitle({
      title: 'iPhone 15 Pro 128GB',
      sellerId: 'usr_user2', // different user
      existingListings: mockListings,
    });

    assert(result.isDuplicate === false, 'Different users + same title -> allowed');
  }

  // Test 5: Case differences -> rejected as duplicate
  {
    const mockListings = [
      { id: '1', sellerId: 'usr_user1', title: 'iPhone 15 Pro', status: 'approved' },
    ];

    const resultUpper = checkDuplicateAdTitle({
      title: 'IPHONE 15 PRO',
      sellerId: 'usr_user1',
      existingListings: mockListings,
    });
    const resultLower = checkDuplicateAdTitle({
      title: 'iphone 15 pro',
      sellerId: 'usr_user1',
      existingListings: mockListings,
    });

    assert(resultUpper.isDuplicate === true, 'Case difference (UPPERCASE) -> rejected as duplicate');
    assert(resultLower.isDuplicate === true, 'Case difference (lowercase) -> rejected as duplicate');
  }

  // Test 6: Extra spaces -> rejected as duplicate
  {
    const mockListings = [
      { id: '1', sellerId: 'usr_user1', title: 'iPhone 15 Pro', status: 'approved' },
    ];

    const result = checkDuplicateAdTitle({
      title: '   iPhone    15     Pro   ',
      sellerId: 'usr_user1',
      existingListings: mockListings,
    });

    assert(result.isDuplicate === true, 'Extra spaces & padding -> rejected as duplicate');
  }

  // Test 7: Editing the same ad without changing its title -> allowed
  {
    const mockListings = [
      { id: 'ad_101', sellerId: 'usr_user1', title: 'Sony WH-1000XM5 Headphones', status: 'approved' },
      { id: 'ad_102', sellerId: 'usr_user1', title: 'Apple Watch Ultra 2', status: 'approved' },
    ];

    const result = checkDuplicateAdTitle({
      title: 'Sony WH-1000XM5 Headphones',
      sellerId: 'usr_user1',
      existingListings: mockListings,
      excludeListingId: 'ad_101', // excluding currently edited listing
    });

    assert(result.isDuplicate === false, 'Editing the same ad without changing its title -> allowed');
  }

  // Test 8: Editing an ad to another existing title belonging to the same user -> rejected
  {
    const mockListings = [
      { id: 'ad_101', sellerId: 'usr_user1', title: 'Sony WH-1000XM5 Headphones', status: 'approved' },
      { id: 'ad_102', sellerId: 'usr_user1', title: 'Apple Watch Ultra 2', status: 'approved' },
    ];

    const result = checkDuplicateAdTitle({
      title: 'Apple Watch Ultra 2', // changed ad_101 to match ad_102
      sellerId: 'usr_user1',
      existingListings: mockListings,
      excludeListingId: 'ad_101',
    });

    assert(result.isDuplicate === true, 'Editing an ad to another existing title belonging to the same user -> rejected');
    assert(result.conflictingListingId === 'ad_102', 'Identifies conflicting listing ID');
  }

  // Test 9: Database repository layer & Concurrency Protection
  {
    listingsDb.resetToInitial();
    const testSellerId = 'usr_concurrent_tester';
    const testTitle = 'OnePlus 12 5G Silky Black';

    // 10 concurrent requests to create the exact same ad title by the same user simultaneously
    const concurrentRequests = Array.from({ length: 10 }).map((_, idx) =>
      listingsDb.createListing({
        title: idx % 2 === 0 ? testTitle : '  ONEPLUS   12   5G   Silky   Black  ',
        sellerId: testSellerId,
        sellerName: 'Concurrent Tester',
        sellerType: 'user',
        sellerPhone: '+91 99999 88888',
        sellerAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        price: 54999,
        description: 'Brand new condition flagship phone',
        images: ['https://images.unsplash.com/photo-1546868871-7041f2a55e12'],
        status: 'approved',
        categoryId: 'cat_mobiles',
        location: { city: 'Mumbai', state: 'Maharashtra', locality: 'Bandra West' },
        expiresAt: '2026-12-31',
        isFeatured: false,
        isBoosted: false,
        customAttributes: {},
      })
    );

    const responses = await Promise.all(concurrentRequests);
    const successfulCreations = responses.filter((r) => r.success);
    const rejectedDuplicates = responses.filter((r) => !r.success && r.status === 409);

    assert(successfulCreations.length === 1, `Concurrent submissions: Exactly 1 ad created (got ${successfulCreations.length})`);
    assert(rejectedDuplicates.length === 9, `Concurrent submissions: Exactly 9 duplicate requests rejected with 409 (got ${rejectedDuplicates.length})`);
  }

  console.log(`\n--- TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ---`);
  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
