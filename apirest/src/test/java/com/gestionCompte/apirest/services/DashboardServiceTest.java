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

import com.gestionCompte.apirest.dto.AnalyticsDashboardDto;
import com.gestionCompte.apirest.dto.AnalyticsEvolutionDto;
import com.gestionCompte.apirest.dto.BalanceDashboardDto;
import com.gestionCompte.apirest.dto.MatrixDashboardDto;
import com.gestionCompte.apirest.dto.MatrixMonthlyDashboardDto;
import com.gestionCompte.apirest.dto.SummaryDto;
import com.gestionCompte.apirest.model.Account;
import com.gestionCompte.apirest.model.Category;
import com.gestionCompte.apirest.model.PaymentMethod;
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
    private Category mockCategory;
    private PaymentMethod mockPaymentMethod;

    @BeforeEach
    void setUp() {
        mockAccount1 = new Account();
        mockAccount1.setId(1L);
        mockAccount1.setLabel("Compte Courant");
        mockAccount1.setInitialBalance(new BigDecimal("1000.00"));
        mockAccount1.setActive(true);
        mockAccount1.setPosition(0);

        mockAccount2 = new Account();
        mockAccount2.setId(2L);
        mockAccount2.setLabel("Livret A");
        mockAccount2.setInitialBalance(new BigDecimal("500.00"));
        mockAccount2.setActive(true);
        mockAccount2.setPosition(1);

        mockCategory = new Category();
        mockCategory.setId(10L);
        mockCategory.setLabel("Alimentation");

        mockPaymentMethod = new PaymentMethod();
        mockPaymentMethod.setId(20L);
        mockPaymentMethod.setLabel("Carte");

        debitTransaction = new Transaction();
        debitTransaction.setId(100L);
        debitTransaction.setType(TransactionType.DEBIT);
        debitTransaction.setAmount(new BigDecimal("200.00"));
        debitTransaction.setEmissionDate(LocalDate.of(2026, 9, 15));
        debitTransaction.setChecked(true);
        debitTransaction.setAccount(mockAccount1);
        debitTransaction.setCategory(mockCategory);
        debitTransaction.setPaymentMethod(mockPaymentMethod);

        creditTransaction = new Transaction();
        creditTransaction.setId(101L);
        creditTransaction.setType(TransactionType.CREDIT);
        creditTransaction.setAmount(new BigDecimal("300.00"));
        creditTransaction.setEmissionDate(LocalDate.of(2026, 9, 16));
        creditTransaction.setChecked(false);
        creditTransaction.setAccount(mockAccount1);
        creditTransaction.setCategory(mockCategory);
        creditTransaction.setPaymentMethod(mockPaymentMethod);
    }

    @Test
    void getDynamicBalance_WithSpecificAccount_ShouldCalculateCorrectly() {
        Long accountId = 1L;
        when(accountRepository.findById(accountId)).thenReturn(Optional.of(mockAccount1));
        
        when(transactionService.getFilteredTransactions(
                eq(accountId), isNull(), isNull(), isNull(), isNull(),
                isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), isNull()
        )).thenReturn(List.of(debitTransaction, creditTransaction));

        BalanceDashboardDto dto = dashboardService.getDynamicBalance(accountId);

        assertNotNull(dto);
        assertEquals(accountId, dto.getId());
        assertEquals("Vue Compte Unique", dto.getLabel());
        assertEquals(new BigDecimal("1000.00"), dto.getInitialBalance());
        assertEquals(new BigDecimal("800.00"), dto.getCurrentBalance());
        assertEquals(new BigDecimal("1100.00"), dto.getProjectedBalance());
    }

    @Test
    void getDynamicBalance_WithAllAccounts_ShouldSumInitialBalances() {
        when(accountRepository.findByIsActiveTrue()).thenReturn(List.of(mockAccount1, mockAccount2));
        
        when(transactionService.getFilteredTransactions(
                isNull(), isNull(), isNull(), isNull(), isNull(),
                isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), isNull()
        )).thenReturn(List.of(debitTransaction));

        BalanceDashboardDto dto = dashboardService.getDynamicBalance(null);

        assertNotNull(dto);
        assertNull(dto.getId());
        assertEquals("Vue Globale (Tous les comptes)", dto.getLabel());
        assertEquals(new BigDecimal("1500.00"), dto.getInitialBalance());
        assertEquals(new BigDecimal("1300.00"), dto.getCurrentBalance());
        assertEquals(new BigDecimal("1300.00"), dto.getProjectedBalance());
    }

    @Test
    void getDynamicBalance_AccountNotFound_ShouldThrowException() {
        Long unknownId = 99L;
        when(accountRepository.findById(unknownId)).thenReturn(Optional.empty());

        assertThrows(ResponseStatusException.class, () -> {
            dashboardService.getDynamicBalance(unknownId);
        });
    }
    
    @Test
    void getDynamicBalance_WithAllAccounts_ShouldIgnoreInactiveAccountTransactions() {
        Account inactiveAccount = new Account();
        inactiveAccount.setId(3L);
        inactiveAccount.setInitialBalance(new BigDecimal("999.00"));
        inactiveAccount.setActive(false);

        Transaction inactiveTransaction = new Transaction();
        inactiveTransaction.setType(TransactionType.CREDIT);
        inactiveTransaction.setAmount(new BigDecimal("1000.00"));
        inactiveTransaction.setChecked(true);
        inactiveTransaction.setAccount(inactiveAccount); 

        when(accountRepository.findByIsActiveTrue()).thenReturn(List.of(mockAccount1, mockAccount2));
        
        when(transactionService.getFilteredTransactions(
                isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), 
                isNull(), isNull(), isNull(), isNull()
        )).thenReturn(List.of(debitTransaction, inactiveTransaction));

        BalanceDashboardDto dto = dashboardService.getDynamicBalance(null);

        assertNotNull(dto);
        assertEquals(new BigDecimal("1500.00"), dto.getInitialBalance()); 
        assertEquals(new BigDecimal("1300.00"), dto.getCurrentBalance()); 
    }
    
    @Test
    void getHomeDashboardSummary_ShouldSumAllAccountsAndPreserveOrder() {
        when(accountRepository.findByIsActiveTrueOrderByPositionAsc()).thenReturn(List.of(mockAccount1, mockAccount2));

        when(accountRepository.findById(1L)).thenReturn(Optional.of(mockAccount1));
        when(accountRepository.findById(2L)).thenReturn(Optional.of(mockAccount2));
        
        when(transactionService.getFilteredTransactions(
                eq(1L), isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), 
                isNull(), isNull(), isNull(), isNull()
        )).thenReturn(List.of(debitTransaction, creditTransaction));

        when(transactionService.getFilteredTransactions(
                eq(2L), isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), 
                isNull(), isNull(), isNull(), isNull()
        )).thenReturn(List.of());

        SummaryDto summary = dashboardService.getHomeDashboardSummary();

        assertNotNull(summary);
        assertEquals(new BigDecimal("1300.00"), summary.getCurrentGlobalBalance());
        assertEquals(new BigDecimal("1600.00"), summary.getProjectedGlobalBalance());
        assertEquals(2, summary.getAccountsDetails().size());
        assertEquals(1L, summary.getAccountsDetails().get(0).getId());
        assertEquals(2L, summary.getAccountsDetails().get(1).getId());
    }
    @Test
    void getSpendDistribution_ShouldReturnCorrectDataGroups() {
        when(transactionService.getFilteredTransactions(
                eq(1L), isNull(), isNull(), isNull(), eq(9), eq(2026), 
                isNull(), isNull(), isNull(), eq(true), isNull(), isNull()
        )).thenReturn(List.of(debitTransaction));

        AnalyticsDashboardDto dto = dashboardService.getSpendDistribution(1L, 9, 2026, true);

        assertNotNull(dto);
        assertEquals(1, dto.getCategoryDistribution().size());
        assertEquals("Alimentation", dto.getCategoryDistribution().get(0).getLabel());
        assertEquals(new BigDecimal("200.00"), dto.getCategoryDistribution().get(0).getTotal());
        assertEquals(TransactionType.DEBIT, dto.getCategoryDistribution().get(0).getType());

        assertEquals(1, dto.getPaymentDistribution().size());
        assertEquals("Carte", dto.getPaymentDistribution().get(0).getLabel());
    }

    @Test
    void getEvolutionDashboard_ShouldPopulateGlobalAndSubMapsCorrectly() {
        when(transactionService.getFilteredTransactions(
                eq(1L), isNull(), isNull(), isNull(), isNull(), eq(2026), 
                isNull(), isNull(), isNull(), eq(false), isNull(), isNull()
        )).thenReturn(List.of(debitTransaction, creditTransaction));

        AnalyticsEvolutionDto dto = dashboardService.getEvolutionDashboard(1L, 2026, false);

        assertNotNull(dto);
        assertEquals(12, dto.getGlobalEvolution().size());
        
        AnalyticsEvolutionDto.MonthDataDto septemberData = dto.getGlobalEvolution().stream()
                .filter(m -> m.getMonth() == 9).findFirst().orElseThrow();
        assertEquals(new BigDecimal("200.00"), septemberData.getDebits());
        assertEquals(new BigDecimal("300.00"), septemberData.getCredits());

        assertEquals(1, dto.getCategoryEvolution().size());
        assertEquals("Alimentation", dto.getCategoryEvolution().get(0).getCategoryLabel());

        assertEquals(1, dto.getPaymentMethodEvolution().size());
        assertEquals("Carte", dto.getPaymentMethodEvolution().get(0).getPaymentMethodLabel());
    }

    @Test
    void getAnnualMatrix_ShouldComputeMatrixRowsAndTotalsCorrectly() {
        when(transactionService.getFilteredTransactions(
                isNull(), isNull(), isNull(), isNull(), isNull(), eq(2026), 
                isNull(), isNull(), isNull(), isNull(), isNull(), isNull()
        )).thenReturn(List.of(debitTransaction, creditTransaction));

        MatrixDashboardDto dto = dashboardService.getAnnualMatrix(null, 2026, null);

        assertNotNull(dto);
        assertEquals(1, dto.getRows().size());
        MatrixDashboardDto.PaymentMethodRowDto paymentRow = dto.getRows().get(0);
        assertEquals("Carte", paymentRow.getPaymentMethodLabel());
        assertEquals(new BigDecimal("100.00"), paymentRow.getTotalYear());

        assertEquals(new BigDecimal("100.00"), dto.getGrandTotal());
        assertEquals(12, dto.getMonthlyTotals().length);
    }

    @Test
    void getMonthlyMatrix_ShouldCalculateIntraMonthWeeksCorrectly() {
        when(transactionService.getFilteredTransactions(
                isNull(), isNull(), isNull(), isNull(), eq(9), eq(2026), 
                isNull(), isNull(), isNull(), isNull(), isNull(), isNull()
        )).thenReturn(List.of(debitTransaction, creditTransaction));

        MatrixMonthlyDashboardDto dto = dashboardService.getMonthlyMatrix(null, 9, 2026, null);

        assertNotNull(dto);
        assertEquals(5, dto.getMaxWeeksInMonth());
        assertEquals(1, dto.getRows().size());
        
        MatrixMonthlyDashboardDto.PaymentMethodRowDto paymentRow = dto.getRows().get(0);
        assertEquals("Carte", paymentRow.getPaymentMethodLabel());
        assertEquals(new BigDecimal("100.00"), paymentRow.getTotalMonth());
        assertEquals(new BigDecimal("100.00"), dto.getGrandTotal());
    }
}
