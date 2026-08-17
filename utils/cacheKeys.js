/**
 * Centralized Redis cache key definitions.
 * Always use these constants — never hardcode key strings directly.
 */

export const CACHE_KEYS = {
    // Public product keys
    LANDING_PRODUCTS: "landing:products",
    PRODUCT_DETAIL: (id) => `product:detail:${id}`,
    PRODUCT_REVIEWS: (id) => `product:reviews:${id}`,
    SHOP_PRODUCTS: (queryString) => `shop:${queryString}`,

    // Category keys
    CATEGORIES_ACTIVE: "categories:active",
    CATEGORIES_ACTIVE_ALL: "categories:active:all",

    // Static content keys
    BANNERS_ACTIVE: "banners:active",
    OFFERS_ACTIVE: "offers:active",
    OFFERS_ACTIVE_LIST: "offers:active:list",
    BRANDS_ALL: "brands:all",
    ADMINS_ACTIVE: "admins:active",

    // Dashboard metrics keys
    DASHBOARD_SUPERADMIN: "dashboard:superadmin",
    DASHBOARD_VENDOR: (id) => `dashboard:vendor:${id}`,

    // Security & Auth keys
    JWT_BLACKLIST: (token) => `jwt:blacklist:${token}`,
};

/**
 * TTL values in seconds
 */
export const CACHE_TTL = {
    LANDING_PRODUCTS: 300,       // 5 minutes
    PRODUCT_DETAIL: 300,         // 5 minutes
    PRODUCT_REVIEWS: 300,        // 5 minutes
    SHOP_PRODUCTS: 180,          // 3 minutes
    CATEGORIES: 600,             // 10 minutes
    BANNERS: 1800,               // 30 minutes
    OFFERS: 300,                 // 5 minutes
    BRANDS: 1800,                // 30 minutes
    DASHBOARD: 300,              // 5 minutes
    JWT_BLACKLIST: 2592000,      // 30 days (covers extended token lifetimes)
};
