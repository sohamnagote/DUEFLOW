package com.dueflow.service;

import com.dueflow.domain.*;
import com.dueflow.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.StringWriter;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class DataExportService {

    private final InvoiceRepository invoiceRepository;
    private final ClientRepository clientRepository;
    private final PaymentSettingsRepository paymentSettingsRepository;
    private final ReminderHistoryRepository reminderHistoryRepository;

    public DataExportService(
            InvoiceRepository invoiceRepository,
            ClientRepository clientRepository,
            PaymentSettingsRepository paymentSettingsRepository,
            ReminderHistoryRepository reminderHistoryRepository) {
        this.invoiceRepository = invoiceRepository;
        this.clientRepository = clientRepository;
        this.paymentSettingsRepository = paymentSettingsRepository;
        this.reminderHistoryRepository = reminderHistoryRepository;
    }

    @Transactional(readOnly = true)
    public byte[] exportInvoicesCsv(String userId) {
        List<Invoice> invoices = invoiceRepository.findByUserIdOrderByCreatedAtDesc(userId);
        StringWriter sw = new StringWriter();

        // UTF-8 BOM for Microsoft Excel compatibility
        sw.write("\uFEFF");
        sw.write("Invoice Number,Client Name,Client Email,Issue Date,Due Date,Currency,Subtotal,Tax,Discount,Total Amount,Status,Paid At,Reminders Sent,Description\n");

        for (Invoice inv : invoices) {
            String clientName = inv.getClient() != null ? inv.getClient().getName() : "";
            String clientEmail = inv.getClient() != null ? inv.getClient().getEmail() : "";
            String paidAt = inv.getPaidAt() != null ? inv.getPaidAt().toString() : "";

            sw.write(String.format("%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%d,%s\n",
                    escapeCsv(inv.getInvoiceNumber()),
                    escapeCsv(clientName),
                    escapeCsv(clientEmail),
                    escapeCsv(inv.getIssueDate() != null ? inv.getIssueDate().toString() : ""),
                    escapeCsv(inv.getDueDate() != null ? inv.getDueDate().toString() : ""),
                    escapeCsv(inv.getCurrency()),
                    inv.getSubtotal() != null ? inv.getSubtotal().toPlainString() : "0.00",
                    inv.getTaxAmount() != null ? inv.getTaxAmount().toPlainString() : "0.00",
                    inv.getDiscountAmount() != null ? inv.getDiscountAmount().toPlainString() : "0.00",
                    inv.getTotalAmount() != null ? inv.getTotalAmount().toPlainString() : "0.00",
                    escapeCsv(inv.getStatus().name()),
                    escapeCsv(paidAt),
                    inv.getRemindersSentCount(),
                    escapeCsv(inv.getDescription())
            ));
        }

        return sw.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    @Transactional(readOnly = true)
    public byte[] exportClientsCsv(String userId) {
        List<Client> clients = clientRepository.findByUserId(userId);
        StringWriter sw = new StringWriter();

        sw.write("\uFEFF");
        sw.write("Client Name,Email,Phone,Billing Address,Tax ID,Notes,Created At\n");

        for (Client c : clients) {
            sw.write(String.format("%s,%s,%s,%s,%s,%s,%s\n",
                    escapeCsv(c.getName()),
                    escapeCsv(c.getEmail()),
                    escapeCsv(c.getPhone()),
                    escapeCsv(c.getBillingAddress()),
                    escapeCsv(c.getTaxIdentifier()),
                    escapeCsv(c.getInternalNotes()),
                    escapeCsv(c.getCreatedAt() != null ? c.getCreatedAt().toString() : "")
            ));
        }

        return sw.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    @Transactional(readOnly = true)
    public byte[] exportPaymentsCsv(String userId) {
        List<Invoice> invoices = invoiceRepository.findByUserIdOrderByCreatedAtDesc(userId);
        PaymentSettings payment = paymentSettingsRepository.findByUserId(userId).orElse(null);
        StringWriter sw = new StringWriter();

        sw.write("\uFEFF");
        sw.write("Invoice Number,Client Name,Status,Total Amount,Currency,Paid At,UPI ID,Beneficiary Name,Bank Name\n");

        for (Invoice inv : invoices) {
            if (inv.getStatus() == InvoiceStatus.PAID || inv.getPaidAt() != null) {
                String clientName = inv.getClient() != null ? inv.getClient().getName() : "";
                String paidAt = inv.getPaidAt() != null ? inv.getPaidAt().toString() : (inv.getUpdatedAt() != null ? inv.getUpdatedAt().toString() : "");

                sw.write(String.format("%s,%s,%s,%s,%s,%s,%s,%s,%s\n",
                        escapeCsv(inv.getInvoiceNumber()),
                        escapeCsv(clientName),
                        escapeCsv(inv.getStatus().name()),
                        inv.getTotalAmount() != null ? inv.getTotalAmount().toPlainString() : "0.00",
                        escapeCsv(inv.getCurrency()),
                        escapeCsv(paidAt),
                        escapeCsv(payment != null ? payment.getUpiId() : ""),
                        escapeCsv(payment != null ? payment.getBeneficiaryName() : ""),
                        escapeCsv(payment != null ? payment.getBankName() : "")
                ));
            }
        }

        return sw.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    @Transactional(readOnly = true)
    public byte[] exportReminderHistoryCsv(String userId) {
        List<ReminderHistory> history = reminderHistoryRepository.findByUserIdOrderByAttemptedAtDesc(userId);
        StringWriter sw = new StringWriter();

        sw.write("\uFEFF");
        sw.write("Attempted At,Invoice ID,Recipient Email,Subject,Status,Provider Message ID,Error Message\n");

        for (ReminderHistory rh : history) {
            sw.write(String.format("%s,%s,%s,%s,%s,%s,%s\n",
                    escapeCsv(rh.getAttemptedAt() != null ? rh.getAttemptedAt().toString() : ""),
                    escapeCsv(rh.getInvoiceId()),
                    escapeCsv(rh.getRecipientEmail()),
                    escapeCsv(rh.getSubject()),
                    escapeCsv(rh.getStatus()),
                    escapeCsv(rh.getProviderMessageId()),
                    escapeCsv(rh.getErrorMessage())
            ));
        }

        return sw.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    @Transactional(readOnly = true)
    public byte[] exportAllDataCsv(String userId) {
        StringWriter sw = new StringWriter();
        sw.write("\uFEFF");
        sw.write("# ==============================================================================\n");
        sw.write("# DUEFLOW COMPLETE BUSINESS DATA EXPORT\n");
        sw.write("# Exported On: " + LocalDate.now().format(DateTimeFormatter.ISO_DATE) + "\n");
        sw.write("# ==============================================================================\n\n");

        sw.write("# SECTION 1: INVOICES\n");
        sw.write(new String(exportInvoicesCsv(userId), java.nio.charset.StandardCharsets.UTF_8).replace("\uFEFF", ""));
        sw.write("\n\n# SECTION 2: CLIENT DIRECTORY\n");
        sw.write(new String(exportClientsCsv(userId), java.nio.charset.StandardCharsets.UTF_8).replace("\uFEFF", ""));
        sw.write("\n\n# SECTION 3: PAYMENT RECORDS\n");
        sw.write(new String(exportPaymentsCsv(userId), java.nio.charset.StandardCharsets.UTF_8).replace("\uFEFF", ""));
        sw.write("\n\n# SECTION 4: REMINDER AUDIT TRAIL\n");
        sw.write(new String(exportReminderHistoryCsv(userId), java.nio.charset.StandardCharsets.UTF_8).replace("\uFEFF", ""));

        return sw.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    /**
     * Sanitizes values for standard RFC 4180 CSV compliance and guards against
     * CSV/Spreadsheet formula injection attacks (=, +, -, @, \t, \r).
     */
    private String escapeCsv(String value) {
        if (value == null) return "\"\"";
        String str = value;

        // Formula injection mitigation: prepend single quote if starts with formula characters
        if (str.startsWith("=") || str.startsWith("+") || str.startsWith("-") || str.startsWith("@") || str.startsWith("\t") || str.startsWith("\r")) {
            str = "'" + str;
        }

        // Escape double quotes by doubling them
        str = str.replace("\"", "\"\"");
        return "\"" + str + "\"";
    }
}
