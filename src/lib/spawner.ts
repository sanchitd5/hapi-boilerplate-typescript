import { ChildProcess, SpawnOptions } from 'child_process';
import crossSpawn from 'cross-spawn';

export default class Spawner {
    private readonly declare options?: SpawnOptions;
    private activeProcesses: Set<ChildProcess> = new Set();

    constructor(options?: SpawnOptions) {
        this.options = options;
        process.on('exit', () => this.cleanup());
    }

    spawn(command: string, attributes?: Array<string>, options?: SpawnOptions): ChildProcess {
        const proc = crossSpawn(command, attributes, { ...this.options, ...options });
        this.activeProcesses.add(proc);

        // Setup automatic cleanup when process ends
        const cleanup = () => {
            this.activeProcesses.delete(proc);
            proc.removeAllListeners();
            if (proc.stdout) proc.stdout.removeAllListeners();
            if (proc.stderr) proc.stderr.removeAllListeners();
        };

        proc.once('exit', cleanup);
        proc.once('error', cleanup);

        // Handle potential memory leaks from streams
        if (proc.stdout) {
            proc.stdout.on('error', (err) => {
                console.error(`Stdout error: ${err}`);
                cleanup();
            });
        }
        if (proc.stderr) {
            proc.stderr.on('error', (err) => {
                console.error(`Stderr error: ${err}`);
                cleanup();
            });
        }

        return proc;
    }

    spawnSync(command: string, attributes?: Array<string>) {
        const result = crossSpawn.sync(command, attributes, this.options);
        return result;
    }

    killAll() {
        for (const proc of this.activeProcesses) {
            try {
                proc.kill();
            } catch (err) {
                console.error('Error killing process:', err);
            }
        }
        this.activeProcesses.clear();
    }

    private cleanup() {
        this.killAll();
    }
}