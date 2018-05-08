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
var timer = 0;
var randomHArr = [];
var maxLine = 15;
var isLive = true;
var spd = 6;

var gif;


// Put variables in global scope to make them available to the browser console.
var constraints = window.constraints = {
    audio: false,
    // video: true
    video: { facingMode: { exact: "environment" } }
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

    settingGif();
    sortPosition();

    if(isDebug){
        sampleVideo();
        onResize();
        drawCanvas();
    } else {
        onResize();
        drawCanvas();
    }

    // window.addEventListener("click", sortPosition)

    var container = document.querySelector("#container");
    container.addEventListener("touchstart", captureImage);

    var btnShow = document.querySelector(".js-btn-show");
    btnShow.addEventListener("touchstart", showSq);

    var btnReset = document.querySelector(".js-btn-reset");
    btnReset.addEventListener("touchstart", reset);

    var btnGif = document.querySelector(".js-btn-save");
    btnGif.addEventListener("touchstart", showGif);

}

function settingGif(){
    gif = new GIF({
        workers: 2,
        quality: 5
    });

    gif.on('finished', function(blob) {
        window.open(URL.createObjectURL(blob));
    });
}

var saveImgArr = [];
var saveImgIndex = 0;
var directSq = 1;

function showSq(){
    saveImgArr = document.querySelectorAll(".wrapper-capture img");
    if(saveImgArr.length == 0) return;

    var con = document.querySelector(".wrapper-capture");
    con.classList.add("hidden");

    isLive = false;

}

function reset(){
    var con = document.querySelector(".wrapper-capture");
    con.classList.remove("hidden");
    con.innerHTML = "";
    saveImgArr = [];
    saveImgIndex = 0;

    isLive = true;
}


function showGif(){

    gif.render();
}





function captureImage(){
    var container = document.querySelector(".wrapper-capture");

    var img = document.createElement('img');

    img.src = canvas.toDataURL();
    container.appendChild(img);

    // gif.addFrame(img);
    // gif.addFrame(ctx, {delay: 1, copy: true});
    // gif.addFrame(canvas, {delay: 100});


}

function sortPosition(){
    randomHArr = [];
    for(var j=0 ; j<maxLine ; j++){
        randomHArr.push(j);
    }
    randomHArr.sort(function() { return 0.5 - Math.random() });
}


function sampleVideo(){
    video.setAttribute("src", "./video/test_v0.mp4");
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

    // console.log(document.body.clientHeight, window.innerHeight )
}


function drawCanvas(){
    window.requestAnimationFrame(drawCanvas);
    onResize();

    // console.log(video.videoWidth)

    timer++;

    var per = (video.videoHeight/video.videoWidth);
    var posiX = 0;
    var posiY = 0;
    var drawW = canvas.width;
    var drawH = canvas.width * per;
    if(video.videoWidth > video.videoHeight){
        //h
        per = (video.videoWidth/video.videoHeight);
        drawW = canvas.height* per;
        drawH = canvas.height;

        posiX = (drawW-canvas.width)*-0.5;

    } else {
        //v
        per = (video.videoHeight/video.videoWidth);
        drawW = canvas.width;
        drawH = canvas.width * per;
    }

    if(isLive){
        // ctx.globalAlpha = 0.02
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0, video.videoWidth,  video.videoHeight, posiX, posiY, drawW, drawH);
    } else {
        // ctx.globalAlpha = 1;

        var img = saveImgArr[saveImgIndex];
        if(timer % spd == 0){
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            if(directSq == 1){
                saveImgIndex = saveImgIndex + 1;
                if(saveImgIndex == saveImgArr.length){
                    directSq = -1;
                    saveImgIndex = saveImgArr.length-2;
                }
            } else {
                saveImgIndex = saveImgIndex - 1;
                if(saveImgIndex < 0){
                    directSq = 1;
                    saveImgIndex = 1;
                }
            }

            // saveImgIndex = (saveImgIndex+1) % saveImgArr.length
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }





    }






}


























function drawCanvas_zigzag(){
    window.requestAnimationFrame(drawCanvas);

    timer++;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // ctx.drawImage(video, 0, 0, video.videoWidth,  video.videoHeight, 0, 0, canvas.width, canvas.height);


    var particleNum = maxLine;

    var per = 0.3;
    var particleH = Math.ceil(canvas.height / particleNum);
    var ran = 0;
    var ran_gap = 20;



    for (var i = 0; i < particleNum; i++) {
        ran = ran_gap;

        if(i%2){
            ctx.drawImage(video,
                0, (video.videoHeight/particleNum)*i, video.videoWidth,  video.videoHeight/particleNum,
                0, (canvas.height/particleNum)*randomHArr[i], canvas.width, canvas.height/particleNum);
        } else {
            ctx.drawImage(video,
                0, (video.videoHeight/particleNum)*i, video.videoWidth,  video.videoHeight/particleNum,
                -0, (canvas.height/particleNum)*randomHArr[i], canvas.width, canvas.height/particleNum);
            // ctx.drawImage(video, 0, 0, video.videoWidth,  video.videoHeight, 0, 0, canvas.width, canvas.height);
        }
    }




    // if ( segment ) { segment.update() }
    // if ( texture ) { texture.update(); }

    // renderer.render(stage);


}










