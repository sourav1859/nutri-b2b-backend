import { db } from "./database";
import { ingestionJobs } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import type { IngestionJob } from "@shared/schema";

export interface QueueJob {
  id: string;
  vendorId: string;
  mode: string;
  params: any;
  attempt: number;
}

export class PostgresQueue {
  private running = false;
  private concurrency = 5;
  private workers: Array<Promise<void>> = [];

  async enqueue(vendorId: string, mode: string, params: any = {}): Promise<string> {
    const result = await db.insert(ingestionJobs).values({
      vendorId,
      mode: mode as any,
      status: 'queued',
      params,
      attempt: 1
    }).returning();

    return result[0].id;
  }

  async dequeue(vendorId?: string): Promise<QueueJob | null> {
    try {
      // Use SELECT ... FOR UPDATE SKIP LOCKED pattern for concurrent workers
      const result = await db.execute(sql`
        UPDATE ingestion_jobs 
        SET status = 'running', started_at = NOW()
        WHERE id = (
          SELECT id FROM ingestion_jobs 
          WHERE status = 'queued' 
          ${vendorId ? sql`AND vendor_id = ${vendorId}` : sql``}
          ORDER BY created_at
          FOR UPDATE SKIP LOCKED
          LIMIT 1
        )
        RETURNING id, vendor_id, mode, params, attempt
      `);

      if (!result.rows || result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0] as any;
      return {
        id: row.id,
        vendorId: row.vendor_id,
        mode: row.mode,
        params: row.params || {},
        attempt: row.attempt
      };
    } catch (error) {
      console.error('Failed to dequeue job:', error);
      return null;
    }
  }

  async markCompleted(jobId: string, result?: any): Promise<void> {
    await db.update(ingestionJobs)
      .set({
        status: 'completed',
        finishedAt: sql`now()`,
        progressPct: 100,
        ...(result ? { totals: result } : {})
      })
      .where(eq(ingestionJobs.id, jobId));
  }

  async markFailed(jobId: string, error: string, shouldRetry = false): Promise<void> {
    if (shouldRetry) {
      // Exponential backoff retry
      await db.execute(sql`
        UPDATE ingestion_jobs 
        SET status = 'queued', 
            attempt = attempt + 1,
            started_at = NULL
        WHERE id = ${jobId} AND attempt < 3
      `);
    } else {
      await db.update(ingestionJobs)
        .set({
          status: 'failed',
          finishedAt: sql`now()`,
          errorUrl: error // In production, this would be a URL to error details
        })
        .where(eq(ingestionJobs.id, jobId));
    }
  }

  async updateProgress(jobId: string, progressPct: number, totals?: any): Promise<void> {
    await db.update(ingestionJobs)
      .set({
        progressPct,
        ...(totals ? { totals } : {})
      })
      .where(eq(ingestionJobs.id, jobId));
  }

  async start(processor: (job: QueueJob) => Promise<void>): Promise<void> {
    if (this.running) return;
    
    this.running = true;
    
    // Start multiple workers
    for (let i = 0; i < this.concurrency; i++) {
      this.workers.push(this.worker(processor));
    }

    console.log(`Queue started with ${this.concurrency} workers`);
  }

  async stop(): Promise<void> {
    this.running = false;
    await Promise.all(this.workers);
    this.workers = [];
    console.log('Queue stopped');
  }

  private async worker(processor: (job: QueueJob) => Promise<void>): Promise<void> {
    while (this.running) {
      try {
        const job = await this.dequeue();
        
        if (!job) {
          // No jobs available, wait before polling again
          await this.sleep(1000);
          continue;
        }

        console.log(`Processing job ${job.id} (attempt ${job.attempt})`);
        
        try {
          await processor(job);
          await this.markCompleted(job.id);
          console.log(`Job ${job.id} completed successfully`);
        } catch (error) {
          console.error(`Job ${job.id} failed:`, error);
          const shouldRetry = job.attempt < 3;
          await this.markFailed(job.id, (error as Error).message, shouldRetry);
        }
      } catch (error) {
        console.error('Worker error:', error);
        await this.sleep(5000); // Wait longer on worker errors
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const queue = new PostgresQueue();
