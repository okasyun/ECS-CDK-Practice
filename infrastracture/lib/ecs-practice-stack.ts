import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { NetworkResources } from "./constructs/network-resources";
import { StackProps } from "aws-cdk-lib";
import { RepositoryResources } from "./constructs/repository-resources";
import { AlbResources } from "./constructs/alb-resources";
export interface EcsPracticeStackProps extends StackProps {
  readonly stage: string;
}

export class EcsPracticeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: EcsPracticeStackProps) {
    super(scope, id, props);

    const networkResources = new NetworkResources(
      this,
      "NetworkResources",
      props,
    );
    const albResources = new AlbResources(this, "AlbResources", {
      vpc: networkResources.sbcntrVpc,
      subnets: networkResources.sbcntrSubnets.getL2Subnets("ingress"),
      securityGroups: [
        networkResources.sbcntrSecurityGroups.getInternalSecurityGroup(),
      ],
      ...props,
    });
    const repositoryResources = new RepositoryResources(
      this,
      "RepositoryResources",
      props,
    );
  }
}
