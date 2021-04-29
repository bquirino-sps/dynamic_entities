/**
 * Version 1.0.1
 *
 * Sign and send request.
 *
 * See https://docs.cloud.oracle.com/iaas/Content/API/Concepts/signingrequests.htm
 */

const https = require('https');
const httpSignature = require('http-signature');
const jsSHA = require('jssha');
const utils = require('./utils.js');

/*
 * Send POST, PUT, or PATCH request
 */
function promisifiedSendRequest (options, body) {
  return new Promise((resolve, reject) => {
    var request = https.request(options, function (response) {
      var responseBody = '';
      response.on('data', function (chunk) {
        responseBody += chunk;
      });
      response.on('error', function (error) {
        reject(new Error(error));
      });
      response.on('end', function () {
        if (response.statusCode < 300) {
          (response.headers['content-type'] === 'application/json') ? resolve(JSON.parse(responseBody)) : resolve(responseBody);
        } else {
          if (response.headers['content-type'] === 'application/json') {
            const errorResponse = JSON.parse(responseBody);
            reject(new Error(errorResponse.status + ': ' +
            errorResponse.title + ': ' +
            errorResponse.detail));
          } else {
            reject(new Error(response.statusCode + ': ' + response.statusMessage));
          };
        }
      });
    });
    var signOptions = {
      privateKey: utils.PRIVATE_KEY,
      keyFingerprint: utils.KEY_FINGERPRINT,
      tenancyId: utils.TENANCY_ID,
      userId: utils.AUTH_USER_ID
    };
    if (body) {
      signOptions.body = body;
    }
    ;
    sign(request, signOptions);
    (body) ? request.end(body) : request.end();
    request.on('error', function (error) {
      reject(new Error(error));
    });
  });
}
exports.promisifiedSendRequest = promisifiedSendRequest;

/*
 * Sign request
 */
function sign (request, options) {
  var apiKeyId = options.tenancyId + '/' + options.userId + '/' + options.keyFingerprint;
  var headersToSign = [
    'host',
    'date',
    '(request-target)'
  ];
  var methodsThatRequireExtraHeaders = ['POST', 'PUT', 'PATCH'];
  if (methodsThatRequireExtraHeaders.indexOf(request.method.toUpperCase()) !== -1) {
    options.body = options.body || '';
    var shaObj = new jsSHA('SHA-256', 'TEXT');
    shaObj.update(options.body);
    request.setHeader('Content-Length', options.body.length);
    request.setHeader('x-content-sha256', shaObj.getHash('B64'));
    headersToSign = headersToSign.concat([
      'content-type',
      'content-length',
      'x-content-sha256'
    ]);
  }
  httpSignature.sign(request, {
    key: options.privateKey,
    keyId: apiKeyId,
    headers: headersToSign
  });
  var newAuthHeaderValue = request.getHeader('Authorization').replace('Signature ', 'Signature version="1",');
  request.setHeader('Authorization', newAuthHeaderValue);
}
