import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";
import { EcsPracticeStackProps } from "../ecs-practice-stack";
import { CfnSubnet } from "aws-cdk-lib/aws-ec2";

interface RouteTableProps extends EcsPracticeStackProps {
  readonly vpc: ec2.IVpc;
  readonly subnets: Record<string, CfnSubnet[]>;
  readonly igwId: string;
  readonly stage: string;
}

export class RouteTables extends Construct {
  readonly vpc: ec2.IVpc;
  readonly subnets: Record<string, CfnSubnet[]>;
  readonly igwId: string;

  constructor(scope: Construct, id: string, props: RouteTableProps) {
    super(scope, id);

    this.vpc = props.vpc;
    this.subnets = props.subnets;
    this.igwId = props.igwId;

    // アプリ用のルートテーブルの作成
    const sbcntrRouteApp = new ec2.CfnRouteTable(this, "SbcntrRouteApp", {
      vpcId: this.vpc.vpcId,
      tags: [
        {
          key: "Name",
          value: `${props.stage}-sbcntr-route-app`,
        },
      ],
    });

    // アプリ用のサブネットのルートテーブル関連付け
    new ec2.CfnSubnetRouteTableAssociation(
      this,
      "SbcntrRouteAppAssociation1A",
      {
        routeTableId: sbcntrRouteApp.ref,
        subnetId: this.subnets.container[0].ref,
      }
    );

    new ec2.CfnSubnetRouteTableAssociation(
      this,
      "SbcntrRouteAppAssociation1C",
      {
        routeTableId: sbcntrRouteApp.ref,
        subnetId: this.subnets.container[1].ref,
      }
    );

    // データベース用のルートテーブルの作成
    const sbcntrRouteDb = new ec2.CfnRouteTable(this, "SbcntrRouteDb", {
      vpcId: this.vpc.vpcId,
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
      subnetId: this.subnets.db[0].ref,
    });

    new ec2.CfnSubnetRouteTableAssociation(this, "SbcntrRouteDbAssociation1C", {
      routeTableId: sbcntrRouteDb.ref,
      subnetId: this.subnets.db[1].ref,
    });


    // Ingress用のルートテーブルの作成
    const sbcntrRouteIngress = new ec2.CfnRouteTable(
      this,
      "SbcntrRouteIngress",
      {
        vpcId: this.vpc.vpcId,
        tags: [
          {
            key: "Name",
            value: `${props.stage}-sbcntr-route-ingress`,
          },
        ],
      }
    );

    // Ingress用のサブネットのルートテーブル関連付け
    new ec2.CfnSubnetRouteTableAssociation(
      this,
      "SbcntrRouteIngressAssociation1A",
      {
        routeTableId: sbcntrRouteIngress.ref,
        subnetId: this.subnets.ingress[0].ref,
      }
    );

    new ec2.CfnSubnetRouteTableAssociation(
      this,
      "SbcntrRouteIngressAssociation1C",
      {
        routeTableId: sbcntrRouteIngress.ref,
        subnetId: this.subnets.ingress[1].ref,
      }
    );

    // 管理用サーバー用のルートテーブル関連付け
    new ec2.CfnSubnetRouteTableAssociation(
      this,
      "SbcntrRouteManagementAssociation1A",
      {
        routeTableId: sbcntrRouteIngress.ref,
        subnetId: this.subnets.management[0].ref,
      }
    );

    new ec2.CfnSubnetRouteTableAssociation(
      this,
      "SbcntrRouteManagementAssociation1C",
      {
        routeTableId: sbcntrRouteIngress.ref,
        subnetId: this.subnets.management[1].ref,
      }
    );

    // インターネット接続用のデフォルトルートを作成
    new ec2.CfnRoute(this, "SbcntrRouteIngressDefault", {
      routeTableId: sbcntrRouteIngress.ref,
      destinationCidrBlock: "0.0.0.0/0",
      gatewayId: this.igwId,
    });
  }
}
