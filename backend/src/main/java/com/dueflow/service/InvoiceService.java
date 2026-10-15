package com.dueflow.service;

import com.dueflow.domain.*;
import com.dueflow.dto.InvoiceCsvRowDto;
import com.dueflow.dto.InvoiceDto;
import com.dueflow.dto.InvoiceImportResultDto;
import com.dueflow.dto.InvoiceItemDto;
import com.dueflow.exception.ResourceNotFoundException;
import com.dueflow.exception.ValidationException;
import com.dueflow.repository.ClientRepository;
import com.dueflow.repository.InvoiceRepository;
import com.dueflow.repository.UserProfileRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final ClientRepository clientRepository;
    private final UserProfileRepository userProfileRepository;
    private final UserProfileService userProfileService;
    private final ReminderScheduleCalculator reminderScheduleCalculator;

    public InvoiceService(InvoiceRepository invoiceRepository,
                          ClientRepository clientRepository,
                          UserProfileRepository userProfileRepository,
                          UserProfileService userProfileService,
                          ReminderScheduleCalculator reminderScheduleCalculator) {
        this.invoiceRepository = invoiceRepository;
        this.clientRepository = clientRepository;
        this.userProfileRepository = userProfileRepository;
        this.userProfileService = userProfileService;
        this.reminderScheduleCalculator = reminderScheduleCalculator;
    }

    private void ensureUserProfile(String userId) {
        userProfileService.ensureProfileExists(userId);
    }

    @Transactional
    public List<InvoiceDto> getInvoices(String userId) {
        List<Invoice> invoices = invoiceRepository.findByUserIdOrderByCreatedAtDesc(userId);
        LocalDate today = LocalDate.now();

        // Update status to OVERDUE if due date passed and invoice is unpaid
        for (Invoice inv : invoices) {
            checkAndSetOverdue(inv, today);
        }

        return invoices.stream().map(InvoiceDto::fromEntity).toList();
    }

    @Transactional
    public Page<InvoiceDto> getInvoicesPaged(String userId, Pageable pageable) {
        Page<Invoice> page = invoiceRepository.findByUserId(userId, pageable);
        LocalDate today = LocalDate.now();
        page.getContent().forEach(inv -> checkAndSetOverdue(inv, today));
        return page.map(InvoiceDto::fromEntity);
    }

    @Transactional
    public InvoiceDto getInvoice(String id, String userId) {
        Invoice invoice = invoiceRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found with id: " + id));
        checkAndSetOverdue(invoice, LocalDate.now());
        return InvoiceDto.fromEntity(invoice);
    }

    @Transactional(readOnly = true)
    public Invoice getInvoiceEntity(String id, String userId) {
        return invoiceRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found with id: " + id));
    }

    @Transactional
    public InvoiceDto createInvoice(String userId, InvoiceDto dto) {
        ensureUserProfile(userId);

        Client client;
        if (dto.getClientId() != null && !dto.getClientId().isBlank()) {
            client = clientRepository.findByIdAndUserId(dto.getClientId(), userId)
                    .orElseThrow(() -> new ValidationException("Selected client does not exist or does not belong to you"));
        } else {
            String clientName = dto.getClientName() != null ? dto.getClientName().trim() : null;
            if (clientName == null || clientName.isBlank()) {
                throw new ValidationException("Client is required for creating an invoice");
            }
            List<Client> userClients = clientRepository.findByUserId(userId);
            client = userClients.stream()
                    .filter(c -> c.getName().equalsIgnoreCase(clientName))
                    .findFirst()
                    .orElse(null);

            if (client == null) {
                String clientEmail = dto.getClientEmail() != null && !dto.getClientEmail().isBlank()
                        ? dto.getClientEmail().trim()
                        : clientName.toLowerCase().replaceAll("\\s+", "") + "@example.com";
                client = new Client(userId, clientName, clientEmail);
                client = clientRepository.save(client);
            }
        }

        Invoice invoice = new Invoice();
        invoice.setUserId(userId);
        invoice.setClient(client);

        // Invoice Number: generate if blank
        String invoiceNumber = dto.getInvoiceNumber();
        if (invoiceNumber == null || invoiceNumber.isBlank()) {
            invoiceNumber = generateUniqueInvoiceNumber(userId);
        } else {
            invoiceNumber = invoiceNumber.trim();
            if (invoiceRepository.existsByUserIdAndInvoiceNumber(userId, invoiceNumber)) {
                if (invoiceNumber.startsWith("INV-")) {
                    invoiceNumber = generateUniqueInvoiceNumber(userId);
                } else {
                    throw new ValidationException("Invoice number already exists: " + invoiceNumber);
                }
            }
        }
        invoice.setInvoiceNumber(invoiceNumber);

        invoice.setIssueDate(dto.getIssueDate() != null ? dto.getIssueDate() : LocalDate.now());
        invoice.setDueDate(dto.getDueDate() != null ? dto.getDueDate() : LocalDate.now().plusDays(14));

        // Currency: Use user's configured currency if not specified on the invoice
        if (dto.getCurrency() != null && !dto.getCurrency().isBlank()) {
            invoice.setCurrency(dto.getCurrency());
        } else {
            UserProfile profile = userProfileRepository.findById(userId).orElse(null);
            invoice.setCurrency((profile != null && profile.getPreferredCurrency() != null)
                    ? profile.getPreferredCurrency() : "INR");
        }

        invoice.setDescription(dto.getDescription());
        invoice.setNotes(dto.getNotes());
        invoice.setPaymentInstructions(dto.getPaymentInstructions());
        invoice.setStatus(InvoiceStatus.fromString(dto.getStatus()));

        invoice.setTaxAmount(dto.getTaxAmount() != null ? dto.getTaxAmount() : BigDecimal.ZERO);
        invoice.setDiscountAmount(dto.getDiscountAmount() != null ? dto.getDiscountAmount() : BigDecimal.ZERO);

        // Add line items
        if (dto.getItems() != null && !dto.getItems().isEmpty()) {
            for (InvoiceItemDto itemDto : dto.getItems()) {
                InvoiceItem item = new InvoiceItem(
                        itemDto.getDescription() != null ? itemDto.getDescription() : "Service Item",
                        itemDto.getQuantity() != null ? itemDto.getQuantity() : BigDecimal.ONE,
                        itemDto.getUnitPrice() != null ? itemDto.getUnitPrice() : BigDecimal.ZERO
                );
                invoice.addItem(item);
            }
        } else if (dto.getAmount() != null && dto.getAmount().compareTo(BigDecimal.ZERO) > 0) {
            // Support single amount from frontend form
            InvoiceItem item = new InvoiceItem(
                    dto.getDescription() != null && !dto.getDescription().isBlank() ? dto.getDescription() : "Professional Services",
                    BigDecimal.ONE,
                    dto.getAmount()
            );
            invoice.addItem(item);
        }

        invoice.recalculateTotals();

        checkAndSetOverdue(invoice, LocalDate.now());
        Invoice saved = invoiceRepository.save(invoice);

        // Schedule automated payment reminders
        reminderScheduleCalculator.scheduleRemindersForInvoice(saved);

        return InvoiceDto.fromEntity(saved);
    }

    @Transactional
    public InvoiceDto updateInvoice(String id, String userId, InvoiceDto dto) {
        Invoice invoice = invoiceRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found with id: " + id));

        if (dto.getClientId() != null && !dto.getClientId().equals(invoice.getClient().getId())) {
            Client client = clientRepository.findByIdAndUserId(dto.getClientId(), userId)
                    .orElseThrow(() -> new ValidationException("Client not found"));
            invoice.setClient(client);
        }

        if (dto.getInvoiceNumber() != null && !dto.getInvoiceNumber().isBlank()) {
            String newNumber = dto.getInvoiceNumber().trim();
            if (!newNumber.equalsIgnoreCase(invoice.getInvoiceNumber())) {
                if (invoiceRepository.existsByUserIdAndInvoiceNumber(userId, newNumber)) {
                    throw new ValidationException("Invoice number already exists: " + newNumber);
                }
                invoice.setInvoiceNumber(newNumber);
            }
        }

        boolean dueDateChanged = false;
        if (dto.getDueDate() != null && !dto.getDueDate().equals(invoice.getDueDate())) {
            invoice.setDueDate(dto.getDueDate());
            dueDateChanged = true;
        }

        if (dto.getIssueDate() != null) {
            invoice.setIssueDate(dto.getIssueDate());
        }

        // Note: Every invoice retains its own saved currency
        if (dto.getCurrency() != null && !dto.getCurrency().isBlank()) {
            invoice.setCurrency(dto.getCurrency());
        }

        if (dto.getStatus() != null) {
            invoice.setStatus(InvoiceStatus.fromString(dto.getStatus()));
        }

        if (dto.getDescription() != null) invoice.setDescription(dto.getDescription());
        if (dto.getNotes() != null) invoice.setNotes(dto.getNotes());
        if (dto.getPaymentInstructions() != null) invoice.setPaymentInstructions(dto.getPaymentInstructions());
        if (dto.getTaxAmount() != null) invoice.setTaxAmount(dto.getTaxAmount());
        if (dto.getDiscountAmount() != null) invoice.setDiscountAmount(dto.getDiscountAmount());

        // Update items if supplied
        if (dto.getItems() != null && !dto.getItems().isEmpty()) {
            invoice.getItems().clear();
            for (InvoiceItemDto itemDto : dto.getItems()) {
                InvoiceItem item = new InvoiceItem(
                        itemDto.getDescription() != null ? itemDto.getDescription() : "Item",
                        itemDto.getQuantity() != null ? itemDto.getQuantity() : BigDecimal.ONE,
                        itemDto.getUnitPrice() != null ? itemDto.getUnitPrice() : BigDecimal.ZERO
                );
                invoice.addItem(item);
            }
        } else if (dto.getAmount() != null && dto.getAmount().compareTo(BigDecimal.ZERO) > 0 && invoice.getItems().isEmpty()) {
            invoice.addItem(new InvoiceItem("Services", BigDecimal.ONE, dto.getAmount()));
        }

        invoice.recalculateTotals();
        checkAndSetOverdue(invoice, LocalDate.now());
        Invoice updated = invoiceRepository.save(invoice);

        // If due date or status changed, recalculate reminders
        if (dueDateChanged || updated.getStatus() == InvoiceStatus.PAID || updated.getStatus() == InvoiceStatus.CANCELLED) {
            reminderScheduleCalculator.cancelFutureRemindersForInvoice(updated.getId());
            if (updated.getStatus() != InvoiceStatus.PAID && updated.getStatus() != InvoiceStatus.CANCELLED) {
                reminderScheduleCalculator.scheduleRemindersForInvoice(updated);
            }
        }

        return InvoiceDto.fromEntity(updated);
    }

    @Transactional
    public InvoiceDto markInvoiceAsPaid(String id, String userId) {
        Invoice invoice = invoiceRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found with id: " + id));

        invoice.setStatus(InvoiceStatus.PAID);
        Invoice saved = invoiceRepository.save(invoice);

        // Cancel all future reminders for this paid invoice
        reminderScheduleCalculator.cancelFutureRemindersForInvoice(saved.getId());

        return InvoiceDto.fromEntity(saved);
    }

    @Transactional
    public void deleteInvoice(String id, String userId) {
        Invoice invoice = invoiceRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found with id: " + id));

        // Cancel pending reminders first
        reminderScheduleCalculator.cancelFutureRemindersForInvoice(id);

        invoiceRepository.delete(invoice);
    }

    @Transactional(readOnly = true)
    public List<InvoiceDto> searchInvoices(String userId, String query) {
        if (query == null || query.isBlank()) {
            return getInvoices(userId);
        }
        List<Invoice> list = invoiceRepository.searchInvoices(userId, query.trim());
        LocalDate today = LocalDate.now();
        list.forEach(inv -> checkAndSetOverdue(inv, today));
        return list.stream().map(InvoiceDto::fromEntity).toList();
    }

    private void checkAndSetOverdue(Invoice inv, LocalDate today) {
        if (inv.getStatus() != InvoiceStatus.PAID && inv.getStatus() != InvoiceStatus.CANCELLED) {
            if (inv.getDueDate().isBefore(today)) {
                inv.setStatus(InvoiceStatus.OVERDUE);
            } else if (inv.getStatus() == InvoiceStatus.OVERDUE && !inv.getDueDate().isBefore(today)) {
                inv.setStatus(InvoiceStatus.UNPAID);
            }
        }
    }

    private String generateUniqueInvoiceNumber(String userId) {
        int year = LocalDate.now().getYear();
        long count = invoiceRepository.countByUserId(userId) + 1;
        String candidate = String.format("INV-%d-%03d", year, count);
        while (invoiceRepository.existsByUserIdAndInvoiceNumber(userId, candidate)) {
            count++;
            candidate = String.format("INV-%d-%03d", year, count);
        }
        return candidate;
    }

    @Transactional
    public InvoiceImportResultDto importInvoices(String userId, List<InvoiceCsvRowDto> rows) {
        ensureUserProfile(userId);
        InvoiceImportResultDto result = new InvoiceImportResultDto();
        if (rows == null || rows.isEmpty()) {
            result.getErrors().add("No rows provided for import.");
            return result;
        }

        result.setTotalRows(rows.size());
        List<Client> userClients = clientRepository.findByUserId(userId);
        LocalDate today = LocalDate.now();

        int rowIdx = 1;
        for (InvoiceCsvRowDto row : rows) {
            String clientName = row.getClientName() != null ? row.getClientName().trim() : "";
            String clientEmail = row.getClientEmail() != null ? row.getClientEmail().trim() : "";

            if (clientName.isEmpty() && clientEmail.isEmpty()) {
                result.setFailedCount(result.getFailedCount() + 1);
                result.getErrors().add("Row " + rowIdx + ": Client name or email is required.");
                rowIdx++;
                continue;
            }

            if (clientName.isEmpty()) {
                clientName = clientEmail.contains("@") ? clientEmail.substring(0, clientEmail.indexOf('@')) : clientEmail;
            }
            if (clientEmail.isEmpty()) {
                clientEmail = clientName.toLowerCase().replaceAll("[^a-z0-9]", "") + "@client.com";
            }

            // Amount validation
            BigDecimal amount = row.getAmount();
            if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
                result.setFailedCount(result.getFailedCount() + 1);
                result.getErrors().add("Row " + rowIdx + ": Invoice amount must be a positive number.");
                rowIdx++;
                continue;
            }

            // Date parsing
            LocalDate issueDate = parseDate(row.getIssueDate(), today);
            LocalDate dueDate = parseDate(row.getDueDate(), issueDate.plusDays(14));

            // Currency validation
            String currency = "USD".equalsIgnoreCase(row.getCurrency()) ? "USD" : "INR";

            // Invoice number validation & deduplication
            String invoiceNumber = row.getInvoiceNumber() != null ? row.getInvoiceNumber().trim() : "";
            if (invoiceNumber.isEmpty()) {
                invoiceNumber = generateUniqueInvoiceNumber(userId);
            } else if (invoiceRepository.existsByUserIdAndInvoiceNumber(userId, invoiceNumber)) {
                result.setSkippedCount(result.getSkippedCount() + 1);
                result.getWarnings().add("Row " + rowIdx + ": Invoice #" + invoiceNumber + " already exists. Skipped to prevent overwriting.");
                rowIdx++;
                continue;
            }

            // Client resolution: match by email or name, or create safely
            final String finalEmail = clientEmail;
            final String finalName = clientName;
            Client client = userClients.stream()
                    .filter(c -> c.getEmail().equalsIgnoreCase(finalEmail) || c.getName().equalsIgnoreCase(finalName))
                    .findFirst()
                    .orElse(null);

            if (client == null) {
                client = new Client(userId, finalName, finalEmail);
                if (row.getClientPhone() != null && !row.getClientPhone().isBlank()) {
                    client.setPhone(row.getClientPhone().trim());
                }
                client = clientRepository.save(client);
                userClients.add(client);
            }

            // Create Invoice
            Invoice invoice = new Invoice();
            invoice.setUserId(userId);
            invoice.setClient(client);
            invoice.setInvoiceNumber(invoiceNumber);
            invoice.setIssueDate(issueDate);
            invoice.setDueDate(dueDate);
            invoice.setCurrency(currency);
            invoice.setSubtotal(amount);
            invoice.setTotalAmount(amount);

            String statusStr = row.getStatus() != null ? row.getStatus().toUpperCase() : "UNPAID";
            InvoiceStatus status = "PAID".equals(statusStr) ? InvoiceStatus.PAID :
                    "DRAFT".equals(statusStr) ? InvoiceStatus.DRAFT :
                    dueDate.isBefore(today) ? InvoiceStatus.OVERDUE : InvoiceStatus.UNPAID;
            invoice.setStatus(status);

            String desc = row.getDescription() != null && !row.getDescription().isBlank() ? row.getDescription().trim() : "Imported invoice services";
            invoice.setDescription(desc);

            Invoice savedInvoice = invoiceRepository.save(invoice);

            // Add standard line item
            InvoiceItem item = new InvoiceItem(desc, BigDecimal.ONE, amount);
            item.setInvoice(savedInvoice);
            savedInvoice.getItems().add(item);
            savedInvoice = invoiceRepository.save(savedInvoice);

            // Schedule reminders if eligible
            if (savedInvoice.getStatus() != InvoiceStatus.PAID && savedInvoice.getStatus() != InvoiceStatus.CANCELLED) {
                reminderScheduleCalculator.scheduleRemindersForInvoice(savedInvoice);
            }

            result.setImportedCount(result.getImportedCount() + 1);
            result.getImportedInvoices().add(InvoiceDto.fromEntity(savedInvoice));
            rowIdx++;
        }

        return result;
    }

    @Transactional
    public InvoiceDto pauseFollowUp(String id, String userId) {
        Invoice invoice = invoiceRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found with id: " + id));

        invoice.setFollowUpStatus("PAUSED_BY_USER");
        reminderScheduleCalculator.cancelFutureRemindersForInvoice(invoice.getId());
        Invoice saved = invoiceRepository.save(invoice);
        return InvoiceDto.fromEntity(saved);
    }

    @Transactional
    public InvoiceDto resumeFollowUp(String id, String userId) {
        Invoice invoice = invoiceRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found with id: " + id));

        invoice.setFollowUpStatus("ACTIVE");
        Invoice saved = invoiceRepository.save(invoice);

        // Recalculate and reschedule future reminders if eligible
        if (saved.getStatus() != InvoiceStatus.PAID && saved.getStatus() != InvoiceStatus.CANCELLED) {
            reminderScheduleCalculator.scheduleRemindersForInvoice(saved);
        }

        return InvoiceDto.fromEntity(saved);
    }

    private LocalDate parseDate(String dateStr, LocalDate fallback) {
        if (dateStr == null || dateStr.isBlank()) return fallback;
        dateStr = dateStr.trim();
        if (dateStr.contains("T")) dateStr = dateStr.substring(0, dateStr.indexOf("T"));
        if (dateStr.contains(" ")) dateStr = dateStr.substring(0, dateStr.indexOf(" "));
        try {
            return LocalDate.parse(dateStr);
        } catch (Exception e1) {
            try {
                if (dateStr.contains("/")) {
                    String[] parts = dateStr.split("/");
                    if (parts.length == 3) {
                        if (parts[0].length() == 4) {
                            return LocalDate.of(Integer.parseInt(parts[0]), Integer.parseInt(parts[1]), Integer.parseInt(parts[2]));
                        } else if (parts[2].length() == 4) {
                            return LocalDate.of(Integer.parseInt(parts[2]), Integer.parseInt(parts[1]), Integer.parseInt(parts[0]));
                        }
                    }
                }
            } catch (Exception ignored) {}
            return fallback;
        }
    }
}
