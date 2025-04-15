import { Construct } from "constructs";
import { EcsPracticeStackProps } from "../../ecs-practice-stack";
import { CpuArchitecture, Secret } from "aws-cdk-lib/aws-ecs";
import { OperatingSystemFamily } from "aws-cdk-lib/aws-ecs";
import * as ecs from "aws-cdk-lib/aws-ecs";
import { IRepository } from "aws-cdk-lib/aws-ecr";
import * as logs from "aws-cdk-lib/aws-logs";
import { RemovalPolicy } from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { ISecret } from "aws-cdk-lib/aws-secretsmanager";
import * as secrets from "aws-cdk-lib/aws-secretsmanager";
import * as iam from "aws-cdk-lib/aws-iam";
interface FrontendEcsResourcesProps extends EcsPracticeStackProps {
  readonly stage: string;
  readonly frontendRepository: IRepository;
  readonly vpc: ec2.IVpc;
  readonly subnets: ec2.ISubnet[];
  readonly securityGroups: ec2.ISecurityGroup[];
  readonly internalALBDnsName: string;
}

interface IFrontendEcsResources {
  // IFargateServiceを使うとloadBalancerTargetが使えない
  // eslint-disable-next-line cdk/no-class-in-interface
  readonly frontendService: ecs.FargateService;
}

export class FrontendEcsResources
  extends Construct
  implements IFrontendEcsResources
{
  // eslint-disable-next-line  cdk/no-public-class-fields
  public readonly frontendService: ecs.FargateService;

  constructor(scope: Construct, id: string, props: FrontendEcsResourcesProps) {
    super(scope, id);
    const {
      stage,
      frontendRepository,
      vpc,
      subnets,
      securityGroups,
      internalALBDnsName,
    } = props;

    // タスク実行ロールを作成
    const taskExecutionRole = new iam.Role(this, "FrontendTaskExecutionRole", {
      roleName: `${stage}-frontend-task-execution-role`,
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
    });

    // SecretManagerのGetSecretValueポリシーを付与
    taskExecutionRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["secretsmanager:GetSecretValue"],
        resources: ["*"],
      })
    );

    const frontendTaskDefinition = new ecs.FargateTaskDefinition(
      this,
      "FrontendTaskDefinition",
      {
        family: `${stage}-frontend-def`,
        cpu: 512,
        memoryLimitMiB: 1024,
        executionRole: taskExecutionRole,
        runtimePlatform: {
          cpuArchitecture: CpuArchitecture.X86_64,
          operatingSystemFamily: OperatingSystemFamily.LINUX,
        },
      }
    );
    // タグを指定してイメージを取得（例: gitのcommit hashや "latest" など）
    const fronendImage = ecs.ContainerImage.fromEcrRepository(
      frontendRepository,
      "dbv1"
    );
    // const frontendImage = ecs.ContainerImage.fromEcrRepository(frontendRepository, "latest");

    const frontendLogGroup = new logs.LogGroup(this, "FrontendLogGroup", {
      logGroupName: `/ecs/${stage}-frontend-app`,
      removalPolicy: RemovalPolicy.DESTROY,
      retention: RetentionDays.TWO_WEEKS,
    });

    const auroraSecret = secrets.Secret.fromSecretNameV2(
      this,
      "AuroraEncryptedSecret",
      "mysql"
    );

    // コンテナ定義を作成
    const frontendContainerDefinition = frontendTaskDefinition.addContainer(
      "FrontendContainer",
      {
        containerName: `${stage}-app`,
        image: fronendImage,
        memoryReservationMiB: 512,
        cpu: 256,
        readonlyRootFilesystem: true,
        portMappings: [
          {
            containerPort: 80,
          },
        ],
        logging: ecs.LogDrivers.awsLogs({
          logGroup: frontendLogGroup,
          streamPrefix: `${stage}-frontend-app`,
        }),
        secrets: this.getAuroraSecret(auroraSecret),
        environment: {
          SESSION_SECRET_KEY: "41b678c65b37bf99c37bcab522802760",
          APP_SERVICE_HOST: `http://${internalALBDnsName}`,
          NOTIF_SERVICE_HOST: `http://${internalALBDnsName}`,
        },
      }
    );

    const frontendCluster = new ecs.Cluster(this, "FrontendCluster", {
      clusterName: `${stage}-ecs-frontend-cluster`,
      containerInsights: false,
      vpc: vpc,
    });

    this.frontendService = new ecs.FargateService(this, "FrontendService", {
      serviceName: `${stage}-frontend-service`,
      cluster: frontendCluster,
      taskDefinition: frontendTaskDefinition,
      platformVersion: ecs.FargatePlatformVersion.VERSION1_4,
      desiredCount: 1,
      assignPublicIp: false,
      vpcSubnets: {
        subnets: subnets,
      },
      securityGroups: securityGroups,
    });
  }

  private getAuroraSecret(secret: ISecret): Record<string, Secret> {
    return {
      DB_HOST: Secret.fromSecretsManager(secret, "host"),
      DB_USERNAME: Secret.fromSecretsManager(secret, "username"),
      DB_PASSWORD: Secret.fromSecretsManager(secret, "password"),
      DB_NAME: Secret.fromSecretsManager(secret, "dbname"),
    };
  }
}
