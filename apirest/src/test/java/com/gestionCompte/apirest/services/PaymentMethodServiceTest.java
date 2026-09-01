package com.gestionCompte.apirest.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import com.gestionCompte.apirest.model.PaymentMethod;
import com.gestionCompte.apirest.repository.PaymentMethodRepository;
import com.gestionCompte.apirest.repository.TransactionRepository;

@ExtendWith(MockitoExtension.class)
public class PaymentMethodServiceTest {

    @Mock
    private PaymentMethodRepository paymentMethodRepository;

    @Mock
    private TransactionRepository transactionRepository;

    @InjectMocks
    private PaymentMethodService paymentMethodService;

    // =========================================================================
    // TESTS : DELETE PAYMENT METHOD (Soft VS Hard)
    // =========================================================================

    @Test
    public void should_perform_soft_delete_and_return_false_if_payment_method_has_transactions() {
        // Given
        PaymentMethod pm = new PaymentMethod();
        pm.setId(3L);
        pm.setLabel("Chèque");
        pm.setActive(true); // Syntaxe sécurisée Lombok

        when(paymentMethodRepository.findById(3L)).thenReturn(Optional.of(pm));
        // On simule que ce moyen de paiement est utilisé dans les transactions
        when(transactionRepository.existsByPaymentMethodId(3L)).thenReturn(true);
        when(paymentMethodRepository.save(any(PaymentMethod.class))).thenReturn(pm);

        // When
        boolean isHardDeleted = paymentMethodService.deletePaymentMethod(3L);

        // Then
        assertThat(isHardDeleted).isFalse();
        assertThat(pm.isActive()).isFalse(); // Archivage logique ok
        verify(paymentMethodRepository, times(1)).save(pm);
        verify(paymentMethodRepository, never()).delete(any(PaymentMethod.class));
    }

    @Test
    public void should_perform_hard_delete_and_return_true_if_payment_method_has_no_transactions() {
        // Given
        PaymentMethod pm = new PaymentMethod();
        pm.setId(7L);

        when(paymentMethodRepository.findById(7L)).thenReturn(Optional.of(pm));
        when(transactionRepository.existsByPaymentMethodId(7L)).thenReturn(false);

        // When
        boolean isHardDeleted = paymentMethodService.deletePaymentMethod(7L);

        // Then
        assertThat(isHardDeleted).isTrue();
        verify(paymentMethodRepository, times(1)).delete(pm);
        verify(paymentMethodRepository, never()).save(any(PaymentMethod.class));
    }

    // =========================================================================
    // TESTS : GESTION DES EXCEPTIONS
    // =========================================================================

    @Test
    public void should_throw_404_not_found_when_payment_method_id_does_not_exist() {
        // Given
        when(paymentMethodRepository.findById(999L)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> paymentMethodService.getPaymentMethodById(999L))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("paymentMethod not found with id");
    }
}
