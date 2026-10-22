import { Queue } from 'bullmq';
import IORedis from 'ioredis';

let auditQueue: Queue | null = null;
let redisConnection: any = null;

export function getRedisConnection() {
  if (redisConnection) return redisConnection;

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  redisConnection = new (IORedis as any)(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times: number) {
      return Math.min(times * 100, 3000);
    },
  });

  return redisConnection;
}

export function getAuditQueue(): Queue {
  if (auditQueue) return auditQueue;

  const connection = getRedisConnection();
  auditQueue = new Queue('audit-queue', { connection });
  return auditQueue;
}

export async function enqueueAuditJob(jobId: string, payload: any) {
  const queue = getAuditQueue();

  // BullMQ job with deterministic ID for deduplication
  return queue.add('crawl', payload, {
    jobId: `audit:${payload.projectId}:${jobId}`,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: { age: 3600 },
    removeOnFail: { age: 86400 },
  });
}
