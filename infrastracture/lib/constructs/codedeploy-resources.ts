import { Construct } from "constructs";
import { EcsPracticeStackProps } from "../ecs-practice-stack";
import * as iam from "aws-cdk-lib/aws-iam";
import * as codedeploy from "aws-cdk-lib/aws-codedeploy";
import * as ecs from "aws-cdk-lib/aws-ecs"; 
import * as cdk from "aws-cdk-lib";

import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
interface CodeDeployResourcesProps extends EcsPracticeStackProps {
  readonly stage: string;
  // eslint-disable-next-line cdk/no-class-in-interface
  readonly ecsFargateService: ecs.FargateService;
  readonly targetGroupBlue: elbv2.IApplicationTargetGroup;
  readonly targetGroupGreen: elbv2.IApplicationTargetGroup;
  readonly bglistener: elbv2.IApplicationListener;
  readonly testListener: elbv2.IApplicationListener;
}

export class CodeDeployResources extends Construct {
  constructor(scope: Construct, id: string, props: CodeDeployResourcesProps) {
    super(scope, id);

    const {
      stage,
      ecsFargateService,
      targetGroupBlue,
      targetGroupGreen,
      bglistener,
      testListener,
    } = props;

    const ecsCodeDeployRole = new iam.Role(this, "EcsCodeDeployRole", {
      assumedBy: new iam.ServicePrincipal("codedeploy.amazonaws.com"),
      roleName: `${stage}-ecs-codedeploy-role`,
      description:
        "Role assumed by AWS CodeDeploy to perform ECS Blue/Green deployment",
    });

    // 必須のマネージドポリシーをアタッチ
    ecsCodeDeployRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("AWSCodeDeployRoleForECS")
    );

    // CodeDeployの定義
    const application = new codedeploy.EcsApplication(this, "BlueGreenApp", {
      applicationName: `${stage}-bluegreen-app`,
    });
    // デプロイグループの作成
    new codedeploy.EcsDeploymentGroup(this, "BlueGreenDG", {
      application: application,
      deploymentGroupName: `${stage}-bluegreen-dg`,
      service: ecsFargateService,
      blueGreenDeploymentConfig: {
        blueTargetGroup: targetGroupBlue,
        greenTargetGroup: targetGroupGreen,
        listener: bglistener,
        testListener: testListener,
        deploymentApprovalWaitTime: cdk.Duration.minutes(10), // Greenへの切り替わりを10分待機
        terminationWaitTime: cdk.Duration.minutes(69), // 新しいタスクの開始後、古いタスクの停止までの待機時間
      },
      role: ecsCodeDeployRole,
    });

    // CodeDeployのアプリケーションとデプロイグループの参照
    const app = codedeploy.ServerApplication.fromServerApplicationName(
      this,
      "ExistingApp",
      `${stage}-bluegreen-app`
    );
    const deploymentGroup =
      codedeploy.ServerDeploymentGroup.fromServerDeploymentGroupAttributes(
        this,
        "ExistingDG",
        {
          application: app,
          deploymentGroupName: `${stage}-bluegreen-dg`,
        }
      );
  }

}