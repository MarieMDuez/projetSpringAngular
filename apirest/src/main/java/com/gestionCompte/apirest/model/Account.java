package com.gestionCompte.apirest.model;

import java.math.BigDecimal;

import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

@Data
@Entity
@Table(name = "accounts")
public class Account {
	@Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
	
	
	@Column(nullable = false)
	private String label;
	
	@Column(nullable = false)
	private BigDecimal initialBalance;
	
	@JsonProperty("isActive")
	@Column(nullable = false)
	private boolean isActive = true;
	
	@JsonProperty("isDefault")
	@Column(nullable = false)
	private boolean isDefault = false;
	
	private Integer position;
}
