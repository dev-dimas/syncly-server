import config from '../../src/config/config';
import corsConfig from '../../src/config/cors'; // Adjust the path as needed

describe('corsConfig', () => {
  const mockCallback = jest.fn();

  beforeEach(() => {
    mockCallback.mockClear();
  });

  it('should allow requests from whitelisted origins', () => {
    // Set up a whitelist in config for testing
    const testWhitelist = ['https://example.com', 'https://another-domain.com'];
    jest
      .spyOn(config.cors, 'cors_origin', 'get')
      .mockImplementation(() => testWhitelist.join('|'));

    if (typeof corsConfig.origin === 'function') {
      corsConfig.origin('https://example.com', mockCallback);
    } else {
      console.error('Origin function is not defined or not callable.');
    }

    expect(mockCallback).toHaveBeenCalledWith(null, true);
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  it('should deny requests from non-whitelisted origins', () => {
    // Set up a whitelist in config for testing
    const testWhitelist = ['https://example.com'];
    jest
      .spyOn(config.cors, 'cors_origin', 'get')
      .mockImplementation(() => testWhitelist.join('|'));

    if (typeof corsConfig.origin === 'function') {
      corsConfig.origin('https://not-allowed.com', mockCallback);
    } else {
      console.error('Origin function is not defined or not callable.');
    }

    expect(mockCallback).toHaveBeenCalledWith(
      new Error('Not allowed by CORS'),
      undefined
    );
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  it('should allow requests when the origin is undefined', () => {
    if (typeof corsConfig.origin === 'function') {
      corsConfig.origin(undefined, mockCallback);
    } else {
      console.error('Origin function is not defined or not callable.');
    }
    expect(mockCallback).toHaveBeenCalledWith(null, true);
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });
});
