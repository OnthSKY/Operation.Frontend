/** Cookie adı — middleware ile aynı olmalı */
export const AUTH_TOKEN_COOKIE_NAME = "operations_token";

/** ~1 gün (JWT süresinden bağımsız yeniden giriş penceresi) */
export const AUTH_TOKEN_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 1;
