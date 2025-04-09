import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { EcsPracticeStackProps } from "../ecs-practice-stack";
import { Subnets } from "./subnets";
import { SecurityGroups } from "./security-groups";
import { RouteTables } from "./route-tables";
import { InterfaceVpcEndpoint } from "aws-cdk-lib/aws-ec2";
import { Tags } from "aws-cdk-lib";
export class NetworkResources extends Construct {
  constructor(scope: Construct, id: string, props: EcsPracticeStackProps) {
    super(scope, id);
    const { stage } = props;

    // VPC作成
    const sbcntrVpc = new ec2.Vpc(this, "SbcntrVpc", {
      vpcName: `${stage}-sbcntrVpc`,
      ipAddresses: ec2.IpAddresses.cidr("10.0.0.0/16"),
      subnetConfiguration: [],
      enableDnsHostnames: true,
      enableDnsSupport: true,
    });

    // サブネットの作成
    const sbcntrSubnets = new Subnets(this, "Subnets", {
      vpc: sbcntrVpc,
      stage,
    });

    // インターネットゲートウェイの作成
    const sbcntrIgw = new ec2.CfnInternetGateway(this, "SbcntrIgw", {
      tags: [{ key: "Name", value: `${stage}-sbcntr-igw` }],
    });

    new ec2.CfnVPCGatewayAttachment(this, "SbcntrVpcgwAttachment", {
      vpcId: sbcntrVpc.vpcId,
      internetGatewayId: sbcntrIgw.ref,
    });

    // セキュリティグループの作成
    const sbcntrSecurityGroups = new SecurityGroups(this, "SecurityGroups", {
      vpc: sbcntrVpc,
      stage,
    });

    // ルートテーブルの関連付け
    const sbcntrRouteTables = new RouteTables(this, "RouteTables", {
      vpc: sbcntrVpc,
      subnets: sbcntrSubnets.subnets,
      igwId: sbcntrIgw.ref,
      stage,
    });

    // ECRのインターフェース型VPCエンドポイントの作成
    const sbcntrVpceEcrApi = new InterfaceVpcEndpoint(
      this,
      "SbcntrVpceEcrApi",
      {
        vpc: sbcntrVpc,
        service: ec2.InterfaceVpcEndpointAwsService.ECR,
        subnets: {
          subnets: sbcntrSubnets.subnets.egress.map((subnet, index) =>
            ec2.Subnet.fromSubnetId(
              this,
              `subnet-egress-${index}-for-vpce-ecr-api`,
              subnet.ref,
            ),
          ),
        },
        securityGroups: [sbcntrSecurityGroups.getEgressSecurityGroup()],
      },
    );
    Tags.of(sbcntrVpceEcrApi).add("Name", `${stage}-sbcntr-vpce-ecr-api`);

    // DKRも作成
    const sbcntrVpceDkr = new InterfaceVpcEndpoint(this, "SbcntrVpceDkr", {
      vpc: sbcntrVpc,
      service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
      subnets: {
        subnets: sbcntrSubnets.subnets.egress.map((subnet, index) =>
          ec2.Subnet.fromSubnetId(
            this,
            `subnet-egress-${index}-for-vpce-dkr`,
            subnet.ref,
          ),
        ),
      },
    });
    Tags.of(sbcntrVpceDkr).add("Name", `${stage}-sbcntr-vpce-dkr`);
    // S3用のゲートウェイ型VPCエンドポイントの作成
  }
}
