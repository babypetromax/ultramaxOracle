export const getYYYYMMDD = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
};

export const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
};

export const printService = (elementId: string, command?: string, receiptWidth: '58mm' | '80mm' = '58mm') => {
    const printElement = document.getElementById(elementId);
    if (!printElement && !command) {
        console.error(`Print Error: Element with ID #${elementId} not found.`);
        return;
    }

    const contentToPrint = printElement ? printElement.innerHTML : '';
    const commandElement = command ? `<div class="cash-drawer-kick-command">${command}</div>` : '';

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
        console.error('Print Error: Could not access iframe document.');
        document.body.removeChild(iframe);
        return;
    }

    // --- KEY FIXES APPLIED HERE ---
    // 1. Added `html, body { margin: 0 !important; padding: 0 !important; }` to remove browser default margins, fixing the large gap at the end.
    // 2. Reduced `line-height`, margins, and paddings everywhere to make the receipt compact.
    // 3. Added `image-rendering` properties to logos/promos to ensure they print sharp and not blurry.
    // 4. Added `-webkit-font-smoothing: none;` to make text rendering crisper on thermal printers.
    const printStyles = `
        @page {
            margin: 0 !important; /* Force no margins */
        }
        html, body {
            margin: 0 !important; /* Override browser defaults */
            padding: 0 !important; /* Override browser defaults */
        }
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            color: #000 !important;
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
        }
        body {
            font-family: 'Courier New', 'Consolas', monospace;
            background: #fff !important;
            -webkit-font-smoothing: none; /* Sharpen text rendering */
        }
        #printable-receipt {
            width: ${receiptWidth};
            padding: 0;
            overflow: visible !important;
        }
        .receipt-paper {
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
        }
        p, span, div, td, th {
            font-size: 9pt;
            line-height: 1.15; /* Tighten line spacing */
        }
        .receipt-header-content p, .receipt-info, .receipt-footer p {
            font-size: 8pt;
        }
        .receipt-header-content { text-align: center; margin-bottom: 3px; } /* Reduce margin */
        .receipt-footer { text-align: center; margin-top: 3px; } /* Reduce margin */
        .receipt-info { display: flex; justify-content: space-between; font-size: 8pt; }
        .receipt-hr { border: none; border-top: 1px dashed black; margin: 2px 0; } /* Reduce margin */
        
        table.receipt-items-table, table.receipt-summary-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9pt;
        }
        .receipt-items-table th, .receipt-items-table td,
        .receipt-summary-table td {
            padding: 1px 0; /* Tighten padding */
            vertical-align: top;
        }
        .receipt-items-table th { 
            text-align: left; 
            border-bottom: 1px solid black; 
            padding-bottom: 2px; /* Reduce padding */
        }
        .receipt-items-table td { text-align: left; }
        .receipt-items-table .col-qty { text-align: right; padding: 0 4px; }
        .receipt-items-table .col-price, .receipt-items-table .col-total { text-align: right; }
        
        .receipt-summary-table td:first-child { text-align: left; }
        .receipt-summary-table td:last-child { text-align: right; }
        .receipt-summary-table .total strong { font-size: 10pt; }

        .receipt-logo, .receipt-promo {
            max-width: 100%;
            height: auto;
            margin: 3px auto; /* Reduce margin */
            display: block;
            /* Sharpen image rendering for thermal printers */
            image-rendering: -webkit-optimize-contrast;
            image-rendering: crisp-edges;
            image-rendering: pixelated;
        }
        .cash-drawer-kick-command {
            display: none;
        }
    `;

    // We don't need the styles from the original element anymore, as we provide our own.
    // This prevents style conflicts.
    const receiptStylesFromElement = printElement ? printElement.getAttribute('style') || '' : '';

    doc.open();
    doc.write(`
        <html>
            <head>
                <title>Print</title>
                <style>${printStyles}</style>
            </head>
            <body>
                <div id="printable-receipt" style="${receiptStylesFromElement}">
                    ${contentToPrint}
                </div>
                ${commandElement}
            </body>
        </html>
    `);
    doc.close();
    
    setTimeout(() => {
        try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
        } catch (e) {
            console.error("Printing failed:", e);
        } finally {
            setTimeout(() => document.body.removeChild(iframe), 1000);
        }
    }, 500); 
};