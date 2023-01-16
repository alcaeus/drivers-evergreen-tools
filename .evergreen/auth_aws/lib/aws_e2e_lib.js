function _isWindows() {
    return process.platform === 'win32';
}

function cat(filename, useBinaryMode) {
    let contents = fs.readFileSync(filename, 'utf8');
    if (!useBinaryMode && _isWindows()) {
        contents = contents.replace(/(?<!\r)\n/g, '\r\n');
    }
    return contents;
}

function readSetupJson() {
    let result;
    try {
        result = cat("aws_e2e_setup.json");
    } catch (e) {
        jsTestLog(
            "Failed to parse read aws_e2e_setup.json. See evergreen.yml for how to generate this file which contains evergreen secrets.");
        throw e;
    }

    try {
        return JSON.parse(result);
    } catch (e) {
        jsTestLog("Failed to parse: aws_e2e_setup.json");
        throw e;
    }
}

function runWithEnv(args, env) {
    const pid = _startMongoProgram({args: args, env: env});
    return waitProgram(pid);
}

function runShellCmdWithEnv(argStr, env) {
    if (_isWindows()) {
        return runWithEnv(['cmd.exe', '/c', argStr], env);
    } else {
        return runWithEnv(['/bin/sh', '-c', argStr], env);
    }
}

function getPython3Binary() {
    if (_isWindows()) {
        return "python.exe";
    }

    return "python3";
}

function jsTestLog(msg) {
    if (typeof msg === "object") {
        msg = tojson(msg);
    }
    const msgs = ["----", ...msg.split("\n"), "----"].map(s => `[jsTest] ${s}`);
    print(`\n\n${msgs.join("\n")}\n\n`);
}
