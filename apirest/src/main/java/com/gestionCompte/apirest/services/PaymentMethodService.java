package com.gestionCompte.apirest.services;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.gestionCompte.apirest.model.PaymentMethod;
import com.gestionCompte.apirest.repository.PaymentMethodRepository;
import com.gestionCompte.apirest.repository.TransactionRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PaymentMethodService {

	private final PaymentMethodRepository paymentMethodRepository;
	private final TransactionRepository transactionRepository;

	public List<PaymentMethod> getAllPaymentMethods() {
		return paymentMethodRepository.findAllByOrderByPositionAsc();
	}

	public List<PaymentMethod> getAllActivPaymentMethods() {
		return paymentMethodRepository.findByIsActiveTrueOrderByPositionAsc();
	}

	public PaymentMethod getPaymentMethodById(Long id) {
		return paymentMethodRepository.findById(id).orElseThrow(
				() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "paymentMethod not found with id: " + id));
	}

	public PaymentMethod createPaymentMethod(PaymentMethod paymentMethod) {
		String cleanedLabel = paymentMethod.getLabel().trim().replaceAll("\\s+", " ");
		paymentMethod.setLabel(cleanedLabel);
		if (paymentMethodRepository.existsByLabelIgnoreCase(paymentMethod.getLabel())) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Ce nom existe déjà !");
		}
		return paymentMethodRepository.save(paymentMethod);
	}

	public PaymentMethod updatePaymentMethod(Long id, PaymentMethod paymentMethodDetails) {
		PaymentMethod existingPaymentMethod = paymentMethodRepository.findById(id).orElseThrow(
				() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment Method not found with id: " + id));
		String cleanedLabel = paymentMethodDetails.getLabel().trim().replaceAll("\\s+", " ");
		paymentMethodDetails.setLabel(cleanedLabel);
		if (!existingPaymentMethod.getLabel().equalsIgnoreCase(paymentMethodDetails.getLabel())
				&& paymentMethodRepository.existsByLabelIgnoreCase(paymentMethodDetails.getLabel())) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Ce nom de compte existe déjà !");
		}

		existingPaymentMethod.setLabel(paymentMethodDetails.getLabel());

		return paymentMethodRepository.save(existingPaymentMethod);
	}

	public boolean deletePaymentMethod(Long id) {

		PaymentMethod paymentMethod = paymentMethodRepository.findById(id).orElseThrow(
				() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment Method not found with id: " + id));
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
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found"));

		paymentMethod.setActive(true);

		return paymentMethodRepository.save(paymentMethod);
	}
}
