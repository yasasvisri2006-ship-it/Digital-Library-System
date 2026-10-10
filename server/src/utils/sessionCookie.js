const { env } = require('../config/env');

const SESSION_COOKIE_NAME = 'mbu_session';
const SESSION_DURATION_MS = 60 * 60 * 1000;

const sessionCookieOptions = Object.freeze({
  httpOnly: true,
  secure: env.authCookieSecure || env.nodeEnv === 'production',
  sameSite: 'strict',
  path: '/api',
});

function setSessionCookie(res, token) {
  res.cookie(SESSION_COOKIE_NAME, token, {
    ...sessionCookieOptions,
    maxAge: SESSION_DURATION_MS,
  });
}

function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE_NAME, sessionCookieOptions);
}

module.exports = { clearSessionCookie, setSessionCookie };
