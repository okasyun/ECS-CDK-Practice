import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";
import { EcsPracticeStackProps } from "../ecs-practice-stack";
import { CfnSubnet } from "aws-cdk-lib/aws-ec2";

interface SubnetProps extends EcsPracticeStackProps {
  readonly vpc: ec2.IVpc;
  readonly stage: string;
}

export class Subnets extends Construct {
  readonly vpcId: string;
  readonly azs: string[];
  readonly subnets: Record<string, CfnSubnet[]>;

  constructor(scope: Construct, id: string, props: SubnetProps) {
    super(scope, id);

    this.vpcId = props.vpc.vpcId;
    this.azs = props.vpc.availabilityZones;
    this.subnets = {
      // コンテナサブネット
      container: [
        new ec2.CfnSubnet(this, "SbcntrSubnetPrivateContainer1A", {
          vpcId: this.vpcId,
          cidrBlock: "10.0.8.0/24",
          availabilityZone: this.azs[0],
          mapPublicIpOnLaunch: false,
          tags: [
            {
              key: "Name",
              value: `${props.stage}-sbcntr-subnet-private-container-1a`,
            },
          ],
        }),
        new ec2.CfnSubnet(this, "SbcntrSubnetPrivateContainer1C", {
          vpcId: this.vpcId,
          cidrBlock: "10.0.9.0/24",
          availabilityZone: this.azs[1],
          mapPublicIpOnLaunch: false,
          tags: [
            {
              key: "Name",
              value: `${props.stage}-sbcntr-subnet-private-container-1c`,
            },
          ],
        }),
      ],
      // データベースサブネット
      db: [
        new ec2.CfnSubnet(this, "SbcntrSubnetPrivateDb1A", {
          vpcId: this.vpcId,
          cidrBlock: "10.0.16.0/24",
          availabilityZone: this.azs[0],
          mapPublicIpOnLaunch: false,
          tags: [
            {
              key: "Name",
              value: `${props.stage}-sbcntr-subnet-private-db-1a`,
            },
          ],
        }),
        new ec2.CfnSubnet(this, "SbcntrSubnetPrivateDb1C", {
          vpcId: this.vpcId,
          cidrBlock: "10.0.17.0/24",
          availabilityZone: this.azs[1],
          mapPublicIpOnLaunch: false,
          tags: [
            {
              key: "Name",
              value: `${props.stage}-sbcntr-subnet-private-db-1c`,
            },
          ],
        }),
      ],
      // Ingress周りのサブネット
      ingress: [
        new ec2.CfnSubnet(this, "SbcntrSubnetPublicIngress1A", {
          vpcId: this.vpcId,
          cidrBlock: "10.0.0.0/24",
          availabilityZone: this.azs[0],
          mapPublicIpOnLaunch: true,
          tags: [
            {
              key: "Name",
              value: `${props.stage}-sbcntr-subnet-public-ingress-1a`,
            },
          ],
        }),
        new ec2.CfnSubnet(this, "SbcntrSubnetPublicIngress1C", {
          vpcId: this.vpcId,
          cidrBlock: "10.0.1.0/24",
          availabilityZone: this.azs[1],
          mapPublicIpOnLaunch: true,
          tags: [
            {
              key: "Name",
              value: `${props.stage}-sbcntr-subnet-public-ingress-1c`,
            },
          ],
        }),
      ],
      // Egress周りのサブネット
      egress: [
        new ec2.CfnSubnet(this, "SbcntrSubnetPrivateEgress1A", {
          vpcId: this.vpcId,
          cidrBlock: "10.0.248.0/24",
          availabilityZone: this.azs[0],
          mapPublicIpOnLaunch: false,
          tags: [
            {
              key: "Name",
              value: `${props.stage}-sbcntr-subnet-private-egress-1a`,
            },
          ],
        }),
        new ec2.CfnSubnet(this, "SbcntrSubnetPrivateEgress1C", {
          vpcId: this.vpcId,
          cidrBlock: "10.0.249.0/24",
          availabilityZone: this.azs[1],
          mapPublicIpOnLaunch: false,
          tags: [
            {
              key: "Name",
              value: `${props.stage}-sbcntr-subnet-private-egress-1c`,
            },
          ],
        }),
      ],

      // 管理用サーバーのサブネット
      management: [
        new ec2.CfnSubnet(this, "SbcntrSubnetPublicManagement1A", {
          vpcId: this.vpcId,
          cidrBlock: "10.0.240.0/24",
          availabilityZone: this.azs[0],
          mapPublicIpOnLaunch: true,
          tags: [
            {
              key: "Name",
              value: `${props.stage}-sbcntr-subnet-public-management-1a`,
            },
          ],
        }),
        new ec2.CfnSubnet(this, "SbcntrSubnetPublicManagement1C", {
          vpcId: this.vpcId,
          cidrBlock: "10.0.241.0/24",
          availabilityZone: this.azs[1],
          mapPublicIpOnLaunch: true,
          tags: [
            {
              key: "Name",
              value: `${props.stage}-sbcntr-subnet-public-management-1c`,
            },
          ],
        }),
      ],
    };
  }
}
