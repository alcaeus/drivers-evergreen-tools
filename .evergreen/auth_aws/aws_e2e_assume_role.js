/**
 * Verify the AWS IAM Auth works with temporary credentials from sts:AssumeRole
 */

load("lib/aws_e2e_lib.js");

(function() {
"use strict";

const ASSUMED_ROLE = "arn:aws:sts::557821124784:assumed-role/authtest_user_assume_role/*";

function getAssumeCredentials() {
    const config = readSetupJson();

    const env = {
        AWS_ACCESS_KEY_ID: config["iam_auth_assume_aws_account"],
        AWS_SECRET_ACCESS_KEY: config["iam_auth_assume_aws_secret_access_key"],
    };

    const role_name = config["iam_auth_assume_role_name"];

    const python_command = getPython3Binary() +
        ` -u lib/aws_assume_role.py --role_name=${role_name} > creds.json`;

    runShellCmdWithEnv(python_command, env);

    const result = cat("creds.json");
    try {
        return JSON.parse(result);
    } catch (e) {
        jsTestLog("Failed to parse: " + result);
        throw e;
    }
}

const credentials = getAssumeCredentials();
const admin = Mongo().getDB("admin");
const external = admin.getMongo().getDB("$external");

assert(admin.auth("bob", "pwd123"));
external.runCommand({createUser: ASSUMED_ROLE, roles: [{role: 'read', db: "aws"}]});

// const testExternal = Mongo().getDB('$external');
// assert(testExternal.auth({
//     user: credentials["AccessKeyId"],
//     pwd: credentials["SecretAccessKey"],
//     awsIamSessionToken: credentials["SessionToken"],
//     mechanism: 'MONGODB-AWS'
// }));

const uri = new URL(admin.getMongo().getURI());
uri.username = credentials.AccessKeyId;
uri.password = credentials.SecretAccessKey;
uri.searchParams.set('authSource', '$external');
uri.searchParams.set('mechanism', 'MONGODB-AWS');
uri.searchParams.set('authMechanismProperties', `AWS_SESSION_TOKEN:${credentials.SessionToken}`);

// const uri = 'mongodb://127.0.0.1:27017/?authSource=$external&authMechanism=MONGODB-AWS&authMechanismProperties=AWS_SESSION_TOKEN:' + credentials.SessionToken;

const authResult = connect(uri.toString()).runCommand({ ping: 1 }).ok;

assert(authResult);
jsTestLog('Auth successful: ' + authResult);
}());
