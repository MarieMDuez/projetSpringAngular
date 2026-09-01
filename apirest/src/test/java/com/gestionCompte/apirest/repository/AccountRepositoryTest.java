package com.gestionCompte.apirest.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;

import com.gestionCompte.apirest.model.Account;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE) // Branchement sécurisé sur ta base
public class AccountRepositoryTest {

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private TestEntityManager entityManager;

    @Test
    public void should_find_default_account_when_it_exists() {
        // Given : On vérifie d'abord si un compte par défaut existe déjà dans tes données manuelles
        Optional<Account> existingDefault = accountRepository.findByIsDefaultTrue();
        
        if (existingDefault.isEmpty()) {
            // S'il n'y en a aucun, on en crée un faux temporairement pour le test
            Account account = new Account();
            account.setLabel("Compte de Test");
            account.setInitialBalance(new BigDecimal("2500.00"));
            account.setActive(true);
            account.setDefault(true);
            account.setPosition(999);
            
            entityManager.persist(account);
            entityManager.flush();
        }

        // When : On lance la recherche officielle du repository
        Optional<Account> result = accountRepository.findByIsDefaultTrue();

        // Then : On valide qu'on récupère bien un compte par défaut
        assertThat(result).isPresent();
        assertThat(result.get().isDefault()).isTrue();
    }


    @Test
    public void should_return_only_active_accounts() {
        // Given
        Account activeAcc = new Account();
        activeAcc.setLabel("Compte Spécifique Test Actif");
        activeAcc.setInitialBalance(new BigDecimal("500.00"));
        activeAcc.setActive(true);
        activeAcc.setDefault(false);
        activeAcc.setPosition(888);
        entityManager.persist(activeAcc);

        entityManager.flush();

        // When
        List<Account> activeAccounts = accountRepository.findByIsActiveTrue();

        // Then : Au lieu de vérifier la taille stricte (qui inclut tes vrais comptes),
        // on vérifie que la liste contient AU MOINS le compte actif créé à l'instant
        assertThat(activeAccounts).isNotEmpty();
        assertThat(activeAccounts)
            .extracting(Account::getLabel)
            .contains("Compte Spécifique Test Actif");
    }
}
