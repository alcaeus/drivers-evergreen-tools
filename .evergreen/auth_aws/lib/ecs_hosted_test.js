/**
 * Verify the AWS IAM ECS hosted auth works
 */

(function() {
"use strict";

// This varies based on hosting ECS task as the account id and role name can vary
const AWS_ACCOUNT_ARN = "arn:aws:sts::557821124784:assumed-role/ecsTaskExecutionRole/*";

// Create new dbpath + spawn mongod
const dbpath = path.resolve(__dirname, 'mongod-dbpath' + Date.now());
fs.rmSync(dbpath, { recursive: true, force: true });
fs.mkdirSync(dbpath, { recursive: true });
const mongodProcess = child_process.spawn('mongod',
    ['--setParameter', 'authenticationMechanisms=MONGODB-AWS,SCRAM-SHA-256',
        `--port=0`,
        `--dbpath=${dbpath}`], { stdio: ['inherit', 'pipe', 'inherit'] });

try {
    // Wait until log contains listening-on-port message
    let port = undefined;
    let mongodLog = '';
    mongodProcess.stdout.setEncoding('utf8').on('data', chunk => mongodLog += chunk);
    for (let i = 0; i < 200; i++) {
        sleep(100);
        port = mongodLog
            .split('\n')
            .map(line => { try { return JSON.parse(line); } catch {} })
            .find(logEntry => logEntry?.id === 23016 /* listening on port */)
            ?.attr?.port;
        if (port !== undefined || mongodProcess.exitCode) break;
    }
    if (port === undefined) {
        console.error(mongodLog);
        throw new Error('mongod log did not contain listening information');
    }

    const conn = Mongo(`mongodb://127.0.0.1:${port}/`);

    const external = conn.getDB("$external");
    const admin = conn.getDB("admin");

    admin.runCommand({createUser: "admin", pwd: "pwd", roles: ['root']});
    assert(admin.auth("admin", "pwd"));

    external.runCommand({createUser: AWS_ACCOUNT_ARN, roles:[{role: 'read', db: "aws"}]});

    const uri = `mongodb://127.0.0.1:${port}/aws?authMechanism=MONGODB-AWS`;
    //const program = "/root/src/.evergreen/run-mongodb-aws-ecs-test.sh";
    const program = "/tmp/run-mongodb-aws-ecs-test.sh";

    // Try the command line (throws if exit code != 0)
    const output = child_process.execFileSync(program, [uri], { encoding: 'utf8' });
    console.log(output);

    // Try the auth function
    const testConn = new Mongo(conn);
    const testExternal = testConn.getDB('$external');
    assert(testExternal.auth({mechanism: 'MONGODB-AWS'}));

    MongoRunner.stopMongod(conn);
} finally {
    fs.rmSync(dbpath, { recursive: true, force: true });
    mongodProcess.kill();
}
}());
