import { Injectable } from '@nestjs/common';

export type HealthResponse = {
  status: 'ok';
  service: 'finance-ledger-api';
  uptimeSeconds: number;
  timestamp: string;
};

@Injectable()
export class AppService {
  getHealth(): HealthResponse {
    return {
      status: 'ok',
      service: 'finance-ledger-api',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
