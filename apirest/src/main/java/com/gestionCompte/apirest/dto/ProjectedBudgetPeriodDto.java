package com.gestionCompte.apirest.dto;

import lombok.Value;

@Value
public class ProjectedBudgetPeriodDto {
    Long id;
    Long accountId;
    Integer month;
    Integer year;
    Integer weeksCount;
}
