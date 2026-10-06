package in.dueflow.dto;

import java.math.BigDecimal;
import java.util.UUID;

public class AiDtos {

    public static class GenerateReminderRequest {
        private UUID invoice_id;
        private String invoice_number;
        private BigDecimal amount;
        private String due_date;
        private String client_name;
        private String tone = "professional";

        public UUID getInvoice_id() { return invoice_id; }
        public void setInvoice_id(UUID invoice_id) { this.invoice_id = invoice_id; }

        public String getInvoice_number() { return invoice_number; }
        public void setInvoice_number(String invoice_number) { this.invoice_number = invoice_number; }

        public BigDecimal getAmount() { return amount; }
        public void setAmount(BigDecimal amount) { this.amount = amount; }

        public String getDue_date() { return due_date; }
        public void setDue_date(String due_date) { this.due_date = due_date; }

        public String getClient_name() { return client_name; }
        public void setClient_name(String client_name) { this.client_name = client_name; }

        public String getTone() { return tone; }
        public void setTone(String tone) { this.tone = tone; }
    }

    public static class GenerateReminderResponse {
        private String subject;
        private String body;
        private String tone;
        private String modelUsed;
        private boolean isFallback;

        public GenerateReminderResponse() {}

        public GenerateReminderResponse(String subject, String body, String tone, String modelUsed, boolean isFallback) {
            this.subject = subject;
            this.body = body;
            this.tone = tone;
            this.modelUsed = modelUsed;
            this.isFallback = isFallback;
        }

        public String getSubject() { return subject; }
        public void setSubject(String subject) { this.subject = subject; }

        public String getBody() { return body; }
        public void setBody(String body) { this.body = body; }

        public String getTone() { return tone; }
        public void setTone(String tone) { this.tone = tone; }

        public String getModelUsed() { return modelUsed; }
        public void setModelUsed(String modelUsed) { this.modelUsed = modelUsed; }

        public boolean isFallback() { return isFallback; }
        public void setFallback(boolean fallback) { isFallback = fallback; }
    }
}
