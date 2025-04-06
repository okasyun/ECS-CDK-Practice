import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { EcsPracticeStackProps } from "../ecs-practice-stack";
import { Subnets } from "./subnets";
import { SecurityGroups } from "./security-groups";
import { RouteTables } from "./route-tables";
export class NetworkResources extends Construct {
  constructor(scope: Construct, id: string, props: EcsPracticeStackProps) {
    super(scope, id);
    const { stage } = props;

    // VPC作成
    const sbcntrVpc = new ec2.Vpc(this, "SbcntrVpc", {
      vpcName: `${stage}-sbcntr-vpc`,
      ipAddresses: ec2.IpAddresses.cidr("10.0.0.0/16"),
      subnetConfiguration: [],
      enableDnsHostnames: true,
      enableDnsSupport: true,
    });

    // サブネットの作成
    const subnets = new Subnets(this, "Subnets", {
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
      subnets: subnets.subnets,
      igwId: sbcntrIgw.ref,
      stage,
    });
  }
}
