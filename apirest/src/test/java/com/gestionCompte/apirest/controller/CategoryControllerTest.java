package com.gestionCompte.apirest.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
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
import com.gestionCompte.apirest.exception.ResourceAlreadyExistsException;
import com.gestionCompte.apirest.exception.ResourceNotFoundException;
import com.gestionCompte.apirest.model.Category;
import com.gestionCompte.apirest.services.CategoryService;

/**
 * Tests de la couche HTTP de CategoryController.
 *
 * @WebMvcTest démarre seulement la partie "web" de Spring ; le service est remplacé par un faux
 * (@MockitoBean). On vérifie donc : les URL, les codes HTTP, le JSON reçu et renvoyé, et que
 * le contrôleur transmet bien les bons arguments au service. La logique métier est déjà testée
 * dans CategoryServiceTest.
 */
@WebMvcTest(CategoryController.class)
class CategoryControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CategoryService categoryService;

    private Category buildCategory(Long id, String label, boolean active) {
        Category category = new Category();
        category.setId(id);
        category.setLabel(label);
        category.setActive(active);
        return category;
    }

    private static RuntimeException notFound(int id) {
        return new ResourceNotFoundException(ErrorMessages.CATEGORY_NOT_FOUND + id);
    }

    private static RuntimeException conflict() {
        return new ResourceAlreadyExistsException(ErrorMessages.CATEGORY_ALREADY_EXISTS);
    }

    // ------------------------------------------------------------------
    // Lecture
    // ------------------------------------------------------------------

    @Test
    void should_return_all_categories() throws Exception {
        when(categoryService.getAllCategories())
                .thenReturn(List.of(buildCategory(1L, "Loisirs", true), buildCategory(2L, "Courses", false)));

        mockMvc.perform(get("/api/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].label").value("Loisirs"))
                // Le front Angular lit "isActive" : ce nom de champ fait partie du contrat de l'API
                .andExpect(jsonPath("$[0].isActive").value(true))
                .andExpect(jsonPath("$[1].isActive").value(false));
    }

    @Test
    void should_return_active_categories() throws Exception {
        when(categoryService.getAllActiveCategories()).thenReturn(List.of(buildCategory(1L, "Loisirs", true)));

        mockMvc.perform(get("/api/categories/activ"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].label").value("Loisirs"));
    }

    @Test
    void should_return_category_by_id() throws Exception {
        when(categoryService.getCategoryById(1L)).thenReturn(buildCategory(1L, "Loisirs", true));

        mockMvc.perform(get("/api/categories/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.label").value("Loisirs"));
    }

    @Test
    void should_return_404_when_category_does_not_exist() throws Exception {
        when(categoryService.getCategoryById(99L)).thenThrow(notFound(99));

        mockMvc.perform(get("/api/categories/99"))
                .andExpect(status().isNotFound());
    }

    @Test
    void should_return_400_when_id_is_not_a_number() throws Exception {
        mockMvc.perform(get("/api/categories/abc"))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(categoryService);
    }

    // ------------------------------------------------------------------
    // Création
    // ------------------------------------------------------------------

    @Test
    void should_create_category_and_return_201() throws Exception {
        when(categoryService.createCategory(any(Category.class))).thenReturn(buildCategory(5L, "Loisirs", true));

        mockMvc.perform(post("/api/categories")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"label": "Loisirs", "isActive": false}
                        """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(5))
                .andExpect(jsonPath("$.label").value("Loisirs"));

        ArgumentCaptor<Category> captor = ArgumentCaptor.forClass(Category.class);
        verify(categoryService).createCategory(captor.capture());
        assertThat(captor.getValue().getLabel()).isEqualTo("Loisirs");
        // Le JSON envoyé par le front utilise "isActive" : on vérifie qu'il est bien lu
        assertThat(captor.getValue().isActive()).isFalse();
    }

    @Test
    void should_return_409_when_creating_a_category_whose_name_already_exists() throws Exception {
        when(categoryService.createCategory(any(Category.class))).thenThrow(conflict());

        mockMvc.perform(post("/api/categories")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"label\": \"Loisirs\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    void should_return_400_and_not_call_the_service_when_json_is_malformed() throws Exception {
        mockMvc.perform(post("/api/categories")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"label\": "))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(categoryService);
    }

    @Test
    @SuppressWarnings("unchecked")
    void should_save_all_categories_and_return_them() throws Exception {
        when(categoryService.saveAll(any())).thenReturn(
                List.of(buildCategory(1L, "A", true), buildCategory(2L, "B", true)));

        mockMvc.perform(post("/api/categories/saveAll")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        [{"id": 1, "label": "A", "position": 0}, {"id": 2, "label": "B", "position": 1}]
                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));

        ArgumentCaptor<List<Category>> captor = ArgumentCaptor.forClass(List.class);
        verify(categoryService).saveAll(captor.capture());
        assertThat(captor.getValue()).extracting(Category::getLabel, Category::getPosition)
                .containsExactly(tuple("A", 0), tuple("B", 1));
    }

    // ------------------------------------------------------------------
    // Modification, suppression, réactivation
    // ------------------------------------------------------------------

    @Test
    void should_update_category() throws Exception {
        when(categoryService.updateCategory(eq(5L), any(Category.class)))
                .thenReturn(buildCategory(5L, "Nouveau nom", true));

        mockMvc.perform(put("/api/categories/5")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"label\": \"Nouveau nom\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.label").value("Nouveau nom"));

        ArgumentCaptor<Category> captor = ArgumentCaptor.forClass(Category.class);
        verify(categoryService).updateCategory(eq(5L), captor.capture());
        assertThat(captor.getValue().getLabel()).isEqualTo("Nouveau nom");
    }

    @Test
    void should_return_404_when_updating_a_category_that_does_not_exist() throws Exception {
        when(categoryService.updateCategory(eq(99L), any(Category.class))).thenThrow(notFound(99));

        mockMvc.perform(put("/api/categories/99")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"label\": \"Peu importe\"}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void should_return_true_when_category_is_hard_deleted() throws Exception {
        when(categoryService.deleteCategory(5L)).thenReturn(true);

        mockMvc.perform(delete("/api/categories/5"))
                .andExpect(status().isOk())
                .andExpect(content().string("true"));
    }

    @Test
    void should_return_false_when_category_is_only_deactivated() throws Exception {
        when(categoryService.deleteCategory(5L)).thenReturn(false);

        mockMvc.perform(delete("/api/categories/5"))
                .andExpect(status().isOk())
                .andExpect(content().string("false"));
    }

    @Test
    void should_return_404_when_deleting_a_category_that_does_not_exist() throws Exception {
        when(categoryService.deleteCategory(99L)).thenThrow(notFound(99));

        mockMvc.perform(delete("/api/categories/99"))
                .andExpect(status().isNotFound());
    }

    @Test
    void should_reactivate_category() throws Exception {
        when(categoryService.setActiveCategory(5L)).thenReturn(buildCategory(5L, "Loisirs", true));

        mockMvc.perform(put("/api/categories/5/set-active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isActive").value(true));
    }

    @Test
    void should_return_404_when_reactivating_a_category_that_does_not_exist() throws Exception {
        when(categoryService.setActiveCategory(99L)).thenThrow(notFound(99));

        mockMvc.perform(put("/api/categories/99/set-active"))
                .andExpect(status().isNotFound());
    }
}
