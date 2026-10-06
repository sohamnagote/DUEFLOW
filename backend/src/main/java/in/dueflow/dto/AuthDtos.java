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
        private String timezone;
        private String upi_id;
        private String bank_account;
        private String bank_ifsc;
        private String reminder_default;

        public String getFull_name() { return full_name; }
        public void setFull_name(String full_name) { this.full_name = full_name; }

        public String getBusiness_name() { return business_name; }
        public void setBusiness_name(String business_name) { this.business_name = business_name; }

        public String getPhone() { return phone; }
        public void setPhone(String phone) { this.phone = phone; }

        public String getTimezone() { return timezone; }
        public void setTimezone(String timezone) { this.timezone = timezone; }

        public String getUpi_id() { return upi_id; }
        public void setUpi_id(String upi_id) { this.upi_id = upi_id; }

        public String getBank_account() { return bank_account; }
        public void setBank_account(String bank_account) { this.bank_account = bank_account; }

        public String getBank_ifsc() { return bank_ifsc; }
        public void setBank_ifsc(String bank_ifsc) { this.bank_ifsc = bank_ifsc; }

        public String getReminder_default() { return reminder_default; }
        public void setReminder_default(String reminder_default) { this.reminder_default = reminder_default; }
    }
}
