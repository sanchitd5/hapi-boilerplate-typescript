
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


import Services from '../services/index';
import async from 'async';
import _ from 'lodash';
import config from '../config';
import converters from '../utils/converters';
import { GenericObject } from '../definations';


const generateRandomNumbers = (numberLength: number, excludeList: Array<number>) => {
    let arrayList: Array<string> = [];
    excludeList = excludeList || [];

    let minString = "0";
    let maxString = "9";
    let i;

    for (i = 1; i < numberLength; i++) {
        minString = minString + "0";
        maxString = maxString + "9";
    }
    const minNumber = parseInt(minString);
    const maxNumber = parseInt(maxString);
    //Create list
    for (i = minNumber; i < maxNumber; i++) {
        let digitToCheck = i.toString();
        if (digitToCheck.length < numberLength) {
            const diff = numberLength - digitToCheck.length;
            let zeros = '';
            for (let j = 0; j < diff; j++) {
                zeros += Math.floor((Math.random() * 10) + 1);
            }
            digitToCheck = zeros + digitToCheck
        }
        const covertedDigit = digitToCheck as any as number;
        if (covertedDigit < 999999)
            if (excludeList.indexOf(covertedDigit) == -1) {
                arrayList.push(digitToCheck)
            }
    }
    if (arrayList.length > 0) {
        arrayList = _.shuffle(arrayList);
        return arrayList[0];
    } else {
        return false;
    }
};

export const generateUniqueCode = (noOfDigits: number, userRole: string, callback: (err: Error | null | undefined, data: GenericObject | Array<GenericObject>) => void) => {
    if (Services.UserService === undefined) throw Error("User management disabled");
    noOfDigits = noOfDigits || 5;
    let excludeArray: any[] = [];
    let generatedRandomCode: any;
    async.series([
        (cb) => {
            //Push All generated codes in excludeAry
            if (userRole == config.APP_CONSTANTS.DATABASE.USER_ROLES.USER) {
                Services.UserService?.getRecord({ OTPCode: { $ne: null } }, { OTPCode: 1 }, { lean: true }, (err: any, data: any) => {
                    if (err) {
                        cb(err);
                    } else {
                        if (data && data.length > 0) {
                            excludeArray = data.map((row: any) => row.OTPCode.toString());
                        }
                        cb();
                    }
                })
            }
            else cb(converters.convert(config.APP_CONSTANTS.STATUS_MSG.ERROR.IMP_ERROR, converters.toError));
        }, (cb) => {
            //Generate Random Code of digits specified
            generatedRandomCode = generateRandomNumbers(noOfDigits, excludeArray);
            cb();

        }], (err, data) => {
            callback(err, { number: generatedRandomCode })
        });
};

