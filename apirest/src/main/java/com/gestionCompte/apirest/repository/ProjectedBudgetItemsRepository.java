package com.gestionCompte.apirest.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.gestionCompte.apirest.model.ProjectedBudgetItems;

public interface ProjectedBudgetItemsRepository extends JpaRepository<ProjectedBudgetItems, Long>{
	List<ProjectedBudgetItems> findByBudgetPeriodId(Long budgetPeriodId);

	void deleteByBudgetPeriodId(Long periodId);

}
