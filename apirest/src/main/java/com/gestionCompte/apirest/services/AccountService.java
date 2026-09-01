package com.gestionCompte.apirest.services;

import java.util.List;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.gestionCompte.apirest.model.Account;
import com.gestionCompte.apirest.repository.AccountRepository;
import com.gestionCompte.apirest.repository.TransactionRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AccountService {

	private final AccountRepository accountRepository;
	private final TransactionRepository transactionRepository;

	public List<Account> getAllAccounts() {
		return accountRepository.findAll();
	}

	public Account getAccountById(Long id) {
		return accountRepository.findById(id).orElseThrow(
				() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found with id: " + id));
	}

	public Account createAccount(Account account) {
		return accountRepository.save(account);
	}

	public Account updateAccount(Long id, Account accountDetails) {
		Account existingAccountRepository = accountRepository.findById(id).orElseThrow(
				() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found with id: " + id));

		existingAccountRepository.setLabel(accountDetails.getLabel());
		existingAccountRepository.setInitialBalance(accountDetails.getInitialBalance());
	
		return accountRepository.save(accountDetails);
	}

	public Optional<Account> getDefaultAccount() {
		return accountRepository.findByIsDefaultTrue();
	}

	public Account setDefaultAccount(Long accountId) {
		Account newDefaultAccount = accountRepository.findById(accountId)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found"));


		accountRepository.findByIsDefaultTrue().ifPresent(oldDefault -> {
			oldDefault.setDefault(false);
			accountRepository.save(oldDefault);
		});

		newDefaultAccount.setDefault(true);

		return accountRepository.save(newDefaultAccount);
	}


	public boolean deleteAccount(Long id) {

		Account account = accountRepository.findById(id).orElseThrow(
				() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found with id: " + id));
	
		boolean hasTransactions = transactionRepository.existsByAccountId(id);
		if (hasTransactions) {
			account.setActive(false);
			accountRepository.save(account);
			return false;
		} else {
			accountRepository.delete(account);
			return true;
		}
	}
	
	@Transactional
	public List<Account> saveAll(List<Account> accounts) {
	    return accountRepository.saveAll(accounts);
	}
}
