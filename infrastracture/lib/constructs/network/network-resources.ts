import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { EcsPracticeStackProps } from "../../ecs-practice-stack";
import { SubnetResources } from "./subnet-resources";
import {
  SecurityGroupResources,
  ISecurityGroupResources,
} from "./securitygroup-resources";
import { RouteTableResources } from "./routetable-resources";
import { InterfaceVpcEndpoint }  from "aws-cdk-lib/aws-ec2";
import { Tags } from "aws-cdk-lib";
import { ISubnetResources } from "./subnet-resources";
export class NetworkResources extends Construct {
  public readonly Vpc: ec2.IVpc;
  public readonly Subnets: ISubnetResources;
  public readonly SecurityGroups: ISecurityGroupResources;
  constructor(scope: Construct, id: string, props: EcsPracticeStackProps) {
    super(scope, id);
    const { stage } = props;

    // VPC作成
    this.Vpc = new ec2.Vpc(this, "Vpc", {
      vpcName: `${stage}-Vpc`,
      ipAddresses: ec2.IpAddresses.cidr("10.0.0.0/16"),
      subnetConfiguration: [],
      enableDnsHostnames: true,
      enableDnsSupport: true,
    });

    // サブネットの作成
    this.Subnets = new SubnetResources(this, "Subnets", {
      vpc: this.Vpc,
      stage,
    });

    // インターネットゲートウェイの作成
    const Igw = new ec2.CfnInternetGateway(this, "Igw", {
      tags: [{ key: "Name", value: `${stage}-igw` }],
    });

    new ec2.CfnVPCGatewayAttachment(this, "VpcgwAttachment", {
      vpcId: this.Vpc.vpcId,
      internetGatewayId: Igw.ref,
    });

    // セキュリティグループの作成
    this.SecurityGroups = new SecurityGroupResources(
      this,
      "SecurityGroups",
      {
        vpc: this.Vpc,
        stage,
      },
    );

    // ルートテーブルの関連付け
    const RouteTables = new RouteTableResources(this, "RouteTables", {
      vpc: this.Vpc,
      subnets: this.Subnets.subnets,
      igwId: Igw.ref,
      stage,
    });

    // ECRのインターフェース型VPCエンドポイントの作成
    const VpceEcrApi = new InterfaceVpcEndpoint(
      this,
      "VpceEcrApi",
      {
        vpc: this.Vpc,
        service: ec2.InterfaceVpcEndpointAwsService.ECR,
        subnets: {
          subnets: this.Subnets.getL2Subnets("egress", "ecr"),
        },
        securityGroups: [this.SecurityGroups.egress],
      },
    );
    Tags.of(VpceEcrApi).add("Name", `${stage}-vpce-ecr-api`);

    // DKRも作成
    const VpceDkr = new InterfaceVpcEndpoint(this, "VpceDkr", {
      vpc: this.Vpc,
      service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
      subnets: {
        subnets: this.Subnets.getL2Subnets("egress", "dkr"),
      },
    });
    Tags.of(VpceDkr).add("Name", `${stage}-vpce-dkr`);

    // S3用のゲートウェイ型VPCエンドポイントの作成
    const VpceS3 = new ec2.CfnVPCEndpoint(this, "S3GatewayEndpoint", {
      serviceName: `com.amazonaws.ap-northeast-1.s3`,
      vpcEndpointType: "Gateway",
      vpcId: this.Vpc.vpcId,
      routeTableIds: [RouteTables.RouteAppRef],
    });
    Tags.of(VpceS3).add("Name", `${stage}-vpce-s3`);

    // cloudwatch用のインターフェース型VPCエンドポイントの作成
    const VpceLogs = new InterfaceVpcEndpoint(this, "VpceLogs", {
      vpc: this.Vpc,
      service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
      subnets: {
        subnets: this.Subnets.getL2Subnets("egress", "logs"),
      },
    });
    Tags.of(VpceLogs).add("Name", `${stage}-vpce-logs`);
  }
}
