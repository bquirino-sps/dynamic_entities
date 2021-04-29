'use strict';
/**
 * Copyright © 2019, Oracle and/or its affiliates. All rights reserved.
 * The Universal Permissive License (UPL), Version 1.0
 *
 * Version 1.0.2
 * @author Chris Kutler
 *
 * Utility methods
 */

const fs = require('fs');
const os = require('os');

/*
 * Gets domain, signing info, private key from config file
 * @param configFile - File's absolute path name
 */
function getConfigData (configFile) {
  var configFilePath = configFile;
  if (configFilePath.indexOf('~/') === 0) { configFilePath = configFilePath.replace('~', os.homedir()); };
  const configData = require(configFilePath);

  var privateKeyPath = configData.privateKeyPath;
  if (privateKeyPath.indexOf('~/') === 0) { privateKeyPath = privateKeyPath.replace('~', os.homedir()); };
  exports.DOMAIN = configData.domain;
  exports.TENANCY_ID = configData.tenancyId;
  exports.AUTH_USER_ID = configData.userId;
  exports.KEY_FINGERPRINT = configData.fingerprint;
  exports.PRIVATE_KEY = fs.readFileSync(privateKeyPath, 'ascii');
};
exports.getConfigData = getConfigData;
