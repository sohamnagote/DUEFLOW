package com.dueflow.service;

import com.dueflow.domain.Invoice;
import com.dueflow.domain.InvoiceStatus;
import com.dueflow.domain.ReminderHistory;
import com.dueflow.domain.ReminderRule;
import com.dueflow.domain.ReminderStatus;
import com.dueflow.domain.ScheduledReminder;
import com.dueflow.dto.ReminderHistoryDto;
import com.dueflow.dto.ReminderRuleDto;
import com.dueflow.dto.ScheduledReminderDto;
import com.dueflow.exception.ResourceNotFoundException;
import com.dueflow.repository.ReminderHistoryRepository;
import com.dueflow.repository.ReminderRuleRepository;
import com.dueflow.repository.ScheduledReminderRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ReminderService {

    private final ReminderRuleRepository reminderRuleRepository;
    private final ScheduledReminderRepository scheduledReminderRepository;
    private final ReminderHistoryRepository reminderHistoryRepository;
    private final ReminderSchedulerService reminderSchedulerService;
    private final ReminderScheduleCalculator reminderScheduleCalculator;
    private final com.dueflow.repository.InvoiceRepository invoiceRepository;
    private final com.dueflow.repository.UserProfileRepository userProfileRepository;

    public ReminderService(
            ReminderRuleRepository reminderRuleRepository,
            ScheduledReminderRepository scheduledReminderRepository,
            ReminderHistoryRepository reminderHistoryRepository,
            ReminderSchedulerService reminderSchedulerService,
            ReminderScheduleCalculator reminderScheduleCalculator,
            com.dueflow.repository.InvoiceRepository invoiceRepository,
            com.dueflow.repository.UserProfileRepository userProfileRepository,
            UserProfileService userProfileService) {
        this.reminderRuleRepository = reminderRuleRepository;
        this.scheduledReminderRepository = scheduledReminderRepository;
        this.reminderHistoryRepository = reminderHistoryRepository;
        this.reminderSchedulerService = reminderSchedulerService;
        this.reminderScheduleCalculator = reminderScheduleCalculator;
        this.invoiceRepository = invoiceRepository;
        this.userProfileRepository = userProfileRepository;
        this.userProfileService = userProfileService;
    }

    private final UserProfileService userProfileService;

    private void ensureUserProfile(String userId) {
        userProfileService.ensureProfileExists(userId);
    }

    @Transactional
    public List<ReminderRuleDto> getReminderRules(String userId) {
        List<ReminderRule> rules = reminderRuleRepository.findByUserIdOrderByCreatedAtAsc(userId);
        if (rules.isEmpty()) {
            rules = createDefaultRules(userId);
        }
        return rules.stream().map(ReminderRuleDto::fromEntity).collect(Collectors.toList());
    }

    @Transactional
    public ReminderRuleDto createReminderRule(String userId, ReminderRuleDto dto) {
        ensureUserProfile(userId);
        ReminderRule rule = new ReminderRule();
        rule.setUserId(userId);
        rule.setLabel(dto.getLabel());
        rule.setTiming(dto.getTiming());
        rule.setDaysOffset(dto.getDaysOffset());
        rule.setSendTime(dto.getSendTime() != null ? dto.getSendTime() : "09:00");
        rule.setTone(dto.getTone() != null ? dto.getTone() : "FRIENDLY");
        rule.setTimezone(dto.getTimezone() != null && !dto.getTimezone().isBlank() ? dto.getTimezone() : "Asia/Kolkata");
        rule.setInvoiceId(dto.getInvoiceId() != null && !dto.getInvoiceId().isBlank() ? dto.getInvoiceId() : null);
        rule.setCustomSubject(dto.getCustomSubject());
        rule.setCustomMessage(dto.getCustomMessage());
        rule.setEnabled(dto.isEnabled());

        ReminderRule saved = reminderRuleRepository.save(rule);
        recalculateRemindersForUser(userId);
        return ReminderRuleDto.fromEntity(saved);
    }

    @Transactional
    public ReminderRuleDto updateReminderRule(String userId, String ruleId, ReminderRuleDto dto) {
        ReminderRule rule = reminderRuleRepository.findByIdAndUserId(ruleId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Reminder rule not found"));

        rule.setLabel(dto.getLabel());
        rule.setTiming(dto.getTiming());
        rule.setDaysOffset(dto.getDaysOffset());
        rule.setSendTime(dto.getSendTime());
        rule.setTone(dto.getTone());
        if (dto.getTimezone() != null && !dto.getTimezone().isBlank()) {
            rule.setTimezone(dto.getTimezone());
        }
        rule.setInvoiceId(dto.getInvoiceId() != null && !dto.getInvoiceId().isBlank() ? dto.getInvoiceId() : null);
        rule.setCustomSubject(dto.getCustomSubject());
        rule.setCustomMessage(dto.getCustomMessage());
        rule.setEnabled(dto.isEnabled());

        ReminderRule updated = reminderRuleRepository.save(rule);
        recalculateRemindersForUser(userId);
        return ReminderRuleDto.fromEntity(updated);
    }

    @Transactional
    public void deleteReminderRule(String userId, String ruleId) {
        reminderRuleRepository.deleteByIdAndUserId(ruleId, userId);
        recalculateRemindersForUser(userId);
    }

    private void recalculateRemindersForUser(String userId) {
        List<com.dueflow.domain.Invoice> activeInvoices = invoiceRepository.findByUserIdOrderByCreatedAtDesc(userId);
        for (com.dueflow.domain.Invoice inv : activeInvoices) {
            if (inv.getStatus() != com.dueflow.domain.InvoiceStatus.PAID && inv.getStatus() != com.dueflow.domain.InvoiceStatus.CANCELLED) {
                reminderScheduleCalculator.cancelFutureRemindersForInvoice(inv.getId());
                reminderScheduleCalculator.scheduleRemindersForInvoice(inv);
            }
        }
    }

    /**
     * Central server-side authority check for invoice reminder eligibility.
     */
    public static boolean isInvoiceEligibleForReminders(Invoice invoice) {
        if (invoice == null) return false;
        if (invoice.getStatus() == InvoiceStatus.PAID || invoice.getStatus() == InvoiceStatus.CANCELLED || invoice.getStatus() == InvoiceStatus.DRAFT) {
            return false;
        }
        if (invoice.getTotalAmount() == null || invoice.getTotalAmount().compareTo(BigDecimal.ZERO) <= 0) {
            return false;
        }
        return invoice.getClient() != null && invoice.getClient().getEmail() != null && !invoice.getClient().getEmail().isBlank();
    }

    @Transactional
    public List<ScheduledReminderDto> getUpcomingReminders(String userId) {
        List<ScheduledReminder> all = scheduledReminderRepository.findByUserIdOrderByScheduledAtAsc(userId);
        List<ScheduledReminder> eligible = new ArrayList<>();

        for (ScheduledReminder reminder : all) {
            // Reminders that are already cancelled, sent, or failed do not belong in the pending queue
            if (reminder.getStatus() != ReminderStatus.PENDING) {
                continue;
            }

            Invoice invoice = reminder.getInvoice();
            // If the invoice is paid, cancelled, or missing, safely cancel the reminder and exclude it
            if (invoice == null || invoice.getStatus() == InvoiceStatus.PAID || invoice.getStatus() == InvoiceStatus.CANCELLED) {
                reminder.setStatus(ReminderStatus.CANCELLED);
                scheduledReminderRepository.save(reminder);
                continue;
            }

            eligible.add(reminder);
        }

        return eligible.stream()
                .map(ScheduledReminderDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public List<ScheduledReminderDto> getInvoiceReminders(String userId, String invoiceId) {
        return scheduledReminderRepository.findByInvoiceId(invoiceId).stream()
                .filter(r -> r.getUserId().equals(userId) && r.getStatus() == ReminderStatus.PENDING)
                .filter(r -> r.getInvoice() != null && r.getInvoice().getStatus() != InvoiceStatus.PAID && r.getInvoice().getStatus() != InvoiceStatus.CANCELLED)
                .map(ScheduledReminderDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ReminderHistoryDto> getReminderHistory(String userId, int page, int size) {
        Page<ReminderHistory> historyPage = reminderHistoryRepository.findByUserIdOrderByAttemptedAtDesc(
                userId,
                PageRequest.of(page, Math.min(size, 100))
        );
        return historyPage.getContent().stream()
                .map(ReminderHistoryDto::fromEntity)
                .collect(Collectors.toList());
    }

    public Map<String, Object> triggerReminder(String userId, String reminderId) {
        String targetId = reminderId;
        ReminderRule rule = reminderRuleRepository.findByIdAndUserId(reminderId, userId).orElse(null);
        if (rule != null) {
            if (rule.getInvoiceId() != null && !rule.getInvoiceId().isBlank()) {
                targetId = rule.getInvoiceId();
            } else {
                throw new com.dueflow.exception.ValidationException("Cannot trigger reminder from a global rule without an associated invoice.");
            }
        }
        return reminderSchedulerService.triggerReminderManually(targetId, userId);
    }

    private List<ReminderRule> createDefaultRules(String userId) {
        ensureUserProfile(userId);
        ReminderRule r1 = new ReminderRule(userId, "3 days before due date", "BEFORE", 3, "FRIENDLY");
        ReminderRule r2 = new ReminderRule(userId, "On due date", "ON_DUE_DATE", 0, "FRIENDLY");
        ReminderRule r3 = new ReminderRule(userId, "3 days overdue", "AFTER", 3, "URGENT");
        return reminderRuleRepository.saveAll(List.of(r1, r2, r3));
    }
}
