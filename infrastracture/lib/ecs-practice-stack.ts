import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { NetworkResources } from "./constructs/network/network-resources";
import { StackProps } from "aws-cdk-lib";
import { RepositoryResources } from "./constructs/repository-resources";
import { InternalAlbResources } from "./constructs/alb/internal-alb-resources";
import { CodeDeployResources } from "./constructs/cicd/codedeploy-resources";
import { BastionResources } from "./constructs/bastion-resources";
import { PublicAlbResources } from "./constructs/alb/public-alb-resources";
import { BackendEcsResources } from "./constructs/ecs/backend-ecs-resources";
import { FrontendEcsResources } from "./constructs/ecs/frontend-ecs-resoureces";
import { DatabaseResources } from "./constructs/database-resoureces";
import { CodeBuildResources } from "./constructs/cicd/codebuild-resources";
import { CodepipelineResources } from "./constructs/cicd/codepipeline-resources";
import { FirelensResources } from "./constructs/firelens-resources";
import { FargateBastionResources } from "./constructs/ecs/fargate-bastion-resources";
export interface EcsPracticeStackProps extends StackProps {
  readonly stage: string;

  
}

export class EcsPracticeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: EcsPracticeStackProps) {
    super(scope, id, props);

    const { stage, env } = props;

    const networkResources = new NetworkResources(
      this,
      "NetworkResources",
      props
    );

    // const bastionResources = new BastionResources(this, "BastionResources", {
    //   ...props,
    //   vpc: networkResources.Vpc,
    //   subnets: [networkResources.Subnets.get1ABastionSubnet("bastion")],
    //   securityGroups: [networkResources.SecurityGroups.management],
    // });

    const repositoryResources = new RepositoryResources(
      this,
      "RepositoryResources",
      props
    );

    const databaseResources = new DatabaseResources(this, "DatabaseResources", {
      ...props,
      vpc: networkResources.Vpc,
      subnets: networkResources.Subnets.getL2Subnets("db", "aurora"),
      securityGroup: networkResources.SecurityGroups.db,
    });

    const containerSubnets = networkResources.Subnets.getL2Subnets(
      "container",
      "alb-and-ecs"
    );
    const internalAlbResources = new InternalAlbResources(
      this,
      "InternalAlbResources",
      {
        vpc: networkResources.Vpc,
        subnets: containerSubnets,
        securityGroup: networkResources.SecurityGroups.internal,
        ...props,
      }
    );

    const publicAlbResources = new PublicAlbResources(
      this,
      "PublicAlbResources",
      {
        vpc: networkResources.Vpc,
        subnets: networkResources.Subnets.getL2Subnets("ingress", "alb"),
        securityGroup: networkResources.SecurityGroups.ingress,
        ...props,
      }
    );

    const backendEcsResources = new BackendEcsResources(
      this,
      "BackendEcsResources",
      {
        ...props,
        backendRepository: repositoryResources.backendRepository,
        vpc: networkResources.Vpc,
        subnets: containerSubnets,
        securityGroups: [networkResources.SecurityGroups.container],
      }
    );

    const accountId = env?.account as string;

    const firelensResources = new FirelensResources(this, "FirelensResources", {
      ...props,
      stage,
      accountId,
      backendTaskDefinition: backendEcsResources.backendTaskDefinition,
      baseRepository: repositoryResources.baseRepository,
    });

    internalAlbResources.blueTargetGroup.addTarget(
      backendEcsResources.backendService
    );

    const frontendEcsResources = new FrontendEcsResources(
      this,
      "FrontendEcsResources",
      {
        ...props,
        frontendRepository: repositoryResources.frontendRepository,
        vpc: networkResources.Vpc,
        subnets: containerSubnets,
        securityGroups: [networkResources.SecurityGroups.frontContainer],
        internalALBDnsName: internalAlbResources.internalALBDnsName,
      }
    );

    publicAlbResources.frontendTargetGroup.addTarget(
      frontendEcsResources.frontendService
    );

    const fargateBastionResources = new FargateBastionResources(
      this,
      "FargateBastionResources",
      {
        ...props,
        baseRepository: repositoryResources.baseRepository,
        vpc: networkResources.Vpc,
        subnets: containerSubnets,
        securityGroups: [networkResources.SecurityGroups.container],
      }
    );

    const codeDeployResources = new CodeDeployResources(
      this,
      "CodeDeployResources",
      {
        ...props,
        ecsFargateService: backendEcsResources.backendService,
        targetGroupBlue: internalAlbResources.blueTargetGroup,
        targetGroupGreen: internalAlbResources.greenTargetGroup,
        bglistener: internalAlbResources.httpListener,
        testListener: internalAlbResources.testListener,
      }
    );

    const codeBuildResources = new CodeBuildResources(
      this,
      "CodeBuildResources",
      {
        ...props,
      }
    );

    const codepipelineResources = new CodepipelineResources(
      this,
      "CodepipelineResources",
      {
        ...props,
        codebuildProject: codeBuildResources.codebuildProject,
        codedeployProject: codeDeployResources.codedeploymentGroup,
      }
    );
  }
}
