export interface ProcessQueueInterface {
    task: string;
    completed: boolean;
    errored: boolean;
    error: string;
    files: string[];
    timestamp: Date; 
    readonly workerId: string;
}
