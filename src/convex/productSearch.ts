// Builds the denormalized `searchText` field that backs the `search_name`
// search index on the `products` table. Keep every insert/update of a product
// going through this so the search index stays in sync with the source fields.

type ProductSearchSource = {
	name: string;
	category: string;
	barcode?: string;
	hsnCode?: string;
	details:
		| { type: 'book'; author: string; subject: string }
		| { type: 'clothes'; gender: string; size: string; variant: string }
		| { type: 'stationary'; itemType: string };
};

export function buildSearchText(p: ProductSearchSource): string {
	const parts: string[] = [p.name, p.category];

	if (p.barcode) parts.push(p.barcode);
	if (p.hsnCode) parts.push(p.hsnCode);

	const d = p.details;
	switch (d.type) {
		case 'book':
			parts.push(d.author, d.subject);
			break;
		case 'clothes':
			parts.push(d.gender, d.size, d.variant);
			break;
		case 'stationary':
			parts.push(d.itemType);
			break;
	}

	return parts.filter(Boolean).join(' ');
}
