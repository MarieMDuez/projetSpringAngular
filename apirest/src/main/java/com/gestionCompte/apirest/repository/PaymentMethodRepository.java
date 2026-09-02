package com.gestionCompte.apirest.repository;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.gestionCompte.apirest.model.PaymentMethod;

public interface PaymentMethodRepository  extends JpaRepository<PaymentMethod, Long>{
	List<PaymentMethod> findByIsActiveTrue();
	List<PaymentMethod> findAllByOrderByPositionAsc();
	List<PaymentMethod> findByIsActiveTrueOrderByPositionAsc();
	boolean existsByLabelIgnoreCase(String label);

}
