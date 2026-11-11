import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { User, Farm, Field, Scenario, ScenarioRun, SensorReading, Exercise, Submission } from './entities';
import { RunService, CohortReportService } from './services';
import { JwtAuthGuard, RolesGuard } from './auth';
import { WorkspaceController, DemoController } from './controllers';
import { ExerciseController, TrainerController, FieldController } from './controllers2';
import { WorkspaceExtraController, ExerciseExtraController, TrainerExtraController, FieldExtraController } from './controllers3';
import { HealthController } from './health';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal:true }),
    TypeOrmModule.forRootAsync({
      inject:[ConfigService],
      useFactory:(c:ConfigService) => ({
        type:'postgres',
        url: c.get<string>('DATABASE_URL'),
        entities:[User,Farm,Field,Scenario,ScenarioRun,SensorReading,Exercise,Submission],
        synchronize:false,
        logging:false,
      }),
    }),
    TypeOrmModule.forFeature([User,Farm,Field,Scenario,ScenarioRun,SensorReading,Exercise,Submission]),
    JwtModule.registerAsync({
      inject:[ConfigService],
      useFactory:(c:ConfigService) => ({ secret: c.get<string>('JWT_SECRET'), signOptions:{ algorithm:'HS256' } }),
    }),
  ],
  controllers:[HealthController, WorkspaceController, DemoController, ExerciseController, TrainerController, FieldController, WorkspaceExtraController, ExerciseExtraController, TrainerExtraController, FieldExtraController],
  providers:[
    RunService, CohortReportService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}

