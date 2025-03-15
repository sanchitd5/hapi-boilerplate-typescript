import utils from '../utils';
import Services from '../services/index'; 


const generateRandomNumbers = (numberLength: number, excludeList: Array<number> = []) => {
    let arrayList: string[] = []; 
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
        const convertedDigit = digitToCheck as any as number;
        if (convertedDigit < 999999)
            if (excludeList.indexOf(convertedDigit) == -1) {
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

export const generateUniqueCode = async (noOfDigits = 5, userRole: string) => {
    let excludeArray: any[] = []; 
    if (userRole !== utils.CONFIG.APP_CONSTANTS.DATABASE.USER_ROLES.USER) {
        throw utils.CONFIG.APP_CONSTANTS.STATUS_MSG.ERROR.IMP_ERROR;
    }
    const data = await Services.UserService?.getRecord({ OTPCode: { $ne: null } }, { OTPCode: 1 }, { lean: true });
        if (data && data.length > 0) {
            excludeArray = data.map((row: any) => row.OTPCode.toString());
        } 
        return generateRandomNumbers(noOfDigits, excludeArray);
        
};

