package com.gestionCompte.apirest.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.gestionCompte.apirest.exception.ErrorMessages;
import com.gestionCompte.apirest.exception.ResourceAlreadyExistsException;
import com.gestionCompte.apirest.exception.ResourceNotFoundException;
import com.gestionCompte.apirest.model.Account;
import com.gestionCompte.apirest.model.AccountType;
import com.gestionCompte.apirest.services.AccountService;

/**
 * Tests de la couche HTTP de AccountController : URL, codes HTTP, JSON reçu et renvoyé,
 * transmission des arguments au service (mocké). La logique métier est testée dans AccountServiceTest.
 */
@WebMvcTest(AccountController.class)
class AccountControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AccountService accountService;

    private Account buildAccount(Long id, String label, boolean active, boolean isDefault) {
        Account account = new Account();
        account.setId(id);
        account.setLabel(label);
        account.setType(AccountType.COURANT);
        account.setInitialBalance(new BigDecimal("1000.00"));
        account.setActive(active);
        account.setDefault(isDefault);
        return account;
    }

    private static RuntimeException notFound(int id) {
        return new ResourceNotFoundException(ErrorMessages.ACCOUNT_NOT_FOUND + id);
    }

    private static RuntimeException conflict() {
        return new ResourceAlreadyExistsException(ErrorMessages.ACCOUNT_ALREADY_EXISTS);
    }

    // ------------------------------------------------------------------
    // Lecture
    // ------------------------------------------------------------------

    @Test
    void should_return_default_account_when_one_exists() throws Exception {
        when(accountService.getDefaultAccount()).thenReturn(Optional.of(buildAccount(1L, "Courant", true, true)));

        mockMvc.perform(get("/api/account/default"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.label").value("Courant"))
                .andExpect(jsonPath("$.isDefault").value(true));
    }

    @Test
    void should_return_204_when_there_is_no_default_account() throws Exception {
        when(accountService.getDefaultAccount()).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/account/default"))
                .andExpect(status().isNoContent());
    }

    @Test
    void should_return_all_accounts() throws Exception {
        when(accountService.getAllAccounts()).thenReturn(
                List.of(buildAccount(1L, "Courant", true, true), buildAccount(2L, "Livret A", false, false)));

        mockMvc.perform(get("/api/account"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].label").value("Courant"))
                // Le front Angular lit "isActive" et "isDefault" : ces noms font partie du contrat de l'API
                .andExpect(jsonPath("$[0].isActive").value(true))
                .andExpect(jsonPath("$[1].isActive").value(false))
                .andExpect(jsonPath("$[1].isDefault").value(false));
    }

    @Test
    void should_return_account_by_id() throws Exception {
        when(accountService.getAccountById(1L)).thenReturn(buildAccount(1L, "Courant", true, false));

        mockMvc.perform(get("/api/account/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.type").value("COURANT"))
                .andExpect(jsonPath("$.initialBalance").value(1000.0));
    }

    @Test
    void should_return_404_when_account_does_not_exist() throws Exception {
        when(accountService.getAccountById(99L)).thenThrow(notFound(99));

        mockMvc.perform(get("/api/account/99"))
                .andExpect(status().isNotFound());
    }

    @Test
    void should_return_400_when_id_is_not_a_number() throws Exception {
        mockMvc.perform(get("/api/account/abc"))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(accountService);
    }

    // ------------------------------------------------------------------
    // Création
    // ------------------------------------------------------------------

    @Test
    void should_create_account_and_return_201() throws Exception {
        when(accountService.createAccount(any(Account.class))).thenReturn(buildAccount(5L, "Courant", true, true));

        mockMvc.perform(post("/api/account")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"label": "Courant", "type": "COURANT", "initialBalance": 1000.00,
                         "isActive": true, "isDefault": true}
                        """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(5));

        ArgumentCaptor<Account> captor = ArgumentCaptor.forClass(Account.class);
        verify(accountService).createAccount(captor.capture());
        assertThat(captor.getValue().getLabel()).isEqualTo("Courant");
        assertThat(captor.getValue().getType()).isEqualTo(AccountType.COURANT);
        assertThat(captor.getValue().getInitialBalance()).isEqualByComparingTo("1000.00");
        // Le JSON envoyé par le front utilise "isDefault" : on vérifie qu'il est bien lu
        assertThat(captor.getValue().isDefault()).isTrue();
    }

    @Test
    void should_return_409_when_creating_an_account_whose_name_already_exists() throws Exception {
        when(accountService.createAccount(any(Account.class))).thenThrow(conflict());

        mockMvc.perform(post("/api/account")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"label\": \"Courant\", \"type\": \"COURANT\", \"initialBalance\": 10}"))
                .andExpect(status().isConflict());
    }

    @Test
    void should_return_400_and_not_call_the_service_when_json_is_malformed() throws Exception {
        mockMvc.perform(post("/api/account")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"label\": "))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(accountService);
    }

    @Test
    void should_return_400_when_account_type_is_unknown() throws Exception {
        mockMvc.perform(post("/api/account")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"label\": \"Courant\", \"type\": \"INCONNU\", \"initialBalance\": 10}"))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(accountService);
    }

    @Test
    @SuppressWarnings("unchecked")
    void should_save_all_accounts_and_return_them() throws Exception {
        when(accountService.saveAll(any())).thenReturn(
                List.of(buildAccount(1L, "A", true, false), buildAccount(2L, "B", true, false)));

        mockMvc.perform(post("/api/account/saveAll")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        [{"id": 1, "label": "A", "position": 0}, {"id": 2, "label": "B", "position": 1}]
                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));

        ArgumentCaptor<List<Account>> captor = ArgumentCaptor.forClass(List.class);
        verify(accountService).saveAll(captor.capture());
        assertThat(captor.getValue()).extracting(Account::getLabel, Account::getPosition)
                .containsExactly(tuple("A", 0), tuple("B", 1));
    }

    // ------------------------------------------------------------------
    // Modification, compte par défaut, suppression, réactivation
    // ------------------------------------------------------------------

    @Test
    void should_update_account() throws Exception {
        when(accountService.updateAccount(eq(5L), any(Account.class)))
                .thenReturn(buildAccount(5L, "Nouveau nom", true, false));

        mockMvc.perform(put("/api/account/5")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"label\": \"Nouveau nom\", \"type\": \"COURANT\", \"initialBalance\": 10}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.label").value("Nouveau nom"));

        ArgumentCaptor<Account> captor = ArgumentCaptor.forClass(Account.class);
        verify(accountService).updateAccount(eq(5L), captor.capture());
        assertThat(captor.getValue().getLabel()).isEqualTo("Nouveau nom");
    }

    @Test
    void should_return_404_when_updating_an_account_that_does_not_exist() throws Exception {
        when(accountService.updateAccount(eq(99L), any(Account.class))).thenThrow(notFound(99));

        mockMvc.perform(put("/api/account/99")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"label\": \"Peu importe\", \"type\": \"COURANT\", \"initialBalance\": 10}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void should_set_account_as_default() throws Exception {
        when(accountService.setDefaultAccount(5L)).thenReturn(buildAccount(5L, "Courant", true, true));

        mockMvc.perform(put("/api/account/5/set-default"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isDefault").value(true));
    }

    @Test
    void should_return_404_when_setting_default_on_an_account_that_does_not_exist() throws Exception {
        when(accountService.setDefaultAccount(99L)).thenThrow(notFound(99));

        mockMvc.perform(put("/api/account/99/set-default"))
                .andExpect(status().isNotFound());
    }

    @Test
    void should_return_true_when_account_is_hard_deleted() throws Exception {
        when(accountService.deleteAccount(5L)).thenReturn(true);

        mockMvc.perform(delete("/api/account/5"))
                .andExpect(status().isOk())
                .andExpect(content().string("true"));
    }

    @Test
    void should_return_false_when_account_is_only_deactivated() throws Exception {
        when(accountService.deleteAccount(5L)).thenReturn(false);

        mockMvc.perform(delete("/api/account/5"))
                .andExpect(status().isOk())
                .andExpect(content().string("false"));
    }

    @Test
    void should_return_404_when_deleting_an_account_that_does_not_exist() throws Exception {
        when(accountService.deleteAccount(99L)).thenThrow(notFound(99));

        mockMvc.perform(delete("/api/account/99"))
                .andExpect(status().isNotFound());
    }

    @Test
    void should_reactivate_account() throws Exception {
        when(accountService.setActiveAccount(5L)).thenReturn(buildAccount(5L, "Courant", true, false));

        mockMvc.perform(put("/api/account/5/set-active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isActive").value(true));
    }

    @Test
    void should_return_404_when_reactivating_an_account_that_does_not_exist() throws Exception {
        when(accountService.setActiveAccount(99L)).thenThrow(notFound(99));

        mockMvc.perform(put("/api/account/99/set-active"))
                .andExpect(status().isNotFound());
    }
}
