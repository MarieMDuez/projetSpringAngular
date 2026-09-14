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
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Ce nom existe déjà !");
		}
		if (account.isDefault()) {
	        handleDefaultAccount(null);
	    }
		return accountRepository.save(account);
	}



	public Account updateAccount(Long id, Account accountDetails) {
		Account existingAccount = accountRepository.findById(id).orElseThrow(
				() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found with id: " + id));
		
		String cleanedLabel = accountDetails.getLabel().trim().replaceAll("\\s+", " ");
		accountDetails.setLabel(cleanedLabel);
		
		if (!existingAccount.getLabel().equalsIgnoreCase(accountDetails.getLabel()) 
		        && accountRepository.existsByLabelIgnoreCase(accountDetails.getLabel())) {
		        throw new ResponseStatusException(HttpStatus.CONFLICT, "Ce nom de compte existe déjà !");
		    }

		existingAccount.setLabel(accountDetails.getLabel());
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
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found"));

		handleDefaultAccount(accountId);

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
	
	public Account setActiveAccount(Long accountId) {
		Account account = accountRepository.findById(accountId)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found"));

		account.setActive(true);

		return accountRepository.save(account);
	}
	
	
	
	@Transactional
	public List<Account> saveAll(List<Account> accounts) {
	    return accountRepository.saveAll(accounts);
	}
}
