/* Copyright 2013 Chris Wilson

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

window.AudioContext = window.AudioContext || window.webkitAudioContext;

var audioContext = new AudioContext();
var audioInput = null,
    realAudioInput = null,
    inputPoint = null,
    audioRecorder = null;
var rafID = null;
var analyserContext = null;
var canvasWidth, canvasHeight;


var buflen = 1024;
var buf = new Float32Array( buflen );


function updateAnalysers(time) {
    if (!analyserContext) {
        var canvas = document.getElementById("analyser");
        canvasWidth = canvas.width;
        canvasHeight = canvas.height;
        analyserContext = canvas.getContext('2d');
    }

    // analyzer draw code here
    {
        var SPACING = 10;
        var BAR_WIDTH = 5;
        var numBars = Math.round(3000 / SPACING);
        var freqByteData = new Uint8Array(analyserNode.frequencyBinCount);

        analyserNode.getByteFrequencyData(freqByteData);

        analyserContext.clearRect(0, 0, canvasWidth, canvasHeight);
        analyserContext.lineWidth = 1;
        analyserContext.stroke();
        // analyserContext.strokeStyle = 'red';
        // analyserContext.fillStyle = '#F6D565';
        // analyserContext.lineCap = 'round';
        var multiplier = analyserNode.frequencyBinCount / numBars;



        // Draw rectangle for each frequency bin.
        for (var i = 0; i < numBars; ++i) {
            var magnitude = 0;
            var offset = Math.floor( i * multiplier );

            // gotta sum/average the block, or we miss narrow-bandwidth spikes
            for (var j = 0; j< multiplier; j++)
                magnitude += freqByteData[offset + j];
            magnitude = magnitude / multiplier;
            // analyserContext.moveTo(i * SPACING, 0);
            // analyserContext.strokeStyle = "hsl( " + Math.round((i*360)/numBars) + ", 100%, 50%)";
            // analyserContext.lineTo(i * SPACING, magnitude);

            /*if(i == 128 ) {
                // console.log(freqByteData.length)
                analyserContext.fillStyle = "hsl( " + Math.round((i*360)/numBars) + ", 100%, 50%)";
                analyserContext.fillRect(i * SPACING, 0, BAR_WIDTH, magnitude);
            }*/

            analyserContext.fillStyle = "hsl( " + Math.round((i*360)/numBars) + ", 100%, 50%)";
            analyserContext.fillRect(i * SPACING, 0, BAR_WIDTH, magnitude*10);


        }





    }

    rafID = window.requestAnimationFrame( updateAnalysers );


}


function gotStream(stream) {
    inputPoint = audioContext.createGain();

    // Create an AudioNode from the stream.
    realAudioInput = audioContext.createMediaStreamSource(stream);
    audioInput = realAudioInput;
    audioInput.connect(inputPoint);


    //  https://developer.mozilla.org/ko/docs/Web/API/Web_Audio_API
    /*
    * createAnalyser - 시간대 별로 실시간 주파수의 정보
    * createGain - 음량의 변경을 나타냅니다
    * https://developer.mozilla.org/ko/docs/Web/API/AnalyserNode
    * */

    //var analyser = audioCtx.createAnalyser();  -- 주파수
    // var distortion = audioCtx.createWaveShaper();
    // var gainNode = audioCtx.createGain();
    // var biquadFilter = audioCtx.createBiquadFilter();


    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 2048;
    inputPoint.connect( analyserNode );

    zeroGain = audioContext.createGain();
    zeroGain.gain.value = 0.0;
    zeroGain.connect( audioContext.destination );
    inputPoint.connect( zeroGain );

    updateAnalysers();
}

function initAudio() {
    if (!navigator.getUserMedia)
        navigator.getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
    if (!navigator.cancelAnimationFrame)
        navigator.cancelAnimationFrame = navigator.webkitCancelAnimationFrame || navigator.mozCancelAnimationFrame;
    if (!navigator.requestAnimationFrame)
        navigator.requestAnimationFrame = navigator.webkitRequestAnimationFrame || navigator.mozRequestAnimationFrame;

    navigator.getUserMedia(
        {
            "audio": {
                "mandatory": {
                    "googEchoCancellation": "false",
                    "googAutoGainControl": "false",
                    "googNoiseSuppression": "false",
                    "googHighpassFilter": "false"
                },
                "optional": []
            },
        }, gotStream, function(e) {
            alert('Error getting audio');
            console.log(e);
        });
}

window.addEventListener('load', initAudio );
