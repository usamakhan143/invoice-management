/**
 * Minimal, dependency-free CSV writer for exporting reports.
 *
 * - RFC 4180 quoting: fields containing comma, quote, or newline are wrapped in
 *   double quotes with internal quotes doubled.
 * - A leading UTF-8 BOM is added so Excel opens UTF-8 content correctly.
 * - Values are coerced to string; null/undefined become empty cells.
 */

export type CsvCell = string | number | boolean | null | undefined;

function escapeCell(value: CsvCell): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Build a CSV string from a header row and data rows. */
export function buildCsv(headers: string[], rows: CsvCell[][]): string {
  const lines: string[] = [];
  lines.push(headers.map(escapeCell).join(","));
  for (const row of rows) {
    lines.push(row.map(escapeCell).join(","));
  }
  return lines.join("\r\n");
}

/** Build a CSV and trigger a browser download. */
export function downloadCsv(
  filename: string,
  headers: string[],
  rows: CsvCell[][],
): void {
  const csv = buildCsv(headers, rows);
  // BOM helps Excel detect UTF-8.
  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
