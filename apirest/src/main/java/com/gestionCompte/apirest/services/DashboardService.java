package com.gestionCompte.apirest.services;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.time.temporal.WeekFields;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.gestionCompte.apirest.dto.AnalyticsDashboardDto;
import com.gestionCompte.apirest.dto.AnalyticsEvolutionDto;
import com.gestionCompte.apirest.dto.BalanceDashboardDto;
import com.gestionCompte.apirest.dto.MatrixDashboardDto;
import com.gestionCompte.apirest.dto.MatrixMonthlyDashboardDto;
import com.gestionCompte.apirest.dto.StartEndBalancesDto;
import com.gestionCompte.apirest.dto.SummaryDto;
import com.gestionCompte.apirest.exception.ErrorMessages;
import com.gestionCompte.apirest.exception.ResourceNotFoundException;
import com.gestionCompte.apirest.model.Account;
import com.gestionCompte.apirest.model.AccountType;
import com.gestionCompte.apirest.model.Transaction;
import com.gestionCompte.apirest.model.TransactionType;
import com.gestionCompte.apirest.repository.AccountRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DashboardService {

	private final AccountRepository accountRepository;
	private final TransactionService transactionService;

	public BalanceDashboardDto getDynamicBalance(Long accountId, AccountType accountType) {
	    List<Transaction> transactions = transactionService.getFilteredTransactions(accountId, null, null, null, null,
	            null, null, null, null, null, null, null, accountType);

	    BigDecimal baseInitialBalance = calculateBaseInitialBalance(accountId, accountType);

	    BigDecimal currentBalance = baseInitialBalance;
	    BigDecimal projectedBalance = baseInitialBalance;
	    LocalDate firstNegativeDate = null;

	    for (int i = transactions.size() - 1; i >= 0; i--) {
	        Transaction t = transactions.get(i);

	        if (isAccountEligible(t, accountId, accountType)) {
	            // Mise à jour des soldes courant et prévisionnel
	            BigDecimal amount = t.getAmount();
	            boolean isDebit = t.getType() == TransactionType.DEBIT;

	            if (t.isChecked()) {
	                currentBalance = isDebit ? currentBalance.subtract(amount) : currentBalance.add(amount);
	            }
	            projectedBalance = isDebit ? projectedBalance.subtract(amount) : projectedBalance.add(amount);

	            // Gestion de la première date négative
	            firstNegativeDate = trackFirstNegativeDate(projectedBalance, firstNegativeDate, t.getEmissionDate());
	        }
	    }

	    // 3. Construction et assignation du DTO
	    BalanceDashboardDto dto = new BalanceDashboardDto();
	    dto.setId(accountId);
	    dto.setLabel(determineDashboardLabel(accountId, accountType));
	    dto.setInitialBalance(baseInitialBalance);
	    dto.setCurrentBalance(currentBalance);
	    dto.setProjectedBalance(projectedBalance);
	    dto.setFirstNegativeDate(firstNegativeDate);

	    return dto;
	}


	private LocalDate trackFirstNegativeDate(BigDecimal projectedBalance, LocalDate currentNegativeDate, LocalDate emissionDate) {
	    if (projectedBalance.compareTo(BigDecimal.ZERO) < 0) {
	        return (currentNegativeDate == null) ? emissionDate : currentNegativeDate;
	    }
	    return null;
	}

	private String determineDashboardLabel(Long accountId, AccountType accountType) {
	    if (accountId != null) {
	        return "Vue Compte Unique";
	    }
	    if (accountType != null) {
	        return "Vue Filtrée : " + accountType.name();
	    }
	    return "Vue Globale (Tous les comptes)";
	}


	public SummaryDto getHomeDashboardSummary() {
		List<Account> activeAccounts = accountRepository.findByIsActiveTrueOrderByPositionAsc();

		List<BalanceDashboardDto> detailComptes = new ArrayList<>();

		BigDecimal soldeGlobalReel = BigDecimal.ZERO;
		BigDecimal soldeGlobalPrevisionnel = BigDecimal.ZERO;

		for (Account account : activeAccounts) {
			BalanceDashboardDto dto = getDynamicBalance(account.getId(), null);
			dto.setLabel(account.getLabel());
			detailComptes.add(dto);

			soldeGlobalReel = soldeGlobalReel.add(dto.getCurrentBalance());
			soldeGlobalPrevisionnel = soldeGlobalPrevisionnel.add(dto.getProjectedBalance());
		}
		SummaryDto homeDto = new SummaryDto();
		homeDto.setCurrentGlobalBalance(soldeGlobalReel);
		homeDto.setProjectedGlobalBalance(soldeGlobalPrevisionnel);
		homeDto.setAccountsDetails(detailComptes);

		return homeDto;
	}

	public AnalyticsDashboardDto getSpendDistribution(Long accountId, Integer month, Integer year, Boolean isChecked,
			AccountType accountType) {
		List<Transaction> transactions = transactionService.getFilteredTransactions(accountId, // accountId
				null, // categoryId
				null, // paymentMethodId
				null, // day (null pour prendre tout le mois ou l'année)
				month, // month
				year, // year
				null, // minAmount
				null, // maxAmount
				null, // type
				isChecked, // isChecked
				null, // recurrenceMonths
				null, // limit
				accountType // AccountType
		);

		Map<String, Map<TransactionType, BigDecimal>> categoryMap = new HashMap<>();
		Map<String, Map<TransactionType, BigDecimal>> paymentMap = new HashMap<>();

		for (Transaction t : transactions) {
			if (t.getCategory() != null && t.getCategory().getLabel() != null) {
				String label = t.getCategory().getLabel();
				categoryMap.putIfAbsent(label, new EnumMap<>(TransactionType.class));
				 Map<TransactionType, BigDecimal> subMap = categoryMap.get(label);
				subMap.put(t.getType(), subMap.getOrDefault(t.getType(), BigDecimal.ZERO).add(t.getAmount()));
			}

			if (t.getPaymentMethod() != null && t.getPaymentMethod().getLabel() != null) {
				String label = t.getPaymentMethod().getLabel();
				paymentMap.putIfAbsent(label, new EnumMap<>(TransactionType.class));
				Map<TransactionType, BigDecimal> subMap = paymentMap
						.get(label);
				subMap.put(t.getType(), subMap.getOrDefault(t.getType(), BigDecimal.ZERO).add(t.getAmount()));
			}
		}

		List<AnalyticsDashboardDto.DataGroupDto> categoriesData = new ArrayList<>();
		categoryMap.forEach((label, subMap) -> subMap.forEach(
				(type, total) -> categoriesData.add(new AnalyticsDashboardDto.DataGroupDto(label, total, type))));

		List<AnalyticsDashboardDto.DataGroupDto> paymentsData = new ArrayList<>();
		paymentMap.forEach((label, subMap) -> subMap.forEach(
				(type, total) -> paymentsData.add(new AnalyticsDashboardDto.DataGroupDto(label, total, type))));

		AnalyticsDashboardDto dto = new AnalyticsDashboardDto();
		dto.setCategoryDistribution(categoriesData);
		dto.setPaymentDistribution(paymentsData);

		return dto;
	}

	public AnalyticsEvolutionDto getEvolutionDashboard(Long accountId, Integer year, Boolean isChecked, AccountType accountType) {
	    List<Transaction> transactions = transactionService.getFilteredTransactions(accountId, null, null, null, null,
	            year, null, null, null, isChecked, null, null, accountType);

	    Map<Integer, AnalyticsEvolutionDto.MonthDataDto> globalMaps = new HashMap<>();
	    Map<String, Map<Integer, AnalyticsEvolutionDto.MonthDataDto>> categoryMaps = new HashMap<>();
	    Map<String, Map<Integer, AnalyticsEvolutionDto.MonthDataDto>> paymentMethodMaps = new HashMap<>();

	    for (int m = 1; m <= 12; m++) {
	        globalMaps.put(m, new AnalyticsEvolutionDto.MonthDataDto(m, BigDecimal.ZERO, BigDecimal.ZERO));
	    }

	    for (Transaction t : transactions) {
	        if (t.getEmissionDate() == null) {
				continue;
			}

	        int monthValue = t.getEmissionDate().getMonthValue();
	        BigDecimal amount = t.getAmount() != null ? t.getAmount() : BigDecimal.ZERO;
	        boolean isDebit = t.getType() == TransactionType.DEBIT;

	        updateGlobalEvolution(globalMaps, monthValue, amount, isDebit);
	        updateCategoryEvolution(categoryMaps, t, monthValue, amount, isDebit);
	        updatePaymentMethodEvolution(paymentMethodMaps, t, monthValue, amount, isDebit);
	    }

	    // Construction du DTO final
	    List<AnalyticsEvolutionDto.MonthDataDto> globalList = new ArrayList<>(globalMaps.values());
	    globalList.sort(Comparator.comparingInt(AnalyticsEvolutionDto.MonthDataDto::getMonth));

	    List<AnalyticsEvolutionDto.CategoryEvolutionDto> categoryList = new ArrayList<>();
	    categoryMaps.forEach((catLabel, monthMap) -> {
	        List<AnalyticsEvolutionDto.MonthDataDto> details = new ArrayList<>(monthMap.values());
	        details.sort(Comparator.comparingInt(AnalyticsEvolutionDto.MonthDataDto::getMonth));
	        categoryList.add(new AnalyticsEvolutionDto.CategoryEvolutionDto(catLabel, details));
	    });

	    List<AnalyticsEvolutionDto.PaymentMethodEvolutionDto> paymentList = new ArrayList<>();
	    paymentMethodMaps.forEach((label, monthMap) -> {
	        List<AnalyticsEvolutionDto.MonthDataDto> details = new ArrayList<>(monthMap.values());
	        details.sort(Comparator.comparingInt(AnalyticsEvolutionDto.MonthDataDto::getMonth));
	        paymentList.add(new AnalyticsEvolutionDto.PaymentMethodEvolutionDto(label, details));
	    });

	    AnalyticsEvolutionDto dto = new AnalyticsEvolutionDto();
	    dto.setGlobalEvolution(globalList);
	    dto.setCategoryEvolution(categoryList);
	    dto.setPaymentMethodEvolution(paymentList);

	    return dto;
	}

	private void updateGlobalEvolution(Map<Integer, AnalyticsEvolutionDto.MonthDataDto> globalMaps, int monthValue, BigDecimal amount, boolean isDebit) {
	    updateMonthData(globalMaps.get(monthValue), amount, isDebit);
	}

	private void updateCategoryEvolution(Map<String, Map<Integer, AnalyticsEvolutionDto.MonthDataDto>> categoryMaps, Transaction t, int monthValue, BigDecimal amount, boolean isDebit) {
	    if (t.getCategory() == null || t.getCategory().getLabel() == null) {
			return;
		}

	    String catLabel = t.getCategory().getLabel();
	    categoryMaps.putIfAbsent(catLabel, new HashMap<>());
	    Map<Integer, AnalyticsEvolutionDto.MonthDataDto> catMonthMap = categoryMaps.get(catLabel);

	    catMonthMap.putIfAbsent(monthValue, new AnalyticsEvolutionDto.MonthDataDto(monthValue, BigDecimal.ZERO, BigDecimal.ZERO));
	    updateMonthData(catMonthMap.get(monthValue), amount, isDebit);
	}

	private void updatePaymentMethodEvolution(Map<String, Map<Integer, AnalyticsEvolutionDto.MonthDataDto>> paymentMethodMaps, Transaction t, int monthValue, BigDecimal amount, boolean isDebit) {
	    if (t.getPaymentMethod() == null || t.getPaymentMethod().getLabel() == null) {
			return;
		}

	    String paymentMethodLabel = t.getPaymentMethod().getLabel();
	    paymentMethodMaps.putIfAbsent(paymentMethodLabel, new HashMap<>());
	    Map<Integer, AnalyticsEvolutionDto.MonthDataDto> paymentMethodMonthMap = paymentMethodMaps.get(paymentMethodLabel);

	    paymentMethodMonthMap.putIfAbsent(monthValue, new AnalyticsEvolutionDto.MonthDataDto(monthValue, BigDecimal.ZERO, BigDecimal.ZERO));
	    updateMonthData(paymentMethodMonthMap.get(monthValue), amount, isDebit);
	}

	private void updateMonthData(AnalyticsEvolutionDto.MonthDataDto data, BigDecimal amount, boolean isDebit) {
	    if (isDebit) {
	        data.setDebits(data.getDebits().add(amount));
	    } else {
	        data.setCredits(data.getCredits().add(amount));
	    }
	}


	public MatrixDashboardDto getAnnualMatrix(Long accountId, Integer year, Boolean isChecked, AccountType accountType) {
	    List<Transaction> transactions = transactionService.getFilteredTransactions(accountId, null, null, null, null,
	            year, null, null, null, isChecked, null, null, accountType);

	    Map<String, Map<String, BigDecimal[]>> treeMap = new HashMap<>();
	    BigDecimal[] globalMonthlyTotals = new BigDecimal[12];
	    Arrays.fill(globalMonthlyTotals, BigDecimal.ZERO);
	    BigDecimal globalGrandTotal = BigDecimal.ZERO;

	    for (Transaction t : transactions) {
	        if (t.getEmissionDate() == null) {
				continue;
			}

	        String paymentLabel = (t.getPaymentMethod() != null && t.getPaymentMethod().getLabel() != null)
	                ? t.getPaymentMethod().getLabel() : "Sans moyen de paiement";

	        String categoryLabel = (t.getCategory() != null && t.getCategory().getLabel() != null)
	                ? t.getCategory().getLabel() : "Sans catégorie";

	        int monthIndex = t.getEmissionDate().getMonthValue() - 1;
	        BigDecimal amount = t.getAmount() != null ? t.getAmount() : BigDecimal.ZERO;

	        treeMap.putIfAbsent(paymentLabel, new HashMap<>());
	        Map<String, BigDecimal[]> categoryMap = treeMap.get(paymentLabel);

	        if (!categoryMap.containsKey(categoryLabel)) {
	            BigDecimal[] months = new BigDecimal[12];
	            Arrays.fill(months, BigDecimal.ZERO);
	            categoryMap.put(categoryLabel, months);
	        }

	        boolean isDebit = t.getType() == TransactionType.DEBIT;
	        BigDecimal signedAmount = isDebit ? amount.negate() : amount;

	        BigDecimal[] catMonths = categoryMap.get(categoryLabel);
	        catMonths[monthIndex] = catMonths[monthIndex].add(signedAmount);

	        globalMonthlyTotals[monthIndex] = globalMonthlyTotals[monthIndex].add(signedAmount);
	        globalGrandTotal = globalGrandTotal.add(signedAmount);
	    }

	    List<MatrixDashboardDto.PaymentMethodRowDto> finalRows = buildPaymentMethodRows(treeMap);

	    return new MatrixDashboardDto(finalRows, globalMonthlyTotals, globalGrandTotal);
	}

	private List<MatrixDashboardDto.PaymentMethodRowDto> buildPaymentMethodRows(Map<String, Map<String, BigDecimal[]>> treeMap) {
	    List<MatrixDashboardDto.PaymentMethodRowDto> finalRows = new ArrayList<>();

	    for (Map.Entry<String, Map<String, BigDecimal[]>> paymentEntry : treeMap.entrySet()) {
	        String paymentLabel = paymentEntry.getKey();
	        Map<String, BigDecimal[]> categoryMap = paymentEntry.getValue();

	        BigDecimal[] paymentMonthlyAmounts = new BigDecimal[12];
	        Arrays.fill(paymentMonthlyAmounts, BigDecimal.ZERO);

	        List<MatrixDashboardDto.CategoryRowDto> categoryRows = buildCategoryRows(categoryMap, paymentMonthlyAmounts);
	        BigDecimal paymentTotalYear = Arrays.stream(paymentMonthlyAmounts).reduce(BigDecimal.ZERO, BigDecimal::add);

	        finalRows.add(new MatrixDashboardDto.PaymentMethodRowDto(paymentLabel, paymentMonthlyAmounts,
	                paymentTotalYear, categoryRows));
	    }
	    return finalRows;
	}

	private List<MatrixDashboardDto.CategoryRowDto> buildCategoryRows(Map<String, BigDecimal[]> categoryMap, BigDecimal[] paymentMonthlyAmounts) {
	    List<MatrixDashboardDto.CategoryRowDto> categoryRows = new ArrayList<>();

	    for (Map.Entry<String, BigDecimal[]> catEntry : categoryMap.entrySet()) {
	        String catLabel = catEntry.getKey();
	        BigDecimal[] catMonths = catEntry.getValue();

	        BigDecimal catTotalYear = Arrays.stream(catMonths).reduce(BigDecimal.ZERO, BigDecimal::add);
	        categoryRows.add(new MatrixDashboardDto.CategoryRowDto(catLabel, catMonths, catTotalYear));

	        for (int i = 0; i < 12; i++) {
	            paymentMonthlyAmounts[i] = paymentMonthlyAmounts[i].add(catMonths[i]);
	        }
	    }
	    return categoryRows;
	}

	public MatrixMonthlyDashboardDto getMonthlyMatrix(Long accountId, int month, int year, Boolean isChecked,
			AccountType accountType) {
		LocalDate startOfMonth = LocalDate.of(year, month, 1);
		LocalDate endOfMonth = startOfMonth.with(TemporalAdjusters.lastDayOfMonth());

		WeekFields weekFields = WeekFields.of(Locale.FRANCE);
		int firstWeek = startOfMonth.get(weekFields.weekOfMonth());
		int lastWeek = endOfMonth.get(weekFields.weekOfMonth());

		int maxWeeksInMonth = (lastWeek - firstWeek) + 1;

		List<Transaction> transactions = transactionService.getFilteredTransactions(accountId, null, null, null, month,
				year, null, null, null, isChecked, null, null, accountType);

		Map<String, Map<String, BigDecimal[]>> structures = new LinkedHashMap<>();

		for (Transaction t : transactions) {
			if (t.getPaymentMethod() == null || t.getCategory() == null) {
				continue;
			}

			String paymentMethodLabel = t.getPaymentMethod().getLabel();
			String categoryLabel = t.getCategory().getLabel();

			int currentWeekNumber = t.getEmissionDate().get(weekFields.weekOfMonth());
			int weekIndex = currentWeekNumber - firstWeek;

			if (weekIndex < 0 || weekIndex >= maxWeeksInMonth) {
				continue;
			}

			BigDecimal amount = t.getAmount();
			if (t.getType() == TransactionType.DEBIT) {
				amount = amount.negate();
			}

			structures.putIfAbsent(paymentMethodLabel, new LinkedHashMap<>());
			Map<String, BigDecimal[]> categoryMap = structures.get(paymentMethodLabel);

			categoryMap.putIfAbsent(categoryLabel, new BigDecimal[maxWeeksInMonth]);
			BigDecimal[] weeklyAmounts = categoryMap.get(categoryLabel);

			if (weeklyAmounts[weekIndex] == null) {
				weeklyAmounts[weekIndex] = BigDecimal.ZERO;
			}
			weeklyAmounts[weekIndex] = weeklyAmounts[weekIndex].add(amount);
		}

		return buildMatrixFromRawData(maxWeeksInMonth, structures);
	}


	private MatrixMonthlyDashboardDto buildMatrixFromRawData(int maxWeeksInMonth,
			Map<String, Map<String, BigDecimal[]>> structures) {
		List<MatrixMonthlyDashboardDto.PaymentMethodRowDto> rowDtos = new ArrayList<>();
		BigDecimal[] weeklyGrandTotals = new BigDecimal[maxWeeksInMonth];
		BigDecimal absoluteGrandTotal = BigDecimal.ZERO;

		for (int i = 0; i < maxWeeksInMonth; i++) {
			weeklyGrandTotals[i] = BigDecimal.ZERO;
		}

		for (Map.Entry<String, Map<String, BigDecimal[]>> pmEntry : structures.entrySet()) {
			String pmLabel = pmEntry.getKey();
			List<MatrixMonthlyDashboardDto.CategoryRowDto> categoryRows = new ArrayList<>();
			BigDecimal[] pmWeeklyTotals = new BigDecimal[maxWeeksInMonth];
			BigDecimal pmTotalMonth = BigDecimal.ZERO;

			for (int i = 0; i < maxWeeksInMonth; i++) {
				pmWeeklyTotals[i] = BigDecimal.ZERO;
			}

			for (Map.Entry<String, BigDecimal[]> catEntry : pmEntry.getValue().entrySet()) {
				String catLabel = catEntry.getKey();
				BigDecimal[] catWeeklyAmounts = catEntry.getValue();
				BigDecimal catTotalMonth = BigDecimal.ZERO;

				for (int i = 0; i < maxWeeksInMonth; i++) {
					if (catWeeklyAmounts[i] == null) {
						catWeeklyAmounts[i] = BigDecimal.ZERO;
					}
					catTotalMonth = catTotalMonth.add(catWeeklyAmounts[i]);
					pmWeeklyTotals[i] = pmWeeklyTotals[i].add(catWeeklyAmounts[i]);
				}

				categoryRows
						.add(new MatrixMonthlyDashboardDto.CategoryRowDto(catLabel, catWeeklyAmounts, catTotalMonth));
				pmTotalMonth = pmTotalMonth.add(catTotalMonth);
			}

			for (int i = 0; i < maxWeeksInMonth; i++) {
				weeklyGrandTotals[i] = weeklyGrandTotals[i].add(pmWeeklyTotals[i]);
			}
			absoluteGrandTotal = absoluteGrandTotal.add(pmTotalMonth);

			rowDtos.add(new MatrixMonthlyDashboardDto.PaymentMethodRowDto(pmLabel, pmWeeklyTotals, pmTotalMonth,
					categoryRows));
		}

		return new MatrixMonthlyDashboardDto(maxWeeksInMonth, rowDtos, weeklyGrandTotals, absoluteGrandTotal);
	}

	public StartEndBalancesDto getStartEndBalances(Long accountId, int month, int year, Boolean isChecked, AccountType accountType) {
	    LocalDate startOfMonth = LocalDate.of(year, month, 1);
	    LocalDate endOfMonth = startOfMonth.with(TemporalAdjusters.lastDayOfMonth());

	    List<Transaction> transactions = transactionService.getFilteredTransactions(accountId, null, null, null, null,
	            null, null, null, null, isChecked, null, null, accountType);

	    BigDecimal baseInitialBalance = calculateBaseInitialBalance(accountId, accountType);

	    BigDecimal[] balances = { baseInitialBalance, baseInitialBalance }; // index 0 = startBalance, index 1 = endBalance

	    for (Transaction t : transactions) {
	        if (isAccountEligible(t, accountId, accountType)) {
	            updateBalancesForTransaction(t, balances, startOfMonth, endOfMonth);
	        }
	    }

	    StartEndBalancesDto dto = new StartEndBalancesDto();
	    dto.setId(accountId);
	    dto.setStartBalance(balances[0]);
	    dto.setEndBalance(balances[1]);

	    return dto;
	}

	private BigDecimal calculateBaseInitialBalance(Long accountId, AccountType accountType) {
	    if (accountId != null) {
	        Account account = accountRepository.findById(accountId).orElseThrow(
	                () -> new ResourceNotFoundException(ErrorMessages.ACCOUNT_NOT_FOUND + accountId));
	        return account.getInitialBalance();
	    }

	    if (accountType != null) {
	        return accountRepository.findByIsActiveTrue().stream()
	                .filter(a -> a.getType() == accountType)
	                .map(Account::getInitialBalance)
	                .reduce(BigDecimal.ZERO, BigDecimal::add);
	    }

	    return accountRepository.findByIsActiveTrue().stream()
	            .map(Account::getInitialBalance)
	            .reduce(BigDecimal.ZERO, BigDecimal::add);
	}

	private boolean isAccountEligible(Transaction t, Long accountId, AccountType accountType) {
	    if (accountId != null) {
	        return true;
	    }
	    if (accountType != null) {
	        return t.getAccount().isActive() && t.getAccount().getType() == accountType;
	    }
	    return t.getAccount().isActive();
	}

	// Applique le montant de la transaction sur les soldes de début et de fin
	private void updateBalancesForTransaction(Transaction t, BigDecimal[] balances, LocalDate startOfMonth, LocalDate endOfMonth) {
	    BigDecimal amount = t.getAmount();
	    if (t.getType() == TransactionType.DEBIT) {
	        amount = amount.negate();
	    }

	    LocalDate txDate = t.getEmissionDate();
	    if (txDate.isBefore(startOfMonth)) {
	        balances[0] = balances[0].add(amount);
	    }
	    if (txDate.isBefore(endOfMonth) || txDate.equals(endOfMonth)) {
	        balances[1] = balances[1].add(amount);
	    }
	}


}
