package in.dueflow.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "ai_actions", indexes = {
    @Index(name = "idx_ai_actions_user_id", columnList = "user_id")
})
public class AiAction {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "invoice_id")
    private UUID invoiceId;

    @Column(name = "action_type", nullable = false)
    private String actionType;

    @Column(name = "prompt_summary")
    private String promptSummary;

    @Column(name = "model_used", nullable = false)
    private String modelUsed;

    @Column(name = "generated_subject")
    private String generatedSubject;

    @Column(name = "generated_body", length = 4000)
    private String generatedBody;

    @Column(name = "tokens_used")
    private Integer tokensUsed = 0;

    @Column(name = "latency_ms")
    private Integer latencyMs = 0;

    @Column(name = "is_fallback", nullable = false)
    private Boolean isFallback = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public AiAction() {}

    @PrePersist
    protected void onCreate() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = Instant.now();
        if (tokensUsed == null) tokensUsed = 0;
        if (latencyMs == null) latencyMs = 0;
        if (isFallback == null) isFallback = false;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }

    public UUID getInvoiceId() { return invoiceId; }
    public void setInvoiceId(UUID invoiceId) { this.invoiceId = invoiceId; }

    public String getActionType() { return actionType; }
    public void setActionType(String actionType) { this.actionType = actionType; }

    public String getPromptSummary() { return promptSummary; }
    public void setPromptSummary(String promptSummary) { this.promptSummary = promptSummary; }

    public String getModelUsed() { return modelUsed; }
    public void setModelUsed(String modelUsed) { this.modelUsed = modelUsed; }

    public String getGeneratedSubject() { return generatedSubject; }
    public void setGeneratedSubject(String generatedSubject) { this.generatedSubject = generatedSubject; }

    public String getGeneratedBody() { return generatedBody; }
    public void setGeneratedBody(String generatedBody) { this.generatedBody = generatedBody; }

    public Integer getTokensUsed() { return tokensUsed; }
    public void setTokensUsed(Integer tokensUsed) { this.tokensUsed = tokensUsed; }

    public Integer getLatencyMs() { return latencyMs; }
    public void setLatencyMs(Integer latencyMs) { this.latencyMs = latencyMs; }

    public Boolean getIsFallback() { return isFallback; }
    public void setIsFallback(Boolean isFallback) { this.isFallback = isFallback; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
