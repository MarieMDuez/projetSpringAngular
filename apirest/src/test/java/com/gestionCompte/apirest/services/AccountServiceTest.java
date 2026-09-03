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

    // =========================================================================
    // TESTS : SET DEFAULT ACCOUNT (La bascule intelligente)
    // =========================================================================

    @Test
    public void should_switch_defaults_when_setting_a_new_default_account() {
        // Given (Arrange)
        Account oldDefault = new Account();
        oldDefault.setId(1L);
        oldDefault.setLabel("Ancien par défaut");
        oldDefault.setDefault(true);

        Account newDefault = new Account();
        newDefault.setId(2L);
        newDefault.setLabel("Nouveau par défaut");
        newDefault.setDefault(false);

        // Simulation des appels repositories
        when(accountRepository.findById(2L)).thenReturn(Optional.of(newDefault));
        when(accountRepository.findByIsDefaultTrue()).thenReturn(Optional.of(oldDefault));
        when(accountRepository.save(any(Account.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When (Act)
        Account result = accountService.setDefaultAccount(2L);

        // Then (Assert)
        assertThat(result.isDefault()).isTrue(); // Le nouveau passe à true
        assertThat(oldDefault.isDefault()).isFalse(); // L'ancien est bien repassé à false !
        
        // On vérifie que les deux entités ont bien été persistées
        verify(accountRepository).save(oldDefault);
        verify(accountRepository).save(newDefault);
    }

    // =========================================================================
    // TESTS : DELETE ACCOUNT (Soft delete VS Hard delete)
    // =========================================================================

    @Test
    public void should_perform_soft_delete_and_return_false_if_transactions_exist() {
        // Given
        Account account = new Account();
        account.setId(42L);
        account.setActive(true);

        when(accountRepository.findById(42L)).thenReturn(Optional.of(account));
        // On simule que le compte contient des transactions
        when(transactionRepository.existsByAccountId(42L)).thenReturn(true);
        when(accountRepository.save(any(Account.class))).thenReturn(account);

        // When
        boolean isHardDeleted = accountService.deleteAccount(42L);

        // Then
        assertThat(isHardDeleted).isFalse(); // Votre code spécifie "return false;" si soft delete
        assertThat(account.isActive()).isFalse(); // Le flag d'archivage est bien tombé
        verify(accountRepository, times(1)).save(account);
        verify(accountRepository, never()).delete(any(Account.class));
    }

    @Test
    public void should_perform_hard_delete_and_return_true_if_no_transactions_exist() {
        // Given
        Account account = new Account();
        account.setId(77L);

        when(accountRepository.findById(77L)).thenReturn(Optional.of(account));
        // On simule qu'aucune transaction n'est rattachée
        when(transactionRepository.existsByAccountId(77L)).thenReturn(false);

        // When
        boolean isHardDeleted = accountService.deleteAccount(77L);

        // Then
        assertThat(isHardDeleted).isTrue(); // Votre code spécifie "return true;" si hard delete
        verify(accountRepository, times(1)).delete(account);
        verify(accountRepository, never()).save(any(Account.class));
    }

    // =========================================================================
    // TESTS : GESTION DES EXCECPTIONS (Robustesse)
    // =========================================================================

    @Test
    public void should_throw_404_not_found_when_account_id_does_not_exist() {
        when(accountRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> accountService.getAccountById(999L))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("Account not found with id");
    }
    
    @Test
    void should_throw_conflict_exception_when_account_label_already_exists_with_spaces() {
        // Given
        Account accountToCreate = new Account();
        accountToCreate.setLabel("   Mon   Compte  ");

        // On simule le fait que le repository trouve la version NETTOYÉE "Mon Compte"
        when(accountRepository.existsByLabelIgnoreCase("Mon Compte")).thenReturn(true);

        // When & Then
        assertThatThrownBy(() -> accountService.createAccount(accountToCreate))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("Ce nom existe déjà !");

        // On vérifie que la méthode de sauvegarde n'a JAMAIS été appelée
        verify(accountRepository, never()).save(any(Account.class));
    }

}
