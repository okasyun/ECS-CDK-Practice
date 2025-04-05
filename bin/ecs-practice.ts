#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { EcsPracticeStack } from '../lib/ecs-practice-stack';

const app = new cdk.App();
new EcsPracticeStack(app, 'EcsPracticeStack');
