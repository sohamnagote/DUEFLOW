package in.dueflow.security;

import java.io.Serializable;
import java.util.UUID;

public class AuthenticatedUser implements Serializable {
    private final UUID id;
    private final String email;
    private final String fullName;
    private final String businessName;

    public AuthenticatedUser(UUID id, String email, String fullName, String businessName) {
        this.id = id;
        this.email = email;
        this.fullName = fullName != null ? fullName : "";
        this.businessName = businessName != null ? businessName : "";
    }

    public UUID getId() { return id; }
    public String getEmail() { return email; }
    public String getFullName() { return fullName; }
    public String getBusinessName() { return businessName; }
}
