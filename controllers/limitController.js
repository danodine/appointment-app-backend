const rateLimit = require('express-rate-limit');

// “Forgot password” – let a single IP trigger this at most 1× / hour
exports.forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100,
  message: 'Too many password-reset requests from this IP. Try again in an hour.'
});

// “Reset password” – let a single IP *submit* codes at most 5× / 10 min
exports.resetPasswordLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: 'Too many attempts from this IP. Slow down and try again later.'
});