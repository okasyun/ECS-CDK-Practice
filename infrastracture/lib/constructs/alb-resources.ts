import { Construct } from "constructs";
import { EcsPracticeStackProps } from "../ecs-practice-stack";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
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

    // Blue Target Group
    const blueTargetGroup = new elbv2.ApplicationTargetGroup(
      this,
      "BlueTargetGroup",
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
        targetGroupName: `${stage}-subcntr-tg-sbcntrdemo-blue`,
      },
    );

    // Green Target Group
    const greenTargetGroup = new elbv2.ApplicationTargetGroup(
      this,
      "GreenTargetGroup",
      {
        vpc,
        port: 80,
        protocol: elbv2.ApplicationProtocol.HTTP,
        targetType: elbv2.TargetType.IP,
        healthCheck: {
          path: "/healthcheck",
          port: "traffic-port",
          healthyThresholdCount: 3,
          unhealthyThresholdCount: 2,
          timeout: Duration.seconds(5),
          interval: Duration.seconds(15),
          healthyHttpCodes: "200",
        },
        targetGroupName: `${stage}-subcntr-tg-sbcntrdemo-green`,
      },
    );

    const httpListener = internalAlb.addListener("HTTPListener", {
      port: 80,
      protocol: ApplicationProtocol.HTTP,
      open: false,
    });

    // Green Listener に TargetGroup を設定
    const testListener = internalAlb.addListener("TestListener", {
      port: 10080,
      protocol: elbv2.ApplicationProtocol.HTTP,
      open: false,
    });

    // Blue Listener に TargetGroup を設定
    httpListener.addTargetGroups("BlueTGAttachment", {
      targetGroups: [blueTargetGroup],
    });

    testListener.addTargetGroups("GreenTGAttachment", {
      targetGroups: [greenTargetGroup],
    });
  }
}
