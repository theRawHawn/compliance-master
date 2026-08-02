import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { SalesInvoice, PurchaseInvoice } from '../types';
import { previousMonthYear } from './calculators/gstLateFeeCalculator';

if (typeof window !== 'undefined') {
  GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).toString();
}

export interface ParsedGstDocument {
  docType: 'GSTR1' | 'GSTR2B' | 'GSTR3B';
  fileName: string;
  totalRecords: number;
  totalTaxable: number;
  totalTax: number;
  salesInvoices: Omit<SalesInvoice, 'id'>[];
  purchaseInvoices: Omit<PurchaseInvoice, 'id'>[];
  gstr3bSummary?: {
    outwardTaxable: number;
    igst: number;
    cgst: number;
    sgst: number;
    itcIgst: number;
    itcCgst: number;
    itcSgst: number;
  };
  errors: string[];
  /** True only for illustrative sample data loaded via getDemoParsedData — never for a genuinely
   *  parsed upload. Consuming UI must use this to block importing sample records into a real
   *  company's live GST data. */
  isSampleData?: boolean;
}

function formatExcelDate(value: number): string {
  const serial = Number(value);
  if (!Number.isFinite(serial)) return '';
  if (serial < 59) return '';

  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400 * 1000;
  const date = new Date(utcValue);

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateValue(value: any): string {
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }

  if (typeof value === 'number') {
    return formatExcelDate(value);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return '';

    const normalized = trimmed.replace(/,/g, '');
    const numericMatch = normalized.match(/^(-?\d+(?:\.\d+)?)$/);
    if (numericMatch) {
      const numeric = Number(numericMatch[1]);
      if (Number.isFinite(numeric) && numeric > 59 && numeric < 50000) {
        return formatExcelDate(numeric);
      }
    }

    const isoMatch = normalized.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
      return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, '0')}-${String(parsed.getUTCDate()).padStart(2, '0')}`;
    }

    const dmyMatch = normalized.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
    if (dmyMatch) {
      const [, day, month, yearPart] = dmyMatch;
      const dayNum = Number(day);
      const monthNum = Number(month);
      const year = Number(yearPart) < 100 ? 2000 + Number(yearPart) : Number(yearPart);
      if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12) {
        const parsed = new Date(Date.UTC(year, monthNum - 1, dayNum));
        return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, '0')}-${String(parsed.getUTCDate()).padStart(2, '0')}`;
      }
    }

    const monthNameMatch = normalized.match(/^(\d{1,2})[\s\-\/]+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s\-\/]+(\d{2,4})$/i);
    if (monthNameMatch) {
      const [, day, monthName, yearPart] = monthNameMatch;
      const monthMap = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const monthIndex = monthMap.findIndex((m) => m.toLowerCase() === monthName.toLowerCase().slice(0, 3));
      const year = yearPart.length <= 2 ? 2000 + Number(yearPart) : Number(yearPart);
      if (monthIndex >= 0) {
        const parsed = new Date(Date.UTC(year, monthIndex, Number(day)));
        return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, '0')}-${String(parsed.getUTCDate()).padStart(2, '0')}`;
      }
    }

    const fallbackDate = new Date(normalized);
    if (!Number.isNaN(fallbackDate.getTime())) {
      return `${fallbackDate.getUTCFullYear()}-${String(fallbackDate.getUTCMonth() + 1).padStart(2, '0')}-${String(fallbackDate.getUTCDate()).padStart(2, '0')}`;
    }
  }

  return '';
}

// Marks a likely column boundary in reconstructed PDF text (see reconstructPdfPageText). Chosen
// to be a control character that can never appear in real invoice text and survives the '\s+'
// whitespace normalization applied to every line later in the pipeline (a run of plain spaces
// would not).
export const PDF_COLUMN_BREAK_MARKER = '\x1f';
// A whitespace-only PDF text item wider than this (in PDF points) reflects a genuine visual gap
// between side-by-side columns, not a normal inter-word space (~3-4pt for typical body text).
const COLUMN_GAP_WIDTH_THRESHOLD = 15;

// pdfjs's text items are a flat stream with no inherent line structure; item.hasEOL marks the
// end of a visual line in the source PDF. Without using it, an entire page of a real multi-line
// invoice collapses into a single line of text, which breaks every piece of line-based extraction
// logic downstream (party name, invoice number, date). Separately, when two columns (e.g.
// side-by-side 'Bill To' / 'Ship To' sections) sit on the same visual row, pdfjs represents the
// gap between them as a whitespace-only item with an unusually large width; PDF_COLUMN_BREAK_MARKER
// is inserted there so later extraction can recover just the first column's value.
export function reconstructPdfPageText(items: Array<{ str: string; hasEOL?: boolean; width?: number }>): string {
  return items
    .map((item) => {
      const isColumnGap = item.str.trim() === '' && (item.width || 0) > COLUMN_GAP_WIDTH_THRESHOLD;
      const separator = item.hasEOL ? '\n' : isColumnGap ? PDF_COLUMN_BREAK_MARKER : ' ';
      return item.str + separator;
    })
    .join('');
}

/**
 * Parses Excel or CSV files for GSTR-1 or GSTR-2B or GSTR-3B
 */
export async function parseGstFile(
  file: File,
  targetType: 'GSTR1' | 'GSTR2B' | 'GSTR3B',
  companyId: string,
  stateCode: string = '27'
): Promise<ParsedGstDocument> {
  const result: ParsedGstDocument = {
    docType: targetType,
    fileName: file.name,
    totalRecords: 0,
    totalTaxable: 0,
    totalTax: 0,
    salesInvoices: [],
    purchaseInvoices: [],
    errors: [],
  };

  const fileNameLower = file.name.toLowerCase();
  const isExcel = fileNameLower.endsWith('.xlsx') || fileNameLower.endsWith('.xls');
  const isCsv = fileNameLower.endsWith('.csv');
  const isJson = fileNameLower.endsWith('.json');
  const isPdf = fileNameLower.endsWith('.pdf');

  try {
    if (isExcel || isCsv) {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', raw: true });

      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) continue;

        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true });
        if (!rows || rows.length === 0) continue;

        let headerRowIdx = -1;
        const colMap: Record<string, number> = {};

        for (let r = 0; r < Math.min(rows.length, 15); r++) {
          const rowStr = rows[r].map((cell) => String(cell).toLowerCase().replace(/[^a-z0-9]/g, '')).join(' ');
          if (
            rowStr.includes('invoice') ||
            rowStr.includes('invno') ||
            rowStr.includes('gstin') ||
            rowStr.includes('taxable') ||
            rowStr.includes('amount') ||
            rowStr.includes('supplier') ||
            rowStr.includes('customer') ||
            rowStr.includes('rate') ||
            rowStr.includes('value') ||
            rowStr.includes('date') ||
            rowStr.includes('particulars')
          ) {
            headerRowIdx = r;
            rows[r].forEach((colName: any, idx: number) => {
              const cleaned = String(colName).toLowerCase().replace(/[^a-z0-9]/g, '');
              if (cleaned) {
                colMap[cleaned] = idx;
              }
            });
            break;
          }
        }

        const getRowVal = (rowArr: any[], candidates: string[]): any => {
          // Pass 1: exact column-name match, tried for every candidate first.
          for (const cand of candidates) {
            const candClean = cand.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (colMap[candClean] === undefined) continue;
            const val = rowArr[colMap[candClean]];
            if (val !== undefined && val !== null && String(val).trim() !== '') return val;
          }
          // Pass 2: fuzzy substring match, only for candidates specific enough (4+ chars)
          // to be unlikely to collide with an unrelated column (e.g. short candidates like
          // 'gst' or 'rt' would otherwise match inside 'CustomerGSTIN' or similar).
          for (const cand of candidates) {
            const candClean = cand.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (candClean.length < 4) continue;
            for (const [colName, colIdx] of Object.entries(colMap)) {
              if (colName.includes(candClean)) {
                const val = rowArr[colIdx];
                if (val !== undefined && val !== null && String(val).trim() !== '') return val;
              }
            }
          }
          return undefined;
        };

        const startIdx = headerRowIdx >= 0 ? headerRowIdx + 1 : 0;

        for (let i = startIdx; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          const invNoRaw = getRowVal(row, ['invoiceno', 'invoicenumber', 'invno', 'inum', 'voucherno', 'billno', 'docno', 'number']) ||
            (row[0] && String(row[0]).trim().length > 1 ? row[0] : undefined);

          const invDateRaw = getRowVal(row, ['invoicedate', 'invdate', 'date', 'idt', 'billdate', 'docdate']);
          const partyNameRaw = getRowVal(row, ['customername', 'vendorname', 'suppliername', 'partyname', 'receivername', 'customer', 'vendor', 'party', 'name', 'client']) || '';
          const partyGstinRaw = getRowVal(row, ['customergstin', 'vendorgstin', 'suppliergstin', 'gstin', 'ctin', 'uin', 'partygstin']) || '';

          const taxableValRaw = getRowVal(row, ['taxablevalue', 'taxableamt', 'taxable', 'txval', 'amount', 'val', 'subtotal', 'total']) || 0;
          const rateRaw = getRowVal(row, ['rate', 'taxrate', 'rt', 'gstpercent', 'gst']) || 18;
          const posStateRaw = getRowVal(row, ['placeofsupply', 'pos', 'shiptostate', 'customerstate', 'destinationstate', 'supplystate']) || '';

          const igstRaw = getRowVal(row, ['igst', 'integratedtax', 'iamt']) || 0;
          const cgstRaw = getRowVal(row, ['cgst', 'centraltax', 'camt']) || 0;
          const sgstRaw = getRowVal(row, ['sgst', 'statetax', 'samt']) || 0;

          const parseNum = (v: any) => {
            if (typeof v === 'number') return v;
            if (!v) return 0;
            const cleaned = String(v).replace(/[^0-9.-]/g, '');
            return parseFloat(cleaned) || 0;
          };

          const taxableValue = parseNum(taxableValRaw);
          const rate = parseNum(rateRaw) || 18;
          let igst = parseNum(igstRaw);
          let cgst = parseNum(cgstRaw);
          let sgst = parseNum(sgstRaw);

          const invNo = invNoRaw ? String(invNoRaw).trim() : '';
          const parsedInvDate = parseDateValue(invDateRaw);
          const partyGstin = String(partyGstinRaw).trim();
          const partyName = String(partyNameRaw).trim();
          const gstinValid = isStructurallyValidGstin(partyGstin);

          if (!invNo && taxableValue === 0) continue;
          if (String(invNo).toLowerCase().includes('total') || String(partyName).toLowerCase().includes('total')) continue;

          const warnings: string[] = [];
          if (partyGstin && !gstinValid) warnings.push('Customer/vendor GSTIN does not match the standard 15-character format — verify manually.');
          else if (partyGstin && !hasValidGstinChecksum(partyGstin)) warnings.push('Customer/vendor GSTIN has an unexpected check character — this may be a typo. Verify before filing.');

          const invDate = parsedInvDate || new Date().toISOString().split('T')[0];
          if (!parsedInvDate) warnings.push('Invoice date could not be read from the file — please verify and correct it.');

          const posCode = gstinValid ? partyGstin.substring(0, 2) : (resolveStateCodeFromText(String(posStateRaw)) || stateCode);
          const posState = resolvePosState(posCode);
          const isInterState = posCode !== stateCode;

          if (igst === 0 && cgst === 0 && sgst === 0 && taxableValue > 0) {
            if (isInterState) {
              igst = Number(((taxableValue * rate) / 100).toFixed(2));
            } else {
              cgst = Number(((taxableValue * rate) / 200).toFixed(2));
              sgst = Number(((taxableValue * rate) / 200).toFixed(2));
            }
          }

          if (targetType === 'GSTR1') {
            const invType = classifyGstr1InvoiceType(gstinValid, isInterState, taxableValue);
            if (!invNo) warnings.push('Invoice number was not found — an auto-generated placeholder was used.');
            if (!partyName) warnings.push('Customer name was not found — a generic placeholder was used.');
            result.salesInvoices.push({
              companyId,
              invoiceNo: invNo || `INV-REVIEW-${result.salesInvoices.length + 101}`,
              invoiceDate: invDate,
              customerName: partyName || 'Valued Client',
              customerGstin: partyGstin,
              invoiceType: invType,
              posState,
              posCode,
              hsnCode: String(getRowVal(row, ['hsn', 'hsncode', 'sac']) || '998313'),
              description: String(getRowVal(row, ['description', 'item', 'particulars']) || 'Professional / Tech Services'),
              quantity: parseNum(getRowVal(row, ['quantity', 'qty'])) || 1,
              uqc: 'NOS',
              rate,
              taxableValue,
              igst,
              cgst,
              sgst,
              cess: 0,
              reverseCharge: 'N',
              monthYear: deriveMonthYear(invDate),
              status: warnings.length > 0 ? 'WARNING' : 'VALID',
              validationMessage: warnings.length > 0 ? warnings.join(' ') : undefined,
            });
            result.totalTaxable += taxableValue;
            result.totalTax += igst + cgst + sgst;
          } else if (targetType === 'GSTR2B') {
            if (!invNo) warnings.push('Invoice number was not found — an auto-generated placeholder was used.');
            if (!partyName) warnings.push('Vendor name was not found — a generic placeholder was used.');
            if (!partyGstin) warnings.push('Vendor GSTIN was not found — ITC eligibility should be verified manually.');
            result.purchaseInvoices.push({
              companyId,
              invoiceNo: invNo || `PUR-REVIEW-${result.purchaseInvoices.length + 201}`,
              invoiceDate: invDate,
              vendorName: partyName || 'Vendor Solutions',
              vendorGstin: partyGstin,
              posState,
              hsnCode: String(getRowVal(row, ['hsn', 'hsncode']) || '998311'),
              taxableValue,
              igst,
              cgst,
              sgst,
              cess: 0,
              itcEligible: gstinValid ? 'Y' : 'N',
              monthYear: deriveMonthYear(invDate),
              status: warnings.length > 0 ? 'WARNING' : 'VALID',
              reconciledWith2B: 'MATCHED',
            });
            result.totalTaxable += taxableValue;
            result.totalTax += igst + cgst + sgst;
          }
        }
      }


      result.totalRecords = targetType === 'GSTR1' ? result.salesInvoices.length : result.purchaseInvoices.length;
    } else if (isPdf) {
      const buffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
      let text = '';

      for (let i = 1; i <= pdf.numPages; i += 1) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += reconstructPdfPageText(content.items as any) + '\n';
      }

      const parsed = parseTextInvoice(text, targetType, companyId, stateCode);
      result.salesInvoices = parsed.salesInvoices;
      result.purchaseInvoices = parsed.purchaseInvoices;
      result.totalRecords = targetType === 'GSTR1' ? result.salesInvoices.length : result.purchaseInvoices.length;
      result.totalTaxable = parsed.totalTaxable;
      result.totalTax = parsed.totalTax;
      result.errors.push(...parsed.errors);
    } else if (isJson) {
      const text = await file.text();
      const jsonData = JSON.parse(text);

      const b2bArray = jsonData.b2b || jsonData.b2bs || (jsonData.docdata && jsonData.docdata.b2b) || [];
      if (Array.isArray(b2bArray)) {
        b2bArray.forEach((supplier: any) => {
          const gstin = String(supplier.ctin || supplier.gstin || '').trim();
          const gstinValid = isStructurallyValidGstin(gstin);
          const name = supplier.cname || supplier.tradeName || supplier.legalName || '';
          const invList = supplier.inv || supplier.invoices || [supplier];
          const posCode = gstinValid ? gstin.substring(0, 2) : stateCode;
          const posState = resolvePosState(posCode);
          const isInterState = posCode !== stateCode;

          if (Array.isArray(invList)) {
            invList.forEach((inv: any, invIdx: number) => {
              const warnings: string[] = [];
              if (gstin && !gstinValid) warnings.push('Supplier/recipient GSTIN does not match the standard 15-character format — verify manually.');
              else if (gstin && !hasValidGstinChecksum(gstin)) warnings.push('Supplier/recipient GSTIN has an unexpected check character — this may be a typo. Verify before filing.');

              const invNo = inv.inum || inv.invNo || inv.invoiceNo || '';
              if (!invNo) warnings.push('Invoice number was not found — an auto-generated placeholder was used.');

              const parsedInvDate = parseDateValue(inv.idt || inv.invDate || inv.invoiceDate);
              const invDate = parsedInvDate || new Date().toISOString().split('T')[0];
              if (!parsedInvDate) warnings.push('Invoice date could not be read from the file — please verify and correct it.');

              const items = inv.itms || inv.items || [inv];

              items.forEach((item: any) => {
                const det = item.itm_det || item.det || item;
                const taxableValue = Number(det.txval || det.taxableValue || inv.val || 0);
                const rate = Number(det.rt || det.rate || 18);
                const igst = Number(det.iamt || det.igst || 0);
                const cgst = Number(det.camt || det.cgst || 0);
                const sgst = Number(det.samt || det.sgst || 0);

                if (targetType === 'GSTR1') {
                  const invType = classifyGstr1InvoiceType(gstinValid, isInterState, taxableValue);
                  if (!name) warnings.push('Customer/vendor name was not found — a generic placeholder was used.');
                  result.salesInvoices.push({
                    companyId,
                    invoiceNo: invNo || `INV-REVIEW-${result.salesInvoices.length + 101}-${invIdx}`,
                    invoiceDate: invDate,
                    customerName: name || 'Valued Client',
                    customerGstin: gstin,
                    invoiceType: invType,
                    posState,
                    posCode,
                    hsnCode: '998313',
                    description: 'GST Portal Imported Item',
                    quantity: 1,
                    uqc: 'NOS',
                    rate,
                    taxableValue,
                    igst,
                    cgst,
                    sgst,
                    cess: 0,
                    reverseCharge: 'N',
                    monthYear: deriveMonthYear(invDate),
                    status: warnings.length > 0 ? 'WARNING' : 'VALID',
                    validationMessage: warnings.length > 0 ? warnings.join(' ') : undefined,
                  });
                } else {
                  if (!gstin) warnings.push('Vendor GSTIN was not found — ITC eligibility should be verified manually.');
                  if (!name) warnings.push('Vendor name was not found — a generic placeholder was used.');
                  result.purchaseInvoices.push({
                    companyId,
                    invoiceNo: invNo || `PUR-REVIEW-${result.purchaseInvoices.length + 201}-${invIdx}`,
                    invoiceDate: invDate,
                    vendorName: name || 'Vendor Solutions',
                    vendorGstin: gstin,
                    posState,
                    hsnCode: '998311',
                    taxableValue,
                    igst,
                    cgst,
                    sgst,
                    cess: 0,
                    itcEligible: gstinValid ? 'Y' : 'N',
                    monthYear: deriveMonthYear(invDate),
                    status: warnings.length > 0 ? 'WARNING' : 'VALID',
                    reconciledWith2B: 'MATCHED',
                  });
                }
                result.totalTaxable += taxableValue;
                result.totalTax += igst + cgst + sgst;
              });
            });
          }
        });
      }
      result.totalRecords = targetType === 'GSTR1' ? result.salesInvoices.length : result.purchaseInvoices.length;
    } else {
      const text = await file.text();
      const parsed = parseTextInvoice(text, targetType, companyId, stateCode);
      result.salesInvoices = parsed.salesInvoices;
      result.purchaseInvoices = parsed.purchaseInvoices;
      result.totalRecords = targetType === 'GSTR1' ? result.salesInvoices.length : result.purchaseInvoices.length;
      result.totalTaxable = parsed.totalTaxable;
      result.totalTax = parsed.totalTax;
      result.errors.push(...parsed.errors);
    }
  } catch (err: any) {
    result.errors.push(`File parsing warning: ${err.message || 'Error reading document'}`);
  }

  if (result.salesInvoices.length === 0 && result.purchaseInvoices.length === 0 && !result.gstr3bSummary) {
    result.errors.push(
      'No invoice records could be extracted from the uploaded file. Please verify the file format, check that the document contains invoice rows, and try again.'
    );
  }

  return result;
}

function parseTextInvoice(
  text: string,
  targetType: 'GSTR1' | 'GSTR2B' | 'GSTR3B',
  companyId: string,
  stateCode: string
): Pick<ParsedGstDocument, 'salesInvoices' | 'purchaseInvoices' | 'totalTaxable' | 'totalTax' | 'errors'> {
  const salesInvoices: Omit<SalesInvoice, 'id'>[] = [];
  const purchaseInvoices: Omit<PurchaseInvoice, 'id'>[] = [];
  const errors: string[] = [];
  const lines = text
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u2028\u2029]/g, '\n')
    .split('\n')
    .map((line) => line.trim().replace(/\s+/g, ' '))
    .filter(Boolean);

  const globalGstin = extractGstin(lines);
  const blocks = splitInvoiceBlocks(lines);
  const invoiceBlocks = blocks.length > 0 ? blocks : [lines];

  invoiceBlocks.forEach((blockLines, idx) => {
    const warnings: string[] = [];

    const extractedInvoiceNo = extractInvoiceNumber(blockLines);
    const invoiceNo = extractedInvoiceNo || `INV-REVIEW-${Date.now()}-${idx + 1}`;
    if (!extractedInvoiceNo) warnings.push('Invoice number could not be read from the document — an auto-generated placeholder was used.');

    const extractedInvoiceDate = extractInvoiceDate(blockLines) || extractInvoiceDate(lines);
    const invoiceDate = extractedInvoiceDate || new Date().toISOString().split('T')[0];
    if (!extractedInvoiceDate) warnings.push('Invoice date could not be read from the document — please verify and correct it.');

    const extractedPartyName = extractPartyName(blockLines, globalGstin) || extractPartyName(lines, globalGstin);
    const partyName = extractedPartyName || 'Extracted Customer';
    if (!extractedPartyName) warnings.push('Customer/vendor name could not be read from the document.');

    const gstin = extractPartyGstin(blockLines, partyName) || extractPartyGstin(lines, partyName) || extractGstin(blockLines) || globalGstin;
    const gstinValid = isStructurallyValidGstin(gstin);
    if (gstin && !gstinValid) warnings.push('Extracted GSTIN does not match the standard 15-character format — verify manually.');
    else if (gstin && !hasValidGstinChecksum(gstin)) warnings.push('Extracted GSTIN has an unexpected check character — this may be a typo or OCR/parsing error. Verify before filing.');

    const rate = extractAmountFromLines(blockLines, ['gst rate', 'tax rate', 'rate', 'gst%']) || 18;
    const taxableValue =
      extractAmountFromLines(blockLines, ['taxable value', 'taxable amount', 'taxable amt', 'base amount', 'net amount', 'sub total', 'subtotal', 'invoice value', 'invoice total', 'total value', 'amount']) ||
      extractAmountFromLines(lines, ['taxable value', 'taxable amount', 'base amount', 'net amount']) ||
      extractNumericValue(lines.join(' '));
    if (taxableValue === 0) warnings.push('Taxable value could not be confidently read from the document.');
    let igst = extractAmountFromLines(blockLines, ['igst', 'integrated tax', 'integrated']) || 0;
    let cgst = extractAmountFromLines(blockLines, ['cgst', 'central tax', 'camt']) || 0;
    let sgst = extractAmountFromLines(blockLines, ['sgst', 'state tax', 'samt']) || 0;

    const posCode = gstinValid ? gstin.substring(0, 2) : stateCode;
    const posState = resolvePosState(posCode);
    const isInterState = posCode !== stateCode;

    if (igst === 0 && cgst === 0 && sgst === 0 && taxableValue > 0) {
      if (isInterState) {
        igst = Number(((taxableValue * rate) / 100).toFixed(2));
      } else {
        cgst = Number(((taxableValue * rate) / 200).toFixed(2));
        sgst = Number(((taxableValue * rate) / 200).toFixed(2));
      }
    }

    if (targetType === 'GSTR1') {
      salesInvoices.push({
        companyId,
        invoiceNo: String(invoiceNo).trim(),
        invoiceDate,
        customerName: partyName,
        customerGstin: gstin,
        invoiceType: classifyGstr1InvoiceType(gstinValid, isInterState, taxableValue),
        posState,
        posCode,
        hsnCode: '998313',
        description: 'Extracted invoice from document',
        quantity: 1,
        uqc: 'NOS',
        rate: Number(rate) || 18,
        taxableValue,
        igst,
        cgst,
        sgst,
        cess: 0,
        reverseCharge: 'N',
        monthYear: deriveMonthYear(invoiceDate),
        status: warnings.length > 0 ? 'WARNING' : 'VALID',
        validationMessage: warnings.length > 0 ? warnings.join(' ') : undefined,
      });
    } else {
      if (!gstin) warnings.push('Vendor GSTIN could not be found — ITC eligibility should be verified manually.');
      purchaseInvoices.push({
        companyId,
        invoiceNo: String(invoiceNo).trim(),
        invoiceDate,
        vendorName: partyName,
        vendorGstin: gstin,
        posState,
        hsnCode: '998311',
        taxableValue,
        igst,
        cgst,
        sgst,
        cess: 0,
        itcEligible: gstinValid ? 'Y' : 'N',
        monthYear: deriveMonthYear(invoiceDate),
        status: warnings.length > 0 ? 'WARNING' : 'VALID',
        reconciledWith2B: 'MATCHED',
      });
    }
  });

  const totalTaxable = [...salesInvoices, ...purchaseInvoices].reduce((sum, row) => sum + row.taxableValue, 0);
  const totalTax = [...salesInvoices, ...purchaseInvoices].reduce((sum, row) => sum + row.igst + row.cgst + row.sgst, 0);

  if (salesInvoices.length === 0 && purchaseInvoices.length === 0) {
    errors.push('Could not extract invoice fields from the provided document.');
  }

  return { salesInvoices, purchaseInvoices, totalTaxable, totalTax, errors };
}

function splitInvoiceBlocks(lines: string[]): string[][] {
  const boundaries: number[] = [];
  const invoicePattern = /(?:^|\s)(?:invoice\s+(?:no|number|no\.|id|ref)|bill\s+(?:no|number|no\.|id|ref)|voucher\s+(?:no|number|no\.|id|ref)|doc\s+(?:no|number|no\.|id|ref)|ref\s+(?:no|number|no\.|id|ref))(?:\s*[:#=-]?\s*)([A-Z0-9\/\-]{2,40})/i;

  lines.forEach((line, idx) => {
    if (invoicePattern.test(line)) {
      boundaries.push(idx);
    }
  });

  if (boundaries.length <= 1) {
    return [lines];
  }

  return boundaries.map((start, index) => lines.slice(start, boundaries[index + 1] || lines.length));
}

function extractInvoiceNumber(lines: string[] | string): string {
  const lineArray = Array.isArray(lines) ? lines : [lines];
  // Try specific format first (e.g., INV/26-27086), then generic invoice label
  const patterns = [
    // \b after the alternation is critical: without it, "INV" matches inside the word
    // "Invoice" itself (INV + "oice"), "BILL" matches inside "Billing", "DOC" inside
    // "Document", "REF" inside "Reference" — so a line like "Invoice No. INV/25-26/0456"
    // would wrongly extract the literal word "Invoice" instead of the real number.
    /\b(INV|BILL|PUR|DOC|VCH|REF)\b([\s\-:\.\/ ]?)([A-Z0-9\/\-]{2,40})\b/i,
    /\b([A-Z]{1,3}(?:\/|-)\d{1,6}(?:\/|-)\d{1,6})\b/i,
    /\b(?:invoice(?:\s*(?:no|number|no\.|id|ref))?|bill(?:\s+(?:no|number|no\.|id|ref))?|voucher(?:\s*(?:no|number|no\.|id|ref))?|doc(?:\s*(?:no|number|no\.|id|ref))?|ref(?:\s*(?:no|number|no\.|id|ref))?)(?:\s*[:#=-]?\s*)([A-Z0-9\/\-]{2,40})/i,
  ];

  const degenerateCandidate = /^(date|invoice|bill|billing|voucher|document|doc|reference|ref|no|number|num)$/i;

  for (const line of lineArray) {
    for (let i = 0; i < patterns.length; i++) {
      const pattern = patterns[i];
      const match = line.match(pattern);
      if (match) {
        let candidate = '';
        
        if (i === 0) {
          // Prefix pattern: prefix in group 1, separator in group 2, number in group 3
          candidate = match[1] + match[2] + match[3];
        } else if (i === 1) {
          // Full format pattern (AAA/00-00000): full format in group 1
          candidate = match[1];
        } else {
          // Generic label pattern: number in group 1
          candidate = match[1];
        }
        
        if (candidate && !degenerateCandidate.test(candidate.trim())) {
          return candidate.toString().trim();
        }
      }
    }
  }

  return '';
}

const MONTH_NAME_DATE = /\b([0-9]{1,2}[\s\-\/](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s\-\/][0-9]{2,4})\b/i;

function extractInvoiceDate(lines: string[]): string {
  const patterns = [
    /(?:invoice|bill|voucher|document|doc|dated?|dt)[\s:=-]*([0-9]{1,2}[\/.\-][0-9]{1,2}[\/.\-][0-9]{2,4})/i,
    /(?:invoice|bill|voucher|document|doc|dated?|dt)[\s:=-]*([0-9]{4}[\/.\-][0-9]{1,2}[\/.\-][0-9]{1,2})/i,
    // Tally's default export format, e.g. "Dated 15-Jun-2026" or "Invoice Date: 15 Jun 26"
    /(?:invoice|bill|voucher|document|doc|dated?|dt)[\s:=-]*([0-9]{1,2}[\s\-\/](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s\-\/][0-9]{2,4})/i,
  ];

  for (const line of lines) {
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        const parsed = parseDateValue(match[1]);
        if (parsed) return parsed;
      }
    }
  }

  for (const line of lines) {
    const match = line.match(/\b([0-9]{1,2}[\/.\-][0-9]{1,2}[\/.\-][0-9]{2,4})\b/) || line.match(MONTH_NAME_DATE);
    if (match) {
      const parsed = parseDateValue(match[1]);
      if (parsed) return parsed;
    }
  }

  return '';
}

// Official GST state/UT codes (first 2 digits of every GSTIN). Codes 25 (old Daman & Diu) and
// 28 (undivided Andhra Pradesh) are legacy/no longer issued but are kept here so a GSTIN using
// them still resolves to a sensible place-of-supply name instead of "Unknown".
const GST_STATE_CODES: Record<string, string> = {
  '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh',
  '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh',
  '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh', '13': 'Nagaland', '14': 'Manipur',
  '15': 'Mizoram', '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal',
  '20': 'Jharkhand', '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
  '25': 'Daman & Diu (legacy)', '26': 'Dadra & Nagar Haveli and Daman & Diu', '27': 'Maharashtra',
  '28': 'Andhra Pradesh (legacy)', '29': 'Karnataka', '30': 'Goa', '31': 'Lakshadweep',
  '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry', '35': 'Andaman & Nicobar Islands',
  '36': 'Telangana', '37': 'Andhra Pradesh', '38': 'Ladakh', '97': 'Other Territory',
};

export function resolvePosState(posCode: string): string {
  return GST_STATE_CODES[posCode] || 'Unknown / Unverified State';
}

const STATE_NAME_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(GST_STATE_CODES).map(([code, name]) => [name.toLowerCase().replace(/\s*\(legacy\)\s*$/, ''), code])
);
// Common alpha/ISO codes and short forms seen in real Tally/Zoho 'Place of Supply' or
// 'Ship To State' columns, since B2C invoices have no GSTIN to derive the state from.
const STATE_ALIAS_TO_CODE: Record<string, string> = {
  jk: '01', hp: '02', pb: '03', ch: '04', uk: '05', ua: '05', hr: '06', dl: '07', rj: '08',
  up: '09', br: '10', sk: '11', ar: '12', nl: '13', mn: '14', mz: '15', tr: '16', ml: '17',
  as: '18', wb: '19', jh: '20', od: '21', or: '21', cg: '22', ct: '22', mp: '23', gj: '24',
  mh: '27', ap: '37', ka: '29', ga: '30', ld: '31', kl: '32', tn: '33', py: '34', an: '35',
  tg: '36', ts: '36', la: '38',
};

function resolveStateCodeFromText(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^\d{2}$/.test(trimmed) && GST_STATE_CODES[trimmed]) return trimmed;
  const lower = trimmed.toLowerCase();
  if (STATE_NAME_TO_CODE[lower]) return STATE_NAME_TO_CODE[lower];
  if (STATE_ALIAS_TO_CODE[lower]) return STATE_ALIAS_TO_CODE[lower];
  return '';
}

// Character set used by the GST portal's checksum algorithm: digits 0-9 (value = digit),
// then letters A-Z (value = 10-35).
const GSTIN_CHECKSUM_CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Computes the 15th (checksum) character of a GSTIN from its first 14 characters, using the
 * Luhn mod-36 algorithm used by the GST portal. Verified against a published worked example:
 * computeGstinCheckDigit('34AABCB5576G1Z') === 'Q'.
 */
export function computeGstinCheckDigit(first14: string): string {
  const mod = GSTIN_CHECKSUM_CHARSET.length; // 36
  let factor = 2;
  let sum = 0;
  for (let i = first14.length - 1; i >= 0; i -= 1) {
    const codePoint = GSTIN_CHECKSUM_CHARSET.indexOf(first14[i]);
    if (codePoint === -1) return '';
    const product = factor * codePoint;
    factor = factor === 2 ? 1 : 2;
    sum += Math.floor(product / mod) + (product % mod);
  }
  const checkCodePoint = (mod - (sum % mod)) % mod;
  return GSTIN_CHECKSUM_CHARSET[checkCodePoint];
}

/**
 * Validates a GSTIN's structural format (2-digit state code, 10-char PAN shape, entity code,
 * fixed 'Z', check character slot). This governs B2B/B2CS classification and ITC eligibility.
 */
function isStructurallyValidGstin(gstin: string): boolean {
  const trimmed = gstin.trim().toUpperCase();
  return trimmed.length === 15 && GSTIN_PATTERN.test(trimmed);
}

/**
 * Verifies a GSTIN's checksum (15th) character against the first 14, using the Luhn mod-36
 * algorithm used by the GST portal. This is intentionally advisory only (surfaced as an extra
 * warning for manual review) rather than authoritative for classification: a single incorrect
 * edge case in this implementation could otherwise cause a genuinely valid GSTIN to be wrongly
 * excluded from B2B classification or ITC eligibility, which would be a worse outcome than not
 * having this check at all. Verified against a published worked example:
 * computeGstinCheckDigit('34AABCB5576G1Z') === 'Q'.
 */
export function hasValidGstinChecksum(gstin: string): boolean {
  const trimmed = gstin.trim().toUpperCase();
  if (!isStructurallyValidGstin(trimmed)) return false;
  const expected = computeGstinCheckDigit(trimmed.substring(0, 14));
  return expected !== '' && expected === trimmed[14];
}

// Effective 1 Aug 2024 (Notification No. 12/2024-CT, per the 53rd GST Council meeting): B2CL
// applies only to INTER-STATE supplies to unregistered persons where the invoice value exceeds
// ₹1,00,000 (previously ₹2,50,000, and previously not conditioned on inter-state at all).
const B2CL_THRESHOLD = 100000;

function classifyGstr1InvoiceType(gstinValid: boolean, isInterState: boolean, taxableValue: number): 'B2B' | 'B2CL' | 'B2CS' {
  if (gstinValid) return 'B2B';
  if (isInterState && taxableValue > B2CL_THRESHOLD) return 'B2CL';
  return 'B2CS';
}

function deriveMonthYear(invoiceDate: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(invoiceDate) ? invoiceDate.slice(0, 7) : '';
}

function extractGstin(lines: string[]): string {
  const text = lines.join(' ');
  const match = text.match(/\b\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}\b/i);
  return match ? match[0].trim() : '';
}

// Shared across extractPartyGstin and extractPartyName. Covers common Zoho Books, Tally, and
// generic invoice header phrasings for the buyer/customer block. Ordered roughly longest-first
// as a readability aid only — matching itself picks the leftmost, then longest, hit per line
// (see findPartyLabelMatch) so array order does not affect correctness.
const PARTY_LABELS = [
  'billing address',
  "party's a/c name",
  'party a/c name',
  'party name',
  'buyer (bill to)',
  'consignee (ship to)',
  'billed to',
  'invoice to',
  'bill to',
  'ship to',
  'sold to',
  'customer name',
  'client name',
  'consignee',
  'customer',
  'buyer',
  'recipient',
  'client',
  'to:',
  'from:',
];

const GSTIN_PATTERN = /\b\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}\b/i;

// Text that indicates a line is header/label noise rather than an actual party name.
// Deliberately excludes words like "traders", "services", "company", and "enterprises" —
// those are extremely common suffixes in real Indian business names (e.g. "Acme Traders",
// "Sharma Services Pvt Ltd") and must never be used to reject a same-line or multi-line
// candidate. This single regex is reused everywhere a candidate line is validated so the
// same mistake can't be reintroduced in just one code path.
const PARTY_NOISE_TERMS = /(gstin|invoice|voucher|doc\s*no|ref\s*no|dated?|amount|total\b|tax\b|hsn|qty|rate|address|particulars|seller|merchant|supplier)/i;
const PARTY_REJECT_PATTERN = /\b\d{4,}\b|^\d+$|plot no|flat no|floor|city|state|postal|pin\s*code|^[a-z]{2}\d{4,}\b/i;

// When two PDF columns (e.g. side-by-side 'Bill To' / 'Ship To' sections) sit on the same visual
// row, this app's line-reconstruction necessarily joins them onto one line, typically leaving a
// run of 2+ consecutive spaces at the column boundary (a genuine mid-name single space never
// produces this). Truncating to the text before that gap recovers just the first column's value
// instead of the whole merged string.
function truncateAtColumnBoundary(candidate: string): string {
  const markerIdx = candidate.indexOf(PDF_COLUMN_BREAK_MARKER);
  if (markerIdx !== -1) return candidate.substring(0, markerIdx);
  const match = candidate.match(/^(.*?)\s{2,}/);
  return match ? match[1] : candidate;
}

function isPlausiblePartyName(candidate: string): boolean {
  const trimmed = candidate.trim();
  if (trimmed.length < 3) return false;
  if (GSTIN_PATTERN.test(trimmed)) return false;
  if (PARTY_NOISE_TERMS.test(trimmed)) return false;
  if (PARTY_REJECT_PATTERN.test(trimmed)) return false;
  // A real party name never legitimately IS another section's label (e.g. a mis-parsed
  // side-by-side 'Ship To' picked up while looking for the 'Bill To' value) -- this specifically
  // catches that case, which would otherwise pass every other check above.
  const lowerTrimmed = trimmed.toLowerCase();
  if (PARTY_LABELS.some((label) => lowerTrimmed === label || lowerTrimmed.startsWith(`${label} `) || lowerTrimmed.startsWith(`${label}:`))) {
    return false;
  }
  return true;
}

function cleanPartyName(candidate: string): string {
  return candidate
    .trim()
    .replace(/^[\s:()\-=]+/, '')
    .replace(/[\s()]+$/, '')
    .replace(/^m\/s\.?\s+/i, '')
    .trim();
}

// Finds the label that starts earliest in the line (ties broken by longest label), so a
// compound header like "Buyer (Bill to)" anchors on "buyer" rather than accidentally matching
// the "bill to" substring buried inside the parentheses.
function findPartyLabelMatch(lowerLine: string): { label: string; index: number } | null {
  let best: { label: string; index: number } | null = null;
  for (const label of PARTY_LABELS) {
    const idx = lowerLine.indexOf(label);
    if (idx === -1) continue;
    if (!best || idx < best.index || (idx === best.index && label.length > best.label.length)) {
      best = { label, index: idx };
    }
  }
  return best;
}

function extractPartyGstin(lines: string[], partyName: string): string {
  for (let i = 0; i < lines.length; i += 1) {
    const lowerLine = lines[i].toLowerCase();
    if (!findPartyLabelMatch(lowerLine)) continue;

    const context = lines.slice(i, i + 8);
    for (const candidate of context) {
      const gstinMatch = candidate.match(GSTIN_PATTERN);
      if (gstinMatch) return gstinMatch[0].trim();
    }
  }

  if (partyName) {
    const partyNameLower = partyName.toLowerCase();
    for (let i = 0; i < lines.length; i += 1) {
      const lowerLine = lines[i].toLowerCase();
      if (!lowerLine.includes(partyNameLower)) continue;
      const context = lines.slice(i + 1, i + 6);
      for (const candidate of context) {
        const gstinMatch = candidate.match(GSTIN_PATTERN);
        if (gstinMatch) return gstinMatch[0].trim();
      }
    }
  }

  return '';
}

export function extractPartyName(lines: string[], gstin: string): string {
  for (let i = 0; i < lines.length; i += 1) {
    const lowerLine = lines[i].toLowerCase();
    const match = findPartyLabelMatch(lowerLine);
    if (!match) continue;

    // Try to extract from the same line first (e.g., "Bill To Miyuro" or "Party A/c Name : Acme Traders")
    const afterLabel = truncateAtColumnBoundary(cleanPartyName(lines[i].substring(match.index + match.label.length)));
    if (isPlausiblePartyName(afterLabel)) {
      return cleanPartyName(afterLabel);
    }

    // If not found on same line, look at next lines
    const context = lines.slice(i + 1, i + 8);
    for (const candidate of context) {
      const trimmed = truncateAtColumnBoundary(candidate.trim());
      if (!trimmed || !isPlausiblePartyName(trimmed)) continue;
      return cleanPartyName(trimmed);
    }
  }

  if (gstin) {
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (!line.includes(gstin)) continue;
      const previous = truncateAtColumnBoundary((lines[i - 1] || '').trim());
      const next = truncateAtColumnBoundary((lines[i + 1] || '').trim());
      const preferred = isPlausiblePartyName(previous) ? previous : isPlausiblePartyName(next) ? next : '';
      if (preferred) {
        return cleanPartyName(preferred);
      }
    }
  }

  for (const line of lines) {
    const truncated = truncateAtColumnBoundary(line.trim());
    if (isPlausiblePartyName(truncated)) {
      return cleanPartyName(truncated);
    }
  }

  return '';
}

// Matches either an Indian/Western comma-grouped number (e.g. "1,23,456" or "50,000" — only
// taken when a comma is actually present) or a plain digit run of any length (e.g. "50000"),
// each with an optional decimal part. The comma-grouped branch requires at least one comma
// group (`+`, not `*`) so a comma-less number always falls through to the plain-digit branch
// instead of being truncated to its first 1-3 digits.
const AMOUNT_PATTERN = /(?:\d{1,3}(?:,\d{2,3})+|\d+)(?:\.\d{1,2})?/g;

function extractAmountFromLines(lines: string[], labels: string[]): number {
  const lowerLabels = labels.map((label) => label.toLowerCase());
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    if (!lowerLabels.some((label) => lowerLine.includes(label))) continue;
    const amounts = line.match(AMOUNT_PATTERN);
    if (amounts && amounts.length > 0) {
      const value = Number(amounts[amounts.length - 1].replace(/,/g, ''));
      if (Number.isFinite(value) && value >= 0) return value;
    }
  }
  return 0;
}

function extractNumericValue(text: string): number {
  const matches = Array.from(text.matchAll(AMOUNT_PATTERN))
    .map((m) => Number(m[0].replace(/,/g, '')))
    .filter((value) => Number.isFinite(value) && value > 100);
  return matches.length > 0 ? matches[0] : 100000;
}

/**
 * Creates pre-built sample mock parsed data for Instant Demo Testing
 */
export function getDemoParsedData(
  targetType: 'GSTR1' | 'GSTR2B' | 'GSTR3B',
  companyId: string
): ParsedGstDocument {
  const demoMonthYear = previousMonthYear();
  const demoDay = (day: number) => `${demoMonthYear}-${String(day).padStart(2, '0')}`;

  if (targetType === 'GSTR1') {
    return {
      docType: 'GSTR1',
      fileName: 'Sample_GSTR1_Sales_Register.xlsx',
      totalRecords: 3,
      totalTaxable: 450000,
      totalTax: 81000,
      isSampleData: true,
      salesInvoices: [
        {
          companyId,
          invoiceNo: 'INV-SAMPLE-088',
          invoiceDate: demoDay(18),
          customerName: 'Prestige Digital Retail Pvt Ltd (Sample)',
          customerGstin: '27AAACP1234A1Z5',
          invoiceType: 'B2B',
          posState: 'Maharashtra',
          posCode: '27',
          hsnCode: '998313',
          description: 'Cloud Infrastructure Setup & Maintenance',
          quantity: 1,
          uqc: 'NOS',
          rate: 18,
          taxableValue: 200000,
          igst: 0,
          cgst: 18000,
          sgst: 18000,
          cess: 0,
          reverseCharge: 'N',
          monthYear: demoMonthYear,
          status: 'VALID',
        },
        {
          companyId,
          invoiceNo: 'INV-SAMPLE-089',
          invoiceDate: demoDay(22),
          customerName: 'Horizon BPM Solutions Ltd (Sample)',
          customerGstin: '29AAACH9988B1Z1',
          invoiceType: 'B2B',
          posState: 'Karnataka',
          posCode: '29',
          hsnCode: '998314',
          description: 'AI System Consulting Services',
          quantity: 1,
          uqc: 'NOS',
          rate: 18,
          taxableValue: 150000,
          igst: 27000,
          cgst: 0,
          sgst: 0,
          cess: 0,
          reverseCharge: 'N',
          monthYear: demoMonthYear,
          status: 'VALID',
        },
        {
          companyId,
          invoiceNo: 'INV-SAMPLE-090',
          invoiceDate: demoDay(28),
          customerName: 'Walk-in Counter Customer',
          customerGstin: '',
          invoiceType: 'B2CS',
          posState: 'Maharashtra',
          posCode: '27',
          hsnCode: '998313',
          description: 'Retail Software Subscriptions',
          quantity: 5,
          uqc: 'NOS',
          rate: 18,
          taxableValue: 100000,
          igst: 0,
          cgst: 9000,
          sgst: 9000,
          cess: 0,
          reverseCharge: 'N',
          monthYear: demoMonthYear,
          status: 'VALID',
        },
      ],
      purchaseInvoices: [],
      errors: [],
    };
  } else if (targetType === 'GSTR2B') {
    return {
      docType: 'GSTR2B',
      fileName: `GSTR2B_Portal_Statement_Sample.pdf`,
      totalRecords: 3,
      totalTaxable: 320000,
      totalTax: 57600,
      isSampleData: true,
      salesInvoices: [],
      purchaseInvoices: [
        {
          companyId,
          invoiceNo: 'CLOUDNOVA-IN-901',
          invoiceDate: demoDay(5),
          vendorName: 'CloudNova Web Services India Pvt Ltd (Sample)',
          vendorGstin: '27AABCC1234D1ZP',
          posState: 'Maharashtra',
          hsnCode: '998315',
          taxableValue: 180000,
          igst: 0,
          cgst: 16200,
          sgst: 16200,
          cess: 0,
          itcEligible: 'Y',
          monthYear: demoMonthYear,
          status: 'VALID',
          reconciledWith2B: 'MATCHED',
        },
        {
          companyId,
          invoiceNo: 'ZENITH-441',
          invoiceDate: demoDay(10),
          vendorName: 'Zenith Corp Services Pvt Ltd (Sample)',
          vendorGstin: '33AAACZ8811A1Z0',
          posState: 'Tamil Nadu',
          hsnCode: '998313',
          taxableValue: 80000,
          igst: 14400,
          cgst: 0,
          sgst: 0,
          cess: 0,
          itcEligible: 'Y',
          monthYear: demoMonthYear,
          status: 'VALID',
          reconciledWith2B: 'MATCHED',
        },
        {
          companyId,
          invoiceNo: 'AIRWAVE-MOB-882',
          invoiceDate: demoDay(15),
          vendorName: 'Airwave Telecom Ltd (Sample)',
          vendorGstin: '27AABCB2211C1ZX',
          posState: 'Maharashtra',
          hsnCode: '998411',
          taxableValue: 60000,
          igst: 0,
          cgst: 5400,
          sgst: 5400,
          cess: 0,
          itcEligible: 'Y',
          monthYear: demoMonthYear,
          status: 'VALID',
          reconciledWith2B: 'MATCHED',
        },
      ],
      errors: [],
    };
  } else {
    return {
      docType: 'GSTR3B',
      fileName: `GSTR3B_Filed_Report_Sample.pdf`,
      totalRecords: 1,
      totalTaxable: 550000,
      totalTax: 99000,
      isSampleData: true,
      salesInvoices: [],
      purchaseInvoices: [],
      gstr3bSummary: {
        outwardTaxable: 550000,
        igst: 27000,
        cgst: 36000,
        sgst: 36000,
        itcIgst: 14400,
        itcCgst: 21600,
        itcSgst: 21600,
      },
      errors: [],
    };
  }
}
