import TokenManager from '../../lib/tokenManager';
import BaseController from '../base';
import { GenericObject } from '../../types';

class Admin extends BaseController {
  declare private ERROR;
  declare private CONFIG;

  constructor() {
    super();
    this.ERROR = this.config.APP_CONSTANTS.STATUS_MSG.ERROR;
  }

  adminLogin = (payload, callback) => {
    const emailId = payload.emailId;
    const password = payload.password;
    let userFound: GenericObject | null;
    let accessToken: string;
    let successLogin = false;
    this.async.series(
      [
        async (cb) => {
          try {
            const result = await this.services.AdminService?.getRecord({ emailId: emailId }, {}, {},);
            userFound = (result?.[0]) || null;
            cb(null, result);
          } catch (e: any) {
            cb(e);
          }
        },
        (cb) => {
          //validations
          if (!userFound) {
            return cb(this.ERROR.USER_NOT_FOUND);
          }
          if (userFound && userFound.password != this.utils.CryptData(password)) {
            return cb(this.ERROR.INCORRECT_PASSWORD);
          }
          if (userFound.isBlocked === true) {
            return cb(this.ERROR.ACCOUNT_BLOCKED);
          }
          successLogin = true;
          cb();
        },
        async (cb) => {
          try {
            const result = await this.services.AdminService?.getRecord({ emailId: emailId }, { password: 0 }, {});
            userFound = (result?.[0]) || null;
            cb();
          } catch (e: any) {
            cb(e)
          }

        },
        (cb) => {
          if (!successLogin || userFound == null) {
            return cb(this.ERROR.IMP_ERROR);
          }
          const tokenData = {
            id: userFound._id,
            type: this.config.APP_CONSTANTS.DATABASE.USER_ROLES.ADMIN
          };
          TokenManager.setToken(tokenData, payload.deviceData, (err, result) => {
            if (err) {
              return cb(err as any);
            }
            if (result?.accessToken) {
              accessToken = result.accessToken;
              return cb();
            }
            cb(this.ERROR.IMP_ERROR);
          });
        }
      ],
      (err) => {
        if (err) return callback(err);
        callback(null, {
          accessToken: accessToken,
          adminDetails: userFound
        });
      }
    );
  }

  accessTokenLogin(payload, callback) {
    let userFound: any = null;
    const userData = payload;
    this.async.series(
      [
        async (cb) => {
          try {
            const data = await this.services.AdminService?.getRecord({ _id: userData.adminId }, { password: 0 }, {});
            if (data === undefined || data.length == 0) return cb(this.ERROR.INCORRECT_ACCESSTOKEN);
            userFound = (data?.[0]) || null;
            cb();
          } catch (e: any) {
            cb(e);
          }
        },
      ],
      (err) => {
        if (!err)
          return callback(null, {
            accessToken: userData.accessToken,
            adminDetails: this.utils.deleteUnnecessaryUserData(userFound),
            appVersion: {
              latestIOSVersion: 100,
              latestAndroidVersion: 100,
              criticalAndroidVersion: 100,
              criticalIOSVersion: 100
            }
          });
        callback(err);
      }
    );
  }

  createAdmin(userData, payloadData, callback) {
    let newAdmin;
    let userFound;
    this.async.series(
      [
        async (cb) => {
          try {
            const criteria = {
              _id: userData.adminId
            };
            const data = await this.services.AdminService?.getRecord(criteria, { password: 0 }, {});
            if (data === undefined || data.length == 0) cb(this.ERROR.INCORRECT_ACCESSTOKEN);
            else {
              userFound = this.convert.toObjectArray(data) && data[0] || null;
              if (userFound.userType != this.config.APP_CONSTANTS.DATABASE.USER_ROLES.SUPERADMIN) cb(this.ERROR.PRIVILEGE_MISMATCH);
              else cb();
            }
          } catch (e: any) {
            cb(e);
          }
        },
        async (cb) => {
          try {
            const criteria = {
              emailId: payloadData.emailId
            }
            const data = await this.services.AdminService?.getRecord(criteria, {}, {});
            if (data === undefined || data.length > 0) return cb(this.ERROR.USERNAME_EXIST)
            cb()
          } catch (e: any) {
            cb(e)
          }
        },
        (cb) => {
          payloadData.initialPassword = this.utils.generateRandomString();
          payloadData.password = this.utils.CryptData(payloadData.initialPassword);
          payloadData.userType = this.config.APP_CONSTANTS.DATABASE.USER_ROLES.ADMIN;
          this.services.AdminService?.createRecord(payloadData, (err, data) => {
            if (err) cb(err)
            else {
              newAdmin = data;
              cb()
            }
          })
        }
      ],
      (err) => {
        if (err) return callback(err);
        callback(null, { adminDetails: this.utils.deleteUnnecessaryUserData(newAdmin) });
      }
    );
  }

  getAdmin(userData, callback) {
    let adminList: any = [];
    let userFound;
    this.async.series([
      async (cb) => {
        try {
          const criteria = {
            _id: userData.adminId
          };
          const data = await this.services.AdminService?.getRecord(criteria, { password: 0 }, {});
          if (data === undefined || data.length == 0) return cb(this.ERROR.INCORRECT_ACCESSTOKEN);
          userFound = (data && data[0]) || null;
          if (userFound.userType != this.config.APP_CONSTANTS.DATABASE.USER_ROLES.SUPERADMIN) cb(this.ERROR.PRIVILEGE_MISMATCH);
          else cb();
        } catch (e: any) {
          cb(e);
        }
      },
      async (cb) => {
        try {
          adminList = await this.services.AdminService?.getRecord({
            userType: this.config.APP_CONSTANTS.DATABASE.USER_ROLES.ADMIN
          }, { password: 0, __v: 0, createdAt: 0 }, {});
          cb()
        } catch (e: any) {
          cb(e);
        }
      }
    ], (err) => {
      if (err) callback(err)
      else callback(null, { data: adminList })
    })
  }

  blockUnblockAdmin = (userData, payloadData, callback) => {
    let userFound;
    this.async.series([
      async (cb) => {
        const criteria = {
          _id: userData.adminId
        };
        const data = await this.services.AdminService?.getRecord(criteria, { password: 0 }, {});
        if (data === undefined || data.length == 0) cb(this.ERROR.INCORRECT_ACCESSTOKEN);
        else {
          userFound = (data && data[0]) || null;
          if (userFound.userType != this.config.APP_CONSTANTS.DATABASE.USER_ROLES.SUPERADMIN) cb(this.ERROR.PRIVILEGE_MISMATCH);
          else cb();
        }
      },
      async (cb) => {
        try {
          const data = await this.services.AdminService?.getRecord({ _id: payloadData.adminId }, {}, {})
          if (data === undefined || data.length == 0) {
            return cb(this.ERROR.USER_NOT_FOUND);
          }
          cb();
        } catch (e: any) {
          cb(e);
        }
      },
      (cb) => {
        this.services.AdminService?.updateRecord({ _id: payloadData.adminId }, {
          $set: {
            isBlocked: payloadData.block
          }
        }, {}, (err, data) => {
          if (err) return cb(err)
          userFound = data;
          cb()
        })
      }
    ], (err) => {
      if (err) return callback(err)
      callback(null, userFound)
    })
  }


  createUser(userData, payloadData, callback) {
    let newUserData;
    this.async.series([
      async (cb) => {
        try {
          const criteria = {
            _id: userData.adminId
          };
          const data = await this.services.AdminService?.getRecord(criteria, { password: 0 }, {});
          if (data === undefined || data.length == 0) return cb(this.ERROR.INCORRECT_ACCESSTOKEN);
          cb();
        } catch (e: any) {
          cb(e);
        }
      },
      async (cb) => {
        try {
          const data = await this.services.UserService?.getRecord({ emailId: payloadData.emailId }, {}, {});
          if (data.length != 0) return cb(this.ERROR.USER_ALREADY_REGISTERED);
          cb();
        } catch (e: any) {
          cb(e);
        }
      },
      (cb) => {
        payloadData.initialPassword = this.utils.generateRandomString();
        payloadData.password = this.utils.CryptData(payloadData.initialPassword);
        payloadData.emailVerified = true;
        this.services.UserService?.createRecord(payloadData, (err, data) => {
          if (err) cb(err)
          else {
            newUserData = data;
            cb()
          }
        })
      }
    ], (err) => {
      if (err) callback(err)
      else callback(null, { userData: this.utils.deleteUnnecessaryUserData(newUserData) })
    })
  }

  getUser = (userData, callback) => {
    let userList = [];
    let userFound: GenericObject | null;
    this.async.series([
      async (cb) => {
        try {
          const data = await this.services.AdminService?.getRecord({ _id: userData.adminId }, { password: 0 }, {});
          if (data === undefined || data.length == 0) cb(this.ERROR.INCORRECT_ACCESSTOKEN);
          else {
            userFound = (this.convert.toObjectArray(data) && data[0]) || null;
            if (userFound?.isBlocked == true) cb(this.ERROR.ACCOUNT_BLOCKED)
            else cb()
          }
        } catch (e: any) {
          cb(e);
        }
      },
      async (cb) => {
        try {
          const projection = {
            password: 0,
            accessToken: 0,
            OTPCode: 0,
            code: 0,
            codeUpdatedAt: 0,
            __v: 0,
            registrationDate: 0
          }
          userList = await this.services.UserService?.getRecord({}, projection, {});
          cb();
        } catch (e: any) {
          cb(e);
        }
      }
    ], (err) => {
      if (err) return callback(err)
      callback(null, { data: userList })
    })
  }

  logoutAdmin(tokenData, callback) {
    this.services.TokenService.deleteRecord({ _id: tokenData._id }, (err) => {
      if (err) callback(err);
      else callback();
    });
  }

  changePassword(userData, payloadData, callbackRoute) {
    const oldPassword = this.utils.CryptData(payloadData.oldPassword);
    const newPassword = this.utils.CryptData(payloadData.newPassword);
    let customerData;
    this.async.series(
      [
        async (cb) => {
          try {
            const query = {
              _id: userData.adminId
            };
            const options = { lean: true };
            const data = await this.services.AdminService?.getRecord(query, {}, options);
            if (data === undefined || data.length == 0) cb(this.ERROR.INCORRECT_ACCESSTOKEN);
            else {
              customerData = (data && data[0]) || null;
              if (customerData.isBlocked) cb(this.ERROR.ACCOUNT_BLOCKED);
              else cb();
            }
          } catch (e: any) {
            cb(e);
          }
        },
        async (cb) => {
          const query = {
            _id: userData.adminId
          };
          const projection = {
            password: 1,
            firstLogin: 1
          };
          const options = { lean: true };
          try {
            const data = await (this.services.AdminService?.getRecord(query, projection, options) as Promise<undefined | Array<any>>);
            customerData = (data && data[0]) || null;
            if (customerData == null || data === undefined)
              return cb(this.ERROR.NOT_FOUND);
            if (payloadData.skip == false) {
              if (
                data[0].password == oldPassword &&
                data[0].password != newPassword
              ) {
                return cb(null);
              } else if (data[0].password != oldPassword) {
                return cb(this.ERROR.WRONG_PASSWORD);
              } else if (data[0].password == newPassword) {
                return cb(this.ERROR.NOT_UPDATE);
              }
            }
            cb(null);
          } catch (e: any) {
            cb(e);
          }

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
          this.services.AdminService?.updateRecord({ _id: userData.adminId }, dataToUpdate, {}, (err, user) => {
            if (err) {
              callback(err);
            } else {
              if (!user || (user as any).length == 0) {
                callback(this.ERROR.NOT_FOUND);
              } else {
                callback(null);
              }
            }
          });
        }
      ],
      (error) => {
        if (error) return callbackRoute(error);
        callbackRoute(null);
      }
    )
  }

  blockUnblockUser(userData, payloadData, callback) {
    let userFound;
    this.async.series([
      async (cb) => {
        try {
          const data = await this.services.AdminService?.getRecord({
            _id: userData.adminId
          }, { password: 0 }, {});
          if (data == undefined || data.length == 0) return cb(this.ERROR.INCORRECT_ACCESSTOKEN);
          userFound = (data && data[0]) || null;
          if (userFound.isBlocked == true) cb(this.ERROR.ACCOUNT_BLOCKED)
          else cb()
        } catch (e: any) {
          cb(e);
        }
      },
      async (cb) => {
        try {
          const data = await this.services.UserService?.getRecord({ _id: payloadData.userId }, {}, {})
          if (data.length == 0) return cb(this.ERROR.USER_NOT_FOUND)
          cb()
        } catch (e: any) {
          cb(e)
        }
      },
      (cb) => {
        const criteria = {
          _id: payloadData.userId
        }
        const dataToUpdate = {
          $set: {
            isBlocked: payloadData.block
          }
        }
        this.services.UserService?.updateRecord(criteria, dataToUpdate, {}, (err, data) => {
          if (err) return cb(err);
          userFound = data;
          cb()
        })
      }
    ], (err) => {
      if (err) return callback(err);
      callback(null, userFound)
    })
  }
}

export default new Admin();

