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


    loadTexture();

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
    ctx.drawImage(video, 0, 0, video.videoWidth,  video.videoHeight, 0, 0, canvas.width, canvas.height);

    if ( segment ) { segment.update() }
    renderer.render(stage);
    if ( texture ) { texture.update(); }
    // texture.update()


}













var mesh;
var segment;
var spacingX = 5;
var spacingY = spacingX;

//canvas size
var stageW = window.innerWidth;
var stageH = window.innerHeight;

var resizePer = 1;

var options = {
    pointsX: 20,
    pointsY: 20 * 1.7,

    pointCount: 2000
};

/*////////////////////////////////////////*/

var stage = new PIXI.Container();

PIXI.settings.RESOLUTION = window.devicePixelRatio;
var renderer = PIXI.autoDetectRenderer(stageW, stageH, { transparent: true });

var root = document.querySelector("#root");
root.appendChild(renderer.view);
renderer.render(stage);

var texture;





function loadTexture() {
    texture = PIXI.Texture.fromCanvas(canvas);
    setPlane(texture);
}



function setPlane(texture){
    if ( mesh ) { stage.removeChild(mesh); }

    mesh = new PIXI.mesh.Plane( texture, options.pointsX, options.pointsY);

    resizePer = stageH/texture.height;

    mesh.width = texture.width * resizePer;
    mesh.height = texture.height * resizePer;

    mesh.x = ( stageW - mesh.width ) * 0.5;
    mesh.y = ( stageH - mesh.height ) * 0.5;

    spacingX = mesh.width / (options.pointsX-1);
    spacingY = mesh.height / (options.pointsY-1);

    segment = new Segment(options.pointsX-1, options.pointsY-1);

    stage.addChildAt(mesh,0);

}
















/* **************************************
* Class
************************************** */

class Segment {
    constructor(segmentX, segmentY){
        this.points = [];

        let startX = 0;
        let startY = 0;

        for (let y = 0; y <= segmentY; y++) {
            for (let x = 0; x <= segmentX; x++) {
                let point = new Point(startX + x * spacingX, startY + y * spacingY)
                this.points.push(point)
            }
        }
    }

    randomize(range){
        this.points.forEach((point,i) => {
            point.randomize(range);
    })
    }

    update(delta){
        this.points.forEach(this.calcuFunc);
    }

    calcuFunc(point , idx){
        let index = idx * 2;


        var min = (options.pointsX*2);
        var max = ((options.pointsX*options.pointsY)*2)-min;

        if(index > min && index < max){
            mesh.vertices[index] = point.x/resizePer;
            mesh.vertices[index+1] = point.y/resizePer;
        }



    }

    reset(){
        this.points.forEach((point) => {
            point.reset()
    })
    }


}


const ease = Elastic.easeOut.config(2, 0.4);

class Point {
    constructor(x, y){
        this.x = this.origX = x;
        this.y = this.origY = y;
        this.init();
    }

    init(){
        this.randomize();
        this.x = mesh.width/2;
        this.y = mesh.height/2;
    }

    animateTo(nx, ny, force, callback) {
        let dx = nx - this.x
        let dy = ny - this.y

        let dist = Math.sqrt(dx * dx + dy * dy)

        let delay = !force ? 0 : Math.random()*0.7;
        let time = Math.min(1.25, Math.max(0.4, dist / 40) )

        TweenMax.killTweensOf(this);
        TweenMax.to(this, time*2, {x: nx, y: ny, ease:ease, delay:delay});
    }


    randomize(range){
        let gap = 60;
        if(range) gap = range;

        let nx = this.origX + ((Math.random() * gap) - gap*0.5);
        let ny = this.origY + ((Math.random() * gap) - gap*0.5);

        this.animateTo(nx, ny);
    }

    reset(){
        this.animateTo(this.origX, this.origY, true);
    }

}













