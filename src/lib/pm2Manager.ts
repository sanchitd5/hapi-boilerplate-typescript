import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';

const execAsync = promisify(exec);

/**
 * PM2 Process Manager
 * Provides utilities for managing PM2 processes with advanced features
 */
class PM2Manager {
  private static readonly LOG_DIR = path.join(process.cwd(), 'logs');
  private static readonly APP_NAME = 'HapiBaseSetup';
  private static readonly DEV_APP_NAME = 'HapiBaseSetup-dev';

  /**
   * Ensure log directory exists
   */
  private static async ensureLogDir(): Promise<void> {
    await fs.ensureDir(this.LOG_DIR);
  }

  /**
   * Start the application with PM2
   * @param mode 'prod' or 'dev'
   */
  static async start(mode: 'prod' | 'dev' = 'prod'): Promise<void> {
    await this.ensureLogDir();

    const appName = mode === 'prod' ? this.APP_NAME : this.DEV_APP_NAME;
    console.info(`Starting ${appName} with PM2...`);

    try {
      // Check if app is already running
      const list = await this.list();
      if (list.some(app => app.name === appName && app.status === 'online')) {
        console.info(`${appName} is already running`);
        return;
      }

      if (mode === 'prod') {
        await execAsync('pm2 start ecosystem.config.js --only hapi-base-setup');
      } else {
        await execAsync('pm2 start ecosystem.config.js --only hapi-base-setup-dev');
      }
      
      console.info(`${appName} started successfully`);
    } catch (error) {
      console.error('Failed to start PM2 process:', error);
      throw error;
    }
  }

  /**
   * Stop the application
   * @param mode 'prod' or 'dev'
   */
  static async stop(mode: 'prod' | 'dev' = 'prod'): Promise<void> {
    const appName = mode === 'prod' ? this.APP_NAME : this.DEV_APP_NAME;
    console.info(`Stopping ${appName}...`);

    try {
      await execAsync(`pm2 stop ${appName}`);
      console.info(`${appName} stopped successfully`);
    } catch (error) {
      console.error('Failed to stop PM2 process:', error);
      throw error;
    }
  }

  /**
   * Restart the application
   * @param mode 'prod' or 'dev'
   */
  static async restart(mode: 'prod' | 'dev' = 'prod'): Promise<void> {
    const appName = mode === 'prod' ? this.APP_NAME : this.DEV_APP_NAME;
    console.info(`Restarting ${appName}...`);

    try {
      await execAsync(`pm2 restart ${appName}`);
      console.info(`${appName} restarted successfully`);
    } catch (error) {
      console.error('Failed to restart PM2 process:', error);
      throw error;
    }
  }

  /**
   * Delete the application from PM2
   * @param mode 'prod' or 'dev'
   */
  static async delete(mode: 'prod' | 'dev' = 'prod'): Promise<void> {
    const appName = mode === 'prod' ? this.APP_NAME : this.DEV_APP_NAME;
    console.info(`Deleting ${appName} from PM2...`);

    try {
      await execAsync(`pm2 delete ${appName}`);
      console.info(`${appName} deleted successfully`);
    } catch (error) {
      console.error('Failed to delete PM2 process:', error);
      throw error;
    }
  }

  /**
   * Get logs for the application
   * @param mode 'prod' or 'dev'
   * @param lines Number of lines to show
   */
  static async logs(mode: 'prod' | 'dev' = 'prod', lines: number = 100): Promise<string> {
    const appName = mode === 'prod' ? this.APP_NAME : this.DEV_APP_NAME;
    
    try {
      const { stdout } = await execAsync(`pm2 logs ${appName} --lines ${lines} --nostream`);
      return stdout;
    } catch (error) {
      console.error('Failed to get PM2 logs:', error);
      throw error;
    }
  }

  /**
   * Show real-time monitoring (this will spawn a new process)
   */
  static monitor(): void {
    console.info('Starting PM2 monitoring...');
    spawn('pm2', ['monit'], { stdio: 'inherit' });
  }

  /**
   * List all PM2 processes
   * @returns Array of process info
   */
  static async list(): Promise<Array<{name: string, id: number, status: string, memory: string, cpu: string}>> {
    try {
      const { stdout } = await execAsync('pm2 jlist');
      const processes = JSON.parse(stdout);
      
      return processes.map((proc: any) => ({
        name: proc.name,
        id: proc.pm_id,
        status: proc.pm2_env.status,
        memory: this.formatBytes(proc.monit.memory),
        cpu: `${proc.monit.cpu}%`
      }));
    } catch (error) {
      console.error('Failed to list PM2 processes:', error);
      return [];
    }
  }

  /**
   * Get memory usage of the PM2 process
   * @param mode 'prod' or 'dev'
   * @returns Memory usage info
   */
  static async getMemoryUsage(mode: 'prod' | 'dev' = 'prod'): Promise<{
    used: string,
    limit: string,
    percentage: string
  }> {
    const appName = mode === 'prod' ? this.APP_NAME : this.DEV_APP_NAME;
    
    try {
      const { stdout } = await execAsync('pm2 jlist');
      const processes = JSON.parse(stdout);
      const process = processes.find((p: any) => p.name === appName);
      
      if (!process) {
        throw new Error(`Process ${appName} not found`);
      }
      
      const memoryUsed = process.monit.memory;
      const memoryLimit = 4 * 1024 * 1024 * 1024; // 4GB in bytes
      const percentage = ((memoryUsed / memoryLimit) * 100).toFixed(2);
      
      return {
        used: this.formatBytes(memoryUsed),
        limit: this.formatBytes(memoryLimit),
        percentage: `${percentage}%`
      };
    } catch (error) {
      console.error('Failed to get memory usage:', error);
      throw error;
    }
  }

  /**
   * Get system status
   * @returns System status info
   */
  static async getSystemStatus(): Promise<{
    cpu: string,
    memory: {
      total: string,
      free: string,
      used: string,
      percentage: string
    },
    uptime: string
  }> {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const percentage = ((usedMem / totalMem) * 100).toFixed(2);
    
    // Calculate CPU usage
    const cpus = os.cpus();
    const cpuCount = cpus.length;
    
    try {
      const { stdout } = await execAsync("ps -eo pcpu,pid,user,args | sort -r -k1 | grep -v PID | head -1");
      const topCpuProcess = stdout.trim();
      
      return {
        cpu: `Cores: ${cpuCount}, Top process: ${topCpuProcess}`,
        memory: {
          total: this.formatBytes(totalMem),
          free: this.formatBytes(freeMem),
          used: this.formatBytes(usedMem),
          percentage: `${percentage}%`
        },
        uptime: this.formatUptime(os.uptime())
      };
    } catch (error) {
      console.error('Failed to get system status:', error);
      return {
        cpu: `Cores: ${cpuCount}`,
        memory: {
          total: this.formatBytes(totalMem),
          free: this.formatBytes(freeMem),
          used: this.formatBytes(usedMem),
          percentage: `${percentage}%`
        },
        uptime: this.formatUptime(os.uptime())
      };
    }
  }

  /**
   * Save PM2 process list to resurrect later
   */
  static async save(): Promise<void> {
    try {
      await execAsync('pm2 save');
      console.info('PM2 process list saved successfully');
    } catch (error) {
      console.error('Failed to save PM2 process list:', error);
      throw error;
    }
  }

  /**
   * Graceful shutdown of application
   * Properly closes application with time for cleanup
   */
  static async gracefulShutdown(mode: 'prod' | 'dev' = 'prod'): Promise<void> {
    const appName = mode === 'prod' ? this.APP_NAME : this.DEV_APP_NAME;
    console.info(`Gracefully shutting down ${appName}...`);
    
    try {
      // Send SIGINT signal to allow for graceful cleanup
      await execAsync(`pm2 stop ${appName} --kill-timeout 5000`);
      console.info(`${appName} shut down successfully`);
    } catch (error) {
      console.error('Failed to gracefully shut down PM2 process:', error);
      throw error;
    }
  }

  /**
   * Startup script to ensure PM2 processes start on system boot
   */
  static async setupStartup(): Promise<void> {
    try {
      await execAsync('pm2 startup');
      await this.save();
      console.info('PM2 startup configuration saved');
    } catch (error) {
      console.error('Failed to setup PM2 startup:', error);
      throw error;
    }
  }

  /**
   * Format bytes to human readable format
   */
  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Format uptime to human readable format
   */
  private static formatUptime(seconds: number): string {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    let result = '';
    if (days > 0) result += `${days}d `;
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0) result += `${minutes}m `;
    result += `${secs}s`;
    
    return result;
  }
}

export default PM2Manager;