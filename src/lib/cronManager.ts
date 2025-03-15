import * as NodeCron from "node-cron";
import CronTime from "cron-time-generator";

class CronManager {
  declare timezone: string;
  declare cronTime: typeof CronTime;
  constructor() {
    this.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    this.cronTime = CronTime;
  }

  /**
   * @param {String} expression
   * @param {Function} task
   */
  schedule(expression: string, task: Function) {
    if (NodeCron.validate(expression)) {
      NodeCron.schedule(expression, () => {
        try {
          task();
        }
        catch (e) {
          console.error(`Error in cron task: ${e}`);
        }
      }, {
        timezone: this.timezone,
      });
    }
  }

  cancelAll() {
    const tasks = NodeCron.getTasks();
    tasks.forEach((task: any) => {
      task.stop();
    });
  }
}

const instance = new CronManager();
export default instance;
