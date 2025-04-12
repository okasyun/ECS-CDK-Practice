import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { NetworkResources } from "./constructs/network-resources";
import { StackProps } from "aws-cdk-lib";
import { RepositoryResources } from "./constructs/repository-resources";
import { AlbResources } from "./constructs/alb-resources";
import { EcsResources } from "./constructs/ecs-resources";
import { CodeDeployResources } from "./constructs/codedeploy-resources";
import { BastionResources } from "./constructs/bastion-resources";
export interface EcsPracticeStackProps extends StackProps {
  readonly stage: string;
}

export class EcsPracticeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: EcsPracticeStackProps) {
    super(scope, id, props);

    const networkResources = new NetworkResources(
      this,
      "NetworkResources",
      props
    );

    const bastionResources = new BastionResources(this, "BastionResources", {
      ...props,
      vpc: networkResources.Vpc,
      subnets: [networkResources.Subnets.get1ABastionSubnet("bastion")],
      securityGroups: [networkResources.SecurityGroups.management],
    });

    const albResources = new AlbResources(this, "AlbResources", {
      vpc: networkResources.Vpc,
      subnets: networkResources.Subnets.getL2Subnets("ingress", "alb"),
      securityGroups: [networkResources.SecurityGroups.internal],
      ...props,
    });
    const repositoryResources = new RepositoryResources(
      this,
      "RepositoryResources",
      props
    );

    const ecsResources = new EcsResources(this, "EcsResources", {
      ...props,
      backendRepository: repositoryResources.backendRepository,
      frontendRepository: repositoryResources.frontendRepository,
      vpc: networkResources.Vpc,
      subnets: networkResources.Subnets.getL2Subnets("container", "ecs"),
      securityGroups: [networkResources.SecurityGroups.container],
    });

    albResources.blueTargetGroup.addTarget(ecsResources.backendService);

    const codeDeployResources = new CodeDeployResources(this, "CodeDeployResources", {
      ...props,
      ecsFargateService: ecsResources.backendService,
      targetGroupBlue: albResources.blueTargetGroup,
      targetGroupGreen: albResources.greenTargetGroup,
      bglistener: albResources.httpListener,
      testListener: albResources.testListener,
    });
  }
}
