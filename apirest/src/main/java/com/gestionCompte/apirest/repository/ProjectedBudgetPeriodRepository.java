package com.gestionCompte.apirest.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.gestionCompte.apirest.model.ProjectedBudgetPeriod;

public interface ProjectedBudgetPeriodRepository extends JpaRepository<ProjectedBudgetPeriod, Long>, JpaSpecificationExecutor<ProjectedBudgetPeriod>{
	Optional<ProjectedBudgetPeriod> findByAccountIdAndMonthAndYear(Long accountId, Integer month, Integer year);

	List<ProjectedBudgetPeriod> findByAccountId(Long accountId);

	boolean existsByAccountIdAndMonthAndYear(Long accountId, Integer month, Integer year);

}
