// src/lib/products/index.ts
export * from './types.js';
export {
	inferCategory,
	makeDetails,
	parseCode,
	parseName,
	parsePrice,
	normalizeTax,
	validate,
	parseWorkbook,
	buildImportPayload
} from './import.js';
