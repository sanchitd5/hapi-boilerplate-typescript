import BaseController from "../base";

class DemoBaseController extends BaseController {

    /**
    * 
    * @param {Object} payload 
    * @param {String} payload.message 
    * @param {Function} callback 
     */
    demoFunction = (payload: any, callback:(err?: Error | null | undefined, result?: any) => void ) => {
        global.appLogger.info(payload.message); 
        return callback(null, payload);
    };
}

export default new DemoBaseController();