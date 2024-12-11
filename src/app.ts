import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { NOT_FOUND } from 'http-status';
import config from './config/config';
import corsConfig from './config/cors';
import authLimiter from './middleware/auth-limiter';
import { errorHandler } from './middleware/error-handler';
import { xssMiddleware } from './middleware/xss-middleware';
import { authRouter, passwordRouter } from './routes';
import compressFilter from './utils/compress-filter.util';

const app: Express = express();

app.use(helmet.frameguard({ action: 'deny' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(xssMiddleware());
app.use(cookieParser());
app.use(compression({ filter: compressFilter }));
app.use(cors(corsConfig));

if (config.node_env === 'production') {
  app.use('/api', authLimiter);
}

app.use('/api', authRouter);
app.use('/api', passwordRouter);

app.all('*', (_, res) => {
  res.status(NOT_FOUND).json({ message: 'Not Found' });
});

app.use(errorHandler);

export default app;
