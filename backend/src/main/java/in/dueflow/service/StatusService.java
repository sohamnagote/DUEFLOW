package in.dueflow.service;

import in.dueflow.entity.Invoice;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

@Service
public class StatusService {

    public String deriveOperationalStatus(Invoice invoice) {
        return deriveOperationalStatus(invoice, LocalDate.now());
    }

    public String deriveOperationalStatus(Invoice invoice, LocalDate referenceDate) {
        if ("paid".equalsIgnoreCase(invoice.getStatus()) || invoice.getPaidAt() != null) {
            return "paid";
        }

        if ("cancelled".equalsIgnoreCase(invoice.getStatus())) {
            return "cancelled";
        }

        if (invoice.getDueDate() == null) {
            return "unpaid";
        }

        long diffDays = ChronoUnit.DAYS.between(referenceDate, invoice.getDueDate());

        if (diffDays < 0) {
            return "overdue";
        }

        if (diffDays <= 3) {
            return "due_soon";
        }

        return "unpaid";
    }

    public boolean areRemindersExecutable(Invoice invoice) {
        if (Boolean.FALSE.equals(invoice.getRemindersEnabled())) return false;
        if ("paid".equalsIgnoreCase(invoice.getStatus()) || invoice.getPaidAt() != null) return false;
        if ("cancelled".equalsIgnoreCase(invoice.getStatus())) return false;
        return true;
    }
}
