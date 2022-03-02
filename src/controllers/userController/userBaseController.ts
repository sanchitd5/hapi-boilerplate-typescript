import GenericController from "../GenericController";
import TokenManager from '../../lib/tokenManager';
import * as CodeGenerator from "../../lib/codeGenerator";

class UserBaseController extends GenericController {
    declare private ERROR;
    constructor() {
        super();
        this.ERROR = this.universalFunctions.CONFIG.APP_CONSTANTS.STATUS_MSG.ERROR;
    }

    private checkIfTokenValid = (data: any, callback: Function) => {
        if (!!data) {
            callback(this.ERROR.INCORRECT_ACCESSTOKEN as any);
            return false;
        }
        if (data.length == 0) {
            callback(this.ERROR.INCORRECT_ACCESSTOKEN as any);
            return false;
        }
        return true;
    }

    createUser = (payloadData: any, callback: Function) => {
        let accessToken: string;
        let uniqueCode: number;
        const dataToSave = payloadData;
        if (dataToSave.password)
            dataToSave.password = this.universalFunctions.CryptData(dataToSave.password);
        let customerData: any;
        let appVersion: any;
        this.async.series(
            [
                (cb) => {
                    const query = {
                        $or: [{ emailId: payloadData.emailId }]
                    };
                    this.services.UserService.getRecord(query, {}, { lean: true }, (error: any, data: any) => {
                        if (error) cb(error);
                        else {
                            if (data && data.length > 0) {
                                if (data[0].emailVerified == true) cb(this.ERROR.USER_ALREADY_REGISTERED as any);
                                else {
                                    this.services.UserService.deleteUser({ _id: data[0]._id }, (err: Error) => {
                                        if (err) cb(err);
                                        else cb(null);
                                    });
                                }
                            } else cb(null);
                        }
                    });
                },
                (cb) => {
                    //Validate for facebookId and password
                    if (!dataToSave.password) cb(this.ERROR.PASSWORD_REQUIRED as any);
                    else cb();

                },
                (cb) => {
                    //Validate countryCode
                    if (dataToSave.countryCode.lastIndexOf("+") == 0) {
                        if (!isFinite(dataToSave.countryCode.substr(1))) {
                            cb(this.ERROR.INVALID_COUNTRY_CODE as any);
                        } else cb();
                    } else cb(this.ERROR.INVALID_COUNTRY_CODE as any);

                },
                (cb) => {
                    //Validate phone No
                    if (
                        dataToSave.phoneNumber &&
                        dataToSave.phoneNumber.split("")[0] == 0
                    ) cb(this.ERROR.INVALID_PHONE_NO_FORMAT as any);
                    else cb();
                },
                (cb) => {
                    CodeGenerator.generateUniqueCode(6,
                        this.universalFunctions.CONFIG.APP_CONSTANTS.DATABASE.USER_ROLES.USER,
                        (err: Error, numberObj: any) => {
                            if (err) cb(err);
                            else {
                                if (!numberObj || numberObj.number == null) cb(this.ERROR.UNIQUE_CODE_LIMIT_REACHED as any);
                                else {
                                    uniqueCode = numberObj.number;
                                    cb();
                                }
                            }
                        }
                    );
                },
                (cb) => {
                    //Insert Into DB
                    dataToSave.OTPCode = uniqueCode;
                    dataToSave.phoneNumber = payloadData.phoneNumber;
                    dataToSave.registrationDate = new Date().toISOString();
                    dataToSave.firstLogin = true;
                    this.services.UserService.createRecord(dataToSave, (err: any, customerDataFromDB: any) => {
                        if (err) {
                            if (err.code == 11000 && err.message.indexOf("emailId_1") > -1) {
                                cb(this.ERROR.EMAIL_NO_EXIST as any);
                            } else {
                                cb(err);
                            }
                        } else {
                            customerData = customerDataFromDB;
                            cb();
                        }
                    });
                },
                //  (cb) => {
                //     //Send SMS to User
                //     if (customerData) {
                //         NotificationManager.sendSMSToUser(uniqueCode, dataToSave.countryCode, dataToSave.mobileNo, (err: Error, data: any) => {
                //             cb();
                //         })
                //     } else {
                //         cb(ERROR.IMP_ERROR)
                //     }
                //
                // },
                (cb) => {
                    //Set Access Token
                    if (customerData) {
                        const tokenData = {
                            id: customerData._id,
                            type: this.universalFunctions.CONFIG.APP_CONSTANTS.DATABASE.USER_ROLES.USER
                        };
                        const deviceData: { deviceName: string, deviceType: string, deviceUUID: string } = {
                            deviceName: payloadData.deviceData.deviceName,
                            deviceType: payloadData.deviceData.deviceType,
                            deviceUUID: payloadData.deviceData.deviceUUID,
                        };
                        TokenManager.setToken(tokenData, deviceData, (err: Error, output: any) => {
                            if (err) cb(err);
                            else {
                                accessToken = (output && output.accessToken) || null;
                                cb();
                            }
                        });
                    } else cb(this.ERROR.IMP_ERROR as any);

                },
                (cb) => {
                    appVersion = {
                        latestIOSVersion: 100,
                        latestAndroidVersion: 100,
                        criticalAndroidVersion: 100,
                        criticalIOSVersion: 100
                    };
                    cb(null);
                }
            ],
            (err) => {
                if (err) callback(err);
                else {
                    callback(null, {
                        accessToken: accessToken,
                        otpCode: customerData.OTPCode,
                        userDetails: this.universalFunctions.deleteUnnecessaryUserData(
                            customerData
                        ),
                        appVersion: appVersion
                    });
                }
            }
        );
    };


    /**
     * 
     * @param {Object} payload Payload
     * @param {Object} payload.userData UserData
     * @param {any} payload.data Payload Data
     * @param {Function} callback Callback Function
     */
    verifyOTP = (payload: { userData: {}, data: {} }, callback: Function) => {
        const userData: any = payload.userData;
        const payloadData: any = payload.data;
        let customerData: any;
        this.async.series(
            [
                (cb) => {
                    const query = {
                        _id: userData.userId
                    };
                    const options = { lean: true };
                    this.services.UserService.getRecord(query, {}, options, (err: Error, data: any) => {
                        if (err) return cb(err);
                        if (!this.checkIfTokenValid(data, cb)) return;
                        customerData = data && data[0];
                        cb();
                    });
                },
                (cb) => {
                    //Check verification code :
                    if (payloadData.OTPCode == customerData.OTPCode) cb();
                    else cb(this.ERROR.INVALID_CODE as any);

                },
                (cb) => {
                    //trying to update customer
                    const criteria = {
                        _id: userData.userId,
                        OTPCode: payloadData.OTPCode
                    };
                    const setQuery = {
                        $set: { emailVerified: true },
                        $unset: { OTPCode: 1 }
                    };
                    const options = { new: true };
                    this.services.UserService.updateRecord(criteria, setQuery, options, (err: Error, updatedData: any) => {
                        if (err) cb(err);
                        else {
                            if (!updatedData) cb(this.ERROR.INVALID_CODE as any);
                            else cb();
                        }
                    });
                }
            ],
            (err) => {
                if (err) return callback(err);
                callback();
            }
        );
    };

    loginUser = (payloadData: any, callback: Function) => {
        let userFound: any;
        let accessToken: string;
        let successLogin = false;
        let appVersion: any;
        let updatedUserDetails: any;
        this.async.series(
            [
                (cb) => {
                    const criteria = { emailId: payloadData.emailId };
                    const option = { lean: true };
                    this.services.UserService.getRecord(criteria, {}, option, (err: Error, result: any) => {
                        if (err) cb(err);
                        else {
                            userFound = (result && result[0]) || null;
                            cb();
                        }
                    });
                },
                (cb) => {
                    //validations
                    if (!userFound) cb(this.ERROR.USER_NOT_FOUND as any);
                    else {
                        if (userFound.isBlocked) cb(this.ERROR.ACCOUNT_BLOCKED as any);
                        else {
                            if (
                                userFound &&
                                userFound.password !=
                                this.universalFunctions.CryptData(payloadData.password)
                            ) {
                                cb(this.ERROR.INCORRECT_PASSWORD as any);
                            } else if (userFound.emailVerified == false) {
                                cb(this.ERROR.NOT_REGISTERED as any);
                            } else {
                                successLogin = true;
                                cb();
                            }
                        }
                    }
                },
                (cb) => {
                    const criteria = {
                        _id: userFound._id
                    };
                    const setQuery = {
                        deviceToken: payloadData.deviceToken,
                        deviceType: payloadData.deviceType
                    };
                    this.services.UserService.updateRecord(
                        criteria,
                        setQuery,
                        { new: true },
                        (err: Error, data: any) => {
                            updatedUserDetails = data;
                            cb(err, data);
                        }
                    );
                },
                (cb) => {
                    const criteria = { emailId: payloadData.emailId };
                    const projection = {
                        password: 0,
                        accessToken: 0,
                        initialPassword: 0,
                        OTPCode: 0,
                        code: 0,
                        codeUpdatedAt: 0
                    };
                    const option = { lean: true };
                    this.services.UserService.getRecord(criteria, projection, option, (err: Error, result: any) => {
                        if (err) cb(err);
                        else {
                            userFound = (result && result[0]) || null;
                            cb();
                        }
                    });
                },
                (cb) => {
                    if (successLogin) {
                        const tokenData = {
                            id: userFound._id,
                            type: this.universalFunctions.CONFIG.APP_CONSTANTS.DATABASE.USER_ROLES.USER
                        };
                        TokenManager.setToken(tokenData, payloadData.deviceData, (err: Error, output: any) => {
                            if (err) return cb(err);
                            if (output && output.accessToken) {
                                accessToken = output && output.accessToken;
                                cb();
                            } else {
                                cb(this.ERROR.IMP_ERROR as any);
                            }

                        });
                    } else cb(this.ERROR.IMP_ERROR as any);
                },
                (cb) => {
                    appVersion = {
                        latestIOSVersion: 100,
                        latestAndroidVersion: 100,
                        criticalAndroidVersion: 100,
                        criticalIOSVersion: 100
                    };
                    cb(null);
                }
            ],
            (err) => {
                if (err) callback(err);
                else {
                    callback(null, {
                        accessToken: accessToken,
                        userDetails: this.universalFunctions.deleteUnnecessaryUserData(userFound),
                        appVersion: appVersion
                    });
                }
            }
        );
    };

    resendOTP = (userData: any, callback: Function) => {
        /*
           Create a Unique 6 digit code
           Insert It Into Customer DB
           Send Back Response
           */
        let uniqueCode: number;
        let customerData;
        this.async.series(
            [
                (cb) => {
                    const query = {
                        _id: userData.userId
                    };
                    const options = { lean: true };
                    this.services.UserService.getRecord(query, {}, options, (err: Error, data: any) => {
                        if (err) return cb(err);
                        if (!this.checkIfTokenValid(data, cb)) return;
                        customerData = (data && data[0]) || null;
                        if (customerData.emailVerified == true) return cb(this.ERROR.EMAIL_VERIFICATION_COMPLETE as any);
                        cb();
                    });
                },
                (cb) => {
                    CodeGenerator.generateUniqueCode(
                        6,
                        this.universalFunctions.CONFIG.APP_CONSTANTS.DATABASE.USER_ROLES.USER,
                        (err: Error, numberObj: any) => {
                            if (err) return cb(err);
                            if (!numberObj || numberObj.number == null) return cb(this.ERROR.UNIQUE_CODE_LIMIT_REACHED as any);
                            uniqueCode = numberObj.number;
                            cb();
                        }
                    );
                },
                (cb) => {
                    const criteria = {
                        _id: userData.userId
                    };
                    const setQuery = {
                        $set: {
                            OTPCode: uniqueCode,
                            codeUpdatedAt: new Date().toISOString()
                        }
                    };
                    this.services.UserService.updateRecord(criteria, setQuery, {}, cb);
                }
            ],
            (err) => {
                callback(err, { OTPCode: uniqueCode });
            }
        );
    };

    getOTP = (payloadData: any, callback: Function) => {
        const query = {
            emailId: payloadData.emailId
        };
        const projection = {
            _id: 0,
            OTPCode: 1
        };
        this.services.UserService.getRecord(query, projection, {}, (err: Error, data: any) => {
            if (err) return callback(err);
            const customerData = (data && data[0]) || null;
            if (customerData == null || customerData.OTPCode == undefined) return callback(this.ERROR.OTP_CODE_NOT_FOUND);
            callback(null, customerData);
        });
    };

    accessTokenLogin = (payload: any, callback: Function) => {
        let appVersion: any;
        const userData = payload;
        let userFound: any;
        this.async.series(
            [
                (cb) => {
                    const criteria = {
                        _id: userData.userId
                    };
                    this.services.UserService.getRecord(criteria, { password: 0 }, {}, (
                        err: Error,
                        data: any
                    ) => {
                        if (err) return cb(err);
                        if (!this.checkIfTokenValid(data, cb)) return;
                        userFound = (data && data[0]);
                        if (userFound.isBlocked) return cb(this.ERROR.ACCOUNT_BLOCKED as any);
                        appVersion = {
                            latestIOSVersion: 100,
                            latestAndroidVersion: 100,
                            criticalAndroidVersion: 100,
                            criticalIOSVersion: 100
                        };
                        cb();

                    });
                },
            ],
            (err) => {
                if (err) return callback(err);
                callback(null, {
                    accessToken: userData.accessToken,
                    userDetails: this.universalFunctions.deleteUnnecessaryUserData(userFound),
                    appVersion: appVersion
                });
            }
        );
    };

    logoutCustomer = (tokenData: any, callback: Function) => {
        this.services.TokenService.deleteRecord({ _id: tokenData._id }, (err: Error) => {
            if (err) callback(err);
            else callback();
        });
    };

    getProfile = (userData: any, callback: Function) => {
        const query = {
            _id: userData.userId
        };
        const projection = {
            __v: 0,
            password: 0,
            accessToken: 0,
            codeUpdatedAt: 0
        };
        this.services.UserService.getRecord(query, projection, {}, (err: Error, data: any) => {
            if (err) return callback(err);
            if (!this.checkIfTokenValid(data, callback)) return;
            const customerData = (data && data[0]) || null;
            if (customerData.isBlocked) return callback(this.ERROR.ACCOUNT_BLOCKED as any);
            callback();
        });
    };

    changePassword = (userData: any, payloadData: any, callbackRoute: Function) => {
        const oldPassword = this.universalFunctions.CryptData(payloadData.oldPassword);
        const newPassword = this.universalFunctions.CryptData(payloadData.newPassword);
        let customerData: any;
        this.async.series(
            [
                (cb) => {
                    const query = {
                        _id: userData.userId
                    };
                    this.services.UserService.getRecord(query, {}, {}, (err: Error, data: any) => {
                        if (err) return cb(err);
                        if (!this.checkIfTokenValid(data, cb)) return;
                        customerData = (data && data[0]) || null;
                        if (customerData.isBlocked) return cb(this.ERROR.ACCOUNT_BLOCKED as any);
                        cb();
                    });
                },
                (callback) => {
                    const query = {
                        _id: userData.userId
                    };
                    const projection = {
                        password: 1,
                        firstLogin: 1
                    };
                    this.services.UserService.getRecord(query, projection, {}, (
                        err: Error,
                        data: any
                    ) => {
                        if (err) return callback(err);
                        customerData = (data && data[0]) || null;
                        if (customerData == null) return callback(this.ERROR.NOT_FOUND as any);
                        if (payloadData.skip == false) {
                            if (
                                data[0].password == oldPassword &&
                                data[0].password != newPassword
                            ) {
                                callback(null);
                            } else if (data[0].password != oldPassword) {
                                callback(this.ERROR.WRONG_PASSWORD as any);
                            } else if (data[0].password == newPassword) {
                                callback(this.ERROR.NOT_UPDATE as any);
                            }
                        }
                        else callback(null)
                    });
                },
                (callback) => {
                    let dataToUpdate;
                    if (payloadData.skip == true && customerData.firstLogin == false) {
                        dataToUpdate = { $set: { firstLogin: true }, $unset: { initialPassword: 1 } };
                    }
                    else if (payloadData.skip == false && customerData.firstLogin == false) {
                        dataToUpdate = { $set: { password: newPassword, firstLogin: true }, $unset: { initialPassword: 1 } };
                    }
                    else if (payloadData.skip == true && customerData.firstLogin == true) {
                        dataToUpdate = {}
                    }
                    else {
                        dataToUpdate = { $set: { password: newPassword } };
                    }
                    const condition = { _id: userData.userId };
                    this.services.UserService.updateRecord(condition, dataToUpdate, {}, (
                        err: Error,
                        user: any
                    ) => {
                        if (err) return callback(err);
                        if (!user || user.length == 0) return callback(this.ERROR.NOT_FOUND as any);
                        callback();
                    });
                }
            ],
            (error) => {
                if (error) return callbackRoute(error);
                callbackRoute(null);
            }
        );
    };

    forgetPassword = (payloadData: any, callback: Function) => {
        let dataFound: any;
        let code: any;
        let forgotDataEntry: any;
        this.async.series(
            [
                (cb) => {
                    const query = {
                        emailId: payloadData.emailId
                    };
                    this.services.UserService.getRecord(query, {
                        _id: 1,
                        emailId: 1,
                        emailVerified: 1
                    }, {}, (err: Error, data: any) => {
                        if (err) return cb(this.ERROR.PASSWORD_CHANGE_REQUEST_INVALID as any);
                        dataFound = (data && data[0]) || null;
                        if (dataFound == null) return cb(this.ERROR.USER_NOT_REGISTERED as any);
                        if (dataFound.emailVerified == false) return cb(this.ERROR.NOT_VERFIFIED as any);
                        if (dataFound.isBlocked) return cb(this.ERROR.ACCOUNT_BLOCKED as any);
                        cb();

                    });
                },
                (cb) => {
                    CodeGenerator.generateUniqueCode(
                        6,
                        this.universalFunctions.CONFIG.APP_CONSTANTS.DATABASE.USER_ROLES.USER,
                        (err: Error, numberObj: any) => {
                            if (err) return cb(err);
                            if (!numberObj || numberObj.number == null) return cb(this.ERROR.UNIQUE_CODE_LIMIT_REACHED as any);
                            code = numberObj.number;
                            cb();
                        }
                    );
                },
                (cb) => {
                    const dataToUpdate = {
                        code: code
                    };
                    const query = {
                        _id: dataFound._id
                    };
                    this.services.UserService.updateRecord(query, dataToUpdate, {}, (err: Error) => {
                        if (err) return cb(err);
                        cb();

                    });
                },
                (cb) => {
                    this.services.ForgetPasswordService.getForgetPasswordRequest(
                        { customerID: dataFound._id }, {
                        _id: 1,
                        isChanged: 1
                    }, { lean: 1 },
                        (err: Error, data: any) => {
                            if (err) return cb(err);
                            forgotDataEntry = (data && data[0]) || null;
                            cb();
                        }
                    );
                },
                (cb) => {
                    const data = {
                        customerID: dataFound._id,
                        requestedAt: Date.now(),
                        userType: this.universalFunctions.CONFIG.APP_CONSTANTS.DATABASE.USER_ROLES.USER,
                        isChanged: true
                    };
                    if (forgotDataEntry == null) {
                        this.services.ForgetPasswordService.createForgetPasswordRequest(data, cb);
                    } else {
                        if (forgotDataEntry.isChanged == true) {
                            data.isChanged = false;
                        }
                        this.services.ForgetPasswordService.updateForgetPasswordRequest(
                            { _id: forgotDataEntry._id },
                            data,
                            {},
                            cb
                        );
                    }
                }
            ],
            function (error, result) {
                if (error) {
                    callback(error);
                } else {
                    callback(null, { emailId: payloadData.emailId, OTPCode: code });
                }
            }
        );
    };

    resetPassword = (payloadData: any, callbackRoute: Function) => {
        let foundData: any;
        let customerId: any;
        let data;
        this.async.series(
            [
                (callback) => {
                    const query = {
                        emailId: payloadData.emailId
                    };
                    this.services.UserService.getRecord(
                        query,
                        {
                            _id: 1,
                            code: 1,
                            emailVerified: 1
                        },
                        { lean: true },
                        (err: Error, result: any) => {
                            if (err) {
                                callback(err);
                            } else {
                                data = (result && result[0]) || null;
                                if (data == null) {
                                    callback(this.ERROR.INCORRECT_ID as any);
                                } else {
                                    if (payloadData.OTPCode != data.code) {
                                        callback(this.ERROR.INVALID_CODE as any);
                                    } else {
                                        if (data.phoneVerified == false) {
                                            callback(this.ERROR.NOT_VERFIFIED as any);
                                        } else {
                                            customerId = data._id;
                                            callback();
                                        }
                                    }
                                }
                            }
                        }
                    );
                },
                (callback) => {
                    const query = { customerID: customerId, isChanged: false };
                    this.services.ForgetPasswordService.getForgetPasswordRequest(
                        query,
                        { __v: 0 },
                        {
                            limit: 1,
                            lean: true
                        },
                        function (err: Error, data: any) {
                            if (err) {
                                callback(err);
                            } else {
                                foundData = (data && data[0]) || null;
                                callback();
                            }
                        }
                    );
                },
                (callback) => {
                    if (!this.universalFunctions.isEmpty(foundData)) {
                        const minutes = this.universalFunctions.getRange(
                            foundData.requestedAt,
                            new Date(),
                            this.universalFunctions.CONFIG.APP_CONSTANTS.TIME_UNITS.MINUTES
                        );
                        if (minutes < 0 || minutes > 30) {
                            return callback(this.ERROR.PASSWORD_CHANGE_REQUEST_EXPIRE as any);
                        } else {
                            callback();
                        }
                    } else {
                        return callback(this.ERROR.PASSWORD_CHANGE_REQUEST_INVALID as any);
                    }
                },
                (callback) => {
                    const dataToUpdate = {
                        password: this.universalFunctions.CryptData(payloadData.password)
                    };
                    appLogger.info(dataToUpdate);
                    this.services.UserService.updateRecord(
                        { _id: customerId },
                        dataToUpdate,
                        {},
                        (error: Error, result: any) => {
                            if (error) {
                                callback(error);
                            } else {
                                if (result.n === 0) {
                                    callback(this.ERROR.USER_NOT_FOUND as any);
                                } else {
                                    callback();
                                }
                            }
                        }
                    );
                },
                (callback) => {
                    const dataToUpdate = {
                        isChanged: true,
                        changedAt: this.universalFunctions.getTimestamp()
                    };
                    this.services.ForgetPasswordService.updateForgetPasswordRequest(
                        { customerID: customerId },
                        dataToUpdate,
                        {
                            lean: true
                        },
                        callback
                    );
                }
            ],
            (error) => {
                if (error) {
                    callbackRoute(error);
                } else {
                    callbackRoute(null);
                }
            }
        );
    };

}

export default new UserBaseController();