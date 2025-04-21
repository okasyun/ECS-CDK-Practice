import * as ecs from "aws-cdk-lib/aws-ecs";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import { OperatingSystemFamily } from "aws-cdk-lib/aws-ecs";
import { CpuArchitecture } from "aws-cdk-lib/aws-ecs";
import { IRepository } from "aws-cdk-lib/aws-ecr";

export interface FargateBastionResourcesProps {
  readonly stage: string;
  readonly baseRepository: IRepository;
  readonly vpc: ec2.IVpc;
  readonly subnets: ec2.ISubnet[];
  readonly securityGroups: ec2.ISecurityGroup[];
}

export class FargateBastionResources extends Construct {
  constructor(
    scope: Construct,
    id: string,
    props: FargateBastionResourcesProps
  ) {
    super(scope, id);

    const { stage, baseRepository, vpc, subnets, securityGroups } = props;

    const bastionCluster = new ecs.Cluster(this, "BastionCluster", {
      clusterName: `${stage}-ecs-bastion-cluster`,
      containerInsights: true,
      vpc: vpc,
    });

   const bastionTaskRole = new iam.Role(this, "EcsTaskRole", {
     roleName: `${stage}-bastion-ecs-task-role`,
     assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
   });

   // ECS Exec 用ポリシーのみ付与
   bastionTaskRole.addToPolicy(
     new iam.PolicyStatement({
       effect: iam.Effect.ALLOW,
       actions: [
         "ssmmessages:CreateControlChannel",
         "ssmmessages:CreateDataChannel",
         "ssmmessages:OpenControlChannel",
         "ssmmessages:OpenDataChannel",
         "logs:DescribeLogGroups",
         "logs:CreateLogStream",
         "logs:DescribeLogStreams",
         "logs:PutLogEvents",
       ],
       resources: ["*"],
     })
   );


   const taskExecutionRole = new iam.Role(
     this,
     `FargateBastionTaskExecutionRole`,
     {
       assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
       roleName: `${stage}-fargate-bastion-task-execution-role`,
       managedPolicies: [
         iam.ManagedPolicy.fromAwsManagedPolicyName(
           "service-role/AmazonECSTaskExecutionRolePolicy"
         ),
       ],
     }
   );

   // ECS Exec を実行するためのポリシー
   taskExecutionRole.addToPolicy(
     new iam.PolicyStatement({
       effect: iam.Effect.ALLOW,
       actions: ["ecs:ExecuteCommand"],
       resources: [bastionCluster.clusterArn],
     })
   );

    // タスク定義を作成
    const bastionTaskDefinition = new ecs.FargateTaskDefinition(
      this,
      "BastionTaskDefinition",
      {
        family: `${stage}-bastion`,
        cpu: 256,
        memoryLimitMiB: 512,
        taskRole: bastionTaskRole,
        executionRole: taskExecutionRole,
        runtimePlatform: {
          cpuArchitecture: CpuArchitecture.X86_64,
          operatingSystemFamily: OperatingSystemFamily.LINUX,
        },
      }
    );


    bastionTaskDefinition.addContainer("BastionContainer", {
      containerName: "bastion",
      image: ecs.ContainerImage.fromEcrRepository(baseRepository, "bastion"),
      essential: true,
      memoryReservationMiB: 128,
      cpu: 256,
    });


    const bastionService = new ecs.FargateService(this, "BastionService", {
      serviceName: `${stage}-bastion-service`,
      cluster: bastionCluster,
      taskDefinition: bastionTaskDefinition,
      platformVersion: ecs.FargatePlatformVersion.VERSION1_4,
      desiredCount: 1,
      deploymentController: {
        type: ecs.DeploymentControllerType.ECS,
      },
      assignPublicIp: false,
      vpcSubnets: {
        subnets: subnets,
      },
      securityGroups: securityGroups,
      enableExecuteCommand: true,
    });
  }
}
