package com.gestionCompte.apirest.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import com.gestionCompte.apirest.exception.ErrorMessages;
import com.gestionCompte.apirest.exception.ResourceBadRequestException;
import com.gestionCompte.apirest.exception.ResourceNotFoundException;
import com.gestionCompte.apirest.model.Account;
import com.gestionCompte.apirest.model.Category;
import com.gestionCompte.apirest.model.PaymentMethod;
import com.gestionCompte.apirest.model.Transaction;
import com.gestionCompte.apirest.model.TransactionType;
import com.gestionCompte.apirest.repository.TransactionRepository;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Root;


@ExtendWith(MockitoExtension.class)
class TransactionServiceTest {

    @Mock
    private TransactionRepository transactionRepository;

    @InjectMocks
    private TransactionService transactionService;

    @Mock
    private Root<Transaction> root;

    @Mock
    private CriteriaQuery<?> query;

    @Mock
    private CriteriaBuilder criteriaBuilder;

    @Captor
    private ArgumentCaptor<Specification<Transaction>> specCaptor;

    @Captor
    private ArgumentCaptor<Pageable> pageableCaptor;

    @Captor
    private ArgumentCaptor<Transaction> transactionCaptor;

    // ------------------------------------------------------------------
    // Méthodes utilitaires
    // ------------------------------------------------------------------

    private Transaction buildTransaction(Long id) {
        Transaction transaction = new Transaction();
        transaction.setId(id);
        transaction.setAmount(new BigDecimal("50.00"));
        transaction.setType(TransactionType.DEBIT);
        transaction.setDescription("Abonnement");
        return transaction;
    }

    /** Transaction récurrente complète, avec compte, catégorie et moyen de paiement actifs (par défaut). */
    private Transaction buildRecurrentTransaction(Long id, LocalDate emissionDate, int recurrenceMonths) {
        Transaction transaction = buildTransaction(id);
        transaction.setAmount(new BigDecimal("42.00"));
        transaction.setEmissionDate(emissionDate);
        transaction.setRecurrenceMonths(recurrenceMonths);
        transaction.setAccount(new Account());
        transaction.setCategory(new Category());
        transaction.setPaymentMethod(new PaymentMethod());
        return transaction;
    }


    /** Matcher Mockito "n'importe quelle Specification". */
    private static Specification<Transaction> anySpec() {
        return ArgumentMatchers.<Specification<Transaction>>any();
    }

    /**
     * Appelle getFilteredTransactions en ne renseignant que les paramètres utiles au test
     * (la méthode en a 13 : ce helper évite de remplir des "null" partout).
     */
    private List<Transaction> filter(Integer day, Integer month, Integer year, BigDecimal minAmount,
            BigDecimal maxAmount, String type, Integer limit) {
        return transactionService.getFilteredTransactions(null, null, null, day, month, year, minAmount, maxAmount,
                type, null, null, limit, null);
    }

    private void executeCapturedSpecification() {
        verify(transactionRepository).findAll(specCaptor.capture());
        specCaptor.getValue().toPredicate(root, query, criteriaBuilder);
    }

    // ==================================================================
    // 1. Méthodes simples
    // ==================================================================

    @Test
    void should_return_all_transactions_from_repository() {
        List<Transaction> transactions = List.of(buildTransaction(1L), buildTransaction(2L));
        when(transactionRepository.findAll()).thenReturn(transactions);

        List<Transaction> result = transactionService.getAllTransactions();

        assertThat(result).containsExactlyElementsOf(transactions);
    }

    @Test
    void should_return_transaction_when_id_exists() {
        Transaction transaction = buildTransaction(1L);
        when(transactionRepository.findById(1L)).thenReturn(Optional.of(transaction));

        Transaction result = transactionService.getTransactionById(1L);

        assertThat(result).isSameAs(transaction);
    }

    @Test
    void should_throw_not_found_exception_when_transaction_id_does_not_exist() {
        when(transactionRepository.findById(999L)).thenReturn(Optional.empty());

        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class, () -> {
        	transactionService.getTransactionById(999L);
        });

        assertEquals(ErrorMessages.TRANSACTION_NOT_FOUND + 999L, exception.getMessage());
        
    }

    @Test
    void should_return_unique_recurrence_months_from_repository() {
        when(transactionRepository.findDistinctRecurrenceMonths()).thenReturn(List.of(1, 3, 12));

        assertThat(transactionService.getUniqueRecurrenceMonths()).containsExactly(1, 3, 12);
    }

    @Test
    void should_save_transaction_when_creating() {
        Transaction toCreate = buildTransaction(null);
        when(transactionRepository.save(toCreate)).thenReturn(toCreate);

        Transaction result = transactionService.createTransaction(toCreate);

        assertThat(result).isSameAs(toCreate);
        verify(transactionRepository).save(toCreate);
    }

    @Test
    void should_throw_not_found_exception_when_updating_a_transaction_that_does_not_exist() {
        when(transactionRepository.findById(999L)).thenReturn(Optional.empty());
        Transaction details = buildTransaction(null);
        
        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class, () -> {
        	transactionService.updateTransaction(999L, details);
        });

        assertEquals(ErrorMessages.TRANSACTION_NOT_FOUND + 999L, exception.getMessage());
        verify(transactionRepository, never()).save(any(Transaction.class));
    }

    @Test
    void should_update_all_transaction_fields_accurately_when_updating() {
        Transaction existing = new Transaction();
        existing.setId(1L);
        existing.setDescription("Ancien libellé");
        existing.setChecked(false);
        existing.setParentTransactionId(7L);

        Account account = new Account();
        Category category = new Category();
        PaymentMethod paymentMethod = new PaymentMethod();

        Transaction details = new Transaction();
        details.setDescription("Nouveau libellé");
        details.setAmount(new BigDecimal("120.50"));
        details.setEmissionDate(LocalDate.of(2026, 3, 15));
        details.setType(TransactionType.CREDIT);
        details.setChecked(true);
        details.setRecurrenceMonths(3);
        details.setAlertTriggered(true);
        details.setAccount(account);
        details.setCategory(category);
        details.setPaymentMethod(paymentMethod);

        when(transactionRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(transactionRepository.save(existing)).thenReturn(existing);

        Transaction result = transactionService.updateTransaction(1L, details);

        assertThat(result.getDescription()).isEqualTo("Nouveau libellé");
        assertThat(result.getAmount()).isEqualByComparingTo("120.50");
        assertThat(result.getEmissionDate()).isEqualTo(LocalDate.of(2026, 3, 15));
        assertThat(result.getType()).isEqualTo(TransactionType.CREDIT);
        assertThat(result.isChecked()).isTrue();
        assertThat(result.getRecurrenceMonths()).isEqualTo(3);
        assertThat(result.isAlertTriggered()).isTrue();
        assertThat(result.getAccount()).isSameAs(account);
        assertThat(result.getCategory()).isSameAs(category);
        assertThat(result.getPaymentMethod()).isSameAs(paymentMethod);
        assertThat(result.getParentTransactionId()).isEqualTo(7L);
        verify(transactionRepository).save(existing);
    }

    @Test
    void should_delete_transaction_successfully_if_id_exists() {
        when(transactionRepository.existsById(55L)).thenReturn(true);

        transactionService.deleteTransaction(55L);

        verify(transactionRepository).deleteById(55L);
    }

    @Test
    void should_throw_404_not_found_when_deleting_non_existent_transaction() {
        when(transactionRepository.existsById(999L)).thenReturn(false);
        
        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class, () -> {
        	transactionService.deleteTransaction(999L);
        });

        assertEquals(ErrorMessages.TRANSACTION_NOT_FOUND + 999L, exception.getMessage());

        verify(transactionRepository, never()).deleteById(any());
    }

    // ==================================================================
    // 2. getFilteredTransactions : limite et pagination
    //
    // IMPORTANT : le repository est un faux (mock). Il renvoie toujours ce qu'on lui a
    // programmé, quels que soient les filtres. Ces tests vérifient donc ce que fait le SERVICE
    // (pagination ou non), pas le fonctionnement des filtres eux-mêmes (voir partie 3).
    // ==================================================================

    @Test
    void should_use_paged_query_with_limit_as_page_size_when_limit_is_positive() {
        Page<Transaction> page = new PageImpl<>(List.of(buildTransaction(100L)));
        when(transactionRepository.findAll(anySpec(), ArgumentMatchers.isA(Pageable.class))).thenReturn(page);

        List<Transaction> result = filter(null, null, null, null, null, null, 50);

        assertThat(result).extracting(Transaction::getId).containsExactly(100L);
        verify(transactionRepository).findAll(anySpec(), pageableCaptor.capture());
        assertThat(pageableCaptor.getValue().getPageNumber()).isZero();
        assertThat(pageableCaptor.getValue().getPageSize()).isEqualTo(50);
        verify(transactionRepository, never()).findAll(anySpec());
    }

    @Test
    void should_use_non_paged_query_when_limit_is_null() {
        List<Transaction> transactions = List.of(buildTransaction(1L), buildTransaction(2L));
        when(transactionRepository.findAll(anySpec())).thenReturn(transactions);

        List<Transaction> result = filter(null, null, null, null, null, null, null);

        assertThat(result).containsExactlyElementsOf(transactions);
        verify(transactionRepository, never()).findAll(anySpec(), ArgumentMatchers.isA(Pageable.class));
    }

    @ParameterizedTest
    @ValueSource(ints = { 0, -1 })
    void should_ignore_limit_when_it_is_zero_or_negative(int limit) {
        List<Transaction> transactions = List.of(buildTransaction(1L));
        when(transactionRepository.findAll(anySpec())).thenReturn(transactions);

        List<Transaction> result = filter(null, null, null, null, null, null, limit);

        assertThat(result).containsExactlyElementsOf(transactions);
        verify(transactionRepository, never()).findAll(anySpec(), ArgumentMatchers.isA(Pageable.class));
    }

    // ==================================================================
    // 3. getFilteredTransactions : contenu de la Specification
    //
    // La Specification est une fonction que le service construit puis donne au repository.
    // Avec un repository mocké, elle n'est jamais exécutée. Ici, on la récupère (captor)
    // et on l'exécute nous-mêmes avec de faux objets JPA Criteria, pour vérifier ce
    // qu'elle demande à la base. Pour tester les filtres "pour de vrai", il faudrait
    // un test avec une base H2 (@DataJpaTest) : c'est un autre type de test.
    // ==================================================================

    @Test
    void should_throw_resource_bad_request_exception_when_filter_type_is_invalid() {
        // Given
        filter(null, null, null, null, null, "INVALIDE", null);
        verify(transactionRepository).findAll(specCaptor.capture());
        
        var specification = specCaptor.getValue();
        
        // When & Then
        ResourceBadRequestException exception = assertThrows(ResourceBadRequestException.class, () -> {
            specification.toPredicate(root, query, criteriaBuilder);
        });

        assertEquals(ErrorMessages.TRANSACTION_BAD_REQUEST + "INVALIDE", exception.getMessage());
    }


    @Test
    void should_accept_filter_type_regardless_of_case_and_spaces() {
        filter(null, null, null, null, null, "  debit ", null);

        executeCapturedSpecification();

        verify(criteriaBuilder).equal(any(), eq(TransactionType.DEBIT));
    }

    @Test
    void should_filter_on_a_single_day_when_day_month_and_year_are_given() {
        filter(15, 3, 2025, null, null, null, null);

        executeCapturedSpecification();

        verify(criteriaBuilder).between(any(), eq(LocalDate.of(2025, 3, 15)), eq(LocalDate.of(2025, 3, 15)));
    }

    @Test
    void should_filter_on_the_whole_month_when_only_month_and_year_are_given() {
        filter(null, 3, 2025, null, null, null, null);

        executeCapturedSpecification();

        verify(criteriaBuilder).between(any(), eq(LocalDate.of(2025, 3, 1)), eq(LocalDate.of(2025, 3, 31)));
    }

    @Test
    void should_end_the_month_on_the_29th_for_february_of_a_leap_year() {
        filter(null, 2, 2024, null, null, null, null);

        executeCapturedSpecification();

        verify(criteriaBuilder).between(any(), eq(LocalDate.of(2024, 2, 1)), eq(LocalDate.of(2024, 2, 29)));
    }

    @Test
    void should_filter_on_the_whole_year_when_only_year_is_given() {
        filter(null, null, 2025, null, null, null, null);

        executeCapturedSpecification();

        verify(criteriaBuilder).between(any(), eq(LocalDate.of(2025, 1, 1)), eq(LocalDate.of(2025, 12, 31)));
    }

    @Test
    void should_use_current_year_when_only_month_is_given() {
        int currentYear = LocalDate.now().getYear();

        filter(null, 3, null, null, null, null, null);

        executeCapturedSpecification();

        verify(criteriaBuilder).between(any(), eq(LocalDate.of(currentYear, 3, 1)),
                eq(LocalDate.of(currentYear, 3, 31)));
    }

    @Test
    void should_filter_on_amount_range_when_min_and_max_are_given() {
        BigDecimal min = new BigDecimal("10.00");
        BigDecimal max = new BigDecimal("100.00");

        filter(null, null, null, min, max, null, null);

        executeCapturedSpecification();

        verify(criteriaBuilder).between(any(), eq(min), eq(max));
    }

    @Test
    void should_ignore_amount_filter_when_only_min_is_given() {
        // Ce test documente le comportement actuel : le filtre de montant n'est appliqué
        // que si minAmount ET maxAmount sont renseignés.
        filter(null, null, null, new BigDecimal("10.00"), null, null, null);

        executeCapturedSpecification();

        verify(criteriaBuilder, never()).between(any(), any(BigDecimal.class), any(BigDecimal.class));
    }

    // ==================================================================
    // 4. generateRecurrentTransactions
    //
    // Règle : une transaction récurrente (tous les N mois) génère une copie le mois cible
    // si son mois d'émission est exactement "mois cible - N".
    // ==================================================================

    /** Vérifie qu'une copie est créée à la date attendue, rattachée à la transaction parente. */
    private void assertGeneratesTransactionOn(Transaction parent, int targetMonth, int targetYear,
            LocalDate expectedDate) {
        when(transactionRepository.findByRecurrenceMonthsGreaterThan(0)).thenReturn(List.of(parent));
        when(transactionRepository.existsByParentTransactionIdAndEmissionDate(parent.getId(), expectedDate))
                .thenReturn(false);

        transactionService.generateRecurrentTransactions(targetMonth, targetYear);

        verify(transactionRepository).save(transactionCaptor.capture());
        assertThat(transactionCaptor.getValue().getEmissionDate()).isEqualTo(expectedDate);
        assertThat(transactionCaptor.getValue().getParentTransactionId()).isEqualTo(parent.getId());
    }

    @Test
    void should_generate_monthly_transaction_for_the_following_month() {
        Transaction parent = buildRecurrentTransaction(10L, LocalDate.of(2026, 1, 15), 1);

        assertGeneratesTransactionOn(parent, 2, 2026, LocalDate.of(2026, 2, 15));
    }

    @Test
    void should_generate_monthly_transaction_across_a_year_boundary() {
        Transaction parent = buildRecurrentTransaction(10L, LocalDate.of(2025, 12, 10), 1);

        assertGeneratesTransactionOn(parent, 1, 2026, LocalDate.of(2026, 1, 10));
    }

    @Test
    void should_generate_yearly_transaction_twelve_months_later() {
        Transaction parent = buildRecurrentTransaction(10L, LocalDate.of(2025, 3, 5), 12);

        assertGeneratesTransactionOn(parent, 3, 2026, LocalDate.of(2026, 3, 5));
    }

    @Test
    void should_generate_quarterly_transaction_across_a_year_boundary() {
        Transaction parent = buildRecurrentTransaction(10L, LocalDate.of(2025, 11, 20), 3);

        assertGeneratesTransactionOn(parent, 2, 2026, LocalDate.of(2026, 2, 20));
    }

    @Test
    void should_use_last_day_of_month_when_day_does_not_exist_in_target_month() {
        // 31 janvier + 1 mois : février 2026 n'a que 28 jours
        Transaction parent = buildRecurrentTransaction(10L, LocalDate.of(2026, 1, 31), 1);

        assertGeneratesTransactionOn(parent, 2, 2026, LocalDate.of(2026, 2, 28));
    }

    @Test
    void should_use_29th_of_february_when_target_year_is_a_leap_year() {
        Transaction parent = buildRecurrentTransaction(10L, LocalDate.of(2028, 1, 31), 1);

        assertGeneratesTransactionOn(parent, 2, 2028, LocalDate.of(2028, 2, 29));
    }

    @Test
    void should_copy_parent_data_and_reset_checked_and_alert_flags_on_generated_transaction() {
        Transaction parent = buildRecurrentTransaction(10L, LocalDate.of(2026, 1, 15), 1);
        parent.setChecked(true);
        parent.setAlertTriggered(true);
        when(transactionRepository.findByRecurrenceMonthsGreaterThan(0)).thenReturn(List.of(parent));
        when(transactionRepository.existsByParentTransactionIdAndEmissionDate(10L, LocalDate.of(2026, 2, 15)))
                .thenReturn(false);

        transactionService.generateRecurrentTransactions(2, 2026);

        verify(transactionRepository).save(transactionCaptor.capture());
        Transaction created = transactionCaptor.getValue();
        assertThat(created.getEmissionDate()).isEqualTo(LocalDate.of(2026, 2, 15));
        assertThat(created.getParentTransactionId()).isEqualTo(10L);
        assertThat(created.getAccount()).isSameAs(parent.getAccount());
        assertThat(created.getCategory()).isSameAs(parent.getCategory());
        assertThat(created.getPaymentMethod()).isSameAs(parent.getPaymentMethod());
        assertThat(created.getAmount()).isEqualByComparingTo("42.00");
        assertThat(created.getDescription()).isEqualTo("Abonnement");
        assertThat(created.getType()).isEqualTo(TransactionType.DEBIT);
        assertThat(created.getRecurrenceMonths()).isEqualTo(1);
        assertThat(created.isChecked()).isFalse();
        assertThat(created.isAlertTriggered()).isFalse();
    }

    @Test
    void should_not_generate_transaction_when_target_month_does_not_match_recurrence() {
        // Récurrence mensuelle émise en janvier : elle génère février, pas mars
        Transaction parent = buildRecurrentTransaction(10L, LocalDate.of(2026, 1, 15), 1);
        when(transactionRepository.findByRecurrenceMonthsGreaterThan(0)).thenReturn(List.of(parent));

        transactionService.generateRecurrentTransactions(3, 2026);

        verify(transactionRepository, never()).existsByParentTransactionIdAndEmissionDate(anyLong(),
                any(LocalDate.class));
        verify(transactionRepository, never()).save(any(Transaction.class));
    }

    @Test
    void should_not_generate_transaction_when_it_already_exists_for_that_date() {
        Transaction parent = buildRecurrentTransaction(10L, LocalDate.of(2026, 1, 15), 1);
        when(transactionRepository.findByRecurrenceMonthsGreaterThan(0)).thenReturn(List.of(parent));
        when(transactionRepository.existsByParentTransactionIdAndEmissionDate(10L, LocalDate.of(2026, 2, 15)))
                .thenReturn(true);

        transactionService.generateRecurrentTransactions(2, 2026);

        verify(transactionRepository, never()).save(any(Transaction.class));
    }

    @Test
    void should_not_generate_transaction_when_account_is_inactive() {
        Transaction parent = buildRecurrentTransaction(10L, LocalDate.of(2026, 1, 15), 1);
        parent.getAccount().setActive(false);
        when(transactionRepository.findByRecurrenceMonthsGreaterThan(0)).thenReturn(List.of(parent));

        transactionService.generateRecurrentTransactions(2, 2026);

        verify(transactionRepository, never()).save(any(Transaction.class));
    }

    @Test
    void should_not_generate_transaction_when_category_is_inactive() {
        Transaction parent = buildRecurrentTransaction(10L, LocalDate.of(2026, 1, 15), 1);
        parent.getCategory().setActive(false);
        when(transactionRepository.findByRecurrenceMonthsGreaterThan(0)).thenReturn(List.of(parent));

        transactionService.generateRecurrentTransactions(2, 2026);

        verify(transactionRepository, never()).save(any(Transaction.class));
    }

    @Test
    void should_not_generate_transaction_when_payment_method_is_inactive() {
        Transaction parent = buildRecurrentTransaction(10L, LocalDate.of(2026, 1, 15), 1);
        parent.getPaymentMethod().setActive(false);
        when(transactionRepository.findByRecurrenceMonthsGreaterThan(0)).thenReturn(List.of(parent));

        transactionService.generateRecurrentTransactions(2, 2026);

        verify(transactionRepository, never()).save(any(Transaction.class));
    }

    @Test
    void should_do_nothing_when_there_are_no_recurrent_transactions() {
        when(transactionRepository.findByRecurrenceMonthsGreaterThan(0)).thenReturn(List.of());

        transactionService.generateRecurrentTransactions(2, 2026);

        verify(transactionRepository, never()).save(any(Transaction.class));
    }

    @Test
    void should_only_generate_transactions_whose_recurrence_matches_target_month() {
        Transaction matching = buildRecurrentTransaction(10L, LocalDate.of(2026, 1, 15), 1);
        Transaction notMatching = buildRecurrentTransaction(11L, LocalDate.of(2026, 1, 20), 6);
        when(transactionRepository.findByRecurrenceMonthsGreaterThan(0)).thenReturn(List.of(matching, notMatching));
        when(transactionRepository.existsByParentTransactionIdAndEmissionDate(10L, LocalDate.of(2026, 2, 15)))
                .thenReturn(false);

        transactionService.generateRecurrentTransactions(2, 2026);

        verify(transactionRepository).save(transactionCaptor.capture());
        assertThat(transactionCaptor.getValue().getParentTransactionId()).isEqualTo(10L);
    }
}