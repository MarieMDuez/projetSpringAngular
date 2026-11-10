package com.gestionCompte.apirest.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.gestionCompte.apirest.dto.AnalyticsDashboardDto;
import com.gestionCompte.apirest.dto.AnalyticsEvolutionDto;
import com.gestionCompte.apirest.dto.BalanceDashboardDto;
import com.gestionCompte.apirest.dto.MatrixDashboardDto;
import com.gestionCompte.apirest.dto.MatrixMonthlyDashboardDto;
import com.gestionCompte.apirest.dto.StartEndBalancesDto;
import com.gestionCompte.apirest.dto.SummaryDto;
import com.gestionCompte.apirest.exception.ErrorMessages;
import com.gestionCompte.apirest.exception.ResourceNotFoundException;
import com.gestionCompte.apirest.model.Account;
import com.gestionCompte.apirest.model.AccountType;
import com.gestionCompte.apirest.model.Category;
import com.gestionCompte.apirest.model.PaymentMethod;
import com.gestionCompte.apirest.model.Transaction;
import com.gestionCompte.apirest.model.TransactionType;
import com.gestionCompte.apirest.repository.AccountRepository;

/**
 * Tests unitaires de DashboardService.
 *
 * Ici, le service ne fait presque que des calculs à partir des transactions renvoyées par
 * TransactionService (mocké). Chaque test prépare donc une petite liste de transactions
 * dont on connaît le résultat, puis vérifie le calcul.
 *
 * Les dates sont toutes en septembre 2026 (sauf indication contraire) pour rester lisibles.
 */
@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private TransactionService transactionService;

    @Mock
    private ProjectedBudgetService projectedBudgetItemsService;

    @InjectMocks
    private DashboardService dashboardService;

    // ------------------------------------------------------------------
    // Méthodes utilitaires
    // ------------------------------------------------------------------

    private static LocalDate sept(int day) {
        return LocalDate.of(2026, 9, day);
    }

    private Account buildAccount(Long id, String label, String initialBalance, AccountType type, boolean active) {
        Account account = new Account();
        account.setId(id);
        account.setLabel(label);
        account.setInitialBalance(new BigDecimal(initialBalance));
        account.setType(type);
        account.setActive(active);
        return account;
    }

    private Category buildCategory(String label) {
        Category category = new Category();
        category.setLabel(label);
        return category;
    }

    private PaymentMethod buildPaymentMethod(String label) {
        PaymentMethod paymentMethod = new PaymentMethod();
        paymentMethod.setLabel(label);
        return paymentMethod;
    }

    /** Transaction avec la catégorie "Alimentation" et le moyen de paiement "Carte" par défaut. */
    private Transaction buildTransaction(TransactionType type, String amount, LocalDate date, boolean checked,
            Account account) {
        Transaction transaction = new Transaction();
        transaction.setType(type);
        transaction.setAmount(amount == null ? null : new BigDecimal(amount));
        transaction.setEmissionDate(date);
        transaction.setChecked(checked);
        transaction.setAccount(account);
        transaction.setCategory(buildCategory("Alimentation"));
        transaction.setPaymentMethod(buildPaymentMethod("Carte"));
        return transaction;
    }

    private Transaction debit(String amount, LocalDate date, boolean checked, Account account) {
        return buildTransaction(TransactionType.DEBIT, amount, date, checked, account);
    }

    private Transaction credit(String amount, LocalDate date, boolean checked, Account account) {
        return buildTransaction(TransactionType.CREDIT, amount, date, checked, account);
    }

    private static <T> T matchOrNull(T value) {
        return value == null ? ArgumentMatchers.<T>isNull() : eq(value);
    }

    /**
     * Programme TransactionService.getFilteredTransactions (13 paramètres) pour le jeu de filtres que le
     * DashboardService est censé lui transmettre. Si le service appelle avec d'autres filtres,
     * Mockito fait échouer le test : ça vérifie aussi que les filtres sont bien transmis.
     */
    private void stubFilteredTransactions(Long accountId, Integer month, Integer year, Boolean isChecked,
            AccountType accountType, List<Transaction> transactions) {
        when(transactionService.getFilteredTransactions(matchOrNull(accountId), isNull(), isNull(), isNull(),
                matchOrNull(month), matchOrNull(year), isNull(), isNull(), isNull(), matchOrNull(isChecked), isNull(),
                isNull(), matchOrNull(accountType))).thenReturn(transactions);
    }

    // ==================================================================
    // getDynamicBalance
    // ==================================================================

    @Test
    void should_calculate_current_and_projected_balance_for_a_specific_account() {
        Account account = buildAccount(1L, "Compte Courant", "1000.00", AccountType.COURANT, true);
        when(accountRepository.findById(1L)).thenReturn(Optional.of(account));
        stubFilteredTransactions(1L, null, null, null, null,
                List.of(credit("300.00", sept(16), false, account), debit("200.00", sept(15), true, account)));

        BalanceDashboardDto dto = dashboardService.getDynamicBalance(1L, null);

        assertThat(dto.getId()).isEqualTo(1L);
        assertThat(dto.getLabel()).isEqualTo("Vue Compte Unique");
        assertThat(dto.getInitialBalance()).isEqualByComparingTo("1000.00");
        // Solde actuel : seules les transactions pointées comptent (le crédit n'est pas pointé)
        assertThat(dto.getCurrentBalance()).isEqualByComparingTo("800.00");
        // Solde prévisionnel : toutes les transactions comptent
        assertThat(dto.getProjectedBalance()).isEqualByComparingTo("1100.00");
        assertThat(dto.getFirstNegativeDate()).isNull();
    }

    @Test
    void should_include_checked_credits_and_debits_in_current_balance() {
        Account account = buildAccount(1L, "Compte Courant", "1000.00", AccountType.COURANT, true);
        when(accountRepository.findById(1L)).thenReturn(Optional.of(account));
        stubFilteredTransactions(1L, null, null, null, null,
                List.of(credit("300.00", sept(16), true, account), debit("200.00", sept(15), true, account)));

        BalanceDashboardDto dto = dashboardService.getDynamicBalance(1L, null);

        assertThat(dto.getCurrentBalance()).isEqualByComparingTo("1100.00");
        assertThat(dto.getProjectedBalance()).isEqualByComparingTo("1100.00");
    }

    @Test
    void should_sum_initial_balances_of_active_accounts_when_no_filter_is_given() {
        Account account1 = buildAccount(1L, "Compte Courant", "1000.00", AccountType.COURANT, true);
        Account account2 = buildAccount(2L, "Livret A", "500.00", AccountType.EPARGNE, true);
        when(accountRepository.findByIsActiveTrue()).thenReturn(List.of(account1, account2));
        stubFilteredTransactions(null, null, null, null, null, List.of(debit("200.00", sept(15), true, account1)));

        BalanceDashboardDto dto = dashboardService.getDynamicBalance(null, null);

        assertThat(dto.getLabel()).isEqualTo("Vue Globale (Tous les comptes)");
        assertThat(dto.getInitialBalance()).isEqualByComparingTo("1500.00");
        assertThat(dto.getCurrentBalance()).isEqualByComparingTo("1300.00");
    }

    @Test
    void should_ignore_transactions_of_inactive_accounts_when_no_filter_is_given() {
        Account account1 = buildAccount(1L, "Compte Courant", "1000.00", AccountType.COURANT, true);
        Account inactiveAccount = buildAccount(3L, "Ancien compte", "999.00", AccountType.COURANT, false);
        when(accountRepository.findByIsActiveTrue()).thenReturn(List.of(account1));
        stubFilteredTransactions(null, null, null, null, null, List.of(
                credit("1000.00", sept(16), true, inactiveAccount), debit("200.00", sept(15), true, account1)));

        BalanceDashboardDto dto = dashboardService.getDynamicBalance(null, null);

        assertThat(dto.getInitialBalance()).isEqualByComparingTo("1000.00");
        assertThat(dto.getCurrentBalance()).isEqualByComparingTo("800.00");
        assertThat(dto.getProjectedBalance()).isEqualByComparingTo("800.00");
    }

    @Test
    void should_only_use_accounts_of_the_requested_type_when_an_account_type_is_given() {
        Account courant = buildAccount(1L, "Compte Courant", "1000.00", AccountType.COURANT, true);
        Account epargne = buildAccount(2L, "Livret A", "500.00", AccountType.EPARGNE, true);
        when(accountRepository.findByIsActiveTrue()).thenReturn(List.of(courant, epargne));
        stubFilteredTransactions(null, null, null, null, AccountType.COURANT, List.of(
                credit("100.00", sept(16), true, epargne), debit("200.00", sept(15), true, courant)));

        BalanceDashboardDto dto = dashboardService.getDynamicBalance(null, AccountType.COURANT);

        assertThat(dto.getLabel()).isEqualTo("Vue Filtrée : COURANT");
        assertThat(dto.getInitialBalance()).isEqualByComparingTo("1000.00");
        // La transaction du compte épargne est ignorée
        assertThat(dto.getCurrentBalance()).isEqualByComparingTo("800.00");
        assertThat(dto.getProjectedBalance()).isEqualByComparingTo("800.00");
    }

    @Test
    void should_throw_not_found_exception_when_account_does_not_exist() {
        when(accountRepository.findById(99L)).thenReturn(Optional.empty());

        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class, () -> {
        	dashboardService.getDynamicBalance(99L, null);
        });

        assertEquals(ErrorMessages.ACCOUNT_NOT_FOUND + 99L, exception.getMessage());
       
    }

    @Test
    void should_return_date_from_which_balance_stays_negative() {
        // Solde de départ 100 : le 1er il passe à -100, le 5 il remonte à +100, le 10 il repasse à -50.
        // La date attendue est donc le 10 (la dernière fois où le solde est passé sous zéro).
        Account account = buildAccount(1L, "Compte Courant", "100.00", AccountType.COURANT, true);
        when(accountRepository.findById(1L)).thenReturn(Optional.of(account));
        // Les transactions arrivent de la plus récente à la plus ancienne (comme TransactionService les renvoie)
        stubFilteredTransactions(1L, null, null, null, null, List.of(
                debit("150.00", sept(10), true, account),
                credit("200.00", sept(5), true, account),
                debit("200.00", sept(1), true, account)));

        BalanceDashboardDto dto = dashboardService.getDynamicBalance(1L, null);

        assertThat(dto.getProjectedBalance()).isEqualByComparingTo("-50.00");
        assertThat(dto.getFirstNegativeDate()).isEqualTo(sept(10));
    }

    @Test
    void should_keep_first_negative_date_when_balance_stays_negative() {
        Account account = buildAccount(1L, "Compte Courant", "100.00", AccountType.COURANT, true);
        when(accountRepository.findById(1L)).thenReturn(Optional.of(account));
        stubFilteredTransactions(1L, null, null, null, null, List.of(
                debit("50.00", sept(5), true, account),
                debit("300.00", sept(1), true, account)));

        BalanceDashboardDto dto = dashboardService.getDynamicBalance(1L, null);

        assertThat(dto.getProjectedBalance()).isEqualByComparingTo("-250.00");
        assertThat(dto.getFirstNegativeDate()).isEqualTo(sept(1));
    }

    @Test
    void should_return_no_negative_date_when_balance_is_exactly_zero() {
        Account account = buildAccount(1L, "Compte Courant", "100.00", AccountType.COURANT, true);
        when(accountRepository.findById(1L)).thenReturn(Optional.of(account));
        stubFilteredTransactions(1L, null, null, null, null, List.of(debit("100.00", sept(1), true, account)));

        BalanceDashboardDto dto = dashboardService.getDynamicBalance(1L, null);

        assertThat(dto.getProjectedBalance()).isEqualByComparingTo("0.00");
        assertThat(dto.getFirstNegativeDate()).isNull();
    }

    // ==================================================================
    // getHomeDashboardSummary
    // ==================================================================

    @Test
    void should_sum_all_active_accounts_and_keep_their_order_and_labels() {
        Account account1 = buildAccount(1L, "Compte Courant", "1000.00", AccountType.COURANT, true);
        Account account2 = buildAccount(2L, "Livret A", "500.00", AccountType.EPARGNE, true);
        when(accountRepository.findByIsActiveTrueOrderByPositionAsc()).thenReturn(List.of(account1, account2));
        when(accountRepository.findById(1L)).thenReturn(Optional.of(account1));
        when(accountRepository.findById(2L)).thenReturn(Optional.of(account2));
        stubFilteredTransactions(1L, null, null, null, null,
                List.of(credit("300.00", sept(16), false, account1), debit("200.00", sept(15), true, account1)));
        stubFilteredTransactions(2L, null, null, null, null, List.of());

        SummaryDto summary = dashboardService.getHomeDashboardSummary();

        assertThat(summary.getCurrentGlobalBalance()).isEqualByComparingTo("1300.00");
        assertThat(summary.getProjectedGlobalBalance()).isEqualByComparingTo("1600.00");
        assertThat(summary.getAccountsDetails()).extracting(BalanceDashboardDto::getId).containsExactly(1L, 2L);
        // Le libellé de chaque ligne est celui du compte (et non "Vue Compte Unique")
        assertThat(summary.getAccountsDetails()).extracting(BalanceDashboardDto::getLabel)
                .containsExactly("Compte Courant", "Livret A");
    }

    @Test
    void should_return_zero_totals_and_no_details_when_there_is_no_active_account() {
        when(accountRepository.findByIsActiveTrueOrderByPositionAsc()).thenReturn(List.of());

        SummaryDto summary = dashboardService.getHomeDashboardSummary();

        assertThat(summary.getCurrentGlobalBalance()).isEqualByComparingTo("0");
        assertThat(summary.getProjectedGlobalBalance()).isEqualByComparingTo("0");
        assertThat(summary.getAccountsDetails()).isEmpty();
    }

    // ==================================================================
    // getSpendDistribution
    // ==================================================================

    @Test
    void should_group_spend_by_category_and_payment_method_and_split_debits_from_credits() {
        Account account = buildAccount(1L, "Compte Courant", "1000.00", AccountType.COURANT, true);
        Transaction debit1 = debit("200.00", sept(15), true, account);
        Transaction debit2 = debit("50.00", sept(16), true, account);
        Transaction creditTx = credit("300.00", sept(17), true, account);
        creditTx.setPaymentMethod(buildPaymentMethod("Virement"));
        stubFilteredTransactions(1L, 9, 2026, true, AccountType.COURANT, List.of(debit1, debit2, creditTx));

        AnalyticsDashboardDto dto = dashboardService.getSpendDistribution(1L, 9, 2026, true, AccountType.COURANT);

        // Même catégorie, mais les débits et les crédits sont séparés
        assertThat(dto.getCategoryDistribution())
                .extracting(AnalyticsDashboardDto.DataGroupDto::getLabel,
                        AnalyticsDashboardDto.DataGroupDto::getTotal)
                .containsExactlyInAnyOrder(tuple("Alimentation", new BigDecimal("250.00")),
                        tuple("Alimentation", new BigDecimal("300.00")));
        assertThat(dto.getPaymentDistribution())
                .extracting(AnalyticsDashboardDto.DataGroupDto::getLabel,
                        AnalyticsDashboardDto.DataGroupDto::getTotal)
                .containsExactlyInAnyOrder(tuple("Carte", new BigDecimal("250.00")),
                        tuple("Virement", new BigDecimal("300.00")));
    }

    @Test
    void should_return_one_group_per_category_when_categories_differ() {
        Account account = buildAccount(1L, "Compte Courant", "1000.00", AccountType.COURANT, true);
        Transaction food = debit("200.00", sept(15), true, account);
        Transaction leisure = debit("80.00", sept(16), true, account);
        leisure.setCategory(buildCategory("Loisirs"));
        stubFilteredTransactions(null, 9, 2026, null, null, List.of(food, leisure));

        AnalyticsDashboardDto dto = dashboardService.getSpendDistribution(null, 9, 2026, null, null);

        assertThat(dto.getCategoryDistribution())
                .extracting(AnalyticsDashboardDto.DataGroupDto::getLabel,
                        AnalyticsDashboardDto.DataGroupDto::getTotal)
                .containsExactlyInAnyOrder(tuple("Alimentation", new BigDecimal("200.00")),
                        tuple("Loisirs", new BigDecimal("80.00")));
    }

    @Test
    void should_ignore_transactions_without_category_or_payment_method_label() {
        Account account = buildAccount(1L, "Compte Courant", "1000.00", AccountType.COURANT, true);
        Transaction noCategory = debit("200.00", sept(15), true, account);
        noCategory.setCategory(null);
        noCategory.setPaymentMethod(null);
        stubFilteredTransactions(null, 9, 2026, null, null, List.of(noCategory));

        AnalyticsDashboardDto dto = dashboardService.getSpendDistribution(null, 9, 2026, null, null);

        assertThat(dto.getCategoryDistribution()).isEmpty();
        assertThat(dto.getPaymentDistribution()).isEmpty();
    }

    @Test
    void should_return_empty_distributions_when_there_are_no_transactions() {
        stubFilteredTransactions(null, 9, 2026, null, null, List.of());

        AnalyticsDashboardDto dto = dashboardService.getSpendDistribution(null, 9, 2026, null, null);

        assertThat(dto.getCategoryDistribution()).isEmpty();
        assertThat(dto.getPaymentDistribution()).isEmpty();
    }

    // ==================================================================
    // getEvolutionDashboard
    // ==================================================================

    @Test
    void should_return_twelve_months_in_order_with_zero_amounts_when_there_are_no_transactions() {
        stubFilteredTransactions(null, null, 2026, null, null, List.of());

        AnalyticsEvolutionDto dto = dashboardService.getEvolutionDashboard(null, 2026, null, null);

        assertThat(dto.getGlobalEvolution()).extracting(AnalyticsEvolutionDto.MonthDataDto::getMonth)
                .containsExactly(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12);
        assertThat(dto.getGlobalEvolution()).allSatisfy(month -> {
            assertThat(month.getDebits()).isEqualByComparingTo("0");
            assertThat(month.getCredits()).isEqualByComparingTo("0");
        });
        assertThat(dto.getCategoryEvolution()).isEmpty();
        assertThat(dto.getPaymentMethodEvolution()).isEmpty();
    }

    @Test
    void should_accumulate_debits_and_credits_per_month() {
        Account account = buildAccount(1L, "Compte Courant", "1000.00", AccountType.COURANT, true);
        stubFilteredTransactions(1L, null, 2026, false, AccountType.COURANT, List.of(
                debit("200.00", sept(15), true, account),
                debit("50.00", sept(20), true, account),
                credit("300.00", sept(16), true, account),
                debit("10.00", LocalDate.of(2026, 10, 2), true, account)));

        AnalyticsEvolutionDto dto = dashboardService.getEvolutionDashboard(1L, 2026, false, AccountType.COURANT);

        // La liste est triée par mois : septembre est à l'index 8, octobre à l'index 9
        AnalyticsEvolutionDto.MonthDataDto september = dto.getGlobalEvolution().get(8);
        assertThat(september.getMonth()).isEqualTo(9);
        assertThat(september.getDebits()).isEqualByComparingTo("250.00");
        assertThat(september.getCredits()).isEqualByComparingTo("300.00");
        AnalyticsEvolutionDto.MonthDataDto october = dto.getGlobalEvolution().get(9);
        assertThat(october.getDebits()).isEqualByComparingTo("10.00");
        assertThat(october.getCredits()).isEqualByComparingTo("0");
    }

    @Test
    void should_skip_transactions_without_date_and_count_null_amounts_as_zero() {
        Account account = buildAccount(1L, "Compte Courant", "1000.00", AccountType.COURANT, true);
        Transaction noDate = debit("500.00", null, true, account);
        Transaction noAmount = debit(null, sept(15), true, account);
        stubFilteredTransactions(null, null, 2026, null, null, List.of(noDate, noAmount));

        AnalyticsEvolutionDto dto = dashboardService.getEvolutionDashboard(null, 2026, null, null);

        assertThat(dto.getGlobalEvolution().get(8).getDebits()).isEqualByComparingTo("0");
        assertThat(dto.getGlobalEvolution()).allSatisfy(month -> {
            assertThat(month.getDebits()).isEqualByComparingTo("0");
        });
    }

    @Test
    void should_build_one_evolution_entry_per_category_and_per_payment_method() {
        Account account = buildAccount(1L, "Compte Courant", "1000.00", AccountType.COURANT, true);
        Transaction food = debit("200.00", sept(15), true, account);
        Transaction leisure = credit("80.00", sept(16), true, account);
        leisure.setCategory(buildCategory("Loisirs"));
        leisure.setPaymentMethod(buildPaymentMethod("Virement"));
        stubFilteredTransactions(null, null, 2026, null, null, List.of(food, leisure));

        AnalyticsEvolutionDto dto = dashboardService.getEvolutionDashboard(null, 2026, null, null);

        assertThat(dto.getCategoryEvolution())
                .extracting(AnalyticsEvolutionDto.CategoryEvolutionDto::getCategoryLabel)
                .containsExactlyInAnyOrder("Alimentation", "Loisirs");
        assertThat(dto.getPaymentMethodEvolution())
                .extracting(AnalyticsEvolutionDto.PaymentMethodEvolutionDto::getPaymentMethodLabel)
                .containsExactlyInAnyOrder("Carte", "Virement");
    }

    @Test
    void should_count_transactions_without_category_in_global_evolution_only() {
        Account account = buildAccount(1L, "Compte Courant", "1000.00", AccountType.COURANT, true);
        Transaction noCategory = debit("200.00", sept(15), true, account);
        noCategory.setCategory(null);
        noCategory.setPaymentMethod(null);
        stubFilteredTransactions(null, null, 2026, null, null, List.of(noCategory));

        AnalyticsEvolutionDto dto = dashboardService.getEvolutionDashboard(null, 2026, null, null);

        assertThat(dto.getGlobalEvolution().get(8).getDebits()).isEqualByComparingTo("200.00");
        assertThat(dto.getCategoryEvolution()).isEmpty();
        assertThat(dto.getPaymentMethodEvolution()).isEmpty();
    }

    // ==================================================================
    // getAnnualMatrix
    //
    // NB : ces tests vérifient les totaux et les libellés des lignes. Les tableaux mois par mois
    // ne sont pas vérifiés pour l'instant (je n'ai pas vu les classes DTO).
    // ==================================================================

    @Test
    void should_compute_annual_totals_with_debits_negative_and_credits_positive() {
        Account account = buildAccount(1L, "Compte Courant", "1000.00", AccountType.COURANT, true);
        stubFilteredTransactions(null, null, 2026, null, null,
                List.of(credit("300.00", sept(16), false, account), debit("200.00", sept(15), true, account)));

        MatrixDashboardDto dto = dashboardService.getAnnualMatrix(null, 2026, null, null);

        assertThat(dto.getRows()).hasSize(1);
        assertThat(dto.getRows().get(0).getPaymentMethodLabel()).isEqualTo("Carte");
        assertThat(dto.getRows().get(0).getTotalYear()).isEqualByComparingTo("100.00");
        assertThat(dto.getGrandTotal()).isEqualByComparingTo("100.00");
    }

    @Test
    void should_return_negative_total_when_there_are_only_debits() {
        Account account = buildAccount(1L, "Compte Courant", "1000.00", AccountType.COURANT, true);
        stubFilteredTransactions(null, null, 2026, null, null, List.of(debit("200.00", sept(15), true, account)));

        MatrixDashboardDto dto = dashboardService.getAnnualMatrix(null, 2026, null, null);

        assertThat(dto.getRows().get(0).getTotalYear()).isEqualByComparingTo("-200.00");
        assertThat(dto.getGrandTotal()).isEqualByComparingTo("-200.00");
    }

    @Test
    void should_create_one_row_per_payment_method_and_sum_its_categories() {
        Account account = buildAccount(1L, "Compte Courant", "1000.00", AccountType.COURANT, true);
        Transaction food = debit("200.00", sept(15), true, account);
        Transaction leisure = debit("50.00", sept(16), true, account);
        leisure.setCategory(buildCategory("Loisirs"));
        Transaction transfer = credit("300.00", sept(17), true, account);
        transfer.setPaymentMethod(buildPaymentMethod("Virement"));
        stubFilteredTransactions(null, null, 2026, null, null, List.of(food, leisure, transfer));

        MatrixDashboardDto dto = dashboardService.getAnnualMatrix(null, 2026, null, null);

        assertThat(dto.getRows()).extracting(MatrixDashboardDto.PaymentMethodRowDto::getPaymentMethodLabel)
                .containsExactlyInAnyOrder("Carte", "Virement");
        BigDecimal carteTotal = dto.getRows().stream()
                .filter(row -> "Carte".equals(row.getPaymentMethodLabel()))
                .findFirst().orElseThrow().getTotalYear();
        assertThat(carteTotal).isEqualByComparingTo("-250.00");
        assertThat(dto.getGrandTotal()).isEqualByComparingTo("50.00");
    }

    @Test
    void should_use_default_label_when_transaction_has_no_payment_method() {
        Account account = buildAccount(1L, "Compte Courant", "1000.00", AccountType.COURANT, true);
        Transaction noPayment = debit("200.00", sept(15), true, account);
        noPayment.setPaymentMethod(null);
        stubFilteredTransactions(null, null, 2026, null, null, List.of(noPayment));

        MatrixDashboardDto dto = dashboardService.getAnnualMatrix(null, 2026, null, null);

        assertThat(dto.getRows()).extracting(MatrixDashboardDto.PaymentMethodRowDto::getPaymentMethodLabel)
                .containsExactly("Sans moyen de paiement");
    }

    @Test
    void should_still_count_transactions_without_category_in_annual_totals() {
        Account account = buildAccount(1L, "Compte Courant", "1000.00", AccountType.COURANT, true);
        Transaction noCategory = debit("200.00", sept(15), true, account);
        noCategory.setCategory(null);
        stubFilteredTransactions(null, null, 2026, null, null, List.of(noCategory));

        MatrixDashboardDto dto = dashboardService.getAnnualMatrix(null, 2026, null, null);

        assertThat(dto.getRows()).hasSize(1);
        assertThat(dto.getGrandTotal()).isEqualByComparingTo("-200.00");
    }

    @Test
    void should_skip_transactions_without_date_and_count_null_amounts_as_zero_in_annual_matrix() {
        Account account = buildAccount(1L, "Compte Courant", "1000.00", AccountType.COURANT, true);
        Transaction noDate = debit("500.00", null, true, account);
        Transaction noAmount = debit(null, sept(15), true, account);
        stubFilteredTransactions(null, null, 2026, null, null, List.of(noDate, noAmount));

        MatrixDashboardDto dto = dashboardService.getAnnualMatrix(null, 2026, null, null);

        assertThat(dto.getGrandTotal()).isEqualByComparingTo("0");
    }

    @Test
    void should_return_empty_annual_matrix_when_there_are_no_transactions() {
        stubFilteredTransactions(null, null, 2026, null, null, List.of());

        MatrixDashboardDto dto = dashboardService.getAnnualMatrix(null, 2026, null, null);

        assertThat(dto.getRows()).isEmpty();
        assertThat(dto.getGrandTotal()).isEqualByComparingTo("0");
    }

    // ==================================================================
    // getMonthlyMatrix
    //
    // Les semaines sont calculées avec le calendrier français (semaine du lundi, première semaine
    // = celle qui a au moins 4 jours dans le mois). Septembre 2026 compte 5 semaines :
    // 1-6, 7-13, 14-20, 21-27, 28-30.
    // ==================================================================

    @Test
    void should_compute_monthly_totals_with_debits_negative_and_credits_positive() {
        Account account = buildAccount(1L, "Compte Courant", "1000.00", AccountType.COURANT, true);
        stubFilteredTransactions(null, 9, 2026, null, null,
                List.of(credit("300.00", sept(16), false, account), debit("200.00", sept(15), true, account)));

        MatrixMonthlyDashboardDto dto = dashboardService.getMonthlyMatrix(null, 9, 2026, null, null);

        assertThat(dto.getRows()).hasSize(1);
        assertThat(dto.getRows().get(0).getPaymentMethodLabel()).isEqualTo("Carte");
        assertThat(dto.getRows().get(0).getTotalMonth()).isEqualByComparingTo("100.00");
        assertThat(dto.getGrandTotal()).isEqualByComparingTo("100.00");
    }

    @Test
    void should_count_transactions_from_first_and_last_day_of_the_month() {
        Account account = buildAccount(1L, "Compte Courant", "1000.00", AccountType.COURANT, true);
        stubFilteredTransactions(null, 9, 2026, null, null, List.of(
                debit("10.00", sept(30), true, account),
                debit("20.00", sept(1), true, account)));

        MatrixMonthlyDashboardDto dto = dashboardService.getMonthlyMatrix(null, 9, 2026, null, null);

        assertThat(dto.getGrandTotal()).isEqualByComparingTo("-30.00");
    }

    @Test
    void should_count_the_first_days_of_a_month_that_starts_before_the_first_full_week() {
        // Mai 2026 commence un vendredi : le 1er, le 2 et le 3 mai sont avant la première semaine
        // de 4 jours ("semaine 0"). Ils doivent quand même être comptés.
        Account account = buildAccount(1L, "Compte Courant", "1000.00", AccountType.COURANT, true);
        stubFilteredTransactions(null, 5, 2026, null, null, List.of(
                debit("10.00", LocalDate.of(2026, 5, 31), true, account),
                debit("20.00", LocalDate.of(2026, 5, 2), true, account)));

        MatrixMonthlyDashboardDto dto = dashboardService.getMonthlyMatrix(null, 5, 2026, null, null);

        assertThat(dto.getGrandTotal()).isEqualByComparingTo("-30.00");
    }

    @Test
    void should_sum_transactions_of_different_weeks_in_the_same_row() {
        Account account = buildAccount(1L, "Compte Courant", "1000.00", AccountType.COURANT, true);
        stubFilteredTransactions(null, 9, 2026, null, null, List.of(
                debit("40.00", sept(22), true, account),
                debit("60.00", sept(15), true, account)));

        MatrixMonthlyDashboardDto dto = dashboardService.getMonthlyMatrix(null, 9, 2026, null, null);

        assertThat(dto.getRows()).hasSize(1);
        assertThat(dto.getRows().get(0).getTotalMonth()).isEqualByComparingTo("-100.00");
    }

    @Test
    void should_skip_transactions_without_payment_method_or_category_in_monthly_matrix() {
        Account account = buildAccount(1L, "Compte Courant", "1000.00", AccountType.COURANT, true);
        Transaction noPayment = debit("200.00", sept(15), true, account);
        noPayment.setPaymentMethod(null);
        Transaction noCategory = debit("100.00", sept(16), true, account);
        noCategory.setCategory(null);
        stubFilteredTransactions(null, 9, 2026, null, null, List.of(noPayment, noCategory));

        MatrixMonthlyDashboardDto dto = dashboardService.getMonthlyMatrix(null, 9, 2026, null, null);

        assertThat(dto.getRows()).isEmpty();
        assertThat(dto.getGrandTotal()).isEqualByComparingTo("0");
    }

    @Test
    void should_return_empty_monthly_matrix_when_there_are_no_transactions() {
        stubFilteredTransactions(null, 9, 2026, null, null, List.of());

        MatrixMonthlyDashboardDto dto = dashboardService.getMonthlyMatrix(null, 9, 2026, null, null);

        assertThat(dto.getRows()).isEmpty();
        assertThat(dto.getGrandTotal()).isEqualByComparingTo("0");
    }

  
    // ==================================================================
    // getStartEndBalances
    // ==================================================================

    @Test
    void should_calculate_start_and_end_balances_of_the_month() {
        Account account = buildAccount(1L, "Compte Courant", "1000.00", AccountType.COURANT, true);
        when(accountRepository.findByIsActiveTrue()).thenReturn(List.of(account));
        stubFilteredTransactions(null, null, null, null, AccountType.COURANT, List.of(
                debit("200.00", LocalDate.of(2026, 8, 15), true, account),
                credit("300.00", sept(15), true, account)));

        StartEndBalancesDto dto = dashboardService.getStartEndBalances(null, 9, 2026, null, AccountType.COURANT);

        assertThat(dto.getStartBalance()).isEqualByComparingTo("800.00");
        assertThat(dto.getEndBalance()).isEqualByComparingTo("1100.00");
    }

    @Test
    void should_use_the_initial_balance_of_the_requested_account() {
        Account account = buildAccount(1L, "Compte Courant", "1000.00", AccountType.COURANT, true);
        when(accountRepository.findById(1L)).thenReturn(Optional.of(account));
        stubFilteredTransactions(1L, null, null, null, null, List.of(credit("300.00", sept(15), true, account)));

        StartEndBalancesDto dto = dashboardService.getStartEndBalances(1L, 9, 2026, null, null);

        assertThat(dto.getId()).isEqualTo(1L);
        assertThat(dto.getStartBalance()).isEqualByComparingTo("1000.00");
        assertThat(dto.getEndBalance()).isEqualByComparingTo("1300.00");
    }

    @Test
    void should_handle_transactions_on_the_boundaries_of_the_month() {
        Account account = buildAccount(1L, "Compte Courant", "1000.00", AccountType.COURANT, true);
        when(accountRepository.findById(1L)).thenReturn(Optional.of(account));
        stubFilteredTransactions(1L, null, null, null, null, List.of(
                debit("100.00", LocalDate.of(2026, 8, 31), true, account), // avant le mois : début ET fin
                credit("50.00", sept(1), true, account), // 1er jour : fin seulement
                debit("20.00", sept(30), true, account), // dernier jour : fin seulement
                credit("500.00", LocalDate.of(2026, 10, 1), true, account))); // après le mois : ignorée

        StartEndBalancesDto dto = dashboardService.getStartEndBalances(1L, 9, 2026, null, null);

        assertThat(dto.getStartBalance()).isEqualByComparingTo("900.00");
        assertThat(dto.getEndBalance()).isEqualByComparingTo("930.00");
    }

    @Test
    void should_ignore_transactions_of_inactive_accounts_in_start_end_balances() {
        Account account = buildAccount(1L, "Compte Courant", "1000.00", AccountType.COURANT, true);
        Account inactiveAccount = buildAccount(3L, "Ancien compte", "999.00", AccountType.COURANT, false);
        when(accountRepository.findByIsActiveTrue()).thenReturn(List.of(account));
        stubFilteredTransactions(null, null, null, null, null, List.of(
                credit("1000.00", sept(15), true, inactiveAccount),
                debit("200.00", sept(16), true, account)));

        StartEndBalancesDto dto = dashboardService.getStartEndBalances(null, 9, 2026, null, null);

        assertThat(dto.getStartBalance()).isEqualByComparingTo("1000.00");
        assertThat(dto.getEndBalance()).isEqualByComparingTo("800.00");
    }

    @Test
    void should_forward_the_is_checked_filter_to_the_transaction_service() {
        Account account = buildAccount(1L, "Compte Courant", "1000.00", AccountType.COURANT, true);
        when(accountRepository.findByIsActiveTrue()).thenReturn(List.of(account));
        // Si le service n'envoyait pas isChecked = true, ce programme (stub) ne correspondrait pas à l'appel
        stubFilteredTransactions(null, null, null, true, null, List.of(debit("200.00", sept(15), true, account)));

        StartEndBalancesDto dto = dashboardService.getStartEndBalances(null, 9, 2026, true, null);

        assertThat(dto.getEndBalance()).isEqualByComparingTo("800.00");
    }

    @Test
    void should_return_initial_balance_for_both_start_and_end_when_there_are_no_transactions() {
        Account account = buildAccount(1L, "Compte Courant", "1000.00", AccountType.COURANT, true);
        when(accountRepository.findByIsActiveTrue()).thenReturn(List.of(account));
        stubFilteredTransactions(null, null, null, null, null, List.of());

        StartEndBalancesDto dto = dashboardService.getStartEndBalances(null, 9, 2026, null, null);

        assertThat(dto.getStartBalance()).isEqualByComparingTo("1000.00");
        assertThat(dto.getEndBalance()).isEqualByComparingTo("1000.00");
    }

    @Test
    void should_throw_not_found_exception_when_account_does_not_exist_in_start_end_balances() {
        when(accountRepository.findById(99L)).thenReturn(Optional.empty());

        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class, () -> {
        	dashboardService.getStartEndBalances(99L, 9, 2026, null, null);
        });

        assertEquals(ErrorMessages.ACCOUNT_NOT_FOUND + 99L, exception.getMessage());
        
    }
}
