import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";
import { EcsPracticeStackProps } from "../ecs-practice-stack";
import { CfnSubnet } from "aws-cdk-lib/aws-ec2";
import { ISubnet } from "aws-cdk-lib/aws-ec2";

interface SubnetProps extends EcsPracticeStackProps {
  readonly vpc: ec2.IVpc;
  readonly stage: string;
}

export type SubnetType =
  | "container"
  | "db"
  | "ingress"
  | "egress"
  | "management";

export interface ISubnetResources {
  getL2Subnets(subnetType: SubnetType, uniqueSuffix: string): ISubnet[];
  get1ABastionSubnet(uniqueSuffix: string): ISubnet;
  readonly subnets: Record<string, CfnSubnet[]>;
}

export class SubnetResources extends Construct implements ISubnetResources {
  public readonly subnets: Record<string, CfnSubnet[]>;

  constructor(scope: Construct, id: string, props: SubnetProps) {
    super(scope, id);

    const vpcId = props.vpc.vpcId;
    const azs = props.vpc.availabilityZones;
    this.subnets = {
      // コンテナサブネット
      container: [
        new ec2.CfnSubnet(this, "SubnetPrivateContainer1A", {
          vpcId,
          cidrBlock: "10.0.8.0/24",
          availabilityZone: azs[0],
          mapPublicIpOnLaunch: false,
          tags: [
            {
              key: "Name",
              value: `${props.stage}-subnet-private-container-1a`,
            },
          ],
        }),
        new ec2.CfnSubnet(this, "SubnetPrivateContainer1C", {
          vpcId: vpcId,
          cidrBlock: "10.0.9.0/24",
          availabilityZone: azs[1],
          mapPublicIpOnLaunch: false,
          tags: [
            {
              key: "Name",
              value: `${props.stage}-subnet-private-container-1c`,
            },
          ],
        }),
      ],
      // データベースサブネット
      db: [
        new ec2.CfnSubnet(this, "SubnetPrivateDb1A", {
          vpcId: vpcId,
          cidrBlock: "10.0.16.0/24",
          availabilityZone: azs[0],
          mapPublicIpOnLaunch: false,
          tags: [
            {
              key: "Name",
              value: `${props.stage}-subnet-private-db-1a`,
            },
          ],
        }),
        new ec2.CfnSubnet(this, "SubnetPrivateDb1C", {
          vpcId: vpcId,
          cidrBlock: "10.0.17.0/24",
          availabilityZone: azs[1],
          mapPublicIpOnLaunch: false,
          tags: [
            {
              key: "Name",
              value: `${props.stage}-subnet-private-db-1c`,
            },
          ],
        }),
      ],
      // Ingress周りのサブネット
      ingress: [
        new ec2.CfnSubnet(this, "SubnetPublicIngress1A", {
          vpcId: vpcId,
          cidrBlock: "10.0.0.0/24",
          availabilityZone: azs[0],
          mapPublicIpOnLaunch: true,
          tags: [
            {
              key: "Name",
              value: `${props.stage}-subnet-public-ingress-1a`,
            },
          ],
        }),
        new ec2.CfnSubnet(this, "SubnetPublicIngress1C", {
          vpcId: vpcId,
          cidrBlock: "10.0.1.0/24",
          availabilityZone: azs[1],
          mapPublicIpOnLaunch: true,
          tags: [
            {
              key: "Name",
              value: `${props.stage}-subnet-public-ingress-1c`,
            },
          ],
        }),
      ],
      // Egress周りのサブネット
      egress: [
        new ec2.CfnSubnet(this, "SubnetPrivateEgress1A", {
          vpcId: vpcId,
          cidrBlock: "10.0.248.0/24",
          availabilityZone: azs[0],
          mapPublicIpOnLaunch: false,
          tags: [
            {
              key: "Name",
              value: `${props.stage}-subnet-private-egress-1a`,
            },
          ],
        }),
        new ec2.CfnSubnet(this, "SubnetPrivateEgress1C", {
          vpcId: vpcId,
          cidrBlock: "10.0.249.0/24",
          availabilityZone: azs[1],
          mapPublicIpOnLaunch: false,
          tags: [
            {
              key: "Name",
              value: `${props.stage}-subnet-private-egress-1c`,
            },
          ],
        }),
      ],

      // 管理用サーバーのサブネット
      management: [
        new ec2.CfnSubnet(this, "SubnetPublicManagement1A", {
          vpcId: vpcId,
          cidrBlock: "10.0.240.0/24",
          availabilityZone: azs[0],
          mapPublicIpOnLaunch: true,
          tags: [
            {
              key: "Name",
              value: `${props.stage}-subnet-public-management-1a`,
            },
          ],
        }),
        new ec2.CfnSubnet(this, "SubnetPublicManagement1C", {
          vpcId: vpcId,
          cidrBlock: "10.0.241.0/24",
          availabilityZone: azs[1],
          mapPublicIpOnLaunch: true,
          tags: [
            {
              key: "Name",
              value: `${props.stage}-subnet-public-management-1c`,
            },
          ],
        }),
      ],
    };
  }
  public getL2Subnets(
    subnetType: SubnetType,
    uniqueSuffix: string,
  ): ec2.ISubnet[] {
    return this.subnets[subnetType].map((subnet, index) =>
      ec2.Subnet.fromSubnetId(
        this,
        `${subnetType}-l2-${index}-${uniqueSuffix}`,
        subnet.ref,
      ),
    );
  }

  public get1ABastionSubnet(uniqueSuffix: string): ec2.ISubnet {
    const cfnSubnet = this.subnets["management"][0];
    return ec2.Subnet.fromSubnetAttributes(this, `management-l2-${uniqueSuffix}`, {
  subnetId: cfnSubnet.ref,
      availabilityZone: cfnSubnet.availabilityZone, // CfnSubnet から AZ を取得
    });
  }
}
