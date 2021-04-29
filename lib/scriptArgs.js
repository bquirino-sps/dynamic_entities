'use strict';
/**
 * Copyright © 2019, Oracle and/or its affiliates. All rights reserved.
 * The Universal Permissive License (UPL), Version 1.0
 *
 * Version 1.0.1
 * @author Chris Kutler
 *
 * Functions to define and process the runtime arguments and to define prompts for missing required arguments.
*/

const fs = require('fs');
const os = require('os');
const argv = require('argv');

/*
 * Gets the script arguments.
 *
 * Returns data object with these properties
 *   options: argument options
 *   input: The result from argv.option(argvOptions).run();
 */
const getScriptArguments = async () => {
  try {
    argv.info('Update a dynamic entity using information from a JSON file.');
    const argvOptions = [{
      name: 'skillname',
      short: 's',
      type: 'string',
      description: 'Name of the skill that contains the entity.'
    },
    {
      name: 'skillversion',
      short: 'v',
      type: 'string',
      description: 'Version of skill.'
    },
    {
      name: 'entityname',
      short: 'e',
      type: 'string',
      description: 'Entity to modify.'
    },
    {
      name: 'datapath',
      short: 'd',
      type: 'string',
      description: 'Full path to the entity data patch file.'
    },
    {
      name: 'configpath',
      short: 'c',
      type: 'string',
      description: 'Full path to the OCI configuration file.'
    },
    {
      name: 'copy',
      type: 'boolean',
      description: '(Optional) Retain the original value set. Don\'t replace it.',
      example: '--copy'
    },
    {
      name: 'debug',
      type: 'boolean',
      description: '(Optional) Print debug messages.',
      example: '--debug'
    }
    ];
    const args = {};
    args.input = argv.option(argvOptions).run();
    args.options = argvOptions;
    return args;
  } catch (err) {
    console.log(err);
  };
};

/*
  * Compiles prompts for required run parameters that weren't supplied in the script args
  *
  * Returns questions for inquirer.prompt
  *
  * @parm argvOptions - argvOptions object for argv.option(argvOptions).run()
  * @parm inputArgs - the result of calling argv.option(argvOptions).run().
  *   That is, the actual args that the user ran the script with.
  */
function getPromptQuestions (argvOptions, inputArgs) {
  var questions = [];
  for (var argI in argvOptions) {
    if (inputArgs[argvOptions[argI].name] === undefined) {
      switch (argvOptions[argI].name) {
        case 'skillname':
          questions.push({
            name: 'skillname',
            type: 'input',
            message: 'Skill name:',
            validate: function (value) {
              if (value.length) {
                return true;
              } else {
                return 'Please enter the skill name.';
              }
            }
          });
          break;
        case 'skillVersion':
          questions.push({
            name: 'skillversion',
            type: 'input',
            message: 'Enter the skill version:',
            validate: function (value) {
              if (value.length) {
                return true;
              } else {
                return 'Please provide a skill version.';
              }
            }
          });
          break;
        case 'entityname':
          questions.push({
            name: 'entityname',
            type: 'input',
            message: 'Entity name:',
            validate: function (value) {
              if (value.length) {
                return true;
              } else {
                return 'Please enter the entity name.';
              }
            }
          });
          break;
        case 'datapath':
          questions.push({
            name: 'datapath',
            type: 'input',
            message: 'Full patch file path:',
            validate: function (value) {
              if (value.length) {
                const path = (value.indexOf('~/') === 0) ? value.replace('~', os.homedir()) : value;
                if (!fs.existsSync(path)) {
                  return value + ' doesn\'t exist.';
                }
                return true;
              } else {
                return 'Please enter the full patch file path.';
              }
            }
          });
          break;
        case 'configpath':
          questions.push({
            name: 'configpath',
            type: 'input',
            message: 'Full config file path:',
            validate: function (value) {
              if (value.length) {
                const path = (value.indexOf('~/') === 0) ? value.replace('~', os.homedir()) : value;
                if (!fs.existsSync(path)) {
                  return value + ' doesn\'t exist.';
                }
                return true;
              } else {
                return 'Please enter the full configuration file path.';
              }
            }
          });
          break;
      };
    };
  };
  return questions;
};

exports.getArguments = getScriptArguments;
exports.getPromptQuestions = getPromptQuestions;
