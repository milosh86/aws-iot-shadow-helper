/**
 * @fileoverview shadow-helper.js
 *
 * ShadowHelper is a wrapper around thingShadow abstraction from aws-iot-device-sdk.
 * It simplifies it's original interface with intuitive Promise based API.
 *
 */

let thingShadows;
let isDebug;
let thingOpsRegister = {};
let registeredThings = {};

/**
 * Private handler for thingShadow's "status" event. It is used to detect the
 * outcome of shadow's operations, and based on that, to resolve or reject a
 * corresponding promise.
 *
 * @param {string} thingName
 * @param {"accepted" | "rejected"} opStatus
 * @param {string} clientToken
 * @param {Object} stateObject
 *
 * @private
 */
function statusHandler(thingName, opStatus, clientToken, stateObject) {
  isDebug && console.info('New status received', thingName, opStatus, clientToken, stateObject);

  let opData = thingOpsRegister[clientToken];
  if (!opData || !opData.opCb) {
    console.warn('Unknown status message!', clientToken, opData);
    return;
  }

  if (opStatus === 'accepted') {
    opData.opCb(null, stateObject);
  } else {
    // rejected
    opData.opCb(new Error('operation rejected'));
  }
}

/**
 * Private handler for thingShadow's "timeout" event. It is used to reject a
 * promise for a expired operation.
 *
 * @param {string} thingName
 * @param {string} clientToken
 *
 * @private
 */
function timeoutHandler(thingName, clientToken) {
  isDebug && console.info('Timeout received', thingName, clientToken);

  let opData = thingOpsRegister[clientToken];
  if (!opData || !opData.opCb) {
    console.warn('Unknown operation timeout!',thingName, clientToken);
    return;
  }
  opData.opCb(new Error(`timeout occurred for thing "${thingName}" (clientToken=${clientToken})`));
}

/**
 * Update "thingOpsRegister" for a given operation.
 *
 * @param opName
 * @param clientToken
 * @param resolveCb
 * @param rejectCb
 *
 * @private
 */
function opResponseHandler(opName, clientToken, resolveCb, rejectCb) {
  if (!clientToken) {
    isDebug && console.warn(`${opName} operation cannot be performed now`);
    rejectCb(new Error('operation in progress or thingShadow not registered'));
    return;
  }

  if (thingOpsRegister[clientToken]) {
    isDebug && console.log(`Detected duplicate item in thing operations register (${clientToken})`);
    let opData = thingOpsRegister[clientToken];
    if (typeof opData.opCb === 'function') opData.opCb(new Error('duplicate client token detected'));
    thingOpsRegister[clientToken] = null;
  }

  thingOpsRegister[clientToken] = {
    opCb: function (err, data) {
      delete thingOpsRegister[clientToken];
      if (err) return rejectCb(err);
      resolveCb(data);
    }
  };
}

const ShadowHelper = {

  /**
   * Initialize ShadowHelper singleton.
   *
   * @param {awsIot.thingShadow} thingShadowInstance
   * @param {boolean} debug - enables additional logging
   */
  init(thingShadowInstance, debug=false) {
    isDebug = debug;

    if (thingShadows) {
      thingShadows.removeListener('status', statusHandler);
      thingShadows.removeListener('timeout', timeoutHandler);
    }

    thingShadows = thingShadowInstance;
    thingOpsRegister = {};
    thingShadows.on('status', statusHandler);
    thingShadows.on('timeout', timeoutHandler);
  },

  /**
   * Wrapper around thingShadow's register API. It extends it a bit. Now, it is
   * transparent if a Thing is already registered or not. Original API doesn't
   * call a callback if Thing is already registered and there is no way to detect
   * if a Thing is registered or not.
   *
   * @param {string} thingName
   * @param {Object=} options
   * @return {Promise}
   */
  registerThingAsync(thingName, options={}) {
    if (!thingShadows) throw Error('ShadowHelper not initialized');

    return new Promise((resolve, reject) => {
      if (registeredThings[thingName]) {
        resolve();
        return;
      }

      thingShadows.register(thingName, options, () => {
        registeredThings[thingName] = true;
        resolve();
      });
    });
  },

  /**
   * If Things are registered with "registerThingAsync", this method has to be
   * used to unregister it.
   *
   * @param thingName
   */
  unregisterThing(thingName) {
    delete registeredThings[thingName];
    thingShadows.unregister(thingName);
  },

  /**
   * Promise based wrapper around shadowThing's "get" API.
   *
   * @param {string} thingName
   * @return {Promise}
   */
  getThingAsync(thingName) {
    if (!thingShadows) throw Error('ShadowHelper not initialized');
    isDebug && console.info(`ShadowHelper->getThingAsync(${thingName})`);

    return new Promise((resolve, reject) => {
      let clientToken = thingShadows.get(thingName);
      opResponseHandler('get', clientToken, resolve, reject);
    });
  },

  /**
   * Promise based wrapper around shadowThing's "update" API.
   *
   * @param {string} thingName
   * @param {Object} updateObj
   * @return {Promise}
   */
  updateThingAsync(thingName, updateObj) {
    if (!thingShadows) throw Error('ShadowHelper not initialized');
    isDebug && console.info(`ShadowHelper->updateThingAsync(${thingName})`);

    return new Promise((resolve, reject) => {
      let clientToken = thingShadows.update(thingName, updateObj);
      opResponseHandler('update', clientToken, resolve, reject);
    });
  },

  /**
   * Promise based wrapper around shadowThing's "delete" API.
   *
   * @param {string} thingName
   * @return {Promise}
   */
  deleteThingAsync(thingName) {
    if (!thingShadows) throw Error('ShadowHelper not initialized');
    isDebug && console.info(`ShadowHelper->deleteThingAsync(${thingName})`);

    return new Promise((resolve, reject) => {
      let clientToken = thingShadows.delete(thingName);
      opResponseHandler('delete', clientToken, resolve, reject);
    });
  }

};

module.exports = ShadowHelper;
