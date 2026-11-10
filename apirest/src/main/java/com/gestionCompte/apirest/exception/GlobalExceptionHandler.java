package com.gestionCompte.apirest.exception;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

	@ExceptionHandler(ResourceAlreadyExistsException.class)
	public ResponseEntity<Object> handleResourceAlreadyExists(ResourceAlreadyExistsException ex) {
	    if (ex.getErrorDetails() != null) {
	        return ResponseEntity.status(HttpStatus.CONFLICT).body(ex.getErrorDetails());
	    }
	    
	    return ResponseEntity.status(HttpStatus.CONFLICT).body(ex.getMessage());
	}
	
	@ExceptionHandler(ResourceNotFoundException.class)
	public ResponseEntity<Object> handleResourceNotFound(ResourceNotFoundException ex) {
	    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ex.getMessage());
	}
	
	@ExceptionHandler(ResourceBadRequestException.class)
	public ResponseEntity<Object> handleResourceBadRequest(ResourceBadRequestException ex) {
	    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ex.getMessage());
	}

	@ExceptionHandler(org.springframework.web.bind.MethodArgumentNotValidException.class)
	public ResponseEntity<Map<String, String>> handleValidationExceptions(
	        org.springframework.web.bind.MethodArgumentNotValidException ex) {
	    
	    Map<String, String> errors = new java.util.HashMap<>();
	    
	    ex.getBindingResult().getFieldErrors().forEach(error -> 
	        errors.put(error.getField(), error.getDefaultMessage())
	    );
	    
	    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errors);
	}
	



}
