/*global document,$,window,io */
/*
  Copyright (c) 2017 Julian Knight (Totally Information)

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

var debug = true,
    ioChannels = {control: 'uiBuilderControl', client: 'uiBuilderClient', server: 'uiBuilder'},
    msgCounter = {control: 0, sent: 0, data: 0},
    msg = {},
    cookies = [],
    ioNamespace = '/' + readCookie('uibuilder-namespace'),
    socket,
    retryMs = 2000, // retry ms period for manual socket reconnections workaround
    timerid

// When JQuery is ready, update
$( document ).ready(function() {
    debug && console.log('Document Ready: IO Namespace: ' + ioNamespace)

    // Create the socket - make sure client uses Socket.IO version from the uibuilder module (using path)
    socket = io(ioNamespace, {
        path: '/uibuilder/socket.io',
        transports: ['polling', 'websocket']
    })

    $('#msgsReceived').text(msgCounter.data)
    $('#msgsControl').text(msgCounter.control)
    $('#msgsSent').text(msgCounter.sent)
    $('#showMsg').text(JSON.stringify(msg))

    // When the socket is connected .................
    socket.on('connect', function() {
        debug && console.log('SOCKET CONNECTED - Namespace: ' + ioNamespace)

        // Reset any reconnect timers
        if (timerid) {
            window.clearTimeout(timerid)
            retryMs = 2000
            timerid = null
        }

        // When Node-RED uibuilder template node sends a msg over Socket.IO...
        socket.on(ioChannels.server, function(recievedMsg) {
            debug && console.info('uibuilder:socket.connect:socket.on.data - msg received - Namespace: ' + ioNamespace)
            //console.dir(wsMsg)

            // Make sure that msg is an object & not null
            if ( recievedMsg === null ) {
                recievedMsg = {}
            } else if ( typeof recievedMsg !== 'object' ) {
                recievedMsg = { 'payload': recievedMsg }
            }

            // Save the msg for further processing
            msg = recievedMsg

            // Track how many messages have been recieved
            msgCounter.data++
            $('#msgsReceived').text(msgCounter.data)
            $('#showMsg').text(JSON.stringify(msg))

            // TODO: Add a check for a pre-defined global function here
            //       to make it easier for users to add their own code
            //       to process reciept of new msg
            //       OR MAYBE use msg.prototype to add a function?

            // Test auto-response
            if (debug) {
                sendMsg({payload: 'We got a message from you, thanks'})
            }

        }) // -- End of websocket recieve DATA msg from Node-RED -- //

        // Recieve a CONTROL msg from Node-RED
        socket.on(ioChannels.control, function(recievedCtrlMsg) {
            debug && console.info('uibuilder:socket.connect:socket.on.control - msg received - Namespace: ' + ioNamespace)
            //console.dir(wsMsg)


            // Make sure that msg is an object & not null
            if ( recievedCtrlMsg === null ) {
                recievedCtrlMsg = {}
            } else if ( typeof recievedCtrlMsg !== 'object' ) {
                recievedCtrlMsg = { 'payload': recievedCtrlMsg }
            }

            msgCounter.control++
            $('#msgsControl').text(msgCounter.control)
            $('#showMsg').text(JSON.stringify(recievedCtrlMsg))

            switch(recievedCtrlMsg.type) {
                case 'shutdown':
                    // We are shutting down
                    break
                case 'connected':
                    // We are connected to the server
                    break
                default:
                    // Anything else
            }

            // Test auto-response
            if (debug) {
                sendMsg({payload: 'We got a control message from you, thanks'})
            }

        }) // -- End of websocket recieve CONTROL msg from Node-RED -- //

    }) // --- End of socket connection processing ---

    // When the socket is disconnected ..............
    socket.on('disconnect', function(reason) {
        // reason === 'io server disconnect' - redeploy of Node instance
        // reason === 'transport close' - Node-RED terminating
        debug && console.log('SOCKET DISCONNECTED - Namespace: ' + ioNamespace + ', Reason: ' + reason)

        // A workaround for SIO's failure to reconnect after a NR redeploy of the node instance
        if ( reason === 'io server disconnect' ) {
            if (timerid) window.clearTimeout(timerid) // we only want one running at a time
            timerid = window.setTimeout(function(){
                debug && console.log('Manual SIO reconnect attempt, timeout: ' + retryMs)
                socket.connect() // Try to reconnect
                retryMs = retryMs + 1000 // extend timer for next time round
            }, retryMs)
        }
    }) // --- End of socket disconnect processing ---

    /* We really don't need these, just for interest
        socket.on('connect_error', function(err) {
            debug && console.log('SOCKET CONNECT ERROR - Namespace: ' + ioNamespace + ', Reason: ' + err.message)
            //console.dir(err)
        }) // --- End of socket connect error processing ---
        socket.on('connect_timeout', function(data) {
            debug && console.log('SOCKET CONNECT TIMEOUT - Namespace: ' + ioNamespace)
            console.dir(data)
        }) // --- End of socket connect timeout processing ---
        socket.on('reconnect', function(attemptNum) {
            debug && console.log('SOCKET RECONNECTED - Namespace: ' + ioNamespace + ', Attempt #: ' + attemptNum)
        }) // --- End of socket reconnect processing ---
        socket.on('reconnect_attempt', function(attemptNum) {
            debug && console.log('SOCKET RECONNECT ATTEMPT - Namespace: ' + ioNamespace + ', Attempt #: ' + attemptNum)
        }) // --- End of socket reconnect_attempt processing ---
        socket.on('reconnecting', function(attemptNum) {
            debug && console.log('SOCKET RECONNECTING - Namespace: ' + ioNamespace + ', Attempt #: ' + attemptNum)
        }) // --- End of socket reconnecting processing ---
        socket.on('reconnect_error', function(err) {
            debug && console.log('SOCKET RECONNECT ERROR - Namespace: ' + ioNamespace + ', Reason: ' + err.message)
            //console.dir(err)
        }) // --- End of socket reconnect_error processing ---
        socket.on('reconnect_failed', function(data) {
            debug && console.log('SOCKET RECONNECT FAILED - Namespace: ' + ioNamespace)
            console.dir(data)
        }) // --- End of socket reconnect_failed processing ---
        socket.on('ping', function() {
            debug && console.log('SOCKET PING - Namespace: ' + ioNamespace)
        }) // --- End of socket ping processing ---
        socket.on('pong', function(data) {
            debug && console.log('SOCKET PONG - Namespace: ' + ioNamespace + ', Data: ' + data)
        }) // --- End of socket pong processing ---
    */
});

// ----- UTILITY FUNCTIONS ----- //
// send a msg back to Node-RED, NR will generally expect the msg to contain a payload topic
var sendMsg = function(msgToSend) {
    // Track how many messages have been sent
    msgCounter.sent++
    $('#msgsSent').text(msgCounter.sent)
    $('#showMsgSent').text(JSON.stringify(msgToSend))

    socket.emit(ioChannels.client, msgToSend)
} // --- End of Send Msg Fn --- //

function readCookie(name,c,C,i){
    // @see http://stackoverflow.com/questions/5639346/what-is-the-shortest-function-for-reading-a-cookie-by-name-in-javascript
    if(cookies.length > 0){ return cookies[name]; }

    c = document.cookie.split('; ');
    cookies = {};

    for(i=c.length-1; i>=0; i--){
        C = c[i].split('=');
        cookies[C[0]] = C[1];
    }

    return cookies[name];
}
// ----------------------------- //

// EOF
