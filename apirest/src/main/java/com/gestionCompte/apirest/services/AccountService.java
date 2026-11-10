package com.gestionCompte.apirest.services;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gestionCompte.apirest.exception.ErrorMessages;
import com.gestionCompte.apirest.exception.ResourceAlreadyExistsException;
import com.gestionCompte.apirest.exception.ResourceNotFoundException;
import com.gestionCompte.apirest.model.Account;
import com.gestionCompte.apirest.repository.AccountRepository;
import com.gestionCompte.apirest.repository.TransactionRepository;

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
				() -> new ResourceNotFoundException(ErrorMessages.ACCOUNT_NOT_FOUND + id));
	}

	private void handleDefaultAccount(Long currentAccountId) {
	    accountRepository.findByIsDefaultTrue().ifPresent(oldDefault -> {
	        if (currentAccountId == null || !oldDefault.getId().equals(currentAccountId)) {
	            oldDefault.setDefault(false);
	            accountRepository.save(oldDefault);
	        }
	    });
	}

	public Account createAccount(Account account) {
		String cleanedLabel = account.getLabel().trim().replaceAll("\\s+", " ");
		account.setLabel(cleanedLabel);
		if(accountRepository.existsByLabelIgnoreCase(cleanedLabel)) {
			throw new ResourceAlreadyExistsException(ErrorMessages.ACCOUNT_ALREADY_EXISTS);
		}
		if (account.isDefault()) {
	        handleDefaultAccount(null);
	    }
		return accountRepository.save(account);
	}



	public Account updateAccount(Long id, Account accountDetails) {
		Account existingAccount = accountRepository.findById(id).orElseThrow(
				() -> new ResourceNotFoundException( ErrorMessages.ACCOUNT_NOT_FOUND + id));

		String cleanedLabel = accountDetails.getLabel().trim().replaceAll("\\s+", " ");
		accountDetails.setLabel(cleanedLabel);

		if (!existingAccount.getLabel().equalsIgnoreCase(accountDetails.getLabel())
		        && accountRepository.existsByLabelIgnoreCase(accountDetails.getLabel())) {
			throw new ResourceAlreadyExistsException(ErrorMessages.ACCOUNT_ALREADY_EXISTS);
		    }

		existingAccount.setLabel(accountDetails.getLabel());
		existingAccount.setType(accountDetails.getType());
		existingAccount.setInitialBalance(accountDetails.getInitialBalance());
		existingAccount.setDefault(accountDetails.isDefault());

		if (existingAccount.isDefault()) {
	        handleDefaultAccount(id);
	    }

		return accountRepository.save(existingAccount);
	}

	public Optional<Account> getDefaultAccount() {
		return accountRepository.findByIsDefaultTrue();
	}

	public Account setDefaultAccount(Long accountId) {
		Account newDefaultAccount = accountRepository.findById(accountId)
				.orElseThrow(() -> new ResourceNotFoundException( ErrorMessages.ACCOUNT_NOT_FOUND + accountId));

		handleDefaultAccount(accountId);

		newDefaultAccount.setDefault(true);

		return accountRepository.save(newDefaultAccount);
	}


	public boolean deleteAccount(Long id) {

		Account account = accountRepository.findById(id).orElseThrow(
				() -> new ResourceNotFoundException(ErrorMessages.ACCOUNT_NOT_FOUND + id));

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

	public Account setActiveAccount(Long accountId) {
		Account account = accountRepository.findById(accountId)
				.orElseThrow(() -> new ResourceNotFoundException(ErrorMessages.ACCOUNT_NOT_FOUND + accountId));

		account.setActive(true);

		return accountRepository.save(account);
	}



	@Transactional
	public List<Account> saveAll(List<Account> accounts) {
	    return accountRepository.saveAll(accounts);
	}
}
