package com.gestionCompte.apirest.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.gestionCompte.apirest.exception.ErrorMessages;
import com.gestionCompte.apirest.exception.ResourceAlreadyExistsException;
import com.gestionCompte.apirest.exception.ResourceNotFoundException;
import com.gestionCompte.apirest.model.Category;
import com.gestionCompte.apirest.repository.CategoryRepository;
import com.gestionCompte.apirest.repository.TransactionRepository;

@ExtendWith(MockitoExtension.class)
class CategoryServiceTest {

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private TransactionRepository transactionRepository;

    @InjectMocks
    private CategoryService categoryService;


    private Category buildCategory(Long id, String label, boolean isActive) {
        Category category = new Category();
        category.setId(id);
        category.setLabel(label);
        category.setActive(isActive);
        return category;
    }

    private void stubSaveReturnsArgument() {
        when(categoryRepository.save(any(Category.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    // ------------------------------------------------------------------
    // Lecture : getAllActivCategories / getAllCategories / getCategoryById
    // ------------------------------------------------------------------

    @Test
    void should_return_only_active_categories_from_repository() {
        List<Category> activeCategories = List.of(buildCategory(1L, "Loisirs", true), buildCategory(2L, "Courses", true));
        when(categoryRepository.findByIsActiveTrueOrderByPositionAsc()).thenReturn(activeCategories);

        // NB : si tu corriges la faute dans le nom de la méthode (Activ -> Active), adapte cette ligne.
        List<Category> result = categoryService.getAllActiveCategories();

        assertThat(result).containsExactlyElementsOf(activeCategories);
    }

    @Test
    void should_return_all_categories_from_repository() {
        List<Category> categories = List.of(buildCategory(1L, "Loisirs", true), buildCategory(2L, "Ancienne", false));
        when(categoryRepository.findAllByOrderByPositionAsc()).thenReturn(categories);

        List<Category> result = categoryService.getAllCategories();

        assertThat(result).containsExactlyElementsOf(categories);
    }

    @Test
    void should_return_category_when_id_exists() {
        Category category = buildCategory(1L, "Loisirs", true);
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));

        Category result = categoryService.getCategoryById(1L);

        assertThat(result).isSameAs(category);
    }

    @Test
    void should_throw_404_not_found_when_category_id_does_not_exist() {
        when(categoryRepository.findById(999L)).thenReturn(Optional.empty());

        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class, () -> {
        	categoryService.getCategoryById(999L);
        });

        assertEquals(ErrorMessages.CATEGORY_NOT_FOUND + 999L, exception.getMessage());
        
    }

    // ------------------------------------------------------------------
    // createCategory
    // ------------------------------------------------------------------

    @Test
    void should_clean_label_and_save_when_creating_a_category() {
        Category toCreate = buildCategory(null, "   Sorties   au  resto ", true);
        when(categoryRepository.existsByLabelIgnoreCase("Sorties au resto")).thenReturn(false);
        stubSaveReturnsArgument();

        Category result = categoryService.createCategory(toCreate);

        assertThat(result.getLabel()).isEqualTo("Sorties au resto");
        verify(categoryRepository).save(toCreate);
    }

    @Test
    void should_throw_conflict_when_creating_a_category_whose_label_already_exists() {
        Category toCreate = buildCategory(null, "  Loisirs  ", true);
        when(categoryRepository.existsByLabelIgnoreCase("Loisirs")).thenReturn(true);
        
        ResourceAlreadyExistsException exception = assertThrows(ResourceAlreadyExistsException.class, () -> {
        	categoryService.createCategory(toCreate);
        });

        assertEquals(ErrorMessages.CATEGORY_ALREADY_EXISTS , exception.getMessage());

        verify(categoryRepository, never()).save(any(Category.class));
    }

    // ------------------------------------------------------------------
    // updateCategory
    // ------------------------------------------------------------------

    @Test
    void should_throw_not_found_exception_when_updating_a_category_that_does_not_exist() {
        when(categoryRepository.findById(999L)).thenReturn(Optional.empty());
        Category details = buildCategory(null, "Peu importe", true);

        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class, () -> {
        	categoryService.updateCategory(999L,details);
        });

        assertEquals(ErrorMessages.CATEGORY_NOT_FOUND + 999L , exception.getMessage());
        verify(categoryRepository, never()).save(any(Category.class));
    }

    @Test
    void should_throw_conflict_when_updating_label_to_one_already_used_by_another_category() {
        Category existing = buildCategory(1L, "Loisirs", true);
        Category details = buildCategory(null, "Courses", true);
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(categoryRepository.existsByLabelIgnoreCase("Courses")).thenReturn(true);
        
        ResourceAlreadyExistsException exception = assertThrows(ResourceAlreadyExistsException.class, () -> {
        	categoryService.updateCategory(1L,details);
        });

        assertEquals(ErrorMessages.CATEGORY_ALREADY_EXISTS, exception.getMessage());

        verify(categoryRepository, never()).save(any(Category.class));
    }

    @Test
    void should_allow_update_when_only_label_case_changes() {
        Category existing = buildCategory(1L, "Loisirs", true);
        Category details = buildCategory(null, "LOISIRS", true);
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(existing));
        stubSaveReturnsArgument();

        Category result = categoryService.updateCategory(1L, details);

        assertThat(result.getLabel()).isEqualTo("LOISIRS");
        verify(categoryRepository, never()).existsByLabelIgnoreCase(any());
    }

    @Test
    void should_clean_label_when_updating_a_category() {
        Category existing = buildCategory(1L, "Ancien", true);
        Category details = buildCategory(null, "  Nouveau    nom ", true);
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(categoryRepository.existsByLabelIgnoreCase("Nouveau nom")).thenReturn(false);
        stubSaveReturnsArgument();

        Category result = categoryService.updateCategory(1L, details);

        assertThat(result.getLabel()).isEqualTo("Nouveau nom");
        verify(categoryRepository).save(existing);
    }

    @Test
    void should_only_update_label_and_ignore_other_fields() {
        Category existing = buildCategory(1L, "Loisirs", true);
        existing.setPosition(3);
        Category details = buildCategory(null, "Loisirs", false);
        details.setPosition(9);
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(existing));
        stubSaveReturnsArgument();

        Category result = categoryService.updateCategory(1L, details);

        assertThat(result.getPosition()).isEqualTo(3);
        assertThat(result.isActive()).isTrue();
    }

    // ------------------------------------------------------------------
    // deleteCategory
    // ------------------------------------------------------------------

    @Test
    void should_perform_soft_delete_and_return_false_if_category_has_transactions() {
        Category category = buildCategory(5L, "Loisirs", true);
        when(categoryRepository.findById(5L)).thenReturn(Optional.of(category));
        when(transactionRepository.existsByCategoryId(5L)).thenReturn(true);

        boolean deleted = categoryService.deleteCategory(5L);

        assertThat(deleted).isFalse();
        assertThat(category.isActive()).isFalse();
        verify(categoryRepository).save(category);
        verify(categoryRepository, never()).delete(any(Category.class));
    }

    @Test
    void should_perform_hard_delete_and_return_true_if_category_has_no_transactions() {
        Category category = buildCategory(8L, "Loisirs", true);
        when(categoryRepository.findById(8L)).thenReturn(Optional.of(category));
        when(transactionRepository.existsByCategoryId(8L)).thenReturn(false);

        boolean deleted = categoryService.deleteCategory(8L);

        assertThat(deleted).isTrue();
        verify(categoryRepository).delete(category);
        verify(categoryRepository, never()).save(any(Category.class));
    }

    @Test
    void should_throw_not_found_exception_when_deleting_a_category_that_does_not_exist() {
        when(categoryRepository.findById(999L)).thenReturn(Optional.empty());
        
        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class, () -> {
        	categoryService.deleteCategory(999L);
        });

        assertEquals(ErrorMessages.CATEGORY_NOT_FOUND + 999L, exception.getMessage());

        verifyNoInteractions(transactionRepository);
        verify(categoryRepository, never()).delete(any(Category.class));
    }

    // ------------------------------------------------------------------
    // setActiveCategory
    // ------------------------------------------------------------------

    @Test
    void should_reactivate_an_inactive_category() {
        Category category = buildCategory(3L, "Ancienne", false);
        when(categoryRepository.findById(3L)).thenReturn(Optional.of(category));
        stubSaveReturnsArgument();

        Category result = categoryService.setActiveCategory(3L);

        assertThat(result.isActive()).isTrue();
        verify(categoryRepository).save(category);
    }

    @Test
    void should_throw_not_found_exception_when_activating_a_category_that_does_not_exist() {
        when(categoryRepository.findById(999L)).thenReturn(Optional.empty());
        
        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class, () -> {
        	categoryService.setActiveCategory(999L);
        });

        assertEquals(ErrorMessages.CATEGORY_NOT_FOUND + 999L, exception.getMessage());

   

        verify(categoryRepository, never()).save(any(Category.class));
    }

    // ------------------------------------------------------------------
    // saveAll
    // ------------------------------------------------------------------

    @Test
    void should_delegate_saveAll_to_repository() {
        List<Category> categories = List.of(buildCategory(1L, "A", true), buildCategory(2L, "B", true));
        when(categoryRepository.saveAll(categories)).thenReturn(categories);

        List<Category> result = categoryService.saveAll(categories);

        assertThat(result).containsExactlyElementsOf(categories);
        verify(categoryRepository).saveAll(categories);
    }
}