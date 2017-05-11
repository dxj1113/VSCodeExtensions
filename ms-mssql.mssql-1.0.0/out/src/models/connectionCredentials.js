'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const LocalizedConstants = require("../constants/localizedConstants");
const connection_1 = require("./contracts/connection");
const interfaces_1 = require("./interfaces");
const utils = require("./utils");
const question_1 = require("../prompts/question");
const os = require("os");
// Concrete implementation of the IConnectionCredentials interface
class ConnectionCredentials {
    /**
     * Create a connection details contract from connection credentials.
     */
    static createConnectionDetails(credentials) {
        let details = new connection_1.ConnectionDetails();
        details.options['server'] = credentials.server;
        if (credentials.port && details.options['server'].indexOf(',') === -1) {
            // Port is appended to the server name in a connection string
            details.options['server'] += (',' + credentials.port);
        }
        details.options['database'] = credentials.database;
        details.options['user'] = credentials.user;
        details.options['password'] = credentials.password;
        details.options['authenticationType'] = credentials.authenticationType;
        details.options['encrypt'] = credentials.encrypt;
        details.options['trustServerCertificate'] = credentials.trustServerCertificate;
        details.options['persistSecurityInfo'] = credentials.persistSecurityInfo;
        details.options['connectTimeout'] = credentials.connectTimeout;
        details.options['connectRetryCount'] = credentials.connectRetryCount;
        details.options['connectRetryInterval'] = credentials.connectRetryInterval;
        details.options['applicationName'] = credentials.applicationName;
        details.options['workstationId'] = credentials.workstationId;
        details.options['applicationIntent'] = credentials.applicationIntent;
        details.options['currentLanguage'] = credentials.currentLanguage;
        details.options['pooling'] = credentials.pooling;
        details.options['maxPoolSize'] = credentials.maxPoolSize;
        details.options['minPoolSize'] = credentials.minPoolSize;
        details.options['loadBalanceTimeout'] = credentials.loadBalanceTimeout;
        details.options['replication'] = credentials.replication;
        details.options['attachDbFilename'] = credentials.attachDbFilename;
        details.options['failoverPartner'] = credentials.failoverPartner;
        details.options['multiSubnetFailover'] = credentials.multiSubnetFailover;
        details.options['multipleActiveResultSets'] = credentials.multipleActiveResultSets;
        details.options['packetSize'] = credentials.packetSize;
        details.options['typeSystemVersion'] = credentials.typeSystemVersion;
        return details;
    }
    static ensureRequiredPropertiesSet(credentials, isProfile, isPasswordRequired, wasPasswordEmptyInConfigFile, prompter, connectionStore) {
        let questions = ConnectionCredentials.getRequiredCredentialValuesQuestions(credentials, false, isPasswordRequired);
        let unprocessedCredentials = Object.assign({}, credentials);
        // Potentially ask to save password
        questions.push({
            type: question_1.QuestionTypes.confirm,
            name: LocalizedConstants.msgSavePassword,
            message: LocalizedConstants.msgSavePassword,
            shouldPrompt: (answers) => {
                if (isProfile) {
                    // For profiles, ask to save password if we are using SQL authentication and the user just entered their password for the first time
                    return ConnectionCredentials.isPasswordBasedCredential(credentials) &&
                        typeof (credentials.savePassword) === 'undefined' &&
                        wasPasswordEmptyInConfigFile;
                }
                else {
                    // For MRU list items, ask to save password if we are using SQL authentication and the user has not been asked before
                    return ConnectionCredentials.isPasswordBasedCredential(credentials) &&
                        typeof (credentials.savePassword) === 'undefined';
                }
            },
            onAnswered: (value) => {
                credentials.savePassword = value;
            }
        });
        return prompter.prompt(questions).then(answers => {
            if (answers) {
                if (isProfile) {
                    let profile = credentials;
                    // If this is a profile, and the user has set save password to true and stored the password in the config file,
                    // then transfer the password to the credential store
                    if (profile.savePassword && !wasPasswordEmptyInConfigFile) {
                        // Remove profile, then save profile without plain text password
                        connectionStore.removeProfile(profile).then(() => {
                            connectionStore.saveProfile(profile);
                        });
                        // Or, if the user answered any additional questions for the profile, be sure to save it
                    }
                    else if (profile.authenticationType !== unprocessedCredentials.authenticationType ||
                        profile.savePassword !== unprocessedCredentials.savePassword ||
                        profile.password !== unprocessedCredentials.password) {
                        connectionStore.removeProfile(profile).then(() => {
                            connectionStore.saveProfile(profile);
                        });
                    }
                }
                return credentials;
            }
            else {
                return undefined;
            }
        });
    }
    // gets a set of questions that ensure all required and core values are set
    static getRequiredCredentialValuesQuestions(credentials, promptForDbName, isPasswordRequired, defaultProfileValues) {
        let authenticationChoices = ConnectionCredentials.getAuthenticationTypesChoice();
        let questions = [
            // Server must be present
            {
                type: question_1.QuestionTypes.input,
                name: LocalizedConstants.serverPrompt,
                message: LocalizedConstants.serverPrompt,
                placeHolder: LocalizedConstants.serverPlaceholder,
                default: defaultProfileValues ? defaultProfileValues.server : undefined,
                shouldPrompt: (answers) => utils.isEmpty(credentials.server),
                validate: (value) => ConnectionCredentials.validateRequiredString(LocalizedConstants.serverPrompt, value),
                onAnswered: (value) => credentials.server = value
            },
            // Database name is not required, prompt is optional
            {
                type: question_1.QuestionTypes.input,
                name: LocalizedConstants.databasePrompt,
                message: LocalizedConstants.databasePrompt,
                placeHolder: LocalizedConstants.databasePlaceholder,
                default: defaultProfileValues ? defaultProfileValues.database : undefined,
                shouldPrompt: (answers) => promptForDbName,
                onAnswered: (value) => credentials.database = value
            },
            // AuthenticationType is required if there is more than 1 option on this platform
            {
                type: question_1.QuestionTypes.expand,
                name: LocalizedConstants.authTypePrompt,
                message: LocalizedConstants.authTypePrompt,
                choices: authenticationChoices,
                shouldPrompt: (answers) => utils.isEmpty(credentials.authenticationType) && authenticationChoices.length > 1,
                onAnswered: (value) => {
                    credentials.authenticationType = value;
                }
            },
            // Username must be pressent
            {
                type: question_1.QuestionTypes.input,
                name: LocalizedConstants.usernamePrompt,
                message: LocalizedConstants.usernamePrompt,
                placeHolder: LocalizedConstants.usernamePlaceholder,
                default: defaultProfileValues ? defaultProfileValues.user : undefined,
                shouldPrompt: (answers) => ConnectionCredentials.shouldPromptForUser(credentials),
                validate: (value) => ConnectionCredentials.validateRequiredString(LocalizedConstants.usernamePrompt, value),
                onAnswered: (value) => credentials.user = value
            },
            // Password may or may not be necessary
            {
                type: question_1.QuestionTypes.password,
                name: LocalizedConstants.passwordPrompt,
                message: LocalizedConstants.passwordPrompt,
                placeHolder: LocalizedConstants.passwordPlaceholder,
                shouldPrompt: (answers) => ConnectionCredentials.shouldPromptForPassword(credentials),
                validate: (value) => {
                    if (isPasswordRequired) {
                        return ConnectionCredentials.validateRequiredString(LocalizedConstants.passwordPrompt, value);
                    }
                    return undefined;
                },
                onAnswered: (value) => credentials.password = value
            }
        ];
        return questions;
    }
    static shouldPromptForUser(credentials) {
        return utils.isEmpty(credentials.user) && ConnectionCredentials.isPasswordBasedCredential(credentials);
    }
    static shouldPromptForPassword(credentials) {
        return utils.isEmpty(credentials.password) && ConnectionCredentials.isPasswordBasedCredential(credentials);
    }
    static isPasswordBasedCredential(credentials) {
        // TODO consider enum based verification and handling of AD auth here in the future
        let authenticationType = credentials.authenticationType;
        if (typeof credentials.authenticationType === 'undefined') {
            authenticationType = utils.authTypeToString(interfaces_1.AuthenticationTypes.SqlLogin);
        }
        return authenticationType === utils.authTypeToString(interfaces_1.AuthenticationTypes.SqlLogin);
    }
    // Validates a string is not empty, returning undefined if true and an error message if not
    static validateRequiredString(property, value) {
        if (utils.isEmpty(value)) {
            return property + LocalizedConstants.msgIsRequired;
        }
        return undefined;
    }
    static getAuthenticationTypesChoice() {
        let choices = [
            { name: LocalizedConstants.authTypeSql, value: utils.authTypeToString(interfaces_1.AuthenticationTypes.SqlLogin) }
        ];
        // In the case of win32 support integrated. For all others only SqlAuth supported
        if ('win32' === os.platform()) {
            choices.push({ name: LocalizedConstants.authTypeIntegrated, value: utils.authTypeToString(interfaces_1.AuthenticationTypes.Integrated) });
        }
        // TODO When Azure Active Directory is supported, add this here
        return choices;
    }
}
exports.ConnectionCredentials = ConnectionCredentials;

//# sourceMappingURL=connectionCredentials.js.map
