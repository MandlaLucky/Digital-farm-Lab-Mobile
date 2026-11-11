import { Controller, Get } from '@nestjs/common';
import { Public } from './auth';
@Controller() export class HealthController {
  @Public() @Get('actuator/health') health(){ return { status:'UP' }; }
  @Public() @Get() root(){ return { service:'digital-farm-lab-backend-node', status:'ok' }; }
}
