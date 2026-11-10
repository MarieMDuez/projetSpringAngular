package com.gestionCompte.apirest.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.Answers;
import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.mockito.Captor;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.jpa.domain.Specification;

import com.gestionCompte.apirest.dto.ProjectedBudgetResponseDto;
import com.gestionCompte.apirest.dto.SuggestedPeriodDataDto;
import com.gestionCompte.apirest.exception.ErrorMessages;
import com.gestionCompte.apirest.exception.ResourceAlreadyExistsException;
import com.gestionCompte.apirest.exception.ResourceNotFoundException;
import com.gestionCompte.apirest.model.Account;
import com.gestionCompte.apirest.model.Category;
import com.gestionCompte.apirest.model.PaymentMethod;
import com.gestionCompte.apirest.model.ProjectedBudgetCategoryType;
import com.gestionCompte.apirest.model.ProjectedBudgetItems;
import com.gestionCompte.apirest.model.ProjectedBudgetPeriod;
import com.gestionCompte.apirest.model.ProjectedBudgetSettings;
import com.gestionCompte.apirest.model.Transaction;
import com.gestionCompte.apirest.repository.AccountRepository;
import com.gestionCompte.apirest.repository.ProjectedBudgetItemsRepository;
import com.gestionCompte.apirest.repository.ProjectedBudgetPeriodRepository;
import com.gestionCompte.apirest.repository.ProjectedBudgetSettingsRepository;
import com.gestionCompte.apirest.repository.TransactionRepository;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Root;

/**
 * Tests unitaires de ProjectedBudgetService.
 *
 * Parties : 1. lecture et filtres, 2. création d'une période, 3. suppression,
 * 4. suggestions de transactions récurrentes, 5. mise à jour des items,
 * 6. périodes disponibles pour duplication, 7. duplication d'items.
 */
@ExtendWith(MockitoExtension.class)
class ProjectedBudgetServiceTest {

    @Mock
    private ProjectedBudgetItemsRepository projectedBudgetItemsRepository;

    @Mock
    private ProjectedBudgetPeriodRepository projectedBudgetPeriodRepository;

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private ProjectedBudgetSettingsRepository projectedBudgetSettingsRepository;

    @InjectMocks
    private ProjectedBudgetService service;

    // Faux objets "JPA Criteria", utilisés uniquement pour exécuter la Specification (partie 1).
    // RETURNS_DEEP_STUBS permet d'écrire root.get("account").get("id") sans NullPointerException.
    @Mock(answer = Answers.RETURNS_DEEP_STUBS)
    private Root<ProjectedBudgetPeriod> root;

    @Mock
    private CriteriaQuery<?> query;

    @Mock
    private CriteriaBuilder criteriaBuilder;

    @Captor
    private ArgumentCaptor<Specification<ProjectedBudgetPeriod>> specCaptor;

    @Captor
    private ArgumentCaptor<ProjectedBudgetPeriod> periodCaptor;

    @Captor
    private ArgumentCaptor<List<ProjectedBudgetItems>> itemsCaptor;

    // ------------------------------------------------------------------
    // Méthodes utilitaires
    // ------------------------------------------------------------------

    private Account buildAccount(Long id) {
        Account account = new Account();
        account.setId(id);
        account.setActive(true);
        return account;
    }

    private ProjectedBudgetPeriod buildPeriod(Long id, int month, int year) {
        ProjectedBudgetPeriod period = new ProjectedBudgetPeriod();
        period.setId(id);
        period.setAccount(buildAccount(1L));
        period.setMonth(month);
        period.setYear(year);
        period.setWeeksCount(5);
        return period;
    }

    private ProjectedBudgetPeriod buildPeriodOf(YearMonth yearMonth) {
        return buildPeriod(null, yearMonth.getMonthValue(), yearMonth.getYear());
    }

    private ProjectedBudgetItems buildItem(Long id) {
        ProjectedBudgetItems item = new ProjectedBudgetItems();
        item.setId(id);
        item.setAccountAmount(new BigDecimal("100.00"));
        return item;
    }

    private Category buildCategory(Long id) {
        Category category = new Category();
        category.setId(id);
        category.setLabel("Catégorie " + id);
        return category;
    }

    /** Transaction récurrente avec compte, catégorie et moyen de paiement actifs (par défaut). */
    private Transaction buildRecurrentTransaction(LocalDate emissionDate, int recurrenceMonths, Category category) {
        Transaction transaction = new Transaction();
        transaction.setEmissionDate(emissionDate);
        transaction.setRecurrenceMonths(recurrenceMonths);
        transaction.setAmount(new BigDecimal("42.00"));
        transaction.setAccount(buildAccount(1L));
        transaction.setCategory(category);
        transaction.setPaymentMethod(new PaymentMethod());
        return transaction;
    }

    private ProjectedBudgetSettings buildSetting(Category category, ProjectedBudgetCategoryType type) {
        ProjectedBudgetSettings setting = new ProjectedBudgetSettings();
        setting.setCategory(category);
        setting.setType(type);
        return setting;
    }

    /** L'item de budget que le service est censé produire à partir d'une transaction et d'un réglage. */
    private ProjectedBudgetItems expectedItem(Transaction transaction, ProjectedBudgetSettings setting) {
        ProjectedBudgetItems item = new ProjectedBudgetItems();
        item.setAccountAmount(transaction.getAmount());
        item.setCategory(transaction.getCategory());
        item.setPaymentMethod(transaction.getPaymentMethod());
        item.setType(setting.getType());
        return item;
    }

    private void stubRecurrentTransactions(List<Transaction> transactions, List<ProjectedBudgetSettings> settings) {
        when(transactionRepository.findByAccountIdAndRecurrenceMonthsGreaterThan(1L, 0)).thenReturn(transactions);
        when(projectedBudgetSettingsRepository.findAll()).thenReturn(settings);
    }

    /** Matcher Mockito "n'importe quelle Specification". */
    private static Specification<ProjectedBudgetPeriod> anySpec() {
        return ArgumentMatchers.<Specification<ProjectedBudgetPeriod>>any();
    }

    /** Fait en sorte que save(période) renvoie la période reçue, avec l'id donné (comme JPA). */
    private void stubSavePeriodWithId(Long id) {
        when(projectedBudgetPeriodRepository.save(any(ProjectedBudgetPeriod.class))).thenAnswer(invocation -> {
            ProjectedBudgetPeriod saved = invocation.getArgument(0);
            saved.setId(id);
            return saved;
        });
    }

    // ==================================================================
    // 1. Lecture et filtres
    // ==================================================================

    @Test
    void should_return_all_periods_from_repository() {
        List<ProjectedBudgetPeriod> periods = List.of(buildPeriod(10L, 10, 2026), buildPeriod(11L, 11, 2026));
        when(projectedBudgetPeriodRepository.findAll()).thenReturn(periods);

        assertThat(service.getAllProjectedBudgetPeriod()).containsExactlyElementsOf(periods);
    }

    @Test
    void should_return_periods_of_an_account() {
        List<ProjectedBudgetPeriod> periods = List.of(buildPeriod(10L, 10, 2026));
        when(projectedBudgetPeriodRepository.findByAccountId(1L)).thenReturn(periods);

        assertThat(service.getAllProjectedBudgetPeriodByAccount(1L)).containsExactlyElementsOf(periods);
    }

    @Test
    void should_return_periods_found_by_the_repository_for_a_filter() {
        List<ProjectedBudgetPeriod> periods = List.of(buildPeriod(10L, 10, 2026));
        when(projectedBudgetPeriodRepository.findAll(anySpec())).thenReturn(periods);

        assertThat(service.getFilteredBudgetPeriod(1L, 10, 2026, null)).containsExactlyElementsOf(periods);
    }

    @Test
    void should_build_a_specification_with_one_equality_per_given_criterion() {
        service.getFilteredBudgetPeriod(1L, 10, 2026, 5);

        verify(projectedBudgetPeriodRepository).findAll(specCaptor.capture());
        specCaptor.getValue().toPredicate(root, query, criteriaBuilder);

        verify(criteriaBuilder).equal(any(), eq(1L)); // compte
        verify(criteriaBuilder).equal(any(), eq(10)); // mois
        verify(criteriaBuilder).equal(any(), eq(2026)); // année
        verify(criteriaBuilder).equal(any(), eq(5)); // nombre de semaines
    }

    @Test
    void should_build_a_specification_without_any_equality_when_no_criterion_is_given() {
        service.getFilteredBudgetPeriod(null, null, null, null);

        verify(projectedBudgetPeriodRepository).findAll(specCaptor.capture());
        specCaptor.getValue().toPredicate(root, query, criteriaBuilder);

        verify(criteriaBuilder, never()).equal(any(), ArgumentMatchers.<Object>any());
    }

    @Test
    void should_return_empty_list_when_no_period_exists_for_account_month_and_year() {
        when(projectedBudgetPeriodRepository.findAll(anySpec())).thenReturn(List.of());

        List<ProjectedBudgetItems> result = service.getProjectedBudgetItemsByAccountIdAndPeriod(1L, 10, 2026);

        assertThat(result).isEmpty();
        verifyNoInteractions(projectedBudgetItemsRepository);
    }

    @Test
    void should_return_items_of_the_first_period_found() {
        List<ProjectedBudgetItems> items = List.of(buildItem(100L), buildItem(101L));
        when(projectedBudgetPeriodRepository.findAll(anySpec()))
                .thenReturn(List.of(buildPeriod(10L, 10, 2026), buildPeriod(11L, 10, 2026)));
        when(projectedBudgetItemsRepository.findByBudgetPeriodId(10L)).thenReturn(items);

        List<ProjectedBudgetItems> result = service.getProjectedBudgetItemsByAccountIdAndPeriod(1L, 10, 2026);

        assertThat(result).containsExactlyElementsOf(items);
        verify(projectedBudgetItemsRepository, never()).findByBudgetPeriodId(11L);
    }

    // ==================================================================
    // 2. createProjectedBudgetPeriod
    // ==================================================================

    @Test
    void should_throw_exception_and_save_nothing_when_period_already_exists() {
        when(projectedBudgetPeriodRepository.findByAccountIdAndMonthAndYear(1L, 10, 2026))
                .thenReturn(Optional.of(buildPeriod(10L, 10, 2026)));

        assertThatThrownBy(() -> service.createProjectedBudgetPeriod(1L, 10, 2026, null))
                .isInstanceOf(ResourceAlreadyExistsException.class);

        verify(projectedBudgetPeriodRepository, never()).save(any(ProjectedBudgetPeriod.class));
    }

    @Test
    void should_save_a_new_period_with_account_month_and_year() {
        Account account = buildAccount(1L);
        when(projectedBudgetPeriodRepository.findByAccountIdAndMonthAndYear(1L, 10, 2026))
                .thenReturn(Optional.empty());
        when(accountRepository.getReferenceById(1L)).thenReturn(account);
        stubSavePeriodWithId(10L);

        ProjectedBudgetResponseDto result = service.createProjectedBudgetPeriod(1L, 10, 2026, null);

        verify(projectedBudgetPeriodRepository).save(periodCaptor.capture());
        assertThat(periodCaptor.getValue().getAccount()).isSameAs(account);
        assertThat(periodCaptor.getValue().getMonth()).isEqualTo(10);
        assertThat(periodCaptor.getValue().getYear()).isEqualTo(2026);
        assertThat(result.getPeriod().getId()).isEqualTo(10L);
    }

    @ParameterizedTest
    @CsvSource({
            "9, 2026, 5", // septembre 2026 : semaines 1 à 5
            "2, 2027, 4", // février 2027 : du lundi 1er au dimanche 28, 4 semaines exactement
            "5, 2026, 5" // mai 2026 commence un vendredi : "semaine 0" + semaines 1 à 4
    })
    void should_compute_the_number_of_weeks_of_the_month(int month, int year, int expectedWeeks) {
        when(projectedBudgetPeriodRepository.findByAccountIdAndMonthAndYear(1L, month, year))
                .thenReturn(Optional.empty());
        when(accountRepository.getReferenceById(1L)).thenReturn(buildAccount(1L));
        stubSavePeriodWithId(10L);

        service.createProjectedBudgetPeriod(1L, month, year, null);

        verify(projectedBudgetPeriodRepository).save(periodCaptor.capture());
        assertThat(periodCaptor.getValue().getWeeksCount()).isEqualTo(expectedWeeks);
    }

    @Test
    void should_look_for_recurrent_transactions_when_no_period_to_clone_is_given() {
        when(projectedBudgetPeriodRepository.findByAccountIdAndMonthAndYear(1L, 10, 2026))
                .thenReturn(Optional.empty());
        when(accountRepository.getReferenceById(1L)).thenReturn(buildAccount(1L));
        stubSavePeriodWithId(10L);

        service.createProjectedBudgetPeriod(1L, 10, 2026, null);

        verify(transactionRepository).findByAccountIdAndRecurrenceMonthsGreaterThan(1L, 0);
        verify(projectedBudgetItemsRepository, never()).saveAll(anyList());
    }

    @Test
    void should_duplicate_items_of_the_model_period_when_a_period_to_clone_is_given() {
        ProjectedBudgetItems modelItem = buildItem(100L);
        when(projectedBudgetPeriodRepository.findByAccountIdAndMonthAndYear(1L, 10, 2026))
                .thenReturn(Optional.empty());
        when(accountRepository.getReferenceById(1L)).thenReturn(buildAccount(1L));
        stubSavePeriodWithId(10L);
        when(projectedBudgetItemsRepository.findByBudgetPeriodId(5L)).thenReturn(List.of(modelItem));
        // La période cible (celle qui vient d'être créée, id 10) est relue par duplicateItemsFromPeriod
        when(projectedBudgetPeriodRepository.findById(10L)).thenReturn(Optional.of(buildPeriod(10L, 10, 2026)));
        when(projectedBudgetItemsRepository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));

        ProjectedBudgetResponseDto result = service.createProjectedBudgetPeriod(1L, 10, 2026, 5L);

        assertThat(result.getPeriod().getId()).isEqualTo(10L);
        verify(projectedBudgetItemsRepository).saveAll(itemsCaptor.capture());
        assertThat(itemsCaptor.getValue()).hasSize(1);
        // Pas de recherche de transactions récurrentes quand on clone
        verifyNoInteractions(transactionRepository, projectedBudgetSettingsRepository);
    }

    // ==================================================================
    // 3. deleteProjectedBudgetPeriod
    // ==================================================================

    @Test
    void should_delete_items_before_deleting_the_period() {
        when(projectedBudgetPeriodRepository.existsById(10L)).thenReturn(true);

        service.deleteProjectedBudgetPeriod(10L);

        // L'ordre compte : les items référencent la période, ils doivent partir en premier
        InOrder order = inOrder(projectedBudgetItemsRepository, projectedBudgetPeriodRepository);
        order.verify(projectedBudgetItemsRepository).deleteByBudgetPeriodId(10L);
        order.verify(projectedBudgetPeriodRepository).deleteById(10L);
    }

    @Test
    void should_throw_not_found_exception_and_delete_nothing_when_deleting_a_period_that_does_not_exist() {
        when(projectedBudgetPeriodRepository.existsById(99L)).thenReturn(false);
        
        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class, () -> {
        	service.deleteProjectedBudgetPeriod(99L);
        });

        assertEquals(ErrorMessages.PERIOD_NOT_FOUND + 99L, exception.getMessage());

        verifyNoInteractions(projectedBudgetItemsRepository);
        verify(projectedBudgetPeriodRepository, never()).deleteById(any());
    }

    @Test
    void should_delete_items_of_a_period() {
        service.deleteProjectedBudgetItemsByPeriodId(10L);

        verify(projectedBudgetItemsRepository).deleteByBudgetPeriodId(10L);
    }

    // ==================================================================
    // 4. getSuggestedRecurrentTransactionsForPeriod
    //
    // Règle : une transaction récurrente (tous les N mois) est proposée pour le mois cible si son
    // mois d'émission est exactement "mois cible - N". Si sa catégorie a un réglage de budget,
    // elle devient un item de budget (avec le type du réglage) ; sinon elle est simplement suggérée.
    // Le résultat est comparé en entier (comparaison champ par champ).
    // ==================================================================

    @Test
    void should_turn_a_due_recurrent_transaction_into_a_budget_item_when_its_category_has_a_setting() {
        Category category = buildCategory(7L);
        Transaction transaction = buildRecurrentTransaction(LocalDate.of(2026, 9, 10), 1, category);
        ProjectedBudgetSettings setting = buildSetting(category, ProjectedBudgetCategoryType.FIXED_EXPENSE);
        stubRecurrentTransactions(List.of(transaction), List.of(setting));

        SuggestedPeriodDataDto result = service.getSuggestedRecurrentTransactionsForPeriod(1L, 10, 2026);

        assertThat(result).usingRecursiveComparison()
                .isEqualTo(new SuggestedPeriodDataDto(List.of(), List.of(expectedItem(transaction, setting))));
    }

    @Test
    void should_suggest_the_transaction_itself_when_its_category_has_no_setting() {
        Category category = buildCategory(7L);
        Transaction transaction = buildRecurrentTransaction(LocalDate.of(2026, 9, 10), 1, category);
        ProjectedBudgetSettings otherSetting = buildSetting(buildCategory(8L), ProjectedBudgetCategoryType.INCOME);
        stubRecurrentTransactions(List.of(transaction), List.of(otherSetting));

        SuggestedPeriodDataDto result = service.getSuggestedRecurrentTransactionsForPeriod(1L, 10, 2026);

        assertThat(result).usingRecursiveComparison()
                .isEqualTo(new SuggestedPeriodDataDto(List.of(transaction), List.of()));
    }

    @Test
    void should_use_the_setting_that_matches_the_category_of_the_transaction() {
        Category category = buildCategory(7L);
        Transaction transaction = buildRecurrentTransaction(LocalDate.of(2026, 9, 10), 1, category);
        ProjectedBudgetSettings otherSetting = buildSetting(buildCategory(8L), ProjectedBudgetCategoryType.INCOME);
        ProjectedBudgetSettings matchingSetting = buildSetting(category, ProjectedBudgetCategoryType.SAVINGS);
        stubRecurrentTransactions(List.of(transaction), List.of(otherSetting, matchingSetting));

        SuggestedPeriodDataDto result = service.getSuggestedRecurrentTransactionsForPeriod(1L, 10, 2026);

        assertThat(result).usingRecursiveComparison().isEqualTo(
                new SuggestedPeriodDataDto(List.of(), List.of(expectedItem(transaction, matchingSetting))));
    }

    @Test
    void should_ignore_a_recurrent_transaction_that_is_not_due_in_the_target_month() {
        // Récurrence mensuelle émise en septembre : elle est attendue en octobre, pas en novembre
        Category category = buildCategory(7L);
        Transaction transaction = buildRecurrentTransaction(LocalDate.of(2026, 9, 10), 1, category);
        stubRecurrentTransactions(List.of(transaction),
                List.of(buildSetting(category, ProjectedBudgetCategoryType.FIXED_EXPENSE)));

        SuggestedPeriodDataDto result = service.getSuggestedRecurrentTransactionsForPeriod(1L, 11, 2026);

        assertThat(result).usingRecursiveComparison().isEqualTo(new SuggestedPeriodDataDto(List.of(), List.of()));
    }

    @Test
    void should_find_the_parent_month_across_a_year_boundary() {
        Category category = buildCategory(7L);
        Transaction transaction = buildRecurrentTransaction(LocalDate.of(2025, 12, 10), 1, category);
        ProjectedBudgetSettings setting = buildSetting(category, ProjectedBudgetCategoryType.FIXED_EXPENSE);
        stubRecurrentTransactions(List.of(transaction), List.of(setting));

        SuggestedPeriodDataDto result = service.getSuggestedRecurrentTransactionsForPeriod(1L, 1, 2026);

        assertThat(result).usingRecursiveComparison()
                .isEqualTo(new SuggestedPeriodDataDto(List.of(), List.of(expectedItem(transaction, setting))));
    }

    @Test
    void should_handle_a_yearly_recurrence() {
        Category category = buildCategory(7L);
        Transaction transaction = buildRecurrentTransaction(LocalDate.of(2025, 10, 10), 12, category);
        ProjectedBudgetSettings setting = buildSetting(category, ProjectedBudgetCategoryType.FIXED_EXPENSE);
        stubRecurrentTransactions(List.of(transaction), List.of(setting));

        SuggestedPeriodDataDto result = service.getSuggestedRecurrentTransactionsForPeriod(1L, 10, 2026);

        assertThat(result).usingRecursiveComparison()
                .isEqualTo(new SuggestedPeriodDataDto(List.of(), List.of(expectedItem(transaction, setting))));
    }

    @Test
    void should_ignore_transactions_whose_account_category_or_payment_method_is_inactive() {
        Category category = buildCategory(7L);
        Transaction inactiveAccount = buildRecurrentTransaction(LocalDate.of(2026, 9, 10), 1, category);
        inactiveAccount.getAccount().setActive(false);
        Category inactiveCategory = buildCategory(8L);
        inactiveCategory.setActive(false);
        Transaction withInactiveCategory = buildRecurrentTransaction(LocalDate.of(2026, 9, 10), 1, inactiveCategory);
        Transaction inactivePayment = buildRecurrentTransaction(LocalDate.of(2026, 9, 10), 1, category);
        inactivePayment.getPaymentMethod().setActive(false);
        stubRecurrentTransactions(List.of(inactiveAccount, withInactiveCategory, inactivePayment), List.of());

        SuggestedPeriodDataDto result = service.getSuggestedRecurrentTransactionsForPeriod(1L, 10, 2026);

        assertThat(result).usingRecursiveComparison().isEqualTo(new SuggestedPeriodDataDto(List.of(), List.of()));
    }

    @Test
    void should_split_due_transactions_between_budget_items_and_plain_suggestions() {
        Category withSetting = buildCategory(7L);
        Category withoutSetting = buildCategory(8L);
        Transaction toItem = buildRecurrentTransaction(LocalDate.of(2026, 9, 10), 1, withSetting);
        Transaction toSuggest = buildRecurrentTransaction(LocalDate.of(2026, 9, 20), 1, withoutSetting);
        ProjectedBudgetSettings setting = buildSetting(withSetting, ProjectedBudgetCategoryType.VARIABLE_EXPENSE);
        stubRecurrentTransactions(List.of(toItem, toSuggest), List.of(setting));

        SuggestedPeriodDataDto result = service.getSuggestedRecurrentTransactionsForPeriod(1L, 10, 2026);

        assertThat(result).usingRecursiveComparison().isEqualTo(
                new SuggestedPeriodDataDto(List.of(toSuggest), List.of(expectedItem(toItem, setting))));
    }

    // ==================================================================
    // 5. updateProjectedBudgetItems
    // ==================================================================

    @Test
    void should_delete_items_missing_from_the_incoming_list_and_save_the_incoming_ones() {
        ProjectedBudgetItems kept = buildItem(100L);
        ProjectedBudgetItems orphan = buildItem(200L);
        ProjectedBudgetItems incoming = buildItem(100L);
        List<ProjectedBudgetItems> incomingList = List.of(incoming);
        when(projectedBudgetItemsRepository.findByBudgetPeriodId(10L)).thenReturn(List.of(kept, orphan));
        when(projectedBudgetPeriodRepository.getReferenceById(10L)).thenReturn(buildPeriod(10L, 10, 2026));
        when(projectedBudgetItemsRepository.saveAll(incomingList)).thenReturn(incomingList);

        List<ProjectedBudgetItems> result = service.updateProjectedBudgetItems(10L, incomingList);

        assertThat(result).containsExactly(incoming);
        verify(projectedBudgetItemsRepository).deleteAll(List.of(orphan));
        verify(projectedBudgetItemsRepository).saveAll(incomingList);
    }

    @Test
    void should_delete_nothing_when_every_existing_item_is_in_the_incoming_list() {
        ProjectedBudgetItems existing = buildItem(100L);
        ProjectedBudgetItems newItem = buildItem(null);
        List<ProjectedBudgetItems> incomingList = List.of(buildItem(100L), newItem);
        when(projectedBudgetItemsRepository.findByBudgetPeriodId(10L)).thenReturn(List.of(existing));
        when(projectedBudgetPeriodRepository.getReferenceById(10L)).thenReturn(buildPeriod(10L, 10, 2026));
        when(projectedBudgetItemsRepository.saveAll(incomingList)).thenReturn(incomingList);

        service.updateProjectedBudgetItems(10L, incomingList);

        verify(projectedBudgetItemsRepository).deleteAll(List.of());
        verify(projectedBudgetItemsRepository).saveAll(incomingList);
    }

    @Test
    void should_delete_every_existing_item_when_the_incoming_list_is_empty() {
        ProjectedBudgetItems first = buildItem(100L);
        ProjectedBudgetItems second = buildItem(200L);
        when(projectedBudgetItemsRepository.findByBudgetPeriodId(10L)).thenReturn(List.of(first, second));
        when(projectedBudgetPeriodRepository.getReferenceById(10L)).thenReturn(buildPeriod(10L, 10, 2026));
        when(projectedBudgetItemsRepository.saveAll(List.<ProjectedBudgetItems>of())).thenReturn(List.of());

        List<ProjectedBudgetItems> result = service.updateProjectedBudgetItems(10L, List.of());

        assertThat(result).isEmpty();
        verify(projectedBudgetItemsRepository).deleteAll(List.of(first, second));
    }

    @Test
    void should_not_keep_an_existing_item_just_because_an_incoming_item_has_no_id() {
        ProjectedBudgetItems existing = buildItem(100L);
        List<ProjectedBudgetItems> incomingList = List.of(buildItem(null));
        when(projectedBudgetItemsRepository.findByBudgetPeriodId(10L)).thenReturn(List.of(existing));
        when(projectedBudgetPeriodRepository.getReferenceById(10L)).thenReturn(buildPeriod(10L, 10, 2026));
        when(projectedBudgetItemsRepository.saveAll(incomingList)).thenReturn(incomingList);

        service.updateProjectedBudgetItems(10L, incomingList);

        verify(projectedBudgetItemsRepository).deleteAll(List.of(existing));
    }

    @Test
    void should_attach_every_incoming_item_to_the_period() {
        ProjectedBudgetPeriod period = buildPeriod(10L, 10, 2026);
        ProjectedBudgetItems first = buildItem(null);
        ProjectedBudgetItems second = buildItem(null);
        List<ProjectedBudgetItems> incomingList = List.of(first, second);
        when(projectedBudgetItemsRepository.findByBudgetPeriodId(10L)).thenReturn(List.of());
        when(projectedBudgetPeriodRepository.getReferenceById(10L)).thenReturn(period);
        when(projectedBudgetItemsRepository.saveAll(incomingList)).thenReturn(incomingList);

        service.updateProjectedBudgetItems(10L, incomingList);

        assertThat(first.getBudgetPeriod()).isSameAs(period);
        assertThat(second.getBudgetPeriod()).isSameAs(period);
    }

    // ==================================================================
    // 6. getAvailablePeriodsForDuplication
    //
    // Les périodes sont construites à partir de la date du jour (YearMonth.now()) : les tests
    // restent donc valables quelle que soit la date d'exécution. (Avec des dates fixes, ils
    // cesseraient de passer un jour.)
    // ==================================================================

    @Test
    void should_keep_periods_of_the_last_12_months_and_exclude_older_ones() {
        YearMonth now = YearMonth.now();
        ProjectedBudgetPeriod recent = buildPeriodOf(now.minusMonths(1));
        ProjectedBudgetPeriod oldestKept = buildPeriodOf(now.minusMonths(12));
        ProjectedBudgetPeriod tooOld = buildPeriodOf(now.minusMonths(13));
        when(projectedBudgetPeriodRepository.findByAccountId(1L)).thenReturn(List.of(tooOld, oldestKept, recent));

        List<ProjectedBudgetPeriod> result = service.getAvailablePeriodsForDuplication(1L);

        assertThat(result).extracting(ProjectedBudgetPeriod::getYear, ProjectedBudgetPeriod::getMonth)
                .containsExactly(tuple(now.minusMonths(1).getYear(), now.minusMonths(1).getMonthValue()),
                        tuple(now.minusMonths(12).getYear(), now.minusMonths(12).getMonthValue()));
    }

    @Test
    void should_sort_available_periods_from_newest_to_oldest() {
        YearMonth now = YearMonth.now();
        when(projectedBudgetPeriodRepository.findByAccountId(1L)).thenReturn(List.of(
                buildPeriodOf(now.minusMonths(3)), buildPeriodOf(now.minusMonths(1)),
                buildPeriodOf(now.minusMonths(2))));

        List<ProjectedBudgetPeriod> result = service.getAvailablePeriodsForDuplication(1L);

        assertThat(result).extracting(ProjectedBudgetPeriod::getYear, ProjectedBudgetPeriod::getMonth)
                .containsExactly(tuple(now.minusMonths(1).getYear(), now.minusMonths(1).getMonthValue()),
                        tuple(now.minusMonths(2).getYear(), now.minusMonths(2).getMonthValue()),
                        tuple(now.minusMonths(3).getYear(), now.minusMonths(3).getMonthValue()));
    }

    @Test
    void should_return_no_available_period_when_the_account_has_none() {
        when(projectedBudgetPeriodRepository.findByAccountId(1L)).thenReturn(List.of());

        assertThat(service.getAvailablePeriodsForDuplication(1L)).isEmpty();
    }

    // ==================================================================
    // 7. duplicateItemsFromPeriod
    // ==================================================================

    @Test
    void should_copy_every_field_of_the_model_items_into_new_items_of_the_target_period() {
        ProjectedBudgetPeriod target = buildPeriod(11L, 11, 2026);
        Category category = buildCategory(7L);
        PaymentMethod paymentMethod = new PaymentMethod();
        ProjectedBudgetItems modelItem = buildItem(100L);
        modelItem.setAccountAmount(new BigDecimal("50.00"));
        modelItem.setCashAmount(new BigDecimal("12.00"));
        modelItem.setComment("Ancien commentaire");
        modelItem.setType(ProjectedBudgetCategoryType.VARIABLE_EXPENSE);
        modelItem.setCategory(category);
        modelItem.setPaymentMethod(paymentMethod);
        when(projectedBudgetItemsRepository.findByBudgetPeriodId(10L)).thenReturn(List.of(modelItem));
        when(projectedBudgetPeriodRepository.findById(11L)).thenReturn(Optional.of(target));
        when(projectedBudgetItemsRepository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));

        List<ProjectedBudgetItems> result = service.duplicateItemsFromPeriod(10L, 11L);

        verify(projectedBudgetItemsRepository).saveAll(itemsCaptor.capture());
        assertThat(itemsCaptor.getValue()).hasSize(1);
        ProjectedBudgetItems copy = itemsCaptor.getValue().get(0);
        assertThat(copy).isNotSameAs(modelItem);
        assertThat(copy.getId()).isNull(); // c'est bien une nouvelle ligne : l'id n'est pas copié
        assertThat(copy.getBudgetPeriod()).isSameAs(target);
        assertThat(copy.getAccountAmount()).isEqualByComparingTo("50.00");
        assertThat(copy.getCashAmount()).isEqualByComparingTo("12.00");
        assertThat(copy.getComment()).isEqualTo("Ancien commentaire");
        assertThat(copy.getType()).isEqualTo(ProjectedBudgetCategoryType.VARIABLE_EXPENSE);
        assertThat(copy.getCategory()).isSameAs(category);
        assertThat(copy.getPaymentMethod()).isSameAs(paymentMethod);
        assertThat(result).containsExactly(copy);
    }

    @Test
    void should_copy_every_model_item() {
        ProjectedBudgetPeriod target = buildPeriod(11L, 11, 2026);
        when(projectedBudgetItemsRepository.findByBudgetPeriodId(10L))
                .thenReturn(List.of(buildItem(100L), buildItem(101L), buildItem(102L)));
        when(projectedBudgetPeriodRepository.findById(11L)).thenReturn(Optional.of(target));
        when(projectedBudgetItemsRepository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));

        List<ProjectedBudgetItems> result = service.duplicateItemsFromPeriod(10L, 11L);

        assertThat(result)
        .hasSize(3)
        .allSatisfy(copy -> assertThat(copy.getBudgetPeriod()).isSameAs(target));
    }

    @Test
    void should_save_an_empty_list_when_the_model_period_has_no_items() {
        when(projectedBudgetItemsRepository.findByBudgetPeriodId(10L)).thenReturn(List.of());
        when(projectedBudgetPeriodRepository.findById(11L)).thenReturn(Optional.of(buildPeriod(11L, 11, 2026)));
        when(projectedBudgetItemsRepository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));

        assertThat(service.duplicateItemsFromPeriod(10L, 11L)).isEmpty();
    }

    @Test
    void should_throw_not_found_exception_and_save_nothing_when_the_target_period_does_not_exist() {
        when(projectedBudgetPeriodRepository.findById(99L)).thenReturn(Optional.empty());
        
        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class, () -> {
        	service.duplicateItemsFromPeriod(10L,99L);
        });

        assertEquals(ErrorMessages.PERIOD_NOT_FOUND + 99L, exception.getMessage());

        verify(projectedBudgetItemsRepository, never()).saveAll(anyList());
    }
}