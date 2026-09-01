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
// 🎯 GARANTIE ANTI-CRASH : Force Spring à utiliser votre configuration de BDD standard pour le test
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
public class TransactionRepositoryTest {

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private TestEntityManager entityManager;

    @Test
    public void should_return_true_when_transactions_exist_by_related_ids() {
        // 1. Arrange (Given) : Création et persistance des entités parentes obligatoires
        Account account = new Account();
        account.setLabel("Compte Courant Test");
        // Typage strict en FinTech : utilisation de BigDecimal
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

        // Création de la transaction liée à ces entités
        Transaction tx = new Transaction();
        tx.setAmount(new BigDecimal("75.50"));
        // Typage strict moderne : utilisation de LocalDate
        tx.setEmissionDate(LocalDate.now());
        tx.setDescription("Achat supermarché");
        
        // Liaison des relations vers les entités que l'on vient de générer juste au-dessus
        tx.setAccount(account);
        tx.setCategory(category);
        tx.setPaymentMethod(paymentMethod);

        // Si votre modèle possède un type (DEBIT/CREDIT) géré par une Enum Java native, 
        // décommentez et ajustez la ligne suivante :
        tx.setType(TransactionType.DEBIT);

        entityManager.persist(tx);
        entityManager.flush(); // On force l'écriture en base de données pour le test

        // 2. Act (When) : Interrogation de vos trois méthodes personnalisées du Repository
        boolean accountExists = transactionRepository.existsByAccountId(account.getId());
        boolean categoryExists = transactionRepository.existsByCategoryId(category.getId());
        boolean paymentMethodExists = transactionRepository.existsByPaymentMethodId(paymentMethod.getId());

        // 3. Assert (Then) : On valide que le contrat de votre Repository est respecté
        assertThat(accountExists).isTrue();
        assertThat(categoryExists).isTrue();
        assertThat(paymentMethodExists).isTrue();
    }

    @Test
    public void should_return_false_when_no_transactions_are_linked_to_ids() {
        // Act & Assert : Pour un ID imaginaire, vos méthodes de vérification doivent répondre false
        boolean accountExists = transactionRepository.existsByAccountId(999L);
        assertThat(accountExists).isFalse();
    }
}
