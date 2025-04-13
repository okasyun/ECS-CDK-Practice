import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";
import { EcsPracticeStackProps } from "../../ecs-practice-stack";
import { Tags } from "aws-cdk-lib";
interface SecurityGroupProps extends EcsPracticeStackProps {
  readonly vpc: ec2.IVpc;
  readonly stage: string;
}

export interface ISecurityGroupResources {
  readonly egress: ec2.ISecurityGroup;
  readonly internal: ec2.ISecurityGroup;
  readonly management: ec2.ISecurityGroup;
  readonly container: ec2.ISecurityGroup;
  readonly frontContainer: ec2.ISecurityGroup;
  readonly db: ec2.ISecurityGroup;
  readonly vpcEndpoint: ec2.ISecurityGroup;
  readonly ingress: ec2.ISecurityGroup;
}

export class SecurityGroupResources
  extends Construct
  implements ISecurityGroupResources
{
  readonly egress: ec2.ISecurityGroup;
  readonly internal: ec2.ISecurityGroup;
  readonly management: ec2.ISecurityGroup;
  readonly container: ec2.ISecurityGroup;
  readonly frontContainer: ec2.ISecurityGroup;
  readonly db: ec2.ISecurityGroup;
  readonly vpcEndpoint: ec2.ISecurityGroup;
  readonly ingress: ec2.ISecurityGroup;
  constructor(scope: Construct, id: string, props: SecurityGroupProps) {
    super(scope, id);

    const vpc = props.vpc;

    // Ingress用のセキュリティグループの作成
    this.ingress = new ec2.SecurityGroup(this, "SgIngress", {
      vpc,
      description: "Security group for ingress",
      allowAllOutbound: true,
    });
    Tags.of(this.ingress).add("Name", `${props.stage}--sg-ingress`);

    // 管理用サーバー用のセキュリティグループの作成
      this.management = new ec2.SecurityGroup(
      this,
      "SgManagement",
      {
        vpc,
        description: "Security Group of management server",
        allowAllOutbound: true,
      },
    );
    Tags.of(this.management).add(
      "Name",
      `${props.stage}-sg-management`,
    );
    // バックエンドアプリ用のセキュリティグループの作成
    this.container = new ec2.SecurityGroup(this, "SgContainer", {
      vpc,
      description: "Security Group of backend app",
      allowAllOutbound: true,
    });
    Tags.of(this.container).add(
      "Name",
      `${props.stage}-sg-container`,
    );

    // フロントエンドアプリ用のセキュリティグループの作成
    this.frontContainer = new ec2.SecurityGroup(
      this,
      "SgFrontContainer",
      {
        vpc,
        description: "Security Group of front container app",
        allowAllOutbound: true,
      },
    );
    Tags.of(this.frontContainer).add(
      "Name",
      `${props.stage}-sg-front-container`,
    );

    // 内部用ロードバランサ用のセキュリティグループの生成
    this.internal = new ec2.SecurityGroup(this, "SgInternal", {
      vpc,
      description: " Security group for internal load balancer",
      allowAllOutbound: true,
    });
    Tags.of(this.internal).add(
      "Name",
      `${props.stage}-sg-internal`,
    );
    // データベース用のセキュリティグループの作成
    this.db = new ec2.SecurityGroup(this, "SgDb", {
      vpc,
      description: "Security Group of database",
      allowAllOutbound: true,
    });
    Tags.of(this.db).add("Name", `${props.stage}-sg-db`);

    // VPCエンドポイント用のセキュリティグループの作成
    this.egress = new ec2.SecurityGroup(this, "SgEgress", {
      vpc,
      description: "Security Group of VPC Endpoint",
      allowAllOutbound: true,
    });
    Tags.of(this.egress).add("Name", `${props.stage}-sg-vpce`);

    // Ingress用のセキュリティグループのルール設定
    this.ingress.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      "Allow HTTP traffic on port 80",
    );

    // 内部用ロードバランサ用のセキュリティグループのルール設定
    this.internal.addIngressRule(
      ec2.Peer.securityGroupId(this.frontContainer.securityGroupId),
      ec2.Port.tcp(80),
      "HTTP for front container",
    );

    this.internal.addIngressRule(
      ec2.Peer.securityGroupId(this.management.securityGroupId),
      ec2.Port.tcp(80),
      "HTTP for management server",
    );

    this.internal.addIngressRule(
      ec2.Peer.securityGroupId(this.management.securityGroupId),
      ec2.Port.tcp(10080),
      "Test port form management server",
    );

    // データベース用のセキュリティグループのルール設定
    this.db.addIngressRule(
      ec2.Peer.securityGroupId(this.container.securityGroupId),
      ec2.Port.tcp(3306),
      "Allow MySQL protocol from backend app",
    );
    this.db.addIngressRule(
      ec2.Peer.securityGroupId(this.frontContainer.securityGroupId),
      ec2.Port.tcp(3306),
      "Allow MySQL protocol from frontend app",
    );

    this.db.addIngressRule(
      ec2.Peer.securityGroupId(this.management.securityGroupId),
      ec2.Port.tcp(3306),
      "Allow MySQL protocol from management server",
    );

    // フロントエンドアプリ用のセキュリティグループのルール設定
    this.frontContainer.addIngressRule(
      ec2.Peer.securityGroupId(this.ingress.securityGroupId),
      ec2.Port.tcp(80),
      "HTTP for Ingress",
    );

    // バックエンドアプリ用のセキュリティグループのルール設定
    this.container.addIngressRule(
      ec2.Peer.securityGroupId(this.internal.securityGroupId),
      ec2.Port.tcp(80),
      "HTTP for internal lb",
    );

    // VPCエンドポイント用のセキュリティグループのルール設定
    this.egress.addIngressRule(
      ec2.Peer.securityGroupId(this.container.securityGroupId),
      ec2.Port.tcp(443),
      "HTTPS for container app",
    );
    this.egress.addIngressRule(
      ec2.Peer.securityGroupId(this.frontContainer.securityGroupId),
      ec2.Port.tcp(443),
      "HTTPS for front container app",
    );

    this.egress.addIngressRule(
      ec2.Peer.securityGroupId(this.management.securityGroupId),
      ec2.Port.tcp(443),
      "HTTPS for management server",
    );
  }
}
