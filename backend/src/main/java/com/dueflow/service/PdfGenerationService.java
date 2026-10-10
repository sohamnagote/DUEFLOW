package com.dueflow.service;

import com.dueflow.domain.Invoice;
import com.dueflow.domain.InvoiceItem;
import com.dueflow.domain.PaymentSettings;
import com.dueflow.domain.UserProfile;
import com.dueflow.repository.InvoiceRepository;
import com.dueflow.repository.PaymentSettingsRepository;
import com.dueflow.repository.UserProfileRepository;
import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.net.URI;
import java.net.URL;
import java.text.NumberFormat;
import java.util.Base64;
import java.util.Locale;

@Service
public class PdfGenerationService {

    private static final Logger log = LoggerFactory.getLogger(PdfGenerationService.class);

    private final InvoiceRepository invoiceRepository;
    private final UserProfileRepository userProfileRepository;
    private final PaymentSettingsRepository paymentSettingsRepository;

    // Brand color palette (Refined Dark Navy & Clean Editorial Neutrals)
    private static final Color COLOR_PRIMARY = new Color(21, 38, 60);      // #15263c
    private static final Color COLOR_TEXT_DARK = new Color(27, 28, 25);    // #1b1c19
    private static final Color COLOR_TEXT_MUTED = new Color(116, 119, 125);// #74777d
    private static final Color COLOR_BG_LIGHT = new Color(251, 249, 244);  // #fbf9f4
    private static final Color COLOR_ACCENT = new Color(61, 101, 98);      // #3d6562

    public PdfGenerationService(InvoiceRepository invoiceRepository,
                                UserProfileRepository userProfileRepository,
                                PaymentSettingsRepository paymentSettingsRepository) {
        this.invoiceRepository = invoiceRepository;
        this.userProfileRepository = userProfileRepository;
        this.paymentSettingsRepository = paymentSettingsRepository;
    }

    @Transactional(readOnly = true)
    public byte[] generateInvoicePdf(String invoiceId, String userId) {
        Invoice invoice = invoiceRepository.findByIdAndUserId(invoiceId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Invoice not found or access denied"));

        UserProfile seller = userProfileRepository.findById(userId).orElse(null);
        PaymentSettings payment = paymentSettingsRepository.findByUserId(userId).orElse(null);

        return buildPdf(invoice, seller, payment);
    }

    @Transactional(readOnly = true)
    public byte[] generateInvoicePdf(Invoice invoice) {
        if (invoice == null) {
            throw new IllegalArgumentException("Invoice cannot be null");
        }
        String userId = invoice.getUserId();
        UserProfile seller = userProfileRepository.findById(userId).orElse(null);
        PaymentSettings payment = paymentSettingsRepository.findByUserId(userId).orElse(null);

        return buildPdf(invoice, seller, payment);
    }

    @Transactional(readOnly = true)
    public byte[] generateInvoicePdfSystem(Invoice invoice) {
        UserProfile seller = userProfileRepository.findById(invoice.getUserId()).orElse(null);
        PaymentSettings payment = paymentSettingsRepository.findByUserId(invoice.getUserId()).orElse(null);
        return buildPdf(invoice, seller, payment);
    }

    private byte[] buildPdf(Invoice invoice, UserProfile seller, PaymentSettings payment) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 36, 36, 40, 40);
            PdfWriter.getInstance(document, baos);
            document.open();

            // Font configurations
            Font fontBrand = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 22, COLOR_PRIMARY);
            Font fontHeaderSubtitle = FontFactory.getFont(FontFactory.COURIER, 10, COLOR_TEXT_MUTED);
            Font fontSectionTitle = FontFactory.getFont(FontFactory.COURIER_BOLD, 9, COLOR_TEXT_MUTED);
            Font fontBodyBold = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, COLOR_TEXT_DARK);
            Font fontBody = FontFactory.getFont(FontFactory.HELVETICA, 10, COLOR_TEXT_DARK);
            Font fontBodyMuted = FontFactory.getFont(FontFactory.HELVETICA, 9, COLOR_TEXT_MUTED);
            Font fontTotalLabel = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, Color.WHITE);
            Font fontTotalValue = FontFactory.getFont(FontFactory.COURIER_BOLD, 16, Color.WHITE);

            // 1. Top Header: Brand & Invoice Meta
            PdfPTable headerTable = new PdfPTable(2);
            headerTable.setWidthPercentage(100);
            headerTable.setWidths(new float[]{60, 40});

            PdfPCell leftCell = new PdfPCell();
            leftCell.setBorder(Rectangle.NO_BORDER);
            leftCell.addElement(new Paragraph("dueflow", fontBrand));
            leftCell.addElement(new Paragraph("Autonomous Ledger Invoice", fontHeaderSubtitle));
            headerTable.addCell(leftCell);

            PdfPCell rightCell = new PdfPCell();
            rightCell.setBorder(Rectangle.NO_BORDER);
            rightCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
            Paragraph metaP = new Paragraph();
            metaP.setAlignment(Element.ALIGN_RIGHT);
            metaP.add(new Chunk("Invoice #: " + invoice.getInvoiceNumber() + "\n", fontBodyBold));
            metaP.add(new Chunk("Issue Date: " + invoice.getIssueDate() + "\n", fontBodyMuted));
            metaP.add(new Chunk("Due Date: " + invoice.getDueDate() + "\n", fontBodyBold));
            metaP.add(new Chunk("Status: " + invoice.getStatus().name() + "\n", fontBodyMuted));
            rightCell.addElement(metaP);
            headerTable.addCell(rightCell);

            document.add(headerTable);
            document.add(new Paragraph("\n"));

            // 2. Billed To & Payable To Blocks
            PdfPTable addressTable = new PdfPTable(2);
            addressTable.setWidthPercentage(100);
            addressTable.setWidths(new float[]{50, 50});
            addressTable.setSpacingAfter(15);

            // Billed To (Client)
            PdfPCell billedToCell = new PdfPCell();
            billedToCell.setBackgroundColor(COLOR_BG_LIGHT);
            billedToCell.setPadding(10);
            billedToCell.setBorderColor(new Color(230, 228, 222));
            billedToCell.addElement(new Paragraph("BILLED TO:", fontSectionTitle));
            if (invoice.getClient() != null) {
                billedToCell.addElement(new Paragraph(invoice.getClient().getName(), fontBodyBold));
                billedToCell.addElement(new Paragraph(invoice.getClient().getEmail(), fontBodyMuted));
                if (invoice.getClient().getPhone() != null) {
                    billedToCell.addElement(new Paragraph("Phone: " + invoice.getClient().getPhone(), fontBodyMuted));
                }
                if (invoice.getClient().getBillingAddress() != null) {
                    billedToCell.addElement(new Paragraph(invoice.getClient().getBillingAddress(), fontBodyMuted));
                }
            }
            addressTable.addCell(billedToCell);

            // Payable To (Seller)
            PdfPCell payableToCell = new PdfPCell();
            payableToCell.setBackgroundColor(COLOR_BG_LIGHT);
            payableToCell.setPadding(10);
            payableToCell.setBorderColor(new Color(230, 228, 222));
            payableToCell.addElement(new Paragraph("PAYABLE TO:", fontSectionTitle));
            String sellerName = (payment != null && payment.getBeneficiaryName() != null && !payment.getBeneficiaryName().isBlank())
                    ? payment.getBeneficiaryName()
                    : (seller != null && seller.getFullName() != null && !seller.getFullName().isBlank()) ? seller.getFullName() : "Invoice Issuer";
            payableToCell.addElement(new Paragraph(sellerName, fontBodyBold));
            if (seller != null && seller.getEmail() != null) {
                payableToCell.addElement(new Paragraph(seller.getEmail(), fontBodyMuted));
            }
            if (payment != null && payment.getUpiId() != null && !payment.getUpiId().isBlank()) {
                payableToCell.addElement(new Paragraph("UPI ID: " + payment.getUpiId(), fontBodyMuted));
            }
            addressTable.addCell(payableToCell);

            document.add(addressTable);

            // 3. Line Items Table
            PdfPTable itemsTable = new PdfPTable(4);
            itemsTable.setWidthPercentage(100);
            itemsTable.setWidths(new float[]{50, 15, 15, 20});
            itemsTable.setSpacingBefore(10);
            itemsTable.setSpacingAfter(10);

            // Table Header
            String[] headers = {"Description", "Qty", "Rate", "Amount (" + invoice.getCurrency() + ")"};
            for (String h : headers) {
                PdfPCell th = new PdfPCell(new Phrase(h, fontSectionTitle));
                th.setBackgroundColor(new Color(240, 238, 233));
                th.setPadding(8);
                th.setBorderColor(new Color(220, 218, 212));
                itemsTable.addCell(th);
            }

            // Table Rows
            if (invoice.getItems() != null && !invoice.getItems().isEmpty()) {
                for (InvoiceItem item : invoice.getItems()) {
                    PdfPCell descCell = new PdfPCell(new Phrase(item.getDescription(), fontBody));
                    descCell.setPadding(6);
                    itemsTable.addCell(descCell);

                    PdfPCell qtyCell = new PdfPCell(new Phrase(item.getQuantity().stripTrailingZeros().toPlainString(), fontBody));
                    qtyCell.setPadding(6);
                    qtyCell.setHorizontalAlignment(Element.ALIGN_CENTER);
                    itemsTable.addCell(qtyCell);

                    PdfPCell rateCell = new PdfPCell(new Phrase(formatCurrency(item.getUnitPrice(), invoice.getCurrency()), fontBody));
                    rateCell.setPadding(6);
                    rateCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
                    itemsTable.addCell(rateCell);

                    PdfPCell amtCell = new PdfPCell(new Phrase(formatCurrency(item.getAmount(), invoice.getCurrency()), fontBodyBold));
                    amtCell.setPadding(6);
                    amtCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
                    itemsTable.addCell(amtCell);
                }
            } else {
                // Fallback row for single invoice description
                PdfPCell descCell = new PdfPCell(new Phrase(invoice.getDescription() != null ? invoice.getDescription() : "Services Rendered", fontBody));
                descCell.setPadding(6);
                itemsTable.addCell(descCell);

                PdfPCell qtyCell = new PdfPCell(new Phrase("1", fontBody));
                qtyCell.setPadding(6);
                qtyCell.setHorizontalAlignment(Element.ALIGN_CENTER);
                itemsTable.addCell(qtyCell);

                PdfPCell rateCell = new PdfPCell(new Phrase(formatCurrency(invoice.getTotalAmount(), invoice.getCurrency()), fontBody));
                rateCell.setPadding(6);
                rateCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
                itemsTable.addCell(rateCell);

                PdfPCell amtCell = new PdfPCell(new Phrase(formatCurrency(invoice.getTotalAmount(), invoice.getCurrency()), fontBodyBold));
                amtCell.setPadding(6);
                amtCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
                itemsTable.addCell(amtCell);
            }

            document.add(itemsTable);

            // 4. Totals Block (Dark Banner)
            PdfPTable totalsTable = new PdfPTable(2);
            totalsTable.setWidthPercentage(100);
            totalsTable.setWidths(new float[]{60, 40});

            PdfPCell emptyLeft = new PdfPCell();
            emptyLeft.setBorder(Rectangle.NO_BORDER);

            // Subtotal notes
            Paragraph subP = new Paragraph();
            if (invoice.getTaxAmount() != null && invoice.getTaxAmount().compareTo(BigDecimal.ZERO) > 0) {
                subP.add(new Chunk("Tax: " + formatCurrency(invoice.getTaxAmount(), invoice.getCurrency()) + "  ", fontBodyMuted));
            }
            if (invoice.getDiscountAmount() != null && invoice.getDiscountAmount().compareTo(BigDecimal.ZERO) > 0) {
                subP.add(new Chunk("Discount: -" + formatCurrency(invoice.getDiscountAmount(), invoice.getCurrency()), fontBodyMuted));
            }
            emptyLeft.addElement(subP);
            totalsTable.addCell(emptyLeft);

            PdfPCell totalBanner = new PdfPCell();
            totalBanner.setBackgroundColor(COLOR_PRIMARY);
            totalBanner.setPadding(10);
            Paragraph totalP = new Paragraph();
            totalP.setAlignment(Element.ALIGN_RIGHT);
            totalP.add(new Chunk("TOTAL AMOUNT DUE (" + invoice.getCurrency() + ")\n", fontTotalLabel));
            totalP.add(new Chunk(formatCurrency(invoice.getTotalAmount(), invoice.getCurrency()), fontTotalValue));
            totalBanner.addElement(totalP);
            totalsTable.addCell(totalBanner);

            document.add(totalsTable);
            document.add(new Paragraph("\n"));

            // 5. Payment Details & QR Code Section
            if (payment != null) {
                PdfPTable paymentSection = new PdfPTable(2);
                paymentSection.setWidthPercentage(100);
                paymentSection.setWidths(new float[]{70, 30});

                PdfPCell paymentInfoCell = new PdfPCell();
                paymentInfoCell.setBorder(Rectangle.NO_BORDER);
                paymentInfoCell.addElement(new Paragraph("SETTLEMENT DETAILS", fontSectionTitle));

                if (payment.getBankName() != null && !payment.getBankName().isBlank()) {
                    paymentInfoCell.addElement(new Paragraph("Bank: " + payment.getBankName(), fontBody));
                }
                if (payment.getAccountNumber() != null && !payment.getAccountNumber().isBlank()) {
                    paymentInfoCell.addElement(new Paragraph("Account Number: " + payment.getAccountNumber(), fontBody));
                }
                if (payment.getRoutingNumber() != null && !payment.getRoutingNumber().isBlank()) {
                    paymentInfoCell.addElement(new Paragraph("IFSC / Routing / BIC: " + payment.getRoutingNumber(), fontBody));
                }
                if (payment.getUpiId() != null && !payment.getUpiId().isBlank()) {
                    paymentInfoCell.addElement(new Paragraph("UPI ID: " + payment.getUpiId(), fontBody));
                }
                if (invoice.getPaymentInstructions() != null && !invoice.getPaymentInstructions().isBlank()) {
                    paymentInfoCell.addElement(new Paragraph("Instructions: " + invoice.getPaymentInstructions(), fontBodyMuted));
                } else if (payment.getPaymentInstructions() != null && !payment.getPaymentInstructions().isBlank()) {
                    paymentInfoCell.addElement(new Paragraph("Instructions: " + payment.getPaymentInstructions(), fontBodyMuted));
                }
                paymentSection.addCell(paymentInfoCell);

                // QR Code Image (if available)
                PdfPCell qrCell = new PdfPCell();
                qrCell.setBorder(Rectangle.NO_BORDER);
                qrCell.setHorizontalAlignment(Element.ALIGN_CENTER);

                if (payment.getQrCodeUrl() != null && !payment.getQrCodeUrl().isBlank()) {
                    try {
                        Image qrImage = extractImage(payment.getQrCodeUrl());
                        if (qrImage != null) {
                            qrImage.scaleToFit(90, 90);
                            qrImage.setAlignment(Element.ALIGN_CENTER);
                            qrCell.addElement(qrImage);
                            Paragraph scanText = new Paragraph("Scan to Pay", fontSectionTitle);
                            scanText.setAlignment(Element.ALIGN_CENTER);
                            qrCell.addElement(scanText);
                        }
                    } catch (Exception e) {
                        log.warn("Could not embed QR image into invoice PDF: {}", e.getMessage());
                    }
                }
                paymentSection.addCell(qrCell);

                document.add(paymentSection);
            }

            // 6. Notes Footer
            if (invoice.getNotes() != null && !invoice.getNotes().isBlank()) {
                document.add(new Paragraph("\n"));
                document.add(new Paragraph("Notes:", fontSectionTitle));
                document.add(new Paragraph(invoice.getNotes(), fontBodyMuted));
            }

            document.close();
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("Failed to generate invoice PDF for invoice {}: ", invoice.getInvoiceNumber(), e);
            throw new RuntimeException("PDF generation failed: " + e.getMessage(), e);
        }
    }

    private Image extractImage(String source) throws Exception {
        if (source.startsWith("data:image/")) {
            // Data URL
            int commaIdx = source.indexOf(',');
            if (commaIdx > 0) {
                String base64Data = source.substring(commaIdx + 1);
                byte[] decoded = Base64.getDecoder().decode(base64Data);
                return Image.getInstance(decoded);
            }
        } else if (source.startsWith("http://") || source.startsWith("https://")) {
            URL url = URI.create(source).toURL();
            return Image.getInstance(url);
        }
        return null;
    }

    private String formatCurrency(BigDecimal amount, String currency) {
        if (amount == null) amount = BigDecimal.ZERO;
        if ("USD".equalsIgnoreCase(currency)) {
            NumberFormat nf = NumberFormat.getCurrencyInstance(Locale.US);
            return nf.format(amount);
        } else {
            // INR
            NumberFormat nf = NumberFormat.getCurrencyInstance(new Locale("en", "IN"));
            return nf.format(amount);
        }
    }
}
