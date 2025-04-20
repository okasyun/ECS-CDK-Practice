import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { EcsPracticeStack } from "../lib/ecs-practice-stack";
import { getStackProps } from "../lib/config";

test("Snapshot test", () => {
  const app = new cdk.App();
  // WHEN
  const stage = process.env.ENV || "Dev";
  const stackProps = getStackProps(stage);
  const stack = new EcsPracticeStack(app, `${stage}-EcsPractice`, {stage, ...stackProps});
  // THEN
  const template = Template.fromStack(stack);
  expect(template).toMatchSnapshot();
});
