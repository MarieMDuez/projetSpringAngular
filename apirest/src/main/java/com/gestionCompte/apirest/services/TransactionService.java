package com.gestionCompte.apirest.services;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Month;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.List;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gestionCompte.apirest.exception.ErrorMessages;
import com.gestionCompte.apirest.exception.ResourceBadRequestException;
import com.gestionCompte.apirest.exception.ResourceNotFoundException;
import com.gestionCompte.apirest.model.AccountType;
import com.gestionCompte.apirest.model.Transaction;
import com.gestionCompte.apirest.model.TransactionType;
import com.gestionCompte.apirest.repository.TransactionRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class TransactionService {

	private final TransactionRepository transactionRepository;

	public List<Transaction> getAllTransactions() {
		return transactionRepository.findAll();
	}

	public Transaction getTransactionById(Long id) {
		return transactionRepository.findById(id).orElseThrow(
				() -> new ResourceNotFoundException(ErrorMessages.TRANSACTION_NOT_FOUND + id));
	}

	public List<Transaction> getFilteredTransactions(Long accountId, Long categoryId, Long paymentMethodId, Integer day,
			Integer month, Integer year, BigDecimal minAmount, BigDecimal maxAmount, String type, Boolean isChecked,
			Integer recurrenceMonths, Integer limit, AccountType accountType) {

		Specification<Transaction> spec = (root, query, cb) -> {
			var predicate = cb.conjunction();

			if (Long.class != query.getResultType()) {
				root.fetch("account", jakarta.persistence.criteria.JoinType.INNER);
				root.fetch("category", jakarta.persistence.criteria.JoinType.INNER);
				root.fetch("paymentMethod", jakarta.persistence.criteria.JoinType.INNER);
			}

			query.orderBy(cb.desc(root.get("emissionDate")));

			if (accountId != null) {
				predicate = cb.and(predicate, cb.equal(root.get("account").get("id"), accountId));
			}

			if (accountType != null) {
				predicate = cb.and(predicate, cb.equal(root.get("account").get("type"), accountType));
			}

			if (categoryId != null) {
				predicate = cb.and(predicate, cb.equal(root.get("category").get("id"), categoryId));
			}

			if (paymentMethodId != null) {
				predicate = cb.and(predicate, cb.equal(root.get("paymentMethod").get("id"), paymentMethodId));
			}

			if (year != null || month != null || day != null) {
				int startYear = (year != null) ? year : LocalDate.now(ZoneId.systemDefault()).getYear();
				int startMonth = (month != null) ? month : 1;
				int startDay = (day != null) ? day : 1;

				LocalDate startDate = LocalDate.of(startYear, startMonth, startDay);
				LocalDate endDate;

				if (day != null) {
					endDate = startDate;
				} else if (month != null) {
					endDate = startDate.with(TemporalAdjusters.lastDayOfMonth());
				} else {
					endDate = LocalDate.of(startYear, Month.DECEMBER, 31);
				}

				predicate = cb.and(predicate, cb.between(root.get("emissionDate"), startDate, endDate));
			}

			if (minAmount != null && maxAmount != null) {
				predicate = cb.and(predicate, cb.between(root.get("amount"), minAmount, maxAmount));
			}

			if (type != null && !type.trim().isEmpty()) {
				try {
					TransactionType typeEnum = TransactionType.valueOf(type.trim().toUpperCase());

					predicate = cb.and(predicate, cb.equal(root.get("type"), typeEnum));
				} catch (IllegalArgumentException e) {
					throw new ResourceBadRequestException(ErrorMessages.TRANSACTION_BAD_REQUEST + type);
				}
			}
			if (isChecked != null) {
				predicate = cb.and(predicate, cb.equal(root.get("isChecked"), isChecked));
			}
			if (recurrenceMonths != null) {
				predicate = cb.and(predicate, cb.equal(root.get("recurrenceMonths"), recurrenceMonths));
			}

			return predicate;
		};
		if (limit != null && limit > 0) {
			Pageable pageable = PageRequest.of(0, limit);
			return transactionRepository.findAll(spec, pageable).getContent();
		}
		return transactionRepository.findAll(spec);
	}

	public Transaction createTransaction(Transaction transaction) {
		return transactionRepository.save(transaction);
	}

	public Transaction updateTransaction(Long id, Transaction transactionDetails) {
		Transaction existingTransaction = transactionRepository.findById(id).orElseThrow(
				() -> new ResourceNotFoundException(ErrorMessages.TRANSACTION_NOT_FOUND + id));

		existingTransaction.setDescription(transactionDetails.getDescription());
		existingTransaction.setAmount(transactionDetails.getAmount());
		existingTransaction.setEmissionDate(transactionDetails.getEmissionDate());
		existingTransaction.setType(transactionDetails.getType());
		existingTransaction.setChecked(transactionDetails.isChecked());

		existingTransaction.setRecurrenceMonths(transactionDetails.getRecurrenceMonths());
		existingTransaction.setAlertTriggered(transactionDetails.isAlertTriggered());
		existingTransaction.setAccount(transactionDetails.getAccount());
		existingTransaction.setCategory(transactionDetails.getCategory());
		existingTransaction.setPaymentMethod(transactionDetails.getPaymentMethod());

		return transactionRepository.save(existingTransaction);
	}

	public void deleteTransaction(Long id) {
		if (!transactionRepository.existsById(id)) {
			throw new ResourceNotFoundException(ErrorMessages.TRANSACTION_NOT_FOUND + id);
		}
		transactionRepository.deleteById(id);
	}

	public List<Integer> getUniqueRecurrenceMonths() {
		return transactionRepository.findDistinctRecurrenceMonths();
	}

	@Transactional
	public void generateRecurrentTransactions(int targetMonth, int targetYear) {

		List<Transaction> recurrentTransactions = transactionRepository.findByRecurrenceMonthsGreaterThan(0);

		for (Transaction transaction : recurrentTransactions) {
			if (transaction.getAccount().isActive() && transaction.getCategory().isActive() && transaction.getPaymentMethod().isActive()) {
				int rec = transaction.getRecurrenceMonths();
				LocalDate dateTransaction = transaction.getEmissionDate();

				int expectedParentMonth = targetMonth - rec;
				int expedtedParentYear = targetYear;

				if (expectedParentMonth <= 0) {
					expectedParentMonth += 12;
					expedtedParentYear -= 1; // On recule d'une année si on passe sous janvier
				}

				if (dateTransaction.getMonthValue() == expectedParentMonth
						&& dateTransaction.getYear() == expedtedParentYear) {

					int targetDay = dateTransaction.getDayOfMonth();
					int maxDayInMonth = LocalDate.of(targetYear, targetMonth, 1).lengthOfMonth();
					int safeDay = Math.min(targetDay, maxDayInMonth);

					LocalDate targetDate = LocalDate.of(targetYear, targetMonth, safeDay);

					boolean isRecExist = transactionRepository
							.existsByParentTransactionIdAndEmissionDate(transaction.getId(), targetDate);

					if (!isRecExist) {
						Transaction newTransaction = new Transaction();

						newTransaction.setAccount(transaction.getAccount());
						newTransaction.setAmount(transaction.getAmount());
						newTransaction.setCategory(transaction.getCategory());
						newTransaction.setDescription(transaction.getDescription());
						newTransaction.setParentTransactionId(transaction.getId());
						newTransaction.setEmissionDate(targetDate);
						newTransaction.setPaymentMethod(transaction.getPaymentMethod());
						newTransaction.setRecurrenceMonths(transaction.getRecurrenceMonths());
						newTransaction.setType(transaction.getType());
						newTransaction.setAlertTriggered(false);
						newTransaction.setChecked(false);

						createTransaction(newTransaction);
					}
				}

			}
		}

	}

}
