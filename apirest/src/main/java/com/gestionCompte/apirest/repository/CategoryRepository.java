package com.gestionCompte.apirest.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.gestionCompte.apirest.model.Category;

public interface CategoryRepository extends JpaRepository<Category, Long> {
	List<Category> findByIsActiveTrue();
	List<Category> findAllByOrderByPositionAsc();
	List<Category> findByIsActiveTrueOrderByPositionAsc();
}
