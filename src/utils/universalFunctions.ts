

/**
* Please use appLogger for logging in this file try to abstain from console
* levels of logging:
* - TRACE - ‘blue’
* - DEBUG - ‘cyan’
* - INFO - ‘green’
* - WARN - ‘yellow’
* - ERROR - ‘red’
* - FATAL - ‘magenta’
*/
import Joi from "joi";
import MD5 from "md5";
import Boom from "@hapi/boom";
import CONFIG from "../config";
import randomstring from "randomstring";
import validator from "validator";
import { DateTime } from "luxon";
import { GenericObject } from "../definations";


const sendError = (data: GenericObject | string | boolean) => {
  console.trace('ERROR OCCURED ', data)
  if (typeof data == 'object' && data.hasOwnProperty('statusCode') && data.hasOwnProperty('customMessage')) {
    const errorToSend = new Boom.Boom(data.customMessage, { statusCode: data.statusCode });
    errorToSend.output.payload.responseType = data.type;
    return errorToSend;
  } else {
    let errorToSend: any = '';
    if (typeof data == 'object') {
      if (data.name == 'MongoError') {
        errorToSend += CONFIG.APP_CONSTANTS.STATUS_MSG.ERROR.DB_ERROR.customMessage;
        if (data.code = 11000) {
          let duplicateValue = data.errmsg && data.errmsg.substr(data.errmsg.lastIndexOf('{ : "') + 5);
          duplicateValue = duplicateValue.replace('}', '');
          errorToSend += CONFIG.APP_CONSTANTS.STATUS_MSG.ERROR.DUPLICATE.customMessage + " : " + duplicateValue;
        }
      } else if (data.name == 'ApplicationError') {
        errorToSend += CONFIG.APP_CONSTANTS.STATUS_MSG.ERROR.APP_ERROR.customMessage + ' : ';
      } else if (data.name == 'ValidationError') {
        errorToSend += CONFIG.APP_CONSTANTS.STATUS_MSG.ERROR.APP_ERROR.customMessage + data.message;
      } else if (data.name == 'CastError') {
        errorToSend += CONFIG.APP_CONSTANTS.STATUS_MSG.ERROR.DB_ERROR.customMessage + CONFIG.APP_CONSTANTS.STATUS_MSG.ERROR.INVALID_ID.customMessage + data.value;
      }
    } else {
      errorToSend = data
    }
    let customErrorMessage = errorToSend;
    if (typeof customErrorMessage == 'string') {
      if (errorToSend.indexOf("[") > -1) {
        customErrorMessage = errorToSend.substr(errorToSend.indexOf("["));
      }
      customErrorMessage = customErrorMessage && customErrorMessage.replace(/"/g, '');
      customErrorMessage = customErrorMessage && customErrorMessage.replace('[', '');
      customErrorMessage = customErrorMessage && customErrorMessage.replace(']', '');
    }
    return new Boom.Boom(customErrorMessage, { statusCode: 400 })
  }
};

const sendSuccess = (successMsg: GenericObject | string = CONFIG.APP_CONSTANTS.STATUS_MSG.SUCCESS.DEFAULT.customMessage, data: GenericObject | Array<GenericObject>) => {
  if (typeof successMsg == 'object' && successMsg.hasOwnProperty('statusCode') && successMsg.hasOwnProperty('customMessage'))
    return { statusCode: successMsg.statusCode, message: successMsg.customMessage, data: data || {} };
  return { statusCode: 200, message: successMsg, data: data || {} };

};
const failActionFunction = (request: any, reply: any, error: any) => {
  let customErrorMessage = '';
  if (error.output.payload.message.indexOf("[") > -1) {
    customErrorMessage = error.output.payload.message.substr(error.output.payload.message.indexOf("["));
  } else {
    customErrorMessage = error.output.payload.message;
  }
  customErrorMessage = customErrorMessage.replace(/"/g, '');
  customErrorMessage = customErrorMessage.replace('[', '');
  customErrorMessage = customErrorMessage.replace(']', '');
  error.output.payload.message = customErrorMessage;
  delete error.output.payload.validation
  return error;
};

const authorizationHeaderObj = Joi.object({
  authorization: Joi.string().required()
}).options({ allowUnknown: true });

const generateRandomString = (stringLength?: number) => {
  if (stringLength === undefined) stringLength = 12;
  return randomstring.generate(stringLength);
};

const generateRandomNumber = () => {
  const num = Math.floor(Math.random() * 90000) + 10000;
  return num;
};

const generateRandomAlphabet = function (len: number) {
  const charSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let randomString = '';
  for (let i = 0; i < len; i++) {
    const randomPoz = Math.floor(Math.random() * charSet.length);
    randomString += charSet.substring(randomPoz, randomPoz + 1);
    randomString = randomString.toUpperCase();
  }
  return randomString;
}

const CryptData = (stringToCrypt: string) => {
  return MD5(MD5(stringToCrypt));
};

const validateLatLongValues = (lat: number, long: number) => {
  let valid = true;
  if (lat < -90 || lat > 90) {
    valid = false;
  }
  if (long < -180 || long > 180) {
    valid = false;
  }
  return valid;
};

const validateString = (str: string, pattern: string) => {
  return str.match(pattern);
};

const verifyEmailFormat = (string: string) => {
  return validator.isEmail(string)
};
const deleteUnnecessaryUserData = function (userObj: any) {
  delete userObj.__v;
  delete userObj.password;
  delete userObj.registrationDate;
  delete userObj.OTPCode;
  return userObj;
};
const generateFilenameWithExtension = function generateFilenameWithExtension(oldFilename: string, newFilename: string) {
  const ext = oldFilename.substr((~-oldFilename.lastIndexOf(".") >>> 0) + 2);
  return newFilename + '.' + ext;
}


function isEmpty(obj: any) {
  // null and undefined are "empty"
  if (obj == null) return true;

  // Assume if it has a length property with a non-zero value
  // that that property is correct.
  if (obj.length && obj.length > 0) return false;
  if (obj.length === 0) return true;

  // Otherwise, does it have any properties of its own?
  // Note that this doesn't handle
  // toString and toValue enumeration bugs in IE < 9
  for (const key in obj) {
    if (Object.hasOwnProperty.call(obj, key)) return false;
  }

  return true;
}

const getTimestamp = function (inDate?: boolean) {
  if (inDate)
    return new Date();

  return new Date().toISOString();
};

const createArray = function (List: Array<any>, keyName: string) {
  const IdArray = [];
  var keyName = keyName;
  for (const key in List) {
    if (List.hasOwnProperty(key)) {
      IdArray.push((List[key][keyName]).toString());
    }
  }
  return IdArray;

};

const getRange = (startDate: Date, endDate: Date, diffIn: any = CONFIG.APP_CONSTANTS.TIME_UNITS.HOURS) =>
  DateTime.fromJSDate(startDate).diff(DateTime.fromJSDate(endDate)).as(diffIn ?? 'millis');


const checkFileExtension = (fileName: string) =>
  fileName.substring(fileName.lastIndexOf('.') + 1, fileName.length) || fileName;


/**
 * @author Sanchit Dang
 * 
 * @param {Object} obj Object to clean.
 * @param {Function} callback callback function which returns cleaned object.
 * @returns {Object} Cleaned Version of the object. 
 */
const cleanObject = (obj: GenericObject, callback?: (param: GenericObject) => {}): object => {
  const newObj: GenericObject = Object.keys(obj)
    .filter(k => obj[k] != undefined && obj[k] != null && obj[k] != '') // Remove undef. and null.
    .reduce(
      (newObj, k) =>
        typeof obj[k] === "object"
          ? { ...newObj, [k]: cleanObject(obj[k]) } // Recurse.
          : { ...newObj, [k]: obj[k] }, // Copy value.
      {}
    );
  if (callback instanceof Function)
    callback(newObj);
  return newObj;
}

const universalFunctions = {
  generateRandomString,
  CryptData,
  CONFIG,
  sendError,
  sendSuccess,
  failActionFunction,
  authorizationHeaderObj,
  validateLatLongValues,
  validateString,
  verifyEmailFormat,
  deleteUnnecessaryUserData,
  generateFilenameWithExtension,
  isEmpty,
  getTimestamp,
  generateRandomNumber,
  createArray,
  generateRandomAlphabet,
  getRange,
  checkFileExtension,
  cleanObject
};

export default universalFunctions;
