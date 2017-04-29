(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define("ShadowHelper", [], factory);
	else if(typeof exports === 'object')
		exports["ShadowHelper"] = factory();
	else
		root["ShadowHelper"] = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// identity function for calling harmony imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


/**
 * @fileoverview shadow-helper.js
 *
 * ShadowHelper is a wrapper around thingShadow abstraction from aws-iot-device-sdk.
 * It simplifies it's original interface with intuitive Promise based API.
 *
 */

var thingShadows = void 0;
var isDebug = void 0;
var thingOpsRegister = {};
var registeredThings = {};

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

  var opData = thingOpsRegister[clientToken];
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

  var opData = thingOpsRegister[clientToken];
  if (!opData || !opData.opCb) {
    console.warn('Unknown operation timeout!', thingName, clientToken);
    return;
  }
  opData.opCb(new Error('timeout occurred for thing "' + thingName + '" (clientToken=' + clientToken + ')'));
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
    isDebug && console.warn(opName + ' operation cannot be performed now');
    rejectCb(new Error('operation in progress or thingShadow not registered'));
    return;
  }

  if (thingOpsRegister[clientToken]) {
    isDebug && console.log('Detected duplicate item in thing operations register (' + clientToken + ')');
    var opData = thingOpsRegister[clientToken];
    if (typeof opData.opCb === 'function') opData.opCb(new Error('duplicate client token detected'));
    thingOpsRegister[clientToken] = null;
  }

  thingOpsRegister[clientToken] = {
    opCb: function opCb(err, data) {
      delete thingOpsRegister[clientToken];
      if (err) return rejectCb(err);
      resolveCb(data);
    }
  };
}

var ShadowHelper = {

  /**
   * Initialize ShadowHelper singleton.
   *
   * @param {awsIot.thingShadow} thingShadowInstance
   * @param {boolean} debug - enables additional logging
   */
  init: function init(thingShadowInstance) {
    var debug = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

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
  registerThingAsync: function registerThingAsync(thingName) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    if (!thingShadows) throw Error('ShadowHelper not initialized');

    return new Promise(function (resolve, reject) {
      if (registeredThings[thingName]) {
        resolve();
        return;
      }

      thingShadows.register(thingName, options, function () {
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
  unregisterThing: function unregisterThing(thingName) {
    delete registeredThings[thingName];
    thingShadows.unregister(thingName);
  },


  /**
   * Promise based wrapper around shadowThing's "get" API.
   *
   * @param {string} thingName
   * @return {Promise}
   */
  getThingAsync: function getThingAsync(thingName) {
    if (!thingShadows) throw Error('ShadowHelper not initialized');
    isDebug && console.info('ShadowHelper->getThingAsync(' + thingName + ')');

    return new Promise(function (resolve, reject) {
      var clientToken = thingShadows.get(thingName);
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
  updateThingAsync: function updateThingAsync(thingName, updateObj) {
    if (!thingShadows) throw Error('ShadowHelper not initialized');
    isDebug && console.info('ShadowHelper->updateThingAsync(' + thingName + ')');

    return new Promise(function (resolve, reject) {
      var clientToken = thingShadows.update(thingName, updateObj);
      opResponseHandler('update', clientToken, resolve, reject);
    });
  },


  /**
   * Promise based wrapper around shadowThing's "delete" API.
   *
   * @param {string} thingName
   * @return {Promise}
   */
  deleteThingAsync: function deleteThingAsync(thingName) {
    if (!thingShadows) throw Error('ShadowHelper not initialized');
    isDebug && console.info('ShadowHelper->deleteThingAsync(' + thingName + ')');

    return new Promise(function (resolve, reject) {
      var clientToken = thingShadows.delete(thingName);
      opResponseHandler('delete', clientToken, resolve, reject);
    });
  }
};

module.exports = ShadowHelper;

/***/ })
/******/ ]);
});
//# sourceMappingURL=index.js.map