import Hapi from '@hapi/hapi';
import UniversalFunctions from "../../utils/universalFunctions";
import Joi from "joi";
import Controller from "../../controllers";

const uploadImage: Hapi.ServerRoute =
{
  method: 'POST',
  path: '/api/upload/uploadImage',
  handler: (request: any) => {
    const payloadData = request.payload;
    return new Promise((resolve, reject) => {
      Controller.UploadBaseController.uploadImage(payloadData, (err, data) => {
        if (err) {
          reject(UniversalFunctions.sendError(err));
        } else {
          resolve(UniversalFunctions.sendSuccess(UniversalFunctions.CONFIG.APP_CONSTANTS.STATUS_MSG.SUCCESS.DEFAULT, data))
        }
      });
    });
  },
  options: {
    description: 'image upload',
    tags: ['api', 'upload', 'image'],
    payload: {
      maxBytes: 20715200,
      output: 'stream',
      parse: true,
      allow: 'multipart/form-data'
    },
    validate: {
      payload: Joi.object({
        imageFile: Joi.any()
          .meta({ swaggerType: 'file' })
          .required()
          .description('image file')
      }).label("Upload: Image"),
      failAction: UniversalFunctions.failActionFunction
    },
    plugins: {
      'hapi-swagger': {
        responseMessages: UniversalFunctions.CONFIG.APP_CONSTANTS.swaggerDefaultResponseMessages
      }
    }
  }
}


const uploadVideo: Hapi.ServerRoute =
{
  method: 'POST',
  path: '/api/upload/uploadVideo',
  handler: (request) => {
    const payloadData = request.payload;
    return new Promise((resolve, reject) => {
      Controller.UploadBaseController.uploadVideo(payloadData, (err, data) => {
        if (err) {
          reject(UniversalFunctions.sendError(err));
        } else {
          resolve(UniversalFunctions.sendSuccess(UniversalFunctions.CONFIG.APP_CONSTANTS.STATUS_MSG.SUCCESS.DEFAULT, data))
        }
      });
    });
  },
  options: {
    description: 'video upload',
    tags: ['api', 'upload', 'video'],
    payload: {
      maxBytes: 207152000,
      output: 'stream',
      parse: true,
      allow: 'multipart/form-data'
    },
    validate: {
      payload: Joi.object({
        videoFile: Joi.any()
          .meta({ swaggerType: 'file' })
          .required()
          .description('video file')
      }).label("Upload: Video"),
      failAction: UniversalFunctions.failActionFunction
    },
    plugins: {
      'hapi-swagger': {
        responseMessages: UniversalFunctions.CONFIG.APP_CONSTANTS.swaggerDefaultResponseMessages
      }
    }
  }
}


const uploadDocument: Hapi.ServerRoute =
{
  method: 'POST',
  path: '/api/upload/uploadDocument',
  handler: (request) => {
    const payloadData = request.payload;
    return new Promise((resolve, reject) => {
      Controller.UploadBaseController.uploadDocument(payloadData, (err, data) => {
        if (err) {
          reject(UniversalFunctions.sendError(err));
        } else {
          resolve(UniversalFunctions.sendSuccess(UniversalFunctions.CONFIG.APP_CONSTANTS.STATUS_MSG.SUCCESS.DEFAULT, data))
        }
      });
    });
  },
  options: {
    description: 'upload document',
    tags: ['api', 'upload', 'document'],
    payload: {
      maxBytes: 20715200,
      output: 'stream',
      parse: true,
      allow: 'multipart/form-data'
    },
    validate: {
      payload: Joi.object({
        documentFile: Joi.any()
          .meta({ swaggerType: 'file' })
          .required()
          .description('document file')
      }).label("Upload: Document"),
      failAction: UniversalFunctions.failActionFunction
    },
    plugins: {
      'hapi-swagger': {
        responseMessages: UniversalFunctions.CONFIG.APP_CONSTANTS.swaggerDefaultResponseMessages
      }
    }
  }
};

const routes: Hapi.ServerRoute[] = [
  uploadImage, uploadDocument, uploadVideo
];


export default routes;