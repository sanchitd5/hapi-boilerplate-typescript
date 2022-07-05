import { CastError } from "mongoose";
import { ApplicationError, FrozenResponseMessage, GenericObject, MongoError, ValidationError } from "../definations";

class DataTypeConverters {
    convertToObjectArray = (data: unknown): data is Array<GenericObject> => !!data && !!(data as Array<unknown>).length;
    convertToUnknownArray = (data: unknown): data is Array<unknown> => !!data && !!(data as Array<unknown>).length;
    convertToObject = (data: unknown): data is GenericObject => !!data;
    convertToUnknown = (data: unknown): data is unknown => !!data;
    convertToError = (error: unknown): error is Error => !!error;
    convertToFrozenResponseMessage = (error: unknown): error is FrozenResponseMessage => !!error;
    isMongoError = (error: GenericObject): error is MongoError => error.name === 'MongoError';
    isApplicationError = (error: GenericObject): error is ApplicationError => error.name === 'ApplicationError';
    isValidationError = (error: GenericObject): error is ValidationError => error.name === 'ValidationError';
    isCastError = (error: GenericObject): error is CastError => error.name === 'CastError';
}

export default new DataTypeConverters();