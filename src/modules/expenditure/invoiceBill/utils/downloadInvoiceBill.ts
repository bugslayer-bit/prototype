/* ═══════════════════════════════════════════════════════════════════════════
   downloadInvoiceBill — printable + JSON export utilities
   ────────────────────────────────────────────────────────
   Generates a self-contained HTML receipt for an Invoice & Bill record and
   either:
     • opens it in a new tab triggering the browser's "Save as PDF" dialog
       (printAsPdf), or
     • downloads it as a standalone .html file (downloadHtml), or
     • downloads the raw record as a .json file (downloadJson).

   No external libraries — uses only the DOM and Blob APIs so the bundle
   stays slim. The HTML output is print-optimised (A4 page, mono table grid,
   page-break safe).
   ═══════════════════════════════════════════════════════════════════════════ */
import type { StoredInvoiceBill } from "../types";

/* ── helpers ─────────────────────────────────────────────────────────────── */
const fmtNum = (v: string | number | undefined) => {
  const n = Number(v ?? 0);
  if (!isFinite(n)) return "0";
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const safe = (v: string | undefined | null) => (v && v.trim() ? v : "—");

const escapeHtml = (s: unknown): string =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // give the browser a tick to start the download before revoking
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/* Build a filesystem-safe filename rooted in the contract identity rather
   than the auto-generated record/invoice id. Falls back gracefully when a
   field is missing. Order of preference:
     1. Contract ID + Contractor Name
     2. Contract ID alone
     3. Contractor Name alone
     4. Invoice Number
     5. Record ID
     6. literal "invoice-bill"                                              */
const buildContractFilename = (record: StoredInvoiceBill): string => {
  const inv = record.invoice;
  const slug = (s: string | undefined | null) =>
    (s ?? "")
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

  const contract = slug(inv.contractId);
  const vendor = slug(inv.contractorName);

  const parts = [contract, vendor].filter(Boolean);
  if (parts.length) return parts.join("_");
  return slug(inv.invoiceNumber) || slug(record.recordId) || "invoice-bill";
};

/* ── HTML builder ────────────────────────────────────────────────────────── */
export function buildInvoiceBillHtml(record: StoredInvoiceBill): string {
  const inv = record.invoice;
  const bill = record.bill;
  const goods = record.goodsRows ?? [];
  const works = record.worksRows ?? [];
  const services = record.servicesRows ?? [];
  const taxes = record.taxRows ?? [];
  const generatedAt = new Date().toLocaleString();

  const headerBlock = `
    <table class="kv">
      <tr><td class="lbl">Invoice Number</td><td>${escapeHtml(safe(inv.invoiceNumber))}</td>
          <td class="lbl">Invoice Date</td><td>${escapeHtml(safe(inv.invoiceDate))}</td></tr>
      <tr><td class="lbl">Contract ID</td><td>${escapeHtml(safe(inv.contractId))}</td>
          <td class="lbl">Milestone ID</td><td>${escapeHtml(safe(inv.milestoneId))}</td></tr>
      <tr><td class="lbl">Contractor</td><td>${escapeHtml(safe(inv.contractorName))}</td>
          <td class="lbl">Contractor ID</td><td>${escapeHtml(safe(inv.contractorId))}</td></tr>
      <tr><td class="lbl">Submitted By</td><td>${escapeHtml(safe(inv.contactName))}</td>
          <td class="lbl">Agency</td><td>${escapeHtml(safe(inv.agencyName))}</td></tr>
      <tr><td class="lbl">Currency</td><td>${escapeHtml(safe(inv.currency))}</td>
          <td class="lbl">Channel</td><td>${escapeHtml(safe(inv.submissionChannel))}</td></tr>
      <tr><td class="lbl">Invoice Status</td><td>${escapeHtml(safe(inv.invoiceStatus))}</td>
          <td class="lbl">Bill Status</td><td>${escapeHtml(safe(bill.billStatus))}</td></tr>
    </table>
  `;

  const billHeaderBlock = `
    <table class="kv">
      <tr><td class="lbl">Bill ID</td><td>${escapeHtml(safe(bill.billId))}</td>
          <td class="lbl">Bill Date</td><td>${escapeHtml(safe(bill.billDate))}</td></tr>
      <tr><td class="lbl">Bill Category</td><td>${escapeHtml(safe(bill.billCategory))}</td>
          <td class="lbl">Sub-Category</td><td>${escapeHtml(safe(bill.billSubCategory))}</td></tr>
    </table>
  `;

  const totalsBlock = `
    <table class="totals">
      <tr><th>Bill Gross</th><td>${fmtNum(bill.billAmountGross)}</td></tr>
      <tr><th>Tax Amount</th><td>${fmtNum(bill.taxAmount)}</td></tr>
      <tr><th>Deductions</th><td>${fmtNum(bill.deductionAmount)}</td></tr>
      <tr><th>Retention</th><td>${fmtNum(bill.retentionAmount)}</td></tr>
      <tr class="grand"><th>NET PAYABLE</th><td>${fmtNum(bill.netPayableAmount || inv.netPayableAmount)}</td></tr>
    </table>
  `;

  const goodsTable = goods.length
    ? `
      <h3>Goods Detail (16.2)</h3>
      <table class="grid">
        <thead><tr>
          <th>#</th><th>Item</th><th class="num">Qty (Inv)</th><th class="num">Rate</th><th class="num">Amount</th>
        </tr></thead>
        <tbody>
          ${goods
            .map(
              (g, i) => `<tr>
              <td>${i + 1}</td>
              <td>${escapeHtml(safe(g.itemName))}</td>
              <td class="num">${fmtNum(g.itemQuantityInvoice)}</td>
              <td class="num">${fmtNum(g.itemRateInvoice)}</td>
              <td class="num">${fmtNum(g.itemAmountInvoice)}</td>
            </tr>`,
            )
            .join("")}
        </tbody>
      </table>`
    : "";

  const worksTable = works.length
    ? `
      <h3>Works Detail (16.3)</h3>
      <table class="grid">
        <thead><tr>
          <th>#</th><th>Work Item</th><th>Description</th>
          <th class="num">Qty Done</th><th class="num">Rate</th><th class="num">Amount</th><th class="num">% Complete</th>
        </tr></thead>
        <tbody>
          ${works
            .map(
              (w, i) => `<tr>
              <td>${i + 1}</td>
              <td>${escapeHtml(safe(w.workItemCode))}</td>
              <td>${escapeHtml(safe(w.workDescription))}</td>
              <td class="num">${fmtNum(w.workCompletedCurrent)}</td>
              <td class="num">${fmtNum(w.workRateContract)}</td>
              <td class="num">${fmtNum(w.workAmountCurrent)}</td>
              <td class="num">${fmtNum(w.workCompletionPercentage)}</td>
            </tr>`,
            )
            .join("")}
        </tbody>
      </table>`
    : "";

  const servicesTable = services.length
    ? `
      <h3>Services Detail (16.4)</h3>
      <table class="grid">
        <thead><tr>
          <th>#</th><th>Description</th><th>From</th><th>To</th>
          <th class="num">Days</th><th class="num">Rate</th><th class="num">Amount</th>
        </tr></thead>
        <tbody>
          ${services
            .map(
              (s, i) => `<tr>
              <td>${i + 1}</td>
              <td>${escapeHtml(safe(s.serviceDescription))}</td>
              <td>${escapeHtml(safe(s.servicePeriodFrom))}</td>
              <td>${escapeHtml(safe(s.servicePeriodTo))}</td>
              <td class="num">${fmtNum(s.serviceDays)}</td>
              <td class="num">${fmtNum(s.serviceRate)}</td>
              <td class="num">${fmtNum(s.serviceAmount)}</td>
            </tr>`,
            )
            .join("")}
        </tbody>
      </table>`
    : "";

  const taxTable = taxes.length
    ? `
      <h3>Tax Detail (16.5)</h3>
      <table class="grid">
        <thead><tr>
          <th>#</th><th>Tax Code</th><th class="num">Base Amount</th><th class="num">Rate %</th><th class="num">Tax Amount</th>
        </tr></thead>
        <tbody>
          ${taxes
            .map(
              (t, i) => `<tr>
              <td>${i + 1}</td>
              <td>${escapeHtml(safe(t.taxCode))}</td>
              <td class="num">${fmtNum(t.taxBaseAmount)}</td>
              <td class="num">${fmtNum(t.taxRate)}</td>
              <td class="num">${fmtNum(t.taxAmount)}</td>
            </tr>`,
            )
            .join("")}
        </tbody>
      </table>`
    : "";

  const approvalSteps = (steps: typeof record.invoiceApprovalSteps, title: string) =>
    steps && steps.length
      ? `
      <h3>${escapeHtml(title)}</h3>
      <table class="grid">
        <thead><tr><th>Step</th><th>Role</th><th>Status</th><th>Approver</th><th>Decided At</th></tr></thead>
        <tbody>
          ${steps
            .map(
              (s) => `<tr>
              <td>${escapeHtml(safe(s.label))}</td>
              <td>${escapeHtml(safe(s.role))}</td>
              <td>${escapeHtml(safe(s.status))}</td>
              <td>${escapeHtml(safe(s.approverName))}</td>
              <td>${escapeHtml(safe(s.decidedAt))}</td>
            </tr>`,
            )
            .join("")}
        </tbody>
      </table>`
      : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Invoice & Bill — ${escapeHtml(safe(inv.invoiceNumber))}</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
         color: #0f172a; margin: 0; padding: 24px; background: #fff; font-size: 12px; }
  .doc { max-width: 880px; margin: 0 auto; }
  .top { display: flex; justify-content: space-between; align-items: flex-start;
         padding-bottom: 16px; border-bottom: 2px solid #2563eb; margin-bottom: 18px; }
  .top h1 { font-size: 22px; margin: 0 0 4px; color: #2563eb; letter-spacing: -0.01em; }
  .top p  { margin: 2px 0; color: #475569; font-size: 11px; }
  .badge  { display: inline-block; background: #dbeafe; color: #1d4ed8;
            padding: 4px 10px; border-radius: 999px; font-size: 10px;
            font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em;
       color: #475569; margin: 22px 0 8px; padding-bottom: 4px;
       border-bottom: 1px solid #e2e8f0; }
  h3 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em;
       color: #334155; margin: 16px 0 6px; }
  table { border-collapse: collapse; width: 100%; }
  table.kv td { padding: 6px 8px; vertical-align: top; font-size: 11px;
                border-bottom: 1px solid #f1f5f9; }
  table.kv td.lbl { width: 18%; font-weight: 600; color: #64748b;
                    text-transform: uppercase; font-size: 10px; letter-spacing: 0.04em; }
  table.grid { font-size: 11px; }
  table.grid th, table.grid td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; }
  table.grid th { background: #f8fafc; font-weight: 700; color: #334155;
                  text-transform: uppercase; font-size: 10px; letter-spacing: 0.04em; }
  table.grid td.num, table.grid th.num { text-align: right; font-variant-numeric: tabular-nums; }
  table.totals { width: 320px; margin-left: auto; margin-top: 16px; }
  table.totals th { text-align: left; padding: 6px 10px; font-size: 11px;
                    color: #475569; background: #f8fafc; border: 1px solid #e2e8f0; }
  table.totals td { text-align: right; padding: 6px 10px; font-size: 12px;
                    font-variant-numeric: tabular-nums; border: 1px solid #e2e8f0; }
  table.totals tr.grand th, table.totals tr.grand td {
       background: #2563eb; color: #fff; font-size: 13px; font-weight: 700;
       border-color: #2563eb; }
  .footer { margin-top: 28px; padding-top: 12px; border-top: 1px solid #e2e8f0;
            font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between; }
  .actions { display: flex; gap: 8px; margin-bottom: 16px; }
  .actions button { padding: 8px 14px; border-radius: 8px; border: 1px solid #cbd5e1;
                    background: #fff; font-weight: 600; cursor: pointer; font-size: 12px; }
  .actions button.primary { background: #2563eb; color: #fff; border-color: #2563eb; }
  @media print { .actions { display: none !important; } }
</style>
</head>
<body>
<div class="doc">
  <div class="actions">
    <button type="button" class="primary" onclick="window.print()">Save as PDF / Print</button>
    <button type="button" onclick="window.close()">Close</button>
  </div>

  <div class="top">
    <div>
      <h1>INVOICE &amp; BILL</h1>
      <p><strong>Royal Government of Bhutan — IFMIS</strong></p>
      <p>Expenditure Module · PRN 3 · Contract Management</p>
    </div>
    <div style="text-align:right">
      <span class="badge">${escapeHtml(safe(record.workflowStatus).replace(/-/g, " "))}</span>
      <p style="margin-top:8px; font-size:11px; color:#64748b">Record ID</p>
      <p style="margin:0; font-weight:700; font-size:13px">${escapeHtml(safe(record.recordId))}</p>
    </div>
  </div>

  <h2>Invoice Header (DD 15)</h2>
  ${headerBlock}

  <h2>Bill Header (DD 16.1)</h2>
  ${billHeaderBlock}

  ${goodsTable}
  ${worksTable}
  ${servicesTable}
  ${taxTable}

  <h2>Financial Summary</h2>
  ${totalsBlock}

  <h2>Approval Trail</h2>
  ${approvalSteps(record.invoiceApprovalSteps, "Invoice Approval Chain (PRN 3.1.3)")}
  ${approvalSteps(record.billApprovalSteps, "Bill Approval Chain (PRN 3.2.2)")}

  ${
    inv.remarks
      ? `<h2>Remarks</h2><p style="white-space:pre-wrap;">${escapeHtml(inv.remarks)}</p>`
      : ""
  }

  <div class="footer">
    <span>Generated ${escapeHtml(generatedAt)}</span>
    <span>IFMIS / Expenditure / Invoice &amp; Bill</span>
  </div>
</div>
</body>
</html>`;
}

/* ── public API ──────────────────────────────────────────────────────────── */

/** Open the printable HTML in a new tab and trigger the print dialog.
 *  The popup's <title> is overridden with a contract-based filename so the
 *  browser's "Save as PDF" dialog suggests it instead of the default
 *  invoice/record id. The print dialog is also triggered automatically. */
export function printAsPdf(record: StoredInvoiceBill): void {
  const filename = buildContractFilename(record);
  const html = buildInvoiceBillHtml(record).replace(
    /<title>[^<]*<\/title>/,
    `<title>${filename}</title>`,
  );
  const win = window.open("", "_blank", "noopener,noreferrer,width=900,height=1100");
  if (!win) {
    // pop-up blocked → fall back to a downloaded HTML file (named the same way)
    downloadHtml(record);
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  // Force the title once the document is parsed so Save-as-PDF picks it up,
  // then auto-trigger the print dialog after fonts/layout settle.
  const finalize = () => {
    try {
      win.document.title = filename;
      win.focus();
      win.print();
    } catch {
      /* ignore — user can still hit the in-page button */
    }
  };
  if (win.document.readyState === "complete") {
    setTimeout(finalize, 250);
  } else {
    win.addEventListener("load", () => setTimeout(finalize, 250));
  }
}

/** Download the printable receipt as a stand-alone .html file. */
export function downloadHtml(record: StoredInvoiceBill): void {
  const html = buildInvoiceBillHtml(record);
  const stamp = buildContractFilename(record);
  triggerDownload(new Blob([html], { type: "text/html;charset=utf-8" }), `${stamp}.html`);
}

/** Download the raw structured record as a JSON file (machine-readable backup). */
export function downloadJson(record: StoredInvoiceBill): void {
  const stamp = buildContractFilename(record);
  triggerDownload(
    new Blob([JSON.stringify(record, null, 2)], { type: "application/json" }),
    `${stamp}.json`,
  );
}
