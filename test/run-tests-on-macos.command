#!/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc -m

import {test as CubeTransformTest} from './CubeTransformTest.mjs';
import {test as Pattern2xTest} from './Pattern2xTest.mjs';
import {test as Pattern3xTest} from './Pattern3xTest.mjs';
import {test as Pattern4xTest} from './Pattern4xTest.mjs';
import {test as Pattern5xTest} from './Pattern5xTest.mjs';
import {test as Pattern6xTest} from './Pattern6xTest.mjs';
import {test as Pattern7xTest} from './Pattern7xTest.mjs';

print("running tests...");

var success=true;
success &= CubeTransformTest();
success &= Pattern2xTest();
success &= Pattern3xTest();
success &= Pattern4xTest();
success &= Pattern5xTest();
success &= Pattern6xTest();
success &= Pattern7xTest();

print(success ? "all tests passed" : "some tests failed");