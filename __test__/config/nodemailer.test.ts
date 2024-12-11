/* eslint-disable @typescript-eslint/no-var-requires */
import nodemailer from 'nodemailer';
import path from 'path';
import logger from '../../src/middleware/logger';
import config from '../../src/config/config';

jest.mock('../../src/config/nodemailer.ts');
jest.mock('../../src/middleware/logger.ts');

const transporterPath = path.resolve(
  __dirname,
  '../../src/config/nodemailer.ts'
);

describe('transporter module', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create a test account and set up the transporter if not in production', async () => {
    const mockAccount = {
      smtp: {
        host: 'smtp.test.com',
        port: 587,
        secure: false
      },
      user: 'testuser',
      pass: 'testpass'
    };
    (nodemailer.createTestAccount as jest.Mock).mockResolvedValue(mockAccount);

    const mockTransporter = {
      sendMail: jest.fn()
    };
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    jest.spyOn(config, 'node_env', 'get').mockReturnValue('development');

    const createdTransporter = require(transporterPath).default;

    expect(nodemailer.createTestAccount).toHaveBeenCalled();
    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      host: mockAccount.smtp.host,
      port: mockAccount.smtp.port,
      secure: mockAccount.smtp.secure,
      auth: {
        user: mockAccount.user,
        pass: mockAccount.pass
      }
    });
    expect(logger.info).toHaveBeenCalledWith(
      `Test account created: ${mockAccount.user}`
    );
    expect(createdTransporter).not.toBeNull();
  });

  it('should create a production transporter when in production', async () => {
    jest.spyOn(config, 'node_env', 'get').mockReturnValue('production');

    const mockTransporter = {
      sendMail: jest.fn()
    };
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    const createdTransporter = require(transporterPath).default;

    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      host: config.email.smtp.host,
      port: parseInt(config.email.smtp.port),
      secure: false,
      auth: {
        user: config.email.smtp.auth.username,
        pass: config.email.smtp.auth.password
      }
    });
    expect(createdTransporter).not.toBeNull();
  });

  it('should log an error if createTestAccount fails', async () => {
    (nodemailer.createTestAccount as jest.Mock).mockRejectedValue(
      new Error('Test account creation failed')
    );

    // Spy on console.error to check if it's called
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    await import('../../src/config/nodemailer');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to create a test account:',
      expect.any(Error)
    );
    consoleErrorSpy.mockRestore();
  });
});
