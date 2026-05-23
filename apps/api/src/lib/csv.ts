export function escapeField(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\r\n]/u.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

export function toCsv(
  columns: readonly string[],
  rows: Record<string, unknown>[]
): string {
  const header = [...columns].join(",");
  const body = rows
    .map((row) => [...columns].map((col) => escapeField(row[col])).join(","))
    .join("\n");
  return `${header}\n${body}`;
}
