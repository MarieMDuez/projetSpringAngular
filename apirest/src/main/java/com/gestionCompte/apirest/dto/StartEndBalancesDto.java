package com.gestionCompte.apirest.dto;

import java.math.BigDecimal;

import lombok.Data;

@Data
public class StartEndBalancesDto {
		private Long id;
		private BigDecimal startBalance;
		private BigDecimal endBalance;
}
