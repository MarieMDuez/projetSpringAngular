package com.gestionCompte.apirest.services;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.time.temporal.WeekFields;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gestionCompte.apirest.dto.ProjectedBudgetPeriodDto;
import com.gestionCompte.apirest.dto.ProjectedBudgetResponseDto;
import com.gestionCompte.apirest.dto.SuggestedPeriodDataDto;
import com.gestionCompte.apirest.exception.ErrorMessages;
import com.gestionCompte.apirest.exception.ResourceAlreadyExistsException;
import com.gestionCompte.apirest.exception.ResourceNotFoundException;
import com.gestionCompte.apirest.model.Account;
import com.gestionCompte.apirest.model.ProjectedBudgetItems;
import com.gestionCompte.apirest.model.ProjectedBudgetPeriod;
import com.gestionCompte.apirest.model.ProjectedBudgetSettings;
import com.gestionCompte.apirest.model.Transaction;
import com.gestionCompte.apirest.repository.AccountRepository;
import com.gestionCompte.apirest.repository.ProjectedBudgetItemsRepository;
import com.gestionCompte.apirest.repository.ProjectedBudgetPeriodRepository;
import com.gestionCompte.apirest.repository.ProjectedBudgetSettingsRepository;
import com.gestionCompte.apirest.repository.TransactionRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ProjectedBudgetService {

	private final ProjectedBudgetItemsRepository projectedBudgetItemsRepository;
	private final ProjectedBudgetPeriodRepository projectedBudgetPeriodRepository;
	private final TransactionRepository transactionRepository;
	private final AccountRepository accountRepository;
	private final ProjectedBudgetSettingsRepository projectedBudgetSettingsRepository;


	public List<ProjectedBudgetPeriod> getAllProjectedBudgetPeriod() {
		return projectedBudgetPeriodRepository.findAll();
	}

	public List<ProjectedBudgetPeriod> getAllProjectedBudgetPeriodByAccount(Long accountId) {
		return projectedBudgetPeriodRepository.findByAccountId(accountId);
	}

	public List<ProjectedBudgetPeriod> getFilteredBudgetPeriod(Long accountId, Integer month, Integer year,
			Integer weeksCount) {
		Specification<ProjectedBudgetPeriod> spec = (root, query, cb) -> {
			var predicate = cb.conjunction();

			if (accountId != null) {
				predicate = cb.and(predicate, cb.equal(root.get("account").get("id"), accountId));
			}
			if (month != null) {
				predicate = cb.and(predicate, cb.equal(root.get("month"), month));
			}
			if (year != null) {
				predicate = cb.and(predicate, cb.equal(root.get("year"), year));
			}
			if (weeksCount != null) {
				predicate = cb.and(predicate, cb.equal(root.get("weeksCount"), weeksCount));
			}

			return predicate;
		};
		return projectedBudgetPeriodRepository.findAll(spec);
	}

	public List<ProjectedBudgetItems> getProjectedBudgetItemsByAccountIdAndPeriod(Long accountId, Integer month,
			Integer year) {
		List<ProjectedBudgetPeriod> periodes = getFilteredBudgetPeriod(accountId, month, year, null);
		if (periodes.isEmpty()) {
			return List.of();
		}
		Long periodId = periodes.get(0).getId();

		return projectedBudgetItemsRepository.findByBudgetPeriodId(periodId);
	}

	@Transactional
	public ProjectedBudgetResponseDto createProjectedBudgetPeriod(Long accountId, Integer month, Integer year, Long cloneFromId) {

		Optional<ProjectedBudgetPeriod> period = projectedBudgetPeriodRepository
				.findByAccountIdAndMonthAndYear(accountId, month, year);
		if (period.isPresent()) {
			ProjectedBudgetPeriod p = period.get();

		    ProjectedBudgetPeriodDto periodDto = new ProjectedBudgetPeriodDto(
		        p.getId(),
		        p.getAccount().getId(),
		        p.getMonth(),
		        p.getYear(),
		        p.getWeeksCount()
		    );

		    throw new ResourceAlreadyExistsException(periodDto);
		}

		LocalDate startOfMonth = LocalDate.of(year, month, 1);
		LocalDate endOfMonth = startOfMonth.with(TemporalAdjusters.lastDayOfMonth());

		WeekFields weekFields = WeekFields.of(Locale.FRANCE);
		int firstWeek = startOfMonth.get(weekFields.weekOfMonth());
		int lastWeek = endOfMonth.get(weekFields.weekOfMonth());
		ProjectedBudgetPeriod newProjectedBudgetPeriod = new ProjectedBudgetPeriod();
		Account account = accountRepository.getReferenceById(accountId);
		newProjectedBudgetPeriod.setAccount(account);
		newProjectedBudgetPeriod.setMonth(month);
		newProjectedBudgetPeriod.setYear(year);
		newProjectedBudgetPeriod.setWeeksCount((lastWeek - firstWeek) + 1);

		ProjectedBudgetPeriod savedPeriod = projectedBudgetPeriodRepository.save(newProjectedBudgetPeriod);
		SuggestedPeriodDataDto suggestions;
		if(cloneFromId != null) {
			suggestions = new SuggestedPeriodDataDto( List.of() , this.duplicateItemsFromPeriod(cloneFromId, savedPeriod.getId()));

		}else {
			suggestions = getSuggestedRecurrentTransactionsForPeriod(accountId, month, year);
		}
		return new ProjectedBudgetResponseDto(savedPeriod, suggestions);

	}

	@Transactional
	public void deleteProjectedBudgetPeriod(Long id) {
		if (!projectedBudgetPeriodRepository.existsById(id)) {
			throw new ResourceNotFoundException(ErrorMessages.PERIOD_NOT_FOUND + id);
		}
		deleteProjectedBudgetItemsByPeriodId(id);

		projectedBudgetPeriodRepository.deleteById(id);
	}

	public SuggestedPeriodDataDto getSuggestedRecurrentTransactionsForPeriod(Long accountId, int targetMonth, int targetYear) {
	    List<Transaction> recurrentTransactions = transactionRepository
	            .findByAccountIdAndRecurrenceMonthsGreaterThan(accountId, 0);
	    List<Transaction> suggestedTransactions = new ArrayList<>();
	    List<ProjectedBudgetSettings> settings = projectedBudgetSettingsRepository.findAll();
	    List<ProjectedBudgetItems> listProjectedBudgetItems = new ArrayList<>();

	    for (Transaction transaction : recurrentTransactions) {
	        if (!transaction.getAccount().isActive()
	                || !transaction.getCategory().isActive()
	                || !transaction.getPaymentMethod().isActive()) {
	            continue;
	        }

	        int rec = transaction.getRecurrenceMonths();
	        LocalDate dateTransaction = transaction.getEmissionDate();
	        int expectedParentMonth = targetMonth - rec;
	        int expectedParentYear = targetYear;

	        if (expectedParentMonth <= 0) {
	            expectedParentMonth += 12;
	            expectedParentYear -= 1;
	        }

	        if (dateTransaction.getMonthValue() == expectedParentMonth && dateTransaction.getYear() == expectedParentYear) {
	            processSuggestedTransaction(transaction, settings, listProjectedBudgetItems, suggestedTransactions);
	        }
	    }

	    return new SuggestedPeriodDataDto(suggestedTransactions, listProjectedBudgetItems);
	}

	private void processSuggestedTransaction(Transaction transaction, List<ProjectedBudgetSettings> settings,
	        List<ProjectedBudgetItems> listProjectedBudgetItems, List<Transaction> suggestedTransactions) {

	    Long categoryId = transaction.getCategory().getId();

	    ProjectedBudgetSettings matchingSetting = settings.stream()
	        .filter(s -> s.getCategory().getId().equals(categoryId))
	        .findFirst()
	        .orElse(null);

	    if (matchingSetting != null) {
	        ProjectedBudgetItems item = new ProjectedBudgetItems();
	        item.setAccountAmount(transaction.getAmount());
	        item.setCategory(transaction.getCategory());
	        item.setPaymentMethod(transaction.getPaymentMethod());
	        item.setType(matchingSetting.getType());

	        listProjectedBudgetItems.add(item);
	    } else {
	        suggestedTransactions.add(transaction);
	    }
	}


	public void deleteProjectedBudgetItemsByPeriodId(Long periodId) {
		projectedBudgetItemsRepository.deleteByBudgetPeriodId(periodId);
	}

	@Transactional
	public List<ProjectedBudgetItems> updateProjectedBudgetItems(Long periodId,
			List<ProjectedBudgetItems> listProjectedBudgetItems) {

	    List<ProjectedBudgetItems> existingItems = projectedBudgetItemsRepository.findByBudgetPeriodId(periodId);

	    List<ProjectedBudgetItems> toDelete = existingItems.stream()
	        .filter(existing -> listProjectedBudgetItems.stream().noneMatch(incoming -> incoming.getId() != null && incoming.getId().equals(existing.getId())))
	        .toList();

	    projectedBudgetItemsRepository.deleteAll(toDelete);

		ProjectedBudgetPeriod periodProxy = projectedBudgetPeriodRepository.getReferenceById(periodId);
		for (ProjectedBudgetItems item : listProjectedBudgetItems) {
			item.setBudgetPeriod(periodProxy);
		}
		return projectedBudgetItemsRepository.saveAll(listProjectedBudgetItems);
	}



	public List<ProjectedBudgetPeriod> getAvailablePeriodsForDuplication(Long accountId) {
	    LocalDate limitDate = LocalDate.now(ZoneId.systemDefault()).minusMonths(12).withDayOfMonth(1);

	    List<ProjectedBudgetPeriod> accountPeriods = projectedBudgetPeriodRepository.findByAccountId(accountId);

	    return accountPeriods.stream()
	        .filter(p -> p.getPeriodDate() != null && !p.getPeriodDate().isBefore(limitDate))
	        .sorted(Comparator.comparing(ProjectedBudgetPeriod::getYear)
	                  .thenComparing(ProjectedBudgetPeriod::getMonth).reversed())
	        .toList();
	}

	public List<ProjectedBudgetItems> duplicateItemsFromPeriod(Long idModel, Long idCible){
		List<ProjectedBudgetItems> itemsModel = this.projectedBudgetItemsRepository.findByBudgetPeriodId(idModel);
		List<ProjectedBudgetItems> newItems = new ArrayList<>();
		ProjectedBudgetPeriod cible = this.projectedBudgetPeriodRepository.findById(idCible)
		        .orElseThrow(() -> new  ResourceNotFoundException(ErrorMessages.PERIOD_NOT_FOUND + idCible));

		for (ProjectedBudgetItems oldItem : itemsModel) {
			ProjectedBudgetItems newItem = new ProjectedBudgetItems();

			newItem.setBudgetPeriod(cible);
	        newItem.setAccountAmount(oldItem.getAccountAmount());
	        newItem.setCashAmount(oldItem.getCashAmount());
	        newItem.setComment(oldItem.getComment());
	        newItem.setType(oldItem.getType());
	        newItem.setCategory(oldItem.getCategory());
	        newItem.setPaymentMethod(oldItem.getPaymentMethod());

	        newItems.add(newItem);
		}

		return this.projectedBudgetItemsRepository.saveAll(newItems);
	}


}
