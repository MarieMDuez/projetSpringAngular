package com.gestionCompte.apirest.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.gestionCompte.apirest.exception.ErrorMessages;
import com.gestionCompte.apirest.exception.ResourceNotFoundException;
import com.gestionCompte.apirest.model.ProjectedBudgetCategoryType;
import com.gestionCompte.apirest.model.ProjectedBudgetSettings;
import com.gestionCompte.apirest.repository.ProjectedBudgetSettingsRepository;

@ExtendWith(MockitoExtension.class)
class ProjectedBudgetSettingsServiceTest {

    @Mock
    private ProjectedBudgetSettingsRepository projectedBudgetSettingsRepository;

    @InjectMocks
    private ProjectedBudgetSettingsService projectedBudgetSettingsService;

    private ProjectedBudgetSettings buildSetting(Long id) {
        ProjectedBudgetSettings setting = new ProjectedBudgetSettings();
        setting.setId(id);
        setting.setType(ProjectedBudgetCategoryType.INCOME);
        return setting;
    }

    private void stubSaveReturnsArgument() {
        when(projectedBudgetSettingsRepository.save(any(ProjectedBudgetSettings.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    // ------------------------------------------------------------------
    // getAllProjectedBudgetSettings
    // ------------------------------------------------------------------

    @Test
    void should_return_all_settings_from_repository() {
        List<ProjectedBudgetSettings> settings = List.of(buildSetting(1L), buildSetting(2L));
        when(projectedBudgetSettingsRepository.findAll()).thenReturn(settings);

        List<ProjectedBudgetSettings> result = projectedBudgetSettingsService.getAllProjectedBudgetSettings();

        assertThat(result).containsExactlyElementsOf(settings);
    }

    @Test
    void should_return_empty_list_when_no_settings_exist() {
        when(projectedBudgetSettingsRepository.findAll()).thenReturn(List.of());

        assertThat(projectedBudgetSettingsService.getAllProjectedBudgetSettings()).isEmpty();
    }

    // ------------------------------------------------------------------
    // saveProjectedBudgetSettings
    // ------------------------------------------------------------------

    @Test
    void should_save_new_setting_without_checking_existence_when_id_is_null() {
        ProjectedBudgetSettings setting = buildSetting(null);
        stubSaveReturnsArgument();

        ProjectedBudgetSettings result = projectedBudgetSettingsService.saveProjectedBudgetSettings(null, setting);

        assertThat(result).isSameAs(setting);
        verify(projectedBudgetSettingsRepository, never()).existsById(any());
        verify(projectedBudgetSettingsRepository).save(setting);
    }

    @Test
    void should_force_the_id_from_the_path_when_updating_an_existing_setting() {
        ProjectedBudgetSettings setting = buildSetting(1L);
        when(projectedBudgetSettingsRepository.existsById(5L)).thenReturn(true);
        stubSaveReturnsArgument();

        ProjectedBudgetSettings result = projectedBudgetSettingsService.saveProjectedBudgetSettings(5L, setting);

        assertThat(result.getId()).isEqualTo(5L);
        verify(projectedBudgetSettingsRepository).save(setting);
    }

    @Test
    void should_throw_not_found_exception_when_updating_a_setting_that_does_not_exist() {
        ProjectedBudgetSettings setting = buildSetting(null);
        when(projectedBudgetSettingsRepository.existsById(99L)).thenReturn(false);
        
        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class, () -> {
        	projectedBudgetSettingsService.saveProjectedBudgetSettings(99L, setting);
        });

        assertEquals(ErrorMessages.SETTING_NOT_FOUND + 99L, exception.getMessage());

        verify(projectedBudgetSettingsRepository, never()).save(any(ProjectedBudgetSettings.class));
    }

    // ------------------------------------------------------------------
    // deleteProjectedBudgetSettings
    // ------------------------------------------------------------------

    @Test
    void should_delete_setting_when_it_exists() {
        when(projectedBudgetSettingsRepository.existsById(1L)).thenReturn(true);

        projectedBudgetSettingsService.deleteProjectedBudgetSettings(1L);

        verify(projectedBudgetSettingsRepository).deleteById(1L);
    }

    @Test
    void should_throw_not_found_exception_when_deleting_a_setting_that_does_not_exist() {
        when(projectedBudgetSettingsRepository.existsById(99L)).thenReturn(false);

        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class, () -> {
        	projectedBudgetSettingsService.deleteProjectedBudgetSettings(99L);
        });

        assertEquals(ErrorMessages.SETTING_NOT_FOUND + 99L, exception.getMessage());
        
        verify(projectedBudgetSettingsRepository, never()).deleteById(any());
    }

    // ------------------------------------------------------------------
    // saveAll
    // ------------------------------------------------------------------

    @Test
    void should_delegate_saveAll_to_repository() {
        List<ProjectedBudgetSettings> settings = List.of(buildSetting(1L), buildSetting(2L));
        when(projectedBudgetSettingsRepository.saveAll(settings)).thenReturn(settings);

        List<ProjectedBudgetSettings> result = projectedBudgetSettingsService.saveAll(settings);

        assertThat(result).containsExactlyElementsOf(settings);
        verify(projectedBudgetSettingsRepository).saveAll(settings);
    }
}