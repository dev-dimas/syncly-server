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
import { responseInterceptor } from './middleware/response-interceptor';
import { xssMiddleware } from './middleware/xss-middleware';
import {
  authRouter,
  notificationRouter,
  passwordRouter,
  projectRouter,
  taskRouter,
  userRouter
} from './routes';
import compressFilter from './utils/compress-filter.util';
import path from 'path';

const staticFileDir = path.resolve(process.cwd(), 'uploads');
const usersDir = path.resolve(staticFileDir, 'users');
const projectsDir = path.resolve(staticFileDir, 'projects');

const app: Express = express();

app.use(helmet.frameguard({ action: 'deny' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(xssMiddleware());
app.use(cookieParser());
app.use(compression({ filter: compressFilter }));
app.use(cors(corsConfig));
app.use(responseInterceptor);

app.use('/uploads/users', express.static(usersDir));
app.use('/uploads/projects', express.static(projectsDir));

if (config.node_env === 'production') {
  app.use('/api', authLimiter);
}

app.use('/api', authRouter);
app.use('/api', userRouter);
app.use('/api', passwordRouter);
app.use('/api', projectRouter);
app.use('/api', taskRouter);
app.use('/api', notificationRouter);

app.all('*', (_, res) => {
  res.status(NOT_FOUND).json({ message: 'Not Found' });
});

app.use(errorHandler);

export default app;
