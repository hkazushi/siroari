"use client";

function cell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Excel で文字化けしないよう UTF-8 BOM 付きで CSV をダウンロード */
export function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  const text = "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n");
  downloadBlob(filename, new Blob([text], { type: "text/csv;charset=utf-8" }));
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
