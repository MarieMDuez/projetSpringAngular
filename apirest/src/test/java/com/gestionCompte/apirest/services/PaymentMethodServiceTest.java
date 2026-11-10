package com.gestionCompte.apirest.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.gestionCompte.apirest.exception.ErrorMessages;
import com.gestionCompte.apirest.exception.ResourceAlreadyExistsException;
import com.gestionCompte.apirest.exception.ResourceNotFoundException;
import com.gestionCompte.apirest.model.PaymentMethod;
import com.gestionCompte.apirest.repository.PaymentMethodRepository;
import com.gestionCompte.apirest.repository.TransactionRepository;


@ExtendWith(MockitoExtension.class)
class PaymentMethodServiceTest {

    @Mock
    private PaymentMethodRepository paymentMethodRepository;

    @Mock
    private TransactionRepository transactionRepository;

    @InjectMocks
    private PaymentMethodService paymentMethodService;

    // ------------------------------------------------------------------
    // Méthodes utilitaires
    // ------------------------------------------------------------------

    private PaymentMethod buildPaymentMethod(Long id, String label, boolean isActive) {
        PaymentMethod paymentMethod = new PaymentMethod();
        paymentMethod.setId(id);
        paymentMethod.setLabel(label);
        paymentMethod.setActive(isActive);
        return paymentMethod;
    }

    private void stubSaveReturnsArgument() {
        when(paymentMethodRepository.save(any(PaymentMethod.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }


    // ------------------------------------------------------------------
    // Lecture : getAllPaymentMethods / getAllActivPaymentMethods / getPaymentMethodById
    // ------------------------------------------------------------------

    @Test
    void should_return_all_payment_methods_from_repository() {
        List<PaymentMethod> paymentMethods = List.of(
                buildPaymentMethod(1L, "Carte bancaire", true),
                buildPaymentMethod(2L, "Chèque", false));
        when(paymentMethodRepository.findAllByOrderByPositionAsc()).thenReturn(paymentMethods);

        List<PaymentMethod> result = paymentMethodService.getAllPaymentMethods();

        assertThat(result).containsExactlyElementsOf(paymentMethods);
    }

    @Test
    void should_return_only_active_payment_methods_from_repository() {
        List<PaymentMethod> activePaymentMethods = List.of(
                buildPaymentMethod(1L, "Carte bancaire", true),
                buildPaymentMethod(3L, "Virement", true));
        when(paymentMethodRepository.findByIsActiveTrueOrderByPositionAsc()).thenReturn(activePaymentMethods);

        List<PaymentMethod> result = paymentMethodService.getAllActivePaymentMethods();

        assertThat(result).containsExactlyElementsOf(activePaymentMethods);
    }

    @Test
    void should_return_payment_method_when_id_exists() {
        PaymentMethod paymentMethod = buildPaymentMethod(1L, "Carte bancaire", true);
        when(paymentMethodRepository.findById(1L)).thenReturn(Optional.of(paymentMethod));

        PaymentMethod result = paymentMethodService.getPaymentMethodById(1L);

        assertThat(result).isSameAs(paymentMethod);
    }

    @Test
    void should_throw_not_found_exception_when_payment_method_id_does_not_exist() {
        when(paymentMethodRepository.findById(999L)).thenReturn(Optional.empty());
        
        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class, () -> {
        	paymentMethodService.getPaymentMethodById(999L);
        });

        assertEquals(ErrorMessages.PAYMENT_METHOD_NOT_FOUND + 999L, exception.getMessage());

    }

    // ------------------------------------------------------------------
    // createPaymentMethod
    // ------------------------------------------------------------------

    @Test
    void should_clean_label_and_save_when_creating_a_payment_method() {
        PaymentMethod toCreate = buildPaymentMethod(null, "   Carte    bancaire ", true);
        when(paymentMethodRepository.existsByLabelIgnoreCase("Carte bancaire")).thenReturn(false);
        stubSaveReturnsArgument();

        PaymentMethod result = paymentMethodService.createPaymentMethod(toCreate);

        assertThat(result.getLabel()).isEqualTo("Carte bancaire");
        verify(paymentMethodRepository).save(toCreate);
    }

    @Test
    void should_throw_conflict_when_creating_a_payment_method_whose_label_already_exists() {
        PaymentMethod toCreate = buildPaymentMethod(null, "  Chèque  ", true);
        when(paymentMethodRepository.existsByLabelIgnoreCase("Chèque")).thenReturn(true);
        
        ResourceAlreadyExistsException exception = assertThrows(ResourceAlreadyExistsException.class, () -> {
        	paymentMethodService.createPaymentMethod(toCreate);
        });

        assertEquals(ErrorMessages.PAYMENT_METHOD_ALREADY_EXISTS, exception.getMessage());


        verify(paymentMethodRepository, never()).save(any(PaymentMethod.class));
    }

    // ------------------------------------------------------------------
    // updatePaymentMethod
    // ------------------------------------------------------------------

    @Test
    void should_throw_not_found_exception_when_updating_a_payment_method_that_does_not_exist() {
        when(paymentMethodRepository.findById(999L)).thenReturn(Optional.empty());
        PaymentMethod details = buildPaymentMethod(null, "Peu importe", true);
        
        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class, () -> {
        	paymentMethodService.updatePaymentMethod(999L, details);
        });

        assertEquals(ErrorMessages.PAYMENT_METHOD_NOT_FOUND + 999L, exception.getMessage());

        verify(paymentMethodRepository, never()).save(any(PaymentMethod.class));
    }

    @Test
    void should_throw_conflict_when_updating_label_to_one_already_used_by_another_payment_method() {
        PaymentMethod existing = buildPaymentMethod(1L, "Chèque", true);
        PaymentMethod details = buildPaymentMethod(null, "Virement", true);
        when(paymentMethodRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(paymentMethodRepository.existsByLabelIgnoreCase("Virement")).thenReturn(true);
        
        ResourceAlreadyExistsException exception = assertThrows(ResourceAlreadyExistsException.class, () -> {
        	paymentMethodService.updatePaymentMethod(1L, details);
        });

        assertEquals(ErrorMessages.PAYMENT_METHOD_ALREADY_EXISTS, exception.getMessage());


        verify(paymentMethodRepository, never()).save(any(PaymentMethod.class));
    }

    @Test
    void should_allow_update_when_only_label_case_changes() {
        PaymentMethod existing = buildPaymentMethod(1L, "Chèque", true);
        PaymentMethod details = buildPaymentMethod(null, "CHÈQUE", true);
        when(paymentMethodRepository.findById(1L)).thenReturn(Optional.of(existing));
        stubSaveReturnsArgument();

        PaymentMethod result = paymentMethodService.updatePaymentMethod(1L, details);

        assertThat(result.getLabel()).isEqualTo("CHÈQUE");
        verify(paymentMethodRepository, never()).existsByLabelIgnoreCase(any());
    }

    @Test
    void should_clean_label_when_updating_a_payment_method() {
        PaymentMethod existing = buildPaymentMethod(1L, "Ancien", true);
        PaymentMethod details = buildPaymentMethod(null, "  Nouveau    nom ", true);
        when(paymentMethodRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(paymentMethodRepository.existsByLabelIgnoreCase("Nouveau nom")).thenReturn(false);
        stubSaveReturnsArgument();

        PaymentMethod result = paymentMethodService.updatePaymentMethod(1L, details);

        assertThat(result.getLabel()).isEqualTo("Nouveau nom");
        verify(paymentMethodRepository).save(existing);
    }

    @Test
    void should_only_update_label_and_ignore_other_fields() {
     
        PaymentMethod existing = buildPaymentMethod(1L, "Chèque", true);
        existing.setPosition(3);
        PaymentMethod details = buildPaymentMethod(null, "Chèque", false);
        details.setPosition(9);
        when(paymentMethodRepository.findById(1L)).thenReturn(Optional.of(existing));
        stubSaveReturnsArgument();

        PaymentMethod result = paymentMethodService.updatePaymentMethod(1L, details);

        assertThat(result.getPosition()).isEqualTo(3);
        assertThat(result.isActive()).isTrue();
    }

    // ------------------------------------------------------------------
    // deletePaymentMethod
    // ------------------------------------------------------------------

    @Test
    void should_perform_soft_delete_and_return_false_if_payment_method_has_transactions() {
        PaymentMethod paymentMethod = buildPaymentMethod(3L, "Chèque", true);
        when(paymentMethodRepository.findById(3L)).thenReturn(Optional.of(paymentMethod));
        when(transactionRepository.existsByPaymentMethodId(3L)).thenReturn(true);

        boolean deleted = paymentMethodService.deletePaymentMethod(3L);

        assertThat(deleted).isFalse();
        assertThat(paymentMethod.isActive()).isFalse();
        verify(paymentMethodRepository).save(paymentMethod);
        verify(paymentMethodRepository, never()).delete(any(PaymentMethod.class));
    }

    @Test
    void should_perform_hard_delete_and_return_true_if_payment_method_has_no_transactions() {
        PaymentMethod paymentMethod = buildPaymentMethod(7L, "Chèque", true);
        when(paymentMethodRepository.findById(7L)).thenReturn(Optional.of(paymentMethod));
        when(transactionRepository.existsByPaymentMethodId(7L)).thenReturn(false);

        boolean deleted = paymentMethodService.deletePaymentMethod(7L);

        assertThat(deleted).isTrue();
        verify(paymentMethodRepository).delete(paymentMethod);
        verify(paymentMethodRepository, never()).save(any(PaymentMethod.class));
    }

    @Test
    void should_throw_not_found_exception_when_deleting_a_payment_method_that_does_not_exist() {
        when(paymentMethodRepository.findById(999L)).thenReturn(Optional.empty());

        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class, () -> {
        	paymentMethodService.deletePaymentMethod(999L);
        });

        assertEquals(ErrorMessages.PAYMENT_METHOD_NOT_FOUND + 999L, exception.getMessage());
        
        verifyNoInteractions(transactionRepository);
        verify(paymentMethodRepository, never()).delete(any(PaymentMethod.class));
    }

    // ------------------------------------------------------------------
    // setActivePaymentMethod
    // ------------------------------------------------------------------

    @Test
    void should_reactivate_an_inactive_payment_method() {
        PaymentMethod paymentMethod = buildPaymentMethod(4L, "Ancien moyen", false);
        when(paymentMethodRepository.findById(4L)).thenReturn(Optional.of(paymentMethod));
        stubSaveReturnsArgument();

        PaymentMethod result = paymentMethodService.setActivePaymentMethod(4L);

        assertThat(result.isActive()).isTrue();
        verify(paymentMethodRepository).save(paymentMethod);
    }

    @Test
    void should_throw_404_when_activating_a_payment_method_that_does_not_exist() {
        when(paymentMethodRepository.findById(999L)).thenReturn(Optional.empty());
        
        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class, () -> {
        	paymentMethodService.setActivePaymentMethod(999L);
        });

        assertEquals(ErrorMessages.PAYMENT_METHOD_NOT_FOUND + 999L, exception.getMessage());
        
        verify(paymentMethodRepository, never()).save(any(PaymentMethod.class));
    }

    // ------------------------------------------------------------------
    // saveAll
    // ------------------------------------------------------------------

    @Test
    void should_delegate_saveAll_to_repository() {
        List<PaymentMethod> paymentMethods = List.of(
                buildPaymentMethod(1L, "A", true),
                buildPaymentMethod(2L, "B", true));
        when(paymentMethodRepository.saveAll(paymentMethods)).thenReturn(paymentMethods);

        List<PaymentMethod> result = paymentMethodService.saveAll(paymentMethods);

        assertThat(result).containsExactlyElementsOf(paymentMethods);
        verify(paymentMethodRepository).saveAll(paymentMethods);
    }
}