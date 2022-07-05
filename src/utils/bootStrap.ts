import Service from '../services';
import async from "async";
import UniversalFunctions from "./universalFunctions";
import { superAdmins } from "../config/users";
import { GenericServiceCallback } from '../definations';

const insertData = (adminData: any, callbackParent: GenericServiceCallback) => {
    let _skip = false;
    async.series([
        (cb) => {
            Service.AdminService.getRecord({ emailId: adminData.emailId }, {}, {}, (err, data) => {
                if (err) cb(err)
                else {
                    if (data.length > 0) {
                        _skip = true;
                        cb()
                    }
                    else cb()
                }
            })
        },
        (cb) => {
            if (!_skip) {
                Service.AdminService.createRecord(adminData, (err: any) => {
                    if (err) {
                        appLogger.debug("Implementation err", err);
                        cb(err)
                    }
                    else {
                        appLogger.info(`Admin: ${adminData.emailId} Added Succesfully`);
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
                    password: UniversalFunctions.CryptData(admin.password),
                    fullName: admin.name,
                    userType: UniversalFunctions.CONFIG.APP_CONSTANTS.DATABASE.USER_ROLES.SUPERADMIN,
                    createdAt: UniversalFunctions.getTimestamp(),
                    firstLogin: true
                };
                insertData(adminData, embeddedCB as any);
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