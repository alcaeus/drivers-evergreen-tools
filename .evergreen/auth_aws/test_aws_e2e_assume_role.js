/**
 * Verify the AWS IAM Auth works with temporary credentials from sts:AssumeRole
 */

load("lib/aws_e2e_lib.js");

(function() {
"use strict";

function getAssumeCredentials() {
    const result = cat("creds.json");
    try {
        return JSON.parse(result);
    } catch (e) {
        jsTestLog("Failed to parse: " + result);
        throw e;
    }
}

const credentials = getAssumeCredentials();
const testExternal = Mongo().getDB('$external');
const authResult = testExternal.auth({
    user: credentials["AccessKeyId"],
    pwd: credentials["SecretAccessKey"],
    awsIamSessionToken: credentials["SessionToken"],
    mechanism: 'MONGODB-AWS'
});
assert(authResult);
jsTestLog('Auth successful: ' + authResult);
}());
