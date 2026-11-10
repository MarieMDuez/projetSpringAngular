package com.gestionCompte.apirest.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.gestionCompte.apirest.exception.ErrorMessages;
import com.gestionCompte.apirest.exception.ResourceAlreadyExistsException;
import com.gestionCompte.apirest.exception.ResourceNotFoundException;
import com.gestionCompte.apirest.model.PaymentMethod;
import com.gestionCompte.apirest.services.PaymentMethodService;

/**
 * Tests de la couche HTTP de PaymentMethodController (même principe que CategoryControllerTest).
 */
@WebMvcTest(PaymentMethodController.class)
class PaymentMethodControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private PaymentMethodService paymentMethodService;

    private PaymentMethod buildPaymentMethod(Long id, String label, boolean active) {
        PaymentMethod paymentMethod = new PaymentMethod();
        paymentMethod.setId(id);
        paymentMethod.setLabel(label);
        paymentMethod.setActive(active);
        return paymentMethod;
    }

    private static RuntimeException notFound( int id) {
        return new ResourceNotFoundException(ErrorMessages.PAYMENT_METHOD_NOT_FOUND + id);
    }

    private static RuntimeException conflict() {
        return new ResourceAlreadyExistsException(ErrorMessages.PAYMENT_METHOD_ALREADY_EXISTS);
    }

    // ------------------------------------------------------------------
    // Lecture
    // ------------------------------------------------------------------

    @Test
    void should_return_all_payment_methods() throws Exception {
        when(paymentMethodService.getAllPaymentMethods()).thenReturn(
                List.of(buildPaymentMethod(1L, "Carte bancaire", true), buildPaymentMethod(2L, "Chèque", false)));

        mockMvc.perform(get("/api/payment_methods"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].label").value("Carte bancaire"))
                // Le front Angular lit "isActive" : ce nom de champ fait partie du contrat de l'API
                .andExpect(jsonPath("$[0].isActive").value(true))
                .andExpect(jsonPath("$[1].isActive").value(false));
    }

    @Test
    void should_return_active_payment_methods() throws Exception {
        when(paymentMethodService.getAllActivePaymentMethods())
                .thenReturn(List.of(buildPaymentMethod(1L, "Carte bancaire", true)));

        mockMvc.perform(get("/api/payment_methods/activ"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].label").value("Carte bancaire"));
    }

    @Test
    void should_return_payment_method_by_id() throws Exception {
        when(paymentMethodService.getPaymentMethodById(1L))
                .thenReturn(buildPaymentMethod(1L, "Carte bancaire", true));

        mockMvc.perform(get("/api/payment_methods/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.label").value("Carte bancaire"));
    }

    @Test
    void should_return_404_when_payment_method_does_not_exist() throws Exception {
        when(paymentMethodService.getPaymentMethodById(99L)).thenThrow(notFound(99));

        mockMvc.perform(get("/api/payment_methods/99"))
                .andExpect(status().isNotFound());
    }

    @Test
    void should_return_400_when_id_is_not_a_number() throws Exception {
        mockMvc.perform(get("/api/payment_methods/abc"))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(paymentMethodService);
    }

    // ------------------------------------------------------------------
    // Création
    // ------------------------------------------------------------------

    @Test
    void should_create_payment_method_and_return_201() throws Exception {
        when(paymentMethodService.createPaymentMethod(any(PaymentMethod.class)))
                .thenReturn(buildPaymentMethod(5L, "Virement", true));

        mockMvc.perform(post("/api/payment_methods")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"label": "Virement", "isActive": false}
                        """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(5))
                .andExpect(jsonPath("$.label").value("Virement"));

        ArgumentCaptor<PaymentMethod> captor = ArgumentCaptor.forClass(PaymentMethod.class);
        verify(paymentMethodService).createPaymentMethod(captor.capture());
        assertThat(captor.getValue().getLabel()).isEqualTo("Virement");
        // Le JSON envoyé par le front utilise "isActive" : on vérifie qu'il est bien lu
        assertThat(captor.getValue().isActive()).isFalse();
    }

    @Test
    void should_return_409_when_creating_a_payment_method_whose_name_already_exists() throws Exception {
        when(paymentMethodService.createPaymentMethod(any(PaymentMethod.class))).thenThrow(conflict());

        mockMvc.perform(post("/api/payment_methods")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"label\": \"Virement\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    void should_return_400_and_not_call_the_service_when_json_is_malformed() throws Exception {
        mockMvc.perform(post("/api/payment_methods")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"label\": "))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(paymentMethodService);
    }

    @Test
    @SuppressWarnings("unchecked")
    void should_save_all_payment_methods_and_return_them() throws Exception {
        when(paymentMethodService.saveAll(any())).thenReturn(
                List.of(buildPaymentMethod(1L, "A", true), buildPaymentMethod(2L, "B", true)));

        mockMvc.perform(post("/api/payment_methods/saveAll")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        [{"id": 1, "label": "A", "position": 0}, {"id": 2, "label": "B", "position": 1}]
                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));

        ArgumentCaptor<List<PaymentMethod>> captor = ArgumentCaptor.forClass(List.class);
        verify(paymentMethodService).saveAll(captor.capture());
        assertThat(captor.getValue()).extracting(PaymentMethod::getLabel, PaymentMethod::getPosition)
                .containsExactly(tuple("A", 0), tuple("B", 1));
    }

    // ------------------------------------------------------------------
    // Modification, suppression, réactivation
    // ------------------------------------------------------------------

    @Test
    void should_update_payment_method() throws Exception {
        when(paymentMethodService.updatePaymentMethod(eq(5L), any(PaymentMethod.class)))
                .thenReturn(buildPaymentMethod(5L, "Nouveau nom", true));

        mockMvc.perform(put("/api/payment_methods/5")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"label\": \"Nouveau nom\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.label").value("Nouveau nom"));

        ArgumentCaptor<PaymentMethod> captor = ArgumentCaptor.forClass(PaymentMethod.class);
        verify(paymentMethodService).updatePaymentMethod(eq(5L), captor.capture());
        assertThat(captor.getValue().getLabel()).isEqualTo("Nouveau nom");
    }

    @Test
    void should_return_404_when_updating_a_payment_method_that_does_not_exist() throws Exception {
        when(paymentMethodService.updatePaymentMethod(eq(99L), any(PaymentMethod.class))).thenThrow(notFound(99));

        mockMvc.perform(put("/api/payment_methods/99")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"label\": \"Peu importe\"}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void should_return_true_when_payment_method_is_hard_deleted() throws Exception {
        when(paymentMethodService.deletePaymentMethod(5L)).thenReturn(true);

        mockMvc.perform(delete("/api/payment_methods/5"))
                .andExpect(status().isOk())
                .andExpect(content().string("true"));
    }

    @Test
    void should_return_false_when_payment_method_is_only_deactivated() throws Exception {
        when(paymentMethodService.deletePaymentMethod(5L)).thenReturn(false);

        mockMvc.perform(delete("/api/payment_methods/5"))
                .andExpect(status().isOk())
                .andExpect(content().string("false"));
    }

    @Test
    void should_return_404_when_deleting_a_payment_method_that_does_not_exist() throws Exception {
        when(paymentMethodService.deletePaymentMethod(99L)).thenThrow(notFound(99));

        mockMvc.perform(delete("/api/payment_methods/99"))
                .andExpect(status().isNotFound());
    }

    @Test
    void should_reactivate_payment_method() throws Exception {
        when(paymentMethodService.setActivePaymentMethod(5L))
                .thenReturn(buildPaymentMethod(5L, "Chèque", true));

        mockMvc.perform(put("/api/payment_methods/5/set-active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isActive").value(true));
    }

    @Test
    void should_return_404_when_reactivating_a_payment_method_that_does_not_exist() throws Exception {
        when(paymentMethodService.setActivePaymentMethod(99L)).thenThrow(notFound(99));

        mockMvc.perform(put("/api/payment_methods/99/set-active"))
                .andExpect(status().isNotFound());
    }
}
