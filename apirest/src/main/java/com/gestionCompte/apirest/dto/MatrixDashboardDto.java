package com.gestionCompte.apirest.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MatrixDashboardDto {
    private List<PaymentMethodRowDto> rows;
    private BigDecimal[] monthlyTotals;
    private BigDecimal grandTotal;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaymentMethodRowDto {
        private String paymentMethodLabel;
        private BigDecimal[] monthlyAmounts;
        private BigDecimal totalYear;
        private List<CategoryRowDto> categoryRows;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CategoryRowDto {
        private String categoryLabel;
        private BigDecimal[] monthlyAmounts;
        private BigDecimal totalYear;
    }
}
