import { Category, LocationItem, Listing } from '../types';

/**
 * Utility to convert arbitrary string to SEO-friendly URL slug
 */
export function slugify(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Custom Sequential Geo Location IDs starting from 1 (e.g. mumbai_g1)
 */
const CITY_GEO_IDS: Record<string, string> = {
  mumbai: 'g1',
  pune: 'g2',
  'new-delhi': 'g3',
  delhi: 'g3',
  gurugram: 'g4',
  bengaluru: 'g5',
  bangalore: 'g5',
  hyderabad: 'g6',
  chennai: 'g7',
  kolkata: 'g8',
  ahmedabad: 'g9',
  jaipur: 'g10',
  lucknow: 'g11',
  chandigarh: 'g12',
  'all-india': 'g0',
  india: 'g0',
};

/**
 * Custom Sequential Category Code IDs starting from 1 (e.g. cars_c1)
 */
const CATEGORY_CODES: Record<string, string> = {
  vehicles: 'c1',
  cars: 'c2',
  mobiles: 'c3',
  'mobile-phones': 'c3',
  properties: 'c4',
  'real-estate': 'c4',
  apartments: 'c5',
  electronics: 'c6',
  'commercial-machinery': 'c7',
  jobs: 'c8',
  services: 'c9',
  furniture: 'c10',
  fashion: 'c11',
  sports: 'c12',
  pets: 'c13',
};

/**
 * Helper to get or generate Geo ID for a city
 */
export function getCityGeoId(citySlug: string): string {
  const clean = slugify(citySlug);
  if (CITY_GEO_IDS[clean]) {
    return CITY_GEO_IDS[clean];
  }
  // Deterministic fallback starting from g100+ for unlisted cities
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash << 5) - hash + clean.charCodeAt(i);
    hash |= 0;
  }
  const posHash = (Math.abs(hash) % 900) + 100;
  return `g${posHash}`;
}

/**
 * Helper to get or generate Category Code (e.g. c1)
 */
export function getCategoryCode(catSlug: string, catId?: string): string {
  const clean = slugify(catSlug);
  if (CATEGORY_CODES[clean]) {
    return CATEGORY_CODES[clean];
  }
  if (catId) {
    const digits = catId.replace(/\D/g, '');
    if (digits) return `c${digits}`;
  }
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash << 5) - hash + clean.charCodeAt(i);
    hash |= 0;
  }
  return `c${(Math.abs(hash) % 100) + 50}`;
}

/**
 * Strips Chillyads URL suffixes like _g4058997, _c84, -iid-lst_1001
 */
export function stripChillySuffixes(part: string): {
  cleanSlug: string;
  geoId?: string;
  categoryCode?: string;
  itemId?: string;
} {
  if (!part) return { cleanSlug: '' };

  let cleanSlug = part;
  let geoId: string | undefined;
  let categoryCode: string | undefined;
  let itemId: string | undefined;

  // Extract -iid-{id} or -item-{id}
  const itemMatch = part.match(/(?:-iid-|-item-)(.+)$/i);
  if (itemMatch) {
    itemId = itemMatch[1];
    cleanSlug = part.replace(/(?:-iid-|-item-).+$/i, '');
  }

  // Extract _g{number}
  const geoMatch = cleanSlug.match(/_g(\d+)$/i);
  if (geoMatch) {
    geoId = `g${geoMatch[1]}`;
    cleanSlug = cleanSlug.replace(/_g\d+$/i, '');
  }

  // Extract _c{number}
  const catMatch = cleanSlug.match(/_c(\d+)$/i);
  if (catMatch) {
    categoryCode = `c${catMatch[1]}`;
    cleanSlug = cleanSlug.replace(/_c\d+$/i, '');
  }

  return { cleanSlug, geoId, categoryCode, itemId };
}

export interface ParsedRoute {
  routeType: 'home' | 'city' | 'category' | 'listing' | 'post' | 'search' | 'admin' | 'user-panel';
  city: string; // e.g. "Mumbai", "New Delhi", "All India"
  citySlug: string; // e.g. "mumbai", "new-delhi", "all-india"
  geoId: string; // e.g. "g4058997"
  categoryId: string; // e.g. "cat_vehicles" or "all"
  categorySlug?: string;
  subcategoryId: string; // e.g. "sub_cars" or "all"
  subcategorySlug?: string;
  listingId: string | null;
  adminPath?: string;
  rawPath: string;
}

/**
 * Unslugify city name by matching against locations dataset
 */
export function unslugifyCity(
  inputSlug: string,
  locations: LocationItem[]
): { cityName: string; citySlug: string; geoId: string } {
  const { cleanSlug, geoId: extractedGeoId } = stripChillySuffixes(inputSlug);

  if (!cleanSlug || cleanSlug === 'all-india' || cleanSlug === 'all-cities' || cleanSlug === 'india' || cleanSlug === 'all') {
    return {
      cityName: 'All India',
      citySlug: 'all-india',
      geoId: extractedGeoId || 'g0',
    };
  }

  const normalized = cleanSlug.toLowerCase().replace(/-/g, ' ');
  const cityObj = locations.find(
    (l) =>
      l.type === 'city' &&
      (slugify(l.name) === cleanSlug || l.name.toLowerCase() === normalized)
  );

  if (cityObj) {
    return {
      cityName: cityObj.name,
      citySlug: slugify(cityObj.name),
      geoId: extractedGeoId || getCityGeoId(cityObj.name),
    };
  }

  // Capitalize words as fallback
  const fallbackName = normalized
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return {
    cityName: fallbackName,
    citySlug: cleanSlug,
    geoId: extractedGeoId || getCityGeoId(cleanSlug),
  };
}

/**
 * Match category or subcategory slug against categories dataset
 */
export function unslugifyCategory(
  inputSlug: string,
  categories: Category[]
): { categoryId: string; subcategoryId: string; categoryObj?: Category } {
  const { cleanSlug } = stripChillySuffixes(inputSlug);

  if (!cleanSlug || cleanSlug === 'all') {
    return { categoryId: 'all', subcategoryId: 'all' };
  }

  // 1. Try matching main category by slug or name
  const mainCat = categories.find(
    (c) => c.parentId === null && (c.slug === cleanSlug || slugify(c.name) === cleanSlug)
  );
  if (mainCat) {
    return { categoryId: mainCat.id, subcategoryId: 'all', categoryObj: mainCat };
  }

  // 2. Try matching subcategory
  const subCat = categories.find(
    (c) => c.parentId !== null && (c.slug === cleanSlug || slugify(c.name) === cleanSlug)
  );
  if (subCat) {
    return {
      categoryId: subCat.parentId || 'all',
      subcategoryId: subCat.id,
      categoryObj: subCat,
    };
  }

  return { categoryId: 'all', subcategoryId: 'all' };
}

/**
 * Parse any URL path into a structured Chillyads route format (e.g. /mumbai_g4058997/cars_c84)
 */
export function parseChillyPath(
  pathStr: string,
  locations: LocationItem[],
  categories: Category[]
): ParsedRoute {
  let clean = pathStr.replace(/^#\/?/, '/');
  if (!clean || clean === '') clean = '/';
  if (!clean.startsWith('/')) clean = '/' + clean;

  const parts = clean.split('?')[0].split('/').filter(Boolean);

  // Default Route
  if (parts.length === 0) {
    return {
      routeType: 'home',
      city: 'All India',
      citySlug: 'all-india',
      geoId: 'g0',
      categoryId: 'all',
      subcategoryId: 'all',
      listingId: null,
      rawPath: clean,
    };
  }

  // 1. Admin Routes (/admin/*)
  if (parts[0] === 'admin') {
    return {
      routeType: 'admin',
      city: 'All India',
      citySlug: 'all-india',
      geoId: 'g0',
      categoryId: 'all',
      subcategoryId: 'all',
      listingId: null,
      adminPath: clean,
      rawPath: clean,
    };
  }

  // 2. User Panel Route (/my-account, /user, /user/panel, /my-ads)
  if (parts[0] === 'my-account' || parts[0] === 'user' || parts[0] === 'my-ads' || parts[0] === 'account') {
    return {
      routeType: 'user-panel',
      city: 'All India',
      citySlug: 'all-india',
      geoId: 'g0',
      categoryId: 'all',
      subcategoryId: 'all',
      listingId: null,
      rawPath: clean,
    };
  }

  // 3. Post / Sell Route (/post, /sell)
  if (parts[0] === 'post' || parts[0] === 'sell') {
    return {
      routeType: 'post',
      city: 'All India',
      citySlug: 'all-india',
      geoId: 'g0',
      categoryId: 'all',
      subcategoryId: 'all',
      listingId: null,
      rawPath: clean,
    };
  }

  // 3. Search Route (/search)
  if (parts[0] === 'search') {
    return {
      routeType: 'search',
      city: 'All India',
      citySlug: 'all-india',
      geoId: 'g0',
      categoryId: 'all',
      subcategoryId: 'all',
      listingId: null,
      rawPath: clean,
    };
  }

  // 4. Listing detail route (/item/:id or /ad/:id or /mumbai_g1/item/hyundai-creta-iid-lst_1001)
  if (parts[0] === 'item' || parts[0] === 'ad') {
    const rawIdPart = parts[1] || '';
    const { itemId } = stripChillySuffixes(rawIdPart);
    const listingId = itemId || rawIdPart.split('-')[0];
    return {
      routeType: 'listing',
      city: 'All India',
      citySlug: 'all-india',
      geoId: 'g0',
      categoryId: 'all',
      subcategoryId: 'all',
      listingId,
      rawPath: clean,
    };
  }

  if (parts.length >= 2 && (parts[1] === 'item' || parts[1] === 'ad')) {
    const { cityName, citySlug, geoId } = unslugifyCity(parts[0], locations);
    const rawIdPart = parts[2] || '';
    const { itemId } = stripChillySuffixes(rawIdPart);
    const listingId = itemId || rawIdPart.split('-')[0];
    return {
      routeType: 'listing',
      city: cityName,
      citySlug,
      geoId,
      categoryId: 'all',
      subcategoryId: 'all',
      listingId,
      rawPath: clean,
    };
  }

  // 5. Check if first part contains city (e.g. mumbai_g4058997 or mumbai or all-india)
  const { cleanSlug: firstCleanSlug, geoId: firstGeoId } = stripChillySuffixes(parts[0]);

  const firstPartIsCity =
    !!firstGeoId ||
    firstCleanSlug === 'all-india' ||
    firstCleanSlug === 'india' ||
    locations.some((l) => l.type === 'city' && (slugify(l.name) === firstCleanSlug || l.name.toLowerCase() === firstCleanSlug.replace(/-/g, ' ')));

  if (firstPartIsCity) {
    const { cityName, citySlug, geoId } = unslugifyCity(parts[0], locations);

    if (parts.length === 1) {
      return {
        routeType: 'city',
        city: cityName,
        citySlug,
        geoId,
        categoryId: 'all',
        subcategoryId: 'all',
        listingId: null,
        rawPath: clean,
      };
    }

    if (parts.length === 2) {
      if (parts[1] === 'post' || parts[1] === 'sell') {
        return {
          routeType: 'post',
          city: cityName,
          citySlug,
          geoId,
          categoryId: 'all',
          subcategoryId: 'all',
          listingId: null,
          rawPath: clean,
        };
      }

      const catInfo = unslugifyCategory(parts[1], categories);
      return {
        routeType: 'category',
        city: cityName,
        citySlug,
        geoId,
        categoryId: catInfo.categoryId,
        categorySlug: parts[1],
        subcategoryId: catInfo.subcategoryId,
        listingId: null,
        rawPath: clean,
      };
    }

    if (parts.length >= 3) {
      const mainCatInfo = unslugifyCategory(parts[1], categories);
      const subCatInfo = unslugifyCategory(parts[2], categories);

      return {
        routeType: 'category',
        city: cityName,
        citySlug,
        geoId,
        categoryId: mainCatInfo.categoryId !== 'all' ? mainCatInfo.categoryId : subCatInfo.categoryId,
        categorySlug: parts[1],
        subcategoryId: subCatInfo.subcategoryId !== 'all' ? subCatInfo.subcategoryId : subCatInfo.categoryId,
        subcategorySlug: parts[2],
        listingId: null,
        rawPath: clean,
      };
    }
  } else {
    // First part is category slug across All India (e.g. /cars_c2)
    const catInfo = unslugifyCategory(parts[0], categories);
    let subCatInfo = { categoryId: 'all', subcategoryId: 'all' };
    if (parts.length >= 2) {
      subCatInfo = unslugifyCategory(parts[1], categories);
    }

    return {
      routeType: 'category',
      city: 'All India',
      citySlug: 'all-india',
      geoId: 'g0',
      categoryId: catInfo.categoryId !== 'all' ? catInfo.categoryId : subCatInfo.categoryId,
      categorySlug: parts[0],
      subcategoryId: subCatInfo.subcategoryId !== 'all' ? subCatInfo.subcategoryId : subCatInfo.categoryId,
      subcategorySlug: parts[1],
      listingId: null,
      rawPath: clean,
    };
  }

  return {
    routeType: 'home',
    city: 'All India',
    citySlug: 'all-india',
    geoId: 'g0',
    categoryId: 'all',
    subcategoryId: 'all',
    listingId: null,
    rawPath: clean,
  };
}

/**
 * Builds authentic Chillyads.in formatted URLs (e.g. https://www.chillyads.in/mumbai_g4058997)
 */
export function buildChillyUrl(options: {
  city?: string;
  categoryId?: string;
  subcategoryId?: string;
  listing?: Listing | null;
  action?: 'post' | 'search' | 'admin';
  adminSubPath?: string;
  categories?: Category[];
}): string {
  const { city, categoryId, subcategoryId, listing, action, adminSubPath, categories = [] } = options;

  // 1. Admin Urls
  if (action === 'admin') {
    return adminSubPath ? `/admin/${adminSubPath.replace(/^\/admin\/?/, '')}` : '/admin';
  }

  // 2. Post / Sell Urls
  if (action === 'post') {
    if (city && city !== 'All India') {
      const citySlug = slugify(city);
      const geoId = getCityGeoId(citySlug);
      return `/${citySlug}_${geoId}/post`;
    }
    return '/post';
  }

  // 3. Search Urls
  if (action === 'search') {
    return '/search';
  }

  // 4. Listing detail Urls (e.g. /mumbai_g4058997/item/hyundai-creta-sx-o-turbo-petrol-iid-lst_1001)
  if (listing) {
    const cityName = listing.location.city || city || 'Mumbai';
    const citySlug = slugify(cityName);
    const geoId = getCityGeoId(citySlug);
    const titleSlug = slugify(listing.title);
    return `/${citySlug}_${geoId}/item/${titleSlug}-iid-${listing.id}`;
  }

  // 5. City & Category Urls (e.g. /mumbai_g4058997 or /mumbai_g4058997/cars_c84)
  const cityName = city && city !== 'All India' ? city : 'All India';
  const citySlug = slugify(cityName);

  let locationSegment = '';
  if (cityName !== 'All India') {
    const geoId = getCityGeoId(citySlug);
    locationSegment = `${citySlug}_${geoId}`;
  }

  let catSegment = '';
  let subCatSegment = '';

  if (categoryId && categoryId !== 'all') {
    const catObj = categories.find((c) => c.id === categoryId);
    if (catObj) {
      const catSlug = catObj.slug || slugify(catObj.name);
      const catCode = getCategoryCode(catSlug, catObj.id);
      catSegment = `${catSlug}_${catCode}`;
    }
  }

  if (subcategoryId && subcategoryId !== 'all') {
    const subCatObj = categories.find((c) => c.id === subcategoryId);
    if (subCatObj) {
      const subCatSlug = subCatObj.slug || slugify(subCatObj.name);
      const subCatCode = getCategoryCode(subCatSlug, subCatObj.id);
      subCatSegment = `${subCatSlug}_${subCatCode}`;
    }
  }

  if (!locationSegment) {
    if (catSegment && subCatSegment) {
      return `/${catSegment}/${subCatSegment}`;
    }
    if (catSegment) {
      return `/${catSegment}`;
    }
    if (subCatSegment) {
      return `/${subCatSegment}`;
    }
    return '/';
  }

  if (catSegment && subCatSegment) {
    return `/${locationSegment}/${catSegment}/${subCatSegment}`;
  }
  if (catSegment) {
    return `/${locationSegment}/${catSegment}`;
  }
  if (subCatSegment) {
    return `/${locationSegment}/${subCatSegment}`;
  }

  return `/${locationSegment}`;
}

/**
 * Dynamically updates document canonical link tag, title, and OpenGraph SEO meta tags
 */
export function updateSeoAndCanonical(
  parsedRoute: ParsedRoute,
  options: {
    listing?: Listing | null;
    categories?: Category[];
    siteName?: string;
  }
): void {
  const { listing, categories = [], siteName = 'Chillyads' } = options;

  // 1. Build canonical absolute URL without hash
  const origin = window.location.origin;
  const pathName = window.location.pathname;
  const canonicalUrl = `${origin}${pathName === '/' ? '' : pathName}${window.location.search}`;

  // Update or inject <link rel="canonical"> tag
  let canonicalEl = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonicalEl) {
    canonicalEl = document.createElement('link');
    canonicalEl.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalEl);
  }
  canonicalEl.setAttribute('href', canonicalUrl);

  // 2. Construct Page Title and Meta Description
  let pageTitle = `${siteName} - Buy & Sell Second Hand Items`;
  let metaDesc = `Commercial-grade Chillyads classifieds marketplace. Find cars, mobile phones, real estate, electronics, jobs and services.`;

  const cityLabel = parsedRoute.city && parsedRoute.city !== 'All India' ? parsedRoute.city : 'India';

  if (parsedRoute.routeType === 'listing' && listing) {
    const priceFormatted = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(listing.price);

    pageTitle = `${listing.title} in ${listing.location.locality ? `${listing.location.locality}, ` : ''}${listing.location.city} | ${priceFormatted} - ${siteName}`;
    metaDesc = `${listing.description.substring(0, 150)}... Buy ${listing.title} for ${priceFormatted} in ${listing.location.city}. Direct contact with verified seller ${listing.sellerName}.`;
  } else if (parsedRoute.routeType === 'category') {
    let catName = 'Classifieds';
    if (parsedRoute.subcategoryId !== 'all') {
      const sub = categories.find((c) => c.id === parsedRoute.subcategoryId);
      if (sub) catName = sub.name;
    } else if (parsedRoute.categoryId !== 'all') {
      const cat = categories.find((c) => c.id === parsedRoute.categoryId);
      if (cat) catName = cat.name;
    }

    pageTitle = `${catName} in ${cityLabel} - Buy & Sell Second Hand ${catName} | ${siteName}`;
    metaDesc = `Find the best deals on ${catName} in ${cityLabel}. Browse thousands of verified ads, compare prices, and connect with local buyers & sellers on ${siteName}.`;
  } else if (parsedRoute.routeType === 'city') {
    pageTitle = `Chillyads ${parsedRoute.city} - Buy & Sell Cars, Mobiles, Apartments & Services in ${parsedRoute.city}`;
    metaDesc = `Discover local classified ads in ${parsedRoute.city}. Buy and sell second hand cars, mobile phones, laptops, homes, jobs and services in ${parsedRoute.city} on ${siteName}.`;
  } else if (parsedRoute.routeType === 'post') {
    pageTitle = `Post Free Ad in ${cityLabel} - Sell Quickly on ${siteName}`;
    metaDesc = `Post a free classified ad in ${cityLabel}. Reach millions of interested local buyers for cars, mobiles, real estate, electronics and services.`;
  } else if (parsedRoute.routeType === 'admin') {
    pageTitle = `Admin Workspace - ${siteName} Control Panel`;
    metaDesc = `Administrative dashboard for managing marketplace listings, user KYC verifications, category hierarchies, and monetization.`;
  }

  // Set document title
  document.title = pageTitle;

  // Helper to set or update meta tag
  const setMetaTag = (selector: string, attrName: string, attrVal: string, content: string) => {
    let el = document.querySelector<HTMLMetaElement>(selector);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attrName, attrVal);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };

  setMetaTag('meta[name="description"]', 'name', 'description', metaDesc);
  setMetaTag('meta[property="og:title"]', 'property', 'og:title', pageTitle);
  setMetaTag('meta[property="og:description"]', 'property', 'og:description', metaDesc);
  setMetaTag('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
  setMetaTag('meta[property="og:type"]', 'property', 'og:type', listing ? 'product' : 'website');
  setMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title', pageTitle);
  setMetaTag('meta[name="twitter:description"]', 'name', 'twitter:description', metaDesc);

  // 3. Inject Schema.org JSON-LD structured data
  let schemaData: object = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteName,
    url: origin,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${origin}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  if (parsedRoute.routeType === 'listing' && listing) {
    schemaData = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: listing.title,
      description: listing.description,
      image: listing.images,
      offers: {
        '@type': 'Offer',
        price: listing.price,
        priceCurrency: 'INR',
        availability: listing.status === 'sold' ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
        seller: {
          '@type': 'Person',
          name: listing.sellerName,
        },
      },
    };
  }

  let scriptEl = document.getElementById('schema-jsonld') as HTMLScriptElement | null;
  if (!scriptEl) {
    scriptEl = document.createElement('script');
    scriptEl.id = 'schema-jsonld';
    scriptEl.type = 'application/ld+json';
    document.head.appendChild(scriptEl);
  }
  scriptEl.textContent = JSON.stringify(schemaData, null, 2);
}
