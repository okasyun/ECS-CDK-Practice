import { Construct } from "constructs";
import { EcsPracticeStackProps } from "../../ecs-practice-stack";
import { CpuArchitecture } from "aws-cdk-lib/aws-ecs";
import { OperatingSystemFamily } from "aws-cdk-lib/aws-ecs";
import * as ecs from "aws-cdk-lib/aws-ecs";
import { IRepository } from "aws-cdk-lib/aws-ecr";
import * as logs from "aws-cdk-lib/aws-logs";
import { RemovalPolicy } from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { RetentionDays } from "aws-cdk-lib/aws-logs";

interface FrontendEcsResourcesProps extends EcsPracticeStackProps {
  readonly stage: string;
  readonly frontendRepository: IRepository,
  readonly vpc: ec2.IVpc,
  readonly subnets: ec2.ISubnet[],
  readonly securityGroups: ec2.ISecurityGroup[],
  readonly internalALBDnsName: string,
}

interface IFrontendEcsResources {
  // IFargateServiceを使うとloadBalancerTargetが使えない
  // eslint-disable-next-line cdk/no-class-in-interface
  readonly frontendService: ecs.FargateService;
}

export class FrontendEcsResources extends Construct implements IFrontendEcsResources {
  // eslint-disable-next-line  cdk/no-public-class-fields
  public readonly frontendService: ecs.FargateService;

  constructor(scope: Construct, id: string, props: FrontendEcsResourcesProps) {
    super(scope, id);
    const { stage, frontendRepository, vpc, subnets, securityGroups, internalALBDnsName } = props;

    const frontendTaskDefinition = new ecs.FargateTaskDefinition(
      this,
      "FrontendTaskDefinition",
      {
        family: `${stage}-frontend-def`,
        cpu: 512,
        memoryLimitMiB: 1024,
        runtimePlatform: {
          cpuArchitecture: CpuArchitecture.X86_64,
          operatingSystemFamily: OperatingSystemFamily.LINUX,
        },
      }
    );
    // タグを指定してイメージを取得（例: gitのcommit hashや "latest" など）
    const fronendImage = ecs.ContainerImage.fromEcrRepository(
      frontendRepository,
      "v1"
    );
    // const frontendImage = ecs.ContainerImage.fromEcrRepository(frontendRepository, "latest");

    const frontendLogGroup = new logs.LogGroup(this, "FrontendLogGroup", {
      logGroupName: `/ecs/${stage}-frontend-app`,
      removalPolicy: RemovalPolicy.DESTROY,
      retention: RetentionDays.TWO_WEEKS,
    });

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
      deploymentController: {
        type: ecs.DeploymentControllerType.CODE_DEPLOY,
      },
      assignPublicIp: false,
      vpcSubnets: {
        subnets: subnets,
      },
      securityGroups: securityGroups,
    });
  }
}

