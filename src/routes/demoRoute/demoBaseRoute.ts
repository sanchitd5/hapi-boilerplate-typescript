import Hapi from '@hapi/hapi';
import UniversalFunctions from "../../utils/universalFunctions";
import Joi from "joi";
import Controller from "../../controllers";

const Config = UniversalFunctions.CONFIG;

const demoApi: Hapi.ServerRoute = {
  method: "POST",
  path: "/api/demo/demoApi",
  options: {
    description: "demo api",
    tags: ["api", "demo"],
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
      failAction: UniversalFunctions.failActionFunction
    },
    plugins: {
      "hapi-swagger": {
        responseMessages:
          UniversalFunctions.CONFIG.APP_CONSTANTS.swaggerDefaultResponseMessages
      }
    }
  }
};

const DemoBaseRoute: Hapi.ServerRoute[] = [demoApi];
export default DemoBaseRoute;
