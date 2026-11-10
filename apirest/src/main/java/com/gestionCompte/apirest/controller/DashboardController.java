package com.gestionCompte.apirest.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.gestionCompte.apirest.dto.AnalyticsDashboardDto;
import com.gestionCompte.apirest.dto.AnalyticsEvolutionDto;
import com.gestionCompte.apirest.dto.BalanceDashboardDto;
import com.gestionCompte.apirest.dto.MatrixDashboardDto;
import com.gestionCompte.apirest.dto.MatrixMonthlyDashboardDto;
import com.gestionCompte.apirest.dto.StartEndBalancesDto;
import com.gestionCompte.apirest.dto.SummaryDto;
import com.gestionCompte.apirest.model.AccountType;
import com.gestionCompte.apirest.services.DashboardService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/dashboards")
@CrossOrigin(origins = "http://localhost:4200")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/balance")
    public ResponseEntity<BalanceDashboardDto> getBalanceDashboard(
            @RequestParam(required = false) Long accountId,
            @RequestParam(required = false) AccountType accountType) {

    	BalanceDashboardDto dto = dashboardService.getDynamicBalance(accountId, accountType);
        return ResponseEntity.ok(dto);
    }

    @GetMapping("/analytics")
    public ResponseEntity<AnalyticsDashboardDto> getAnalytics(
            @RequestParam(required = false) Long accountId,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Boolean isChecked,
            @RequestParam(required = false) AccountType accountType) {

        AnalyticsDashboardDto analytics = dashboardService.getSpendDistribution(accountId, month, year, isChecked, accountType);
        return ResponseEntity.ok(analytics);
    }

    @GetMapping("/evolution")
    public ResponseEntity<AnalyticsEvolutionDto> getEvolution(
            @RequestParam(required = false) Long accountId,
            @RequestParam Integer year,
            @RequestParam(required = false) Boolean isChecked,
            @RequestParam(required = false) AccountType accountType) {

        AnalyticsEvolutionDto evolution = dashboardService.getEvolutionDashboard(accountId, year, isChecked, accountType);
        return ResponseEntity.ok(evolution);
    }

    @GetMapping("/matrix")
    public ResponseEntity<MatrixDashboardDto> getAnnualMatrix(
            @RequestParam(required = false) Long accountId,
            @RequestParam Integer year,
            @RequestParam(required = false) Boolean isChecked,
            @RequestParam(required = false) AccountType accountType) {

        MatrixDashboardDto matrix = dashboardService.getAnnualMatrix(accountId, year, isChecked, accountType);
        return ResponseEntity.ok(matrix);
    }

    @GetMapping("/matrix-monthly")
    public ResponseEntity<MatrixMonthlyDashboardDto> getMonthlyMatrix(
            @RequestParam(required = false) Long accountId,
            @RequestParam Integer month,
            @RequestParam Integer year,
            @RequestParam(required = false) Boolean isChecked,
            @RequestParam(required = false) AccountType accountType) {

    	MatrixMonthlyDashboardDto matrix = dashboardService.getMonthlyMatrix(accountId,month, year, isChecked, accountType);
        return ResponseEntity.ok(matrix);
    }


    @GetMapping("/summary")
    public ResponseEntity<SummaryDto> getSummary(){
    	SummaryDto summary = dashboardService.getHomeDashboardSummary();
    	return ResponseEntity.ok(summary);
    }

    @GetMapping("/start-end-balances")
    public ResponseEntity<StartEndBalancesDto> getStartEndBalances(
    		@RequestParam(required = false) Long accountId,
            @RequestParam Integer month,
            @RequestParam Integer year,
            @RequestParam(required = false) Boolean isChecked,
            @RequestParam(required = false) AccountType accountType) {

    	StartEndBalancesDto dto = dashboardService.getStartEndBalances(accountId, month, year, isChecked, accountType);
        return ResponseEntity.ok(dto);
    }

}
