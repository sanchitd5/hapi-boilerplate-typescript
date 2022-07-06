import Hapi from '@hapi/hapi';
import UniversalFunctions from "../../utils/universalFunctions";
import Joi from "joi";
import Controller from "../../controllers";
import { createRoute } from '../../utils';
import { AuthType } from '../../definations';

const Config = UniversalFunctions.CONFIG;

const demoRoute = createRoute({
  method: "POST",
  path: "/api/demo/demoApi",
  description: "demo api",
  auth: AuthType.NONE,
  handler: (request) => {
    return new Promise((resolve, reject) => {
      Controller.DemoBaseController.demoFunction(request.payload, (err: Error, data: any) => {
        if (err) return reject(UniversalFunctions.sendError(err));
        resolve(
          UniversalFunctions.sendSuccess(
            Config.APP_CONSTANTS.STATUS_MSG.SUCCESS.DEFAULT,
            data
          )
        );
      });
    });
  },
  validate: {
    payload: Joi.object({
      message: Joi.string().required()
    }).label("Demo Model"),
  }
});

const DemoBaseRoute: Hapi.ServerRoute[] = [demoRoute];
export default DemoBaseRoute;
