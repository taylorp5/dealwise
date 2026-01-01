# CAPTCHA Configuration Notice

## If Email Auth is Failing

If you're seeing errors like:
- "Invalid login credentials" when credentials are correct
- Password reset emails not being sent
- Sign up failing with unclear errors

**Check if CAPTCHA is enabled in Supabase:**

1. Go to Supabase Dashboard → Authentication → Settings
2. Look for "CAPTCHA" or "Bot Protection" settings
3. If enabled, you have two options:

### Option 1: Disable CAPTCHA (Recommended for v1)
- Disable CAPTCHA in Supabase dashboard
- This is the simplest solution for now
- Re-enable later when implementing CAPTCHA tokens

### Option 2: Implement CAPTCHA Token Passing
- Requires integrating a CAPTCHA service (e.g., reCAPTCHA, hCaptcha)
- Pass the CAPTCHA token in the auth method calls:
  ```typescript
  supabase.auth.signUp({
    email,
    password,
    options: {
      captchaToken: 'your-captcha-token'
    }
  })
  ```

**For now, we recommend disabling CAPTCHA in Supabase to unblock email auth.**

