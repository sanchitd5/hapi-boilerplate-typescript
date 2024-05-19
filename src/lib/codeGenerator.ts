import utils from '../utils';
import Services from '../services/index';
import async from 'async';


const generateRandomNumbers = (numberLength: number, excludeList: Array<number>) => {
    let arrayList: string[] = [];
    excludeList = excludeList || [];

    let minString = "0";
    let maxString = "9";
    let i;
    let digitToCheck: string;
    for (i = 1; i < numberLength; i++) {
        minString = minString + "0";
        maxString = maxString + "9";
    }
    const minNumber = parseInt(minString);
    const maxNumber = parseInt(maxString);
    //Create list
    for (i = minNumber; i < maxNumber; i++) {
        digitToCheck = i.toString();
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
        arrayList = utils.shuffle(arrayList);
        return arrayList[0];
    } else {
        return false;
    }
};

export const generateUniqueCode = (noOfDigits: number, userRole: string, callback: Function) => {
    noOfDigits = noOfDigits || 5;
    let excludeArray: any[] = [];
    let generatedRandomCode: any;
    async.series([
        async (cb: Function) => {
            //Push All generated codes in excludeAry
            if (userRole == utils.CONFIG.APP_CONSTANTS.DATABASE.USER_ROLES.USER) {
                try {
                    const data = await Services.UserService?.getRecord({ OTPCode: { $ne: null } }, { OTPCode: 1 }, { lean: true })
                    if (data && data.length > 0) {
                        excludeArray = data.map((row: any) => row.OTPCode.toString());
                    }
                    cb();
                } catch (e) {
                    cb(e);
                }
            }
            else cb(utils.CONFIG.APP_CONSTANTS.STATUS_MSG.ERROR.IMP_ERROR);
        }, (cb) => {
            //Generate Random Code of digits specified
            generatedRandomCode = generateRandomNumbers(noOfDigits, excludeArray);
            cb();

        }], (err, data) => {
            callback(err, { number: generatedRandomCode })
        });
};

