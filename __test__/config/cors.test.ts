import corsConfig from 'src/config/cors';

describe('corsConfig', () => {
  const mockCallback = jest.fn();

  beforeEach(() => {
    mockCallback.mockClear();
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
