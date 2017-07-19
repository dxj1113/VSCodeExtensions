/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const os = require("os");
const jsonc_parser_1 = require("jsonc-parser");
const Constants = require("../constants/constants");
const LocalizedConstants = require("../constants/localizedConstants");
const Utils = require("../models/utils");
const vscodeWrapper_1 = require("../controllers/vscodeWrapper");
const commentJson = require('comment-json');
/**
 * Implements connection profile file storage.
 */
class ConnectionConfig {
    /**
     * Constructor.
     */
    constructor(_fs, _vscodeWrapper) {
        this._fs = _fs;
        this._vscodeWrapper = _vscodeWrapper;
        if (!this._fs) {
            this._fs = fs;
        }
        if (!this.vscodeWrapper) {
            this.vscodeWrapper = new vscodeWrapper_1.default();
        }
    }
    get vscodeWrapper() {
        return this._vscodeWrapper;
    }
    set vscodeWrapper(value) {
        this._vscodeWrapper = value;
    }
    /**
     * Add a new connection to the connection config.
     */
    addConnection(profile) {
        let parsedSettingsFile = this.readAndParseSettingsFile(ConnectionConfig.configFilePath);
        // No op if the settings file could not be parsed; we don't want to overwrite the corrupt file
        if (!parsedSettingsFile) {
            return Promise.reject(Utils.formatString(LocalizedConstants.msgErrorReadingConfigFile, ConnectionConfig.configFilePath));
        }
        let profiles = this.getProfilesFromParsedSettingsFile(parsedSettingsFile);
        // Remove the profile if already set
        profiles = profiles.filter(value => !Utils.isSameProfile(value, profile));
        profiles.push(profile);
        return this.writeProfilesToSettingsFile(parsedSettingsFile, profiles);
    }
    /**
     * Get a list of all connections in the connection config. Connections returned
     * are sorted first by whether they were found in the user/workspace settings,
     * and next alphabetically by profile/server name.
     */
    getConnections(getWorkspaceConnections) {
        let profiles = [];
        let compareProfileFunc = (a, b) => {
            // Sort by profile name if available, otherwise fall back to server name or connection string
            let nameA = a.profileName ? a.profileName : (a.server ? a.server : a.connectionString);
            let nameB = b.profileName ? b.profileName : (b.server ? b.server : b.connectionString);
            return nameA.localeCompare(nameB);
        };
        // Read from user settings
        let parsedSettingsFile = this.readAndParseSettingsFile(ConnectionConfig.configFilePath);
        let userProfiles = this.getProfilesFromParsedSettingsFile(parsedSettingsFile);
        userProfiles.sort(compareProfileFunc);
        profiles = profiles.concat(userProfiles);
        if (getWorkspaceConnections) {
            // Read from workspace settings
            parsedSettingsFile = this.readAndParseSettingsFile(this.workspaceSettingsFilePath);
            let workspaceProfiles = this.getProfilesFromParsedSettingsFile(parsedSettingsFile);
            workspaceProfiles.sort(compareProfileFunc);
            profiles = profiles.concat(workspaceProfiles);
        }
        if (profiles.length > 0) {
            profiles = profiles.filter(conn => {
                // filter any connection missing a connection string and server name or the sample that's shown by default
                return conn.connectionString || !!(conn.server) && conn.server !== LocalizedConstants.SampleServerName;
            });
        }
        return profiles;
    }
    /**
     * Remove an existing connection from the connection config.
     */
    removeConnection(profile) {
        let parsedSettingsFile = this.readAndParseSettingsFile(ConnectionConfig.configFilePath);
        // No op if the settings file could not be parsed; we don't want to overwrite the corrupt file
        if (!parsedSettingsFile) {
            return Promise.resolve(false);
        }
        let profiles = this.getProfilesFromParsedSettingsFile(parsedSettingsFile);
        // Remove the profile if already set
        let found = false;
        profiles = profiles.filter(value => {
            if (Utils.isSameProfile(value, profile)) {
                // remove just this profile
                found = true;
                return false;
            }
            else {
                return true;
            }
        });
        return new Promise((resolve, reject) => {
            this.writeProfilesToSettingsFile(parsedSettingsFile, profiles).then(() => {
                resolve(found);
            }).catch(err => {
                reject(err);
            });
        });
    }
    /**
     * Get the directory containing the connection config file.
     */
    static get configFileDirectory() {
        if (os.platform() === 'win32') {
            // On Windows, settings are located in %APPDATA%\Code\User\
            return process.env['APPDATA'] + '\\Code\\User\\';
        }
        else if (os.platform() === 'darwin') {
            // On OSX, settings are located in $HOME/Library/Application Support/Code/User/
            return process.env['HOME'] + '/Library/Application Support/Code/User/';
        }
        else {
            // On Linux, settings are located in $HOME/.config/Code/User/
            return process.env['HOME'] + '/.config/Code/User/';
        }
    }
    /**
     * Get the path of the file containing workspace settings.
     */
    get workspaceSettingsFilePath() {
        let workspacePath = this.vscodeWrapper.workspaceRootPath;
        const vscodeSettingsDir = '.vscode';
        let dirSeparator = '/';
        if (os.platform() === 'win32') {
            dirSeparator = '\\';
        }
        if (workspacePath) {
            return this.vscodeWrapper.workspaceRootPath + dirSeparator +
                vscodeSettingsDir + dirSeparator +
                Constants.connectionConfigFilename;
        }
        else {
            return undefined;
        }
    }
    /**
     * Get the full path of the connection config filename.
     */
    static get configFilePath() {
        return this.configFileDirectory + Constants.connectionConfigFilename;
    }
    /**
     * Public for testing purposes.
     */
    createConfigFileDirectory() {
        const self = this;
        const configFileDir = ConnectionConfig.configFileDirectory;
        return new Promise((resolve, reject) => {
            self._fs.mkdir(configFileDir, err => {
                // If the directory already exists, ignore the error
                if (err && err.code !== 'EEXIST') {
                    reject(err);
                }
                resolve();
            });
        });
    }
    /**
     * Parse the vscode settings file into an object, preserving comments.
     * This is public for testing only.
     * @param filename the name of the file to read from
     * @returns undefined if the settings file could not be read, or an empty object if the file did not exist/was empty
     */
    readAndParseSettingsFile(filename) {
        if (!filename) {
            return undefined;
        }
        try {
            let fileBuffer = this._fs.readFileSync(filename);
            if (fileBuffer) {
                let fileContents = fileBuffer.toString();
                if (!Utils.isEmpty(fileContents)) {
                    try {
                        let fileObject = jsonc_parser_1.parse(fileContents);
                        // TODO #930 handle case where mssql.connections section of the settings file is corrupt
                        // the errors from parse only indicate if there were invalid symbols, numbers or properties which
                        // isn't particularly useful so we'd need to check manually for missing required properties or other corruption.
                        return fileObject;
                    }
                    catch (e) {
                        this.vscodeWrapper.showErrorMessage(Utils.formatString(LocalizedConstants.msgErrorReadingConfigFile, filename));
                    }
                }
                else {
                    return {};
                }
            }
        }
        catch (e) {
            if (e.code !== 'ENOENT') {
                this.vscodeWrapper.showErrorMessage(Utils.formatString(LocalizedConstants.msgErrorReadingConfigFile, filename));
            }
            else {
                return {};
            }
        }
        return undefined;
    }
    /**
     * Get all profiles from the parsed settings file.
     * This is public for testing only.
     * @param parsedSettingsFile an object representing the parsed contents of the settings file.
     * @returns the set of connection profiles found in the parsed settings file.
     */
    getProfilesFromParsedSettingsFile(parsedSettingsFile) {
        let profiles = [];
        // Find the profiles object in the parsed settings file
        if (parsedSettingsFile && parsedSettingsFile.hasOwnProperty(Constants.connectionsArrayName)) {
            profiles = parsedSettingsFile[Constants.connectionsArrayName];
        }
        return profiles;
    }
    /**
     * Replace existing profiles in the settings file with a new set of profiles.
     * @param parsedSettingsFile an object representing the parsed contents of the settings file.
     * @param profiles the set of profiles to insert into the settings file.
     */
    writeProfilesToSettingsFile(parsedSettingsFile, profiles) {
        // Insert the new set of profiles
        parsedSettingsFile[Constants.connectionsArrayName] = profiles;
        // Save the file
        const self = this;
        return new Promise((resolve, reject) => {
            self.createConfigFileDirectory().then(() => {
                // Format the file using 4 spaces as indentation
                self._fs.writeFile(ConnectionConfig.configFilePath, commentJson.stringify(parsedSettingsFile, undefined, 4), err => {
                    if (err) {
                        reject(err);
                    }
                    resolve();
                });
            }).catch(err => {
                reject(err);
            });
        });
    }
}
exports.ConnectionConfig = ConnectionConfig;

//# sourceMappingURL=connectionconfig.js.map
