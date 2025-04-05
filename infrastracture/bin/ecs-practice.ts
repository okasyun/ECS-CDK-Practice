#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { EcsPracticeStack } from "../lib/ecs-practice-stack";
import { getStackProps } from "../lib/config";

const app = new cdk.App();
const env = process.env.ENV || "Dev";
const stackProps = getStackProps(env);
new EcsPracticeStack(app, "EcsPractice", stackProps);