package com.gestionCompte.apirest.model;

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
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString(exclude = {"category"})
@Entity
@Table(name = "projected_budget_settings")
public class ProjectedBudgetSettings {

	@Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private ProjectedBudgetCategoryType type ;

	@ManyToOne
	@JoinColumn(name = "category_id", nullable = false)
	private Category category;

}
