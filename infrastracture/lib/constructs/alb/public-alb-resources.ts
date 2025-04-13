import { Construct } from "constructs";
import { EcsPracticeStackProps } from "../../ecs-practice-stack";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import {
  ApplicationLoadBalancer,
  ApplicationProtocol,
} from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { Duration } from "aws-cdk-lib";

interface PublicAlbResourcesProps extends EcsPracticeStackProps {
  readonly vpc: ec2.IVpc;
  readonly subnets: ec2.ISubnet[];
  readonly securityGroup: ec2.ISecurityGroup;
  readonly stage: string;
}

interface IPublicAlbResources {
  readonly frontendTargetGroup: elbv2.IApplicationTargetGroup;
}


export class PublicAlbResources extends Construct implements IPublicAlbResources {
  public readonly frontendTargetGroup: elbv2.IApplicationTargetGroup;
  constructor(scope: Construct, id: string, props: PublicAlbResourcesProps) {
    super(scope, id);

    const { vpc, subnets, securityGroup, stage } = props;

    const publicAlb = new ApplicationLoadBalancer(this, "PublicAlb", {
      vpc,
      vpcSubnets: { 
        subnets: subnets,
      },
      securityGroup: securityGroup,
      internetFacing: true,
      loadBalancerName: `${stage}-alb-ingress-frontend`,
      deletionProtection: false,
    });

    // Blue Target Group
    this.frontendTargetGroup = new elbv2.ApplicationTargetGroup(
      this,
      "FrontendTargetGroup",
      {
        vpc,
        port: 80,
        protocol: elbv2.ApplicationProtocol.HTTP,
        targetType: elbv2.TargetType.IP, // ECS/Fargate用にIPを指定
        healthCheck: {
          path: "/healthcheck",
          port: "traffic-port",
          healthyThresholdCount: 3,
          unhealthyThresholdCount: 2,
          timeout: Duration.seconds(5),
          interval: Duration.seconds(15),
          healthyHttpCodes: "200",
        },
        targetGroupName: `${stage}-tg-frontend`,
      }
    );

    const frontendListener = publicAlb.addListener("FrontendListener", {
      port: 80,
      protocol: ApplicationProtocol.HTTP,
      open: true,
      defaultAction: elbv2.ListenerAction.forward([this.frontendTargetGroup]),
    });
  }
}