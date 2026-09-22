import { useState, useEffect, useCallback } from 'react';

export interface RouteInfo {
  path: string;
  params: Record<string, string>;
  search: string;
  query: Record<string, string>;
}

/**
 * Extracts normalized path and query parameters from window.location or pathname string
 */
export function parsePath(rawPathAndSearch?: string): { path: string; query: Record<string, string> } {
  let raw = rawPathAndSearch;
  if (!raw) {
    raw = window.location.pathname + window.location.search;
  }
  // Strip hash if present
  if (raw.includes('#')) {
    raw = raw.split('#')[0];
  }
  if (!raw.startsWith('/')) {
    raw = '/' + raw;
  }

  const [pathPart, queryPart] = raw.split('?');
  const query: Record<string, string> = {};

  if (queryPart) {
    const searchParams = new URLSearchParams(queryPart);
    searchParams.forEach((val, key) => {
      query[key] = val;
    });
  }

  return { path: pathPart || '/', query };
}

/**
 * Centralized HTML5 history navigation helper to change URL path without full page reloads.
 * Updates address bar with clean URLs like /mumbai_g4058997 or /mumbai_g4058997/cars_c84
 */
export function navigateTo(targetUrl: string) {
  let cleanUrl = targetUrl;
  if (cleanUrl.startsWith('#')) {
    cleanUrl = cleanUrl.replace(/^#\/?/, '/');
  }
  if (!cleanUrl.startsWith('/')) {
    cleanUrl = '/' + cleanUrl;
  }

  const currentFull = window.location.pathname + window.location.search;
  if (currentFull !== cleanUrl) {
    window.history.pushState({}, '', cleanUrl);
  }
  // Always dispatch popstate event so all active listeners react instantly
  window.dispatchEvent(new PopStateEvent('popstate'));
}

/**
 * Hook to reactively track HTML5 history path changes and provide navigation capabilities
 */
export function useRouter() {
  const [currentUrl, setCurrentUrl] = useState<string>(
    () => window.location.pathname + window.location.search
  );

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentUrl(window.location.pathname + window.location.search);
    };

    window.addEventListener('popstate', handleLocationChange);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  const { path, query } = parsePath(currentUrl);

  const navigate = useCallback((url: string) => {
    navigateTo(url);
  }, []);

  return {
    path,
    query,
    navigate,
    navigateTo,
  };
}
