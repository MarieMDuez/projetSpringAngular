package com.gestionCompte.apirest.repository;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import com.gestionCompte.apirest.model.Transaction;

public interface TransactionRepository extends JpaRepository<Transaction, Long>, JpaSpecificationExecutor<Transaction>{
	boolean existsByAccountId(Long accoundId);
	boolean existsByCategoryId(Long categoryId);
	boolean existsByPaymentMethodId(Long paymentMethodId);
	@Query("SELECT DISTINCT t.recurrenceMonths FROM Transaction t ORDER BY t.recurrenceMonths ASC")
	List<Integer> findDistinctRecurrenceMonths();
	List<Transaction> findByRecurrenceMonthsGreaterThan(Integer rec);
	List<Transaction> findByAccountIdAndRecurrenceMonthsGreaterThan(Long accountId, int rec);
	boolean existsByParentTransactionIdAndEmissionDate(Long parentId, LocalDate date);
}
