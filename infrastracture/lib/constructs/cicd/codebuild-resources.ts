import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import { EcsPracticeStackProps } from "../../ecs-practice-stack";
import * as logs from "aws-cdk-lib/aws-logs";

interface CodeBuildResourcesProps extends EcsPracticeStackProps {
  readonly stage: string;
}

interface ICodeBuildResources {
  readonly codebuildProject: codebuild.IProject;
}

export class CodeBuildResources
  extends Construct
  implements ICodeBuildResources
{
  public readonly codebuildProject: codebuild.IProject;
  constructor(scope: Construct, id: string, props: CodeBuildResourcesProps) {
    super(scope, id);

    const { stage } = props;

    // CodeBuild用のIAMロールを作成
    const role = new iam.Role(this, "CodeBuildRole", {
      roleName: `${stage}-codebuild-role`,
      assumedBy: new iam.ServicePrincipal("codebuild.amazonaws.com"),
    });

    // ECR Push/Pull権限を許可するポリシーを追加
    role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        "AmazonEC2ContainerRegistryPowerUser"
      )
    );

    // CodeBuildプロジェクトの作成
    this.codebuildProject = new codebuild.Project(this, "CodeBuildProject", {
      projectName: `${props.stage}-codebuild-project`,
      buildSpec: codebuild.BuildSpec.fromSourceFilename("buildspec.yml"),
      badge: false,
      source: codebuild.Source.gitHub({
        owner: "okasyun",
        repo: "sbcntr-backend",
        branchOrRef: "main",
      }),
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
        computeType: codebuild.ComputeType.SMALL,
        privileged: true, // Docker buildで必要
      },
      environmentVariables: {
        ECR_REPOSITORY_NAME: {
          value: `${stage}-backend`,
        },
      },
      timeout: cdk.Duration.hours(1),
      role: role, // ECR権限付きのIAMロールを指定
      cache: codebuild.Cache.local(codebuild.LocalCacheMode.DOCKER_LAYER),
      logging: {
        cloudWatch: {
          logGroup: new logs.LogGroup(this, "CodeBuildLogGroup", {
            logGroupName: `${props.stage}-codebuild`,
            retention: logs.RetentionDays.TWO_WEEKS,
          }),
          prefix: "codebuild",
        },
      },
    });
  }
}
