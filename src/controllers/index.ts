import DemoBaseController from "./demoController/demoBaseController";
import UploadBaseController from "./uploadController/uploadBaseController";
import config from "../config";
import { DATABASE } from "../definations";

class Controllers {
  declare UserBaseController?;
  declare AdminBaseController?;
  private async init() {
    if (config.APP_CONFIG.userDatabase !== DATABASE.NONE) {
      this.UserBaseController = await require('userController/userBaseController');
    }
    if (config.APP_CONFIG.adminDatabase !== DATABASE.NONE) {
      this.AdminBaseController = await require('adminController/adminBaseController');
    }
  }
  constructor() {
    this.init();
  }
  DemoBaseController = DemoBaseController;
  UploadBaseController = UploadBaseController;
}

export default new Controllers();