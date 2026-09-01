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

import com.gestionCompte.apirest.model.PaymentMethod;
import com.gestionCompte.apirest.services.PaymentMethodService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/payment_methods")
@CrossOrigin(origins = "http://localhost:4200") 
@RequiredArgsConstructor
public class PaymentMethodController {
	private final PaymentMethodService paymentMethodService;
	
	@GetMapping 
    public ResponseEntity<List<PaymentMethod>> getAllPaymentMethods() {
        List<PaymentMethod> PaymentMethods = paymentMethodService.getAllPaymentMethods();
        return ResponseEntity.ok(PaymentMethods); 
    }
	
	  @GetMapping("/activ") 
	    public ResponseEntity<List<PaymentMethod>> getAllActivPaymentMethods() {
	        List<PaymentMethod> paymentMethods = paymentMethodService.getAllActivPaymentMethods();
	        return ResponseEntity.ok(paymentMethods);
	    }

    @GetMapping("/{id}") 
    public ResponseEntity<PaymentMethod> getPaymentMethodById(@PathVariable Long id) {
        PaymentMethod PaymentMethod = paymentMethodService.getPaymentMethodById(id);
        return ResponseEntity.ok(PaymentMethod);
    }
    @PostMapping 
    public ResponseEntity<PaymentMethod> createPaymentMethod(@RequestBody PaymentMethod PaymentMethod) {
        PaymentMethod createdPaymentMethod = paymentMethodService.createPaymentMethod(PaymentMethod);
        return new ResponseEntity<>(createdPaymentMethod, HttpStatus.CREATED); 
    }
    
    @PostMapping("/saveAll")
    public ResponseEntity<List<PaymentMethod>> saveAll(@RequestBody List<PaymentMethod> paymentMethods) {
        List<PaymentMethod> paymentMethodsSaved = paymentMethodService.saveAll(paymentMethods);
        return ResponseEntity.ok(paymentMethodsSaved);
    }
    
    @PutMapping("/{id}") 
    public ResponseEntity<PaymentMethod> updatePaymentMethod(@PathVariable Long id, @RequestBody PaymentMethod PaymentMethodDetails) {
        PaymentMethod updatedPaymentMethod = paymentMethodService.updatePaymentMethod(id, PaymentMethodDetails);
        return ResponseEntity.ok(updatedPaymentMethod);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Boolean> deletePaymentMethod(@PathVariable Long id) {
    	boolean isHardDeleted = paymentMethodService.deletePaymentMethod(id);
    	return ResponseEntity.ok(isHardDeleted); 
    }
  
}
