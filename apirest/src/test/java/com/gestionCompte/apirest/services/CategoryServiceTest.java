package com.gestionCompte.apirest.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import com.gestionCompte.apirest.model.Category;
import com.gestionCompte.apirest.repository.CategoryRepository;
import com.gestionCompte.apirest.repository.TransactionRepository;

@ExtendWith(MockitoExtension.class)
public class CategoryServiceTest {

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private TransactionRepository transactionRepository;

    @InjectMocks
    private CategoryService categoryService;

    // =========================================================================
    // TESTS : DELETE CATEGORY (Soft VS Hard)
    // =========================================================================

    @Test
    public void should_perform_soft_delete_and_return_false_if_category_has_transactions() {
        // Given
        Category category = new Category();
        category.setId(5L);
        category.setLabel("Loisirs");
        category.setActive(true); // Aligné sur Lombok

        when(categoryRepository.findById(5L)).thenReturn(Optional.of(category));
        // On simule qu'elle est utilisée dans le grand tableau
        when(transactionRepository.existsByCategoryId(5L)).thenReturn(true);
        when(categoryRepository.save(any(Category.class))).thenReturn(category);

        // When
        boolean isHardDeleted = categoryService.deleteCategory(5L);

        // Then : Vérification stricte de votre contrat booléen
        assertThat(isHardDeleted).isFalse(); 
        assertThat(category.isActive()).isFalse(); // Le flag d'archivage est tombé
        verify(categoryRepository, times(1)).save(category);
        verify(categoryRepository, never()).delete(any(Category.class));
    }

    @Test
    public void should_perform_hard_delete_and_return_true_if_category_has_no_transactions() {
        // Given
        Category category = new Category();
        category.setId(8L);

        when(categoryRepository.findById(8L)).thenReturn(Optional.of(category));
        // Aucune transaction liée
        when(transactionRepository.existsByCategoryId(8L)).thenReturn(false);

        // When
        boolean isHardDeleted = categoryService.deleteCategory(8L);

        // Then : Vérification de la suppression physique nette
        assertThat(isHardDeleted).isTrue();
        verify(categoryRepository, times(1)).delete(category);
        verify(categoryRepository, never()).save(any(Category.class));
    }

    // =========================================================================
    // TESTS : GESTION DES EXCEPTIONS
    // =========================================================================

    @Test
    public void should_throw_404_not_found_when_category_id_does_not_exist() {
        // Given
        when(categoryRepository.findById(999L)).thenReturn(Optional.empty());

        // When & Then : Validation de la ResponseStatusException de votre code
        assertThatThrownBy(() -> categoryService.getCategoryById(999L))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("Category not found with id");
    }
}
