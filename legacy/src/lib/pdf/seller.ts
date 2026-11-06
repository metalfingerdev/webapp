// src/lib/pdf/seller.ts
//
// The seller / letterhead details printed on every document. Centralised here
// so the company address or GSTIN only ever changes in one place.
export const SELLER = {
	name: 'Aggarwal Books And Stationery Mart',
	addressLines: ['SCF-119, HUDA Market Part-1, Sector-19', 'Faridabad ( NCR )-121002'],
	gstin: '06AHUPT7589A1ZM'
} as const;
