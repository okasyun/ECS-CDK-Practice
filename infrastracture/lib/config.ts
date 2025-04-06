import { StackProps } from "aws-cdk-lib";

export const getStackProps = (stage: string): StackProps => {
  switch (stage) {
    case "Prod":
      return {
        env: {
          account: "637423478672",
          region: "ap-northeast-1",
        },
        terminationProtection: true,
      };
    default:
      return {
        env: {
          account: "637423478672",
          region: "ap-northeast-1",
        },
      };
  }
};
