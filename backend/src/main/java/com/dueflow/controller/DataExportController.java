package com.dueflow.controller;

import com.dueflow.security.SecurityUtils;
import com.dueflow.service.DataExportService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@RestController
@RequestMapping({"/api/export", "/export"})
public class DataExportController {

    private final DataExportService dataExportService;

    public DataExportController(DataExportService dataExportService) {
        this.dataExportService = dataExportService;
    }

    @GetMapping("/invoices")
    public ResponseEntity<byte[]> exportInvoices() {
        String userId = SecurityUtils.getRequiredUserId();
        byte[] csvData = dataExportService.exportInvoicesCsv(userId);
        return buildCsvResponse(csvData, "dueflow-invoices-" + getFormattedDate() + ".csv");
    }

    @GetMapping("/clients")
    public ResponseEntity<byte[]> exportClients() {
        String userId = SecurityUtils.getRequiredUserId();
        byte[] csvData = dataExportService.exportClientsCsv(userId);
        return buildCsvResponse(csvData, "dueflow-clients-" + getFormattedDate() + ".csv");
    }

    @GetMapping("/payments")
    public ResponseEntity<byte[]> exportPayments() {
        String userId = SecurityUtils.getRequiredUserId();
        byte[] csvData = dataExportService.exportPaymentsCsv(userId);
        return buildCsvResponse(csvData, "dueflow-payments-" + getFormattedDate() + ".csv");
    }

    @GetMapping("/reminders")
    public ResponseEntity<byte[]> exportReminders() {
        String userId = SecurityUtils.getRequiredUserId();
        byte[] csvData = dataExportService.exportReminderHistoryCsv(userId);
        return buildCsvResponse(csvData, "dueflow-reminders-history-" + getFormattedDate() + ".csv");
    }

    @GetMapping({"/all", ""})
    public ResponseEntity<byte[]> exportAll(@RequestParam(value = "type", required = false) String type) {
        String userId = SecurityUtils.getRequiredUserId();
        if ("invoices".equalsIgnoreCase(type)) {
            return exportInvoices();
        } else if ("clients".equalsIgnoreCase(type)) {
            return exportClients();
        } else if ("payments".equalsIgnoreCase(type)) {
            return exportPayments();
        } else if ("reminders".equalsIgnoreCase(type)) {
            return exportReminders();
        }

        byte[] csvData = dataExportService.exportAllDataCsv(userId);
        return buildCsvResponse(csvData, "dueflow-all-data-" + getFormattedDate() + ".csv");
    }

    private ResponseEntity<byte[]> buildCsvResponse(byte[] data, String filename) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/csv; charset=UTF-8"));
        headers.set(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"");
        headers.setContentLength(data.length);
        return ResponseEntity.ok()
                .headers(headers)
                .body(data);
    }

    private String getFormattedDate() {
        return LocalDate.now().format(DateTimeFormatter.ISO_DATE);
    }
}
