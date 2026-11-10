package com.gestionCompte.apirest.model;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Data;

@Data
@Entity
@Table (name = "projected_budget_items")
public class ProjectedBudgetItems {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

	@ManyToOne
	@JoinColumn(name = "budget_period_id", nullable = false)
	private ProjectedBudgetPeriod budgetPeriod;

	@Enumerated(EnumType.STRING)
	private ProjectedBudgetCategoryType type;
	@ManyToOne
	@JoinColumn(name = "payment_method_id", nullable = false)
	private PaymentMethod paymentMethod;

	@ManyToOne
	@JoinColumn(name = "category_id", nullable = false)
	private Category category;

	private BigDecimal accountAmount;
	private BigDecimal cashAmount;
	@Column(nullable = true)
	private String comment;



}
