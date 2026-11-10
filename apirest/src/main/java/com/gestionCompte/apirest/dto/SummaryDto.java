package com.gestionCompte.apirest.dto;

import java.math.BigDecimal;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SummaryDto {
	BigDecimal currentGlobalBalance;
    BigDecimal projectedGlobalBalance;
    List<BalanceDashboardDto> accountsDetails;

}
