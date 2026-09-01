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

import com.gestionCompte.apirest.model.Category;
import com.gestionCompte.apirest.services.CategoryService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/categories") 
@CrossOrigin(origins = "http://localhost:4200")
@RequiredArgsConstructor
public class CategoryController {
	
	private final CategoryService categoryService;
	
	
	  @GetMapping
	    public ResponseEntity<List<Category>> getAllCategories() {
	        List<Category> categories = categoryService.getAllCategories();
	        return ResponseEntity.ok(categories); 
	    }
	  
	  @GetMapping("/activ") 
	    public ResponseEntity<List<Category>> getAllActivCategories() {
	        List<Category> categories = categoryService.getAllActivCategories();
	        return ResponseEntity.ok(categories); 
	    }

	    @GetMapping("/{id}") 
	    public ResponseEntity<Category> getCategoryById(@PathVariable Long id) {
	        Category category = categoryService.getCategoryById(id);
	        return ResponseEntity.ok(category); 
	    }
	    @PostMapping
	    public ResponseEntity<Category> createCategory(@RequestBody Category category) {
	        Category createdCategory = categoryService.createCategory(category);
	        return new ResponseEntity<>(createdCategory, HttpStatus.CREATED);
	    }
	    
	    @PostMapping("/saveAll")
	    public ResponseEntity<List<Category>> saveAll(@RequestBody List<Category> categories) {
	        List<Category> categoriesSaved = categoryService.saveAll(categories);
	        return ResponseEntity.ok(categoriesSaved);
	    }
	    
	    @PutMapping("/{id}") 
	    public ResponseEntity<Category> updateCategory(@PathVariable Long id, @RequestBody Category categoryDetails) {
	        Category updatedCategory = categoryService.updateCategory(id, categoryDetails);
	        return ResponseEntity.ok(updatedCategory); 
	    }

	    @DeleteMapping("/{id}") 
	    public ResponseEntity<Boolean> deleteCategory(@PathVariable Long id) {
	    	boolean isHardDeleted = categoryService.deleteCategory(id);
	    	return ResponseEntity.ok(isHardDeleted);
	    }
	    

}
