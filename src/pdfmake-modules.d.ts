// Ambient declarations for pdfmake's runtime entry points. @types/pdfmake ships
// types for these, but under the project's NodeNext module resolution the
// package subpaths don't resolve, so we declare the minimal shapes the dynamic
// imports in src/lib/pdf/pdf-core.ts rely on. The rich document-definition types
// still come from the `pdfmake` main entry (see src/lib/pdf/shared.ts).
declare module 'pdfmake/build/pdfmake' {
	const pdfMake: unknown;
	export default pdfMake;
}

declare module 'pdfmake/build/vfs_fonts' {
	const vfs: unknown;
	export default vfs;
}
