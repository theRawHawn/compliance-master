import {
  Company,
  SalesInvoice,
  PurchaseInvoice,
  VendorPayment,
  PayrollRun,
  ErpConfig,
  ErpSyncLog,
  BankPayoutBatch,
} from '../types';

/**
  Tally Prime XML Generator & Zoho Books Payload Engine
 */

export const DEFAULT_ERP_CONFIG: ErpConfig = {
  tallyHost: 'http://localhost',
  tallyPort: 9000,
  tallyCompany: 'Demo Private Limited',
  zohoOrgId: '890123456',
  zohoClientId: '1000.ZOHO_CLIENT_ID',
  zohoClientSecret: 'zoho_secret_key_prod',
  zohoRefreshToken: '1000.refresh_token_prod',
  zohoDomain: 'in',
  salesLedger: 'Sales Account',
  purchaseLedger: 'Purchase Account',
  cgstLedger: 'Output CGST',
  sgstLedger: 'Output SGST',
  igstLedger: 'Output IGST',
  tdsPayableLedger: 'TDS Payable A/c',
  salaryExpenseLedger: 'Salaries & Wages A/c',
  pfPayableLedger: 'Provident Fund Payable A/c',
  esiPayableLedger: 'ESIC Payable A/c',
  ptPayableLedger: 'Professional Tax Payable A/c',
  bankAccountLedger: 'HDFC Bank A/c - 50200011223344',
};

/**
 * Generate Tally Prime XML for Sales Invoices (Voucher Type: Sales)
 */
export function generateTallySalesXml(
  company: Company,
  invoices: SalesInvoice[],
  config: ErpConfig
): string {
  let xml = `<?xml version="1.0"?>\n<ENVELOPE>\n <HEADER>\n  <TALLYREQUEST>Import Data</TALLYREQUEST>\n </HEADER>\n <BODY>\n  <IMPORTDATA>\n   <REQUESTDESC>\n    <REPORTNAME>Vouchers</REPORTNAME>\n    <STATICVARIABLES>\n     <SVCURRENTCOMPANY>${company.legalName}</SVCURRENTCOMPANY>\n    </STATICVARIABLES>\n   </REQUESTDESC>\n   <REQUESTDATA>\n`;

  invoices.forEach((inv) => {
    const formattedDate = inv.invoiceDate.replace(/-/g, '');
    xml += `    <TALLYMESSAGE xmlns:UDF="TallyUDF">\n`;
    xml += `     <VOUCHER VCHTYPE="Sales" ACTION="Create" OBJVIEW="Accounting Voucher View">\n`;
    xml += `      <DATE>${formattedDate}</DATE>\n`;
    xml += `      <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>\n`;
    xml += `      <VOUCHERNUMBER>${inv.invoiceNo}</VOUCHERNUMBER>\n`;
    xml += `      <PARTYLEDGERNAME>${inv.customerName}</PARTYLEDGERNAME>\n`;
    xml += `      <NARRATION>GST Sales Invoice ${inv.invoiceNo} - POS: ${inv.posState}</NARRATION>\n`;

    const totalInvoiceVal = inv.taxableValue + inv.igst + inv.cgst + inv.sgst;

    // Party Debit Entry
    xml += `      <ALLLEDGERENTRIES.LIST>\n`;
    xml += `       <LEDGERNAME>${inv.customerName}</LEDGERNAME>\n`;
    xml += `       <ISDEEMEDPOSITIVE>YES</ISDEEMEDPOSITIVE>\n`;
    xml += `       <AMOUNT>-${totalInvoiceVal.toFixed(2)}</AMOUNT>\n`;
    xml += `      </ALLLEDGERENTRIES.LIST>\n`;

    // Sales Ledger Credit
    xml += `      <ALLLEDGERENTRIES.LIST>\n`;
    xml += `       <LEDGERNAME>${config.salesLedger}</LEDGERNAME>\n`;
    xml += `       <ISDEEMEDPOSITIVE>NO</ISDEEMEDPOSITIVE>\n`;
    xml += `       <AMOUNT>${inv.taxableValue.toFixed(2)}</AMOUNT>\n`;
    xml += `      </ALLLEDGERENTRIES.LIST>\n`;

    // GST Taxes Credit
    if (inv.cgst > 0) {
      xml += `      <ALLLEDGERENTRIES.LIST>\n`;
      xml += `       <LEDGERNAME>${config.cgstLedger}</LEDGERNAME>\n`;
      xml += `       <ISDEEMEDPOSITIVE>NO</ISDEEMEDPOSITIVE>\n`;
      xml += `       <AMOUNT>${inv.cgst.toFixed(2)}</AMOUNT>\n`;
      xml += `      </ALLLEDGERENTRIES.LIST>\n`;
    }
    if (inv.sgst > 0) {
      xml += `      <ALLLEDGERENTRIES.LIST>\n`;
      xml += `       <LEDGERNAME>${config.sgstLedger}</LEDGERNAME>\n`;
      xml += `       <ISDEEMEDPOSITIVE>NO</ISDEEMEDPOSITIVE>\n`;
      xml += `       <AMOUNT>${inv.sgst.toFixed(2)}</AMOUNT>\n`;
      xml += `      </ALLLEDGERENTRIES.LIST>\n`;
    }
    if (inv.igst > 0) {
      xml += `      <ALLLEDGERENTRIES.LIST>\n`;
      xml += `       <LEDGERNAME>${config.igstLedger}</LEDGERNAME>\n`;
      xml += `       <ISDEEMEDPOSITIVE>NO</ISDEEMEDPOSITIVE>\n`;
      xml += `       <AMOUNT>${inv.igst.toFixed(2)}</AMOUNT>\n`;
      xml += `      </ALLLEDGERENTRIES.LIST>\n`;
    }

    xml += `     </VOUCHER>\n`;
    xml += `    </TALLYMESSAGE>\n`;
  });

  xml += `   </REQUESTDATA>\n  </IMPORTDATA>\n </BODY>\n</ENVELOPE>`;
  return xml;
}

/**
 * Generate Tally Prime XML for Payroll Salary Voucher
 */
export function generateTallyPayrollXml(
  company: Company,
  payroll: PayrollRun,
  config: ErpConfig
): string {
  const formattedDate = `${payroll.monthYear.replace('-', '')}28`;
  let xml = `<?xml version="1.0"?>\n<ENVELOPE>\n <HEADER>\n  <TALLYREQUEST>Import Data</TALLYREQUEST>\n </HEADER>\n <BODY>\n  <IMPORTDATA>\n   <REQUESTDESC>\n    <REPORTNAME>Vouchers</REPORTNAME>\n    <STATICVARIABLES>\n     <SVCURRENTCOMPANY>${company.legalName}</SVCURRENTCOMPANY>\n    </STATICVARIABLES>\n   </REQUESTDESC>\n   <REQUESTDATA>\n`;

  xml += `    <TALLYMESSAGE xmlns:UDF="TallyUDF">\n`;
  xml += `     <VOUCHER VCHTYPE="Payroll" ACTION="Create" OBJVIEW="Accounting Voucher View">\n`;
  xml += `      <DATE>${formattedDate}</DATE>\n`;
  xml += `      <VOUCHERTYPENAME>Payroll</VOUCHERTYPENAME>\n`;
  xml += `      <VOUCHERNUMBER>PAYROLL/${payroll.monthYear}</VOUCHERNUMBER>\n`;
  xml += `      <NARRATION>Salary & Statutory Dues Provision for ${payroll.monthYear} (${payroll.totalEmployees} Employees)</NARRATION>\n`;

  // Gross Salary Expense (Debit)
  xml += `      <ALLLEDGERENTRIES.LIST>\n`;
  xml += `       <LEDGERNAME>${config.salaryExpenseLedger}</LEDGERNAME>\n`;
  xml += `       <ISDEEMEDPOSITIVE>YES</ISDEEMEDPOSITIVE>\n`;
  xml += `       <AMOUNT>-${payroll.totalGrossSalary.toFixed(2)}</AMOUNT>\n`;
  xml += `      </ALLLEDGERENTRIES.LIST>\n`;

  // PF Payable (Credit)
  const totalPf = payroll.totalPfEmp + payroll.totalPfEmpr;
  if (totalPf > 0) {
    xml += `      <ALLLEDGERENTRIES.LIST>\n`;
    xml += `       <LEDGERNAME>${config.pfPayableLedger}</LEDGERNAME>\n`;
    xml += `       <ISDEEMEDPOSITIVE>NO</ISDEEMEDPOSITIVE>\n`;
    xml += `       <AMOUNT>${totalPf.toFixed(2)}</AMOUNT>\n`;
    xml += `      </ALLLEDGERENTRIES.LIST>\n`;
  }

  // ESI Payable (Credit)
  const totalEsi = payroll.totalEsiEmp + payroll.totalEsiEmpr;
  if (totalEsi > 0) {
    xml += `      <ALLLEDGERENTRIES.LIST>\n`;
    xml += `       <LEDGERNAME>${config.esiPayableLedger}</LEDGERNAME>\n`;
    xml += `       <ISDEEMEDPOSITIVE>NO</ISDEEMEDPOSITIVE>\n`;
    xml += `       <AMOUNT>${totalEsi.toFixed(2)}</AMOUNT>\n`;
    xml += `      </ALLLEDGERENTRIES.LIST>\n`;
  }

  // PT Payable (Credit)
  if (payroll.totalPt > 0) {
    xml += `      <ALLLEDGERENTRIES.LIST>\n`;
    xml += `       <LEDGERNAME>${config.ptPayableLedger}</LEDGERNAME>\n`;
    xml += `       <ISDEEMEDPOSITIVE>NO</ISDEEMEDPOSITIVE>\n`;
    xml += `       <AMOUNT>${payroll.totalPt.toFixed(2)}</AMOUNT>\n`;
    xml += `      </ALLLEDGERENTRIES.LIST>\n`;
  }

  // Net Bank Payable (Credit)
  const netPayable =
    payroll.totalGrossSalary - payroll.totalPfEmp - payroll.totalEsiEmp - payroll.totalPt - payroll.totalTds;
  xml += `      <ALLLEDGERENTRIES.LIST>\n`;
  xml += `       <LEDGERNAME>${config.bankAccountLedger}</LEDGERNAME>\n`;
  xml += `       <ISDEEMEDPOSITIVE>NO</ISDEEMEDPOSITIVE>\n`;
  xml += `       <AMOUNT>${netPayable.toFixed(2)}</AMOUNT>\n`;
  xml += `      </ALLLEDGERENTRIES.LIST>\n`;

  xml += `     </VOUCHER>\n`;
  xml += `    </TALLYMESSAGE>\n`;
  xml += `   </REQUESTDATA>\n  </IMPORTDATA>\n </BODY>\n</ENVELOPE>`;

  return xml;
}

/**
 * Generate Zoho Books JSON API Payloads
 */
export function generateZohoSalesPayload(company: Company, invoices: SalesInvoice[]) {
  return {
    organization_id: '890123456',
    invoices: invoices.map((inv) => ({
      customer_name: inv.customerName,
      invoice_number: inv.invoiceNo,
      date: inv.invoiceDate,
      place_of_supply: inv.posState,
      gst_treatment: inv.customerGstin ? 'business_gst' : 'consumer',
      gstin: inv.customerGstin || '',
      line_items: [
        {
          name: inv.description || 'Sales Item',
          hsn_or_sac: inv.hsnCode,
          rate: inv.taxableValue,
          quantity: 1,
          tax_percentage: inv.rate,
        },
      ],
    })),
  };
}

export function generateZohoPayrollJournalPayload(company: Company, payroll: PayrollRun) {
  const netPayable =
    payroll.totalGrossSalary - payroll.totalPfEmp - payroll.totalEsiEmp - payroll.totalPt - payroll.totalTds;
  return {
    journal_number: `JRN-PAYROLL-${payroll.monthYear}`,
    journal_date: `${payroll.monthYear}-28`,
    reference_number: `BYALANCE-PAY-${payroll.id}`,
    notes: `Monthly Payroll Entry for ${payroll.monthYear} (${company.legalName})`,
    line_items: [
      {
        account_name: 'Salaries and Employee Wages',
        debit_or_credit: 'debit',
        amount: payroll.totalGrossSalary,
      },
      {
        account_name: 'Employee Provident Fund Payable',
        debit_or_credit: 'credit',
        amount: payroll.totalPfEmp + payroll.totalPfEmpr,
      },
      {
        account_name: 'ESIC Payable',
        debit_or_credit: 'credit',
        amount: payroll.totalEsiEmp + payroll.totalEsiEmpr,
      },
      {
        account_name: 'Professional Tax Payable',
        debit_or_credit: 'credit',
        amount: payroll.totalPt,
      },
      {
        account_name: 'Bank Clearing Account',
        debit_or_credit: 'credit',
        amount: netPayable,
      },
    ],
  };
}

/**
 * Direct Bank Bulk CMS File Generators (HDFC, ICICI, SBI)
 */
export function generateBankPayoutFile(
  company: Company,
  payroll: PayrollRun,
  bankFormat: 'HDFC_CMS' | 'ICICI_CIB' | 'SBI_BULK'
): BankPayoutBatch {
  let content = '';
  let extension = 'csv';

  if (bankFormat === 'HDFC_CMS') {
    extension = 'txt';
    // HDFC ENET Corporate File Format
    content += `HEADER|HDFC_ENET_SALARY|${company.legalName}|${payroll.monthYear}|${payroll.lines.length}\n`;
    payroll.lines.forEach((l, idx) => {
      // Line: RecordType|BeneficiaryAcc|Amount|BeneficiaryName|IFSC|RefNo|Narration
      content += `P|50100012345${idx + 10}|${l.netSalary.toFixed(2)}|${l.empName}|HDFC0000123|SAL-${l.employeeId}|Salary for ${payroll.monthYear}\n`;
    });
    content += `FOOTER|TOTAL|${payroll.lines.reduce((a, c) => a + c.netSalary, 0).toFixed(2)}\n`;
  } else if (bankFormat === 'ICICI_CIB') {
    extension = 'csv';
    // ICICI CIB Format
    content += `Debit Acc No,Beneficiary Acc No,Beneficiary Name,Amount,Pay Mode,IFSC Code,Customer Ref No,Remarks\n`;
    payroll.lines.forEach((l, idx) => {
      content += `001105001234,0011015099${idx},"${l.empName}",${l.netSalary.toFixed(2)},NEFT,ICIC0000011,"SALARY-${l.employeeId}","Salary ${payroll.monthYear}"\n`;
    });
  } else {
    extension = 'csv';
    // SBI Corporate Bulk Format
    content += `S.No,Employee Name,Account Number,IFSC Code,Amount(INR),Payment Type,Narration\n`;
    payroll.lines.forEach((l, idx) => {
      content += `${idx + 1},"${l.empName}",3009876543${idx},SBIN0001234,${l.netSalary.toFixed(2)},SALARY,Salary Credit ${payroll.monthYear}\n`;
    });
  }

  const fileName = `BYALANCE_${bankFormat}_${company.legalName.replace(/[^a-zA-Z0-9]/g, '_')}_${payroll.monthYear}.${extension}`;
  const totalAmt = payroll.lines.reduce((a, c) => a + c.netSalary, 0);

  return {
    id: `BANK-${Date.now()}`,
    companyId: company.id,
    bankName: bankFormat,
    monthYear: payroll.monthYear,
    totalEmployees: payroll.lines.length,
    totalAmount: totalAmt,
    fileContent: content,
    fileName,
    createdAt: new Date().toISOString(),
  };
}
