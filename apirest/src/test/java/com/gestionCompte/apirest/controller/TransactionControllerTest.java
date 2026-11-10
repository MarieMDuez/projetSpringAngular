package com.gestionCompte.apirest.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.gestionCompte.apirest.exception.ErrorMessages;
import com.gestionCompte.apirest.exception.ResourceNotFoundException;
import com.gestionCompte.apirest.model.AccountType;
import com.gestionCompte.apirest.model.Transaction;
import com.gestionCompte.apirest.model.TransactionType;
import com.gestionCompte.apirest.services.TransactionService;

/**
 * Tests de la couche HTTP de TransactionController.
 *
 * Le plus important ici : /filter reçoit 13 paramètres d'URL qu'il doit transmettre au service
 * dans le bon ordre. Le test de transmission utilise des valeurs toutes différentes pour détecter
 * une inversion (par exemple categoryId et paymentMethodId).
 */
@WebMvcTest(TransactionController.class)
class TransactionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private TransactionService transactionService;

    private static final String VALID_TRANSACTION_JSON = """
            {"description": "Courses", "amount": 42.50, "type": "DEBIT", "emissionDate": "2026-09-15",
             "account": {"id": 1}, "category": {"id": 2}, "paymentMethod": {"id": 3}}
            """;

    private Transaction buildTransaction(Long id, String description) {
        Transaction transaction = new Transaction();
        transaction.setId(id);
        transaction.setDescription(description);
        transaction.setAmount(new BigDecimal("42.50"));
        transaction.setType(TransactionType.DEBIT);
        transaction.setEmissionDate(LocalDate.of(2026, 9, 15));
        return transaction;
    }

    private static RuntimeException notFound() {
        return new ResourceNotFoundException(ErrorMessages.TRANSACTION_NOT_FOUND);
    }

    // ------------------------------------------------------------------
    // Lecture
    // ------------------------------------------------------------------

    @Test
    void should_return_all_transactions() throws Exception {
        when(transactionService.getAllTransactions())
                .thenReturn(List.of(buildTransaction(1L, "Courses"), buildTransaction(2L, "Essence")));

        mockMvc.perform(get("/api/transactions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].description").value("Courses"));
    }

    @Test
    void should_return_transaction_by_id_with_amount_type_and_date() throws Exception {
        when(transactionService.getTransactionById(1L)).thenReturn(buildTransaction(1L, "Courses"));

        mockMvc.perform(get("/api/transactions/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.amount").value(42.5))
                .andExpect(jsonPath("$.type").value("DEBIT"))
                .andExpect(jsonPath("$.emissionDate").value("2026-09-15"));
    }

    @Test
    void should_return_404_when_transaction_does_not_exist() throws Exception {
        when(transactionService.getTransactionById(99L)).thenThrow(notFound());

        mockMvc.perform(get("/api/transactions/99"))
                .andExpect(status().isNotFound());
    }

    @Test
    void should_return_400_when_id_is_not_a_number() throws Exception {
        mockMvc.perform(get("/api/transactions/abc"))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(transactionService);
    }

    @Test
    void should_return_unique_recurrence_months() throws Exception {
        when(transactionService.getUniqueRecurrenceMonths()).thenReturn(List.of(1, 3, 12));

        mockMvc.perform(get("/api/transactions/recurrences/unique"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[2]").value(12));
    }

    // ------------------------------------------------------------------
    // Filtres
    // ------------------------------------------------------------------

    @Test
    void should_forward_every_filter_to_the_service_in_the_right_order() throws Exception {
        when(transactionService.getFilteredTransactions(1L, 2L, 3L, 15, 9, 2026, new BigDecimal("10.00"),
                new BigDecimal("100.00"), "DEBIT", true, 3, 50, AccountType.COURANT))
                .thenReturn(List.of(buildTransaction(100L, "Courses")));

        mockMvc.perform(get("/api/transactions/filter")
                .param("accountId", "1")
                .param("categoryId", "2")
                .param("paymentMethodId", "3")
                .param("day", "15")
                .param("month", "9")
                .param("year", "2026")
                .param("minAmount", "10.00")
                .param("maxAmount", "100.00")
                .param("type", "DEBIT")
                .param("recurrenceMonths", "3")
                .param("isChecked", "true")
                .param("limit", "50")
                .param("accountType", "COURANT"))
                .andExpect(status().isOk())
                // Si un paramètre était transmis à la mauvaise place, le stub ne correspondrait pas
                // et la liste serait vide
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(100));
    }

    @Test
    void should_call_the_service_with_null_filters_when_no_parameter_is_given() throws Exception {
        mockMvc.perform(get("/api/transactions/filter"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        verify(transactionService).getFilteredTransactions(null, null, null, null, null, null, null, null, null,
                null, null, null, null);
    }

    @Test
    void should_return_400_when_filter_account_type_is_unknown() throws Exception {
        mockMvc.perform(get("/api/transactions/filter").param("accountType", "INCONNU"))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(transactionService);
    }

    @ParameterizedTest
    @ValueSource(strings = { "accountId=abc", "month=septembre", "minAmount=beaucoup", "isChecked=peut-etre" })
    void should_return_400_when_a_filter_has_the_wrong_type(String badParameter) throws Exception {
        String[] nameAndValue = badParameter.split("=");

        mockMvc.perform(get("/api/transactions/filter").param(nameAndValue[0], nameAndValue[1]))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(transactionService);
    }

    // ------------------------------------------------------------------
    // Création, modification, suppression
    // ------------------------------------------------------------------

    @Test
    void should_create_transaction_and_return_201() throws Exception {
        when(transactionService.createTransaction(any(Transaction.class)))
                .thenReturn(buildTransaction(5L, "Courses"));

        mockMvc.perform(post("/api/transactions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(VALID_TRANSACTION_JSON))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(5));

        ArgumentCaptor<Transaction> captor = ArgumentCaptor.forClass(Transaction.class);
        verify(transactionService).createTransaction(captor.capture());
        Transaction received = captor.getValue();
        assertThat(received.getDescription()).isEqualTo("Courses");
        assertThat(received.getAmount()).isEqualByComparingTo("42.50");
        assertThat(received.getType()).isEqualTo(TransactionType.DEBIT);
        assertThat(received.getEmissionDate()).isEqualTo(LocalDate.of(2026, 9, 15));
        assertThat(received.getAccount().getId()).isEqualTo(1L);
        assertThat(received.getCategory().getId()).isEqualTo(2L);
        assertThat(received.getPaymentMethod().getId()).isEqualTo(3L);
    }

    @Test
    void should_return_400_and_not_call_the_service_when_json_is_malformed() throws Exception {
        mockMvc.perform(post("/api/transactions")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"description\": "))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(transactionService);
    }

    @Test
    void should_return_400_when_transaction_type_is_unknown() throws Exception {
        mockMvc.perform(post("/api/transactions")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"description\": \"Courses\", \"amount\": 10, \"type\": \"INCONNU\"}"))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(transactionService);
    }

    @Test
    void should_update_transaction() throws Exception {
        when(transactionService.updateTransaction(eq(5L), any(Transaction.class)))
                .thenReturn(buildTransaction(5L, "Courses modifiées"));

        mockMvc.perform(put("/api/transactions/5")
                .contentType(MediaType.APPLICATION_JSON)
                .content(VALID_TRANSACTION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.description").value("Courses modifiées"));

        ArgumentCaptor<Transaction> captor = ArgumentCaptor.forClass(Transaction.class);
        verify(transactionService).updateTransaction(eq(5L), captor.capture());
        assertThat(captor.getValue().getDescription()).isEqualTo("Courses");
    }

    @Test
    void should_return_404_when_updating_a_transaction_that_does_not_exist() throws Exception {
        when(transactionService.updateTransaction(eq(99L), any(Transaction.class))).thenThrow(notFound());

        mockMvc.perform(put("/api/transactions/99")
                .contentType(MediaType.APPLICATION_JSON)
                .content(VALID_TRANSACTION_JSON))
                .andExpect(status().isNotFound());
    }

    @Test
    void should_delete_transaction_and_return_204() throws Exception {
        mockMvc.perform(delete("/api/transactions/5"))
                .andExpect(status().isNoContent());

        verify(transactionService).deleteTransaction(5L);
    }

    @Test
    void should_return_404_when_deleting_a_transaction_that_does_not_exist() throws Exception {
        doThrow(notFound()).when(transactionService).deleteTransaction(99L);

        mockMvc.perform(delete("/api/transactions/99"))
                .andExpect(status().isNotFound());
    }

    // ------------------------------------------------------------------
    // Génération des transactions récurrentes
    // ------------------------------------------------------------------

    @Test
    void should_generate_recurrent_transactions_for_the_given_month_and_year() throws Exception {
        mockMvc.perform(post("/api/transactions/generate-recurrents")
                .param("month", "10")
                .param("year", "2026"))
                .andExpect(status().isOk());

        verify(transactionService).generateRecurrentTransactions(10, 2026);
    }

    @ParameterizedTest
    @ValueSource(strings = { "/api/transactions/generate-recurrents",
            "/api/transactions/generate-recurrents?month=10",
            "/api/transactions/generate-recurrents?year=2026" })
    void should_return_400_when_month_or_year_is_missing(String url) throws Exception {
        mockMvc.perform(post(url))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(transactionService);
    }
}
