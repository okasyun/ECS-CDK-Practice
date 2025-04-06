#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { EcsPracticeStack } from "../lib/ecs-practice-stack";
import { getStackProps } from "../lib/config";

const app = new cdk.App();
const stage = process.env.ENV || "Dev";
const stackProps = getStackProps(stage);
new EcsPracticeStack(app, `${stage}-EcsPractice`, {
  stage,
  ...stackProps,
});

cdk.Tags.of(app).add("ENV", stage);
