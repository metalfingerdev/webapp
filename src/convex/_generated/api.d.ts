/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin_mutations from "../admin/mutations.js";
import type * as admin_queries from "../admin/queries.js";
import type * as auth from "../auth.js";
import type * as deviceAuthorization from "../deviceAuthorization.js";
import type * as email from "../email.js";
import type * as http from "../http.js";
import type * as migrations from "../migrations.js";
import type * as model_admin_index from "../model/admin/index.js";
import type * as model_admin_roles from "../model/admin/roles.js";
import type * as model_auth_linkedEmail from "../model/auth/linkedEmail.js";
import type * as model_emails_rateLimits from "../model/emails/rateLimits.js";
import type * as model_emails_templates_baseEmail from "../model/emails/templates/baseEmail.js";
import type * as model_emails_templates_emailTemplates from "../model/emails/templates/emailTemplates.js";
import type * as model_emails_validateEmail from "../model/emails/validateEmail.js";
import type * as model_organizations_index from "../model/organizations/index.js";
import type * as model_store_access from "../model/store/access.js";
import type * as model_store_cart from "../model/store/cart.js";
import type * as model_store_catalog from "../model/store/catalog.js";
import type * as model_store_checkout from "../model/store/checkout.js";
import type * as model_store_classes from "../model/store/classes.js";
import type * as model_store_couriers from "../model/store/couriers.js";
import type * as model_store_delivery from "../model/store/delivery.js";
import type * as model_store_importPlan from "../model/store/importPlan.js";
import type * as model_store_invoices from "../model/store/invoices.js";
import type * as model_store_orderDocument from "../model/store/orderDocument.js";
import type * as model_store_orders from "../model/store/orders.js";
import type * as model_store_paymentWebhook from "../model/store/paymentWebhook.js";
import type * as model_store_payments from "../model/store/payments.js";
import type * as model_store_pricing from "../model/store/pricing.js";
import type * as model_store_products from "../model/store/products.js";
import type * as model_store_publicProjection from "../model/store/publicProjection.js";
import type * as model_store_rateLimits from "../model/store/rateLimits.js";
import type * as model_store_razorpay from "../model/store/razorpay.js";
import type * as model_store_refunds from "../model/store/refunds.js";
import type * as model_store_schools from "../model/store/schools.js";
import type * as model_store_setRules from "../model/store/setRules.js";
import type * as model_store_setSelection from "../model/store/setSelection.js";
import type * as model_store_shippedEmail from "../model/store/shippedEmail.js";
import type * as model_store_stock from "../model/store/stock.js";
import type * as model_store_storeProfile from "../model/store/storeProfile.js";
import type * as organizations_invitations_queries from "../organizations/invitations/queries.js";
import type * as organizations_members_mutations from "../organizations/members/mutations.js";
import type * as organizations_mutations from "../organizations/mutations.js";
import type * as organizations_queries from "../organizations/queries.js";
import type * as otp_channels_console from "../otp/channels/console.js";
import type * as otp_channels_fast2sms from "../otp/channels/fast2sms.js";
import type * as otp_channels_index from "../otp/channels/index.js";
import type * as otp_channels_textbee from "../otp/channels/textbee.js";
import type * as otp_channels_whatsapp from "../otp/channels/whatsapp.js";
import type * as otp_config from "../otp/config.js";
import type * as otp_deliveries from "../otp/deliveries.js";
import type * as otp_phone from "../otp/phone.js";
import type * as otp_rateLimits from "../otp/rateLimits.js";
import type * as otp_send from "../otp/send.js";
import type * as otp_truecaller from "../otp/truecaller.js";
import type * as otp_types from "../otp/types.js";
import type * as storage from "../storage.js";
import type * as store_access from "../store/access.js";
import type * as store_addresses from "../store/addresses.js";
import type * as store_admin_documents from "../store/admin/documents.js";
import type * as store_admin_import from "../store/admin/import.js";
import type * as store_admin_orders from "../store/admin/orders.js";
import type * as store_admin_payments from "../store/admin/payments.js";
import type * as store_admin_products from "../store/admin/products.js";
import type * as store_admin_schools from "../store/admin/schools.js";
import type * as store_admin_sets from "../store/admin/sets.js";
import type * as store_admin_settings from "../store/admin/settings.js";
import type * as store_admin_stock from "../store/admin/stock.js";
import type * as store_admin_zones from "../store/admin/zones.js";
import type * as store_cart from "../store/cart.js";
import type * as store_catalog from "../store/catalog.js";
import type * as store_checkout from "../store/checkout.js";
import type * as store_orders from "../store/orders.js";
import type * as store_payments from "../store/payments.js";
import type * as store_seed from "../store/seed.js";
import type * as store_sets from "../store/sets.js";
import type * as store_validators from "../store/validators.js";
import type * as url from "../url.js";
import type * as users_actions from "../users/actions.js";
import type * as users_mutations from "../users/mutations.js";
import type * as users_queries from "../users/queries.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "admin/mutations": typeof admin_mutations;
  "admin/queries": typeof admin_queries;
  auth: typeof auth;
  deviceAuthorization: typeof deviceAuthorization;
  email: typeof email;
  http: typeof http;
  migrations: typeof migrations;
  "model/admin/index": typeof model_admin_index;
  "model/admin/roles": typeof model_admin_roles;
  "model/auth/linkedEmail": typeof model_auth_linkedEmail;
  "model/emails/rateLimits": typeof model_emails_rateLimits;
  "model/emails/templates/baseEmail": typeof model_emails_templates_baseEmail;
  "model/emails/templates/emailTemplates": typeof model_emails_templates_emailTemplates;
  "model/emails/validateEmail": typeof model_emails_validateEmail;
  "model/organizations/index": typeof model_organizations_index;
  "model/store/access": typeof model_store_access;
  "model/store/cart": typeof model_store_cart;
  "model/store/catalog": typeof model_store_catalog;
  "model/store/checkout": typeof model_store_checkout;
  "model/store/classes": typeof model_store_classes;
  "model/store/couriers": typeof model_store_couriers;
  "model/store/delivery": typeof model_store_delivery;
  "model/store/importPlan": typeof model_store_importPlan;
  "model/store/invoices": typeof model_store_invoices;
  "model/store/orderDocument": typeof model_store_orderDocument;
  "model/store/orders": typeof model_store_orders;
  "model/store/paymentWebhook": typeof model_store_paymentWebhook;
  "model/store/payments": typeof model_store_payments;
  "model/store/pricing": typeof model_store_pricing;
  "model/store/products": typeof model_store_products;
  "model/store/publicProjection": typeof model_store_publicProjection;
  "model/store/rateLimits": typeof model_store_rateLimits;
  "model/store/razorpay": typeof model_store_razorpay;
  "model/store/refunds": typeof model_store_refunds;
  "model/store/schools": typeof model_store_schools;
  "model/store/setRules": typeof model_store_setRules;
  "model/store/setSelection": typeof model_store_setSelection;
  "model/store/shippedEmail": typeof model_store_shippedEmail;
  "model/store/stock": typeof model_store_stock;
  "model/store/storeProfile": typeof model_store_storeProfile;
  "organizations/invitations/queries": typeof organizations_invitations_queries;
  "organizations/members/mutations": typeof organizations_members_mutations;
  "organizations/mutations": typeof organizations_mutations;
  "organizations/queries": typeof organizations_queries;
  "otp/channels/console": typeof otp_channels_console;
  "otp/channels/fast2sms": typeof otp_channels_fast2sms;
  "otp/channels/index": typeof otp_channels_index;
  "otp/channels/textbee": typeof otp_channels_textbee;
  "otp/channels/whatsapp": typeof otp_channels_whatsapp;
  "otp/config": typeof otp_config;
  "otp/deliveries": typeof otp_deliveries;
  "otp/phone": typeof otp_phone;
  "otp/rateLimits": typeof otp_rateLimits;
  "otp/send": typeof otp_send;
  "otp/truecaller": typeof otp_truecaller;
  "otp/types": typeof otp_types;
  storage: typeof storage;
  "store/access": typeof store_access;
  "store/addresses": typeof store_addresses;
  "store/admin/documents": typeof store_admin_documents;
  "store/admin/import": typeof store_admin_import;
  "store/admin/orders": typeof store_admin_orders;
  "store/admin/payments": typeof store_admin_payments;
  "store/admin/products": typeof store_admin_products;
  "store/admin/schools": typeof store_admin_schools;
  "store/admin/sets": typeof store_admin_sets;
  "store/admin/settings": typeof store_admin_settings;
  "store/admin/stock": typeof store_admin_stock;
  "store/admin/zones": typeof store_admin_zones;
  "store/cart": typeof store_cart;
  "store/catalog": typeof store_catalog;
  "store/checkout": typeof store_checkout;
  "store/orders": typeof store_orders;
  "store/payments": typeof store_payments;
  "store/seed": typeof store_seed;
  "store/sets": typeof store_sets;
  "store/validators": typeof store_validators;
  url: typeof url;
  "users/actions": typeof users_actions;
  "users/mutations": typeof users_mutations;
  "users/queries": typeof users_queries;
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
  resend: import("@convex-dev/resend/_generated/component.js").ComponentApi<"resend">;
  betterAuth: import("../betterAuth/_generated/component.js").ComponentApi<"betterAuth">;
  migrations: import("@convex-dev/migrations/_generated/component.js").ComponentApi<"migrations">;
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
};
