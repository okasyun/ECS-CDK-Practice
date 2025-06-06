import { Construct } from "constructs";
import { EcsPracticeStackProps } from "../../ecs-practice-stack";
import { IRepository } from "aws-cdk-lib/aws-ecr";
import * as ecs from "aws-cdk-lib/aws-ecs";
import { CpuArchitecture, OperatingSystemFamily, Secret } from "aws-cdk-lib/aws-ecs";
import { RemovalPolicy } from "aws-cdk-lib";
import * as logs from "aws-cdk-lib/aws-logs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import {
  DnsRecordType,
  PrivateDnsNamespace,
} from "aws-cdk-lib/aws-servicediscovery";
import { Duration } from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as secrets from "aws-cdk-lib/aws-secretsmanager";
import { ISecret } from "aws-cdk-lib/aws-secretsmanager";
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
  // eslint-disable-next-line  cdk/no-public-class-fields
  public readonly backendTaskDefinition: ecs.TaskDefinition;
  constructor(scope: Construct, id: string, props: BackendEcsResourcesProps) {
    super(scope, id);
    const { stage, backendRepository, vpc, subnets, securityGroups } = props;

    // タスク実行ロールを作成
    const taskExecutionRole = new iam.Role(this, "BackendTaskExecutionRole", {
      roleName: `${stage}-backend-task-execution-role`,
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
    });

    // SecretManagerのGetSecretValueポリシーを付与
    taskExecutionRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["secretsmanager:GetSecretValue"],
        resources: ["*"],
      })
    );

    const taskRole = iam.Role.fromRoleName(
      this,
      "TaskRole",
      `${stage}-ecsTaskRole`
    );

    // タスク定義を作成
    this.backendTaskDefinition = new ecs.FargateTaskDefinition(
      this,
      "BackendTaskDefinition",
      {
        family: `${stage}-backend-def`,
        cpu: 512,
        memoryLimitMiB: 1024,
        executionRole: taskExecutionRole,
        taskRole: taskRole,
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

    // secret managerのarnを取得
    const auroraSecret = secrets.Secret.fromSecretNameV2(
      this,
      "AuroraEncryptedSecret",
      "mysql"
    );

    // コンテナ定義を作成
    const backendContainerDefinition = this.backendTaskDefinition.addContainer(
      "BackendContainer",
      {
        containerName: `app`,
        image: backendImage,
        memoryReservationMiB: 512,
        cpu: 256,
        readonlyRootFilesystem: true,
        portMappings: [
          {
            containerPort: 80,
          },
        ],
        logging: ecs.LogDrivers.firelens({
          options: {},
        }),
        secrets: this.getAuroraSecret(auroraSecret),
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
      taskDefinition: this.backendTaskDefinition,
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

    const autoscale = this.backendService.autoScaleTaskCount({
      minCapacity: 2,
      maxCapacity: 4,
    });

    autoscale.scaleOnCpuUtilization("CpuScaling", {
      targetUtilizationPercent: 80,
      policyName: "ecs-scalingPolicy",
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
