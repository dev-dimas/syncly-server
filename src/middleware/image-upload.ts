import { StatusCodes } from 'http-status-codes';
import multer from 'multer';
import { HttpException } from 'src/utils/http-exception.util';

const imageUpload = multer({
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_, file, callback) => {
    if (!file.mimetype.startsWith('image/')) {
      callback(
        new HttpException(
          StatusCodes.BAD_REQUEST,
          'Only images format are allowed'
        )
      );
      return;
    }
    callback(null, true);
  }
});

export default imageUpload;
