/* eslint-disable security/detect-non-literal-fs-filename */
import path from 'path';
import fs from 'fs';

export const pathUpload = ({
  folder,
  filename
}: {
  folder: string;
  filename: string;
}) => {
  const uploadDir = path.resolve(process.cwd(), path.join('/uploads', folder));

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
  }

  const outputFilename = `${filename}.webp`;
  const outputPath = path.join(uploadDir, outputFilename);
  const publicPath = path.join('/uploads', folder, outputFilename);

  return { outputFilename, outputPath, publicPath };
};
