import { Construct } from "constructs";
import { EcsPracticeStackProps } from "../ecs-practice-stack";
import * as iam from "aws-cdk-lib/aws-iam";

interface EcsResourcesProps extends EcsPracticeStackProps {
  readonly stage: string;
}

export class EcsResources extends Construct {
  constructor(scope: Construct, id: string, props: EcsResourcesProps) {
    super(scope, id);
    const { stage } = props;

    // ECSがBLUEGREENデプロイを行うためのロールを作成
    const ecsCodeDeployRole = new iam.Role(this, "EcsCodeDeployRole", {
      assumedBy: new iam.ServicePrincipal("codedeploy.amazonaws.com"),
      roleName: `${stage}-ecs-codedeploy-role`,
      description:
        "Role assumed by AWS CodeDeploy to perform ECS Blue/Green deployment",
    });

    // 必須のマネージドポリシーをアタッチ
    ecsCodeDeployRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("AWSCodeDeployRoleForECS"),
    );

    // const cluster = new ecs.Cluster(this, "SbcntrCluster", {
    //   clusterName: `${stage}-sbcntr-cluster`,
    // });
  }
}
