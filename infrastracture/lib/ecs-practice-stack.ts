import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { NetworkResources } from "./constructs/network-resources";
import { StackProps } from "aws-cdk-lib";
import { RepositoryResources } from "./constructs/repository-resources";
export interface EcsPracticeStackProps extends StackProps {
  readonly stage: string;
}

export class EcsPracticeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: EcsPracticeStackProps) {
    super(scope, id, props);

    new NetworkResources(this, "NetworkResources", props);
    new RepositoryResources(this, "RepositoryResources", props);
  }
}
