import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import { RemovalPolicy } from "aws-cdk-lib";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import * as logs from "aws-cdk-lib/aws-logs";
import * as ecs from "aws-cdk-lib/aws-ecs";
import { IRepository } from "aws-cdk-lib/aws-ecr";
export interface FirelensResourcesProps {
  readonly stage: string;
  readonly accountId: string;

  // eslint-disable-next-line  cdk/no-class-in-interface
  readonly backendTaskDefinition: ecs.TaskDefinition;
  readonly baseRepository: IRepository;
}

export class FirelensResources extends Construct {
  constructor(scope: Construct, id: string, props: FirelensResourcesProps) {
    super(scope, id);

    const { stage, accountId, backendTaskDefinition, baseRepository } = props;

    new s3.Bucket(this, "FirelensBucket", {
      bucketName: `${stage}-firelens-${accountId}`,
      publicReadAccess: false,
      removalPolicy: RemovalPolicy.DESTROY,
      encryption: s3.BucketEncryption.S3_MANAGED,
      autoDeleteObjects: true,
    });

    const logGroup = new logs.LogGroup(this, "FirelensLogGroup", {
      logGroupName: `/aws/ecs/${stage}-firelens-container`,
      retention: RetentionDays.TWO_WEEKS,
      
    });

    const image = ecs.ContainerImage.fromEcrRepository(
      baseRepository,
      "log-router"
    );

    const firelensLogRouter = new ecs.FirelensLogRouter(
      this,
      "MyFirelensLogRouter",
      {
        image,
        taskDefinition: backendTaskDefinition,
        containerName: "log-router",
        logging: ecs.LogDrivers.awsLogs({
          logGroup: logGroup,
          streamPrefix: "firelens",
        }),
        firelensConfig: {
          type: ecs.FirelensLogRouterType.FLUENTBIT,
          options: {
            configFileType: ecs.FirelensConfigFileType.FILE,
            configFileValue: "/fluent-bit/custom.conf",
          },
        },
        environment: {
          APP_ID: `${stage}-backend-def`,
          AWS_ACCOUNT_ID: accountId,
          AWS_REGION: "ap-northeast-1",
          LOG_BUCKET_NAME: `${stage}-firelens-${accountId}`,
          LOG_GROUP_NAME: `/aws/ecs/${stage}-firelens-container`,
        },
        memoryReservationMiB: 128,
        cpu: 64,
      }
    );
  }
}