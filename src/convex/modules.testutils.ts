/// <reference types="vite/client" />
// convex-test needs the function modules globbed from the Convex root, so the glob lives here.
export const modules = import.meta.glob('./**/*.ts');
export const authModules = import.meta.glob('./betterAuth/**/*.ts');
