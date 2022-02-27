import mongoose, { Schema } from "mongoose";
import universalFunctions from "../utils/universalFunctions"

const forgetPasswordRequests = new Schema({
    customerID: { type: Schema.Types.ObjectId, ref: 'users' },
    userType: {
        type: String,
        enum: [
            universalFunctions.CONFIG.APP_CONSTANTS.DATABASE.USER_ROLES.USER
        ],
        required: true
    },
    isChanged: { type: Boolean, default: false },
    requestedAt: { type: Date },
    changedAt: { type: Date }
});

export default mongoose.model('forgetPasswordRequests', forgetPasswordRequests);