package com.gestionCompte.apirest.services;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gestionCompte.apirest.exception.ErrorMessages;
import com.gestionCompte.apirest.exception.ResourceAlreadyExistsException;
import com.gestionCompte.apirest.exception.ResourceNotFoundException;
import com.gestionCompte.apirest.model.PaymentMethod;
import com.gestionCompte.apirest.repository.PaymentMethodRepository;
import com.gestionCompte.apirest.repository.TransactionRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PaymentMethodService {

	private final PaymentMethodRepository paymentMethodRepository;
	private final TransactionRepository transactionRepository;


	public List<PaymentMethod> getAllPaymentMethods() {
		return paymentMethodRepository.findAllByOrderByPositionAsc();
	}

	public List<PaymentMethod> getAllActivePaymentMethods() {
		return paymentMethodRepository.findByIsActiveTrueOrderByPositionAsc();
	}

	public PaymentMethod getPaymentMethodById(Long id) {
		return paymentMethodRepository.findById(id).orElseThrow(
				() -> new ResourceNotFoundException( ErrorMessages.PAYMENT_METHOD_NOT_FOUND + id));
	}

	public PaymentMethod createPaymentMethod(PaymentMethod paymentMethod) {
		String cleanedLabel = paymentMethod.getLabel().trim().replaceAll("\\s+", " ");
		paymentMethod.setLabel(cleanedLabel);
		if (paymentMethodRepository.existsByLabelIgnoreCase(paymentMethod.getLabel())) {
			throw new ResourceAlreadyExistsException( ErrorMessages.PAYMENT_METHOD_ALREADY_EXISTS);
		}
		return paymentMethodRepository.save(paymentMethod);
	}

	public PaymentMethod updatePaymentMethod(Long id, PaymentMethod paymentMethodDetails) {
		PaymentMethod existingPaymentMethod = paymentMethodRepository.findById(id).orElseThrow(
				() -> new ResourceNotFoundException( ErrorMessages.PAYMENT_METHOD_NOT_FOUND + id));
		String cleanedLabel = paymentMethodDetails.getLabel().trim().replaceAll("\\s+", " ");
		paymentMethodDetails.setLabel(cleanedLabel);
		if (!existingPaymentMethod.getLabel().equalsIgnoreCase(paymentMethodDetails.getLabel())
				&& paymentMethodRepository.existsByLabelIgnoreCase(paymentMethodDetails.getLabel())) {
			throw new ResourceAlreadyExistsException( ErrorMessages.PAYMENT_METHOD_ALREADY_EXISTS);
		}

		existingPaymentMethod.setLabel(paymentMethodDetails.getLabel());

		return paymentMethodRepository.save(existingPaymentMethod);
	}

	public boolean deletePaymentMethod(Long id) {

		PaymentMethod paymentMethod = paymentMethodRepository.findById(id).orElseThrow(
				() -> new ResourceNotFoundException( ErrorMessages.PAYMENT_METHOD_NOT_FOUND + id));
		boolean hasTransactions = transactionRepository.existsByPaymentMethodId(id);
		if (hasTransactions) {
			paymentMethod.setActive(false);
			paymentMethodRepository.save(paymentMethod);
			return false;
		} else {
			paymentMethodRepository.delete(paymentMethod);
			return true;
		}

	}

	@Transactional
	public List<PaymentMethod> saveAll(List<PaymentMethod> paymentMethods) {
		return paymentMethodRepository.saveAll(paymentMethods);
	}

	public PaymentMethod setActivePaymentMethod(Long paymentMethodId) {
		PaymentMethod paymentMethod = paymentMethodRepository.findById(paymentMethodId)
				.orElseThrow(() -> new ResourceNotFoundException( ErrorMessages.PAYMENT_METHOD_NOT_FOUND + paymentMethodId));

		paymentMethod.setActive(true);

		return paymentMethodRepository.save(paymentMethod);
	}
}
