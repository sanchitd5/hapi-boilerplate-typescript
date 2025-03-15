import mongoose, { Schema } from "mongoose";
import { ProcessQueueInterface } from "../../../types/processQueue";

const processQueue = new Schema<ProcessQueueInterface>({
    task: { type: String, required: true },
    completed: { type: Boolean, default: false },
    errored: { type: Boolean, default: false },
    error: { type: String, default: "" },
    files: [{ type: String, }],
    timestamp: { type: Date, default: Date.now },
    workerId: { type: String, required: true },
});

processQueue.index({ modelName: 1 });
processQueue.index({ modelName: 1, completed: 1 });
processQueue.index({ modelName: 1, errored: 1 });
processQueue.index({ modelName: 1, completed: 1, errored: 1 });
processQueue.index({ modelName: 1, completed: 1, errored: 1, timestamp: 1 });
processQueue.index({ completed: 1, errored: 1 });
processQueue.index({ completed: 1 });
processQueue.index({ errored: 1 });

export default mongoose.model("processQueue", processQueue);
