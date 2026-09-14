package com.gestionCompte.apirest.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import com.gestionCompte.apirest.model.Account;
import com.gestionCompte.apirest.repository.AccountRepository;
import com.gestionCompte.apirest.repository.TransactionRepository;

@ExtendWith(MockitoExtension.class)
public class AccountServiceTest {

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private TransactionRepository transactionRepository;

    @InjectMocks
    private AccountService accountService;


    @Test
    public void should_switch_defaults_when_setting_a_new_default_account() {
        Account oldDefault = new Account();
        oldDefault.setId(1L);
        oldDefault.setLabel("Ancien par défaut");
        oldDefault.setDefault(true);

        Account newDefault = new Account();
        newDefault.setId(2L);
        newDefault.setLabel("Nouveau par défaut");
        newDefault.setDefault(false);

        when(accountRepository.findById(2L)).thenReturn(Optional.of(newDefault));
        when(accountRepository.findByIsDefaultTrue()).thenReturn(Optional.of(oldDefault));
        when(accountRepository.save(any(Account.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Account result = accountService.setDefaultAccount(2L);

        assertThat(result.isDefault()).isTrue(); 
        assertThat(oldDefault.isDefault()).isFalse(); 
        
        verify(accountRepository).save(oldDefault);
        verify(accountRepository).save(newDefault);
    }


    @Test
    public void should_perform_soft_delete_and_return_false_if_transactions_exist() {
        // Given
        Account account = new Account();
        account.setId(42L);
        account.setActive(true);

        when(accountRepository.findById(42L)).thenReturn(Optional.of(account));
        when(transactionRepository.existsByAccountId(42L)).thenReturn(true);
        when(accountRepository.save(any(Account.class))).thenReturn(account);

        boolean isHardDeleted = accountService.deleteAccount(42L);

        assertThat(isHardDeleted).isFalse(); 
        assertThat(account.isActive()).isFalse(); 
        verify(accountRepository, times(1)).save(account);
        verify(accountRepository, never()).delete(any(Account.class));
    }

    @Test
    public void should_perform_hard_delete_and_return_true_if_no_transactions_exist() {
        // Given
        Account account = new Account();
        account.setId(77L);

        when(accountRepository.findById(77L)).thenReturn(Optional.of(account));
        when(transactionRepository.existsByAccountId(77L)).thenReturn(false);

        boolean isHardDeleted = accountService.deleteAccount(77L);

        assertThat(isHardDeleted).isTrue(); 
        verify(accountRepository, times(1)).delete(account);
        verify(accountRepository, never()).save(any(Account.class));
    }

    @Test
    public void should_throw_404_not_found_when_account_id_does_not_exist() {
        when(accountRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> accountService.getAccountById(999L))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("Account not found with id");
    }
    
    @Test
    void should_throw_conflict_exception_when_account_label_already_exists_with_spaces() {
        Account accountToCreate = new Account();
        accountToCreate.setLabel("   Mon   Compte  ");

        when(accountRepository.existsByLabelIgnoreCase("Mon Compte")).thenReturn(true);

        assertThatThrownBy(() -> accountService.createAccount(accountToCreate))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("Ce nom existe déjà !");

        verify(accountRepository, never()).save(any(Account.class));
    }

}
