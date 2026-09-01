package com.gestionCompte.apirest.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.gestionCompte.apirest.model.Account;

public interface AccountRepository extends JpaRepository<Account, Long> {
	List<Account> findByIsActiveTrue();
	Optional<Account> findByIsDefaultTrue();
}
