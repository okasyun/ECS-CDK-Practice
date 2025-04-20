import { StackProps } from "aws-cdk-lib";
import * as dotenv from "dotenv";

dotenv.config();

export const getStackProps = (stage: string): StackProps => {
  const account = process.env.AWS_ACCOUNT_ID;

  switch (stage) {
    case "Prod":
      return {
        env: {
          account: account,
          region: "ap-northeast-1",
        },
        terminationProtection: true,
      };
    default:
      return {
        env: {
          account: account,
          region: "ap-northeast-1",
        },
      };
  }
};
