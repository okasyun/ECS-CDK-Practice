import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";
import { EcsPracticeStackProps } from "../ecs-practice-stack";
import { Tags } from "aws-cdk-lib";
interface SecurityGroupProps extends EcsPracticeStackProps {
  readonly vpc: ec2.IVpc;
  readonly stage: string;
}

export class SecurityGroups extends Construct {
  readonly vpc: ec2.IVpc;

  constructor(scope: Construct, id: string, props: SecurityGroupProps) {
    super(scope, id);

    this.vpc = props.vpc;

    // Ingress用のセキュリティグループの作成
    const sbcntrSgIngress = new ec2.SecurityGroup(this, "SbcntrSgIngress", {
      vpc: this.vpc,    
      description: "Security group for ingress",
      allowAllOutbound: true,
    });
    Tags.of(sbcntrSgIngress).add("Name", `${props.stage}-sbcntr-sg-ingress`);

    // 管理用サーバー用のセキュリティグループの作成
    const sbcntrSgManagement = new ec2.SecurityGroup(
      this,
      "SbcntrSgManagement",
      {
        vpc: this.vpc,
        description: "Security Group of management server",
        allowAllOutbound: true,
      },
    );
    Tags.of(sbcntrSgManagement).add("Name", `${props.stage}-sbcntr-sg-management`);
    // バックエンドアプリ用のセキュリティグループの作成
    const sbcntrSgContainer = new ec2.SecurityGroup(this, "SbcntrSgContainer", {
      vpc: this.vpc,
      description: "Security Group of backend app",
      allowAllOutbound: true,
    });
    Tags.of(sbcntrSgContainer).add("Name", `${props.stage}-sbcntr-sg-container`);

    // フロントエンドアプリ用のセキュリティグループの作成
    const sbcntrSgFrontContainer = new ec2.SecurityGroup(
      this,
      "SbcntrSgFrontContainer",
      {
        vpc: this.vpc,
        description: "Security Group of front container app",
        allowAllOutbound: true,
      },
    );
    Tags.of(sbcntrSgFrontContainer).add("Name", `${props.stage}-sbcntr-sg-front-container`);

    // 内部用ロードバランサ用のセキュリティグループの生成
    const sbcntrSgInternal = new ec2.SecurityGroup(this, "SbcntrSgInternal", {
      vpc: this.vpc,
      description: " Security group for internal load balancer",
      allowAllOutbound: true,
    });
    Tags.of(sbcntrSgInternal).add("Name", `${props.stage}-sbcntr-sg-internal`);
    // データベース用のセキュリティグループの作成
    const sbcntrSgDb = new ec2.SecurityGroup(this, "SbcntrSgDb", {
      vpc: this.vpc,
      description: "Security Group of database",
      allowAllOutbound: true,
    });
    Tags.of(sbcntrSgDb).add("Name", `${props.stage}-sbcntr-sg-db`);

    // Ingress用のセキュリティグループのルール設定
    sbcntrSgIngress.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      "Allow HTTP traffic on port 80",
    );

    // 内部用ロードバランサ用のセキュリティグループのルール設定
    sbcntrSgInternal.addIngressRule(
      ec2.Peer.securityGroupId(sbcntrSgFrontContainer.securityGroupId),
      ec2.Port.tcp(80),
      "HTTP for front container",
    );

    sbcntrSgInternal.addIngressRule(
      ec2.Peer.securityGroupId(sbcntrSgManagement.securityGroupId),
      ec2.Port.tcp(80),
      "HTTP for management server"
    );

    // データベース用のセキュリティグループのルール設定
    sbcntrSgDb.addIngressRule(
      ec2.Peer.securityGroupId(sbcntrSgContainer.securityGroupId),
      ec2.Port.tcp(3306),
      "Allow MySQL protocol from backend app",
    );
    sbcntrSgDb.addIngressRule(
      ec2.Peer.securityGroupId(sbcntrSgFrontContainer.securityGroupId),
      ec2.Port.tcp(3306),
      "Allow MySQL protocol from frontend app",
    );

    sbcntrSgDb.addIngressRule(
      ec2.Peer.securityGroupId(sbcntrSgManagement.securityGroupId),
      ec2.Port.tcp(3306),
      "Allow MySQL protocol from management server",
    );

    // フロントエンドアプリ用のセキュリティグループのルール設定
    sbcntrSgFrontContainer.addIngressRule(
      ec2.Peer.securityGroupId(sbcntrSgIngress.securityGroupId),
      ec2.Port.tcp(80),
      "HTTP for Ingress",
    );

    // バックエンドアプリ用のセキュリティグループのルール設定
    sbcntrSgContainer.addIngressRule(
      ec2.Peer.securityGroupId(sbcntrSgInternal.securityGroupId),
      ec2.Port.tcp(80),
      "HTTP for internal lb",
    );
  }
}
