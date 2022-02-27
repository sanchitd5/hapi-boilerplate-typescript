import { GenericObject } from '../definations';
import Models from '../models';

const getForgetPasswordRequest = function (conditions: GenericObject, projection: GenericObject, options: GenericObject, callback: Function) {
    Models.ForgetPassword.find(conditions, projection, options, callback);
};
const updateForgetPasswordRequest = function (criteria: GenericObject, dataToSet: GenericObject, options: GenericObject, callback: Function) {
    Models.ForgetPassword.findOneAndUpdate(criteria, dataToSet, options, callback);
};

const createForgetPasswordRequest = function (data: GenericObject, callback: Function) {
    const forgotPasswordEntry = new Models.ForgetPassword(data);
    forgotPasswordEntry.save(function (err: Error, result: any) {
        callback(err, result);
    })
}

export default {
    getForgetPasswordRequest,
    updateForgetPasswordRequest,
    createForgetPasswordRequest
}