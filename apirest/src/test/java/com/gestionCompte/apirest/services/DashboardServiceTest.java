package com.gestionCompte.apirest.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import com.gestionCompte.apirest.dto.BalanceDashboardDto;
import com.gestionCompte.apirest.model.Account;
import com.gestionCompte.apirest.model.Transaction;
import com.gestionCompte.apirest.model.TransactionType;
import com.gestionCompte.apirest.repository.AccountRepository;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private TransactionService transactionService;

    @InjectMocks
    private DashboardService dashboardService;

    private Account mockAccount1;
    private Account mockAccount2;
    private Transaction debitTransaction;
    private Transaction creditTransaction;

    @BeforeEach
    void setUp() {
        mockAccount1 = new Account();
        mockAccount1.setId(1L);
        mockAccount1.setInitialBalance(new BigDecimal("1000.00"));
        mockAccount1.setActive(true);
        mockAccount1.setPosition(0);

        mockAccount2 = new Account();
        mockAccount2.setId(2L);
        mockAccount2.setInitialBalance(new BigDecimal("500.00"));
        mockAccount2.setActive(true);
        mockAccount2.setPosition(1);

        debitTransaction = new Transaction();
        debitTransaction.setType(TransactionType.DEBIT);
        debitTransaction.setAmount(new BigDecimal("200.00"));
        debitTransaction.setEmissionDate(LocalDate.now().minusDays(1));
        debitTransaction.setChecked(true);
        debitTransaction.setAccount(mockAccount1); 

        creditTransaction = new Transaction();
        creditTransaction.setType(TransactionType.CREDIT);
        creditTransaction.setAmount(new BigDecimal("300.00"));
        creditTransaction.setEmissionDate(LocalDate.now().plusDays(2));
        creditTransaction.setChecked(false);
        creditTransaction.setAccount(mockAccount1); 
    }

    @Test
    void getDynamicBalance_WithSpecificAccount_ShouldCalculateCorrectly() {
        // Given
        Long accountId = 1L;
        when(accountRepository.findById(accountId)).thenReturn(Optional.of(mockAccount1));
        
        // TYPAGE STRICT ALIGNÉ SUR TON CODE : Les 11 filtres + la limite sont à isNull()
        when(transactionService.getFilteredTransactions(
                eq(accountId), 
                isNull(Long.class),       // categoryId
                isNull(Long.class),       // paymentMethodId
                isNull(Integer.class),    // year
                isNull(Integer.class),    // month
                isNull(Integer.class),    // day
                isNull(BigDecimal.class), // minAmount
                isNull(BigDecimal.class), // maxAmount
                isNull(String.class),     // description / textSearch
                isNull(Boolean.class),    // isChecked
                isNull(Integer.class),    // recurrenceMonths
                isNull(Integer.class)     // limit vaut bien null dans ton code de production !
        )).thenReturn(List.of(debitTransaction, creditTransaction));

        // When
        BalanceDashboardDto dto = dashboardService.getDynamicBalance(accountId);

        // Then
        assertNotNull(dto);
        assertEquals(accountId, dto.getId());
        assertEquals("Vue Compte Unique", dto.getLabel());
        assertEquals(new BigDecimal("1000.00"), dto.getInitialBalance());
        assertEquals(new BigDecimal("800.00"), dto.getCurrentBalance());
        assertEquals(new BigDecimal("1100.00"), dto.getProvisionalBalance());
    }

    @Test
    void getDynamicBalance_WithAllAccounts_ShouldSumInitialBalances() {
        // Given
        when(accountRepository.findByIsActiveTrue()).thenReturn(List.of(mockAccount1, mockAccount2));
        
        // TYPAGE STRICT ALIGNÉ SUR TON CODE : L'accountId est à null, ainsi que TOUS les autres filtres
        when(transactionService.getFilteredTransactions(
                isNull(Long.class),       // accountId
                isNull(Long.class),       // categoryId
                isNull(Long.class),       // paymentMethodId
                isNull(Integer.class),    // year
                isNull(Integer.class),    // month
                isNull(Integer.class),    // day
                isNull(BigDecimal.class), // minAmount
                isNull(BigDecimal.class), // maxAmount
                isNull(String.class),     // description / textSearch
                isNull(Boolean.class),    // isChecked
                isNull(Integer.class),    // recurrenceMonths
                isNull(Integer.class)     // limit
        )).thenReturn(List.of(debitTransaction));

        // When
        BalanceDashboardDto dto = dashboardService.getDynamicBalance(null);

        // Then
        assertNotNull(dto);
        assertNull(dto.getId());
        assertEquals("Vue Globale (Tous les comptes)", dto.getLabel());
        assertEquals(new BigDecimal("1500.00"), dto.getInitialBalance());
        assertEquals(new BigDecimal("1300.00"), dto.getCurrentBalance());
    }

    @Test
    void getDynamicBalance_AccountNotFound_ShouldThrowException() {
        // Given
        Long unknownId = 99L;
        when(accountRepository.findById(unknownId)).thenReturn(Optional.empty());

        // When & Then
        assertThrows(ResponseStatusException.class, () -> {
            dashboardService.getDynamicBalance(unknownId);
        });
    }
    
    @Test
    void getDynamicBalance_WithAllAccounts_ShouldIgnoreInactiveAccountTransactions() {
        // Given : Un compte inactif avec une transaction
        Account inactiveAccount = new Account();
        inactiveAccount.setId(3L);
        inactiveAccount.setInitialBalance(new BigDecimal("999.00"));
        inactiveAccount.setActive(false); // 👈 ARCHIVÉ

        Transaction inactiveTransaction = new Transaction();
        inactiveTransaction.setType(TransactionType.CREDIT);
        inactiveTransaction.setAmount(new BigDecimal("1000.00"));
        inactiveTransaction.setChecked(true);
        inactiveTransaction.setAccount(inactiveAccount); // Rattaché au compte inactif

        // Le repository ne renvoie que les comptes actifs (le solde initial de 999.00 est ignoré)
        when(accountRepository.findByIsActiveTrue()).thenReturn(List.of(mockAccount1, mockAccount2));
        
        // Le service de transaction renvoie tout (y compris celle du compte archivé)
        when(transactionService.getFilteredTransactions(
                isNull(Long.class), isNull(Long.class), isNull(Long.class), isNull(Integer.class), 
                isNull(Integer.class), isNull(Integer.class), isNull(BigDecimal.class), isNull(BigDecimal.class), 
                isNull(String.class), isNull(Boolean.class), isNull(Integer.class), isNull(Integer.class)
        )).thenReturn(List.of(debitTransaction, inactiveTransaction));

        // When
        BalanceDashboardDto dto = dashboardService.getDynamicBalance(null);

        // Then
        assertNotNull(dto);
        assertEquals(new BigDecimal("1500.00"), dto.getInitialBalance()); // 1000 + 500 (le 999 est ignoré !)
        assertEquals(new BigDecimal("1300.00"), dto.getCurrentBalance()); // 1500 - 200 (les 1000 du compte inactif sont ignorés !)
    }
}