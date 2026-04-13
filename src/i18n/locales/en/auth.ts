export const auth = {
  title: "Sign in",
  subtitle: "Use your Operations account.",
  username: "Username",
  password: "Password",
  rememberMe: "Remember me",
  rememberMeHint:
    "When on, a refresh token is stored so your session renews when the access token expires.",
  showPassword: "Show password",
  hidePassword: "Hide password",
  submit: "Sign in",
  signingIn: "Signing in…",
  loginFailed: "Invalid username or password.",
  networkError:
    "Cannot reach the API. Set NEXT_PUBLIC_API_BASE_URL to match Swagger (e.g. https://localhost:7152/api or http://localhost:5177/api). Trust the dev HTTPS certificate if needed.",
  logout: "Sign out",
  brandHeadline: "Run operations with clarity",
  brandTagline:
    "Branches, people, and inventory — connected in one workspace built for daily work.",
  feature1: "Branch activity and KPIs in one view",
  feature2: "Controlled access for your team",
  feature3: "Warehouse data that stays trustworthy",
  totpTitle: "Verification code",
  totpSubtitle: "Enter the 6-digit verification code from your app.",
  totpCode: "Verification code",
  totpSubmit: "Verify and sign in",
  totpBack: "Use different account",
  totpFailed: "Invalid or expired code.",
} as const;
