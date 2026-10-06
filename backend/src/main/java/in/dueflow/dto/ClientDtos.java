package in.dueflow.dto;

import in.dueflow.entity.Client;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public class ClientDtos {

    public static class CreateClientRequest {
        @NotBlank(message = "Name is required")
        @Size(max = 150, message = "Name too long")
        private String name;

        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email address")
        @Size(max = 254)
        private String email;

        @Size(max = 1000)
        private String notes = "";

        @Size(max = 50)
        private String cin = "";

        @Size(max = 30)
        private String phone = "";

        @Size(max = 100)
        private String attn = "";

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }

        public String getNotes() { return notes; }
        public void setNotes(String notes) { this.notes = notes; }

        public String getCin() { return cin; }
        public void setCin(String cin) { this.cin = cin; }

        public String getPhone() { return phone; }
        public void setPhone(String phone) { this.phone = phone; }

        public String getAttn() { return attn; }
        public void setAttn(String attn) { this.attn = attn; }
    }

    public static class UpdateClientRequest {
        @Size(max = 150)
        private String name;

        @Email
        @Size(max = 254)
        private String email;

        @Size(max = 1000)
        private String notes;

        @Size(max = 50)
        private String cin;

        @Size(max = 30)
        private String phone;

        @Size(max = 100)
        private String attn;

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }

        public String getNotes() { return notes; }
        public void setNotes(String notes) { this.notes = notes; }

        public String getCin() { return cin; }
        public void setCin(String cin) { this.cin = cin; }

        public String getPhone() { return phone; }
        public void setPhone(String phone) { this.phone = phone; }

        public String getAttn() { return attn; }
        public void setAttn(String attn) { this.attn = attn; }
    }

    public static class ClientResponseDto {
        private UUID id;
        private UUID user_id;
        private String name;
        private String email;
        private String notes;
        private String cin;
        private String phone;
        private String attn;
        private Instant created_at;
        private Instant updated_at;
        private int invoices_count;
        private BigDecimal total_invoiced;
        private BigDecimal pending_balance;

        public static ClientResponseDto from(Client client, int count, BigDecimal total, BigDecimal pending) {
            ClientResponseDto dto = new ClientResponseDto();
            dto.id = client.getId();
            dto.user_id = client.getUserId();
            dto.name = client.getName();
            dto.email = client.getEmail();
            dto.notes = client.getNotes();
            dto.cin = client.getCin();
            dto.phone = client.getPhone();
            dto.attn = client.getAttn();
            dto.created_at = client.getCreatedAt();
            dto.updated_at = client.getUpdatedAt();
            dto.invoices_count = count;
            dto.total_invoiced = total != null ? total : BigDecimal.ZERO;
            dto.pending_balance = pending != null ? pending : BigDecimal.ZERO;
            return dto;
        }

        public UUID getId() { return id; }
        public UUID getUser_id() { return user_id; }
        public String getName() { return name; }
        public String getEmail() { return email; }
        public String getNotes() { return notes; }
        public String getCin() { return cin; }
        public String getPhone() { return phone; }
        public String getAttn() { return attn; }
        public Instant getCreated_at() { return created_at; }
        public Instant getUpdated_at() { return updated_at; }
        public int getInvoices_count() { return invoices_count; }
        public BigDecimal getTotal_invoiced() { return total_invoiced; }
        public BigDecimal getPending_balance() { return pending_balance; }
    }
}
