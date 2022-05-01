export interface GenericObject {
    [key: string]: any;
}

export interface FrozenObject {
    readonly [key: string]: any;
}

export class GenericError extends Error {
    readonly declare misc: GenericObject | undefined;
    constructor(message: string, misc?: GenericObject) {
        super(message);
        this.misc = misc;
    }
}
