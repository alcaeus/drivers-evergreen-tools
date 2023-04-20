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

// const uri = new URL(testExternal.getMongo().getURI());
// uri.username = credentials.AccessKeyId;
// uri.password = credentials.SecretAccessKey;
// uri.searchParams.set('authSource', '$external');
// uri.searchParams.set('mechanism', 'MONGODB-AWS');
// uri.searchParams.set('authMechanismProperties', `AWS_SESSION_TOKEN:${credentials.SessionToken}`);

// const uri = db.getMongo().getURI() + 'authSource=$external&authMechanism=MONGODB-AWS&authMechanismProperties=AWS_SESSION_TOKEN:' + credentials.SessionToken;

const uri = 'mongodb://127.0.0.1:27017/?authSource=$external&authMechanism=MONGODB-AWS&authMechanismProperties=AWS_SESSION_TOKEN:' + credentials.SessionToken;
const authResult = connect(uri).runCommand({ ping: 1 }).ok;

assert(authResult);
jsTestLog('Auth successful: ' + authResult);
}());
