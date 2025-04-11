import { Construct } from "constructs";
import { EcsPracticeStackProps } from "../ecs-practice-stack";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import {
  ApplicationLoadBalancer,
  ApplicationProtocol,
} from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { Duration } from "aws-cdk-lib";

interface AlbResourcesProps extends EcsPracticeStackProps {
  readonly vpc: ec2.IVpc;
  readonly subnets: ec2.ISubnet[];
  readonly securityGroups: ec2.ISecurityGroup[];
  readonly stage: string;
}

export class AlbResources extends Construct {
  constructor(scope: Construct, id: string, props: AlbResourcesProps) {
    super(scope, id);
    const { vpc, subnets, securityGroups, stage } = props;
    const internalAlb = new ApplicationLoadBalancer(this, "InternalAlb", {
      vpc,
      vpcSubnets: {
        subnets,
      },
      securityGroup: securityGroups[0],
      internetFacing: false,
      loadBalancerName: `${stage}-subcntr-alb-internal`,
    });

    const httpListener = internalAlb.addListener("HTTPListener", {
      port: 80,
      protocol: ApplicationProtocol.HTTP,
    });

    const BlueTargetGroup = httpListener.addTargets("BlueTargetGroup", {
      port: 80,
      healthCheck: {
        path: "/healthcheck",
        port: "traffic-port",
        healthyThresholdCount: 3,
        unhealthyThresholdCount: 2,
        timeout: Duration.seconds(5),
        interval: Duration.seconds(15),
        healthyHttpCodes: "200",
      },
      targetGroupName: "subcntr-blue-tg-sbcntrdemo-blue",
    });
  }
}
