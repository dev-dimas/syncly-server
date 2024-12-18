/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
// @ts-nocheck
import nodemailer, { Transporter } from 'nodemailer';
import transporter from 'src/config/nodemailer';
import logger from 'src/middleware/logger';
import config from 'src/config/config';

jest.mock('nodemailer');
jest.mock('src/middleware/logger');
jest.mock('src/config/config');

describe('Transporter Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should create a transporter with test account in non-production', async () => {
    const mockTestAccount = {
      smtp: { host: 'smtp.test.host', port: 587, secure: false },
      user: 'testuser',
      pass: 'testpass'
    };

    nodemailer.createTestAccount = jest.fn().mockResolvedValue(mockTestAccount);
    const mockCreateTransport = jest.fn();

    nodemailer.createTransport = mockCreateTransport;
    config.node_env = 'development';

    await import('src/config/nodemailer');

    expect(nodemailer.createTestAccount).toHaveBeenCalled();
    expect(mockCreateTransport).toHaveBeenCalledWith({
      host: mockTestAccount.smtp.host,
      port: mockTestAccount.smtp.port,
      secure: mockTestAccount.smtp.secure,
      auth: {
        user: mockTestAccount.user,
        pass: mockTestAccount.pass
      }
    });
    expect(logger.info).toHaveBeenCalledWith(
      `Test account created: ${mockTestAccount.user}`
    );
  });
});
