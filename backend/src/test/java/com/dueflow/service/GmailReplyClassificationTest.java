package com.dueflow.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class GmailReplyClassificationTest {

    private GmailReplySyncService syncService;

    @BeforeEach
    void setUp() {
        syncService = new GmailReplySyncService(
                "client-id",
                "client-secret",
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );
    }

    @Test
    void testClassifyOutOfOffice() {
        assertEquals("OUT_OF_OFFICE", syncService.classifyReply("I am currently out of office until Monday.", "Automatic reply: Invoice #101"));
        assertEquals("OUT_OF_OFFICE", syncService.classifyReply("Thank you for your email. I am on leave.", "Re: Invoice #102"));
    }

    @Test
    void testClassifyPaymentReported() {
        assertEquals("PAYMENT_REPORTED", syncService.classifyReply("We already paid this yesterday, please check your bank account.", "Re: Reminder Invoice #105"));
        assertEquals("PAYMENT_REPORTED", syncService.classifyReply("Transferred the full amount today.", "Re: Invoice #106"));
    }

    @Test
    void testClassifyNeedMoreTime() {
        assertEquals("NEED_MORE_TIME", syncService.classifyReply("We need more time to process this with accounting. Will pay next week.", "Re: Invoice #107"));
        assertEquals("NEED_MORE_TIME", syncService.classifyReply("Can you give me a few days? Having cash flow delay.", "Re: Invoice #108"));
    }

    @Test
    void testClassifyQuestion() {
        assertEquals("QUESTION", syncService.classifyReply("Could you clarify what the additional fee on line 2 is for?", "Re: Invoice #109"));
        assertEquals("QUESTION", syncService.classifyReply("Which bank account should we send this to? Do you have a PO number?", "Re: Invoice #110"));
    }

    @Test
    void testClassifyCorrectionRequested() {
        assertEquals("CORRECTION_REQUESTED", syncService.classifyReply("The discount is missing and the tax amount is wrong.", "Re: Invoice #111"));
        assertEquals("CORRECTION_REQUESTED", syncService.classifyReply("Please revise this invoice with our updated billing address.", "Re: Invoice #112"));
    }

    @Test
    void testClassifyOptOut() {
        assertEquals("OPT_OUT", syncService.classifyReply("Please remove me from these automated reminders and stop sending them.", "Re: Invoice #113"));
    }
}
