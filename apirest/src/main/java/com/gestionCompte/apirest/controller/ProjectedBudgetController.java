package com.gestionCompte.apirest.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.gestionCompte.apirest.dto.ProjectedBudgetResponseDto;
import com.gestionCompte.apirest.dto.SuggestedPeriodDataDto;
import com.gestionCompte.apirest.model.ProjectedBudgetItems;
import com.gestionCompte.apirest.model.ProjectedBudgetPeriod;
import com.gestionCompte.apirest.services.ProjectedBudgetService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/projected_budget")
@CrossOrigin(origins = "http://localhost:4200")
@RequiredArgsConstructor
public class ProjectedBudgetController {

	private final ProjectedBudgetService projectedBudgetService;

	@GetMapping("/items")
	public ResponseEntity<List<ProjectedBudgetItems>> getProjectedBudgetItemsByPeriodId(@RequestParam Long accountId,
			@RequestParam Integer month, @RequestParam Integer year) {
		List<ProjectedBudgetItems> items = projectedBudgetService.getProjectedBudgetItemsByAccountIdAndPeriod(accountId, month,
				year);
		return ResponseEntity.ok(items);
	}

	@GetMapping("/periods")
	public ResponseEntity<List<ProjectedBudgetPeriod>> getAvailablePeriodsForDuplication(@RequestParam Long accountId) {
		List<ProjectedBudgetPeriod> periods = projectedBudgetService.getAvailablePeriodsForDuplication(accountId);
		return ResponseEntity.ok(periods);
	}

	@GetMapping("/suggestions")
	public ResponseEntity<SuggestedPeriodDataDto> getSuggestedRecurrentTransactionsForPeriod(@RequestParam Long accountId,
			@RequestParam Integer month, @RequestParam Integer year) {
		SuggestedPeriodDataDto suggestions = projectedBudgetService.getSuggestedRecurrentTransactionsForPeriod(accountId, month,
				year);
		return ResponseEntity.ok(suggestions);
	}

	@PostMapping
	public ResponseEntity<ProjectedBudgetResponseDto> createProjectedBudgetPeriod(@RequestParam Long accountId,
			@RequestParam Integer month, @RequestParam Integer year, @RequestParam (required = false) Long cloneFromId) {
		ProjectedBudgetResponseDto response = projectedBudgetService.createProjectedBudgetPeriod(accountId, month,
				year, cloneFromId);
	    return new ResponseEntity<>(response, HttpStatus.CREATED);
	}

	@PutMapping("/{periodId}/items")
	public ResponseEntity<List<ProjectedBudgetItems>> updateProjectedBudgetItems(
	        @PathVariable Long periodId,
	        @RequestBody List<ProjectedBudgetItems> projectedBudgetItems) {

	    List<ProjectedBudgetItems> updatedProjectedBudgetItems = projectedBudgetService.updateProjectedBudgetItems(periodId, projectedBudgetItems);
	    return ResponseEntity.ok(updatedProjectedBudgetItems);
	}

	@PutMapping("/duplicateItems")
	public ResponseEntity<List<ProjectedBudgetItems>> executeDuplication(
			@RequestParam Long periodIdModel,
			@RequestParam Long periodIdCible) {

	    List<ProjectedBudgetItems> duplicatedProjectedBudgetItems = projectedBudgetService.duplicateItemsFromPeriod(periodIdModel, periodIdCible);
	    return ResponseEntity.ok(duplicatedProjectedBudgetItems);
	}


	@DeleteMapping("/{periodId}")
	public ResponseEntity<Boolean>deleteProjectedBudgetPeriod(@PathVariable Long periodId){
		projectedBudgetService.deleteProjectedBudgetPeriod(periodId);
		return ResponseEntity.noContent().build();
	}

}
