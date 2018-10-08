
var SoundVisualizer = function(args){

    var opts = args || {};
    var _this = this;


    var IS_LOADED = false;
    var IS_STREAM = true;
    var IS_DRAWING = false;
    var IS_RANDOM_CHANGE = true;
    var IS_IOS = Modernizr.ios;
    var AVG_BREAK_POINT = IS_STREAM ? 50 : 100;

    var AudioContext = (window.AudioContext || window.webkitAudioContext);
    var actx, audioSource, analyser, gainNode, audio_buffer,
        frequencyData, timeData, frequencyDataLength;

    var avg_frequency;
    var avg_time, pow_time;

    var mediaUrl = ["./new_year_dubstep_minimix.mp3"], // "monny_son.mp3"
        mediaIndex = 0,
        fftSize = 1024;

    var visualArr = [];
    var visualIndex = 0;

    var timeNum = 0;

    this.setting(opts);
    this.setLayout();

    this.init = function(){
        _this.addToStage();

        if (!AudioContext) {
            return featureNotSupported();
        }


        initializeAudio();
        initializeVisual();
        addEvent();
    };


    var initializeAudio = function(){
        if(!IS_STREAM) loadMusic();
        else connectMic();

    };


    var addEvent = function(){
        var nextBtn = document.querySelector(".btn-next");
        nextBtn.addEventListener("click", nextMusic)

        var indexBtn = document.querySelectorAll(".btn-wrapper .btn-visual");
        for(let i=0 ; i<indexBtn.length ; i++){
            indexBtn[i].addEventListener("click", function(e){onClickIndexBtn(indexBtn[i], i)})
        }

        if( IS_IOS ) {
            //play btn show
            var playbtn = document.querySelector(".msg-area");
            playbtn.addEventListener("click", function(){if(audioSource)audioSource.start();});
        }


        var btn_music = document.querySelector(".btn-mode.music");
        var btn_mic = document.querySelector(".btn-mode.mic");

        btn_music.addEventListener("click", onClickPlayMusic);
        btn_mic.addEventListener("click", onClickStreamMic);


    };



    var onClickPlayMusic = function(){
        if(!IS_STREAM || !IS_LOADED) return;
        IS_STREAM = false;

        var btn_music = document.querySelector(".btn-mode.music");
        var btn_mic = document.querySelector(".btn-mode.mic");

        btn_music.classList.remove("off");
        btn_mic.classList.add("off");

        console.log("onClickPlayMusic")
        IS_LOADED = false;
        actx.close();
        loadMusic();

    };

    var onClickStreamMic = function(){
        if(IS_STREAM || !IS_LOADED) return;
        IS_STREAM = true;

        var btn_music = document.querySelector(".btn-mode.music");
        var btn_mic = document.querySelector(".btn-mode.mic");
        btn_music.classList.add("off");
        btn_mic.classList.remove("off");

        console.log("onClickStreamMic")
        IS_LOADED = false;
        actx.close();
        connectMic();
    };


    var nextMusic = function(){
        if(IS_STREAM) return;

        _this.pixi.app.stage.removeChild( _this.pixi.mainContainer );

        audioSource.stop();
        mediaIndex = (mediaIndex+1) % mediaUrl.length;
        loadMusic();

    };

    var onClickIndexBtn = function(btn, index){
        // console.log("index : " , visualArr[index])
        IS_RANDOM_CHANGE = false;
        if(index == visualIndex) return;

        var tg = visualArr[index];

        if(btn.classList.toggle("off")){
            // console.log("remove")
            _this.pixi.mainContainer.removeChild(tg);

        } else {
            controlVisualizer(index);
        }
        controlVisualizer(index);
    };


    var controlVisualizer = function(index){
        var indexBtn = document.querySelectorAll(".btn-wrapper .btn-visual");

        for(var i=0 ; i<visualArr.length ; i++){
            var tg = visualArr[i];

            if(i == index){
                visualIndex = index;
                _this.pixi.mainContainer.addChild(tg);
                indexBtn[i].classList.remove("off")
            } else {
                if(visualArr[i].parent){
                    _this.pixi.mainContainer.removeChild(tg);
                    indexBtn[i].classList.add("off")
                }
            }

        }
    };

    // render
    var drawCanvas = function(){
        _this.pixi.render.add(function( delta ) {
            if(!IS_LOADED) return;

            analyser.getByteFrequencyData(frequencyData);
            analyser.getByteTimeDomainData(timeData);
            avg_frequency = getAvg([].slice.call(frequencyData)) * gainNode.gain.value;
            avg_time = getAvg([].slice.call(timeData)) * gainNode.gain.value;
            pow_time = getAvg_timePow([].slice.call(timeData)) * gainNode.gain.value;

            var isStrong = avg_frequency > AVG_BREAK_POINT ? true : false

            const peak = avg_frequency//getMax(frequencyData);
            const amplitude = peak/256//(peak - 128) / 128;
            var smoothAmp = getAmplitudeSmooth(amplitude, 0.15);

            var option = {
                "frequencyData" : frequencyData,
                "timeData" : timeData,
                "avg_frequency" : avg_frequency,
                "avg_time" : avg_time,
                "pow_time" : pow_time,
                "isStrong" : isStrong,
                "smoothAmp" : smoothAmp
            };

            visualArr[visualIndex].render(option);

            if(IS_RANDOM_CHANGE){
                timeNum++;
                // random change
                if(timeNum > 200 && isStrong){
                    timeNum = 0;
                    var ranIndex = Math.floor(Math.random() * (visualArr.length-3)) + 2;
                    controlVisualizer(ranIndex);
                    console.log(ranIndex)
                }
            }

        });
    };















    ///////////////////////////////////////////////
    // connect StreamSource - mic
    ///////////////////////////////////////////////

    var connectMic = function(){
        setConditionMsg("");
        AVG_BREAK_POINT = 50;

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
                // console.log(e);
            });

    };

    var gotStream = function(stream) {

        actx = new AudioContext();

        var source = actx.createMediaStreamSource(stream);
        var convolver = actx.createConvolver(); // stream 입력 받을시 받은 데이터가 스피커로 나오는것을 막음

        analyser = actx.createAnalyser();
        analyser.fftSize = fftSize;

        gainNode = actx.createGain();

        source.connect(analyser);
        analyser.connect(convolver);
        convolver.connect(gainNode);
        gainNode.connect(actx.destination);

        gainNode.gain.value = 1;

        frequencyDataLength = analyser.frequencyBinCount;
        frequencyData = new Uint8Array(frequencyDataLength);
        timeData = new Uint8Array(frequencyDataLength);

        IS_LOADED = true;
        drawCanvas();
    };



    var initializeVisual = function(){
        var geometryShape = new GeometryShape(_this.options);
        var centerShape = new CenterShape(_this.options);
        var waveLine = new WaveLine(_this.options);

        visualArr = [geometryShape, centerShape, waveLine];

        var btn = document.querySelectorAll(".btn-visual");
        for(var i=0 ; i<visualArr.length ; i++){
            var visual = visualArr[i];


            var isOff = btn[i].classList.contains("off")
            if(!isOff) _this.pixi.mainContainer.addChild(visual);
        }

    };




    ///////////////////////////////////////////////
    // play music - debug
    ///////////////////////////////////////////////

    var loadMusic = function(){
        AVG_BREAK_POINT = 100;

        var xmlHTTP = new XMLHttpRequest();

        setConditionMsg("- Loading Audio Buffer -");

        xmlHTTP.open('GET', mediaUrl[mediaIndex], true);
        xmlHTTP.responseType = "arraybuffer";

        xmlHTTP.onload = function(e) {
            setConditionMsg("- Decoding Audio File Data -");
            IS_LOADED = true;
            actx = new AudioContext();

            analyser = actx.createAnalyser();
            analyser.fftSize = fftSize;
            analyser.minDecibels = -100;
            analyser.maxDecibels = -30;
            analyser.smoothingTimeConstant = 0.8;

            actx.decodeAudioData(this.response, function(buffer) {
                setConditionMsg("- Ready -");

                audio_buffer = buffer;

                gainNode = actx.createGain();
                // gainNode.gain.value = 0; // volume
                gainNode.connect(analyser);

                analyser.connect(actx.destination);

                frequencyDataLength = analyser.frequencyBinCount;
                frequencyData = new Uint8Array(frequencyDataLength);
                timeData = new Uint8Array(frequencyDataLength);

                playAudio();

                if(!IS_DRAWING) {
                    IS_DRAWING = true;
                    drawCanvas();
                    controlVisualizer(visualIndex);
                }

            }, function(e) { alert("Error decoding audio data" + e.err); });
        };

        xmlHTTP.send();
    };

    var playAudio = function(){
        audioSource = null;
        audioSource = actx.createBufferSource();
        audioSource.buffer = audio_buffer;
        audioSource.connect(gainNode);
        audioSource.start();

        _this.pixi.app.stage.addChild( _this.pixi.mainContainer );
        setConditionMsg("");
    };







    // resize
    this.resetValue = function(){
        //if(geometryShape) geometryShape.resize();

    };








    var getAvg = function(values) {
        var value = 0;

        values.forEach(function(v) {
            value += v;
        })

        return value / values.length;
    };

    var getAvg_timePow = function(values) {

        var arr = [];
        for(var i=0 ; i<values.length-1 ; i++){
            arr.push(Math.abs(values[i] - values[i+1]));
        }

        var value = 0;
        arr.forEach(function(v) {
            value += v;
        })

        return value / arr.length;
    };


    var getMax = function(values){
        var value = 0;

        values.forEach(function(v) {
            value = Math.max(v, value);
        })

        return value;
    }



    var setConditionMsg = function(msg){
        var area = document.querySelector(".msg-area p");
        area.innerHTML = msg;
    };


    var previousAmplitude = 0;

    var smoothAmplitude = function(amp, factor = 0.15) {
        const smoothAmp = getLerp(previousAmplitude, amp, factor);
        previousAmplitude = smoothAmp;
        return smoothAmp;
    };

    var getAmplitudeSmooth = function(amplitude, factor = 0.15) {
        const amp = amplitude;
        const smoothAmp = smoothAmplitude(amp, factor);
        return smoothAmp;
    };

    var getLerp = function(a, b, t) {
        return a + (b - a) * t;
    }

};





///////////////////////////////////////////////////////
// 대각선 박스 - frequencyData avg
///////////////////////////////////////////////////////
class GeometryShape extends PIXI.Graphics {
    constructor(opt){
        super();
        this.setting(opt);
    }

    setting(opt){
        this.options = opt;
        this.size = 50;
    }

    init(){
    }

    render(data){
        var pow = data.avg_frequency;

        var color0 = data.isStrong ? 0xff0000 : 0xffffff;
        var color1 = data.isStrong ? 0xffffff : 0xff0000;

        this.clear();
        this.beginFill(color0, 1);
        this.drawRect(0, 0, this.options.stageWidth, this.options.stageHeight);
        this.endFill();

        this.beginFill(color1, 1);
        this.moveTo(0,0);
        this.lineTo(this.options.stageWidth * 0.7 + pow, 0);
        this.lineTo(this.options.stageWidth * 0.3 - (pow*0.6), this.options.stageHeight);
        this.lineTo(0, this.options.stageHeight);
        this.lineTo(0,0);
        this.endFill();

        var powCircle = data.pow_time * 10;

        this.size *= 0.5;
        this.size = (this.size + powCircle);

        if(this.size < 1) return;
        this.beginFill(color0, 1);
        this.drawCircle((this.options.stageWidth/2), (this.options.stageHeight/2), this.size);
        this.endFill();
    }

    resize(){

    }
}







///////////////////////////////////////////////////////
// centerShape
///////////////////////////////////////////////////////
class CenterShape extends PIXI.Graphics {
    constructor(opt){
        super();
        this.setting(opt);
    }

    setting(opt){
        this.options = opt;
        this.circleArr = [];
        this.container = new PIXI.Sprite();
        this.rotationArr = [];
        this.plusAngle = -180;

        var tot = 8;

        for(var i=0 ; i<tot ; i++){
            var circle = new PIXI.Graphics();
            // circle.y = -100;
            this.circleArr.push(circle);
            this.container.addChild(circle);
            this.rotationArr.push( (i * 360) / tot + this.plusAngle );
        }

        // this.shuffle(this.rotationArr);

        this.container.x = (this.options.stageWidth/2);
        this.container.y = (this.options.stageHeight/2);
        this.addChild(this.container);



    }


    init(){

    }

    render(data){




        var circleColor = 0x000000;
        var shapeColor = 0x000000;
        var size = 5;
        var PI_HALF = Math.PI / 180;
        var radius = this.options.stageWidth>this.options.stageHeight ? this.options.stageHeight/4 : this.options.stageWidth/4;

        var avg_arr = this.getAvgArr(data.frequencyData, this.circleArr.length);
        var firstPoint = {x:0, y:0};
        var tot = this.circleArr.length//data.isStrong ? this.circleArr.length : this.circleArr.length/2;

        var num = Math.floor( (data.avg_frequency / 128) * 255 );
        shapeColor = "0x"+num.toString(16)+"0000"

        // this.plusAngle += 0.1



        this.clear();
        // this.lineStyle(1, 0x000000, 1);
        this.beginFill(shapeColor, 1);


        for(var i=0 ; i<tot ; i++){

            var pow = avg_arr[i]/2;
            var angle = this.rotationArr[i];
            var tgX = (radius+pow) * Math.sin(PI_HALF * angle);
            var tgY = (radius+pow) * Math.cos(PI_HALF * angle);
            if(i == 0) {
                this.moveTo(tgX+this.options.stageWidth/2,tgY+this.options.stageHeight/2);
                firstPoint.x = tgX;
                firstPoint.y = tgY;
            } else {
                this.lineTo(tgX+this.options.stageWidth/2, tgY+this.options.stageHeight/2);
            }


            var circleGap = data.avg_frequency;
            var circleTgX = (radius+circleGap+pow) * Math.sin(PI_HALF * angle);
            var circleTgY = (radius+circleGap+pow) * Math.cos(PI_HALF * angle);
            var circle = this.circleArr[i];
            circle.clear();
            circle.beginFill(shapeColor, 1);
            circle.drawCircle(circleTgX, circleTgY, size);
            // circle.drawCircle(tgX, -100 - (avg_arr[i]/2), size);
            circle.endFill();


        }

        this.lineTo(firstPoint.x+this.options.stageWidth/2, firstPoint.y+this.options.stageHeight/2);
        this.endFill();

        this.container.x = (this.options.stageWidth/2);
        this.container.y = (this.options.stageHeight/2);

    }


    resize(){

    }




    // data arr를 avgNum 수 만큼의 영역으로 평균 구함
    getAvgArr(arr, avgNum) {

        var maxArange = arr.length/2;
        var area = Math.floor(maxArange / avgNum);

        var getarr = [];
        for(var i=0 ; i<avgNum ; i++){
            var cutArr = arr.slice(i*area, (i+1)*area);
            getarr.push(cutArr);
        }

        var avgArr = [];
        for(i=0 ; i<getarr.length ; i++){
            avgArr.push(this.getAvg(getarr[i]));
        }

        return avgArr;
    }


    getAvg(values) {
        var value = 0;

        values.forEach(function(v) {
            value += v;
        })

        return value / values.length;
    };

    shuffle(array) {
        var currentIndex = array.length, temporaryValue, randomIndex;

        // While there remain elements to shuffle...
        while (0 !== currentIndex) {

            // Pick a remaining element...
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex -= 1;

            // And swap it with the current element.
            temporaryValue = array[currentIndex];
            array[currentIndex] = array[randomIndex];
            array[randomIndex] = temporaryValue;
        }

        return array;
    }

}






///////////////////////////////////////////////////////
// WaveLine
///////////////////////////////////////////////////////
class WaveLine extends PIXI.Graphics {
    constructor(opt){
        super();
        this.setting(opt);
    }

    setting(opt){
        this.options = opt;

        /*this.blur = new PIXI.filters.BlurFilter(4, 10);
        this.filters = [this.blur];*/

        this.pointArr = [];
        this.total = 20;
        for(var i=0 ; i<this.total ; i++){
            this.pointArr.push(0);
        }
    }


    init(){

    }

    render(data){
        var color0 = data.isStrong ? 0x000000 : 0xffffff;
        var color1 = data.isStrong ? 0xffffff : 0x000000;


        var tot = this.total;
        var avg_arr = this.getAvgArr(data.frequencyData, tot/2);

        var num = Math.floor( (data.avg_frequency / 128) * 255 );
        var shapeColor = "0x"+num.toString(16)+"0000"

        var centerX = this.options.stageWidth/2//; + data.avg_frequency/2

        this.clear();
        this.beginFill(color0, 1);
        this.drawRect(0, 0, this.options.stageWidth, this.options.stageHeight);
        this.endFill();

        this.beginFill(color1, 1);
        this.moveTo(centerX, 0);

        var pointDirection = -1;
        var pointIndex = avg_arr.length-1;

        for(var i=0; i<tot ; i++){

            var per = pointIndex > avg_arr.length-5 ? Math.ceil( (pointIndex/( avg_arr.length-1 )) * 2 ) + 1 : 1;
            var pow = avg_arr[pointIndex];
            pow = pow/256 * this.options.stageWidth/4;
            pointIndex = pointIndex + pointDirection;
            if(pointIndex < 0){
                pointIndex = pointIndex + 1;
                pointDirection = 1;
            }


            // var tgX = i%2 ? centerX - (pow*-1) : centerX - (pow);

            this.pointArr[i] = this.pointArr[i] + (pow);
            var tgX = i%2 ? centerX - this.pointArr[i] : centerX + this.pointArr[i] ;
            var tgY = this.options.stageHeight/(tot+1) * (i+1);
            this.pointArr[i] *= 0.2

            this.lineTo(tgX, tgY);
        }

        this.lineTo(centerX, this.options.stageHeight);
        this.lineTo(0, this.options.stageHeight);
        this.lineTo(0, 0);
        this.endFill();
    }

    resize(){

    }

    // data arr를 avgNum 수 만큼의 영역으로 평균 구함
    getAvgArr(arr, avgNum) {

        var maxArange = arr.length/2;
        var area = Math.floor(maxArange / avgNum);

        var getarr = [];
        for(var i=0 ; i<avgNum ; i++){
            var cutArr = arr.slice(i*area, (i+1)*area);
            getarr.push(cutArr);
        }

        var avgArr = [];
        for(i=0 ; i<getarr.length ; i++){
            avgArr.push(this.getAvg(getarr[i]));
        }

        return avgArr;
    }


    getAvg(values) {
        var value = 0;

        values.forEach(function(v) {
            value += v;
        })

        return value / values.length;
    };

}









SoundVisualizer.prototype = {
    options: {},
    pixi:{
        render: {},
        app: {},
        mainContainer: {},
        graphics: {}
    },

    setting: function(options){

        // 네이티브 윈도우 해상도를 기본 해상도로 사용
        // 렌더링 할 때 고밀도 디스플레이를 지원합니다.
        PIXI.settings.RESOLUTION = window.devicePixelRatio;

        // 크기를 조정할 때 보간을 사용하지 않고 텍스처를 픽셀 화합니다.
        PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

        //  OPTIONS
        /// ---------------------------
        this.options                     = options || {};
        this.options.objectName          = options.hasOwnProperty('objectName') ? options.objectName : new Date().getTime();
        this.options.stageWidth          = options.hasOwnProperty('stageWidth') ? options.stageWidth : 1920;
        this.options.stageHeight         = options.hasOwnProperty('stageHeight') ? options.stageHeight : 1080;
        this.options.pixiSprites         = options.hasOwnProperty('sprites') ? options.sprites : [];
        this.options.centerSprites       = options.hasOwnProperty('centerSprites') ? options.centerSprites : false;
        this.options.displaceAutoFit     = options.hasOwnProperty('displaceAutoFit')  ?  options.displaceAutoFit : false;
        this.options.container           = options.hasOwnProperty('container') ? options.container : document.body;

        this.pixi.app            = new PIXI.Application( this.options.stageWidth, this.options.stageHeight, { transparent: false, antialias: false, backgroundColor:0xFFFFFF  });

        this.resetSize(this.options.stageWidth, this.options.stageHeight);

        //this.pixi.app.stage.interactive = true;
        //this.pixi.app.stage.buttonMode = true;

        this.pixi.mainContainer   = new PIXI.Container();
        //this.pixi.mainContainer.interactive = true;
        //this.pixi.mainContainer.buttonMode = true;

        this.pixi.render = new PIXI.ticker.Ticker();
        this.pixi.render.autoStart = true;

        this.pixi.graphics = new PIXI.Graphics();

    },

    setLayout : function() {
        // Add child container to the main container
        this.pixi.app.stage.addChild( this.pixi.mainContainer );
        this.pixi.mainContainer.addChild(this.pixi.graphics);
    },

    addToStage : function(){
        // Add canvas to the HTML
        //document.body.appendChild( renderer.view );
        this.options.container.appendChild( this.pixi.app.view );
        this.resetSize(this.options.stageWidth, this.options.stageHeight);

    },

    val: {},
    setValue : function (val){
        this.val = val;
    },

    getValue : function(){
        return this.val;
    },

    resetSize : function(w, h){
        this.options.stageWidth = w || this.options.stageWidth;
        this.options.stageHeight = h || this.options.stageHeight;

        this.pixi.app.view.style.width = this.options.stageWidth+"px";
        this.pixi.app.view.style.height = this.options.stageHeight+"px";

        this.pixi.app.renderer.resize(this.options.stageWidth, this.options.stageHeight);   // * PIXI.settings.RESOLUTION)

        this.resetValue();

    },

    resetValue : function(){

    }
};