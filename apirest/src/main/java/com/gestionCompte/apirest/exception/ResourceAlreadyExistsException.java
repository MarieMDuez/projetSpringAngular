package com.gestionCompte.apirest.exception;

import com.gestionCompte.apirest.dto.PeriodConflictErrorDto;
import com.gestionCompte.apirest.dto.ProjectedBudgetPeriodDto;

import lombok.Getter;

@Getter
public class ResourceAlreadyExistsException extends RuntimeException {
	private static final long serialVersionUID = 1L;
    private final transient PeriodConflictErrorDto errorDetails;
    
    public ResourceAlreadyExistsException(String message) {
        super(message);
        this.errorDetails = null;
    }

    public ResourceAlreadyExistsException(ProjectedBudgetPeriodDto periodDto) {
        super("Un budget prévisionnel existe déjà pour cette période.");
        this.errorDetails = new PeriodConflictErrorDto(
            "Un budget prévisionnel existe déjà pour cette période.",
            periodDto
        );
    }
}
