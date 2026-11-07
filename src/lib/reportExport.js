// Downloads filtered reports as CSV or PDF.
// This code runs only when the user selects an export button.
import { jsPDF } from "jspdf";

// Prevents spreadsheet applications from treating text as a formula.
function csvCell(value) {
  let text = String(value ?? "").replace(/\r\n?/g, "\n");
  if (/^\s*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function downloadCsv(headers, rows, filename) {
  const lines = [headers, ...rows].map(row => row.map(csvCell).join(","));
  const blob = new Blob(["\uFEFF", lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Standard PDF fonts do not support every special character.
function pdfText(value) {
  return String(value ?? "-")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2012-\u2015]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[^\x20-\x7E]/g, "?");
}

export function downloadPdf({ title, subtitle, headers, rows, filters, totals, filename }) {
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const left = 14;
  const top = 17;
  const bottom = 192;
  const valueX = 57;
  const textWidth = 226;
  let y = top;

  function newPage() {
    pdf.addPage();
    y = top;
  }

  function ensureSpace(height) {
    if (y + height > bottom) newPage();
  }

  function labelValue(label, value) {
    const lines = pdf.splitTextToSize(pdfText(value), textWidth);
    const output = lines.length ? lines : ["-"];
    for (let i = 0; i < output.length; i += 1) {
      ensureSpace(5.2);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(70, 80, 99);
      if (i === 0) pdf.text(pdfText(label).slice(0, 34), left + 4, y);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(25, 35, 55);
      pdf.text(output[i], valueX, y);
      y += 4.6;
    }
  }

  pdf.setFillColor(17, 29, 51);
  pdf.rect(0, 0, 297, 28, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(16);
  pdf.text(pdfText(title), left, 14);
  pdf.setFontSize(9);
  pdf.text("SuppIT | Filtered report", left, 21);
  y = 38;
  pdf.setFontSize(9);
  pdf.setTextColor(35, 48, 71);
  labelValue("Report", subtitle || "Records matching current filters");
  labelValue("Created", new Date().toLocaleString("en-ZA"));
  labelValue("Records", String(rows.length));
  if (filters) labelValue("Filters", filters);
  if (totals) labelValue("Totals", totals);
  y += 5;

  pdf.setFontSize(8.5);
  rows.forEach((row, index) => {
    ensureSpace(12);
    pdf.setDrawColor(214, 222, 233);
    pdf.line(left, y, 283, y);
    y += 6;
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(23, 55, 102);
    pdf.text(`Record ${index + 1}`, left + 4, y);
    y += 6;
    headers.forEach((header, i) => labelValue(header, row[i]));
    y += 3;
  });

  // Adds page numbers after the report has been laid out.
  const pages = pdf.getNumberOfPages();
  for (let p = 1; p <= pages; p += 1) {
    pdf.setPage(p);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(100, 110, 125);
    pdf.text(`${pdfText(title)} | Page ${p} of ${pages}`, left, 202);
  }
  pdf.save(filename);
}
