package com.gestionCompte.apirest.dto;

import java.math.BigDecimal;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MatrixMonthlyDashboardDto {
    private int maxWeeksInMonth;
    private List<PaymentMethodRowDto> rows;
    private BigDecimal[] weeklyTotals;
    private BigDecimal grandTotal;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaymentMethodRowDto {
        private String paymentMethodLabel;
        private BigDecimal[] weeklyAmounts;
        private BigDecimal totalMonth;
        private List<CategoryRowDto> categoryRows;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CategoryRowDto {
        private String categoryLabel;
        private BigDecimal[] weeklyAmounts;
        private BigDecimal totalMonth;
    }
}
