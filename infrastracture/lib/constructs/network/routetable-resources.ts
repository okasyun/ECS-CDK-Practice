import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";
import { EcsPracticeStackProps } from "../../ecs-practice-stack";
import { CfnSubnet } from "aws-cdk-lib/aws-ec2";

interface RouteTableResourcesProps extends EcsPracticeStackProps {
  readonly vpc: ec2.IVpc;
  readonly subnets: Record<string, CfnSubnet[]>;
  readonly igwId: string;
  readonly stage: string;
}

export class RouteTableResources extends Construct {
  public readonly RouteAppRef: string;

  constructor(scope: Construct, id: string, props: RouteTableResourcesProps) {
    super(scope, id);

    const vpc = props.vpc;
    const subnets = props.subnets;
    const igwId = props.igwId;

    // アプリ用のルートテーブルの作成
    const RouteApp = new ec2.CfnRouteTable(this, "RouteApp", {
      vpcId: vpc.vpcId,
      tags: [
        {
          key: "Name",
          value: `${props.stage}-route-app`,
        },
      ],
    });
    this.RouteAppRef = RouteApp.ref;

    // アプリ用のサブネットのルートテーブル関連付け
    new ec2.CfnSubnetRouteTableAssociation(
      this,
      "RouteAppAssociation1A",
      {
        routeTableId: this.RouteAppRef,
        subnetId: subnets.container[0].ref,
      },
    );

    new ec2.CfnSubnetRouteTableAssociation(
      this,
      "RouteAppAssociation1C",
      {
        routeTableId: this.RouteAppRef,
        subnetId: subnets.container[1].ref,
      },
    );

    // データベース用のルートテーブルの作成
    const RouteDb = new ec2.CfnRouteTable(this, "RouteDb", {
      vpcId: vpc.vpcId,
      tags: [
        {
          key: "Name",
          value: `${props.stage}-route-db`,
        },
      ],
    });

    // データベース用のサブネットのルートテーブル関連付け
    new ec2.CfnSubnetRouteTableAssociation(this, "RouteDbAssociation1A", {
      routeTableId: RouteDb.ref,
      subnetId: subnets.db[0].ref,
    });

    new ec2.CfnSubnetRouteTableAssociation(this, "RouteDbAssociation1C", {
      routeTableId: RouteDb.ref,
      subnetId: subnets.db[1].ref,
    });

    // Ingress用のルートテーブルの作成
    const RouteIngress = new ec2.CfnRouteTable(
      this,
      "RouteIngress",
      {
        vpcId: vpc.vpcId,
        tags: [
          {
            key: "Name",
            value: `${props.stage}-route-ingress`,
          },
        ],
      },
    );

    // Ingress用のサブネットのルートテーブル関連付け
    new ec2.CfnSubnetRouteTableAssociation(
      this,
      "RouteIngressAssociation1A",
      {
        routeTableId: RouteIngress.ref,
        subnetId: subnets.ingress[0].ref,
      },
    );

    new ec2.CfnSubnetRouteTableAssociation(
      this,
      "RouteIngressAssociation1C",
      {
        routeTableId: RouteIngress.ref,
        subnetId: subnets.ingress[1].ref,
      },
    );

    // 管理用サーバー用のルートテーブル関連付け
    new ec2.CfnSubnetRouteTableAssociation(
      this,
      "RouteManagementAssociation1A",
      {
        routeTableId: RouteIngress.ref,
        subnetId: subnets.management[0].ref,
      },
    );

    new ec2.CfnSubnetRouteTableAssociation(
      this,
      "RouteManagementAssociation1C",
      {
        routeTableId: RouteIngress.ref,
        subnetId: subnets.management[1].ref,
      },
    );

    // インターネット接続用のデフォルトルートを作成
    new ec2.CfnRoute(this, "RouteIngressDefault", {
      routeTableId: RouteIngress.ref,
      destinationCidrBlock: "0.0.0.0/0",
      gatewayId: igwId,
    });
  }
}
