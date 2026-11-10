package com.gestionCompte.apirest.dto;

import java.math.BigDecimal;
import java.util.List;

import com.gestionCompte.apirest.model.TransactionType;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
public class AnalyticsDashboardDto {
    private List<DataGroupDto> categoryDistribution;
    private List<DataGroupDto> paymentDistribution;

    @Data
    @AllArgsConstructor
    public static class DataGroupDto {
        private String label;
        private BigDecimal total;
        private TransactionType type;
    }
}
