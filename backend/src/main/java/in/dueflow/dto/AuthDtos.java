package in.dueflow.dto;

import in.dueflow.entity.Profile;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class AuthDtos {

    public static class SignupRequest {
        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email format")
        private String email;

        @NotBlank(message = "Password required")
        @Size(min = 6, message = "Password must be at least 6 characters")
        private String password;

        private String full_name = "";
        private String business_name = "";

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }

        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }

        public String getFull_name() { return full_name; }
        public void setFull_name(String full_name) { this.full_name = full_name; }

        public String getBusiness_name() { return business_name; }
        public void setBusiness_name(String business_name) { this.business_name = business_name; }
    }

    public static class LoginRequest {
        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email format")
        private String email;

        @NotBlank(message = "Password required")
        private String password;

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }

        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
    }

    public static class AuthResponse {
        private String token;
        private Profile user;

        public AuthResponse(String token, Profile user) {
            this.token = token;
            this.user = user;
        }

        public String getToken() { return token; }
        public void setToken(String token) { this.token = token; }

        public Profile getUser() { return user; }
        public void setUser(Profile user) { this.user = user; }
    }

    public static class UpdateProfileRequest {
        private String full_name;
        private String business_name;
        private String phone;
        private String address;
        private String logo_url;
        private String timezone;
        private String upi_id;
        private String bank_account;
        private String bank_ifsc;
        private String bank_name;
        private String payment_notes;
        private String payment_qr_url;
        private String reminder_default;

        public String getFull_name() { return full_name; }
        public void setFull_name(String full_name) { this.full_name = full_name; }

        public String getBusiness_name() { return business_name; }
        public void setBusiness_name(String business_name) { this.business_name = business_name; }

        public String getPhone() { return phone; }
        public void setPhone(String phone) { this.phone = phone; }

        public String getAddress() { return address; }
        public void setAddress(String address) { this.address = address; }

        public String getLogo_url() { return logo_url; }
        public void setLogo_url(String logo_url) { this.logo_url = logo_url; }

        public String getTimezone() { return timezone; }
        public void setTimezone(String timezone) { this.timezone = timezone; }

        public String getUpi_id() { return upi_id; }
        public void setUpi_id(String upi_id) { this.upi_id = upi_id; }

        public String getBank_account() { return bank_account; }
        public void setBank_account(String bank_account) { this.bank_account = bank_account; }

        public String getBank_ifsc() { return bank_ifsc; }
        public void setBank_ifsc(String bank_ifsc) { this.bank_ifsc = bank_ifsc; }

        public String getBank_name() { return bank_name; }
        public void setBank_name(String bank_name) { this.bank_name = bank_name; }

        public String getPayment_notes() { return payment_notes; }
        public void setPayment_notes(String payment_notes) { this.payment_notes = payment_notes; }

        public String getPayment_qr_url() { return payment_qr_url; }
        public void setPayment_qr_url(String payment_qr_url) { this.payment_qr_url = payment_qr_url; }

        public String getReminder_default() { return reminder_default; }
        public void setReminder_default(String reminder_default) { this.reminder_default = reminder_default; }

        private String reminder_schedule_rules;
        private String custom_email_subject;
        private String custom_email_body;
        private String email_tone;

        public String getReminder_schedule_rules() { return reminder_schedule_rules; }
        public void setReminder_schedule_rules(String reminder_schedule_rules) { this.reminder_schedule_rules = reminder_schedule_rules; }

        public String getCustom_email_subject() { return custom_email_subject; }
        public void setCustom_email_subject(String custom_email_subject) { this.custom_email_subject = custom_email_subject; }

        public String getCustom_email_body() { return custom_email_body; }
        public void setCustom_email_body(String custom_email_body) { this.custom_email_body = custom_email_body; }

        public String getEmail_tone() { return email_tone; }
        public void setEmail_tone(String email_tone) { this.email_tone = email_tone; }
    }
}
