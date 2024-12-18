/* eslint-disable node/no-unpublished-import */
import express from 'express';
import authLimiter from 'src/middleware/auth-limiter';
import request from 'supertest';

describe('authLimiter Middleware', () => {
  let app: express.Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.get('/test', authLimiter, (req, res) => {
      if (req.body.password === 'valid') {
        return res.status(200).send('Credentials valid');
      } else {
        res.status(401).send('Credentials invalid');
      }
    });
  });

  it('should not limiting the number of successful requests', async () => {
    for (let i = 1; i <= 25; i++) {
      const response = await request(app)
        .get('/test')
        .send({ password: 'valid' });
      expect(response.status).toBe(200);
    }
  });

  it('should accept invalid requests up to the maximum number of requests', async () => {
    for (let i = 1; i <= 21; i++) {
      const response = await request(app).get('/test');
      if (i <= 20) {
        expect(response.status).toBe(401);
      } else {
        expect(response.status).toBe(429);
      }
    }
  });
});
