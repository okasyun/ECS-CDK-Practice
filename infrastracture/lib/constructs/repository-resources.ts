import { Construct } from "constructs";
import { Repository } from "aws-cdk-lib/aws-ecr";
import * as cdk from "aws-cdk-lib";

export interface RepositoryResourcesProps {
  readonly stage: string;
}

export class RepositoryResources extends Construct {
  constructor(scope: Construct, id: string, props: RepositoryResourcesProps) {
    super(scope, id);
    const stage = props.stage.toLowerCase();
    new Repository(this, `SbcntrBackendRepository`, {
      repositoryName: `${stage}-sbcntr-backend`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      emptyOnDelete: true,
    });

    new Repository(this, `SbcntrFrontendRepository`, {
      repositoryName: `${stage}-sbcntr-frontend`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      emptyOnDelete: true,
    });
  }
}
