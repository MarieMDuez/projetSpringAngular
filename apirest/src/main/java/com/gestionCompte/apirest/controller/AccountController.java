package com.gestionCompte.apirest.controller;

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
import org.springframework.web.bind.annotation.RestController;

import com.gestionCompte.apirest.model.Account;
import com.gestionCompte.apirest.services.AccountService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/account")
@CrossOrigin(origins = "http://localhost:4200")
@RequiredArgsConstructor
public class AccountController {

	private final AccountService accountService;

	@GetMapping("/default")
	public ResponseEntity<Account> getDefaultAccount() {
	    return accountService.getDefaultAccount()
	        .map(ResponseEntity::ok)
	        .orElse(ResponseEntity.noContent().build());
	}

	@GetMapping
    public ResponseEntity<List<Account>> getAllAccounts() {
        List<Account> accounts = accountService.getAllAccounts();
        return ResponseEntity.ok(accounts);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Account> getAccountById(@PathVariable Long id) {
        Account account = accountService.getAccountById(id);
        return ResponseEntity.ok(account);
    }
    @PostMapping
    public ResponseEntity<Account> createAccount(@RequestBody Account account) {
        Account createdAccount = accountService.createAccount(account);
        return new ResponseEntity<>(createdAccount, HttpStatus.CREATED);
    }

    @PostMapping("/saveAll")
    public ResponseEntity<List<Account>> saveAll(@RequestBody List<Account> accounts) {
        List<Account> accountsSaved = accountService.saveAll(accounts);
        return ResponseEntity.ok(accountsSaved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Account> updateAccount(@PathVariable Long id, @RequestBody Account accountDetails) {
        Account updatedAccount = accountService.updateAccount(id, accountDetails);
        return ResponseEntity.ok(updatedAccount);
    }

    @PutMapping("/{id}/set-default")
    public ResponseEntity<Account> setDefaultAccount(@PathVariable Long id) {
        Account updatedAccount = accountService.setDefaultAccount(id);
        return ResponseEntity.ok(updatedAccount);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Boolean> deleteAccount(@PathVariable Long id) {
        boolean isHardDeleted = accountService.deleteAccount(id);
        return ResponseEntity.ok(isHardDeleted);
    }

    @PutMapping("/{id}/set-active")
    public ResponseEntity<Account> setActiveAccount(@PathVariable Long id) {
        Account updatedAccount = accountService.setActiveAccount(id);
        return ResponseEntity.ok(updatedAccount);
    }
}
