import { BadRequestException, Injectable } from '@nestjs/common';
import { v2 as cloudinaryV2 } from 'cloudinary';
import { Express } from 'express';
import * as streamifier from 'streamifier';

@Injectable()
export class CloudinaryService {
  constructor() {
    cloudinaryV2.config({
      cloud_name: 'dwpeyxsru',
      api_key: '256768695711664',
      api_secret: 'VNnufiZXrAfPqmYgY5_5m457HaA',
    });
  }

  // Up một file
  async uploadImage(file: Express.Multer.File) {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/jpg',
      'video/mp4',
      'video/avi',
      'video/mkv',
      'video/webm',
      'video/quicktime',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only image and video files are allowed.');
    }

    const maxFileSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxFileSize) {
      throw new BadRequestException('File size must not exceed 10MB.');
    }

    try {
      const stream = streamifier.createReadStream(file.buffer);

      const resourceType = file.mimetype.startsWith('video')
        ? 'video'
        : 'image';

      // Up lên Cloudinary
      const result = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinaryV2.uploader.upload_stream(
          { resource_type: resourceType },
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          },
        );

        stream.pipe(uploadStream);
      });

      return {
        url: result.secure_url,
        public_id: result.public_id,
      };
    } catch (error) {
      throw new Error(
        `Upload to Cloudinary failed. Error: ${error.message}, Code: ${error.http_code}`,
      );
    }
  }

  // Up nhiều file
  async uploadFiles(files: Express.Multer.File[]) {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/jpg',
      'video/mp4',
      'video/avi',
      'video/mkv',
      'video/webm',
      'video/quicktime',
    ];

    const maxFileSize = 10 * 1024 * 1024; // 10MB

    for (const file of files) {
      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException('Chỉ hỗ trợ tệp hình ảnh và video.');
      }

      // Ktra  file
      if (file.size > maxFileSize) {
        throw new BadRequestException(
          `File "${file.originalname}" size must not exceed 10MB.`,
        );
      }
    }

    try {
      const uploadResults = [];

      for (const file of files) {
        const stream = streamifier.createReadStream(file.buffer);

        const resourceType = file.mimetype.startsWith('video')
          ? 'video'
          : 'image';

        // Upload tệp lên Cloudinary
        const result = await new Promise<any>((resolve, reject) => {
          const uploadStream = cloudinaryV2.uploader.upload_stream(
            { resource_type: resourceType },
            (error, result) => {
              if (error) {
                reject(error);
              } else {
                resolve(result);
              }
            },
          );

          stream.pipe(uploadStream);
        });

        uploadResults.push({
          url: result.secure_url,
          public_id: result.public_id,
        });
      }

      return uploadResults;
    } catch (error) {
      throw new Error(
        `Upload to Cloudinary failed. Error: ${error.message}, Code: ${error.http_code}`,
      );
    }
  }
}
