import { Construct } from "constructs";
import { Repository } from "aws-cdk-lib/aws-ecr";
import * as cdk from "aws-cdk-lib";
import { IRepository } from "aws-cdk-lib/aws-ecr";
import { EcsPracticeStackProps } from "../ecs-practice-stack";


interface RepositoryResourcesProps extends EcsPracticeStackProps {
  readonly stage: string;
}

export interface IRepositoryResources {
  readonly backendRepository: IRepository;
  readonly frontendRepository: IRepository;
}

export class RepositoryResources extends Construct implements IRepositoryResources {
  readonly backendRepository: IRepository;
  readonly frontendRepository: IRepository;

  constructor(scope: Construct, id: string, props: RepositoryResourcesProps) {
    super(scope, id);
    const stage = props.stage;

    const baseRepository = new Repository(this, `BaseRepository`, {
      repositoryName: `${stage}-base`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      emptyOnDelete: true,
    });

    this.backendRepository = new Repository(this, `BackendRepository`, {
      repositoryName: `${stage}-backend`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      emptyOnDelete: true,
    });

    this.frontendRepository = new Repository(
      this,
      `FrontendRepository`,
      {
        repositoryName: `${stage}-frontend`,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        emptyOnDelete: true,
      },
    );
  }
}
