package com.gestionCompte.apirest.services;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.time.temporal.WeekFields;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.gestionCompte.apirest.dto.AnalyticsDashboardDto;
import com.gestionCompte.apirest.dto.AnalyticsEvolutionDto;
import com.gestionCompte.apirest.dto.BalanceDashboardDto;
import com.gestionCompte.apirest.dto.MatrixDashboardDto;
import com.gestionCompte.apirest.dto.MatrixMonthlyDashboardDto;
import com.gestionCompte.apirest.dto.SummaryDto;
import com.gestionCompte.apirest.model.Account;
import com.gestionCompte.apirest.model.Transaction;
import com.gestionCompte.apirest.model.TransactionType;
import com.gestionCompte.apirest.repository.AccountRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DashboardService {

	private final AccountRepository accountRepository;
	private final TransactionService transactionService;

	public BalanceDashboardDto getDynamicBalance(Long accountId) {

		List<Transaction> transactions = transactionService.getFilteredTransactions(accountId, null, null, null, null,
				null, null, null, null, null, null, null);

		BigDecimal baseInitialBalance = BigDecimal.ZERO;

		if (accountId != null) {
			Account account = accountRepository.findById(accountId).orElseThrow(
					() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found with id: " + accountId));
			baseInitialBalance = account.getInitialBalance();
		} else {
			baseInitialBalance = accountRepository.findByIsActiveTrue().stream().map(Account::getInitialBalance)
					.reduce(BigDecimal.ZERO, BigDecimal::add);
		}

		BigDecimal currentBalance = baseInitialBalance;
		BigDecimal projectedBalance = baseInitialBalance;

		for (Transaction t : transactions) {
			if ((accountId == null && t.getAccount().isActive())|| (accountId != null)) {
				if (t.isChecked()) {
					currentBalance = (t.getType() == TransactionType.DEBIT) ? currentBalance.subtract(t.getAmount())
							: currentBalance.add(t.getAmount());
				}
				projectedBalance = (t.getType() == TransactionType.DEBIT) ? projectedBalance.subtract(t.getAmount())
						: projectedBalance.add(t.getAmount());
			}
		}

		BalanceDashboardDto dto = new BalanceDashboardDto();
		dto.setId(accountId);
		dto.setLabel(accountId != null ? "Vue Compte Unique" : "Vue Globale (Tous les comptes)");
		dto.setInitialBalance(baseInitialBalance);
		dto.setCurrentBalance(currentBalance);
		dto.setProjectedBalance(projectedBalance);

		return dto;
	}
	
	public SummaryDto getHomeDashboardSummary() {
	    List<Account> activeAccounts = accountRepository.findByIsActiveTrueOrderByPositionAsc();
	    
	    List<BalanceDashboardDto> detailComptes = new ArrayList<>();
	    
	    BigDecimal soldeGlobalReel = BigDecimal.ZERO;
	    BigDecimal soldeGlobalPrevisionnel = BigDecimal.ZERO;
	    
	    for (Account account : activeAccounts) {
	        BalanceDashboardDto dto = getDynamicBalance(account.getId());
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

	
	public AnalyticsDashboardDto getSpendDistribution(Long accountId, Integer month, Integer year, Boolean isChecked) {
	    List<Transaction> transactions = transactionService.getFilteredTransactions(
	        accountId, // accountId
	        null,      // categoryId
	        null,      // paymentMethodId
	        null,      // day (null pour prendre tout le mois ou l'année)
	        month,     // month
	        year,      // year
	        null,      // minAmount
	        null,      // maxAmount
	        null,      // type
	        isChecked,      // isChecked
	        null,      // recurrenceMonths
	        null       // limit
	    );

	    java.util.Map<String, java.util.Map<com.gestionCompte.apirest.model.TransactionType, BigDecimal>> categoryMap = new java.util.HashMap<>();
	    java.util.Map<String, java.util.Map<com.gestionCompte.apirest.model.TransactionType, BigDecimal>> paymentMap = new java.util.HashMap<>();

	    for (Transaction t : transactions) {
	        if (t.getCategory() != null && t.getCategory().getLabel() != null) {
	            String label = t.getCategory().getLabel();
	            categoryMap.putIfAbsent(label, new java.util.HashMap<>());
	            java.util.Map<com.gestionCompte.apirest.model.TransactionType, BigDecimal> subMap = categoryMap.get(label);
	            subMap.put(t.getType(), subMap.getOrDefault(t.getType(), BigDecimal.ZERO).add(t.getAmount()));
	        }

	        if (t.getPaymentMethod() != null && t.getPaymentMethod().getLabel() != null) {
	            String label = t.getPaymentMethod().getLabel();
	            paymentMap.putIfAbsent(label, new java.util.HashMap<>());
	            java.util.Map<com.gestionCompte.apirest.model.TransactionType, BigDecimal> subMap = paymentMap.get(label);
	            subMap.put(t.getType(), subMap.getOrDefault(t.getType(), BigDecimal.ZERO).add(t.getAmount()));
	        }
	    }

	    List<AnalyticsDashboardDto.DataGroupDto> categoriesData = new java.util.ArrayList<>();
	    categoryMap.forEach((label, subMap) -> subMap.forEach((type, total) -> 
	        categoriesData.add(new AnalyticsDashboardDto.DataGroupDto(label, total, type))
	    ));

	    List<AnalyticsDashboardDto.DataGroupDto> paymentsData = new java.util.ArrayList<>();
	    paymentMap.forEach((label, subMap) -> subMap.forEach((type, total) -> 
	        paymentsData.add(new AnalyticsDashboardDto.DataGroupDto(label, total, type))
	    ));

	    AnalyticsDashboardDto dto = new AnalyticsDashboardDto();
	    dto.setCategoryDistribution(categoriesData);
	    dto.setPaymentDistribution(paymentsData);
	    
	    return dto;
	}
	
	public AnalyticsEvolutionDto getEvolutionDashboard(Long accountId, Integer year, Boolean isChecked) {
	    List<Transaction> transactions = transactionService.getFilteredTransactions(
	        accountId, null, null, null, null, year, null, null, null, isChecked, null, null
	    );

	    // Clé principale : le numéro du mois (1 à 12)
	    java.util.Map<Integer, AnalyticsEvolutionDto.MonthDataDto> globalMaps = new java.util.HashMap<>();
	    
	    // Clé principale : Nom de la catégorie | Sous-clé : Numéro du mois
	    java.util.Map<String, java.util.Map<Integer, AnalyticsEvolutionDto.MonthDataDto>> categoryMaps = new java.util.HashMap<>();
	    
	 // Clé principale : Nom du moyen de paiement | Sous-clé : Numéro du mois
	    java.util.Map<String, java.util.Map<Integer, AnalyticsEvolutionDto.MonthDataDto>> paymentMethodMaps = new java.util.HashMap<>();

	    for (int m = 1; m <= 12; m++) {
	        globalMaps.put(m, new AnalyticsEvolutionDto.MonthDataDto(m, BigDecimal.ZERO, BigDecimal.ZERO));
	    }

	    for (Transaction t : transactions) {
	        if (t.getEmissionDate() == null) continue;
	        
	        int monthValue = t.getEmissionDate().getMonthValue();
	        BigDecimal amount = t.getAmount() != null ? t.getAmount() : BigDecimal.ZERO;
	        boolean isDebit = t.getType() == com.gestionCompte.apirest.model.TransactionType.DEBIT;

	        AnalyticsEvolutionDto.MonthDataDto globalMonth = globalMaps.get(monthValue);
	        if (isDebit) {
	            globalMonth.setDebits(globalMonth.getDebits().add(amount));
	        } else {
	            globalMonth.setCredits(globalMonth.getCredits().add(amount));
	        }

	        if (t.getCategory() != null && t.getCategory().getLabel() != null) {
	            String catLabel = t.getCategory().getLabel();
	            
	            categoryMaps.putIfAbsent(catLabel, new java.util.HashMap<>());
	            java.util.Map<Integer, AnalyticsEvolutionDto.MonthDataDto> catMonthMap = categoryMaps.get(catLabel);
	            
	            catMonthMap.putIfAbsent(monthValue, new AnalyticsEvolutionDto.MonthDataDto(monthValue, BigDecimal.ZERO, BigDecimal.ZERO));
	            AnalyticsEvolutionDto.MonthDataDto catMonthData = catMonthMap.get(monthValue);
	            
	            if (isDebit) {
	                catMonthData.setDebits(catMonthData.getDebits().add(amount));
	            } else {
	                catMonthData.setCredits(catMonthData.getCredits().add(amount));
	            }
	        }
	        
	        if (t.getPaymentMethod() != null && t.getPaymentMethod().getLabel() != null) {
	            String paymentMethodLabel = t.getPaymentMethod().getLabel();
	            
	            paymentMethodMaps.putIfAbsent(paymentMethodLabel, new java.util.HashMap<>());
	            java.util.Map<Integer, AnalyticsEvolutionDto.MonthDataDto> paymentMethodMonthMap = paymentMethodMaps.get(paymentMethodLabel);
	            
	            paymentMethodMonthMap.putIfAbsent(monthValue, new AnalyticsEvolutionDto.MonthDataDto(monthValue, BigDecimal.ZERO, BigDecimal.ZERO));
	            AnalyticsEvolutionDto.MonthDataDto paymentMethodMonthData = paymentMethodMonthMap.get(monthValue);
	            
	            if (isDebit) {
	            	paymentMethodMonthData.setDebits(paymentMethodMonthData.getDebits().add(amount));
	            } else {
	            	paymentMethodMonthData.setCredits(paymentMethodMonthData.getCredits().add(amount));
	            }
	        }
	    }

	    List<AnalyticsEvolutionDto.MonthDataDto> globalList = new java.util.ArrayList<>(globalMaps.values());
	    globalList.sort(java.util.Comparator.comparingInt(AnalyticsEvolutionDto.MonthDataDto::getMonth));

	    List<AnalyticsEvolutionDto.CategoryEvolutionDto> categoryList = new java.util.ArrayList<>();
	    categoryMaps.forEach((catLabel, monthMap) -> {
	        List<AnalyticsEvolutionDto.MonthDataDto> details = new java.util.ArrayList<>(monthMap.values());
	        details.sort(java.util.Comparator.comparingInt(AnalyticsEvolutionDto.MonthDataDto::getMonth));
	        categoryList.add(new AnalyticsEvolutionDto.CategoryEvolutionDto(catLabel, details));
	    });
	    List<AnalyticsEvolutionDto.PaymentMethodEvolutionDto> paymentList = new java.util.ArrayList<>();
	    paymentMethodMaps.forEach((label, monthMap) -> {
	        List<AnalyticsEvolutionDto.MonthDataDto> details = new java.util.ArrayList<>(monthMap.values());
	        details.sort(java.util.Comparator.comparingInt(AnalyticsEvolutionDto.MonthDataDto::getMonth));
	        paymentList.add(new AnalyticsEvolutionDto.PaymentMethodEvolutionDto(label, details));
	    });

	    AnalyticsEvolutionDto dto = new AnalyticsEvolutionDto();
	    dto.setGlobalEvolution(globalList);
	    dto.setCategoryEvolution(categoryList);
	    dto.setPaymentMethodEvolution(paymentList);

	    
	    return dto;
	}


	public MatrixDashboardDto getAnnualMatrix(Long accountId, Integer year, Boolean isChecked) {
	    List<Transaction> transactions = transactionService.getFilteredTransactions(
	        accountId, null, null, null, null, year, null, null, null, isChecked, null, null
	    );

	    Map<String, Map<String, BigDecimal[]>> treeMap = new HashMap<>();

	    BigDecimal[] globalMonthlyTotals = new BigDecimal[12];
	    Arrays.fill(globalMonthlyTotals, BigDecimal.ZERO);
	    BigDecimal globalGrandTotal = BigDecimal.ZERO;

	    for (Transaction t : transactions) {
	        String paymentLabel = (t.getPaymentMethod() != null && t.getPaymentMethod().getLabel() != null) 
	            ? t.getPaymentMethod().getLabel() : "Sans moyen de paiement";
	            
	        String categoryLabel = (t.getCategory() != null && t.getCategory().getLabel() != null) 
	            ? t.getCategory().getLabel() : "Sans catégorie";
	        
	        if (t.getEmissionDate() == null) continue;
	        int monthIndex = t.getEmissionDate().getMonthValue() - 1; 
	        
	        BigDecimal amount = t.getAmount() != null ? t.getAmount() : BigDecimal.ZERO;

	        treeMap.putIfAbsent(paymentLabel, new HashMap<>());
	        Map<String, BigDecimal[]> categoryMap = treeMap.get(paymentLabel);
	        
	        if (!categoryMap.containsKey(categoryLabel)) {
	            BigDecimal[] months = new BigDecimal[12];
	            Arrays.fill(months, BigDecimal.ZERO);
	            categoryMap.put(categoryLabel, months);
	        }

	        boolean isDebit = t.getType() == com.gestionCompte.apirest.model.TransactionType.DEBIT;

	        BigDecimal signedAmount = isDebit ? amount.negate() : amount; // Rend le montant négatif si c'est un débit
	        BigDecimal[] catMonths = categoryMap.get(categoryLabel);
	        catMonths[monthIndex] = catMonths[monthIndex].add(signedAmount);

	        globalMonthlyTotals[monthIndex] = globalMonthlyTotals[monthIndex].add(signedAmount);
	        globalGrandTotal = globalGrandTotal.add(signedAmount);
	    }

	    List<MatrixDashboardDto.PaymentMethodRowDto> finalRows = new ArrayList<>();

	    for (Map.Entry<String, Map<String, BigDecimal[]>> paymentEntry : treeMap.entrySet()) {
	        String paymentLabel = paymentEntry.getKey();
	        Map<String, BigDecimal[]> categoryMap = paymentEntry.getValue();

	        BigDecimal[] paymentMonthlyAmounts = new BigDecimal[12];
	        Arrays.fill(paymentMonthlyAmounts, BigDecimal.ZERO);
	        BigDecimal paymentTotalYear = BigDecimal.ZERO;

	        List<MatrixDashboardDto.CategoryRowDto> categoryRows = new ArrayList<>();

	        for (Map.Entry<String, BigDecimal[]> catEntry : categoryMap.entrySet()) {
	            String catLabel = catEntry.getKey();
	            BigDecimal[] catMonths = catEntry.getValue();
	            
	            BigDecimal catTotalYear = Arrays.stream(catMonths).reduce(BigDecimal.ZERO, BigDecimal::add);

	            categoryRows.add(new MatrixDashboardDto.CategoryRowDto(catLabel, catMonths, catTotalYear));

	            for (int i = 0; i < 12; i++) {
	                paymentMonthlyAmounts[i] = paymentMonthlyAmounts[i].add(catMonths[i]);
	            }
	            paymentTotalYear = paymentTotalYear.add(catTotalYear);
	        }

	        finalRows.add(new MatrixDashboardDto.PaymentMethodRowDto(
	            paymentLabel, paymentMonthlyAmounts, paymentTotalYear, categoryRows
	        ));
	    }

	    return new MatrixDashboardDto(finalRows, globalMonthlyTotals, globalGrandTotal);
	}


	public MatrixMonthlyDashboardDto getMonthlyMatrix(Long accountId,  int month,int year, Boolean isChecked) {
	    LocalDate startOfMonth = LocalDate.of(year, month, 1);
	    LocalDate endOfMonth = startOfMonth.with(TemporalAdjusters.lastDayOfMonth());

	    WeekFields weekFields = WeekFields.of(Locale.FRANCE);
	    int firstWeek = startOfMonth.get(weekFields.weekOfMonth());
	    int lastWeek = endOfMonth.get(weekFields.weekOfMonth());
	    
	    int maxWeeksInMonth = (lastWeek - firstWeek) + 1;

	    List<Transaction> transactions = transactionService.getFilteredTransactions(accountId, null, null, null, month, year, null, null, null, isChecked, null, null);
	    
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

	            categoryRows.add(new MatrixMonthlyDashboardDto.CategoryRowDto(
	                catLabel, 
	                catWeeklyAmounts, 
	                catTotalMonth
	            ));
	            
	            pmTotalMonth = pmTotalMonth.add(catTotalMonth);
	        }

	        for (int i = 0; i < maxWeeksInMonth; i++) {
	            weeklyGrandTotals[i] = weeklyGrandTotals[i].add(pmWeeklyTotals[i]);
	        }
	        absoluteGrandTotal = absoluteGrandTotal.add(pmTotalMonth);

	        rowDtos.add(new MatrixMonthlyDashboardDto.PaymentMethodRowDto(
	            pmLabel, 
	            pmWeeklyTotals, 
	            pmTotalMonth, 
	            categoryRows
	        ));
	    }

	    return new MatrixMonthlyDashboardDto(
	        maxWeeksInMonth, 
	        rowDtos, 
	        weeklyGrandTotals, 
	        absoluteGrandTotal
	    );
	}
}
