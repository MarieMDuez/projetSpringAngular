package com.gestionCompte.apirest.exception;

public final class ErrorMessages {

	private ErrorMessages() {
	}

	public static final String NOT_FOUND_SUFFIX = "not found with id : ";

	public static final String ACCOUNT_NOT_FOUND = "Account " + NOT_FOUND_SUFFIX;
	public static final String ACCOUNT_ALREADY_EXISTS = "This account name already exists";

	public static final String CATEGORY_NOT_FOUND = "Category " + NOT_FOUND_SUFFIX;
	public static final String CATEGORY_ALREADY_EXISTS = "This category name already exists";

	public static final String PAYMENT_METHOD_NOT_FOUND = "Payment method " + NOT_FOUND_SUFFIX;
	public static final String PAYMENT_METHOD_ALREADY_EXISTS = "This payment method already exists";
	
	public static final String TRANSACTION_NOT_FOUND = "Transaction "+ NOT_FOUND_SUFFIX;
	public static final String TRANSACTION_BAD_REQUEST =  "Transaction Type invalid : ";
	
	public static final String PERIOD_NOT_FOUND = "Period " + NOT_FOUND_SUFFIX;
	
	public static final String SETTING_NOT_FOUND = "Setting "+ NOT_FOUND_SUFFIX;
}
