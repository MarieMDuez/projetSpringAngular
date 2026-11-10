package com.gestionCompte.apirest.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.gestionCompte.apirest.exception.ErrorMessages;
import com.gestionCompte.apirest.exception.ResourceAlreadyExistsException;
import com.gestionCompte.apirest.exception.ResourceNotFoundException;
import com.gestionCompte.apirest.model.Account;
import com.gestionCompte.apirest.model.AccountType;
import com.gestionCompte.apirest.repository.AccountRepository;
import com.gestionCompte.apirest.repository.TransactionRepository;

@ExtendWith(MockitoExtension.class)
class AccountServiceTest {

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private TransactionRepository transactionRepository;

    @InjectMocks
    private AccountService accountService;


    private Account buildAccount(Long id, String label, boolean isDefault) {
        Account account = new Account();
        account.setId(id);
        account.setLabel(label);
        account.setDefault(isDefault);
        return account;
    }

    private void stubSaveReturnsArgument() {
        when(accountRepository.save(any(Account.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    // ------------------------------------------------------------------
    // getAllAccounts / getAccountById / getDefaultAccount
    // ------------------------------------------------------------------

    @Test
    void should_return_all_accounts_from_repository() {
        List<Account> accounts = List.of(buildAccount(1L, "Courant", true), buildAccount(2L, "Livret A", false));
        when(accountRepository.findAll()).thenReturn(accounts);

        List<Account> result = accountService.getAllAccounts();

        assertThat(result).containsExactlyElementsOf(accounts);
    }

    @Test
    void should_return_account_when_id_exists() {
        Account account = buildAccount(1L, "Courant", false);
        when(accountRepository.findById(1L)).thenReturn(Optional.of(account));

        Account result = accountService.getAccountById(1L);

        assertThat(result).isSameAs(account);
    }

    @Test
    void should_throw_resource_not_found_exception_when_account_id_does_not_exist() {
        // Given
        Long unknownId = 999L;
        when(accountRepository.findById(unknownId)).thenReturn(Optional.empty());

        // When & Then
        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class, () -> {
            accountService.getAccountById(unknownId);
        });

        // Vérification du message exact configuré dans ton ErrorMessages
        assertEquals(ErrorMessages.ACCOUNT_NOT_FOUND + unknownId, exception.getMessage());
    }


    @Test
    void should_return_default_account_when_one_exists() {
        Account defaultAccount = buildAccount(1L, "Courant", true);
        when(accountRepository.findByIsDefaultTrue()).thenReturn(Optional.of(defaultAccount));

        Optional<Account> result = accountService.getDefaultAccount();

        assertThat(result).containsSame(defaultAccount);
    }

    @Test
    void should_return_empty_when_no_default_account_exists() {
        when(accountRepository.findByIsDefaultTrue()).thenReturn(Optional.empty());

        assertThat(accountService.getDefaultAccount()).isEmpty();
    }

    // ------------------------------------------------------------------
    // createAccount
    // ------------------------------------------------------------------

    @Test
    void should_clean_label_and_save_when_creating_a_non_default_account() {
        Account toCreate = buildAccount(null, "   Livret    A  ", false);
        when(accountRepository.existsByLabelIgnoreCase("Livret A")).thenReturn(false);
        stubSaveReturnsArgument();

        Account result = accountService.createAccount(toCreate);

        assertThat(result.getLabel()).isEqualTo("Livret A");
        verify(accountRepository).save(toCreate);
        verify(accountRepository, never()).findByIsDefaultTrue();
    }

    @Test
    void should_throw_conflict_exception_when_account_label_already_exists_with_spaces() {
        // Given
        Account accountToCreate = buildAccount(null, "   Mon   Compte  ", false);
        when(accountRepository.existsByLabelIgnoreCase("Mon Compte")).thenReturn(true);

        // When & Then
        ResourceAlreadyExistsException exception = assertThrows(ResourceAlreadyExistsException.class, () -> {
            accountService.createAccount(accountToCreate);
        });

        // Vérification du message de doublon
        assertEquals(ErrorMessages.ACCOUNT_ALREADY_EXISTS, exception.getMessage());

        verify(accountRepository, never()).save(any(Account.class));
    }

    @Test
    void should_unset_previous_default_when_creating_a_new_default_account() {
        Account oldDefault = buildAccount(1L, "Ancien", true);
        Account toCreate = buildAccount(null, "Nouveau", true);
        when(accountRepository.existsByLabelIgnoreCase("Nouveau")).thenReturn(false);
        when(accountRepository.findByIsDefaultTrue()).thenReturn(Optional.of(oldDefault));
        stubSaveReturnsArgument();

        Account result = accountService.createAccount(toCreate);

        assertThat(result.isDefault()).isTrue();
        assertThat(oldDefault.isDefault()).isFalse();
        verify(accountRepository).save(oldDefault);
        verify(accountRepository).save(toCreate);
    }

    // ------------------------------------------------------------------
    // updateAccount
    // ------------------------------------------------------------------

    @Test
    void should_throw_resource_not_found_exception_when_updating_an_account_that_does_not_exist() {
        // Given
        Long unknownId = 999L;
        when(accountRepository.findById(unknownId)).thenReturn(Optional.empty());
        Account details = buildAccount(null, "Peu importe", false);

        // When & Then
        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class, () -> {
            accountService.updateAccount(unknownId, details);
        });

        assertEquals(ErrorMessages.ACCOUNT_NOT_FOUND + unknownId, exception.getMessage());
        verify(accountRepository, never()).save(any(Account.class));
    }


    
    @Test
    void should_throw_conflict_exception_when_updating_label_to_one_already_used_by_another_account() {
        // Given
        Account existing = buildAccount(1L, "Compte A", false);
        Account details = buildAccount(null, "Compte B", false);
        when(accountRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(accountRepository.existsByLabelIgnoreCase("Compte B")).thenReturn(true);

        // When & Then
        ResourceAlreadyExistsException exception = assertThrows(ResourceAlreadyExistsException.class, () -> {
            accountService.updateAccount(1L, details);
        });

        assertEquals(ErrorMessages.ACCOUNT_ALREADY_EXISTS, exception.getMessage());
        verify(accountRepository, never()).save(any(Account.class));
    }


    @Test
    void should_allow_update_when_only_label_case_changes() {
        Account existing = buildAccount(1L, "Compte", false);
        Account details = buildAccount(null, "COMPTE", false);
        when(accountRepository.findById(1L)).thenReturn(Optional.of(existing));
        stubSaveReturnsArgument();

        Account result = accountService.updateAccount(1L, details);

        assertThat(result.getLabel()).isEqualTo("COMPTE");
        verify(accountRepository, never()).existsByLabelIgnoreCase(any());
    }

    @Test
    void should_clean_label_when_updating_an_account() {
        Account existing = buildAccount(1L, "Ancien", false);
        Account details = buildAccount(null, "  Nouveau    nom ", false);
        when(accountRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(accountRepository.existsByLabelIgnoreCase("Nouveau nom")).thenReturn(false);
        stubSaveReturnsArgument();

        Account result = accountService.updateAccount(1L, details);

        assertThat(result.getLabel()).isEqualTo("Nouveau nom");
        verify(accountRepository).save(existing);
    }

    @Test
    void should_unset_previous_default_when_updating_an_account_to_default() {
        Account oldDefault = buildAccount(1L, "Ancien défaut", true);
        Account existing = buildAccount(2L, "Compte B", false);
        Account details = buildAccount(null, "Compte B", true);
        when(accountRepository.findById(2L)).thenReturn(Optional.of(existing));
        when(accountRepository.findByIsDefaultTrue()).thenReturn(Optional.of(oldDefault));
        stubSaveReturnsArgument();

        Account result = accountService.updateAccount(2L, details);

        assertThat(result.isDefault()).isTrue();
        assertThat(oldDefault.isDefault()).isFalse();
        verify(accountRepository).save(oldDefault);
        verify(accountRepository).save(existing);
    }

    @Test
    void should_not_touch_other_accounts_when_updating_the_account_that_is_already_default() {
        Account existing = buildAccount(1L, "Courant", true);
        Account details = buildAccount(null, "Courant", true);
        when(accountRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(accountRepository.findByIsDefaultTrue()).thenReturn(Optional.of(existing));
        stubSaveReturnsArgument();

        Account result = accountService.updateAccount(1L, details);

        assertThat(result.isDefault()).isTrue();
        verify(accountRepository).save(existing);
    }

    @Test
    void should_copy_type_and_initial_balance_when_updating_an_account() {

        AccountType[] types = AccountType.values();

        Account existing = buildAccount(1L, "Courant", false);
        existing.setType(types[0]);
        existing.setInitialBalance(new BigDecimal("100.00"));

        Account details = buildAccount(null, "Courant", false);
        details.setType(types[types.length - 1]);
        details.setInitialBalance(new BigDecimal("250.50"));

        when(accountRepository.findById(1L)).thenReturn(Optional.of(existing));
        stubSaveReturnsArgument();

        Account result = accountService.updateAccount(1L, details);

        assertThat(result.getType()).isEqualTo(details.getType());
        // isEqualByComparingTo compare la valeur, sans se soucier du nombre de décimales (250.5 = 250.50)
        assertThat(result.getInitialBalance()).isEqualByComparingTo("250.50");
    }

    // ------------------------------------------------------------------
    // setDefaultAccount
    // ------------------------------------------------------------------

    @Test
    void should_switch_defaults_when_setting_a_new_default_account() {
        Account oldDefault = buildAccount(1L, "Ancien par défaut", true);
        Account newDefault = buildAccount(2L, "Nouveau par défaut", false);
        when(accountRepository.findById(2L)).thenReturn(Optional.of(newDefault));
        when(accountRepository.findByIsDefaultTrue()).thenReturn(Optional.of(oldDefault));
        stubSaveReturnsArgument();

        Account result = accountService.setDefaultAccount(2L);

        assertThat(result.isDefault()).isTrue();
        assertThat(oldDefault.isDefault()).isFalse();
        verify(accountRepository).save(oldDefault);
        verify(accountRepository).save(newDefault);
    }

    @Test
    void should_throw_resource_not_found_exception_when_setting_default_on_an_account_that_does_not_exist() {
        when(accountRepository.findById(5L)).thenReturn(Optional.empty());
        
        // When & Then
        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class, () -> {
            accountService.setDefaultAccount(5L);
        });

        assertEquals(ErrorMessages.ACCOUNT_NOT_FOUND + 5L, exception.getMessage());


        verify(accountRepository, never()).save(any(Account.class));
    }

    @Test
    void should_keep_account_default_when_it_is_already_the_default_one() {
        Account account = buildAccount(1L, "Courant", true);
        when(accountRepository.findById(1L)).thenReturn(Optional.of(account));
        when(accountRepository.findByIsDefaultTrue()).thenReturn(Optional.of(account));
        stubSaveReturnsArgument();

        Account result = accountService.setDefaultAccount(1L);

        assertThat(result.isDefault()).isTrue();
        verify(accountRepository).save(account); // une seule sauvegarde
    }

    // ------------------------------------------------------------------
    // deleteAccount
    // ------------------------------------------------------------------

    @Test
    void should_perform_soft_delete_and_return_false_if_transactions_exist() {
        Account account = buildAccount(42L, "Courant", false);
        account.setActive(true);
        when(accountRepository.findById(42L)).thenReturn(Optional.of(account));
        when(transactionRepository.existsByAccountId(42L)).thenReturn(true);

        boolean deleted = accountService.deleteAccount(42L);

        assertThat(deleted).isFalse();
        assertThat(account.isActive()).isFalse();
        verify(accountRepository).save(account);
        verify(accountRepository, never()).delete(any(Account.class));
    }

    @Test
    void should_perform_hard_delete_and_return_true_if_no_transactions_exist() {
        Account account = buildAccount(77L, "Courant", false);
        when(accountRepository.findById(77L)).thenReturn(Optional.of(account));
        when(transactionRepository.existsByAccountId(77L)).thenReturn(false);

        boolean deleted = accountService.deleteAccount(77L);

        assertThat(deleted).isTrue();
        verify(accountRepository).delete(account);
        verify(accountRepository, never()).save(any(Account.class));
    }

    @Test
    void should_throw_not_found_exception_when_deleting_an_account_that_does_not_exist() {
        when(accountRepository.findById(999L)).thenReturn(Optional.empty());
        
        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class, () -> {
            accountService.deleteAccount(999L);
        });

        assertEquals(ErrorMessages.ACCOUNT_NOT_FOUND + 999L, exception.getMessage());

        verifyNoInteractions(transactionRepository);
        verify(accountRepository, never()).delete(any(Account.class));
    }

    // ------------------------------------------------------------------
    // setActiveAccount
    // ------------------------------------------------------------------

    @Test
    void should_reactivate_an_inactive_account() {
        Account account = buildAccount(3L, "Ancien compte", false);
        account.setActive(false);
        when(accountRepository.findById(3L)).thenReturn(Optional.of(account));
        stubSaveReturnsArgument();

        Account result = accountService.setActiveAccount(3L);

        assertThat(result.isActive()).isTrue();
        verify(accountRepository).save(account);
    }

    @Test
    void should_throw_not_found_exception_when_activating_an_account_that_does_not_exist() {
        when(accountRepository.findById(999L)).thenReturn(Optional.empty());

        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class, () -> {
            accountService.setActiveAccount(999L);
        });

        assertEquals(ErrorMessages.ACCOUNT_NOT_FOUND + 999L, exception.getMessage());

        verify(accountRepository, never()).save(any(Account.class));
    }

    // ------------------------------------------------------------------
    // saveAll
    // ------------------------------------------------------------------

    @Test
    void should_delegate_saveAll_to_repository() {
        List<Account> accounts = List.of(buildAccount(1L, "A", false), buildAccount(2L, "B", false));
        when(accountRepository.saveAll(accounts)).thenReturn(accounts);

        List<Account> result = accountService.saveAll(accounts);

        assertThat(result).containsExactlyElementsOf(accounts);
        verify(accountRepository).saveAll(accounts);
    }
}