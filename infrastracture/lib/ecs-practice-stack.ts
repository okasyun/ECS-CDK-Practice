import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { NetworkResources } from "./constructs/network/network-resources";
import { StackProps } from "aws-cdk-lib";
import { RepositoryResources } from "./constructs/repository-resources";
import { InternalAlbResources } from "./constructs/alb/internal-alb-resources";
import { CodeDeployResources } from "./constructs/codedeploy-resources";
import { BastionResources } from "./constructs/bastion-resources";
import { PublicAlbResources } from "./constructs/alb/public-alb-resources";
import { BackendEcsResources } from "./constructs/ecs/backend-ecs-resources";
import { FrontendEcsResources } from "./constructs/ecs/frontend-ecs-resoureces";
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

    const containerSubnets = networkResources.Subnets.getL2Subnets("container", "alb-and-ecs");

    const repositoryResources = new RepositoryResources(
      this,
      "RepositoryResources",
      props
    );

    const bastionResources = new BastionResources(this, "BastionResources", {
      ...props,
      vpc: networkResources.Vpc,
      subnets: [networkResources.Subnets.get1ABastionSubnet("bastion")],
      securityGroups: [networkResources.SecurityGroups.management],
    });
    

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

    const backendEcsResources = new BackendEcsResources(this, "BackendEcsResources", {
      ...props,
      backendRepository: repositoryResources.backendRepository,
      vpc: networkResources.Vpc,
      subnets: containerSubnets,
      securityGroups: [networkResources.SecurityGroups.container],
    });

    internalAlbResources.blueTargetGroup.addTarget(backendEcsResources.backendService);

    const frontendEcsResources = new FrontendEcsResources(this, "FrontendEcsResources", {
      ...props,
      frontendRepository: repositoryResources.frontendRepository,
      vpc: networkResources.Vpc,
      subnets: containerSubnets,
      securityGroups: [networkResources.SecurityGroups.frontContainer],
      internalALBDnsName: internalAlbResources.internalALBDnsName,
    });

    publicAlbResources.frontendTargetGroup.addTarget(frontendEcsResources.frontendService);

    const codeDeployResources = new CodeDeployResources(this, "CodeDeployResources", {
      ...props,
      ecsFargateService: backendEcsResources.backendService,
      targetGroupBlue: internalAlbResources.blueTargetGroup,
      targetGroupGreen: internalAlbResources.greenTargetGroup,
      bglistener: internalAlbResources.httpListener,
      testListener: internalAlbResources.testListener,
    });
  }
}
