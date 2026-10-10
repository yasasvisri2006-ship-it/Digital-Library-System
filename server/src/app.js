const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { env } = require('./config/env');
const apiRoutes = require('./routes/apiRoutes');
const cookieParser = require('cookie-parser');
const { apiRateLimiter } = require('./middleware/rateLimiter');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { sendSuccess } = require('./utils/apiResponse');
const { ApiError } = require('./utils/ApiError');

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      let isAllowed = !origin;
      if (origin) {
        try {
          isAllowed = env.clientOrigins.includes(new URL(origin).origin);
        } catch {
          isAllowed = false;
        }
      }

      if (isAllowed) {
        callback(null, true);
        return;
      }

      callback(new ApiError(403, 'Origin is not allowed by CORS'));
    },
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: '100kb' }));
app.use(apiRateLimiter);

app.get('/', (req, res) => {
  sendSuccess(res, {
    message: 'Digital Library API is running.',
    data: { service: 'digital-library-api' },
  });
});
app.use('/api', apiRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
