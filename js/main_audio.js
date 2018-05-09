
/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* global AudioContext, SoundMeter */

'use strict';

/*var instantMeter = document.querySelector('#instant meter');
var slowMeter = document.querySelector('#slow meter');
var clipMeter = document.querySelector('#clip meter');

var instantValueDisplay = document.querySelector('#instant .value');
var slowValueDisplay = document.querySelector('#slow .value');
var clipValueDisplay = document.querySelector('#clip .value');*/

var instantValueDisplay = document.querySelector('#instant .value');
var slowValueDisplay = document.querySelector('#slow .value');
var clipValueDisplay = document.querySelector('#clip .value');

try {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    window.audioContext = new AudioContext();
} catch (e) {
    alert('Web Audio API not supported.');
}

// Put variables in global scope to make them available to the browser console.
var constraints = window.constraints = {
    audio: true,
    video: false
};

function handleSuccess(stream) {
    // Put variables in global scope to make them available to the
    // browser console.
    window.stream = stream;
    var soundMeter = window.soundMeter = new SoundMeter(window.audioContext);
    soundMeter.connectToSource(stream, function(e) {
        if (e) {
            alert(e);
            return;
        }

        setInterval(function() {
            instantValueDisplay.innerHTML = soundMeter.instant.toFixed(2);
            /*slowValueDisplay.innerHTML = soundMeter.slow.toFixed(2);
            clipValueDisplay.innerHTML = soundMeter.clip;*/

            pow += soundMeter.instant.toFixed(2) * 50;
        }, 200);
    });
}

function handleError(error) {
    console.log('navigator.getUserMedia error: ', error);
}

navigator.mediaDevices.getUserMedia(constraints).
then(handleSuccess).catch(handleError);
console.log(document.querySelector(".rotate-obj"))




document.addEventListener("touchstart", function(e){
    pow += 2;
});


var rotateObj = document.querySelector(".rotate-obj");
var degreNum = 0;
var spd = 0.2;
var pow = 10;
function update() {
    requestAnimationFrame(update);

    if(pow < 0.0001) {
        pow = 0;
    } else {
        pow = pow * 0.99;
    }

    degreNum = degreNum + (spd + pow);

    rotateObj.style.transform="rotate("+degreNum+"deg)";

    instantValueDisplay.innerHTML = parseInt(pow * 10);
}


update()





