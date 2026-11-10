package com.gestionCompte.apirest.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.gestionCompte.apirest.exception.ErrorMessages;
import com.gestionCompte.apirest.exception.ResourceNotFoundException;
import com.gestionCompte.apirest.model.Category;
import com.gestionCompte.apirest.model.ProjectedBudgetCategoryType;
import com.gestionCompte.apirest.model.ProjectedBudgetSettings;
import com.gestionCompte.apirest.services.ProjectedBudgetSettingsService;

/**
 * Tests de la couche HTTP de ProjectedBudgetSettingsController.
 *
 * Point clé : la création (POST) appelle le service avec un id null, la modification (PUT) avec
 * l'id de l'URL. C'est la règle "créer ou modifier" du service, vue depuis l'API.
 */
@WebMvcTest(ProjectedBudgetSettingsController.class)
class ProjectedBudgetSettingsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ProjectedBudgetSettingsService projectedBudgetSettingsService;

    private static final String VALID_SETTING_JSON = """
            {"type": "FIXED_EXPENSE", "category": {"id": 1}}
            """;

    private ProjectedBudgetSettings buildSetting(Long id, ProjectedBudgetCategoryType type) {
        Category category = new Category();
        category.setId(1L);
        category.setLabel("Loyer");
        ProjectedBudgetSettings setting = new ProjectedBudgetSettings();
        setting.setId(id);
        setting.setType(type);
        setting.setCategory(category);
        return setting;
    }

    private static RuntimeException notFound(int id) {
        return new ResourceNotFoundException(ErrorMessages.SETTING_NOT_FOUND + id);
    }

    @Test
    void should_return_all_settings() throws Exception {
        when(projectedBudgetSettingsService.getAllProjectedBudgetSettings()).thenReturn(List.of(
                buildSetting(1L, ProjectedBudgetCategoryType.INCOME),
                buildSetting(2L, ProjectedBudgetCategoryType.FIXED_EXPENSE)));

        mockMvc.perform(get("/api/projected_budget_settings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].type").value("INCOME"))
                .andExpect(jsonPath("$[1].category.label").value("Loyer"));
    }

    @Test
    void should_create_setting_with_a_null_id_and_return_201() throws Exception {
        when(projectedBudgetSettingsService.saveProjectedBudgetSettings(isNull(), any(ProjectedBudgetSettings.class)))
                .thenReturn(buildSetting(5L, ProjectedBudgetCategoryType.FIXED_EXPENSE));

        mockMvc.perform(post("/api/projected_budget_settings")
                .contentType(MediaType.APPLICATION_JSON)
                .content(VALID_SETTING_JSON))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(5));

        ArgumentCaptor<ProjectedBudgetSettings> captor = ArgumentCaptor.forClass(ProjectedBudgetSettings.class);
        verify(projectedBudgetSettingsService).saveProjectedBudgetSettings(isNull(), captor.capture());
        assertThat(captor.getValue().getType()).isEqualTo(ProjectedBudgetCategoryType.FIXED_EXPENSE);
        assertThat(captor.getValue().getCategory().getId()).isEqualTo(1L);
    }

    @Test
    void should_return_400_and_not_call_the_service_when_json_is_malformed() throws Exception {
        mockMvc.perform(post("/api/projected_budget_settings")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"type\": "))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(projectedBudgetSettingsService);
    }

    @Test
    void should_return_400_when_setting_type_is_unknown() throws Exception {
        mockMvc.perform(post("/api/projected_budget_settings")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"type\": \"INCONNU\", \"category\": {\"id\": 1}}"))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(projectedBudgetSettingsService);
    }

    @Test
    void should_update_setting_with_the_id_of_the_url() throws Exception {
        when(projectedBudgetSettingsService.saveProjectedBudgetSettings(eq(5L), any(ProjectedBudgetSettings.class)))
                .thenReturn(buildSetting(5L, ProjectedBudgetCategoryType.FIXED_EXPENSE));

        mockMvc.perform(put("/api/projected_budget_settings/5")
                .contentType(MediaType.APPLICATION_JSON)
                .content(VALID_SETTING_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(5));

        ArgumentCaptor<ProjectedBudgetSettings> captor = ArgumentCaptor.forClass(ProjectedBudgetSettings.class);
        verify(projectedBudgetSettingsService).saveProjectedBudgetSettings(eq(5L), captor.capture());
        assertThat(captor.getValue().getType()).isEqualTo(ProjectedBudgetCategoryType.FIXED_EXPENSE);
    }

    @Test
    void should_return_404_when_updating_a_setting_that_does_not_exist() throws Exception {
        when(projectedBudgetSettingsService.saveProjectedBudgetSettings(eq(99L), any(ProjectedBudgetSettings.class)))
                .thenThrow(notFound(99));

        mockMvc.perform(put("/api/projected_budget_settings/99")
                .contentType(MediaType.APPLICATION_JSON)
                .content(VALID_SETTING_JSON))
                .andExpect(status().isNotFound());
    }

    @Test
    void should_delete_setting_and_return_204() throws Exception {
        mockMvc.perform(delete("/api/projected_budget_settings/5"))
                .andExpect(status().isNoContent());

        verify(projectedBudgetSettingsService).deleteProjectedBudgetSettings(5L);
    }

    @Test
    void should_return_404_when_deleting_a_setting_that_does_not_exist() throws Exception {
        doThrow(notFound(99)).when(projectedBudgetSettingsService).deleteProjectedBudgetSettings(99L);

        mockMvc.perform(delete("/api/projected_budget_settings/99"))
                .andExpect(status().isNotFound());
    }

    @Test
    @SuppressWarnings("unchecked")
    void should_save_all_settings_and_return_them() throws Exception {
        when(projectedBudgetSettingsService.saveAll(any())).thenReturn(List.of(
                buildSetting(1L, ProjectedBudgetCategoryType.INCOME),
                buildSetting(2L, ProjectedBudgetCategoryType.SAVINGS)));

        mockMvc.perform(post("/api/projected_budget_settings/saveAll")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        [{"id": 1, "type": "INCOME"}, {"id": 2, "type": "SAVINGS"}]
                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));

        ArgumentCaptor<List<ProjectedBudgetSettings>> captor = ArgumentCaptor.forClass(List.class);
        verify(projectedBudgetSettingsService).saveAll(captor.capture());
        assertThat(captor.getValue()).extracting(ProjectedBudgetSettings::getId, ProjectedBudgetSettings::getType)
                .containsExactly(tuple(1L, ProjectedBudgetCategoryType.INCOME),
                        tuple(2L, ProjectedBudgetCategoryType.SAVINGS));
    }
}
