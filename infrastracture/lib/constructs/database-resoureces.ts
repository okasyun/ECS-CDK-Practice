import { Construct } from "constructs";
import * as rds from "aws-cdk-lib/aws-rds";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { EcsPracticeStackProps } from "../ecs-practice-stack";
import { Duration, RemovalPolicy } from "aws-cdk-lib";
import * as secrets from "aws-cdk-lib/aws-secretsmanager";
import * as kms from "aws-cdk-lib/aws-kms";


interface DatabaseResourcesProps extends EcsPracticeStackProps {
  readonly vpc: ec2.IVpc;
  readonly subnets: ec2.ISubnet[];
  readonly securityGroup: ec2.ISecurityGroup;
}

export class DatabaseResources extends Construct {
  constructor(scope: Construct, id: string, props: DatabaseResourcesProps) {
    super(scope, id);

    const { stage, vpc, subnets, securityGroup } = props;

    // Auroraのシークレットの作成
    const auroraSecret = new secrets.Secret(this, "AuroraEncryptedSecret", {
      description: "コンテナユーザー用dbアクセスのシークレット",
      secretName: "mysql",
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: "user" }), // ← ユーザー名は固定
        generateStringKey: "password", // ← このキーが自動生成の対象
        passwordLength: 16,
        excludePunctuation: true,
        includeSpace: false,
      },
      encryptionKey: kms.Key.fromLookup(this, "MyKey", {
        aliasName: "alias/aws/secretsmanager",
      }),
      removalPolicy: RemovalPolicy.DESTROY,
    });


    const cluster = new rds.DatabaseCluster(this, "AuroraDatabase", {
      clusterIdentifier: `${stage}-db`,
      engine: rds.DatabaseClusterEngine.auroraMysql({
        version: rds.AuroraMysqlEngineVersion.VER_3_08_1,
      }),

      credentials: rds.Credentials.fromSecret(auroraSecret),
      writer: rds.ClusterInstance.provisioned("writer", {
        instanceIdentifier: `${stage}-writer`,
        publiclyAccessible: false,
        instanceType: ec2.InstanceType.of(
          ec2.InstanceClass.BURSTABLE3,
          ec2.InstanceSize.MEDIUM
        ),
      }),
      // readers
      readers: [
        rds.ClusterInstance.provisioned("reader", {
          instanceIdentifier: `${stage}-reader`,
          publiclyAccessible: false,
          instanceType: ec2.InstanceType.of(
            ec2.InstanceClass.BURSTABLE3,
            ec2.InstanceSize.MEDIUM
          ),
        }),
      ],
      vpcSubnets: {
        subnets: subnets,
      },
      vpc,
      securityGroups: [securityGroup],
      defaultDatabaseName: "app",
      port: 3306,
      clusterScalabilityType: rds.ClusterScalabilityType.STANDARD,
      deletionProtection: true,
      backup: {
        retention: Duration.days(1),
      },
      storageEncrypted: true,
      enableClusterLevelEnhancedMonitoring: true,
      monitoringInterval: Duration.minutes(1),
      cloudwatchLogsExports: ["audit", "error", "slowquery"],
      autoMinorVersionUpgrade: true,
      //   土曜日17時にメンテナンス（UTCで設定）
      preferredMaintenanceWindow: "sat:8:00-sat:8:30",
    });
  }
}
