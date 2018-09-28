
var SoundVisualizer = function(args){

    var opts = args || {};
    var _this = this;


    var IS_DEBUG = false;
    var IS_DRAWING = false;
    var TOTAL_AVG_POINTS = 64,
        AVG_BREAK_POINT = 100,
        avg_points = [];

    var AudioContext = (window.AudioContext || window.webkitAudioContext);
    var actx, audioSource, analyser, gainNode, audio_buffer,
        frequencyData, timeData, frequencyDataLength;

    var avg_frequency;
    var avg_time, pow_time;

    var mediaUrl = ["./assets/new_year_dubstep_minimix.ogg",
                    "./assets/blackpink.mp3",
                    "./assets/slow.mp3",
                    "./assets/monny_son.mp3"], // "monny_son.mp3"
        mediaIndex = 1,
        fftSize = 1024,
        TOTAL_POINTS = fftSize/2;


    var frequencyDataLine, timeDataLine, geometryBox, geometryShape;

    var visualArr = [];

    var isFrequencyDataLine= true;
    var isTimeDataLine = false;
    var isGeometryBox = false;
    var isGeometryShape = false;

    this.setting(opts);
    this.setLayout();

    this.init = function(){
        _this.addToStage();

        if (!AudioContext) {
            return featureNotSupported();
        }

        actx = new AudioContext();
        initializeAudio();
        initializeVisual();
        addEvent();
    };


    var initializeAudio = function(){
        if(IS_DEBUG) loadMusic();
        else connectMic();
    };


    var addEvent = function(){
        var nextBtn = document.querySelector(".btn-next");
        nextBtn.addEventListener("click", nextMusic)


        var indexBtn = document.querySelectorAll(".btn-wrapper .btn-visual");
        for(let i=0 ; i<indexBtn.length ; i++){
            indexBtn[i].addEventListener("click", function(e){onClickIndexBtn(indexBtn[i], i)})

        }
        // indexBtn.addEventListener("click", onClickIndexBtn)


        var playbtn = document.querySelector(".msg-area");
        playbtn.addEventListener("click", function(){audioSource.start();})
    };


    var nextMusic = function(){
        if(!IS_DEBUG) return;

        _this.pixi.app.stage.removeChild( _this.pixi.mainContainer );

        audioSource.stop();
        mediaIndex = (mediaIndex+1) % mediaUrl.length;
        loadMusic();

    };

    var onClickIndexBtn = function(btn, index){
        console.log("index : " , visualArr[index])

        var tg = visualArr[index];

        if(btn.classList.toggle("off")){
            // console.log("remove")
            _this.pixi.mainContainer.removeChild(tg);

        } else {
            // console.log("add")
            if(index == 3){
                _this.pixi.mainContainer.addChildAt(tg, 0);
            } else {
                _this.pixi.mainContainer.addChild(tg);
            }



        }



    };








    // render
    var drawCanvas = function(){
        _this.pixi.render.add(function( delta ) {

            analyser.getByteFrequencyData(frequencyData);
            analyser.getByteTimeDomainData(timeData);
            avg_frequency = getAvg([].slice.call(frequencyData)) * gainNode.gain.value;
            avg_time = getAvg([].slice.call(timeData)) * gainNode.gain.value;
            pow_time = getAvg_timePow([].slice.call(timeData)) * gainNode.gain.value;

            var isString = avg_frequency > AVG_BREAK_POINT ? true : false

            if(geometryShape) geometryShape.render(avg_frequency, isString);
            if(geometryBox) geometryBox.render(pow_time, isString);
            if(frequencyDataLine) frequencyDataLine.render(frequencyData);
            if(timeDataLine) timeDataLine.render(timeData);

        });
    };













    ///////////////////////////////////////////////
    // connect StreamSource - mic
    ///////////////////////////////////////////////

    var connectMic = function(){
        setConditionMsg("");

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

    };

    var gotStream = function(stream) {
        analyser = actx.createAnalyser();
        analyser.fftSize = fftSize;
        analyser.connect(actx.destination);

        gainNode = actx.createGain();
        gainNode.connect(analyser);

        var realAudioInput = actx.createMediaStreamSource(stream);
        realAudioInput.connect(gainNode);

        frequencyDataLength = analyser.frequencyBinCount;
        frequencyData = new Uint8Array(frequencyDataLength);
        timeData = new Uint8Array(frequencyDataLength);

        drawCanvas();
    };



    var initializeVisual = function(){
        frequencyDataLine = new FrequencyDataLine(_this.options);
        timeDataLine = new TimeDataLine(_this.options);
        geometryBox = new GeometryBox(_this.options);
        geometryShape = new GeometryShape(_this.options);

        if(isFrequencyDataLine) _this.pixi.mainContainer.addChild(frequencyDataLine);
        if(isTimeDataLine) _this.pixi.mainContainer.addChild(timeDataLine);
        if(isGeometryBox) _this.pixi.mainContainer.addChild(geometryBox);
        if(isGeometryShape) _this.pixi.mainContainer.addChild(geometryShape);

        visualArr = [frequencyDataLine, timeDataLine, geometryBox, geometryShape]

    };




    ///////////////////////////////////////////////
    // play music - debug
    ///////////////////////////////////////////////

    var loadMusic = function(){
        var xmlHTTP = new XMLHttpRequest();

        setConditionMsg("- Loading Audio Buffer -");

        xmlHTTP.open('GET', mediaUrl[mediaIndex], true);
        xmlHTTP.responseType = "arraybuffer";

        xmlHTTP.onload = function(e) {
            setConditionMsg("- Decoding Audio File Data -");

            analyser = actx.createAnalyser();
            analyser.fftSize = fftSize;
            analyser.minDecibels = -100;
            analyser.maxDecibels = -30;
            analyser.smoothingTimeConstant = 0.8;

            actx.decodeAudioData(this.response, function(buffer) {
                setConditionMsg("- Ready -");

                audio_buffer = buffer;
                gainNode = actx.createGain();
                // gainNode.gain.value = 0.1; // volume

                gainNode.connect(analyser);
                analyser.connect(actx.destination);

                frequencyDataLength = analyser.frequencyBinCount;
                frequencyData = new Uint8Array(frequencyDataLength);
                timeData = new Uint8Array(frequencyDataLength);

                playAudio();

                if(!IS_DRAWING) {
                    IS_DRAWING = true;
                    drawCanvas();
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



    var setConditionMsg = function(msg){
        var area = document.querySelector(".msg-area p");
        area.innerHTML = msg;
    };


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
    }

    init(){
    }

    render(avg_frequency, isString){
        var pow = avg_frequency;

        var color0 = isString ? 0xff0000 : 0xffffff;
        var color1 = isString ? 0xffffff : 0xff0000;

        this.clear();
        this.beginFill(color0, 1);
        this.drawRect(0, 0, this.options.stageWidth, this.options.stageHeight);

        this.beginFill(color1, 1);
        this.moveTo(0,0);
        this.lineTo(this.options.stageWidth * 0.7 + pow, 0);
        this.lineTo(this.options.stageWidth * 0.3 - (pow*0.6), this.options.stageHeight);
        this.lineTo(0, this.options.stageHeight);
        this.lineTo(0,0);
        this.endFill();


        /*var size = 200 + pow*2;
        this.beginFill(color0, 1);
        this.drawRect((this.options.stageWidth/2)-(size/2), (this.options.stageHeight/2)-(size/2), size, size);
        this.endFill();*/
    }

    resize(){

    }
}




///////////////////////////////////////////////////////
// 센터 원 - timedata power(시간기반 데이터의 세기, 그래프의 강도)
///////////////////////////////////////////////////////
class GeometryBox extends PIXI.Graphics {
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

    render(pow_time, isStrong){

        var pow = pow_time * 10;
        var color0 = isStrong ? 0xff0000 : 0xfdfdfd;

        this.clear();

        this.size *= 0.5;
        this.size = (this.size + pow);

        this.beginFill(color0, 1);
        this.drawCircle((this.options.stageWidth/2), (this.options.stageHeight/2), this.size);
        this.endFill();
    }

    resize(){

    }
}




///////////////////////////////////////////////////////
// 주파수 데이터 그래프 - frequencyData
///////////////////////////////////////////////////////
class FrequencyDataLine extends PIXI.Graphics {
    constructor(opt){
        super();
        this.setting(opt);
    }

    setting(opt){
        this.options = opt;
        this.color = 0x000000;
    }


    init(){

    }

    render(data){
        //data 파형
        var cx = this.options.stageWidth / 2;
        var cy = this.options.stageHeight / 2;

        this.clear();
        this.lineStyle(2, this.color, 1);
        this.moveTo(0, cy - data[0]);

        var tot = data.length; //frequencyData.length
        for(var i=0 ; i<tot; i++){
            if(i%10 == 0){
                this.lineTo((i+1)*(this.options.stageWidth/tot), cy - data[i]);
            }
        }

        this.endFill();
    }

    resize(){

    }

}






///////////////////////////////////////////////////////
// 시간기반 주파수 데이터 그래프 - timeData
///////////////////////////////////////////////////////
class TimeDataLine extends PIXI.Graphics {
    constructor(opt){
        super();
        this.setting(opt);
    }

    setting(opt){
        this.options = opt;
        this.color = 0x000000;
    }


    init(){

    }

    render(data){
        //data 파형
        var cx = this.options.stageWidth / 2;
        var cy = this.options.stageHeight / 2 + 128;

        this.clear();
        this.lineStyle(2, this.color, 1);
        this.moveTo(0, cy - data[0]);

        var tot = data.length; //frequencyData.length
        for(var i=0 ; i<tot; i++){
            this.lineTo((i+1)*(this.options.stageWidth/tot), cy - data[i]);
        }

        this.endFill();
    }

    resize(){

    }

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
        PIXI.settings.RESOLUTION = 1//window.devicePixelRatio;

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