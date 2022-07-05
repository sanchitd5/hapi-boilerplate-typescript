import Hapi from '@hapi/hapi';
import UniversalFunctions from "../../utils/universalFunctions";
import Joi from "joi";
import Controller from "../../controllers";
import Config from '../../config';


const adminLogin: Hapi.ServerRoute = {
  method: "POST",
  path: "/api/admin/login",
  options: {
    description: "Admin Login",
    tags: ["api", "admin"],
    handler: (request) => {
      return new Promise((resolve, reject) => {
        Controller.AdminBaseController.adminLogin(request.payload, (error: Error, data: any) => {
          if (error) return reject(UniversalFunctions.sendError(error));
          resolve(UniversalFunctions.sendSuccess(undefined, data));

        });
      });
    },
    validate: {
      payload: Joi.object({
        emailId: Joi.string().email().required(),
        password: Joi.string().required().min(5).trim(),
        deviceData: Joi.object({
          deviceType: Joi.string().valid(...Object.values(Config.APP_CONSTANTS.DATABASE.DEVICE_TYPES)).required(),
          deviceName: Joi.string().required(),
          deviceUUID: Joi.string().required(),
        }).label('deviceData')
      }).label("Admin: Login"),
      failAction: UniversalFunctions.failActionFunction
    },
    plugins: {
      "hapi-swagger": {
        responseMessages:
          UniversalFunctions.CONFIG.APP_CONSTANTS.swaggerDefaultResponseMessages
      }
    }
  }
};

const accessTokenLogin: Hapi.ServerRoute = {
  method: "POST",
  path: "/api/admin/accessTokenLogin",
  handler: function (request, h) {
    const userData = request?.auth?.credentials?.userData || null;
    (request.auth &&
      request.auth.credentials &&
      request.auth.credentials.userData) ||
      null;
    return new Promise((resolve, reject) => {
      Controller.AdminBaseController.accessTokenLogin(userData, (err: Error, data: any) => {
        if (err) return reject(UniversalFunctions.sendError(err));
        resolve(UniversalFunctions.sendSuccess(undefined, data));
      });
    });
  },
  options: {
    description: "access token login",
    tags: ["api", "admin"],
    auth: "UserAuth",
    validate: {
      failAction: UniversalFunctions.failActionFunction
    },
    plugins: {
      "hapi-swagger": {
        security: [{ 'admin': {} }],
        responseMessages:
          UniversalFunctions.CONFIG.APP_CONSTANTS.swaggerDefaultResponseMessages
      }
    }
  }
};

const createAdmin: Hapi.ServerRoute = {
  method: "POST",
  path: "/api/admin/createAdmin",
  handler: function (request, h) {
    const userData =
      (request.auth &&
        request.auth.credentials &&
        request.auth.credentials.userData) ||
      null;
    const payloadData: any = request.payload;
    return new Promise((resolve, reject) => {
      if (!UniversalFunctions.verifyEmailFormat(payloadData.emailId)) {
        reject(
          UniversalFunctions.sendError(
            UniversalFunctions.CONFIG.APP_CONSTANTS.STATUS_MSG.ERROR
              .INVALID_EMAIL_FORMAT
          )
        );
      }
      else {
        Controller.AdminBaseController.createAdmin(
          userData,
          payloadData,
          (err: Error, data: any) => {
            if (err) return reject(UniversalFunctions.sendError(err));
            resolve(UniversalFunctions.sendSuccess(undefined, data));
          }
        );
      }
    });
  },
  options: {
    description: "create sub admin",
    tags: ["api", "admin"],
    auth: "UserAuth",
    validate: {
      payload: Joi.object({
        emailId: Joi.string().required(),
        fullName: Joi.string()
          .optional()
          .allow("")
      }).label("Admin: Create Admin"),
      failAction: UniversalFunctions.failActionFunction
    },
    plugins: {
      "hapi-swagger": {
        security: [{ 'admin': {} }],
        responseMessages:
          UniversalFunctions.CONFIG.APP_CONSTANTS.swaggerDefaultResponseMessages
      }
    }
  }
};

const getAdmin: Hapi.ServerRoute = {
  method: "GET",
  path: "/api/admin/getAdmin",
  handler: function (request, h) {
    const userData =
      (request.auth &&
        request.auth.credentials &&
        request.auth.credentials.userData) ||
      null;
    return new Promise((resolve, reject) => {
      Controller.AdminBaseController.getAdmin(userData, (err: Error, data: any) => {
        if (!err) {
          resolve(UniversalFunctions.sendSuccess(undefined, data));
        } else {
          reject(UniversalFunctions.sendError(err));
        }
      });
    });
  },
  options: {
    description: "get all sub admin list",
    tags: ["api", "admin"],
    auth: "UserAuth",
    validate: {
      failAction: UniversalFunctions.failActionFunction
    },
    plugins: {
      "hapi-swagger": {
        security: [{ 'admin': {} }],
        responseMessages:
          UniversalFunctions.CONFIG.APP_CONSTANTS.swaggerDefaultResponseMessages
      }
    }
  }
};

const blockUnblockAdmin: Hapi.ServerRoute = {
  method: "PUT",
  path: "/api/admin/blockUnblockAdmin",
  handler: function (request, h) {
    const userData =
      (request.auth &&
        request.auth.credentials &&
        request.auth.credentials.userData) ||
      null;
    const payloadData = request.payload;
    return new Promise((resolve, reject) => {
      Controller.AdminBaseController.blockUnblockAdmin(
        userData,
        payloadData,
        (err: Error, data: any) => {
          if (err) return reject(UniversalFunctions.sendError(err));
          resolve(UniversalFunctions.sendSuccess(undefined, data));
        }
      );
    });
  },
  options: {
    description: "block/unblock a sub admin",
    tags: ["api", "admin"],
    auth: "UserAuth",
    validate: {
      payload: Joi.object({
        adminId: Joi.string().required(),
        block: Joi.boolean().required()
      }).label("Admin: Block-Unblock Admin"),
      failAction: UniversalFunctions.failActionFunction
    },
    plugins: {
      "hapi-swagger": {
        security: [{ 'admin': {} }],
        responseMessages:
          UniversalFunctions.CONFIG.APP_CONSTANTS.swaggerDefaultResponseMessages
      }
    }
  }
};

const createUser: Hapi.ServerRoute = {
  method: "POST",
  path: "/api/admin/createUser",
  handler: function (request, h) {
    const userData =
      (request.auth &&
        request.auth.credentials &&
        request.auth.credentials.userData) ||
      null;
    return new Promise((resolve, reject) => {
      if (!UniversalFunctions.verifyEmailFormat((request.payload as any).emailId)) {
        reject(
          UniversalFunctions.sendError(
            UniversalFunctions.CONFIG.APP_CONSTANTS.STATUS_MSG.ERROR
              .INVALID_EMAIL_FORMAT
          )
        );
      }
      else {
        Controller.AdminBaseController.createUser(
          userData,
          request.payload,
          (err: Error, data: any) => {
            if (!err) {
              resolve(UniversalFunctions.sendSuccess(undefined, data));
            } else {
              reject(UniversalFunctions.sendError(err));
            }
          }
        );
      }
    });
  },
  options: {
    description: "create new user from admin",
    tags: ["api", "admin"],
    auth: "UserAuth",
    validate: {
      payload: Joi.object({
        firstName: Joi.string()
          .regex(/^[a-zA-Z ]+$/)
          .trim()
          .min(2)
          .required(),
        lastName: Joi.string()
          .regex(/^[a-zA-Z ]+$/)
          .trim()
          .min(2)
          .required(),
        emailId: Joi.string().required(),
        phoneNumber: Joi.string()
          .regex(/^[0-9]+$/)
          .min(5)
          .required(),
        countryCode: Joi.string()
          .max(4)
          .required()
          .trim()
      }).label("Admin: Create User"),
      failAction: UniversalFunctions.failActionFunction
    },
    plugins: {
      "hapi-swagger": {
        security: [{ 'admin': {} }],
        responseMessages:
          UniversalFunctions.CONFIG.APP_CONSTANTS.swaggerDefaultResponseMessages
      }
    }
  }
};

const getUser: Hapi.ServerRoute = {
  method: "GET",
  path: "/api/admin/getUser",
  handler: function (request, h) {
    const userData =
      (request.auth &&
        request.auth.credentials &&
        request.auth.credentials.userData) ||
      null;
    return new Promise((resolve, reject) => {
      Controller.AdminBaseController.getUser(userData, (err: Error, data: any) => {
        if (!err) {
          resolve(UniversalFunctions.sendSuccess(undefined, data));
        } else {
          reject(UniversalFunctions.sendError(err));
        }
      });
    });
  },
  options: {
    description: "get all user list",
    tags: ["api", "admin"],
    auth: "UserAuth",
    validate: {
      failAction: UniversalFunctions.failActionFunction
    },
    plugins: {
      "hapi-swagger": {
        security: [{ 'admin': {} }],
        responseMessages:
          UniversalFunctions.CONFIG.APP_CONSTANTS.swaggerDefaultResponseMessages
      }
    }
  }
};

const blockUnblockUser: Hapi.ServerRoute = {
  method: "PUT",
  path: "/api/admin/blockUnblockUser",
  handler: function (request, h) {
    const userData =
      (request.auth &&
        request.auth.credentials &&
        request.auth.credentials.userData) ||
      null;
    const payloadData = request.payload;
    return new Promise((resolve, reject) => {
      Controller.AdminBaseController.blockUnblockUser(
        userData,
        payloadData,
        (err: Error, data: any) => {
          if (!err) {
            resolve(UniversalFunctions.sendSuccess(undefined, data));
          } else {
            reject(UniversalFunctions.sendError(err));
          }
        }
      );
    });
  },
  options: {
    description: "block/unblock a user",
    tags: ["api", "admin"],
    auth: "UserAuth",
    validate: {
      payload: Joi.object({
        userId: Joi.string().required(),
        block: Joi.boolean().required()
      }).label("Admin: Block-Unblock User"),
      failAction: UniversalFunctions.failActionFunction
    },
    plugins: {
      "hapi-swagger": {
        security: [{ 'admin': {} }],
        responseMessages:
          UniversalFunctions.CONFIG.APP_CONSTANTS.swaggerDefaultResponseMessages
      }
    }
  }
};

const changePassword: Hapi.ServerRoute = {
  method: "PUT",
  path: "/api/admin/changePassword",
  handler: function (request, h) {
    const userData =
      (request.auth &&
        request.auth.credentials &&
        request.auth.credentials.userData) ||
      null;
    return new Promise((resolve, reject) => {
      Controller.AdminBaseController.changePassword(
        userData,
        request.payload,
        (err: Error, user: any) => {
          if (!err) {
            resolve(
              UniversalFunctions.sendSuccess(
                UniversalFunctions.CONFIG.APP_CONSTANTS.STATUS_MSG.SUCCESS
                  .PASSWORD_RESET,
                user
              )
            );
          } else {
            reject(UniversalFunctions.sendError(err));
          }
        }
      );
    });
  },
  options: {
    description: "change Password",
    tags: ["api", "customer"],
    auth: "UserAuth",
    validate: {
      payload: Joi.object({
        skip: Joi.boolean().required(),
        oldPassword: Joi.string().when('skip', { is: false, then: Joi.string().required().min(5), otherwise: Joi.string().optional().allow("") }),
        newPassword: Joi.string().when('skip', { is: false, then: Joi.string().required().min(5), otherwise: Joi.string().optional().allow("") })
      }).label("Admin: Change Password"),
      failAction: UniversalFunctions.failActionFunction
    },
    plugins: {
      "hapi-swagger": {
        security: [{ 'admin': {} }],
        responseMessages:
          UniversalFunctions.CONFIG.APP_CONSTANTS.swaggerDefaultResponseMessages
      }
    }
  }
};

const logoutAdmin: Hapi.ServerRoute = {
  method: "PUT",
  path: "/api/admin/logout",
  options: {
    description: "Logout admin",
    auth: "UserAuth",
    tags: ["api", "admin"],
    handler: function (request, h) {
      const userData =
        (request.auth &&
          request.auth.credentials &&
          request.auth.credentials.userData) ||
        null;
      return new Promise((resolve, reject) => {
        Controller.AdminBaseController.logoutAdmin(userData, (
          err: Error
        ) => {
          if (err) {
            reject(UniversalFunctions.sendError(err));
          } else {
            resolve(
              UniversalFunctions.sendSuccess(
                UniversalFunctions.CONFIG.APP_CONSTANTS.STATUS_MSG.SUCCESS
                  .LOGOUT, {}
              )
            );
          }
        });
      });
    },
    validate: {
      failAction: UniversalFunctions.failActionFunction
    },
    plugins: {
      "hapi-swagger": {
        security: [{ 'admin': {} }],
        responseMessages:
          UniversalFunctions.CONFIG.APP_CONSTANTS.swaggerDefaultResponseMessages
      }
    }
  }
};

const adminBaseRoutes: Hapi.ServerRoute[] = [
  adminLogin,
  accessTokenLogin,
  createAdmin,
  getAdmin,
  blockUnblockAdmin,
  createUser,
  getUser,
  blockUnblockUser,
  changePassword,
  logoutAdmin
];

export default adminBaseRoutes;