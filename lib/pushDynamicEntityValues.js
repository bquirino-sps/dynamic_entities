'use strict';
/**
 * Copyright © 2019, Oracle and/or its affiliates. All rights reserved.
 * The Universal Permissive License (UPL), Version 1.0
 *
 * Version 1.0.3
 * @author Chris Kutler
 *
 * Updates named dynamic entity by updating or replacing original values with values from a JSON file.
 *
 * See Use Cases: Update Dynamic Entity Values in
 * https://www.oracle.com/pls/topic/lookup?ctx=en/cloud/paas/digital-assistant&id=dacro-index
 * for the format of the patch data JSON file.
 *
 */

/*
 * Dependencies
 */
const os = require('os');
const ociUtils = require('./ociUtils');
const utils = require('./utils.js');

/*
 * API info
 */
const BASE_PATH = '/api/v1';

/*
 * Other global variables
 */
const ACTIVE_STATUSES = ['INPROGRESS', 'TRAINING'];
var PATCH_DATA_PATH;
var PARAMETERS;
var DEBUG;

/*
 * Stop process if there is a push request in process
 *
 * @param pushRequestsList - Results from
 *   GET /api/v1/bots/{botId}/dynamicEntities/{entityId}/pushRequests
 */

function debug (message) {
  if (DEBUG) { console.log(message); }
}

const checkForActiveRequests = function (pushRequestsList) {
  return new Promise(function (resolve, reject) {
    const activeRequests = pushRequestsList.items.filter(val => ACTIVE_STATUSES.includes(val.status.toUpperCase()));
    debug('checkForActiveRequests: Active statuses: ' + JSON.stringify(activeRequests));
    if (activeRequests.length > 0) {
      reject(new Error('Can\'t create a new request because push request ' +
        activeRequests[0].id +
        ' hasn\'t completed yet. Try again later.'));
    } else {
      resolve(pushRequestsList);
    };
    reject(new Error('Filter error'));
  });
};

const timeout = function (milliseconds) {
  return new Promise(function (resolve) {
    setTimeout(resolve, milliseconds);
  });
};

/*
 * Monitor push request until it finishes.
 * Outputs bot ID, entity ID, push request ID.
 * Outputs push request status when job is done.
 * If job isn't done after 50 queries, then ends with check-later message
 *
 * @param botid
 * @param entityId
 * @param pushRequestId
 */

async function trackStatus (botId, entityId, pushRequestId) {
  try {
    const max = 50;
    console.log('Bot ID: ' + botId);
    console.log('entity ID: ' + entityId);
    console.log('Push Requst ID: ' + pushRequestId);
    console.log('Checking push request job for completion...');
    var pushRequestStatus = '';
    for (let i = 0; i < max; i++) {
      if (i >= max - 1) {
        return 'Request job still hasn\'t completed. Current status is ' +
          pushRequestStatus +
          '. Check job status later.';
      } else {
        console.log('...');
        await timeout(5000);
        const pushRequestData = await getPushRequest(botId, entityId, pushRequestId);
        pushRequestStatus = pushRequestData.status.toUpperCase();
        if (!ACTIVE_STATUSES.includes(pushRequestStatus)) {
          return 'Push request job has finished. Status = ' + pushRequestStatus + '.';
        }
      };
    };
  } catch (error) {
    failureCallback(error);
  }
};

/*
 * Handle promise reject
 */
const failureCallback = function (error) {
  console.error('Job failed: ' + error);
  process.exit(1);
};

/*
 * Get list of skills
 */
async function listSkills () {
  /*
  List skills
   */
  const options = {
    host: utils.DOMAIN,
    path: BASE_PATH + '/skills'
  };
  debug('listSkills: ' + JSON.stringify(options));
  return ociUtils.promisifiedSendRequest(options);
};

/*
 * Given skills list, find matching skill name and version
 * and return bot ID.
 *
 * @param skillsData - response from
 *   GET /api/v1/skills
 * @param skillName - User supplied name of skill
 * @param skillVersion - user supplied version of the skill
 */
const getBotIdForSkillNameVersion = function (skillsData, skillName, skillVersion) {
  debug('getBotIdForSkillNameVersion for ' + skillName + ' ' + skillVersion);
  return new Promise((resolve, reject) => {
    const matchingSkills = skillsData.items.filter(val => val.name === skillName && val.version === skillVersion);
    if (matchingSkills.length === 0) {
      reject(new Error('There are no skills with that name and version.'));
    } else {
      resolve(matchingSkills[0].id);
    };
    reject(new Error('Filter error'));
  });
};

/*
 * Get skills list and return bot ID for matching skill name and version.
 *
 * @param skillName - User supplied name of skill
 * @param skillVersion - user supplied version of the skill
 */
async function lookupBotId (skillName, skillVersion) {
  debug('lookupBotId for ' + skillName + ' ' + skillVersion);
  return listSkills().then(skillsData => getBotIdForSkillNameVersion(skillsData, skillName, skillVersion));
};

/*
 * Get entities for the skill.
 * Returns results from GET /api/v1/bots/{botId}/dynamicEntities
 *
 * @param botId
 */
async function getEntitiesForSkill (botId) {
  const options = {
    host: utils.DOMAIN,
    path: BASE_PATH + '/bots/' + encodeURIComponent(botId) + '/dynamicEntities'
  };
  debug('getEntitiesForSkill: ' + JSON.stringify(options));
  return ociUtils.promisifiedSendRequest(options);
}

/*
 * Get entity ID for entity name from entities data
 *
 * @param entitiesData - response from GET /api/v1/bots/{botId}/dynamicEntities
 * @param entityName - User-entered entity name
 */
const getEntityId = function (entitiesData, entityName) {
  debug('getEntityId for ' + entityName);
  return new Promise((resolve, reject) => {
    debug('getEntityId: entitiesData : ' + JSON.stringify(entitiesData.items));
    const matchingEntities = entitiesData.items.filter(val => val.name === entityName);
    if (matchingEntities.length === 0) {
      reject(new Error('There are no entities with that name.'));
    } else {
      resolve(matchingEntities[0].id);
    };
    reject(new Error('Filter error'));
  });
};

/*
 * Get entity ID for given entity name and bot ID
 *
 * @param botId
 * @param entityName - user-entered entity name
 */
async function lookupEntityId (botId, entityName) {
  return getEntitiesForSkill(botId).then(EntitiesData => getEntityId(EntitiesData, entityName));
};

/*
 * Create push request. This creates a container for
 * add, delete, and modify instructions for the
 * dynamic entity (patch data).
 *
 * Returns response from POST /api/v1/bots/{botId}/dynamicEntities/{entityId}/pushRequests
 *
 * @param botId
 * @param entityName - user-entered entity name
 */
async function createPushRequest (botId, entityId, copyQueryParm) {
  const body = '{}';
  const options = {
    host: utils.DOMAIN,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    path: BASE_PATH +
      '/bots/' +
      encodeURIComponent(botId) +
      '/dynamicEntities/' +
      encodeURIComponent(entityId) +
      '/pushRequests?copy=' +
      copyQueryParm
  };
  debug('createPushRequest: ' + JSON.stringify(options));
  return ociUtils.promisifiedSendRequest(options, body);
};

/*
 * Push data to the push request. Uploads add, delete, and modify
 * instructions to the push request's container. Gets the instruction
 * from the specified JSON file, which is hard-coded in the global constant
 * PATCH_DATA_PATH.
 * Returns response from PATCH /api/v1/bots/{botId}/dynamicEntities/{entityId}/pushRequests/{pushRequestId}/values
 *
 * @param botId
 * @param entityId
 * @param pushRequestId
 *
 */
async function pushDataToRequest (botId, entityId, pushRequestId) {
  // You can require JSON files in Node as if they were packages
  const patchData = require(PATCH_DATA_PATH);
  const body = JSON.stringify(patchData);
  if (DEBUG) { console.log('pushDataToRequest: body: ' + body); };
  const options = {
    host: utils.DOMAIN,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    path: BASE_PATH +
      '/bots/' +
      encodeURIComponent(botId) +
      '/dynamicEntities/' +
      encodeURIComponent(entityId) +
      '/pushRequests/' +
      encodeURIComponent(pushRequestId) +
      '/values'
  };
  debug('pushDataToRequest: ' + JSON.stringify(options));
  return ociUtils.promisifiedSendRequest(options, body);
}

/*
 * Mark the push request as DONE so that it can start processing patch data,
 * train the entity, and then save the changes. There isn't any response.
 *
 * @param botId
 * @param entityId
 * @param pushRequestId
 * @param abort true | false - optional parameter that when set to true
 * aborts the push request instead of finalizing it.
 *
 */
async function finalizePushRequest (botId, entityId, pushRequestId, abort) {
  let action = 'DONE';
  if (abort) {
    action = 'ABORT';
  }
  const body = '{}';
  const options = {
    host: utils.DOMAIN,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    path: BASE_PATH +
      '/bots/' +
      encodeURIComponent(botId) +
      '/dynamicEntities/' +
      encodeURIComponent(entityId) +
      '/pushRequests/' +
      encodeURIComponent(pushRequestId) +
      '/' + action

  };
  debug('finalizePushRequest: ' + JSON.stringify(options));
  return ociUtils.promisifiedSendRequest(options, body);
}

/*
 * Get push requests
 */
async function getPushRequests (botId, entityId) {
  var options = {
    host: utils.DOMAIN,
    path: BASE_PATH +
      '/bots/' +
      encodeURIComponent(botId) +
      '/dynamicEntities/' +
      encodeURIComponent(entityId) +
      '/pushRequests'
  };
  debug('getPushRequests: ' + JSON.stringify(options));
  return ociUtils.promisifiedSendRequest(options);
}

/*
 * Get push request
 */
async function getPushRequest (botId, entityId, pushRequestId) {
  const options = {
    host: utils.DOMAIN,
    path: BASE_PATH +
      '/bots/' +
      encodeURIComponent(botId) +
      '/dynamicEntities/' +
      encodeURIComponent(entityId) +
      '/pushRequests/' +
      encodeURIComponent(pushRequestId)

  };
  debug('getPushRequest: ' + JSON.stringify(options));
  return ociUtils.promisifiedSendRequest(options);
}

/*
 * Main
 */
const run = async (parameters) => {
  var pushRequestData;
  var botId;
  var entityId;

  try {
    PARAMETERS = parameters;
    DEBUG = (PARAMETERS.debug === undefined) ? false : PARAMETERS.debug;
    PATCH_DATA_PATH = PARAMETERS.datapath;
    if (PATCH_DATA_PATH.indexOf('~/') === 0) { PATCH_DATA_PATH = PATCH_DATA_PATH.replace('~', os.homedir()); };

    botId = await lookupBotId(PARAMETERS.skillname, PARAMETERS.skillversion);
    entityId = await lookupEntityId(botId, PARAMETERS.entityname);
    const pushRequestsList = await getPushRequests(botId, entityId);
    await checkForActiveRequests(pushRequestsList);
    // If replace is true, then copy = false
    pushRequestData = await createPushRequest(botId, entityId, (PARAMETERS.copy === undefined) ? false : PARAMETERS.copy);
    const pushDataResponse = await pushDataToRequest(botId, entityId, pushRequestData.id);
    await finalizePushRequest(botId, entityId, pushRequestData.id);
    const result = await trackStatus(botId, entityId, pushRequestData.id);

    console.log('Total deleted: ' + pushDataResponse.totalDeleted);
    console.log('Total added: ' + pushDataResponse.totalAdded);
    console.log('Total modified: ' + pushDataResponse.totalModified);
    console.log(result);
  } catch (err) {
    // Abort push request in case of failure.
    if (pushRequestData && pushRequestData.id) {
      await finalizePushRequest(botId, entityId, pushRequestData.id, true);
    }
    failureCallback(err);
  };
};
exports.run = run;
