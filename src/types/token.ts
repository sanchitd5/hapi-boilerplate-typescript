import { ObjectId } from "mongoose";

export interface TokenInterface {
    _id: ObjectId;
    deviceType: string;
    accessToken: string;
    deviceUUID: string;
    deviceName: string;
    userId: ObjectId;
    adminId: ObjectId;
    type: string;
}