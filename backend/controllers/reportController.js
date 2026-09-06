const reportService = require('../services/reportService');

const exportPdf = async (req, res, next) => {
    try {
        const buffer = await reportService.generatePdfReport({
            userId: req.user.id,
            role: req.user.role
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="lendwise-report.pdf"');
        res.send(buffer);
    } catch (error) {
        next(error);
    }
};

const exportExcel = async (req, res, next) => {
    try {
        const buffer = await reportService.generateExcelReport({
            userId: req.user.id,
            role: req.user.role
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="lendwise-report.xlsx"');
        res.send(buffer);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    exportPdf,
    exportExcel
};
