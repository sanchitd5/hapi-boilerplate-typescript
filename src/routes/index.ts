import Hapi from '@hapi/hapi';
import DemoBaseRoute from "./demoRoute/demoBaseRoute";
import UserBaseRoute from "./userRoute/userBaseRoute";
import AdminBaseRoute from "./adminRoute/adminBaseRoute";
import UploadBaseRoute from "./uploadRoute/uploadBaseRoute";

const routes: Hapi.ServerRoute[] = [...DemoBaseRoute, ...UserBaseRoute, ...AdminBaseRoute, ...UploadBaseRoute]

export default routes;
