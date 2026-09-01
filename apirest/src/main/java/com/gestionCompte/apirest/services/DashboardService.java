package com.gestionCompte.apirest.services;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.gestionCompte.apirest.dto.BalanceDashboardDto;
import com.gestionCompte.apirest.model.Account;
import com.gestionCompte.apirest.model.Transaction;
import com.gestionCompte.apirest.model.TransactionType;
import com.gestionCompte.apirest.repository.AccountRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final AccountRepository accountRepository;
    private final TransactionService transactionService; 

    public BalanceDashboardDto getDynamicBalance(Long accountId) {
        
        List<Transaction> transactions = transactionService.getFilteredTransactions(
                accountId, null, null, null, null, null, null, null, null, null, null, null);
        
        BigDecimal baseInitialBalance = BigDecimal.ZERO;
        
        if (accountId != null) {
            Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found with id: " + accountId));
            baseInitialBalance = account.getInitialBalance();
        } else {
            baseInitialBalance = accountRepository.findByIsActiveTrue().stream()
                    .map(Account::getInitialBalance)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        }
        
        BigDecimal currentBalance = baseInitialBalance;
        BigDecimal provisionalBalance = baseInitialBalance;
        
        for (Transaction t : transactions) {
            if (t.isChecked()) {
                currentBalance = (t.getType() == TransactionType.DEBIT) 
                    ? currentBalance.subtract(t.getAmount()) 
                    : currentBalance.add(t.getAmount());
            }
            provisionalBalance = (t.getType() == TransactionType.DEBIT) 
                ? provisionalBalance.subtract(t.getAmount()) 
                : provisionalBalance.add(t.getAmount());
        }
        
        BalanceDashboardDto dto = new BalanceDashboardDto();
        dto.setId(accountId);
        dto.setLabel(accountId != null ? "Vue Compte Unique" : "Vue Globale (Tous les comptes)");
        dto.setInitialBalance(baseInitialBalance);
        dto.setCurrentBalance(currentBalance);
        dto.setProvisionalBalance(provisionalBalance);
        
        return dto;
    }
}
