/**
 * Client-Side Invoice PDF Generator
 * Standard 80mm Continuous Thermal POS Receipt Generator
 * - Page Width: 80mm
 * - Page Height: Auto / Dynamic (strictly matches order content)
 * - Margins: 3.5mm (Printable area: 73mm)
 * - Headings: 14–16px (~11.5pt)
 * - Content: 9–11px (~7.5–8.5pt)
 * - Continuous Thermal Paper Roll Format (Zero bottom blank void)
 */
import { jsPDF } from 'jspdf';
import { formatCurrency } from '../../domain/calculations';

/**
 * Generates and downloads a client-side 80mm Thermal Receipt PDF invoice
 */
export function downloadInvoicePdf(order, settings = {}, reversal = null) {
  if (!order) return;

  const isReversed = order.status === 'reversed' || Boolean(reversal);

  // 80mm Thermal Roll Paper Standard Specifications
  const targetWidth = 80;
  const margin = 3.5; // 3.5mm side & top/bottom margins
  const contentWidth = targetWidth - margin * 2; // 73mm printable area (within 72–74mm)

  const lines = Array.isArray(order.lines) ? order.lines : [];

  // Business & Store Info
  const restaurantName = order?.businessName || settings?.business?.name || settings?.restaurantName || 'SpiceHub';
  const rawStoreName = order.storeName || settings?.storeName || '';
  const isDuplicateStore = !rawStoreName ||
    rawStoreName.trim().toLowerCase() === restaurantName.trim().toLowerCase() ||
    rawStoreName.toLowerCase() === 'restaurant & grill' ||
    rawStoreName.toLowerCase() === 'spicehub';
  const address = settings?.business?.address || settings?.address || '123 Food Street, Gulshan, Karachi';
  const phone = settings?.business?.phone || settings?.phone || '021-1234567';

  const subLine = !isDuplicateStore
    ? `${rawStoreName} • ${phone}`
    : (phone ? phone : '');

  const hasCashier = Boolean(order.cashierName);
  const hasReversalReason = isReversed && Boolean(reversal?.reason);
  const hasDiscount = Number(order.discountAmount) > 0;
  const hasChange = Number(order.changeAmount) > 0;
  const footerMsg = settings?.invoice?.footer || settings?.invoiceFooter || 'Thank you for dining with us! • Good Food • Good Mood';

  // --- DYNAMIC EXACT HEIGHT CALCULATION (Auto-fitted to content) ---
  let calcY = margin + 2.0;

  if (isReversed) {
    calcY += 7.5 + 6.0; // Reversal badge (7.5mm) + gap (6.0mm)
  }

  calcY += 5.0; // Restaurant Name
  if (subLine) calcY += 4.0; // Subline / Phone
  if (address) calcY += 4.0; // Address
  calcY += 4.5; // Divider line

  calcY += 4.5; // Invoice # & Date
  calcY += 4.0; // Cashier & Payment
  if (hasReversalReason) calcY += 4.0; // Reversal reason
  calcY += 2.5; // Gap before table

  calcY += 6.0 + 3.2; // Table header (6mm box + 3.2mm gap)

  lines.forEach((line) => {
    calcY += 4.0; // Item line
    const portionText = line.pricingMode === 'amount'
      ? `Custom Weight (${line.selectedWeightGrams}g)`
      : line.selectedPortionLabel || line.baseUnitSnapshot || '';
    const hasAddons = Array.isArray(line.addonSnapshots) && line.addonSnapshots.length > 0;
    if (line.isDeal && Array.isArray(line.includedItems)) {
      calcY += line.includedItems.length * 3.2;
    } else if (portionText || hasAddons) {
      calcY += 3.2;
    }

    if (hasAddons) {
      const addonNames = line.addonSnapshots
        .map((a) => {
          if (typeof a === 'string') return a;
          if (!a) return '';
          const priceVal = Number(a.price) || 0;
          const qty = a.quantity && a.quantity > 1 ? ` x${a.quantity}` : '';
          const totalAddonPrice = priceVal * (a.quantity || 1);
          return priceVal > 0 ? `${a.name}${qty} (Rs ${totalAddonPrice})` : `${a.name}${qty}`;
        })
        .filter(Boolean)
        .join(', ');
      const estimatedLines = Math.max(1, Math.ceil((addonNames.length + 5) / 36));
      calcY += estimatedLines * 3.2;
    }
    calcY += 1.5;
  });

  calcY += 4.5; // Table bottom divider
  calcY += 4.5; // Subtotal
  if (hasDiscount) calcY += 4.5; // Discount
  calcY += 4.5 + 2.0; // Tax + gap before total box
  calcY += 7.5 + 4.5; // Grand total box + gap after total box
  calcY += 4.5; // Amount received
  if (hasChange) calcY += 4.5; // Change
  calcY += 2.5; // Gap
  calcY += 4.5; // Footer divider

  const footerLineCount = Math.max(1, Math.ceil(footerMsg.length / 40));
  calcY += footerLineCount * 3.5;

  // Exact dynamic height: precise content height + margins + safety buffer
  const targetHeight = Math.ceil(calcY + margin + 4.0);

  // Initialize jsPDF with exact dynamic dimensions
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [targetWidth, targetHeight],
  });

  doc.setDisplayMode('fullpage', 'single', 'UseNone');
  doc.viewerPreferences({
    FitWindow: true,
    CenterWindow: true,
    NonFullScreenPageMode: 'UseNone',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = margin + 1.5;

  // --- 1. REVERSED WATERMARK BANNER (if reversed) ---
  if (isReversed) {
    const bannerHeight = 7.5;
    doc.setFillColor(254, 242, 242); // Rose-50
    doc.setDrawColor(244, 63, 94);   // Rose-500
    doc.setLineWidth(0.35);
    doc.roundedRect(margin, y, contentWidth, bannerHeight, 1.8, 1.8, 'FD');

    doc.setTextColor(225, 29, 72);   // Rose-600
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('*** TRANSACTION REVERSED ***', pageWidth / 2, y + 5.0, { align: 'center' });

    y += bannerHeight + 5.5;
  }

  // --- 2. RESTAURANT BUSINESS HEADER (Headings: 14–16px / ~11.5pt) ---
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5); // ~15.3px Heading
  doc.text(restaurantName, pageWidth / 2, y, { align: 'center' });
  y += 4.5;

  if (subLine) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5); // ~10px Content
    doc.setTextColor(100, 116, 139);
    doc.text(subLine, pageWidth / 2, y, { align: 'center' });
    y += 3.5;
  }

  if (address) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5); // ~10px Content
    doc.setTextColor(100, 116, 139);
    doc.text(address, pageWidth / 2, y, { align: 'center' });
    y += 3.5;
  }

  // Dashed divider line for thermal aesthetic
  y += 0.5;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 3.5;

  // --- 3. INVOICE META & STATUS (Content: 9–11px / ~7.5–9.5pt) ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5); // ~12.7px bold title
  doc.setTextColor(234, 88, 12); // Orange-600
  doc.text(`Invoice #${order.invoiceNumber}`, margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5); // ~10px
  doc.setTextColor(71, 85, 105);

  const formattedDate = new Date(order.completedAt || order.createdAt || Date.now()).toLocaleDateString();
  const formattedTime = new Date(order.completedAt || order.createdAt || Date.now()).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  doc.text(`${formattedDate} ${formattedTime}`, pageWidth - margin, y, { align: 'right' });
  y += 4.0;

  // Balanced Meta Row: Cashier (Left), Payment (Right)
  const paymentLabel = order.paymentMethod === 'Card' && order.cardNetwork
    ? `Card (${order.cardNetwork})`
    : order.paymentMethod === 'Online' && (order.onlineBankName || order.onlineChannel)
    ? `Online (${order.onlineBankName || order.onlineChannel}${order.onlineAccountNumber ? ` - ${order.onlineAccountNumber}` : ''})`
    : order.paymentMethod === 'Split'
    ? `Split (Cash + ${order.splitDetails?.secondaryMethod || 'Online'})`
    : (order.paymentMethod || 'Cash');

  if (hasCashier) {
    doc.text(`Cashier: ${order.cashierName}`, margin, y);
  }
  doc.text(`Payment: ${paymentLabel}`, pageWidth - margin, y, { align: 'right' });
  y += 3.5;

  if (hasReversalReason) {
    doc.setTextColor(220, 38, 38);
    doc.setFont('helvetica', 'bold');
    doc.text(`Reason: ${reversal.reason || 'N/A'}`, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    y += 3.5;
  }
  y += 2.0;

  // --- 4. ITEM TABLE HEADER (73mm printable area) ---
  const headerBoxY = y;
  const headerBoxHeight = 6.0;
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, headerBoxY, contentWidth, headerBoxHeight, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, headerBoxY, pageWidth - margin, headerBoxY);
  doc.line(margin, headerBoxY + headerBoxHeight, pageWidth - margin, headerBoxY + headerBoxHeight);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5); // ~10px bold
  doc.setTextColor(71, 85, 105);

  const colItemX = margin + 1;
  const colQtyX = margin + 36;
  const colPriceX = margin + 51;
  const colTotalX = pageWidth - margin - 1;

  doc.text('ITEM', colItemX, headerBoxY + 4.2);
  doc.text('QTY', colQtyX, headerBoxY + 4.2, { align: 'center' });
  doc.text('RATE', colPriceX, headerBoxY + 4.2, { align: 'right' });
  doc.text('AMOUNT', colTotalX, headerBoxY + 4.2, { align: 'right' });
  y = headerBoxY + headerBoxHeight + 3.2;

  // --- 5. ITEM ROWS ---
  lines.forEach((line) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.0); // ~10.7px bold item title
    doc.setTextColor(30, 41, 59);

    const itemName = String(line.itemNameSnapshot || 'Item');
    const truncatedName = itemName.length > 22 ? `${itemName.substring(0, 21)}..` : itemName;
    doc.text(truncatedName, colItemX, y);

    const quantity = Number(line.quantity) || 1;
    const unitPrice = Number(line.unitPrice) || 0;
    const lineSubtotal = Number(line.lineSubtotal) || (unitPrice * quantity);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5); // ~10px
    doc.setTextColor(71, 85, 105);
    doc.text(String(quantity), colQtyX, y, { align: 'center' });
    doc.text(formatCurrency(unitPrice), colPriceX, y, { align: 'right' });
    doc.text(formatCurrency(lineSubtotal), colTotalX, y, { align: 'right' });
    y += 4.0;

    // Portion & Base Item Price breakdown
    const portionText = line.pricingMode === 'amount'
      ? `Custom Weight (${line.selectedWeightGrams}g)`
      : line.selectedPortionLabel || line.baseUnitSnapshot || '';

    const addonsList = Array.isArray(line.addonSnapshots) ? line.addonSnapshots : [];
    const addonsTotal = addonsList.reduce(
      (sum, a) =>
        sum +
        (Number(a?.price) || 0) *
          (a?.quantity !== undefined ? Math.max(1, Number(a.quantity)) : 1),
      0
    );

    const baseItemPrice = line.portionPrice !== undefined && line.portionPrice !== null
      ? Number(line.portionPrice)
      : (line.baseCalculatedPrice ? Number(line.baseCalculatedPrice) : Math.max(0, unitPrice - addonsTotal));

    if (line.isDeal && Array.isArray(line.includedItems) && line.includedItems.length > 0) {
      doc.setFontSize(7.0); // ~9.3px
      doc.setTextColor(100, 116, 139);
      line.includedItems.forEach((inc) => {
        const itemText = `• ${inc.name}${inc.portion ? ` (${inc.portion})` : ''}${inc.quantity && inc.quantity > 1 ? ` x${inc.quantity}` : ''}`;
        doc.text(itemText, colItemX + 1.5, y);
        y += 3.2;
      });
    } else {
      let portionDisplay = '';
      if (portionText) {
        portionDisplay = (baseItemPrice > 0 && (addonsTotal > 0 || line.pricingMode === 'amount' || line.selectedPortionLabel))
          ? `Portion: ${portionText} (Rs ${baseItemPrice})`
          : `Portion: ${portionText}`;
      } else if (addonsTotal > 0 && baseItemPrice > 0) {
        portionDisplay = `Base Item (Rs ${baseItemPrice})`;
      }

      if (portionDisplay) {
        doc.setFontSize(7.0); // ~9.3px
        doc.setTextColor(100, 116, 139);
        doc.text(portionDisplay, colItemX + 1.5, y);
        y += 3.2;
      }
    }

    // Addons
    if (addonsList.length > 0) {
      doc.setFontSize(7.0); // ~9.3px
      doc.setTextColor(100, 116, 139);
      const addonNames = addonsList
        .map((a) => {
          if (typeof a === 'string') return a;
          if (!a) return '';
          const priceVal = Number(a.price) || 0;
          const qty = a.quantity && a.quantity > 1 ? ` x${a.quantity}` : '';
          const totalAddonPrice = priceVal * (a.quantity || 1);
          return priceVal > 0 ? `${a.name}${qty} (Rs ${totalAddonPrice})` : `${a.name}${qty}`;
        })
        .filter(Boolean)
        .join(', ');

      const wrappedAddons = doc.splitTextToSize(`+ ${addonNames}`, contentWidth - 4);
      wrappedAddons.forEach((addonLine) => {
        doc.text(addonLine, colItemX + 1.5, y);
        y += 3.2;
      });
    }

    y += 1.5;
  });

  // Table bottom divider
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4.5;

  // --- 6. TOTALS & SUMMARY ---
  const summaryLeftX = margin + 1;
  const summaryRightX = pageWidth - margin - 1;

  doc.setFontSize(7.5); // ~10px
  doc.setTextColor(71, 85, 105);

  // Subtotal
  doc.text('Subtotal:', summaryLeftX, y);
  doc.text(formatCurrency(order.subtotal || 0), summaryRightX, y, { align: 'right' });
  y += 4.5;

  // Discount (if any)
  if (hasDiscount) {
    const discLabel = order.discountType === 'percentage'
      ? `Discount (${order.discountValue}%):`
      : 'Discount:';
    doc.setTextColor(220, 38, 38);
    doc.text(discLabel, summaryLeftX, y);
    doc.text(`-${formatCurrency(order.discountAmount)}`, summaryRightX, y, { align: 'right' });
    doc.setTextColor(71, 85, 105);
    y += 4.5;
  }

  // Tax
  const taxRate = order.taxRateSnapshot || 0;
  doc.text(`Tax (${taxRate}%):`, summaryLeftX, y);
  doc.text(formatCurrency(order.taxAmount || 0), summaryRightX, y, { align: 'right' });
  y += 4.5;

  // Clear gap before Grand Total box so it NEVER collides with Tax
  y += 2.0;

  // Grand Total Box (Full printable width across 80mm slip)
  const grandTotalBoxY = y;
  const grandTotalBoxHeight = 7.5;
  doc.setFillColor(255, 247, 237); // Warm light orange background
  doc.setDrawColor(254, 215, 170); // Soft orange border
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, grandTotalBoxY, contentWidth, grandTotalBoxHeight, 1.2, 1.2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.0); // ~13.3px bold orange
  doc.setTextColor(234, 88, 12); // Orange-600
  doc.text('Grand Total:', summaryLeftX + 2, grandTotalBoxY + 5.2);
  doc.text(formatCurrency(order.grandTotal || 0), summaryRightX - 2, grandTotalBoxY + 5.2, { align: 'right' });

  // Advance past Grand Total box with clear gap before Amount Received
  y = grandTotalBoxY + grandTotalBoxHeight + 4.5;

  // Payment Breakdown
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5); // ~10px
  doc.setTextColor(100, 116, 139);
  doc.text('Amount Received:', summaryLeftX, y);
  doc.text(formatCurrency(order.amountReceived || order.grandTotal || 0), summaryRightX, y, { align: 'right' });
  y += 4.5;

  if (Number(order.balanceDue) > 0) {
    doc.setTextColor(225, 29, 72); // rose-600
    doc.setFont('helvetica', 'bold');
    doc.text('Balance Due (Pending):', summaryLeftX, y);
    doc.text(formatCurrency(order.balanceDue), summaryRightX, y, { align: 'right' });
    y += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
  }

  if (order.customerName) {
    doc.text('Customer / Ref:', summaryLeftX, y);
    doc.text(String(order.customerName), summaryRightX, y, { align: 'right' });
    y += 4.5;
  }

  if (hasChange) {
    doc.text('Change Given:', summaryLeftX, y);
    doc.text(formatCurrency(order.changeAmount), summaryRightX, y, { align: 'right' });
    y += 4.5;
  }

  y += 2.5;

  // --- 7. FOOTER NOTE ---
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageWidth - margin, y);
  y += 3.8;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.0); // ~9.3px
  doc.setTextColor(148, 163, 184);
  const wrappedFooter = doc.splitTextToSize(footerMsg, contentWidth - 2);
  wrappedFooter.forEach((fLine) => {
    doc.text(fLine, pageWidth / 2, y, { align: 'center' });
    y += 3.2;
  });

  // Save PDF file
  const fileName = `${order.invoiceNumber || 'INV-Invoice'}.pdf`;
  doc.save(fileName);
}

export default downloadInvoicePdf;
