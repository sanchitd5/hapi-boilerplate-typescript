import DemoBaseController from "./demo";
import UploadBaseController from "./upload";
import UserBaseController from "./user";
import AdminBaseController from "./admin"; 

export default new class Controllers {
  UserBaseController = UserBaseController;
  AdminBaseController = AdminBaseController;
  DemoBaseController = DemoBaseController;
  UploadBaseController = UploadBaseController;
}();
