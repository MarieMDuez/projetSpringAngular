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
import org.springframework.web.bind.annotation.RestController;

import com.gestionCompte.apirest.model.ProjectedBudgetSettings;
import com.gestionCompte.apirest.services.ProjectedBudgetSettingsService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/projected_budget_settings")
@CrossOrigin(origins = "http://localhost:4200")
@RequiredArgsConstructor
public class ProjectedBudgetSettingsController {

	private final ProjectedBudgetSettingsService projectedBudgetSettingsService;

	@GetMapping
	public ResponseEntity<List<ProjectedBudgetSettings>> getProjectedBudgetSettings() {
		List<ProjectedBudgetSettings> settings = projectedBudgetSettingsService.getAllProjectedBudgetSettings();
		return ResponseEntity.ok(settings);
	}

	@PostMapping
	public ResponseEntity<ProjectedBudgetSettings> createSetting(@Valid @RequestBody ProjectedBudgetSettings setting) {
		ProjectedBudgetSettings createdSetting = projectedBudgetSettingsService.saveProjectedBudgetSettings(null, setting);
		return new ResponseEntity<>(createdSetting, HttpStatus.CREATED);
	}
    @PostMapping("/saveAll")
    public ResponseEntity<List<ProjectedBudgetSettings>> saveAll(@RequestBody List<ProjectedBudgetSettings> settings) {
        List<ProjectedBudgetSettings> projectedBudgetSettingsSaved = projectedBudgetSettingsService.saveAll(settings);
        return ResponseEntity.ok(projectedBudgetSettingsSaved);
    }

	@PutMapping("/{id}")
	public ResponseEntity<ProjectedBudgetSettings> updateSetting(@PathVariable Long id, @RequestBody ProjectedBudgetSettings settingdDetails) {
		ProjectedBudgetSettings updatedSettings = projectedBudgetSettingsService
				.saveProjectedBudgetSettings(id, settingdDetails);
		return ResponseEntity.ok(updatedSettings);
	}
	@DeleteMapping("/{id}")
	public ResponseEntity<Void> deleteProjectedBudgetSettings(@PathVariable Long id) {
		projectedBudgetSettingsService.deleteProjectedBudgetSettings(id);
		return ResponseEntity.noContent().build();
	}
}
