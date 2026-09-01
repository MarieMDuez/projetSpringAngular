package com.gestionCompte.apirest.services;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.gestionCompte.apirest.model.Category;
import com.gestionCompte.apirest.repository.CategoryRepository;
import com.gestionCompte.apirest.repository.TransactionRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CategoryService {

	private final CategoryRepository categoryRepository;
	private final TransactionRepository transactionRepository;
	
	
	public List<Category> getAllActivCategories() {
		return categoryRepository.findByIsActiveTrueOrderByPositionAsc();
	}
	public List<Category> getAllCategories() {
		return categoryRepository.findAllByOrderByPositionAsc();
	}

	public Category getCategoryById(Long id) {
		return categoryRepository.findById(id).orElseThrow(
				() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found with id: " + id));
	}

	public Category createCategory(Category category) {
		return categoryRepository.save(category);
	}

	public Category updateCategory(Long id, Category categoryDetails) {
		Category existingCategory = categoryRepository.findById(id).orElseThrow(
				() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found with id: " + id));

		existingCategory.setLabel(categoryDetails.getLabel());

		return categoryRepository.save(existingCategory);
	}

	public boolean deleteCategory(Long id) {
		Category category = categoryRepository.findById(id).orElseThrow(
				() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found with id: " + id));
		boolean hasTransactions = transactionRepository.existsByCategoryId(id);
		System.out.println(hasTransactions);

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

}
