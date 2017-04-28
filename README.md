# AWS IoT thingShadow Helper Library

## Overview
Helper library which aims to simplify the usage of not so intuitive AWS
IoT thingShadow API. The library is designed as a wrapper around
[aws-iot-device-sdk](https://github.com/aws/aws-iot-device-sdk-js) and it
targets thingShadow API only.

This library provides more intuitive, promise based API for thingShadow's
"register"/"unregister", "get", "update" and "delete" operations.

## Install

```
npm install aws-iot-device-sdk
npm install aws-shadow-helper
```

## Usage Examples

```
const AWSIoT = require('aws-iot-device-sdk');
const ShadowHelper = require('aws-shadow-helper');

// see aws-iot-device-sdk for details about thingShadow setup
const thingShadow = AWSIoT.thingShadow({
  region: 'add-region-here',
  clientId: 'test-client-id',
  protocol: 'wss',
  maximumReconnectTimeMs: 3000,
  debug: true,
  accessKeyId: '',
  secretKey: '',
  sessionToken: ''
});

ShadowHelper.init(thingShadow);

async function shadowUsageSample() {
    // register
    await ShadowHelper.registerThingAsync('my-thing');

    // now you can listen to standard "delta" event for shadow updates

    // get
    let myThing = await ShadowHelper.getThingAsync('my-thing');

    // update
    await ShadowHelper.updateThingAsync(thingName, {
      state: {
        desired: {
          myThingState: 'new state'
        }
      }
    });

    // delete
    await ShadowHelper.deleteThingAsync('my-thing');

    // unregister
    ShadowHelper.unregisterThing('my-thing')
}
```

## API Docs
  * [ShadowHelper.init](#init)
  * [ShadowHelper.registerThingAsync](#register)
  * [ShadowHelper.unregisterThing](#unregister)
  * [ShadowHelper.getThingAsync](#get)
  * [ShadowHelper.updateThingAsync](#update)
  * [ShadowHelper.deleteThingAsync](#delete)


### <a name="init">ShadowHelper.init(thingShadow : awsIoT.thingShadow) : void</a>
Initialize ShadowHelper with the instance of awsIot.thingShadow class.
The rest of ShadowHelper's API can be used immediately after initialization.

### <a name="register">ShadowHelper.registerThingAsync(thingName: string, [options]: Object): Promise\<void\></a>
Promisified version of [awsIot.thingShadow#register](https://github.com/aws/aws-iot-device-sdk-js#register) method.
Additionally, it is extended to resolve the promise in the case when given
thingName is already registered. Now, it is transparent if a thingName is
already registered or not. Original API doesn't invoke a callback if thingName
is already registered and there is no way to detect if it is registered or not.

See the [original API docs](https://github.com/aws/aws-iot-device-sdk-js#register) for information about input parameters.

### <a name="unregister">ShadowHelper.unregisterThing(thingName: string): void</a>
If a thingName is registered with ShadowHelper.registerThingAsync API,
this method has to be used to unregister it, in order to clean internal
state.

See the [original API docs](https://github.com/aws/aws-iot-device-sdk-js#unregister) for more information.

### <a name="get">ShadowHelper.getThingAsync(thingName: string): Promise</a>
Promisified version of [awsIot.thingShadow#get](https://github.com/aws/aws-iot-device-sdk-js#get) method.
Instead of returning a clientToken, this API returns a promise which is
resolved or rejected depending on the operation outcome ... as usual. It
completely abstracts away logic related to clientToken, so you don't need
to worry about.

### <a name="update">ShadowHelper.updateThingAsync(thingName: string, stateObj: object): Promise</a>
Promisified version of [awsIot.thingShadow#update](https://github.com/aws/aws-iot-device-sdk-js#update) method.
Instead of returning a clientToken, this API returns a promise which is
resolved or rejected depending on the operation outcome ... as usual. It
completely abstracts away logic related to clientToken, so you don't need
to worry about.

### <a name="delete">ShadowHelper.deleteThingAsync(thingName: string): Promise</a>
Promisified version of [awsIot.thingShadow#delete](https://github.com/aws/aws-iot-device-sdk-js#delete) method.
Instead of returning a clientToken, this API returns a promise which is
resolved or rejected depending on the operation outcome ... as usual. It
completely abstracts away logic related to clientToken, so you don't need
to worry about.
