/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as addresses from "../addresses.js";
import type * as auth from "../auth.js";
import type * as cart from "../cart.js";
import type * as dashboard from "../dashboard.js";
import type * as emails from "../emails.js";
import type * as http from "../http.js";
import type * as lib_pricing from "../lib/pricing.js";
import type * as lib_settings from "../lib/settings.js";
import type * as orders from "../orders.js";
import type * as productSearch from "../productSearch.js";
import type * as products from "../products.js";
import type * as profile from "../profile.js";
import type * as seed from "../seed.js";
import type * as slugs from "../slugs.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  addresses: typeof addresses;
  auth: typeof auth;
  cart: typeof cart;
  dashboard: typeof dashboard;
  emails: typeof emails;
  http: typeof http;
  "lib/pricing": typeof lib_pricing;
  "lib/settings": typeof lib_settings;
  orders: typeof orders;
  productSearch: typeof productSearch;
  products: typeof products;
  profile: typeof profile;
  seed: typeof seed;
  slugs: typeof slugs;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
};
