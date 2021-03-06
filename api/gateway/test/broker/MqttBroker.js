// TEST LIBS
const assert = require('assert');
const Rx = require('rxjs');
const uuidv4 = require('uuid/v4');

//LIBS FOR TESTING
const MqttBroker = require('../../broker/MqttBroker');

//GLOABAL VARS to use between tests
let mqttBroker = {};
let payload = { a: 1, b: 2, c: 3 };


/*
NOTES:
before run please start mqtt:
  docker run -it -p 1883:1883 -p 9001:9001 eclipse-mosquitto  
*/

describe('MQTT BROKER', function () {
    describe('Prepare mqtt broker', function () {
        it('instance MqttBroker', function (done) {
            //ENVIRONMENT VARS
            const brokerUrl = 'mqtt://localhost:1883';
            const projectId = 'test';
            const eventsTopic = 'events';
            mqttBroker = new MqttBroker({
                gatewayRepliesTopic: 'gateway-replies-test',
                projectId: 'test',
                mqttServerUrl: 'mqtt://localhost:1883',
                replyTimeout: 2000
            });
            assert.ok(true, 'MqttBroker constructor worked');
            return done();
        });
    });
    describe('Publish and listent on MQTT', function () {
        it('Publish and recive response using forward$ + getMessageReply$', function (done) {
            mqttBroker.forward$('Test', 'Test', payload)
                .switchMap((sentMessageId) => Rx.Observable.forkJoin(
                    //listen for the reply
                    mqttBroker.getMessageReply$(sentMessageId, 1800, false),

                    //send a dummy reply, but wait a litle bit before send it so the listener is ready
                    Rx.Observable.of({})
                        .delay(200)
                        .switchMap(() => mqttBroker.forward$('gateway-replies-test', 'Test', { x: 1, y: 2, z: 3 }, { correlationId: sentMessageId }))

                )).subscribe(
                    ([response, sentResponseMessageId]) => {
                        assert.deepEqual(response, { x: 1, y: 2, z: 3 });
                    },
                    error => {
                        return done(new Error(error));
                    },
                    () => {
                        return done();
                    }
                );
        });
        it('Publish and recive response using forwardAndGetReply$', function (done) {

            const messageId = uuidv4();
            Rx.Observable.forkJoin(
                //send payload and listen for the reply
                mqttBroker.forwardAndGetReply$('Test','Test', payload, 1800, false, { messageId }),

                //send a dummy reply, but wait a litle bit before send it so the listener is ready
                Rx.Observable.of({})
                    .delay(200)
                    .switchMap(() => mqttBroker.forward$('gateway-replies-test','Test', { x: 1, y: 2, z: 3 }, { correlationId: messageId }))
            ).subscribe(
                ([response, sentResponseMessageId]) => {
                    assert.deepEqual(response, { x: 1, y: 2, z: 3 });
                },
                error => {
                    return done(new Error(error));
                },
                () => {
                    return done();
                }
            );
        });
    });
    describe('de-prepare mqtt broker', function () {
        it('stop MqttBroker', function (done) {
            mqttBroker.disconnectBroker();
            assert.ok(true, 'MqttBroker stoped');
            return done();
        });
    });
});
