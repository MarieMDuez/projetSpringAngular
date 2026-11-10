package com.gestionCompte.apirest.dto;

import lombok.Value;

@Value
public class PeriodConflictErrorDto {
    String error = "Conflict";
    Integer status = 409;
    String message;
    ProjectedBudgetPeriodDto period;
}
