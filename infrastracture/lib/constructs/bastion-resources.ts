import { Construct } from "constructs";
import { EcsPracticeStackProps } from "../ecs-practice-stack";
import * as ec2 from "aws-cdk-lib/aws-ec2";



interface BastionResourcesProps extends EcsPracticeStackProps {
    readonly stage: string;
    readonly vpc: ec2.IVpc;
    readonly subnets: ec2.ISubnet[];
    readonly securityGroups: ec2.ISecurityGroup[];
}

export class BastionResources extends Construct{

    constructor(scope: Construct, id: string, props: BastionResourcesProps) {
        super(scope, id);

        const { vpc, subnets, securityGroups } = props;
        new ec2.BastionHostLinux(this, "BastionHost", {
          vpc,
          subnetSelection: { subnets },
          instanceType: ec2.InstanceType.of(
            ec2.InstanceClass.T2,
            ec2.InstanceSize.MICRO
          ),
          machineImage: new ec2.AmazonLinuxImage({
            generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
          }),
          securityGroup: securityGroups[0],
        });

    }
}   