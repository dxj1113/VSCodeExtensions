"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const Settings = require("../settings");
const os = require("os");
// import { IExtensionManagementService, LocalExtensionType, ILocalExtension } from 'vs/platform/extensionManagement/common/extensionManagement';
const extensionId = 'ms-vscode.PowerShell';
const extensionVersion = vscode.extensions.getExtension(extensionId).packageJSON.version;
const queryStringPrefix = '?';
var settings = Settings.load();
let project = settings.bugReporting.project;
const issuesUrl = `${project}/issues/new`;
var extensions = vscode.extensions.all.filter(element => element.packageJSON.isBuiltin == false).sort((leftside, rightside) => {
    if (leftside.packageJSON.name.toLowerCase() < rightside.packageJSON.name.toLowerCase())
        return -1;
    if (leftside.packageJSON.name.toLowerCase() > rightside.packageJSON.name.toLowerCase())
        return 1;
    return 0;
});
class GenerateBugReportFeature {
    constructor(sessionManager) {
        this.sessionManager = sessionManager;
        this.command = vscode.commands.registerCommand('PowerShell.GenerateBugReport', () => {
            var body = encodeURIComponent(`## Issue Description ##

I am experiencing a problem with...

## Attached Logs ##

Follow the instructions in the [README](https://github.com/PowerShell/vscode-powershell#reporting-problems) about capturing and sending logs.

## Environment Information ##

### Visual Studio Code ###

| Name | Version |
| --- | --- |
| Operating System | ${os.type() + ' ' + os.arch() + ' ' + os.release()} |
| VSCode | ${vscode.version}|
| PowerShell Extension Version | ${extensionVersion} |

### PowerShell Information ###

${this.getRuntimeInfo()}

### Visual Studio Code Extensions ###

<details><summary>Visual Studio Code Extensions(Click to Expand)</summary>

${this.generateExtensionTable(extensions)}
</details>

`);
            var encodedBody = encodeURIComponent(body);
            var fullUrl = `${issuesUrl}${queryStringPrefix}body=${encodedBody}`;
            vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(fullUrl));
        });
    }
    setLanguageClient(LanguageClient) {
        // Not needed for this feature.
    }
    dispose() {
        this.command.dispose();
    }
    generateExtensionTable(extensions) {
        if (!extensions.length) {
            return 'none';
        }
        let tableHeader = `|Extension|Author|Version|\n|---|---|---|`;
        const table = extensions.map(e => {
            if (e.packageJSON.isBuiltin == false) {
                return `|${e.packageJSON.name}|${e.packageJSON.publisher}|${e.packageJSON.version}|`;
            }
        }).join('\n');
        const extensionTable = `
${tableHeader}\n${table};
`;
        // 2000 chars is browsers de-facto limit for URLs, 400 chars are allowed for other string parts of the issue URL
        // http://stackoverflow.com/questions/417142/what-is-the-maximum-length-of-a-url-in-different-browsers
        // if (encodeURIComponent(extensionTable).length > 1600) {
        //     return 'the listing length exceeds browsers\' URL characters limit';
        // }
        return extensionTable;
    }
    getRuntimeInfo() {
        var psOutput;
        var powerShellExePath = this.sessionManager.getPowerShellExePath();
        var powerShellArgs = [
            "-NoProfile",
            "-Command",
            '$PSVersionString = "|Name|Value|\n"; $PSVersionString += "|---|---|\n"; $PSVersionTable.keys | ForEach-Object { $PSVersionString += "|$_|$($PSVersionTable.Item($_))|\n" }; $PSVersionString'
        ];
        var spawn = require('child_process').spawnSync;
        var child = spawn(powerShellExePath, powerShellArgs);
        return child.stdout.toString().replace(';', ',');
    }
}
exports.GenerateBugReportFeature = GenerateBugReportFeature;
//# sourceMappingURL=GenerateBugReport.js.map