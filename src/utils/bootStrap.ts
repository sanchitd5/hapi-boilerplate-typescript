import Service from '../services';
import async from "async";
import { CryptData, getTimestamp } from "./index";
import { superAdmins } from "../config/user";
import { GenericServiceCallback, DATABASE } from '../types';
import config from '../config';

const insertDataMongo = (adminData: any, callbackParent: GenericServiceCallback) => {
    let _skip = false;
    async.series([
        async (cb) => {
            const data = await Service.AdminService?.getRecord({ emailId: adminData.emailId }, {}, {})
            if (data === undefined || data.length > 0) {
                _skip = true;
                return cb()
            }
            cb()
        },
        (cb) => {
            if (!_skip) {
                Service.AdminService?.createRecord(adminData, (err: any) => {
                    if (err) {
                        appLogger.debug("Implementation err", err);
                        cb(err)
                    }
                    else {
                        appLogger.info(`Admin: ${adminData.emailId} Added Successfully`);
                        cb()
                    }
                });
            }
            else cb()
        }
    ], (err) => {
        if (err) return callbackParent(err)
        else {
            return callbackParent(null);
        }
    })
};

const bootstrapAdmin = (callbackParent: GenericServiceCallback) => {
    const taskToRunInParallel: async.AsyncFunction<unknown, Error>[] = [];
    superAdmins.forEach((admin) => {
        taskToRunInParallel.push(((admin) => {
            return (embeddedCB) => {
                const adminData = {
                    emailId: admin.email,
                    password: CryptData(admin.password),
                    fullName: admin.name,
                    userType: config.APP_CONSTANTS.DATABASE.USER_ROLES.SUPERADMIN,
                    createdAt: getTimestamp(),
                    firstLogin: true
                };
                switch (config.APP_CONFIG.adminDatabase) {
                    case DATABASE.MONGODB:
                        insertDataMongo(adminData, embeddedCB as GenericServiceCallback);
                        break;
                }
            }
        })(admin));
    });
    async.parallel(taskToRunInParallel, function (error) {
        if (error)
            return callbackParent(error);
        return callbackParent(null);
    });
};

export default {
    bootstrapAdmin
}