import { Construct } from "constructs";
import { EcsPracticeStackProps } from "../../ecs-practice-stack";
import { IRepository } from "aws-cdk-lib/aws-ecr";
import * as ecs from "aws-cdk-lib/aws-ecs";
import { CpuArchitecture, OperatingSystemFamily } from "aws-cdk-lib/aws-ecs";
import { RemovalPolicy } from "aws-cdk-lib";
import * as logs from "aws-cdk-lib/aws-logs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import {
  DnsRecordType,
  PrivateDnsNamespace,
} from "aws-cdk-lib/aws-servicediscovery";
import { Duration } from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
interface BackendEcsResourcesProps extends EcsPracticeStackProps {
  readonly stage: string;
  readonly backendRepository: IRepository;
  readonly subnets: ec2.ISubnet[];
  readonly securityGroups: ec2.ISecurityGroup[];
  readonly vpc: ec2.IVpc;
}

interface IEcsResources {
  // IFargateServiceを使うとloadBalancerTargetが使えない
  // eslint-disable-next-line cdk/no-class-in-interface
  readonly backendService: ecs.FargateService;
}

export class BackendEcsResources extends Construct implements IEcsResources {
  // eslint-disable-next-line  cdk/no-public-class-fields
  public readonly backendService: ecs.FargateService;

  constructor(scope: Construct, id: string, props: BackendEcsResourcesProps) {
    super(scope, id);
    const { stage, backendRepository, vpc, subnets, securityGroups } = props;

    // タスク実行ロールを作成
    const taskExecutionRole = new iam.Role(this, "TaskExecutionRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
    });

    // SecretManagerのGetSecretValueポリシーを付与
    taskExecutionRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["secretsmanager:GetSecretValue"],
        resources: ["*"]
      })
    );

    // タスク定義を作成
    const backendTaskDefinition = new ecs.FargateTaskDefinition(
      this,
      "BackendTaskDefinition",
      {
        family: `${stage}-backend-def`,
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
    const backendImage = ecs.ContainerImage.fromEcrRepository(
      backendRepository,
      "v1"
    );
    // const frontendImage = ecs.ContainerImage.fromEcrRepository(frontendRepository, "latest");

    const backendLogGroup = new logs.LogGroup(this, "BackEndLogGroup", {
      logGroupName: `/ecs/${stage}-app`,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // コンテナ定義を作成
    const backendContainerDefinition = backendTaskDefinition.addContainer(
      "BackendContainer",
      {
        containerName: `${stage}-app`,
        image: backendImage,
        memoryReservationMiB: 512,
        cpu: 256,
        readonlyRootFilesystem: true,
        portMappings: [
          {
            containerPort: 80,
          },
        ],
        logging: ecs.LogDrivers.awsLogs({
          logGroup: backendLogGroup,
          streamPrefix: `${stage}-app`,
        }),
      }
    );

    const backendCluster = new ecs.Cluster(this, "BackendCluster", {
      clusterName: `${stage}-ecs-backend-cluster`,
      containerInsights: true,
      vpc: vpc,
    });

    const dnsNamespace = new PrivateDnsNamespace(this, "ServiceDiscovery", {
      name: "local",
      vpc: vpc,
    });

    this.backendService = new ecs.FargateService(this, "BackendService", {
      serviceName: `${stage}-backend-service`,
      cluster: backendCluster,
      taskDefinition: backendTaskDefinition,
      platformVersion: ecs.FargatePlatformVersion.VERSION1_4,
      desiredCount: 2,
      cloudMapOptions: {
        name: `${stage}-ecs-backend-service`,
        cloudMapNamespace: dnsNamespace,
        dnsRecordType: DnsRecordType.A,
        dnsTtl: Duration.seconds(60),
      },
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
