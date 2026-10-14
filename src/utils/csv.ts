/**
 * Minimal RFC-4180 CSV helpers. Zero dependencies.
 * Handles quoting, embedded commas, newlines, and escaped quotes.
 */

export function csvEscape(value: unknown): string {
	if (value === null || value === undefined) return "";
	const str = String(value);
	if (/[",\n\r]/.test(str)) {
		return `"${str.replace(/"/g, '""')}"`;
	}
	return str;
}

export function toCsv<T extends Record<string, unknown>>(
	rows: T[],
	columns: { key: keyof T; header: string }[],
): string {
	const header = columns.map((c) => csvEscape(c.header)).join(",");
	const body = rows
		.map((row) => columns.map((c) => csvEscape(row[c.key])).join(","))
		.join("\n");
	return `${header}\n${body}`;
}

/**
 * Very small CSV parser. Supports:
 *  - quoted fields
 *  - embedded commas and newlines
 *  - escaped quotes ("")
 *  - CRLF and LF line endings
 *
 * Returns an array of row objects keyed by the header row.
 */
export function parseCsv(input: string): Record<string, string>[] {
	const rows: string[][] = [];
	let row: string[] = [];
	let field = "";
	let inQuotes = false;
	let i = 0;

	const pushField = () => {
		row.push(field);
		field = "";
	};

	const pushRow = () => {
		pushField();
		// Skip completely empty trailing rows
		if (row.length > 1 || row[0] !== "") rows.push(row);
		row = [];
	};

	while (i < input.length) {
		const ch = input[i];

		if (inQuotes) {
			if (ch === '"') {
				if (input[i + 1] === '"') {
					field += '"';
					i += 2;
					continue;
				}
				inQuotes = false;
				i++;
				continue;
			}
			field += ch;
			i++;
			continue;
		}

		if (ch === '"') {
			inQuotes = true;
			i++;
			continue;
		}
		if (ch === ",") {
			pushField();
			i++;
			continue;
		}
		if (ch === "\r") {
			i++;
			continue;
		}
		if (ch === "\n") {
			pushRow();
			i++;
			continue;
		}
		field += ch;
		i++;
	}

	// Last field / row
	if (field.length > 0 || row.length > 0) pushRow();

	if (rows.length === 0) return [];

	const [headerRow, ...dataRows] = rows;
	const headers = headerRow.map((h) => h.trim());

	return dataRows.map((r) => {
		const obj: Record<string, string> = {};
		headers.forEach((h, idx) => {
			obj[h] = (r[idx] ?? "").trim();
		});
		return obj;
	});
}
