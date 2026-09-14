package com.gestionCompte.apirest.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.isA;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.web.server.ResponseStatusException;

import com.gestionCompte.apirest.model.Transaction;
import com.gestionCompte.apirest.model.TransactionType;
import com.gestionCompte.apirest.repository.TransactionRepository;

@ExtendWith(MockitoExtension.class)
public class TransactionServiceTest {

    @Mock
    private TransactionRepository transactionRepository;

    @InjectMocks
    private TransactionService transactionService;

    @Test
    public void should_return_transactions_when_fetching_with_dynamic_specifications() {
        // Given
        Transaction tx = new Transaction();
        tx.setId(100L);
        tx.setAmount(new BigDecimal("50.00"));
        tx.setType(TransactionType.DEBIT);
        tx.setDescription("Abonnement");

        Page<Transaction> page = new PageImpl<>(List.of(tx));
        when(transactionRepository.findAll(ArgumentMatchers.<Specification<Transaction>>any(), isA(Pageable.class))).thenReturn(page);

        List<Transaction> result = transactionService.getFilteredTransactions(
                1L, null, null, null, null, null, new BigDecimal("100.00"), null, "DEBIT", true, null, 50
        );

        assertThat(result).isNotEmpty();
        assertThat(result.get(0).getId()).isEqualTo(100L);
        assertThat(result.get(0).getType()).isEqualTo(TransactionType.DEBIT);
        
        verify(transactionRepository, times(1)).findAll(ArgumentMatchers.<Specification<Transaction>>any(), isA(Pageable.class));
    }

    @Test
    public void should_include_is_checked_filter_when_fetching_transactions() {
        // Given
        Transaction tx = new Transaction();
        tx.setId(101L);
        tx.setAmount(new BigDecimal("12.50"));
        tx.setType(TransactionType.DEBIT);
        tx.setChecked(true);

        Page<Transaction> page = new PageImpl<>(List.of(tx));
        when(transactionRepository.findAll(ArgumentMatchers.<Specification<Transaction>>any(), isA(Pageable.class))).thenReturn(page);

        List<Transaction> result = transactionService.getFilteredTransactions(
                null, null, null, null, null, null, null, null, "DEBIT", true, null, 50
        );

        assertThat(result).isNotEmpty();
        assertThat(result.get(0).isChecked()).isTrue();
        verify(transactionRepository, times(1)).findAll(ArgumentMatchers.<Specification<Transaction>>any(), isA(Pageable.class));
    }

    @Test
    public void should_update_all_transaction_fields_accurately_when_updating() {
        Transaction existingTx = new Transaction();
        existingTx.setId(1L);
        existingTx.setDescription("Ancien libellé");
        existingTx.setChecked(false);

        Transaction updatedDetails = new Transaction();
        updatedDetails.setDescription("Nouveau libellé");
        updatedDetails.setAmount(new BigDecimal("120.50"));
        updatedDetails.setEmissionDate(LocalDate.now());
        updatedDetails.setType(TransactionType.CREDIT);
        updatedDetails.setChecked(true);

        when(transactionRepository.findById(1L)).thenReturn(Optional.of(existingTx));
        when(transactionRepository.save(existingTx)).thenReturn(existingTx);

        Transaction result = transactionService.updateTransaction(1L, updatedDetails);

        assertThat(result.getDescription()).isEqualTo("Nouveau libellé");
        assertThat(result.getAmount()).isEqualTo(new BigDecimal("120.50"));
        assertThat(result.getType()).isEqualTo(TransactionType.CREDIT);
        assertThat(result.isChecked()).isTrue();
        
        verify(transactionRepository, times(1)).save(existingTx);
    }

    @Test
    public void should_delete_transaction_successfully_if_id_exists() {
        when(transactionRepository.existsById(55L)).thenReturn(true);
        doNothing().when(transactionRepository).deleteById(55L);

        transactionService.deleteTransaction(55L);

        verify(transactionRepository, times(1)).deleteById(55L);
    }

    @Test
    public void should_throw_404_not_found_when_deleting_non_existent_transaction() {
        // Given
        when(transactionRepository.existsById(999L)).thenReturn(false);

        assertThatThrownBy(() -> transactionService.deleteTransaction(999L))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("Transaction not found with id");
        
        verify(transactionRepository, never()).deleteById(999L);
    }
}
