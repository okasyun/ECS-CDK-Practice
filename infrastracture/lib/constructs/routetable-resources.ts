import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";
import { EcsPracticeStackProps } from "../ecs-practice-stack";
import { CfnSubnet } from "aws-cdk-lib/aws-ec2";

interface RouteTableResourcesProps extends EcsPracticeStackProps {
  readonly vpc: ec2.IVpc;
  readonly subnets: Record<string, CfnSubnet[]>;
  readonly igwId: string;
  readonly stage: string;
}

export class RouteTableResources extends Construct {
  public readonly sbcntrRouteAppRef: string;

  constructor(scope: Construct, id: string, props: RouteTableResourcesProps) {
    super(scope, id);

    const vpc = props.vpc;
    const subnets = props.subnets;
    const igwId = props.igwId;

    // アプリ用のルートテーブルの作成
    const sbcntrRouteApp = new ec2.CfnRouteTable(this, "SbcntrRouteApp", {
      vpcId: vpc.vpcId,
      tags: [
        {
          key: "Name",
          value: `${props.stage}-sbcntr-route-app`,
        },
      ],
    });
    this.sbcntrRouteAppRef = sbcntrRouteApp.ref;

    // アプリ用のサブネットのルートテーブル関連付け
    new ec2.CfnSubnetRouteTableAssociation(
      this,
      "SbcntrRouteAppAssociation1A",
      {
        routeTableId: this.sbcntrRouteAppRef,
        subnetId: subnets.container[0].ref,
      },
    );

    new ec2.CfnSubnetRouteTableAssociation(
      this,
      "SbcntrRouteAppAssociation1C",
      {
        routeTableId: this.sbcntrRouteAppRef,
        subnetId: subnets.container[1].ref,
      },
    );

    // データベース用のルートテーブルの作成
    const sbcntrRouteDb = new ec2.CfnRouteTable(this, "SbcntrRouteDb", {
      vpcId: vpc.vpcId,
      tags: [
        {
          key: "Name",
          value: `${props.stage}-sbcntr-route-db`,
        },
      ],
    });

    // データベース用のサブネットのルートテーブル関連付け
    new ec2.CfnSubnetRouteTableAssociation(this, "SbcntrRouteDbAssociation1A", {
      routeTableId: sbcntrRouteDb.ref,
      subnetId: subnets.db[0].ref,
    });

    new ec2.CfnSubnetRouteTableAssociation(this, "SbcntrRouteDbAssociation1C", {
      routeTableId: sbcntrRouteDb.ref,
      subnetId: subnets.db[1].ref,
    });

    // Ingress用のルートテーブルの作成
    const sbcntrRouteIngress = new ec2.CfnRouteTable(
      this,
      "SbcntrRouteIngress",
      {
        vpcId: vpc.vpcId,
        tags: [
          {
            key: "Name",
            value: `${props.stage}-sbcntr-route-ingress`,
          },
        ],
      },
    );

    // Ingress用のサブネットのルートテーブル関連付け
    new ec2.CfnSubnetRouteTableAssociation(
      this,
      "SbcntrRouteIngressAssociation1A",
      {
        routeTableId: sbcntrRouteIngress.ref,
        subnetId: subnets.ingress[0].ref,
      },
    );

    new ec2.CfnSubnetRouteTableAssociation(
      this,
      "SbcntrRouteIngressAssociation1C",
      {
        routeTableId: sbcntrRouteIngress.ref,
        subnetId: subnets.ingress[1].ref,
      },
    );

    // 管理用サーバー用のルートテーブル関連付け
    new ec2.CfnSubnetRouteTableAssociation(
      this,
      "SbcntrRouteManagementAssociation1A",
      {
        routeTableId: sbcntrRouteIngress.ref,
        subnetId: subnets.management[0].ref,
      },
    );

    new ec2.CfnSubnetRouteTableAssociation(
      this,
      "SbcntrRouteManagementAssociation1C",
      {
        routeTableId: sbcntrRouteIngress.ref,
        subnetId: subnets.management[1].ref,
      },
    );

    // インターネット接続用のデフォルトルートを作成
    new ec2.CfnRoute(this, "SbcntrRouteIngressDefault", {
      routeTableId: sbcntrRouteIngress.ref,
      destinationCidrBlock: "0.0.0.0/0",
      gatewayId: igwId,
    });
  }
}
