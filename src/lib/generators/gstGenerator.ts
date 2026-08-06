/**
 * GST File Generator (GSTR-1 JSON & GSTR-3B Summary)
 */

import { Company, SalesInvoice, PurchaseInvoice, GeneratedFile } from '../../types';
import * as XLSX from 'xlsx';
import { calculateGstLateFeeAndInterest, TurnoverSlab, previousMonthYear, todayIso, computeItcSetoff, computeExcessItc } from '../calculators/gstLateFeeCalculator';

export function formatGstPeriod(monthYear: string): string {
  // Input: '2026-06' -> Output: '062026'
  if (!monthYear || !monthYear.includes('-')) return '062026';
  const [year, month] = monthYear.split('-');
  return `${month}${year}`;
}

export function generateGstr1Json(company: Company, allSales: SalesInvoice[], monthYear: string): GeneratedFile {
  const sales = allSales.filter((s) => s.monthYear === monthYear);
  const period = formatGstPeriod(monthYear);
  const companyGstin = company.gstin.trim().toUpperCase();

  // B2B Invoices grouped by Customer GSTIN
  const b2bMap: Record<string, any[]> = {};
  // B2CL (Inter-state > 2.5L to unregistered)
  const b2clList: any[] = [];
  // B2CS (Aggregated by POS and Rate)
  const b2csMap: Record<string, { sply_ty: string; pos: string; rt: number; txval: number; iamt: number; camt: number; samt: number; csamt: number }> = {};
  // CDNR (Credit/Debit Notes - Registered recipients, GSTR-1 Table 9B).
  // NOTE: not currently populated. SalesInvoice has no way to distinguish a credit note from a
  // debit note (no note-type field, no reference to the original invoice being adjusted), so
  // this cannot be built correctly from the current data model -- guessing would risk silently
  // misclassifying a debit note as a credit note (or vice versa), which would misstate the
  // adjustment's effect on tax liability. No code path in this app currently assigns
  // invoiceType: 'CDNR' to a SalesInvoice, so this is presently unreachable rather than actively
  // dropping real data -- but if credit/debit note entry is added, extend SalesInvoice with the
  // required fields first rather than inferring them here.
  const cdnrList: any[] = [];
  // Export
  const expList: any[] = [];
  // HSN Summary
  const hsnMap: Record<string, { hsn_sc: string; desc: string; uqc: string; qty: number; val: number; txval: number; iamt: number; camt: number; samt: number; csamt: number }> = {};

  sales.forEach((s, idx) => {
    const isInterstate = s.posCode !== company.stateCode;
    const invVal = Number((s.taxableValue + s.igst + s.cgst + s.sgst + s.cess).toFixed(2));

    // Date formatting DD-MM-YYYY
    const dParts = s.invoiceDate.split('-');
    const formattedDate = dParts.length === 3 ? `${dParts[2]}-${dParts[1]}-${dParts[0]}` : s.invoiceDate;

    // Item detail
    const itmDet = {
      txval: Number(s.taxableValue.toFixed(2)),
      rt: Number(s.rate),
      iamt: Number(s.igst.toFixed(2)),
      camt: Number(s.cgst.toFixed(2)),
      samt: Number(s.sgst.toFixed(2)),
      csamt: Number(s.cess.toFixed(2)),
    };

    if (s.invoiceType === 'B2B' && s.customerGstin) {
      const cGstin = s.customerGstin.trim().toUpperCase();
      if (!b2bMap[cGstin]) b2bMap[cGstin] = [];
      b2bMap[cGstin].push({
        inum: s.invoiceNo,
        idt: formattedDate,
        val: invVal,
        pos: s.posCode,
        rchg: s.reverseCharge || 'N',
        inv_type: 'R',
        itms: [{ num: 1, itm_det: itmDet }],
      });
    } else if (s.invoiceType === 'EXPORT') {
      // Shipping bill number/port/date are mandatory, invoice-specific fields used by the
      // government to cross-verify export invoices against actual customs (ICEGATE) records for
      // IGST refund processing. SalesInvoice does not currently capture this data, so it is left
      // as an explicit, obviously-incomplete placeholder rather than a fabricated but
      // plausible-looking value that could be filed without the user noticing it's fake.
      // TODO: capture shippingBillNumber/shippingBillDate/portCode on SalesInvoice so this can be
      // populated with real data instead of a placeholder that must be corrected before filing.
      expList.push({
        // A zero-rated export under LUT (WOPAY) cannot legally have IGST charged, so IGST > 0
        // here necessarily means tax was paid and will be claimed back as a refund (WPAY).
        exp_typ: s.igst > 0 ? 'WPAY' : 'WOPAY',
        inv: [{
          inum: s.invoiceNo,
          idt: formattedDate,
          val: invVal,
          sbpcode: 'VERIFY-PORT-CODE',
          sbnum: 0, // VERIFY: replace with the actual shipping bill number before filing
          sbdt: '',
          itms: [{ num: 1, txval: s.taxableValue, rt: s.rate, iamt: s.igst }],
        }],
      });
    } else if (s.invoiceType === 'CDNR') {
      // See the cdnrList declaration above: not populated, since the current data model can't
      // distinguish credit vs debit notes. Explicitly caught here (rather than falling through)
      // so a CDNR-typed invoice is never misrouted into B2CL/B2CS by the heuristics below.
    } else if (s.invoiceType === 'B2CL' || (isInterstate && invVal > 100000 && (!s.customerGstin || s.customerGstin.length < 15))) {
      b2clList.push({
        pos: s.posCode,
        inv: [{
          inum: s.invoiceNo,
          idt: formattedDate,
          val: invVal,
          itms: [{ num: 1, itm_det: itmDet }],
        }],
      });
    } else if (s.invoiceType === 'B2CS' || (!s.customerGstin || s.customerGstin.length < 15)) {
      const splyTy = isInterstate ? 'INTER' : 'INTRA';
      const key = `${splyTy}_${s.posCode}_${s.rate}`;
      if (!b2csMap[key]) {
        b2csMap[key] = {
          sply_ty: splyTy,
          pos: s.posCode,
          rt: Number(s.rate),
          txval: 0,
          iamt: 0,
          camt: 0,
          samt: 0,
          csamt: 0,
        };
      }
      b2csMap[key].txval += s.taxableValue;
      b2csMap[key].iamt += s.igst;
      b2csMap[key].camt += s.cgst;
      b2csMap[key].samt += s.sgst;
      b2csMap[key].csamt += s.cess;
    }

    // HSN Summary Map
    const hsnKey = `${s.hsnCode}_${s.rate}`;
    if (!hsnMap[hsnKey]) {
      hsnMap[hsnKey] = {
        hsn_sc: s.hsnCode || '9983',
        desc: s.description || 'Services',
        uqc: s.uqc || 'NOS',
        qty: 0,
        val: 0,
        txval: 0,
        iamt: 0,
        camt: 0,
        samt: 0,
        csamt: 0,
      };
    }
    hsnMap[hsnKey].qty += s.quantity || 1;
    hsnMap[hsnKey].val += invVal;
    hsnMap[hsnKey].txval += s.taxableValue;
    hsnMap[hsnKey].iamt += s.igst;
    hsnMap[hsnKey].camt += s.cgst;
    hsnMap[hsnKey].samt += s.sgst;
    hsnMap[hsnKey].csamt += s.cess;
  });

  // Construct B2B JSON Array
  const b2bArray = Object.keys(b2bMap).map((ctin) => ({
    ctin,
    inv: b2bMap[ctin],
  }));

  // Construct B2CS JSON Array
  const b2csArray = Object.values(b2csMap).map((b) => ({
    sply_ty: b.sply_ty,
    pos: b.pos,
    rt: b.rt,
    txval: Number(b.txval.toFixed(2)),
    iamt: Number(b.iamt.toFixed(2)),
    camt: Number(b.camt.toFixed(2)),
    samt: Number(b.samt.toFixed(2)),
    csamt: Number(b.csamt.toFixed(2)),
  }));

  // Construct HSN Array
  const hsnData = Object.values(hsnMap).map((h, idx) => ({
    num: idx + 1,
    hsn_sc: h.hsn_sc,
    desc: h.desc,
    uqc: h.uqc,
    qty: Number(h.qty.toFixed(2)),
    val: Number(h.val.toFixed(2)),
    txval: Number(h.txval.toFixed(2)),
    iamt: Number(h.iamt.toFixed(2)),
    camt: Number(h.camt.toFixed(2)),
    samt: Number(h.samt.toFixed(2)),
    csamt: Number(h.csamt.toFixed(2)),
  }));

  // gt/cur_gt (aggregate annual turnover) cannot be reliably derived from a single period's
  // invoices alone -- the GST portal expects the taxpayer's actual PAN-level turnover for the
  // relevant financial year, which this tool does not independently know. Using this period's
  // total as a placeholder is clearly wrong to leave unflagged, so it's marked for verification
  // rather than presented as a real figure.
  const periodTotalValue = sales.reduce((sum, s) => sum + s.taxableValue + s.igst + s.cgst + s.sgst + s.cess, 0);
  const gtEstimate = Number(periodTotalValue.toFixed(2));

  // Master GST Offline Payload
  const gstr1Payload = {
    gstin: companyGstin,
    fp: period,
    gt: gtEstimate, // VERIFY: replace with actual PAN-level aggregate annual turnover before filing
    cur_gt: gtEstimate, // VERIFY: replace with actual PAN-level aggregate annual turnover before filing
    version: 'GSTR1-V3.1.2',
    hash: 'hash',
    b2b: b2bArray,
    b2cl: b2clList,
    b2cs: b2csArray,
    cdnr: cdnrList,
    exp: expList,
    hsn: { data: hsnData },
    doc_issue: {
      doc_det: [
        {
          doc_num: 1,
          doc_typ: 'Invoices for outward supply',
          docs: [{ num: 1, from: sales[0]?.invoiceNo || 'INV-001', to: sales[sales.length - 1]?.invoiceNo || 'INV-010', totnum: sales.length, cancel: 0, net_issue: sales.length }],
        },
      ],
    },
  };

  const jsonStr = JSON.stringify(gstr1Payload, null, 2);
  const sizeKb = Number((jsonStr.length / 1024).toFixed(2));

  return {
    id: `GEN-GSTR1-${Date.now()}`,
    companyId: company.id,
    module: 'GST',
    fileType: 'GSTR1_JSON',
    fileName: `${companyGstin}_GSTR1_${period}.json`,
    fileContent: jsonStr,
    monthYearOrQuarter: monthYear,
    createdAt: new Date().toISOString(),
    recordCount: sales.length,
    fileSizeKb: sizeKb,
  };
}

export function generateGstr1SalesRegisterCsv(company: Company, allSales: SalesInvoice[], monthYear: string): GeneratedFile {
  const sales = allSales.filter((s) => s.monthYear === monthYear);
  const period = formatGstPeriod(monthYear);
  const rows: any[][] = [
    ['Sales Register & Audit Report', company.legalName, company.gstin, `Period: ${monthYear}`],
    [],
    [
      'Invoice No',
      'Invoice Date',
      'Customer Name',
      'Customer GSTIN',
      'Invoice Type',
      'POS State',
      'POS Code',
      'HSN/SAC',
      'Description',
      'Qty',
      'UQC',
      'Rate %',
      'Taxable Value (INR)',
      'IGST (INR)',
      'CGST (INR)',
      'SGST (INR)',
      'Cess (INR)',
      'Total Invoice Value (INR)',
    ],
  ];

  sales.forEach((s) => {
    const totalVal = s.taxableValue + s.igst + s.cgst + s.sgst + s.cess;
    rows.push([
      s.invoiceNo,
      s.invoiceDate,
      s.customerName,
      s.customerGstin || 'URD',
      s.invoiceType,
      s.posState,
      s.posCode,
      s.hsnCode,
      s.description,
      s.quantity || 1,
      s.uqc || 'NOS',
      s.rate,
      s.taxableValue,
      s.igst,
      s.cgst,
      s.sgst,
      s.cess,
      totalVal,
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const csvContent = XLSX.utils.sheet_to_csv(ws);

  return {
    id: `GEN-GSTR1-REGISTER-${Date.now()}`,
    companyId: company.id,
    module: 'GST',
    fileType: 'GSTR1_REGISTER_CSV',
    fileName: `${company.gstin}_Sales_Register_${period}.csv`,
    fileContent: csvContent,
    monthYearOrQuarter: monthYear,
    createdAt: new Date().toISOString(),
    recordCount: sales.length,
    fileSizeKb: Number((csvContent.length / 1024).toFixed(2)),
  };
}

export function generateGstr1B2bCsv(company: Company, allSales: SalesInvoice[], monthYear: string): GeneratedFile {
  const sales = allSales.filter((s) => s.monthYear === monthYear);
  const period = formatGstPeriod(monthYear);
  const b2bSales = sales.filter((s) => s.invoiceType === 'B2B' || (s.customerGstin && s.customerGstin.length === 15));

  const rows: any[][] = [
    [
      'GSTIN/UIN of Recipient',
      'Receiver Name',
      'Invoice Number',
      'Invoice date',
      'Invoice Value',
      'Place Of Supply',
      'Reverse Charge',
      'Applicable % of Tax Rate',
      'Invoice Type',
      'E-Commerce GSTIN',
      'Rate',
      'Taxable Value',
      'Cess Amount',
    ],
  ];

  b2bSales.forEach((s) => {
    const totalVal = Number((s.taxableValue + s.igst + s.cgst + s.sgst + s.cess).toFixed(2));
    const dParts = s.invoiceDate.split('-');
    const formattedDate = dParts.length === 3 ? `${dParts[2]}-${dParts[1]}-${dParts[0]}` : s.invoiceDate;

    rows.push([
      s.customerGstin,
      s.customerName,
      s.invoiceNo,
      formattedDate,
      totalVal,
      `${s.posCode}-${s.posState}`,
      s.reverseCharge || 'N',
      '',
      'Regular',
      '',
      s.rate,
      s.taxableValue,
      s.cess || 0,
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const csvContent = XLSX.utils.sheet_to_csv(ws);

  return {
    id: `GEN-GSTR1-B2B-${Date.now()}`,
    companyId: company.id,
    module: 'GST',
    fileType: 'GSTR1_B2B_CSV',
    fileName: `${company.gstin}_GSTR1_B2B_${period}.csv`,
    fileContent: csvContent,
    monthYearOrQuarter: monthYear,
    createdAt: new Date().toISOString(),
    recordCount: b2bSales.length,
    fileSizeKb: Number((csvContent.length / 1024).toFixed(2)),
  };
}

export function generateGstr1B2csCsv(company: Company, allSales: SalesInvoice[], monthYear: string): GeneratedFile {
  const sales = allSales.filter((s) => s.monthYear === monthYear);
  const period = formatGstPeriod(monthYear);
  const b2csSales = sales.filter((s) => s.invoiceType === 'B2CS' || !s.customerGstin || s.customerGstin.length < 15);

  // Group by POS, Rate, Supply Type
  const groupMap: Record<string, { type: string; pos: string; posCode: string; rate: number; txval: number; cess: number }> = {};

  b2csSales.forEach((s) => {
    const splyType = 'OE'; // Other Than E-Commerce
    const key = `${splyType}_${s.posCode}_${s.rate}`;
    if (!groupMap[key]) {
      groupMap[key] = {
        type: splyType,
        pos: `${s.posCode}-${s.posState}`,
        posCode: s.posCode,
        rate: s.rate,
        txval: 0,
        cess: 0,
      };
    }
    groupMap[key].txval += s.taxableValue;
    groupMap[key].cess += s.cess || 0;
  });

  const rows: any[][] = [
    ['Type', 'Place Of Supply', 'Applicable % of Tax Rate', 'Rate', 'Taxable Value', 'Cess Amount', 'E-Commerce GSTIN'],
  ];

  Object.values(groupMap).forEach((g) => {
    rows.push([g.type, g.pos, '', g.rate, Number(g.txval.toFixed(2)), Number(g.cess.toFixed(2)), '']);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const csvContent = XLSX.utils.sheet_to_csv(ws);

  return {
    id: `GEN-GSTR1-B2CS-${Date.now()}`,
    companyId: company.id,
    module: 'GST',
    fileType: 'GSTR1_B2CS_CSV',
    fileName: `${company.gstin}_GSTR1_B2CS_${period}.csv`,
    fileContent: csvContent,
    monthYearOrQuarter: monthYear,
    createdAt: new Date().toISOString(),
    recordCount: Object.keys(groupMap).length,
    fileSizeKb: Number((csvContent.length / 1024).toFixed(2)),
  };
}

export function generateGstr1HsnCsv(company: Company, allSales: SalesInvoice[], monthYear: string): GeneratedFile {
  const sales = allSales.filter((s) => s.monthYear === monthYear);
  const period = formatGstPeriod(monthYear);

  const hsnMap: Record<string, { hsn: string; desc: string; uqc: string; qty: number; val: number; txval: number; iamt: number; camt: number; samt: number; cess: number }> = {};

  sales.forEach((s) => {
    const key = `${s.hsnCode}_${s.rate}`;
    const invVal = s.taxableValue + s.igst + s.cgst + s.sgst + s.cess;
    if (!hsnMap[key]) {
      hsnMap[key] = {
        hsn: s.hsnCode || '998313',
        desc: s.description || 'Services',
        uqc: s.uqc || 'NOS',
        qty: 0,
        val: 0,
        txval: 0,
        iamt: 0,
        camt: 0,
        samt: 0,
        cess: 0,
      };
    }
    hsnMap[key].qty += s.quantity || 1;
    hsnMap[key].val += invVal;
    hsnMap[key].txval += s.taxableValue;
    hsnMap[key].iamt += s.igst;
    hsnMap[key].camt += s.cgst;
    hsnMap[key].samt += s.sgst;
    hsnMap[key].cess += s.cess || 0;
  });

  const rows: any[][] = [
    [
      'HSN',
      'Description',
      'UQC',
      'Total Quantity',
      'Total Value',
      'Taxable Value',
      'Integrated Tax Amount',
      'Central Tax Amount',
      'State/UT Tax Amount',
      'Cess Amount',
    ],
  ];

  Object.values(hsnMap).forEach((h) => {
    rows.push([
      h.hsn,
      h.desc,
      h.uqc,
      Number(h.qty.toFixed(2)),
      Number(h.val.toFixed(2)),
      Number(h.txval.toFixed(2)),
      Number(h.iamt.toFixed(2)),
      Number(h.camt.toFixed(2)),
      Number(h.samt.toFixed(2)),
      Number(h.cess.toFixed(2)),
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const csvContent = XLSX.utils.sheet_to_csv(ws);

  return {
    id: `GEN-GSTR1-HSN-${Date.now()}`,
    companyId: company.id,
    module: 'GST',
    fileType: 'GSTR1_HSN_CSV',
    fileName: `${company.gstin}_GSTR1_HSN_${period}.csv`,
    fileContent: csvContent,
    monthYearOrQuarter: monthYear,
    createdAt: new Date().toISOString(),
    recordCount: Object.keys(hsnMap).length,
    fileSizeKb: Number((csvContent.length / 1024).toFixed(2)),
  };
}

export function generateGstr3bSummary(
  company: Company,
  allSales: SalesInvoice[],
  allPurchases: PurchaseInvoice[],
  monthYear: string = previousMonthYear(),
  actualFilingDate: string = todayIso(),
  turnoverSlab: TurnoverSlab = '1.5CR_TO_5CR'
) {
  const sales = allSales.filter((s) => s.monthYear === monthYear);
  const purchases = allPurchases.filter((p) => p.monthYear === monthYear);

  // 3.1 Outward supplies summary. Reverse-charge sales are excluded from the supplier's own tax
  // liability: under RCM, the recipient self-assesses and pays that tax directly to the
  // government, so including it here would double-count/misattribute the liability. The taxable
  // value is still counted (the underlying supply still occurred), only the tax columns exclude it.
  // Export (zero-rated) supplies are tracked separately (Table 3.1(b)) rather than commingled
  // with regular domestic supplies (Table 3.1(a)), since they have fundamentally different
  // treatment (zero-rated under LUT, or IGST paid and later refunded) and must be disclosed
  // separately on the actual filed return.
  let taxableOutward = 0;
  let igstOutward = 0;
  let cgstOutward = 0;
  let sgstOutward = 0;
  let cessOutward = 0;
  let taxableZeroRated = 0;
  let igstZeroRated = 0;

  sales.forEach((s) => {
    if (s.invoiceType === 'EXPORT') {
      taxableZeroRated += s.taxableValue;
      igstZeroRated += s.igst;
      // WPAY exports (IGST actually charged, later refunded via a separate process) still
      // create a real, current cash/ITC liability that must be paid now -- only the disclosure
      // row differs. WOPAY exports (igst=0) are unaffected either way.
      igstOutward += s.igst;
      return;
    }
    taxableOutward += s.taxableValue;
    if (s.reverseCharge !== 'Y') {
      igstOutward += s.igst;
      cgstOutward += s.cgst;
      sgstOutward += s.sgst;
      cessOutward += s.cess || 0;
    }
  });

  // Table 3.2: Inter-state supplies to unregistered persons, broken down by destination
  // (place of supply) state -- required disclosure distinct from the aggregate totals in 3.1.
  // The official form also includes composition taxpayers and UIN holders in this table, but the
  // current data model has no field distinguishing those from a simple unregistered customer, so
  // this covers the identifiable case (no GSTIN) rather than silently omitting the whole table.
  const interStateUnregisteredByState: Record<string, { posCode: string; posState: string; taxableValue: number; igst: number }> = {};
  sales.forEach((s) => {
    if (s.invoiceType === 'EXPORT' || s.reverseCharge === 'Y') return;
    const isUnregistered = !s.customerGstin || s.customerGstin.trim().length !== 15;
    const isInterState = s.posCode !== company.stateCode;
    if (!isUnregistered || !isInterState) return;
    if (!interStateUnregisteredByState[s.posCode]) {
      interStateUnregisteredByState[s.posCode] = { posCode: s.posCode, posState: s.posState, taxableValue: 0, igst: 0 };
    }
    interStateUnregisteredByState[s.posCode].taxableValue += s.taxableValue;
    interStateUnregisteredByState[s.posCode].igst += s.igst;
  });
  const table32_InterStateUnregistered = Object.values(interStateUnregisteredByState)
    .map((r) => ({ ...r, taxableValue: Number(r.taxableValue.toFixed(2)), igst: Number(r.igst.toFixed(2)) }))
    .sort((a, b) => a.posCode.localeCompare(b.posCode));

  // 3.1(d) Inward supplies liable to reverse charge, and 4. Eligible ITC summary.
  let taxableInward = 0;
  let igstItc = 0;
  let cgstItc = 0;
  let sgstItc = 0;
  let cessItc = 0;
  let rcmTaxableInward = 0;
  let rcmIgst = 0;
  let rcmCgst = 0;
  let rcmSgst = 0;
  let rcmCess = 0;
  // Table 4(B): ITC not availed (ineligible) -- tracked separately so the exclusion is visible
  // and explainable, not just a silently smaller ITC total than the full purchase register shows.
  let ineligibleTaxableValue = 0;
  let ineligibleIgst = 0;
  let ineligibleCgst = 0;
  let ineligibleSgst = 0;
  let ineligibleCess = 0;

  purchases.forEach((p) => {
    if (p.reverseCharge === 'Y') {
      rcmTaxableInward += p.taxableValue;
      rcmIgst += p.igst;
      rcmCgst += p.cgst;
      rcmSgst += p.sgst;
      rcmCess += p.cess || 0;
    }
    if (p.itcEligible === 'Y') {
      taxableInward += p.taxableValue;
      igstItc += p.igst;
      cgstItc += p.cgst;
      sgstItc += p.sgst;
      cessItc += p.cess || 0;
    } else {
      ineligibleTaxableValue += p.taxableValue;
      ineligibleIgst += p.igst;
      ineligibleCgst += p.cgst;
      ineligibleSgst += p.sgst;
      ineligibleCess += p.cess || 0;
    }
  });

  const rcmCashRequired = Number((rcmIgst + rcmCgst + rcmSgst + rcmCess).toFixed(2));

  const period = formatGstPeriod(monthYear);

  // Late Fee & Interest Engine Computation
  const lateFeeEngine = calculateGstLateFeeAndInterest(
    company,
    sales,
    purchases,
    monthYear,
    actualFilingDate,
    turnoverSlab
  );

  // Net tax payable after Rule 88A ITC cross-utilization (IGST credit first against IGST, then
  // CGST, then SGST; CGST/SGST credit never cross the CGST/SGST boundary) -- using the same
  // computeItcSetoff as the late-fee engine so this figure and lateFeeEngine.netCashLiability
  // always agree, rather than each computing an independent (and differing) net liability.
  const netTaxPayable = computeItcSetoff(
    { igst: igstOutward, cgst: cgstOutward, sgst: sgstOutward, cess: cessOutward },
    { igst: igstItc, cgst: cgstItc, sgst: sgstItc, cess: cessItc }
  );
  // Unutilized ITC balance carried forward to the next return period (e.g. an ITC-heavy month
  // leaves a credit balance rather than a negative liability) -- must be tracked and disclosed,
  // not silently discarded when net liability is floored at zero.
  const excessItcCarriedForward = computeExcessItc(
    { igst: igstOutward, cgst: cgstOutward, sgst: sgstOutward, cess: cessOutward },
    { igst: igstItc, cgst: cgstItc, sgst: sgstItc, cess: cessItc }
  );

  const summary = {
    gstin: company.gstin,
    legalName: company.legalName,
    period,
    table31_OutwardSupplies: {
      a_taxableSupplies: {
        totalTaxableValue: Number(taxableOutward.toFixed(2)),
        integratedTax: Number((igstOutward - igstZeroRated).toFixed(2)),
        centralTax: Number(cgstOutward.toFixed(2)),
        stateTax: Number(sgstOutward.toFixed(2)),
        cess: Number(cessOutward.toFixed(2)),
      },
      // Table 3.1(b): Outward taxable supplies (zero rated) -- exports. Taxable value and any
      // actual IGST charged (WPAY exports; zero for WOPAY/LUT exports) are shown here rather
      // than blended into 3.1(a)'s regular domestic supplies.
      b_zeroRatedSupplies: {
        totalTaxableValue: Number(taxableZeroRated.toFixed(2)),
        integratedTax: Number(igstZeroRated.toFixed(2)),
      },
      // Table 3.1(d): Inward supplies liable to reverse charge. Must be paid via cash ledger
      // only -- existing ITC cannot reduce this, regardless of credit balance (Section 16 /
      // Rule 85). See rcmCashRequired below for the mandatory cash impact.
      d_inwardSuppliesRCM: {
        totalTaxableValue: Number(rcmTaxableInward.toFixed(2)),
        integratedTax: Number(rcmIgst.toFixed(2)),
        centralTax: Number(rcmCgst.toFixed(2)),
        stateTax: Number(rcmSgst.toFixed(2)),
        cess: Number(rcmCess.toFixed(2)),
      },
    },
    // Table 3.2: inter-state supplies to unregistered persons, by destination state.
    table32_InterStateUnregistered,
    table4_EligibleITC: {
      a5_allOtherITC: {
        integratedTax: Number(igstItc.toFixed(2)),
        centralTax: Number(cgstItc.toFixed(2)),
        stateTax: Number(sgstItc.toFixed(2)),
        cess: Number(cessItc.toFixed(2)),
      },
      // Table 4(B): ITC not availed / ineligible -- disclosed separately so the exclusion from
      // the eligible ITC total above is visible and explainable.
      b1_ineligibleItc: {
        totalTaxableValue: Number(ineligibleTaxableValue.toFixed(2)),
        integratedTax: Number(ineligibleIgst.toFixed(2)),
        centralTax: Number(ineligibleCgst.toFixed(2)),
        stateTax: Number(ineligibleSgst.toFixed(2)),
        cess: Number(ineligibleCess.toFixed(2)),
      },
    },
    netTaxPayable: {
      integratedTax: Number(netTaxPayable.igst.toFixed(2)),
      centralTax: Number(netTaxPayable.cgst.toFixed(2)),
      stateTax: Number(netTaxPayable.sgst.toFixed(2)),
      cess: Number(netTaxPayable.cess.toFixed(2)),
    },
    // Unutilized ITC balance carried forward to the next return period.
    excessItcCarriedForward: {
      integratedTax: Number(excessItcCarriedForward.igst.toFixed(2)),
      centralTax: Number(excessItcCarriedForward.cgst.toFixed(2)),
      stateTax: Number(excessItcCarriedForward.sgst.toFixed(2)),
      cess: Number(excessItcCarriedForward.cess.toFixed(2)),
      total: Number(excessItcCarriedForward.total.toFixed(2)),
    },
    // Mandatory cash-only RCM liability (Table 3.1(d)) -- always payable in full regardless of
    // ITC balance, so it's kept separate from netTaxPayable rather than merged into it.
    rcmCashRequired,
    // Total cash a business actually needs to have available to file: the regular net liability
    // (after Rule 88A ITC set-off) plus the mandatory RCM cash requirement on top of it.
    totalCashRequired: Number((netTaxPayable.igst + netTaxPayable.cgst + netTaxPayable.sgst + netTaxPayable.cess + rcmCashRequired).toFixed(2)),
    table51_InterestAndLateFee: {
      daysDelayedGstr3b: lateFeeEngine.daysDelayedGstr3b,
      daysDelayedGstr1: lateFeeEngine.daysDelayedGstr1,
      interestPayable: lateFeeEngine.interestSection50,
      lateFeePayableGstr3b: lateFeeEngine.gstr3bLateFee,
      lateFeePayableGstr1: lateFeeEngine.gstr1LateFee,
      statutoryDueDates: {
        gstr1DueDate: lateFeeEngine.gstr1DueDate,
        gstr3bDueDate: lateFeeEngine.gstr3bDueDate,
      },
    },
    lateFeeEngineDetails: lateFeeEngine,
  };

  return summary;
}

export function generateGstr3bExcel(
  company: Company,
  sales: SalesInvoice[],
  purchases: PurchaseInvoice[],
  monthYear: string = previousMonthYear(),
  actualFilingDate: string = todayIso(),
  turnoverSlab: TurnoverSlab = '1.5CR_TO_5CR'
): GeneratedFile {
  const summary = generateGstr3bSummary(company, sales, purchases, monthYear, actualFilingDate, turnoverSlab);
  const period = formatGstPeriod(monthYear);
  const engine = summary.lateFeeEngineDetails;

  const wb = XLSX.utils.book_new();

  // Sheet 1: GSTR-3B Summary Table
  const tableData = [
    ['GSTR-3B Auto-Calculated Return Summary with Statutory Interest & Late Fees'],
    ['Company Name', company.legalName],
    ['GSTIN', company.gstin],
    ['Return Period', monthYear],
    ['GSTR-3B Statutory Due Date', engine.gstr3bDueDate],
    ['Actual / Intended Filing Date', engine.actualFilingDate],
    ['Filing Delay (Days)', engine.daysDelayedGstr3b],
    ['Turnover Slab', turnoverSlab.replace('_', ' ')],
    [''],
    ['3.1 Details of Outward Supplies and inward supplies liable to reverse charge'],
    ['Nature of Supplies', 'Total Taxable Value (₹)', 'Integrated Tax (₹)', 'Central Tax (₹)', 'State/UT Tax (₹)', 'Cess (₹)'],
    [
      '(a) Outward taxable supplies (other than zero rated, nil rated and exempted)',
      summary.table31_OutwardSupplies.a_taxableSupplies.totalTaxableValue,
      summary.table31_OutwardSupplies.a_taxableSupplies.integratedTax,
      summary.table31_OutwardSupplies.a_taxableSupplies.centralTax,
      summary.table31_OutwardSupplies.a_taxableSupplies.stateTax,
      summary.table31_OutwardSupplies.a_taxableSupplies.cess,
    ],
    [
      '(b) Outward taxable supplies (zero rated) — Exports',
      summary.table31_OutwardSupplies.b_zeroRatedSupplies.totalTaxableValue,
      summary.table31_OutwardSupplies.b_zeroRatedSupplies.integratedTax,
      0,
      0,
      0,
    ],
    [
      '(d) Inward supplies (liable to reverse charge) — Cash Ledger Only, Not Offsettable by ITC',
      summary.table31_OutwardSupplies.d_inwardSuppliesRCM.totalTaxableValue,
      summary.table31_OutwardSupplies.d_inwardSuppliesRCM.integratedTax,
      summary.table31_OutwardSupplies.d_inwardSuppliesRCM.centralTax,
      summary.table31_OutwardSupplies.d_inwardSuppliesRCM.stateTax,
      summary.table31_OutwardSupplies.d_inwardSuppliesRCM.cess,
    ],
    [''],
    ['3.2 Of the supplies shown in 3.1(a), inter-state supplies made to unregistered persons, by destination state'],
    ['Place of Supply (State Code)', 'State Name', 'Total Taxable Value (₹)', 'Integrated Tax (₹)'],
    ...(summary.table32_InterStateUnregistered.length > 0
      ? summary.table32_InterStateUnregistered.map((r) => [r.posCode, r.posState, r.taxableValue, r.igst])
      : [['No inter-state supplies to unregistered persons this period', '', '', '']]),
    [''],
    ['4. Eligible ITC (Input Tax Credit)'],
    ['Details', 'Integrated Tax (₹)', 'Central Tax (₹)', 'State/UT Tax (₹)', 'Cess (₹)'],
    [
      '(A)(5) All other ITC (From Purchase Register, includes RCM tax once paid)',
      summary.table4_EligibleITC.a5_allOtherITC.integratedTax,
      summary.table4_EligibleITC.a5_allOtherITC.centralTax,
      summary.table4_EligibleITC.a5_allOtherITC.stateTax,
      summary.table4_EligibleITC.a5_allOtherITC.cess,
    ],
    [
      '(B)(1) ITC Reversed / Not Availed (Ineligible — Sec 17(5) or marked ineligible in purchase register)',
      summary.table4_EligibleITC.b1_ineligibleItc.integratedTax,
      summary.table4_EligibleITC.b1_ineligibleItc.centralTax,
      summary.table4_EligibleITC.b1_ineligibleItc.stateTax,
      summary.table4_EligibleITC.b1_ineligibleItc.cess,
    ],
    [''],
    ['5. Net Tax Liability (Estimated before Late Fees & Interest)'],
    ['Tax Type', 'Outward Tax', 'ITC Available', 'Net Cash Payable (Regular, excl. RCM)', 'Excess ITC Carried Forward'],
    ['IGST', summary.table31_OutwardSupplies.a_taxableSupplies.integratedTax, summary.table4_EligibleITC.a5_allOtherITC.integratedTax, summary.netTaxPayable.integratedTax, summary.excessItcCarriedForward.integratedTax],
    ['CGST', summary.table31_OutwardSupplies.a_taxableSupplies.centralTax, summary.table4_EligibleITC.a5_allOtherITC.centralTax, summary.netTaxPayable.centralTax, summary.excessItcCarriedForward.centralTax],
    ['SGST', summary.table31_OutwardSupplies.a_taxableSupplies.stateTax, summary.table4_EligibleITC.a5_allOtherITC.stateTax, summary.netTaxPayable.stateTax, summary.excessItcCarriedForward.stateTax],
    ['Cess', summary.table31_OutwardSupplies.a_taxableSupplies.cess, summary.table4_EligibleITC.a5_allOtherITC.cess, summary.netTaxPayable.cess, summary.excessItcCarriedForward.cess],
    ['Total Excess ITC Carried Forward to Next Period', '', '', '', summary.excessItcCarriedForward.total],
    [''],
    ['5.0(b) Reverse Charge (RCM) Cash Requirement — Cannot be offset by ITC, regardless of balance'],
    ['Tax Type', 'RCM Liability (₹)'],
    ['IGST', summary.table31_OutwardSupplies.d_inwardSuppliesRCM.integratedTax],
    ['CGST', summary.table31_OutwardSupplies.d_inwardSuppliesRCM.centralTax],
    ['SGST', summary.table31_OutwardSupplies.d_inwardSuppliesRCM.stateTax],
    ['Cess', summary.table31_OutwardSupplies.d_inwardSuppliesRCM.cess],
    ['Total RCM Cash Required', summary.rcmCashRequired],
    [''],
    ['5.1 Interest and Late Fee Payable (Section 47 & Section 50)'],
    ['Description', 'Integrated Tax (₹)', 'Central Tax (₹)', 'State/UT Tax (₹)', 'Cess (₹)', 'Total (₹)'],
    [
      'Interest Payable @ 18% p.a. on Net Cash (Sec 50(1))',
      engine.interestSection50.igst,
      engine.interestSection50.cgst,
      engine.interestSection50.sgst,
      engine.interestSection50.cess,
      engine.interestSection50.total,
    ],
    [
      `Late Fee Payable (Sec 47 - ${engine.daysDelayedGstr3b} Days Delayed)`,
      0,
      engine.gstr3bLateFee.cgst,
      engine.gstr3bLateFee.sgst,
      0,
      engine.gstr3bLateFee.total,
    ],
    [''],
    ['GRAND TOTAL CASH REQUIREMENT SUMMARY (Net Tax + RCM + Interest + Late Fee)'],
    ['Tax / Fee Component', 'Amount (₹)'],
    ['Net Regular Cash Tax Payable', engine.netCashLiability.total - summary.rcmCashRequired],
    ['Reverse Charge (RCM) Cash Required (Table 3.1(d))', summary.rcmCashRequired],
    ['Sec 50(1) Interest @ 18% p.a.', engine.interestSection50.total],
    ['Sec 47 GSTR-3B Late Fee', engine.gstr3bLateFee.total],
    ['Total Cash Requirement (PMT-06 Challan)', engine.grandTotalCashPayable],
    [''],
    ['Invoice Level Late Payment & Interest Notice Audit'],
    ['Invoice No', 'Invoice Date', 'Customer Name', 'Taxable Value (₹)', 'Total Tax (₹)', 'Days Delayed', 'Status Notice'],
    ...engine.invoiceDelayNotices.map((n) => [
      n.invoiceNo,
      n.invoiceDate,
      n.customerName,
      n.taxableValue,
      n.totalTax,
      n.daysDelayedFromInvoice,
      n.statusNotice,
    ]),
    [''],
    ['Statutory Notes & Legal Compliance'],
    ...engine.statutoryNotes.map((note) => [note]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(tableData);
  XLSX.utils.book_append_sheet(wb, ws, 'GSTR-3B & Late Fee Summary');

  const csvContent = XLSX.utils.sheet_to_csv(ws);

  return {
    id: `GEN-GSTR3B-${Date.now()}`,
    companyId: company.id,
    module: 'GST',
    fileType: 'GSTR3B_EXCEL',
    fileName: `${company.gstin}_GSTR3B_With_LateFees_${period}.csv`,
    fileContent: csvContent,
    monthYearOrQuarter: monthYear,
    createdAt: new Date().toISOString(),
    recordCount: sales.length + purchases.length,
    fileSizeKb: Number((csvContent.length / 1024).toFixed(2)),
  };
}
