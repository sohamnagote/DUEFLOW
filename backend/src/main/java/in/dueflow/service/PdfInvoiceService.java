package in.dueflow.service;

import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import in.dueflow.entity.Invoice;
import in.dueflow.entity.Profile;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.Locale;

/**
 * Production-ready A4 Invoice PDF Generator using OpenPDF.
 * Generates clean, professional PDF invoices with complete payment details,
 * INR currency formatting, and optional embedded Payment QR codes.
 */
@Service
public class PdfInvoiceService {

    private static final Logger log = LoggerFactory.getLogger(PdfInvoiceService.class);
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd MMM yyyy");

    public static class PdfGenerationResult {
        public final byte[] pdfBytes;
        public final String filename;

        public PdfGenerationResult(byte[] pdfBytes, String filename) {
            this.pdfBytes = pdfBytes;
            this.filename = filename;
        }
    }

    /**
     * Generates an A4 PDF invoice.
     */
    public PdfGenerationResult generateInvoicePdf(Invoice invoice, Profile profile) {
        String safeInvoiceNum = (invoice.getInvoiceNumber() != null && !invoice.getInvoiceNumber().isBlank())
                ? invoice.getInvoiceNumber().replace("#", "").trim()
                : "INV";
        String filename = "Invoice-" + safeInvoiceNum.replaceAll("[^a-zA-Z0-9_-]", "_") + ".pdf";

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 36, 36, 40, 40);
            PdfWriter writer = PdfWriter.getInstance(document, out);
            writer.setPdfVersion(PdfWriter.VERSION_1_7);

            document.open();

            // Color Palette
            Color primaryDark = new Color(26, 27, 34);      // #1A1B22
            Color accentPurple = new Color(91, 89, 139);    // #5B598B
            Color textMuted = new Color(116, 120, 120);     // #747878
            Color borderGray = new Color(227, 225, 234);    // #E3E1EA
            Color bgCard = new Color(251, 248, 255);        // #FBF8FF

            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 22, primaryDark);
            Font headerLabelFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, textMuted);
            Font bodyBold = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, primaryDark);
            Font bodyRegular = FontFactory.getFont(FontFactory.HELVETICA, 10, primaryDark);
            Font smallMuted = FontFactory.getFont(FontFactory.HELVETICA, 9, textMuted);
            Font badgeFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, Color.WHITE);

            // 1. Header Bar: Brand / Title and Invoice Status
            PdfPTable headerTable = new PdfPTable(2);
            headerTable.setWidthPercentage(100);
            headerTable.setWidths(new float[]{60, 40});
            headerTable.setSpacingAfter(15);

            PdfPCell leftHeader = new PdfPCell();
            leftHeader.setBorder(Rectangle.NO_BORDER);
            Paragraph docTitle = new Paragraph("INVOICE", titleFont);
            docTitle.setSpacingAfter(2);
            leftHeader.addElement(docTitle);
            String displayNum = (invoice.getInvoiceNumber() != null) ? invoice.getInvoiceNumber() : "#INV";
            leftHeader.addElement(new Paragraph(displayNum, bodyBold));
            headerTable.addCell(leftHeader);

            PdfPCell rightHeader = new PdfPCell();
            rightHeader.setBorder(Rectangle.NO_BORDER);
            rightHeader.setHorizontalAlignment(Element.ALIGN_RIGHT);

            String statusStr = (invoice.getStatus() != null) ? invoice.getStatus().toUpperCase() : "UNPAID";
            Color badgeBg = "PAID".equalsIgnoreCase(statusStr) ? new Color(34, 139, 34) : new Color(186, 26, 26);

            PdfPTable badgeTable = new PdfPTable(1);
            badgeTable.setHorizontalAlignment(Element.ALIGN_RIGHT);
            badgeTable.setTotalWidth(90);
            badgeTable.setLockedWidth(true);
            PdfPCell badgeCell = new PdfPCell(new Phrase("  " + statusStr + "  ", badgeFont));
            badgeCell.setBackgroundColor(badgeBg);
            badgeCell.setHorizontalAlignment(Element.ALIGN_CENTER);
            badgeCell.setPadding(4);
            badgeCell.setBorder(Rectangle.NO_BORDER);
            badgeTable.addCell(badgeCell);

            rightHeader.addElement(badgeTable);
            headerTable.addCell(rightHeader);
            document.add(headerTable);

            // Divider
            PdfPTable divider = new PdfPTable(1);
            divider.setWidthPercentage(100);
            PdfPCell divCell = new PdfPCell();
            divCell.setBorder(Rectangle.BOTTOM);
            divCell.setBorderColor(borderGray);
            divCell.setBorderWidth(1.2f);
            divCell.setPaddingBottom(8);
            divider.addCell(divCell);
            document.add(divider);

            // 2. Metadata Section: Dates, Provider & Client Info
            PdfPTable metaTable = new PdfPTable(3);
            metaTable.setWidthPercentage(100);
            metaTable.setWidths(new float[]{35, 35, 30});
            metaTable.setSpacingBefore(12);
            metaTable.setSpacingAfter(20);

            // From / Provider
            PdfPCell fromCell = new PdfPCell();
            fromCell.setBorder(Rectangle.NO_BORDER);
            fromCell.addElement(new Paragraph("FROM (ISSUED BY):", headerLabelFont));
            String businessName = (profile != null && profile.getBusinessName() != null && !profile.getBusinessName().isBlank())
                    ? profile.getBusinessName()
                    : (profile != null && profile.getFullName() != null ? profile.getFullName() : "DueFlow Provider");
            fromCell.addElement(new Paragraph(businessName, bodyBold));
            if (profile != null && profile.getEmail() != null && !profile.getEmail().isBlank()) {
                fromCell.addElement(new Paragraph(profile.getEmail(), smallMuted));
            }
            if (profile != null && profile.getPhone() != null && !profile.getPhone().isBlank()) {
                fromCell.addElement(new Paragraph(profile.getPhone(), smallMuted));
            }
            if (profile != null && profile.getAddress() != null && !profile.getAddress().isBlank()) {
                fromCell.addElement(new Paragraph(profile.getAddress(), smallMuted));
            }
            metaTable.addCell(fromCell);

            // To / Client
            PdfPCell toCell = new PdfPCell();
            toCell.setBorder(Rectangle.NO_BORDER);
            toCell.addElement(new Paragraph("BILLED TO:", headerLabelFont));
            String clientName = (invoice.getClientNameSnapshot() != null) ? invoice.getClientNameSnapshot() : "Valued Client";
            toCell.addElement(new Paragraph(clientName, bodyBold));
            if (invoice.getClientEmailSnapshot() != null && !invoice.getClientEmailSnapshot().isBlank()) {
                toCell.addElement(new Paragraph(invoice.getClientEmailSnapshot(), smallMuted));
            }
            if (invoice.getClientPhoneSnapshot() != null && !invoice.getClientPhoneSnapshot().isBlank()) {
                toCell.addElement(new Paragraph(invoice.getClientPhoneSnapshot(), smallMuted));
            }
            metaTable.addCell(toCell);

            // Dates
            PdfPCell datesCell = new PdfPCell();
            datesCell.setBorder(Rectangle.NO_BORDER);
            datesCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
            datesCell.addElement(new Paragraph("KEY DATES:", headerLabelFont));

            String issueStr = (invoice.getIssueDate() != null) ? invoice.getIssueDate().format(DATE_FORMATTER) : "N/A";
            Paragraph pIssue = new Paragraph("Issued: " + issueStr, smallMuted);
            datesCell.addElement(pIssue);

            String dueStr = (invoice.getDueDate() != null) ? invoice.getDueDate().format(DATE_FORMATTER) : "N/A";
            Paragraph pDue = new Paragraph("Due: " + dueStr, bodyBold);
            pDue.getFont().setColor(accentPurple);
            datesCell.addElement(pDue);
            metaTable.addCell(datesCell);

            document.add(metaTable);

            // 3. Line Items / Summary Table
            PdfPTable itemsTable = new PdfPTable(3);
            itemsTable.setWidthPercentage(100);
            itemsTable.setWidths(new float[]{60, 20, 20});
            itemsTable.setSpacingAfter(15);

            // Header Row
            PdfPCell hDesc = new PdfPCell(new Phrase("DESCRIPTION", headerLabelFont));
            hDesc.setBackgroundColor(bgCard);
            hDesc.setBorderColor(borderGray);
            hDesc.setPadding(6);
            itemsTable.addCell(hDesc);

            PdfPCell hQty = new PdfPCell(new Phrase("QTY", headerLabelFont));
            hQty.setBackgroundColor(bgCard);
            hQty.setBorderColor(borderGray);
            hQty.setHorizontalAlignment(Element.ALIGN_CENTER);
            hQty.setPadding(6);
            itemsTable.addCell(hQty);

            PdfPCell hAmount = new PdfPCell(new Phrase("AMOUNT (INR)", headerLabelFont));
            hAmount.setBackgroundColor(bgCard);
            hAmount.setBorderColor(borderGray);
            hAmount.setHorizontalAlignment(Element.ALIGN_RIGHT);
            hAmount.setPadding(6);
            itemsTable.addCell(hAmount);

            // Item Row
            String itemDesc = (invoice.getNotes() != null && !invoice.getNotes().isBlank())
                    ? invoice.getNotes()
                    : "Professional Services / Invoice Settlement";
            PdfPCell rDesc = new PdfPCell(new Phrase(itemDesc, bodyRegular));
            rDesc.setBorderColor(borderGray);
            rDesc.setPadding(8);
            itemsTable.addCell(rDesc);

            PdfPCell rQty = new PdfPCell(new Phrase("1", bodyRegular));
            rQty.setBorderColor(borderGray);
            rQty.setHorizontalAlignment(Element.ALIGN_CENTER);
            rQty.setPadding(8);
            itemsTable.addCell(rQty);

            String formattedAmt = formatCurrency(invoice.getAmount());
            PdfPCell rAmount = new PdfPCell(new Phrase(formattedAmt, bodyBold));
            rAmount.setBorderColor(borderGray);
            rAmount.setHorizontalAlignment(Element.ALIGN_RIGHT);
            rAmount.setPadding(8);
            itemsTable.addCell(rAmount);

            // Total Row
            PdfPCell blankTotal = new PdfPCell();
            blankTotal.setBorder(Rectangle.NO_BORDER);
            itemsTable.addCell(blankTotal);

            PdfPCell totalLabel = new PdfPCell(new Phrase("TOTAL DUE:", bodyBold));
            totalLabel.setBorderColor(borderGray);
            totalLabel.setBackgroundColor(bgCard);
            totalLabel.setHorizontalAlignment(Element.ALIGN_RIGHT);
            totalLabel.setPadding(7);
            itemsTable.addCell(totalLabel);

            PdfPCell totalVal = new PdfPCell(new Phrase(formattedAmt, bodyBold));
            totalVal.setBorderColor(borderGray);
            totalVal.setBackgroundColor(bgCard);
            totalVal.setHorizontalAlignment(Element.ALIGN_RIGHT);
            totalVal.setPadding(7);
            itemsTable.addCell(totalVal);

            document.add(itemsTable);

            // 4. Payment Details & Embedded QR Code Card
            PdfPTable payTable = new PdfPTable(2);
            payTable.setWidthPercentage(100);
            payTable.setWidths(new float[]{65, 35});
            payTable.setSpacingBefore(10);
            payTable.setSpacingAfter(20);

            PdfPCell payInfoCell = new PdfPCell();
            payInfoCell.setBackgroundColor(bgCard);
            payInfoCell.setBorderColor(borderGray);
            payInfoCell.setPadding(10);

            payInfoCell.addElement(new Paragraph("PAYMENT INSTRUCTIONS", headerLabelFont));

            if (profile != null && profile.getUpiId() != null && !profile.getUpiId().isBlank()) {
                Paragraph pUpi = new Paragraph("UPI ID: " + profile.getUpiId(), bodyBold);
                pUpi.setSpacingBefore(3);
                payInfoCell.addElement(pUpi);
            }

            String beneficiary = (profile != null && profile.getFullName() != null && !profile.getFullName().isBlank())
                    ? profile.getFullName()
                    : businessName;
            payInfoCell.addElement(new Paragraph("Beneficiary: " + beneficiary, smallMuted));

            if (profile != null && profile.getBankName() != null && !profile.getBankName().isBlank()) {
                payInfoCell.addElement(new Paragraph("Bank: " + profile.getBankName(), smallMuted));
            }
            if (profile != null && profile.getBankAccount() != null && !profile.getBankAccount().isBlank()) {
                payInfoCell.addElement(new Paragraph("Account: " + profile.getBankAccount(), smallMuted));
            }
            if (profile != null && profile.getBankIfsc() != null && !profile.getBankIfsc().isBlank()) {
                payInfoCell.addElement(new Paragraph("IFSC: " + profile.getBankIfsc(), smallMuted));
            }
            if (profile != null && profile.getPaymentNotes() != null && !profile.getPaymentNotes().isBlank()) {
                Paragraph pNotes = new Paragraph("Notes: " + profile.getPaymentNotes(), smallMuted);
                pNotes.setSpacingBefore(4);
                payInfoCell.addElement(pNotes);
            }
            payTable.addCell(payInfoCell);

            // QR Code cell (if present)
            PdfPCell qrCell = new PdfPCell();
            qrCell.setBackgroundColor(bgCard);
            qrCell.setBorderColor(borderGray);
            qrCell.setHorizontalAlignment(Element.ALIGN_CENTER);
            qrCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            qrCell.setPadding(6);

            boolean qrAdded = false;
            if (profile != null && profile.getPaymentQrUrl() != null && !profile.getPaymentQrUrl().isBlank()) {
                try {
                    String qrData = profile.getPaymentQrUrl().trim();
                    byte[] imgBytes = null;
                    if (qrData.startsWith("data:") && qrData.contains(";base64,")) {
                        String b64 = qrData.substring(qrData.indexOf(";base64,") + 8);
                        imgBytes = Base64.getDecoder().decode(b64);
                    }
                    if (imgBytes != null && imgBytes.length > 0) {
                        Image qrImg = Image.getInstance(imgBytes);
                        qrImg.scaleToFit(85, 85);
                        qrImg.setAlignment(Element.ALIGN_CENTER);
                        qrCell.addElement(qrImg);
                        Paragraph qrLabel = new Paragraph("Scan to Pay (UPI)", smallMuted);
                        qrLabel.setAlignment(Element.ALIGN_CENTER);
                        qrCell.addElement(qrLabel);
                        qrAdded = true;
                    }
                } catch (Exception e) {
                    log.warn("[PdfInvoiceService] Could not embed QR image: {}", e.getMessage());
                }
            }

            if (!qrAdded) {
                Paragraph pNoQr = new Paragraph("Please settle using the UPI ID or bank details provided.", smallMuted);
                pNoQr.setAlignment(Element.ALIGN_CENTER);
                qrCell.addElement(pNoQr);
            }
            payTable.addCell(qrCell);

            document.add(payTable);

            // 5. Footer Memorandum
            Paragraph footer = new Paragraph("Thank you for your business. For any billing queries, please contact "
                    + (profile != null && profile.getEmail() != null ? profile.getEmail() : "the issuer") + ".", smallMuted);
            footer.setAlignment(Element.ALIGN_CENTER);
            footer.setSpacingBefore(15);
            document.add(footer);

            document.close();

            byte[] bytes = out.toByteArray();
            log.info("[PdfInvoiceService] Successfully generated PDF for invoice {} ({} bytes)", safeInvoiceNum, bytes.length);
            return new PdfGenerationResult(bytes, filename);
        } catch (Exception e) {
            log.error("[PdfInvoiceService] Error generating PDF for invoice {}: {}", safeInvoiceNum, e.getMessage(), e);
            throw new RuntimeException("Failed to generate invoice PDF: " + e.getMessage(), e);
        }
    }

    private String formatCurrency(BigDecimal amount) {
        if (amount == null) return "Rs. 0.00";
        try {
            NumberFormat nf = NumberFormat.getNumberInstance(new Locale("en", "IN"));
            nf.setMinimumFractionDigits(2);
            nf.setMaximumFractionDigits(2);
            return "Rs. " + nf.format(amount);
        } catch (Exception e) {
            return "Rs. " + amount.toPlainString();
        }
    }
}
