/* IFMIS invoice number generator — uses the live Master Data numbering
   format config, falling back to the legacy INV-YYYY-NNNNN format. */
import { formatInvoiceNumber, loadInvoiceNumberingFormat } from "../../../../masterData/storage";

export function generateIfmisNumber(channel?: string, contractCategory?: string): string {
  const cfg = loadInvoiceNumberingFormat();
  const seq = String(Math.floor(Math.random() * 900000) + 100000);
  if (!cfg.active) return `INV-${new Date().getFullYear()}-${seq}`;
  const ctype =
    contractCategory && /work/i.test(contractCategory)
      ? "WRK"
      : contractCategory && /serv/i.test(contractCategory)
        ? "SRV"
        : "GDS";
  return formatInvoiceNumber(cfg, { seq, channel, contractTypePrefix: ctype });
}
