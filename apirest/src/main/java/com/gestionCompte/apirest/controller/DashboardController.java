package com.gestionCompte.apirest.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.gestionCompte.apirest.dto.BalanceDashboardDto;
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
}
