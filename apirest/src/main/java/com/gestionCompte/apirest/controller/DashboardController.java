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
import com.gestionCompte.apirest.dto.SummaryDto;
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
            @RequestParam(required = false) Long accountId) {
        
    	BalanceDashboardDto dto = dashboardService.getDynamicBalance(accountId);
        return ResponseEntity.ok(dto);
    }
    
    @GetMapping("/analytics")
    public ResponseEntity<AnalyticsDashboardDto> getAnalytics(
            @RequestParam(required = false) Long accountId,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Boolean isChecked) {
        
        AnalyticsDashboardDto analytics = dashboardService.getSpendDistribution(accountId, month, year, isChecked);
        return ResponseEntity.ok(analytics);
    }
    
    @GetMapping("/evolution")
    public ResponseEntity<AnalyticsEvolutionDto> getEvolution(
            @RequestParam(required = false) Long accountId,
            @RequestParam Integer year, 
            @RequestParam(required = false) Boolean isChecked) { // L'année est requise pour cette vue
        
        AnalyticsEvolutionDto evolution = dashboardService.getEvolutionDashboard(accountId, year, isChecked);
        return ResponseEntity.ok(evolution);
    }
    
    @GetMapping("/matrix")
    public ResponseEntity<MatrixDashboardDto> getAnnualMatrix(
            @RequestParam(required = false) Long accountId,
            @RequestParam Integer year,
            @RequestParam(required = false) Boolean isChecked) {
        
        MatrixDashboardDto matrix = dashboardService.getAnnualMatrix(accountId, year, isChecked);
        return ResponseEntity.ok(matrix);
    }
    
    @GetMapping("/matrix-monthly")
    public ResponseEntity<MatrixMonthlyDashboardDto> getMonthlyMatrix(
            @RequestParam(required = false) Long accountId,
            @RequestParam Integer month,
            @RequestParam Integer year,
            @RequestParam(required = false) Boolean isChecked) {
        
    	MatrixMonthlyDashboardDto matrix = dashboardService.getMonthlyMatrix(accountId,month, year, isChecked);
        return ResponseEntity.ok(matrix);
    }
    
    @GetMapping("/summary")
    public ResponseEntity<SummaryDto> getSummary(){
    	SummaryDto summary = dashboardService.getHomeDashboardSummary();
    	return ResponseEntity.ok(summary);
    }


}
