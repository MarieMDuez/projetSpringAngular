package com.gestionCompte.apirest.dto;

import com.gestionCompte.apirest.model.ProjectedBudgetPeriod;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ProjectedBudgetResponseDto {
    private ProjectedBudgetPeriod period;
    private SuggestedPeriodDataDto data;
}

