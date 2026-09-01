package com.gestionCompte.apirest.model;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString(exclude = {"account", "paymentMethod", "category"})
@Entity
@Table (name = "transactions",
    indexes = {
        @Index(name = "idx_transaction_date", columnList = "emission_date"),
        @Index(name = "idx_transaction_payment_method", columnList = "payment_method_id"),
        @Index(name = "idx_transaction_category", columnList = "category_id"),
        @Index(name = "idx_transaction_account", columnList = "account_id")
    })
public class Transaction {
	
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
	@Column(nullable = false, name = "emission_date")
	@JsonProperty("emissionDate")
	@JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
	private LocalDate emissionDate;
	
	@ManyToOne
	@JoinColumn(name = "account_id", nullable = false)
	private Account account;
	
	@ManyToOne
	@JoinColumn(name = "payment_method_id", nullable = false)
	private PaymentMethod paymentMethod;
	
	@ManyToOne
	@JoinColumn(name = "category_id", nullable = false)
	private Category category;
	
	@Column(nullable = true) 
	private String description;
	
	@Column(nullable = false)
	@Positive(message = "The amount must be strictly positive")
	private BigDecimal amount;
	
	
	@Enumerated(EnumType.STRING)
	@Column(nullable = false) 
	private TransactionType type;
	
	@Column(nullable = true) 
	private Integer recurrenceMonths = 0; 
	@JsonProperty("isAlertTriggered")
	private boolean isAlertTriggered = false; 
	
	@JsonProperty("isChecked")
	private boolean isChecked = false;
	
	private Long parentTransactionId;

}
