import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { EcsPracticeStackProps } from "../ecs-practice-stack";
import { SubnetResources } from "./subnet-resoucrces";
import { SecurityGroups, ISecurityGroup } from "./security-groups";
import { RouteTables } from "./route-tables";
import { InterfaceVpcEndpoint } from "aws-cdk-lib/aws-ec2";
import { Tags } from "aws-cdk-lib";
import { ISubnetf } from "./subnet-resoucrces";
export class NetworkResources extends Construct {
  public readonly sbcntrVpc: ec2.IVpc;
  public readonly sbcntrSubnets: ISubnetf;
  public readonly sbcntrSecurityGroups: ISecurityGroup;
  constructor(scope: Construct, id: string, props: EcsPracticeStackProps) {
    super(scope, id);
    const { stage } = props;

    // VPC作成
    this.sbcntrVpc = new ec2.Vpc(this, "SbcntrVpc", {
      vpcName: `${stage}-sbcntrVpc`,
      ipAddresses: ec2.IpAddresses.cidr("10.0.0.0/16"),
      subnetConfiguration: [],
      enableDnsHostnames: true,
      enableDnsSupport: true,
    });

    // サブネットの作成
    this.sbcntrSubnets = new SubnetResources(this, "Subnets", {
      vpc: this.sbcntrVpc,
      stage,
    });

    // インターネットゲートウェイの作成
    const sbcntrIgw = new ec2.CfnInternetGateway(this, "SbcntrIgw", {
      tags: [{ key: "Name", value: `${stage}-sbcntr-igw` }],
    });

    new ec2.CfnVPCGatewayAttachment(this, "SbcntrVpcgwAttachment", {
      vpcId: this.sbcntrVpc.vpcId,
      internetGatewayId: sbcntrIgw.ref,
    });

    // セキュリティグループの作成
    this.sbcntrSecurityGroups = new SecurityGroups(this, "SecurityGroups", {
      vpc: this.sbcntrVpc,
      stage,
    });

    // ルートテーブルの関連付け
    const sbcntrRouteTables = new RouteTables(this, "RouteTables", {
      vpc: this.sbcntrVpc,
      subnets: this.sbcntrSubnets.subnets,
      igwId: sbcntrIgw.ref,
      stage,
    });

    // ECRのインターフェース型VPCエンドポイントの作成
    const sbcntrVpceEcrApi = new InterfaceVpcEndpoint(
      this,
      "SbcntrVpceEcrApi",
      {
        vpc: this.sbcntrVpc,
        service: ec2.InterfaceVpcEndpointAwsService.ECR,
        subnets: {
          subnets: this.sbcntrSubnets.getL2Subnets("egress"),
        },
        securityGroups: [this.sbcntrSecurityGroups.getEgressSecurityGroup()],
      }
    );
    Tags.of(sbcntrVpceEcrApi).add("Name", `${stage}-sbcntr-vpce-ecr-api`);

    // DKRも作成
    const sbcntrVpceDkr = new InterfaceVpcEndpoint(this, "SbcntrVpceDkr", {
      vpc: this.sbcntrVpc,
      service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
      subnets: {
        subnets: this.sbcntrSubnets.getL2Subnets("egress")
      },
    });
    Tags.of(sbcntrVpceDkr).add("Name", `${stage}-sbcntr-vpce-dkr`);

    // S3用のゲートウェイ型VPCエンドポイントの作成
    const sbcntrVpceS3 = new ec2.CfnVPCEndpoint(this, "S3GatewayEndpoint", {
      serviceName: `com.amazonaws.ap-northeast-1.s3`,
      vpcEndpointType: "Gateway",
      vpcId: this.sbcntrVpc.vpcId,
      routeTableIds: [sbcntrRouteTables.sbcntrRouteAppRef],
    });
    Tags.of(sbcntrVpceS3).add("Name", `${stage}-sbcntr-vpce-s3`);

    // cloudwatch用のインターフェース型VPCエンドポイントの作成
    const sbcntrVpceLogs = new InterfaceVpcEndpoint(this, "SbcntrVpceLogs", {
      vpc: this.sbcntrVpc,
      service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
      subnets: {
        subnets: this.sbcntrSubnets.getL2Subnets("egress"),
      },
    });
    Tags.of(sbcntrVpceLogs).add("Name", `${stage}-sbcntr-vpce-logs`);
  }

  
}
