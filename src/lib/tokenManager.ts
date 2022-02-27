"use strict";

/**
* Please use tokenLogger for logging in this file try to abstain from console
* levels of logging:
* - TRACE - ‘blue’
* - DEBUG - ‘cyan’
* - INFO - ‘green’
* - WARN - ‘yellow’
* - ERROR - ‘red’
* - FATAL - ‘magenta’
*/

import Services from "../services/index";
import Config from "../config";
import { DeviceData, GenericObject, TokenData } from "../definations";
import { countBy } from "lodash";
const Jwt = require("jsonwebtoken");

/**
 * 
 * @param {String} userId 
 * @param {String} userType 
 * @param {String} deviceUUID 
 * @param {String} token 
 * @returns 
 */
const getTokenFromDB = async function (userId: string, userType: string, token: string) {
  const criteria = (() => {
    switch (userType) {
      case Config.APP_CONSTANTS.DATABASE.USER_ROLES.ADMIN:
      case Config.APP_CONSTANTS.DATABASE.USER_ROLES.SUPERADMIN:
        return { adminId: userId, accessToken: token };
      default: return { userId, accessToken: token }
    }
  })();
  const result = await Services.TokenService.getRecordUsingPromise(criteria, {}, {});
  if (result && result.length > 0) {
    result[0].type = userType;
    return result[0];
  } else {
    return Config.APP_CONSTANTS.STATUS_MSG.ERROR.INVALID_TOKEN;
  }
};

/**
 * 
 * @param {String} userId 
 * @param {String} userType 
 * @param {Object} tokenData 
 * @param {String} tokenData.accessToken
 * @param {String} tokenData.deviceType
 * @param {String} tokenData.deviceName
 * @param {String} tokenData.deviceUUID
 * @param {Function} callback 
 */
const setTokenInDB = function (userId: string, userType: string, tokenData: any, callback: Function) {
  tokenLogger.info("login_type::::::::", userType);
  let objectToCreate: { [key: string]: any }, criteria: { [key: string]: any };
  switch (userType) {
    case Config.APP_CONSTANTS.DATABASE.USER_ROLES.SUPERADMIN:
    case Config.APP_CONSTANTS.DATABASE.USER_ROLES.ADMIN: {
      objectToCreate = { adminId: userId, ...tokenData };
      criteria = { adminId: userId, deviceUUID: tokenData.deviceUUID };
      break;
    }
    default: {
      objectToCreate = { userId: userId, ...tokenData };
      criteria = { userId, deviceUUID: tokenData.deviceUUID };
    }
  }
  Services.TokenService.getRecord(criteria, {}, {}, (err: Error, data: any) => {
    if (err) return countBy(err);
    if (data.length === 0) {
      Services.TokenService.createRecord(objectToCreate, (err: Error) => {
        if (err) callback(err);
        else {
          callback();
        }
      });
    } else {
      Services.TokenService.updateRecord(criteria, tokenData, {}, (err: Error) => {
        if (err) callback(err);
        else {
          callback();
        }
      });
    }
  });

};

/**
 * 
 * @param {TokenData} tokenData 
 * @param {String} tokenData.id User ID
 * @param {String} tokenData.type User Type 
 * @param {DeviceData} deviceData 
 * @param {String} deviceData.deviceUUID 
 * @param {String} deviceData.deviceType
 * @param {String} deviceData.deviceName
 * @param {Function} callback 
 */
const setToken = function (tokenData: TokenData, deviceData: DeviceData, callback: Function) {
  if (!tokenData.id || !tokenData.type) {
    callback(Config.APP_CONSTANTS.STATUS_MSG.ERROR.IMP_ERROR);
  } else {
    const tokenToSend = Jwt.sign(tokenData, process.env.JWT_SECRET_KEY);
    setTokenInDB(tokenData.id, tokenData.type, { accessToken: tokenToSend, ...deviceData }, (
      err: Error,
    ) => {
      callback(err, { accessToken: tokenToSend });
    });
  }
};

const verifyToken = async function (token: string): Promise<any> {
  try {
    const decodedData = await Jwt.verify(token, process.env.JWT_SECRET_KEY);
    const result = await getTokenFromDB(
      decodedData.id,
      decodedData.type,
      token
    );
    if (result && result._id) return { userData: result };
    else throw result;
  } catch (err) {
    console.error(err);
    return err;
  }
};

const decodeToken = async (token: string) => {
  try {
    const decodedData = await Jwt.verify(token, process.env.JWT_SECRET_KEY);
    return { userData: decodedData, token: token };
  } catch (err) {
    return err;
  }
};

export default {
  decodeToken: decodeToken,
  verifyToken: verifyToken,
  setToken: setToken
};
