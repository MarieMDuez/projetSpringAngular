package com.gestionCompte.apirest.controller;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.gestionCompte.apirest.model.Transaction;
import com.gestionCompte.apirest.services.TransactionService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("api/transactions")
@CrossOrigin(origins = "http://localhost:4200") 
@RequiredArgsConstructor
public class TransactionController {

	private final TransactionService transactionService;

	@GetMapping 
	public ResponseEntity<List<Transaction>> getAllTransactions() {
		List<Transaction> transactions = transactionService.getAllTransactions();
		return ResponseEntity.ok(transactions); 
	}

	@GetMapping("/{id}")
	public ResponseEntity<Transaction> getTransactionById(@PathVariable Long id) {
		Transaction transaction = transactionService.getTransactionById(id);
		return ResponseEntity.ok(transaction); 
	}

	@PostMapping 
	public ResponseEntity<Transaction> createTransaction(@Valid @RequestBody Transaction transaction) {
		Transaction createdTransaction = transactionService.createTransaction(transaction);
		return new ResponseEntity<>(createdTransaction, HttpStatus.CREATED);
	}

	@PutMapping("/{id}")
	public ResponseEntity<Transaction> update(@PathVariable Long id, @Valid @RequestBody Transaction details) {
		Transaction updated = transactionService.updateTransaction(id, details);
		return ResponseEntity.ok(updated);
	}

	@DeleteMapping("/{id}") 
	public ResponseEntity<Void> deleteTransaction(@PathVariable Long id) {
		transactionService.deleteTransaction(id);
		return ResponseEntity.noContent().build();
	}

	@GetMapping("/filter")
	public ResponseEntity<List<Transaction>> getTransactions(@RequestParam(required = false) Long accountId,
			@RequestParam(required = false) Long categoryId, @RequestParam(required = false) Long paymentMethodId,
			@RequestParam(required = false) Integer day, @RequestParam(required = false) Integer month, 
			@RequestParam(required = false) Integer year,
			@RequestParam(required = false) BigDecimal minAmount, @RequestParam(required = false) BigDecimal maxAmount,
			@RequestParam(required = false) String type, @RequestParam(required = false) Integer recurrenceMonths,
			@RequestParam(required = false) Boolean isChecked, @RequestParam(required = false) Integer limit) {

		List<Transaction> transactions = transactionService.getFilteredTransactions(accountId, categoryId,
				paymentMethodId, day, month, year, minAmount, maxAmount, type, isChecked, recurrenceMonths, limit);

		return ResponseEntity.ok(transactions);
	}
	
	@GetMapping("/recurrences/unique")
	public ResponseEntity<List<Integer>> getUniqueRecurrences() {
	    List<Integer> recurrences = transactionService.getUniqueRecurrenceMonths();
	    return ResponseEntity.ok(recurrences);
	}
	
	@PostMapping("/generate-recurrents")
	public ResponseEntity<Void> generateRecurrents(@RequestParam int month, @RequestParam int year) {
		transactionService.generateRecurrentTransactions(month, year);
		return ResponseEntity.ok().build(); 
	}

}
