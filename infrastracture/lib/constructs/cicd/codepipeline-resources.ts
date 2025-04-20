import { Construct } from "constructs";
import { EcsPracticeStackProps } from "../../ecs-practice-stack";
import * as codepipeline from "aws-cdk-lib/aws-codepipeline";
import * as codepipeline_actions from "aws-cdk-lib/aws-codepipeline-actions";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as codedeploy from "aws-cdk-lib/aws-codedeploy";

interface CodepipelineResourcesProps extends EcsPracticeStackProps {
  readonly stage: string;
  readonly codebuildProject: codebuild.IProject;
  readonly codedeployProject: codedeploy.IEcsDeploymentGroup;
}

export class CodepipelineResources extends Construct {
  constructor(scope: Construct, id: string, props: CodepipelineResourcesProps) {
    super(scope, id);

    const { stage, codebuildProject, codedeployProject } = props;

    const connectionArn = ssm.StringParameter.valueForStringParameter(
      this,
      "/codestar_connection/arn"
    );

    const sourceOutput = new codepipeline.Artifact();
    const sourceAction =
      new codepipeline_actions.CodeStarConnectionsSourceAction({
        actionName: "Github",
        owner: "okasyun",
        repo: "sbcntr-backend",
        branch: "main",
        connectionArn: connectionArn,
        output: sourceOutput,
      });

    const buildOutput = new codepipeline.Artifact();
    const buildAction = new codepipeline_actions.CodeBuildAction({
      actionName: "Build",
      project: codebuildProject,
      input: sourceOutput,
      outputs: [buildOutput],
    });

    const deployAction = new codepipeline_actions.CodeDeployEcsDeployAction({
      actionName: "Deploy",
      deploymentGroup: codedeployProject,
      appSpecTemplateFile: sourceOutput.atPath("appspec.yml"),
      taskDefinitionTemplateInput: sourceOutput,
      containerImageInputs: [
        {
          input: buildOutput,
          taskDefinitionPlaceholder: "IMAGE1_NAME",
        },
      ],
    });

    const pipeline = new codepipeline.Pipeline(this, "Pipeline", {
      pipelineName: `${stage}-pipeline`,
      stages: [
        {
          stageName: "Source",
          actions: [sourceAction],
        },
        {
          stageName: "Build",
          actions: [buildAction],
        },
        {
          stageName: "Deploy",
          actions: [deployAction],
        },
      ],
    });
  }
}
