// eslint-disable-next-line node/no-unpublished-import
import request from 'supertest';
import express from 'express';
import authLimiter from '../../src/middleware/auth-limiter';

describe('authLimiter Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(authLimiter);
    app.get('/test', (_, res) => {
      res.status(200).send('Request successful');
    });
  });

  it('should allow up to the maximum number of requests', async () => {
    for (let i = 0; i < 20; i++) {
      const response = await request(app).get('/test');
      expect(response.status).toBe(200);
    }
  });

  it('should block requests exceeding the limit', async () => {
    app = express();
    app.use(authLimiter);
    app.get('/test', (_, res) => {
      res.status(401).send('Request failed');
    });

    for (let i = 0; i < 21; i++) {
      const response = await request(app).get('/test');
      if (i < 20) {
        expect(response.status).toBe(200);
      } else {
        expect(response.status).toBe(429);
      }
    }
  });

  it('should skip successful requests if skipSuccessfulRequests is true', async () => {
    const response = await request(app).get('/test');
    expect(response.status).toBe(200);

    const response2 = await request(app).get('/test');
    expect(response2.status).toBe(200);
  });
});
