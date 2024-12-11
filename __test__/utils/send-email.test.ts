import transporter from '../../src/config/nodemailer';
import logger from '../../src/middleware/logger';
import { sendResetEmail } from '../../src/utils/send-email.util';

jest.mock('../../src/config/nodemailer', () => ({
  sendMail: jest.fn()
}));

jest.mock('../../src/middleware/logger', () => ({
  error: jest.fn(),
  info: jest.fn()
}));

jest.mock('../../src/config/config', () => ({
  server: { url: 'http://example.com' },
  email: { from: 'test@example.com' }
}));

describe('sendResetEmail', () => {
  const mockEmail = 'user@example.com';
  const mockToken = '123456';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call sendMail with correct parameters and log success', () => {
    const mockResponse = { response: 'Email sent successfully' };
    (transporter.sendMail as jest.Mock).mockImplementation((_, callback) => {
      callback(null, mockResponse);
    });

    sendResetEmail(mockEmail, mockToken);

    expect(transporter.sendMail).toHaveBeenCalledTimes(1);
    expect(transporter.sendMail).toHaveBeenCalledWith(
      {
        from: 'test@example.com',
        to: mockEmail,
        subject: 'Password reset',
        html: expect.stringContaining(
          `<form action="http://example.com/api/v1/reset-password/${mockToken}" method="POST">`
        )
      },
      expect.any(Function)
    );
    expect(logger.info).toHaveBeenCalledWith(
      'Reset password email sent: ' + mockResponse.response
    );
  });

  it('should log an error if sendMail fails', () => {
    const mockError = new Error('Failed to send email');
    (transporter.sendMail as jest.Mock).mockImplementation((_, callback) => {
      callback(mockError, null);
    });

    sendResetEmail(mockEmail, mockToken);

    expect(transporter.sendMail).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(mockError);
  });
});
