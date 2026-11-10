package com.gestionCompte.apirest.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;

import com.gestionCompte.apirest.model.Account;
import com.gestionCompte.apirest.model.AccountType;
import com.gestionCompte.apirest.model.Category;
import com.gestionCompte.apirest.model.PaymentMethod;
import com.gestionCompte.apirest.model.ProjectedBudgetPeriod;
import com.gestionCompte.apirest.model.ProjectedBudgetItems;
import com.gestionCompte.apirest.model.ProjectedBudgetCategoryType;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class ProjectedBudgetItemsRepositoryTest {

    @Autowired
    private ProjectedBudgetItemsRepository repository;

    @Autowired
    private TestEntityManager entityManager;

    @Test
    void findByBudgetPeriodId_ShouldReturnMatchingItems() {
        Account account = new Account();
        account.setLabel("Compte de Test");
        account.setInitialBalance(new BigDecimal("1000.00"));
        account.setActive(true);
        account.setPosition(0);
        account.setType(AccountType.COURANT);
        Account savedAccount = entityManager.persistAndFlush(account);

        ProjectedBudgetPeriod period = new ProjectedBudgetPeriod();
        period.setAccount(savedAccount);
        ProjectedBudgetPeriod savedPeriod = entityManager.persistAndFlush(period);

        Category category = new Category();
        category.setLabel("TestCat");
        Category savedCategory = entityManager.persistAndFlush(category);

        PaymentMethod paymentMethod = new PaymentMethod();
        paymentMethod.setLabel("Carte de Test");
        PaymentMethod savedPaymentMethod = entityManager.persistAndFlush(paymentMethod);

        ProjectedBudgetItems item = new ProjectedBudgetItems();
        item.setBudgetPeriod(savedPeriod);
        item.setCategory(savedCategory);
        item.setPaymentMethod(savedPaymentMethod);
        item.setType(ProjectedBudgetCategoryType.INCOME);
        item.setAccountAmount(BigDecimal.ZERO);
        item.setCashAmount(BigDecimal.ZERO);
        repository.save(item);

        List<ProjectedBudgetItems> result = repository.findByBudgetPeriodId(savedPeriod.getId());

        assertEquals(1, result.size());
    }

    @Test
    void deleteByBudgetPeriodId_ShouldRemoveMatchingItems() {
        Account account = new Account();
        account.setLabel("Compte de Test 2");
        account.setInitialBalance(new BigDecimal("500.00"));
        account.setActive(true);
        account.setPosition(1);
        account.setType(AccountType.COURANT);
        Account savedAccount = entityManager.persistAndFlush(account);

        ProjectedBudgetPeriod period = new ProjectedBudgetPeriod();
        period.setAccount(savedAccount);
        ProjectedBudgetPeriod savedPeriod = entityManager.persistAndFlush(period);

        Category category = new Category();
        category.setLabel("TestCat2");
        Category savedCategory = entityManager.persistAndFlush(category);

        PaymentMethod paymentMethod = new PaymentMethod();
        paymentMethod.setLabel("Carte de Test 2");
        PaymentMethod savedPaymentMethod = entityManager.persistAndFlush(paymentMethod);

        ProjectedBudgetItems item = new ProjectedBudgetItems();
        item.setBudgetPeriod(savedPeriod);
        item.setCategory(savedCategory);
        item.setPaymentMethod(savedPaymentMethod);
        item.setType(ProjectedBudgetCategoryType.INCOME);
        item.setAccountAmount(BigDecimal.ZERO);
        item.setCashAmount(BigDecimal.ZERO);
        repository.save(item);

        repository.deleteByBudgetPeriodId(savedPeriod.getId());
        repository.flush(); 

        List<ProjectedBudgetItems> result = repository.findByBudgetPeriodId(savedPeriod.getId());
        assertTrue(result.isEmpty());
    }
}
