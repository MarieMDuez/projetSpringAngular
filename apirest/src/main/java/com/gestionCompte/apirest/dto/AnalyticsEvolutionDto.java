package com.gestionCompte.apirest.dto;

import java.math.BigDecimal;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
public class AnalyticsEvolutionDto {
    private List<MonthDataDto> globalEvolution;
    private List<CategoryEvolutionDto> categoryEvolution;
    private List<PaymentMethodEvolutionDto> paymentMethodEvolution;

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class MonthDataDto {
        private int month;
        private BigDecimal debits;
        private BigDecimal credits;
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class CategoryEvolutionDto {
        private String categoryLabel;
        private List<MonthDataDto> monthlyDetails;
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class PaymentMethodEvolutionDto {
        private String paymentMethodLabel;
        private List<MonthDataDto> monthlyDetails;
    }
}
