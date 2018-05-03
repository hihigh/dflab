/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

var errorElement = document.querySelector('#errorMsg');
var video = document.querySelector('video');
var isLoaded = false;
var timer;

// Put variables in global scope to make them available to the browser console.
var constraints = window.constraints = {
    audio: false,
    video: true
};

function handleSuccess(stream) {
    var videoTracks = stream.getVideoTracks();
    console.log('Got stream with constraints:', constraints);
    console.log('Using video device: ' + videoTracks[0].label);
    stream.oninactive = function() {
        console.log('Stream inactive');
    };
    window.stream = stream; // make variable available to browser console
    video.srcObject = stream;

    readyStart();


}

function handleError(error) {
    if (error.name === 'ConstraintNotSatisfiedError') {
        errorMsg('The resolution ' + constraints.video.width.exact + 'x' +
            constraints.video.width.exact + ' px is not supported by your device.');
    } else if (error.name === 'PermissionDeniedError') {
        errorMsg('Permissions have not been granted to use your camera and ' +
            'microphone, you need to allow the page access to your devices in ' +
            'order for the demo to work.');
    }
    errorMsg('getUserMedia error: ' + error.name, error);

    readyStart(true);
}

function errorMsg(msg, error) {
    // errorElement.innerHTML += '<p>' + msg + '</p>';
    if (typeof error !== 'undefined') {
        console.error(error);
    }
}

function readyStart(isDebug){
    video.classList.add("add");

    if(isDebug){
        sampleVideo();
        onResize();
        drawCanvas();
    } else {
        onResize();
        drawCanvas();
    }

    timer = setInterval(checkVideoLoad, 100)
}

function checkVideoLoad(){

    if(video.videoWidth != 0){
        isLoaded = true;
        clearInterval(timer);

        loadTexture();
    }

}


function sampleVideo(){
    video.setAttribute("src", "./video/test.mp4");
    video.load();


}

navigator.mediaDevices.getUserMedia(constraints).
then(handleSuccess).catch(handleError);




//canvas
var canvas = document.getElementById('draw-canvas');
var ctx = canvas.getContext('2d');

function onResize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}



function drawCanvas(){
    window.requestAnimationFrame(drawCanvas);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // ctx.drawImage(video, 0, 0, video.videoWidth,  video.videoHeight, 0, 0, canvas.width, canvas.height);


    var particleNum = 20;

    var per = 0.3;
    var particleH = Math.ceil(canvas.height / particleNum);
    var ran = 0;
    var ran_gap = 30;

    for (var i = 0; i < particleNum; i++) {
        ran = ran_gap;

        if(i%2){
            ctx.drawImage(video,
                0, (video.videoHeight/particleNum)*i, video.videoWidth,  video.videoHeight/particleNum,
                ran_gap, (canvas.height/particleNum)*i, canvas.width, canvas.height/particleNum);
        } else {
            ctx.drawImage(video,
                0, (video.videoHeight/particleNum)*i, video.videoWidth,  video.videoHeight/particleNum,
                -ran_gap, (canvas.height/particleNum)*i, canvas.width, canvas.height/particleNum);
            // ctx.drawImage(video, 0, 0, video.videoWidth,  video.videoHeight, 0, 0, canvas.width, canvas.height);
        }
    }




    // if ( segment ) { segment.update() }
    // if ( texture ) { texture.update(); }

    // renderer.render(stage);


}










