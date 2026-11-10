package com.gestionCompte.apirest.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertFalse;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;

import com.gestionCompte.apirest.model.Account;
import com.gestionCompte.apirest.model.AccountType;
import com.gestionCompte.apirest.model.ProjectedBudgetPeriod;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class ProjectedBudgetPeriodRepositoryTest {

    @Autowired
    private ProjectedBudgetPeriodRepository repository;

    @Autowired
    private TestEntityManager entityManager;

    @Test
    void findByAccountIdAndMonthAndYear_ShouldReturnMatchingPeriod() {
        Account account = new Account();
        account.setLabel("Compte Principal");
        account.setInitialBalance(new BigDecimal("1500.00"));
        account.setActive(true);
        account.setPosition(0);
        account.setType(AccountType.COURANT);
        Account savedAccount = entityManager.persistAndFlush(account);

        ProjectedBudgetPeriod period = new ProjectedBudgetPeriod();
        period.setAccount(savedAccount);
        period.setMonth(10);
        period.setYear(2026);
        period.setWeeksCount(5);
        entityManager.persistAndFlush(period);

        Optional<ProjectedBudgetPeriod> result = repository.findByAccountIdAndMonthAndYear(savedAccount.getId(), 10, 2026);

        assertTrue(result.isPresent());
        assertEquals(5, result.get().getWeeksCount());
    }

    @Test
    void findByAccountId_ShouldReturnAllMatchingPeriods() {
        Account account = new Account();
        account.setLabel("Compte Épargne");
        account.setInitialBalance(new BigDecimal("3000.00"));
        account.setActive(true);
        account.setPosition(1);
        account.setType(AccountType.EPARGNE);
        Account savedAccount = entityManager.persistAndFlush(account);

        ProjectedBudgetPeriod period1 = new ProjectedBudgetPeriod();
        period1.setAccount(savedAccount);
        period1.setMonth(10);
        period1.setYear(2026);
        entityManager.persistAndFlush(period1);

        ProjectedBudgetPeriod period2 = new ProjectedBudgetPeriod();
        period2.setAccount(savedAccount);
        period2.setMonth(11);
        period2.setYear(2026);
        entityManager.persistAndFlush(period2);

        List<ProjectedBudgetPeriod> result = repository.findByAccountId(savedAccount.getId());

        assertEquals(2, result.size());
    }

    @Test
    void existsByAccountIdAndMonthAndYear_ShouldReturnTrueIfPeriodExists() {
        Account account = new Account();
        account.setLabel("Compte Joint");
        account.setInitialBalance(new BigDecimal("200.00"));
        account.setActive(true);
        account.setPosition(2);
        account.setType(AccountType.COURANT);
        Account savedAccount = entityManager.persistAndFlush(account);

        ProjectedBudgetPeriod period = new ProjectedBudgetPeriod();
        period.setAccount(savedAccount);
        period.setMonth(12);
        period.setYear(2026);
        entityManager.persistAndFlush(period);

        boolean exists = repository.existsByAccountIdAndMonthAndYear(savedAccount.getId(), 12, 2026);
        boolean doesNotExist = repository.existsByAccountIdAndMonthAndYear(savedAccount.getId(), 1, 2027);

        assertTrue(exists);
        assertFalse(doesNotExist);
    }
}
