import { pathUpload } from 'src/utils/path-upload.util';
import fs from 'fs';
import path from 'path';

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn()
}));

jest.mock('path', () => ({
  resolve: jest.fn(),
  join: jest.fn()
}));

describe('pathUpload', () => {
  const folder = 'images';
  const filename = 'test-image';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create upload directory if it does not exist', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (path.resolve as jest.Mock).mockReturnValue('/mock/path');
    (path.join as jest.Mock).mockReturnValue(
      '/mock/path/uploads/images/test-image.webp'
    );

    pathUpload({ folder, filename });

    expect(fs.existsSync).toHaveBeenCalledWith('/mock/path');
    expect(fs.mkdirSync).toHaveBeenCalledWith('/mock/path');
  });

  it('should not create upload directory if it exists', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (path.resolve as jest.Mock).mockReturnValue('/mock/path');
    (path.join as jest.Mock).mockReturnValue(
      '/mock/path/uploads/images/test-image.webp'
    );

    pathUpload({ folder, filename });

    expect(fs.existsSync).toHaveBeenCalledWith('/mock/path');
    expect(fs.mkdirSync).not.toHaveBeenCalled();
  });

  it('should return correct file paths', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (path.resolve as jest.Mock).mockReturnValue('/mock/path');
    (path.join as jest.Mock).mockReturnValue(
      '/mock/path/uploads/images/test-image.webp'
    );

    const result = pathUpload({ folder, filename });

    expect(result).toEqual({
      outputFilename: 'test-image.webp',
      outputPath: '/mock/path/uploads/images/test-image.webp',
      publicPath: '/mock/path/uploads/images/test-image.webp'
    });
  });
});
