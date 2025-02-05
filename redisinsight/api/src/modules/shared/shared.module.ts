import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import config from 'src/utils/config';
import { CoreModule } from 'src/modules/core/core.module';
import { DatabaseInstanceEntity } from 'src/modules/core/models/database-instance.entity';
import {
  RedisSentinelBusinessService,
} from 'src/modules/shared/services/redis-sentinel-business/redis-sentinel-business.service';
import { DatabasesProvider } from 'src/modules/shared/services/instances-business/databases.provider';
import { OverviewService } from 'src/modules/shared/services/instances-business/overview.service';
import { InstancesBusinessService } from './services/instances-business/instances-business.service';
import { RedisEnterpriseBusinessService } from './services/redis-enterprise-business/redis-enterprise-business.service';
import { RedisCloudBusinessService } from './services/redis-cloud-business/redis-cloud-business.service';
import { ConfigurationBusinessService } from './services/configuration-business/configuration-business.service';
import { InstancesAnalyticsService } from './services/instances-business/instances-analytics.service';
import {
  AutodiscoveryAnalyticsService,
} from './services/autodiscovery-analytics.service/autodiscovery-analytics.service';

const SERVER_CONFIG = config.get('server');

@Module({
  imports: [
    CoreModule.register({
      buildType: SERVER_CONFIG.buildType,
    }),
    TypeOrmModule.forFeature([DatabaseInstanceEntity]),
  ],
  providers: [
    DatabasesProvider,
    InstancesBusinessService,
    InstancesAnalyticsService,
    RedisEnterpriseBusinessService,
    RedisCloudBusinessService,
    ConfigurationBusinessService,
    OverviewService,
    RedisSentinelBusinessService,
    AutodiscoveryAnalyticsService,
  ],
  exports: [
    InstancesBusinessService,
    RedisEnterpriseBusinessService,
    RedisCloudBusinessService,
    ConfigurationBusinessService,
    RedisSentinelBusinessService,
  ],
})
export class SharedModule {}
