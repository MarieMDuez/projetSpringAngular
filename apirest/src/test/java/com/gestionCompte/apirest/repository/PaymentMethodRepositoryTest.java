package com.gestionCompte.apirest.repository;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;

import com.gestionCompte.apirest.model.PaymentMethod;


@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
public class PaymentMethodRepositoryTest {
	@Autowired
    private PaymentMethodRepository paymentMethodRepository;

    @Autowired
    private TestEntityManager entityManager;
    
    @Test
    public void should_return_only_active_categories() {
        String uniqueLabelActive = "PaymentMethod Test Active Unique";
        String uniqueLabelInactive = "PaymentMethod Test Inactive Unique";

        PaymentMethod activePaymentMethod = new PaymentMethod();
        activePaymentMethod.setLabel(uniqueLabelActive);
        activePaymentMethod.setActive(true);
        entityManager.persist(activePaymentMethod);

        PaymentMethod inactivePaymentMethod = new PaymentMethod();
        inactivePaymentMethod.setLabel(uniqueLabelInactive);
        inactivePaymentMethod.setActive(false);
        entityManager.persist(inactivePaymentMethod);

        entityManager.flush();

        List<PaymentMethod> activePaymentMethods = paymentMethodRepository.findByIsActiveTrue();

        boolean activeFound = false;
        boolean inactiveFound = false;

        for (PaymentMethod paymentMethod : activePaymentMethods) {
            if (paymentMethod.getLabel().equals(uniqueLabelActive)) activeFound = true;
            if (paymentMethod.getLabel().equals(uniqueLabelInactive)) inactiveFound = true;
        }

        if (!activeFound || inactiveFound) {
            throw new AssertionError("Échec : Le filtrage par statut actif ne fonctionne pas correctement !");
        }
    }
}
