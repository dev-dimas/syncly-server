import { transports } from 'winston';
import { type FileTransportOptions } from 'winston/lib/winston/transports';
import config from '../../src/config/config';
import logger from '../../src/middleware/logger';

jest.mock('../../src/config/config.ts', () => ({
  node_env: 'development'
}));

describe('Logger Configuration', () => {
  it('should set the correct logging level based on the environment', () => {
    const expectedLevel = config.node_env === 'production' ? 'info' : 'debug';
    expect(logger.level).toBe(expectedLevel);
  });

  it('should have the correct transports configured', () => {
    const consoleTransport = logger.transports.find(
      (t) => t instanceof transports.Console
    );
    const errorFileTransport = logger.transports.find(
      (t) =>
        t instanceof transports.File &&
        (t.options as FileTransportOptions).filename === 'logs/error.log'
    );
    const combinedFileTransport = logger.transports.find(
      (t) =>
        t instanceof transports.File &&
        (t.options as FileTransportOptions).filename === 'logs/combined.log'
    );

    expect(consoleTransport).toBeDefined();
    expect(errorFileTransport).toBeDefined();
    expect(combinedFileTransport).toBeDefined();
  });

  it('should format the logs as expected', () => {
    const format = logger.format;
    expect(format).toBeDefined();
  });

  it('should log an error message to the correct file when level is "error"', () => {
    const mockFileTransport = {
      log: jest.fn()
    };

    logger.add(mockFileTransport as never);

    logger.error('Test error message');

    expect(mockFileTransport.log).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        level: 'error',
        message: 'Test error message'
      })
    );
  });
});
