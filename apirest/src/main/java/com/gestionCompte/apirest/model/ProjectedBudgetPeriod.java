package com.gestionCompte.apirest.model;

import java.time.LocalDate;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Data;

@Data
@Entity
@Table (name = "projected_budget_periods")
public class ProjectedBudgetPeriod {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

	@ManyToOne
	@JoinColumn(name = "account_id", nullable = false)
	private Account account;

	private Integer month;
	private Integer year;
	private Integer weeksCount;


	public LocalDate getPeriodDate() {
	    if (this.year != null && this.month != null) {
	        return LocalDate.of(this.year, this.month, 1);
	    }
	    return null;
	}
}
