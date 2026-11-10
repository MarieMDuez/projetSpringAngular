package com.gestionCompte.apirest.services;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gestionCompte.apirest.exception.ErrorMessages;
import com.gestionCompte.apirest.exception.ResourceAlreadyExistsException;
import com.gestionCompte.apirest.exception.ResourceNotFoundException;
import com.gestionCompte.apirest.model.Category;
import com.gestionCompte.apirest.repository.CategoryRepository;
import com.gestionCompte.apirest.repository.TransactionRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CategoryService {

	private final CategoryRepository categoryRepository;
	private final TransactionRepository transactionRepository;


	public List<Category> getAllActiveCategories() {
		return categoryRepository.findByIsActiveTrueOrderByPositionAsc();
	}
	public List<Category> getAllCategories() {
		return categoryRepository.findAllByOrderByPositionAsc();
	}

	public Category getCategoryById(Long id) {
		return categoryRepository.findById(id).orElseThrow(
				() -> new ResourceNotFoundException( ErrorMessages.CATEGORY_NOT_FOUND + id));
	}

	public Category createCategory(Category category) {
		String cleanedLabel = category.getLabel().trim().replaceAll("\\s+", " ");
		category.setLabel(cleanedLabel);
		if(categoryRepository.existsByLabelIgnoreCase(category.getLabel())) {
			throw new ResourceAlreadyExistsException(ErrorMessages.CATEGORY_ALREADY_EXISTS);
		}
		return categoryRepository.save(category);
	}

	public Category updateCategory(Long id, Category categoryDetails) {
		Category existingCategory = categoryRepository.findById(id).orElseThrow(
				() -> new ResourceNotFoundException( ErrorMessages.CATEGORY_NOT_FOUND  + id));

		String cleanedLabel = categoryDetails.getLabel().trim().replaceAll("\\s+", " ");
		categoryDetails.setLabel(cleanedLabel);

		if (!existingCategory.getLabel().equalsIgnoreCase(categoryDetails.getLabel())
		        && categoryRepository.existsByLabelIgnoreCase(categoryDetails.getLabel())) {
		        throw new ResourceAlreadyExistsException(ErrorMessages.CATEGORY_ALREADY_EXISTS);
		    }

		existingCategory.setLabel(categoryDetails.getLabel());

		return categoryRepository.save(existingCategory);
	}

	public boolean deleteCategory(Long id) {
		Category category = categoryRepository.findById(id).orElseThrow(
				() -> new ResourceNotFoundException( ErrorMessages.CATEGORY_NOT_FOUND + id));
		boolean hasTransactions = transactionRepository.existsByCategoryId(id);

		if (hasTransactions) {
			category.setActive(false);
			categoryRepository.save(category);
			return false;
		} else {
			categoryRepository.delete(category);
			return true;
		}
	}
	@Transactional
	public List<Category> saveAll(List<Category> categories) {
	    return categoryRepository.saveAll(categories);
	}


	public Category setActiveCategory(Long categoryId) {
		Category category = categoryRepository.findById(categoryId)
				.orElseThrow(() -> new ResourceNotFoundException(ErrorMessages.CATEGORY_NOT_FOUND + categoryId));

		category.setActive(true);

		return categoryRepository.save(category);
	}

}
