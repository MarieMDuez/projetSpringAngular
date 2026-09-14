package com.gestionCompte.apirest.dto;

import java.math.BigDecimal;

import lombok.Data;

@Data
public class BalanceDashboardDto {
	private Long id;
	private String label;
	private BigDecimal initialBalance;
	private BigDecimal currentBalance;
	private BigDecimal projectedBalance;
}
