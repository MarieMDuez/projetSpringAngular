package com.gestionCompte.apirest.services;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gestionCompte.apirest.exception.ErrorMessages;
import com.gestionCompte.apirest.exception.ResourceNotFoundException;
import com.gestionCompte.apirest.model.ProjectedBudgetSettings;
import com.gestionCompte.apirest.repository.ProjectedBudgetSettingsRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ProjectedBudgetSettingsService {

	private final ProjectedBudgetSettingsRepository projectedBudgetSettingsRepository;

	public List<ProjectedBudgetSettings> getAllProjectedBudgetSettings() {
		return projectedBudgetSettingsRepository.findAll();
	}

	public ProjectedBudgetSettings saveProjectedBudgetSettings(Long id, ProjectedBudgetSettings setting) {

		if (id != null) {
			if (!projectedBudgetSettingsRepository.existsById(id)) {
				throw new ResourceNotFoundException(ErrorMessages.SETTING_NOT_FOUND + id);
			}
			setting.setId(id);
		}
		return projectedBudgetSettingsRepository.save(setting);
	}

	public void deleteProjectedBudgetSettings(Long id) {
		if (!projectedBudgetSettingsRepository.existsById(id)) {
			throw new ResourceNotFoundException(ErrorMessages.SETTING_NOT_FOUND + id);
		}
		projectedBudgetSettingsRepository.deleteById(id);
	}

	@Transactional
	public List<ProjectedBudgetSettings> saveAll(List<ProjectedBudgetSettings> settings) {
		    return projectedBudgetSettingsRepository.saveAll(settings);

	}

}
