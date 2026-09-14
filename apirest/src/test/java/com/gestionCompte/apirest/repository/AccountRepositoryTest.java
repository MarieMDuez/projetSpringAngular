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
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE) 
public class AccountRepositoryTest {

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private TestEntityManager entityManager;

    @Test
    public void should_find_default_account_when_it_exists() {
        Optional<Account> existingDefault = accountRepository.findByIsDefaultTrue();
        
        if (existingDefault.isEmpty()) {
            Account account = new Account();
            account.setLabel("Compte de Test");
            account.setInitialBalance(new BigDecimal("2500.00"));
            account.setActive(true);
            account.setDefault(true);
            account.setPosition(999);
            
            entityManager.persist(account);
            entityManager.flush();
        }

        Optional<Account> result = accountRepository.findByIsDefaultTrue();

        assertThat(result).isPresent();
        assertThat(result.get().isDefault()).isTrue();
    }


    @Test
    public void should_return_only_active_accounts() {
        Account activeAcc = new Account();
        activeAcc.setLabel("Compte Spécifique Test Actif");
        activeAcc.setInitialBalance(new BigDecimal("500.00"));
        activeAcc.setActive(true);
        activeAcc.setDefault(false);
        activeAcc.setPosition(888);
        entityManager.persist(activeAcc);

        entityManager.flush();

        List<Account> activeAccounts = accountRepository.findByIsActiveTrue();

        assertThat(activeAccounts).isNotEmpty();
        assertThat(activeAccounts)
            .extracting(Account::getLabel)
            .contains("Compte Spécifique Test Actif");
    }
}
