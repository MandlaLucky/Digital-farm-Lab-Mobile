import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './filters';

async function bootstrap(){
  const app = await NestFactory.create(AppModule, { logger:['error','warn','log'] });
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableCors({ origin: (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3000').split(','), credentials:true });
  const port = Number(process.env.PORT || 8082);
  await app.listen(port);
  new Logger('Bootstrap').log(`Node backend listening on http://localhost:${port}`);
}
bootstrap();
