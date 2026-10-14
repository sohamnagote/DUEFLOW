package com.dueflow.dto;

import java.util.ArrayList;
import java.util.List;

public class InvoiceImportResultDto {

    private int totalRows;
    private int importedCount;
    private int skippedCount;
    private int failedCount;
    private List<String> errors = new ArrayList<>();
    private List<String> warnings = new ArrayList<>();
    private List<InvoiceDto> importedInvoices = new ArrayList<>();

    public InvoiceImportResultDto() {
    }

    public int getTotalRows() {
        return totalRows;
    }

    public void setTotalRows(int totalRows) {
        this.totalRows = totalRows;
    }

    public int getImportedCount() {
        return importedCount;
    }

    public void setImportedCount(int importedCount) {
        this.importedCount = importedCount;
    }

    public int getSkippedCount() {
        return skippedCount;
    }

    public void setSkippedCount(int skippedCount) {
        this.skippedCount = skippedCount;
    }

    public int getFailedCount() {
        return failedCount;
    }

    public void setFailedCount(int failedCount) {
        this.failedCount = failedCount;
    }

    public List<String> getErrors() {
        return errors;
    }

    public void setErrors(List<String> errors) {
        this.errors = errors;
    }

    public List<String> getWarnings() {
        return warnings;
    }

    public void setWarnings(List<String> warnings) {
        this.warnings = warnings;
    }

    public List<InvoiceDto> getImportedInvoices() {
        return importedInvoices;
    }

    public void setImportedInvoices(List<InvoiceDto> importedInvoices) {
        this.importedInvoices = importedInvoices;
    }
}
