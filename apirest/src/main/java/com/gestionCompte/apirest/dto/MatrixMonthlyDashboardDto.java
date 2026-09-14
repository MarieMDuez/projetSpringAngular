package com.gestionCompte.apirest.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.math.BigDecimal;
import java.util.List;

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
