package in.dueflow;

import in.dueflow.security.SupabaseJwtVerifier;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Base64;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class SecurityAndAuthIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private SupabaseJwtVerifier jwtVerifier;

    @Test
    void testPublicEndpointsAccessibleWithoutToken() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ok"));

        mockMvc.perform(post("/api/auth/logout"))
                .andExpect(status().isOk());
    }

    @Test
    void testProtectedEndpointsRejectUnauthenticatedRequests() throws Exception {
        // Without Authorization header
        mockMvc.perform(get("/api/clients"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/invoices"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/dashboard"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void testValidTokenAcceptance() throws Exception {
        UUID userId = UUID.randomUUID();
        String devToken = "dueflow_dev_" + userId + "_" + Base64.getEncoder().encodeToString("testuser@dueflow.in".getBytes());

        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + devToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.id").value(userId.toString()));
    }

    @Test
    void testProductionRejectionOfCustomDevTokens() {
        UUID userId = UUID.randomUUID();
        String devToken = "dueflow_dev_" + userId + "_base64email";

        // In development mode, verifier succeeds
        ReflectionTestUtils.setField(jwtVerifier, "nodeEnv", "development");
        assertTrue(jwtVerifier.verify(devToken).isPresent());

        // In production mode, verifier rejects custom dev tokens strictly
        ReflectionTestUtils.setField(jwtVerifier, "nodeEnv", "production");
        assertFalse(jwtVerifier.verify(devToken).isPresent(), "Production environment must reject custom development tokens");

        // Reset
        ReflectionTestUtils.setField(jwtVerifier, "nodeEnv", "development");
    }
}
