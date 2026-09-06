const Loan = require('../models/Loan');
const Payment = require('../models/Payment');
const User = require('../models/User');

/**
 * Pure Node.js compliant PDF builder for LendWise reports.
 * Generates a valid %PDF-1.4 document buffer without external npm binaries.
 */
function buildPdfBuffer({ user, role, loans, payments }) {
    const isLender = role === 'LENDER';
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const totalPrincipal = loans.reduce((s, l) => s + (l.principalAmount || 0), 0);
    const totalPayable = loans.reduce((s, l) => s + (l.totalPayable || 0), 0);
    const totalPaid = loans.reduce((s, l) => s + (l.amountPaid || 0), 0);
    const totalRemaining = loans.reduce((s, l) => s + (l.remainingBalance || 0), 0);

    const activeCount = loans.filter(l => l.status === 'Active').length;
    const overdueCount = loans.filter(l => l.status === 'Overdue').length;
    const closedCount = loans.filter(l => l.status === 'Closed').length;

    // Generate plain PDF content lines
    const lines = [
        "LENDWISE FINANCIAL STATEMENT & PORTFOLIO REPORT",
        "============================================================",
        `Report Generated: ${dateStr}`,
        `Account Name:     ${user.name || 'User'}`,
        `Account Role:     ${role}`,
        `Contact Phone:    ${user.phone || 'N/A'}`,
        `Contact Email:    ${user.email || 'N/A'}`,
        "------------------------------------------------------------",
        "1. EXECUTIVE FINANCIAL SUMMARY",
        "------------------------------------------------------------",
        `Total Loans Recorded:    ${loans.length}`,
        `Total Principal:         Rs. ${totalPrincipal.toLocaleString()}`,
        `Total Payable Amount:    Rs. ${totalPayable.toLocaleString()}`,
        `Total Amount Repaid:     Rs. ${totalPaid.toLocaleString()}`,
        `Current Balance:         Rs. ${totalRemaining.toLocaleString()}`,
        `Active Loans: ${activeCount}  |  Overdue Loans: ${overdueCount}  |  Closed Loans: ${closedCount}`,
        "------------------------------------------------------------",
        "2. LOAN RELATIONSHIPS BREAKDOWN",
        "------------------------------------------------------------",
    ];

    if (loans.length === 0) {
        lines.push("No loan records found for this account.");
    } else {
        loans.forEach((l, idx) => {
            const counterparty = isLender ? l.borrowerName : 'Lender';
            lines.push(
                `#${idx + 1} ID: ${l._id} | Counterparty: ${counterparty}`,
                `   Principal: Rs. ${(l.principalAmount || 0).toLocaleString()} | APR: ${l.interestRate}% | Status: ${l.status}`,
                `   Payable: Rs. ${(l.totalPayable || 0).toLocaleString()} | Paid: Rs. ${(l.amountPaid || 0).toLocaleString()} | Balance: Rs. ${(l.remainingBalance || 0).toLocaleString()}`,
                "   --------------------------------------------------------"
            );
        });
    }

    lines.push(
        "------------------------------------------------------------",
        "3. RECENT PAYMENT TRANSACTIONS",
        "------------------------------------------------------------"
    );

    if (payments.length === 0) {
        lines.push("No payment transactions recorded.");
    } else {
        payments.forEach((p, idx) => {
            const pDate = new Date(p.paymentDate).toLocaleDateString();
            lines.push(
                `#${idx + 1} Date: ${pDate} | Amount: Rs. ${p.amount.toLocaleString()} | Mode: ${p.mode || 'Transfer'} | Status: ${p.status || 'Completed'}`
            );
        });
    }

    lines.push(
        "============================================================",
        "END OF LENDWISE FINANCIAL REPORT — PRODUCED AUTHORITATIVELY"
    );

    // Escape parenthesis and backslashes for PDF literal text format
    const textStreamContent = lines.map((line, idx) => {
        const escaped = line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
        const yPos = 760 - (idx * 14);
        return `BT /F1 10 Tf 40 ${yPos} Td (${escaped}) Tj ET`;
    }).join('\n');

    const streamLength = Buffer.byteLength(textStreamContent, 'utf-8');

    // Construct objects
    const objects = [
        `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`,
        `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`,
        `3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 595 842] /Contents 5 0 R >>\nendobj\n`,
        `4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj\n`,
        `5 0 obj\n<< /Length ${streamLength} >>\nstream\n${textStreamContent}\nendstream\nendobj\n`
    ];

    let header = "%PDF-1.4\n";
    let body = "";
    let offsets = [0];
    let currentOffset = Buffer.byteLength(header, 'utf-8');

    objects.forEach(obj => {
        offsets.push(currentOffset);
        body += obj;
        currentOffset += Buffer.byteLength(obj, 'utf-8');
    });

    let xrefOffset = currentOffset;
    let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;

    for (let i = 1; i <= objects.length; i++) {
        const offStr = String(offsets[i]).padStart(10, '0');
        xref += `${offStr} 00000 n \n`;
    }

    let trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

    const pdfString = header + body + xref + trailer;
    return Buffer.from(pdfString, 'utf-8');
}

/**
 * Pure Node.js compliant SpreadsheetML (Excel XML) generator.
 * Creates multi-sheet spreadsheet natively recognized by Excel, LibreOffice, and Sheets.
 */
function buildExcelBuffer({ user, role, loans, payments }) {
    const isLender = role === 'LENDER';
    const dateStr = new Date().toISOString().split('T')[0];

    const totalPrincipal = loans.reduce((s, l) => s + (l.principalAmount || 0), 0);
    const totalPayable = loans.reduce((s, l) => s + (l.totalPayable || 0), 0);
    const totalPaid = loans.reduce((s, l) => s + (l.amountPaid || 0), 0);
    const totalRemaining = loans.reduce((s, l) => s + (l.remainingBalance || 0), 0);

    const activeCount = loans.filter(l => l.status === 'Active').length;
    const overdueCount = loans.filter(l => l.status === 'Overdue').length;
    const closedCount = loans.filter(l => l.status === 'Closed').length;

    const escapeXml = (str) => String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">

 <Styles>
  <Style ss:ID="HeaderStyle">
   <Font ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#040707" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center"/>
  </Style>
  <Style ss:ID="TitleStyle">
   <Font ss:Bold="1" ss:Size="14" ss:Color="#00FF9C"/>
  </Style>
 </Styles>

 <Worksheet ss:Name="Executive Summary">
  <Table>
   <Row><Cell ss:StyleID="TitleStyle"><Data ss:Type="String">LendWise Financial Executive Summary</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Report Date</Data></Cell><Cell><Data ss:Type="String">${escapeXml(dateStr)}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">User Name</Data></Cell><Cell><Data ss:Type="String">${escapeXml(user.name)}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">User Role</Data></Cell><Cell><Data ss:Type="String">${escapeXml(role)}</Data></Cell></Row>
   <Row></Row>
   <Row><Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Metric</Data></Cell><Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Value</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Total Loans</Data></Cell><Cell><Data ss:Type="Number">${loans.length}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Total Principal Amount</Data></Cell><Cell><Data ss:Type="Number">${totalPrincipal}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Total Payable Amount</Data></Cell><Cell><Data ss:Type="Number">${totalPayable}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Total Amount Paid</Data></Cell><Cell><Data ss:Type="Number">${totalPaid}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Outstanding Balance</Data></Cell><Cell><Data ss:Type="Number">${totalRemaining}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Active Loans Count</Data></Cell><Cell><Data ss:Type="Number">${activeCount}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Overdue Loans Count</Data></Cell><Cell><Data ss:Type="Number">${overdueCount}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Closed Loans Count</Data></Cell><Cell><Data ss:Type="Number">${closedCount}</Data></Cell></Row>
  </Table>
 </Worksheet>

 <Worksheet ss:Name="Loans Breakdown">
  <Table>
   <Row ss:StyleID="HeaderStyle">
    <Cell><Data ss:Type="String">Loan ID</Data></Cell>
    <Cell><Data ss:Type="String">Counterparty</Data></Cell>
    <Cell><Data ss:Type="String">Principal (INR)</Data></Cell>
    <Cell><Data ss:Type="String">Interest Rate (%)</Data></Cell>
    <Cell><Data ss:Type="String">Total Payable (INR)</Data></Cell>
    <Cell><Data ss:Type="String">Amount Paid (INR)</Data></Cell>
    <Cell><Data ss:Type="String">Remaining Balance (INR)</Data></Cell>
    <Cell><Data ss:Type="String">EMI (INR)</Data></Cell>
    <Cell><Data ss:Type="String">Status</Data></Cell>
    <Cell><Data ss:Type="String">Start Date</Cell>
   </Row>
   ${loans.map(l => `
   <Row>
    <Cell><Data ss:Type="String">${escapeXml(l._id)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(isLender ? l.borrowerName : 'Lender')}</Data></Cell>
    <Cell><Data ss:Type="Number">${l.principalAmount || 0}</Data></Cell>
    <Cell><Data ss:Type="Number">${l.interestRate || 0}</Data></Cell>
    <Cell><Data ss:Type="Number">${l.totalPayable || 0}</Data></Cell>
    <Cell><Data ss:Type="Number">${l.amountPaid || 0}</Data></Cell>
    <Cell><Data ss:Type="Number">${l.remainingBalance || 0}</Data></Cell>
    <Cell><Data ss:Type="Number">${l.emi || 0}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(l.status)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(l.startDate ? new Date(l.startDate).toISOString().split('T')[0] : '')}</Data></Cell>
   </Row>`).join('')}
  </Table>
 </Worksheet>

 <Worksheet ss:Name="Payment Logs">
  <Table>
   <Row ss:StyleID="HeaderStyle">
    <Cell><Data ss:Type="String">Payment ID</Data></Cell>
    <Cell><Data ss:Type="String">Loan ID</Data></Cell>
    <Cell><Data ss:Type="String">Amount (INR)</Data></Cell>
    <Cell><Data ss:Type="String">Principal Portion</Data></Cell>
    <Cell><Data ss:Type="String">Interest Portion</Data></Cell>
    <Cell><Data ss:Type="String">Payment Date</Data></Cell>
    <Cell><Data ss:Type="String">Mode</Data></Cell>
    <Cell><Data ss:Type="String">Status</Data></Cell>
   </Row>
   ${payments.map(p => `
   <Row>
    <Cell><Data ss:Type="String">${escapeXml(p._id)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(p.loanId)}</Data></Cell>
    <Cell><Data ss:Type="Number">${p.amount || 0}</Data></Cell>
    <Cell><Data ss:Type="Number">${p.principalPortion || 0}</Data></Cell>
    <Cell><Data ss:Type="Number">${p.interestPortion || 0}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(p.paymentDate ? new Date(p.paymentDate).toISOString().split('T')[0] : '')}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(p.mode || 'Cash')}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(p.status || 'Completed')}</Data></Cell>
   </Row>`).join('')}
  </Table>
 </Worksheet>
</Workbook>`;

    return Buffer.from(xml, 'utf-8');
}

/**
 * Service handler for PDF report generation.
 */
const generatePdfReport = async ({ userId, role }) => {
    const normalizedRole = (role || '').toUpperCase();
    const user = await User.findById(userId).select('name email phone role');

    if (!user) {
        const err = new Error('User not found.');
        err.status = 404;
        throw err;
    }

    const loanFilter = normalizedRole === 'LENDER'
        ? { lenderId: userId, deletedAt: null }
        : { borrowerId: userId, deletedAt: null };

    const paymentFilter = normalizedRole === 'LENDER'
        ? { lenderId: userId }
        : { borrowerId: userId };

    const [loans, payments] = await Promise.all([
        Loan.find(loanFilter).sort({ createdAt: -1 }),
        Payment.find(paymentFilter).sort({ paymentDate: -1 })
    ]);

    return buildPdfBuffer({ user, role: normalizedRole, loans, payments });
};

/**
 * Service handler for Excel (XLSX) report generation.
 */
const generateExcelReport = async ({ userId, role }) => {
    const normalizedRole = (role || '').toUpperCase();
    const user = await User.findById(userId).select('name email phone role');

    if (!user) {
        const err = new Error('User not found.');
        err.status = 404;
        throw err;
    }

    const loanFilter = normalizedRole === 'LENDER'
        ? { lenderId: userId, deletedAt: null }
        : { borrowerId: userId, deletedAt: null };

    const paymentFilter = normalizedRole === 'LENDER'
        ? { lenderId: userId }
        : { borrowerId: userId };

    const [loans, payments] = await Promise.all([
        Loan.find(loanFilter).sort({ createdAt: -1 }),
        Payment.find(paymentFilter).sort({ paymentDate: -1 })
    ]);

    return buildExcelBuffer({ user, role: normalizedRole, loans, payments });
};

module.exports = {
    generatePdfReport,
    generateExcelReport
};
