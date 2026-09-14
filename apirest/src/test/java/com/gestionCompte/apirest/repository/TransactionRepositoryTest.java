package com.gestionCompte.apirest.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;

import com.gestionCompte.apirest.model.Account;
import com.gestionCompte.apirest.model.Category;
import com.gestionCompte.apirest.model.PaymentMethod;
import com.gestionCompte.apirest.model.Transaction;
import com.gestionCompte.apirest.model.TransactionType;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
public class TransactionRepositoryTest {

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private TestEntityManager entityManager;

    @Test
    public void should_return_true_when_transactions_exist_by_related_ids() {
        Account account = new Account();
        account.setLabel("Compte Courant Test");
        account.setInitialBalance(new BigDecimal("1000.00"));
        account.setActive(true);
        account.setDefault(false);
        account = entityManager.persist(account);

        Category category = new Category();
        category.setLabel("Alimentation Test");
        category.setActive(true);
        category = entityManager.persist(category);

        PaymentMethod paymentMethod = new PaymentMethod();
        paymentMethod.setLabel("Carte Bancaire Test");
        paymentMethod.setActive(true);
        paymentMethod = entityManager.persist(paymentMethod);

        Transaction tx = new Transaction();
        tx.setAmount(new BigDecimal("75.50"));
        tx.setEmissionDate(LocalDate.now());
        tx.setDescription("Achat supermarché");
        
        tx.setAccount(account);
        tx.setCategory(category);
        tx.setPaymentMethod(paymentMethod);

        tx.setType(TransactionType.DEBIT);

        entityManager.persist(tx);
        entityManager.flush(); 

        boolean accountExists = transactionRepository.existsByAccountId(account.getId());
        boolean categoryExists = transactionRepository.existsByCategoryId(category.getId());
        boolean paymentMethodExists = transactionRepository.existsByPaymentMethodId(paymentMethod.getId());

        assertThat(accountExists).isTrue();
        assertThat(categoryExists).isTrue();
        assertThat(paymentMethodExists).isTrue();
    }

    @Test
    public void should_return_false_when_no_transactions_are_linked_to_ids() {
        boolean accountExists = transactionRepository.existsByAccountId(999L);
        assertThat(accountExists).isFalse();
    }
}
