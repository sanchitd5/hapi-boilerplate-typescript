import { Model } from 'sequelize';

export interface GenericObject {
    [key: string]: any;
}

export interface FrozenObject {
    readonly [key: string]: any;
}

export type GenericServiceCallback = ((err: Error | unknown | string, data?: unknown) => void);


export class GenericError extends Error {
    readonly declare misc: GenericObject | undefined;
    constructor(message: string, misc?: GenericObject) {
        super(message);
        this.misc = misc;
    }
}

export interface InternalError {
    name: string;
}

export interface MongoError extends InternalError {
    code: number;
    errmsg: string;
}

export interface ApplicationError extends InternalError {
    message: string;
}

export type ValidationError = InternalError


export class SqlModel extends Model {
    declare createdAt: Date;
    declare updatedAt: Date;
}