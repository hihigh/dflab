
var SoundVisualizer = function(args){

    var opts = args || {};
    var _this = this;


    var IS_LOADED = false;
    var IS_STREAM = false;
    var IS_DRAWING = false;
    var IS_RANDOM_CHANGE = false;
    var IS_IOS = Modernizr.ios;
    var AVG_BREAK_POINT = IS_STREAM ? 30 : 30;

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
            playbtn.addEventListener("click", function(){setConditionMsg(""); if(audioSource)audioSource.start(); });
        }


        var btn_music = document.querySelector(".btn-mode.music");
        var btn_mic = document.querySelector(".btn-mode.mic");

        btn_music.addEventListener("click", onClickPlayMusic);
        btn_mic.addEventListener("click", onClickStreamMic);


    };



    var onClickPlayMusic = function(){
        if(!IS_STREAM || !IS_LOADED) return;
        IS_STREAM = false;
        IS_LOADED = false;
        actx.close();
        loadMusic();
        // console.log("onClickPlayMusic")
    };

    var onClickStreamMic = function(){
        if(IS_STREAM || !IS_LOADED) return;
        IS_STREAM = true;
        IS_LOADED = false;
        actx.close();
        connectMic();
        // console.log("onClickStreamMic")
    };

    var controlTypeBtn = function(isMic){
        var btn_music = document.querySelector(".btn-mode.music");
        var btn_mic = document.querySelector(".btn-mode.mic");

        if(isMic){
            btn_music.classList.add("off");
            btn_mic.classList.remove("off");
        } else {
            btn_music.classList.remove("off");
            btn_mic.classList.add("off");
        }
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

            var isStrong = avg_frequency > AVG_BREAK_POINT ? true : false;

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
                "smoothAmp" : smoothAmp,
                "delta" : delta
            };

            visualArr[visualIndex].render(option);

            if(IS_RANDOM_CHANGE){
                timeNum++;
                // random change
                if(timeNum > 200 && isStrong){
                    timeNum = 0;
                    var ranIndex = Math.floor(Math.random() * (visualArr.length-3)) + 2;
                    controlVisualizer(ranIndex);
                }
            }

        });
    };















    ///////////////////////////////////////////////
    // connect StreamSource - mic
    ///////////////////////////////////////////////

    var connectMic = function(){
        controlTypeBtn(true);
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

        if(!IS_DRAWING) {
            IS_DRAWING = true;
            IS_LOADED = true;
            drawCanvas();
        } else {
            IS_LOADED = true;
        }


    };



    var initializeVisual = function(){
        var geometryShape = new GeometryShape(_this.options);
        var centerShape = new CenterShape(_this.options);
        var waveLine = new WaveLine(_this.options);
        var rectTypeContent = new RectTypeContent(_this.options);
        var rectMultiTypeContent = new RectMultiTypeContent(_this.options);
        var triangleGradient = new TriangleGradient(_this.options);
        var circleMultiTypeContent = new CircleMultiTypeContent(_this.options);
        var middleBarMulti = new MiddleBarMulti(_this.options);
        var middleStickLine = new MiddleStickLine(_this.options);
        var sideTwinTriangle = new SideTwinTriangle(_this.options);
        var waveTrapezoid = new WaveTrapezoid(_this.options);
        var middleThreeRect = new MiddleThreeRect(_this.options);
        var rectLayered = new RectLayered(_this.options);

        visualArr = [rectLayered, middleThreeRect, waveTrapezoid, sideTwinTriangle, middleStickLine, middleBarMulti, circleMultiTypeContent, triangleGradient, rectMultiTypeContent, rectTypeContent, geometryShape, centerShape, waveLine];

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

        controlTypeBtn(false);


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
                gainNode.gain.value = 0.5; // volume
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

        if(IS_IOS){
            setConditionMsg("Click Play");
        } else {
            setConditionMsg("");
        }
    };







    // resize
    this.resetValue = function(){
        if(visualArr[visualIndex])visualArr[visualIndex].resize();
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
        var area = document.querySelector(".msg-area");
        var areaText = document.querySelector(".msg-area p");
        if(msg == ""){
            area.classList.add("off");
        } else {
            if(area.classList.contains("off")) area.classList.remove("off");
        }

        areaText.innerHTML = msg;
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
// Box
///////////////////////////////////////////////////////
class RectLayered extends PIXI.Graphics {
    constructor(opt){
        super();
        this.setting(opt);
    }

    setting(opt){
        this.options = opt;
        this.container = new PIXI.Sprite();
        this.size = 50;
        this.rectArr = [];
        this.prevPowArr = [];

        var color = 0x000000;//0xef06f9;
        var alpha = 0.3
        var sizeArr = [0.36, 0.55, 0.75,1];
        var max = 4;
        for(var i=0 ; i<max ; i++){
            var rect = new PIXI.Graphics();
            var rectW = this.options.stageWidth * sizeArr[i];
            var rectH = this.options.stageHeight * sizeArr[i];

            rect.beginFill(color, alpha);
            rect.drawRect(-rectW/2, -rectH/2, rectW, rectH);
            rect.endFill();

            this.rectArr.push(rect);
            this.prevPowArr.push(1);
            this.container.addChild(rect);

        }

        this.addChild(this.container);
        this.container.x = this.options.stageWidth/2;
        this.container.y = this.options.stageHeight/2;

        this.rectFull = new PIXI.Graphics();
        this.rectFull.beginFill(color, alpha*1.5);
        this.rectFull.drawRect(0, 0, this.options.stageWidth, this.options.stageHeight);
        this.rectFull.endFill();

        this.addChildAt(this.rectFull, 0);

        this.prevFullrectAlpha = 0;

    }

    init(){
    }

    render(data){

        var num = data.isStrong ? 40 : 80;
        var alpha = 1 - data.avg_frequency/num;
        var tgAlpha = this.prevFullrectAlpha + (alpha - this.prevFullrectAlpha)*0.3;
        this.prevFullrectAlpha = tgAlpha;
        this.rectFull.alpha = this.prevFullrectAlpha;


        var dataArr = this.getAvgArr(data.frequencyData, this.rectArr.length*2);

        for(var i=0 ; i<this.rectArr.length ; i++){
            var rect = this.rectArr[i];

            var dataPow = dataArr[i*2];

            var scaleArange = data.isStrong ? 0.4 : 0.2;
            var scale = (1-scaleArange) + (scaleArange-dataPow/150*scaleArange);
            var tgScale = this.prevPowArr[i] + (scale - this.prevPowArr[i])*0.3;
            this.prevPowArr[i] = tgScale;

            rect.scale.set(tgScale);
            // rect.tint = color0;

        }

        // this.rectFull.alpha = 1 - data.avg_frequency/80;


        // this.rectFull.tint = color;
        /*var pow = data.avg_frequency;
        var per = pow/100;

        var alpha = this.prevPer + (per - this.prevPer) * 0.3;
        this.prevPer = alpha;

        this.rectFull.alpha = 1 - alpha;
        // this.rectCenter.alpha = per;

        this.rectCenter.scale.x = alpha*3;
        this.rectCenter.scale.y = alpha*3;*/
    }

    resize(){

    }

    // data arr를 avgNum 수 만큼의 영역으로 평균 구함
    getAvgArr(arr, avgNum) {

        var maxArange = arr.length/4;
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
    };
}







///////////////////////////////////////////////////////
// middle Three Rect
///////////////////////////////////////////////////////
class MiddleThreeRect extends PIXI.Graphics {
    constructor(opt){
        super();
        this.setting(opt);
    }

    setting(opt){
        this.options = opt;
        this.container = new PIXI.Graphics();

        this.containerArr = [];

        this.rectFull = new PIXI.Graphics();
        this.rectFull.beginFill(0xffffff, 1);
        this.rectFull.drawRect(0, 0, this.options.stageWidth, this.options.stageHeight);
        this.rectFull.endFill();
        this.addChildAt(this.rectFull, 0);
        this.rectFull.tint = 0xff0000;

        var linwW = Math.min(Math.ceil(this.options.stageWidth*0.3), 105);
        var linwH = this.options.stageHeight/4;
        var lineNum = 3;
        var lineGap = Math.min( (this.options.stageWidth - (linwW*lineNum))/4, 14 );

        for(var i=0 ; i<lineNum ; i++){

            var topLine = new PIXI.Graphics();
            var botLine = new PIXI.Graphics();
            var lineCon = new PIXI.Sprite();

            var direc = Math.random() > 0.5 ? 1 : -1;

            topLine.beginFill(0xffffff, 1);
            topLine.drawRect(-linwW/2, 0, linwW, linwH*direc);
            topLine.endFill();
            topLine.tint = 0xffdedd;

            botLine.beginFill(0xffffff, 1);
            botLine.drawRect(-linwW/2, 0, linwW, linwH*-direc);
            botLine.endFill();
            botLine.tint = 0xffdedd;

            lineCon.addChild(topLine);
            lineCon.addChild(botLine);

            lineCon.x = (linwW+lineGap) * i + (linwW/2+lineGap) - (((linwW+lineGap)*lineNum)-lineGap)/2 - lineGap;
            lineCon.y = 0
            topLine.scale.y = 0;
            botLine.scale.y = 0;
            this.container.addChild(lineCon);
            this.containerArr.push({index:i, top:topLine, topPow:0, bot:botLine, botPow:0, con:lineCon})
        }

        this.addChild(this.container);

        this.shuffle(this.containerArr);

        this.container.x = this.options.stageWidth/2;
        this.container.y = this.options.stageHeight/2;

        this.prevPow = 0;
    }

    init(){

    }

    render(data){


        var dataArr = this.getAvgArr(data.frequencyData, this.containerArr.length * 2);

        var timePow = data.pow_time > 5 ? 2 : 1;
        var spd = data.pow_time > 5 ? 0.4 : 0.2;
        var tgPow = data.avg_frequency > 40 ? data.avg_frequency/250 : 0;
        var pow = this.prevPow + (tgPow - this.prevPow) * 0.3;
        this.prevPow = pow;

        var color0 = data.isStrong ? 0xd38d1e : 0xffdedd;
        var color1 = data.isStrong ? 0xbde6f8 : 0xff0000;


        for(var i=0 ; i<this.containerArr.length; i++){
            var lineTop = this.containerArr[i].top;
            var lineTopPow = this.containerArr[i].topPow;
            var lineBot = this.containerArr[i].bot;
            var lineBotPow = this.containerArr[i].botPow;

            var perNum = 200;
            var topPer = lineTopPow + (dataArr[i]/perNum*timePow - lineTopPow) * spd;
            this.containerArr[i].topPow = topPer;

            var botPer = lineBotPow + (dataArr[i+this.containerArr.length]/perNum*timePow  - lineBotPow) * spd;
            this.containerArr[i].botPow = botPer;

            lineTop.scale.y = topPer + 0.01;
            lineBot.scale.y = botPer + 0.01;

            lineTop.tint = color0;
            lineBot.tint = color0;

        }

        this.rectFull.tint = color1;

    }


    resize(){
        this.container.x = this.options.stageWidth/2;
        this.container.y = this.options.stageHeight/2;

        this.rectFull.width = this.options.stageWidth;
        this.rectFull.height = this.options.stageHeight;
    };

    // data arr를 avgNum 수 만큼의 영역으로 평균 구함
    getAvgArr(arr, avgNum) {

        var maxArange = arr.length/4;
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
    };


}





///////////////////////////////////////////////////////
// Wave Trapezoid
///////////////////////////////////////////////////////
class WaveTrapezoid extends PIXI.Graphics {
    constructor(opt){
        super();
        this.setting(opt);
    }

    setting(opt){
        this.options = opt;
        this.container = new PIXI.Sprite();
        this.scewContainer = new PIXI.Sprite();
        this.trapezoidArr = [];

        this.rectFull = new PIXI.Graphics();
        this.rectFull.beginFill(0x132798, 1);
        this.rectFull.drawRect(0, 0, this.options.stageWidth, this.options.stageHeight);
        this.rectFull.endFill();
        this.addChildAt(this.rectFull, 0);

        this.rectSize = 120;
        this.rectGap = -this.rectSize/10;

        this.spd = 1;
        this.prevPowArr = [];
        this.dataIndexRandomArr= [];
        var max = Math.ceil(this.options.stageHeight/this.rectSize) * 4;
        this.repertNum = Math.floor(max/3);

        // alert(max + " : " +  this.repertNum)

        for(var i=0 ; i<max ; i++){
            var trapezoidContainer = new PIXI.Sprite();
            var trapezoid = new PIXI.Graphics();
            var trapezoidShadow = new PIXI.Graphics();
            var color = 0xffe301//!(i%this.repertNum) ? 0xff0000 : 0xffe301;

            trapezoid.beginFill(color, 1);
            trapezoid.drawRect(0, 0, this.rectSize, this.rectSize*0.8);
            trapezoid.endFill();

            trapezoidShadow.beginFill(0x060f46, 1);
            trapezoidShadow.drawRect(this.rectSize*0.33, this.rectSize*0.33, this.rectSize, this.rectSize*0.8);
            trapezoidShadow.endFill();

            trapezoidContainer.addChild(trapezoidShadow);
            trapezoidContainer.addChild(trapezoid);

            trapezoidContainer.y = (this.rectSize+this.rectGap) * i;
            this.scewContainer.addChild(trapezoidContainer);

            this.trapezoidArr.push({top:trapezoid, shadow:trapezoidShadow, container:trapezoidContainer})
            this.prevPowArr[i%this.repertNum] = 0;
            this.dataIndexRandomArr.push(i%this.repertNum);

        }

        this.shuffle(this.dataIndexRandomArr)

        // this.scewContainer.x = 300
        // this.scewContainer.y = -500


        var m = new PIXI.Matrix();
        m.c = -0.6;
        this.container.transform.setFromMatrix(m);
        this.container.rotation = 0.3;
        // this.container.y = 100
        this.container.x = this.options.stageWidth/2;
        this.container.y = this.options.stageHeight/2;


        this.addChild(this.container)
        this.container.addChild(this.scewContainer);

        var rectGap = this.rectSize + this.rectGap;
        this.scewContainer.y = -rectGap*(this.repertNum*2);

        this.prevFullrectAlpha = 1;


    }

    init(){

    }

    render(data){

        var max = this.trapezoidArr.length;

        var tgAlpha = data.pow_time > 5 ? 0 : 1;
        var alpha = this.prevFullrectAlpha + (tgAlpha - this.prevFullrectAlpha)*0.3;
        this.prevFullrectAlpha = alpha;
        this.rectFull.alpha = alpha;

        var dataArr = this.getAvgArr(data.frequencyData, this.repertNum);

        for(var i=0 ; i<this.trapezoidArr.length ; i++) {
            var trapezoidContainer = this.trapezoidArr[i].container;
            var trapezoid = this.trapezoidArr[i].top;
            var trapezoidShadow = this.trapezoidArr[i].shadow;

            var repeatIndex = i%this.repertNum;
            var ranIndex = this.dataIndexRandomArr[repeatIndex];
            var tgPow = -dataArr[ranIndex]/2;
            var pow = this.prevPowArr[ranIndex] + (tgPow - this.prevPowArr[ranIndex]) * 0.3;
            this.prevPowArr[ranIndex] = pow;

            trapezoid.x = pow;
            trapezoid.y = pow;
            trapezoidShadow.x = pow/4;
            trapezoidShadow.y = pow/4;

            trapezoidShadow.alpha = 1+ pow/140;


            // trapezoid.scale.set(timePow)
            // trapezoidShadow.scale.set(1+ pow/150)
        }


        var rectGap = this.rectSize + this.rectGap;
        var limitY = -rectGap*this.repertNum;
        this.scewContainer.y += this.spd + data.avg_frequency/10;
        if(this.scewContainer.y >= limitY) this.scewContainer.y = -rectGap*(this.repertNum*2);




    }

    resize(){
        this.container.x = this.options.stageWidth/2;
        this.container.y = this.options.stageHeight/2;

        this.rectFull.width = this.options.stageWidth;
        this.rectFull.height = this.options.stageHeight;
    }

    // data arr를 avgNum 수 만큼의 영역으로 평균 구함
    getAvgArr(arr, avgNum) {

        var maxArange = arr.length/4;
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
    };

    getAmplitudeSmooth(amplitude, factor = 0.15) {
        const amp = amplitude;
        const smoothAmp = this.smoothAmplitude(amp, factor);
        return smoothAmp;
    };

    smoothAmplitude(amp, factor = 0.15) {
        const smoothAmp = this.getLerp(this.previousAmplitude, amp, factor);
        this.previousAmplitude = smoothAmp;
        return smoothAmp;
    };

    getLerp(a, b, t) {
        return a + (b - a) * t;
    }

}







///////////////////////////////////////////////////////
// Side Twin Triangle
///////////////////////////////////////////////////////
class SideTwinTriangle extends PIXI.Graphics {
    constructor(opt){
        super();
        this.setting(opt);
    }

    setting(opt){
        this.options = opt;
        this.leftTriangle = new PIXI.Graphics();
        this.rightTriangle = new PIXI.Graphics();

        this.rectFull = new PIXI.Graphics();
        this.rectFull.beginFill(0x000000, 1);
        this.rectFull.drawRect(0, 0, this.options.stageWidth, this.options.stageHeight);
        this.rectFull.endFill();
        this.addChildAt(this.rectFull, 0);

        this.leftTriangle.beginFill(0xe82d6c, 1);
        this.leftTriangle.moveTo(0,0);
        this.leftTriangle.lineTo(this.options.stageWidth, 0);
        this.leftTriangle.lineTo(0, this.options.stageHeight);
        this.leftTriangle.endFill();

        this.rightTriangle.beginFill(0x00b3ab, 1);
        this.rightTriangle.moveTo(0,0);
        this.rightTriangle.lineTo(0, this.options.stageHeight);
        this.rightTriangle.lineTo(-this.options.stageWidth, this.options.stageHeight);
        this.rightTriangle.endFill();

        this.rightTriangle.x = this.options.stageWidth;
        this.leftTriangle.scale.x = 0;
        this.rightTriangle.scale.x = 0;

        this.addChild(this.leftTriangle);
        this.addChild(this.rightTriangle);

        this.num = 0;
        this.previousAmplitude = 0;
        this.previousAlpha = 0;
    }

    init(){

    }

    render(data){
        var per = (data.avg_frequency * 2) / 120;

        var tgAlpha = data.isStrong ? 1 : 0;
        tgAlpha = data.pow_time>4 ? tgAlpha/5 : tgAlpha;

        var alpha = this.previousAlpha + (tgAlpha - this.previousAlpha) * 0.2;
        this.previousAlpha = alpha;
        this.rectFull.alpha = alpha;

        var smooth = this.getAmplitudeSmooth(per, 0.3);

        this.leftTriangle.scale.x = smooth//dataArr[0]/250;
        this.rightTriangle.scale.x = smooth//dataArr[1]/250;


    }

    resize(){
        this.leftTriangle.clear();
        this.leftTriangle.beginFill(0xe82d6c, 1);
        this.leftTriangle.moveTo(0,0);
        this.leftTriangle.lineTo(this.options.stageWidth, 0);
        this.leftTriangle.lineTo(0, this.options.stageHeight);
        this.leftTriangle.endFill();

        this.rightTriangle.clear();
        this.rightTriangle.beginFill(0x00b3ab, 1);
        this.rightTriangle.moveTo(0,0);
        this.rightTriangle.lineTo(0, this.options.stageHeight);
        this.rightTriangle.lineTo(-this.options.stageWidth, this.options.stageHeight);
        this.rightTriangle.endFill();
        this.rightTriangle.x = this.options.stageWidth;
        this.rectFull.width = this.options.stageWidth;
        this.rectFull.height = this.options.stageHeight;

    }

    // data arr를 avgNum 수 만큼의 영역으로 평균 구함
    getAvgArr(arr, avgNum) {

        var maxArange = arr.length/4;
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

    getAmplitudeSmooth(amplitude, factor = 0.15) {
        const amp = amplitude;
        const smoothAmp = this.smoothAmplitude(amp, factor);
        return smoothAmp;
    };

    smoothAmplitude(amp, factor = 0.15) {
        const smoothAmp = this.getLerp(this.previousAmplitude, amp, factor);
        this.previousAmplitude = smoothAmp;
        return smoothAmp;
    };

    getLerp(a, b, t) {
        return a + (b - a) * t;
    }

}








///////////////////////////////////////////////////////
// middle stick
///////////////////////////////////////////////////////
class MiddleStickLine extends PIXI.Graphics {
    constructor(opt){
        super();
        this.setting(opt);
    }

    setting(opt){
        this.options = opt;
        this.container = new PIXI.Graphics();

        this.containerArr = [];

        var linwW = 5;
        var linwH = this.options.stageHeight/4;
        var lineNum = Math.min(Math.floor(this.options.stageWidth / 60), 10);

        for(var i=0 ; i<lineNum ; i++){

            var topLine = new PIXI.Graphics();
            var botLine = new PIXI.Graphics();
            var lineCon = new PIXI.Sprite();

            var direc = Math.random() > 0.5 ? 1 : -1;

            topLine.beginFill(0x000000, 1);
            topLine.drawRect(-linwW/2, 0, linwW, linwH*direc);
            topLine.endFill();

            botLine.beginFill(0x000000, 1);
            botLine.drawRect(-linwW/2, 0, linwW, linwH*-direc);
            botLine.endFill();

            lineCon.addChild(topLine);
            lineCon.addChild(botLine);

            lineCon.x = Math.floor(this.options.stageWidth/(lineNum+1)* (i+1));
            lineCon.y = this.options.stageHeight/2;
            topLine.scale.y = 0;
            botLine.scale.y = 0;
            this.container.addChild(lineCon);
            this.containerArr.push({index:i, top:topLine, topPow:0, bot:botLine, botPow:0, con:lineCon})
        }

        this.addChild(this.container);

        this.shuffle(this.containerArr);

        this.prevPow = 0;
        this.timerNum = 0;
        this.timerDirection = 1;
    }

    init(){

    }

    render(data){

        this.timerNum++;

        var dataArr = this.getAvgArr(data.frequencyData, this.containerArr.length * 2);

        var timePow = data.pow_time > 5 ? 2 : 1;
        var spd = data.pow_time > 5 ? 0.4 : 0.2;
        var tgPow = data.avg_frequency > 40 ? data.avg_frequency/250 : 0;
        var pow = this.prevPow + (tgPow - this.prevPow) * 0.3;
        var tgRotation = pow * this.timerDirection;
        this.prevPow = pow;

        if(this.timerNum > 200 && pow<0.1){
            this.timerNum = 0;
            this.timerDirection *= -1;
        }

        for(var i=0 ; i<this.containerArr.length; i++){
            var lineTop = this.containerArr[i].top;
            var lineTopPow = this.containerArr[i].topPow;
            var lineBot = this.containerArr[i].bot;
            var lineBotPow = this.containerArr[i].botPow;
            var lineCon = this.containerArr[i].con;
            lineCon.rotation = tgRotation;

            var perNum = 150;
            var topPer = lineTopPow + (dataArr[i]/perNum*timePow - lineTopPow) * spd;
            this.containerArr[i].topPow = topPer;

            var botPer = lineBotPow + (dataArr[i+this.containerArr.length]/perNum*timePow  - lineBotPow) * spd;
            this.containerArr[i].botPow = botPer;

            lineTop.scale.y = topPer + 0.03;
            lineBot.scale.y = botPer + 0.03;

            lineTop.scale.x =  pow * 20 + 1;
            lineBot.scale.x =  pow * 20 + 1;



        }

    }


    resize(){
        for(var i=0 ; i<this.containerArr.length ; i++) {

            var lineCon = this.containerArr[i].con;

            lineCon.x = Math.floor(this.options.stageWidth / (this.containerArr.length + 1) * (i + 1));
            lineCon.y = this.options.stageHeight / 2;

        }
    };

    // data arr를 avgNum 수 만큼의 영역으로 평균 구함
    getAvgArr(arr, avgNum) {

        var maxArange = arr.length/4;
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
    };


}





///////////////////////////////////////////////////////
// center multi Box
///////////////////////////////////////////////////////
class MiddleBarMulti extends PIXI.Graphics {
    constructor(opt){
        super();
        this.setting(opt);
    }

    setting(opt){
        this.options = opt;
        this.container = new PIXI.Graphics();
        this.barArr = [];

        var defaultW = 400;
        var centerBarW = this.options.stageWidth < 450 ? Math.floor(this.options.stageWidth*0.7) : defaultW;
        var centerBarH = centerBarW/6;
        this.container.beginFill(0xffffff, 1);
        this.container.drawRect(-centerBarW/2, -centerBarH/2, centerBarW, centerBarH);
        this.container.endFill();

        this.container.x = this.options.stageWidth/2;
        this.container.y = this.options.stageHeight/2;
        this.prevArr = [];

        var positionArr = [
            {x:82, y:0.6, w:30, h:300},
            {x:60, y:0.5, w:40, h:400},
            {x:153, y:0.6, w:150, h:500},
            {x:82, y:0.5, w:74, h:800},
            {x:260, y:0.4, w:86, h:500},
            {x:320, y:0.8, w:50, h:300},
            {x:350, y:0.9, w:50, h:300},
            {x:0, y:0.4, w:85, h:600},
            {x:350, y:0.1, w:50, h:300}
        ]

        var tot = positionArr.length;
        for(var i=0 ; i<tot ; i++){
            var bar = new PIXI.Graphics();

            var barW = positionArr[i].w/defaultW * centerBarW;
            var barH = positionArr[i].h/defaultW * centerBarW;

            var tgX = positionArr[i].x/defaultW * centerBarW - (centerBarW/2);
            var tgY = positionArr[i].y * -barH;
            bar.beginFill(0xffffff, 1);
            bar.drawRect(tgX, tgY, barW, barH);
            bar.endFill();
            bar.scale.y = 0;
            bar.tint = 0x013fb6;

            this.prevArr.push(0);
            this.barArr.push(bar);
            this.container.addChild(bar);
        }



        var pointBarX = 0;
        var pointBarH = this.options.stageHeight;
        this.prevPointBarScale = 0;
        this.isShowPointBar = false;
        this.pointBarFront = new PIXI.Graphics();
        this.pointBarFront.beginFill(0x013fb6, 1);
        this.pointBarFront.drawRect(pointBarX, -pointBarH/2, 2, pointBarH);
        this.pointBarFront.endFill();
        this.pointBarFront.scale.y = 0;

        this.pointBarBack = new PIXI.Graphics();
        this.pointBarBack.beginFill(0xffffff, 1);
        this.pointBarBack.drawRect(1, -pointBarH/2, 2, pointBarH);
        this.pointBarBack.endFill();
        this.pointBarBack.scale.y = 0;
        this.container.addChild(this.pointBarFront);
        this.container.addChildAt(this.pointBarBack, 0);

        this.addChild(this.container);
        this.container.tint = 0x013fb6;

        this.rectFull = new PIXI.Graphics();
        this.rectFull.beginFill(0xffffff, 1);
        this.rectFull.drawRect(0, 0, this.options.stageWidth, this.options.stageHeight);
        this.rectFull.endFill();
        this.addChildAt(this.rectFull, 0);
    }

    init(){

    }

    render(data){

        //ff5f0b
        var barColor = data.isStrong ? 0xffffff : 0x013fb6;
        var bgColor = data.isStrong ? 0x013fb6 : 0xffffff;

        var tot = this.barArr.length;
        var avgArr = this.getAvgArr(data.frequencyData, tot);

        for(var i=0 ; i<tot ; i++) {
            var bar = this.barArr[i];
            var pow = avgArr[i]/180;
            var per = this.prevArr[i] + (pow - this.prevArr[i]) * 0.2;
            this.prevArr[i] = per;
            bar.scale.y = per;
            bar.tint = barColor;
        }
        this.rectFull.tint = bgColor;

        var pointBarPow = 0;
        var tgPow = 0;
        var maxPow = 5;

        if(!this.isShowPointBar){
            if(data.pow_time > maxPow){
                this.isShowPointBar = true;
                var ranX = Math.random() * 300 - 150;
                this.pointBarFront.x = ranX;
                this.pointBarBack.x = ranX;

                pointBarPow = 1;
                this.prevPointBarScale = pointBarPow;
                this.pointBarFront.scale.y = pointBarPow;
                this.pointBarBack.scale.y = pointBarPow;
            }

        } else {

            if(data.pow_time > maxPow){
                tgPow = data.pow_time/maxPow;
                pointBarPow = this.prevPointBarScale + (tgPow - this.prevPointBarScale) * 0.1;
            }

            this.prevPointBarScale = pointBarPow;
            this.pointBarFront.scale.y = pointBarPow;
            this.pointBarBack.scale.y = pointBarPow;


            if(this.prevPointBarScale <= 0.001){
                this.isShowPointBar = false;
            }
        }

        this.container.x = this.options.stageWidth/2;
        this.container.y = this.options.stageHeight/2;

    }

    resize(){

    }


    // data arr를 avgNum 수 만큼의 영역으로 평균 구함
    getAvgArr(arr, avgNum) {

        var maxArange = arr.length/4;
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
    };

}



















///////////////////////////////////////////////////////
// circle multi
///////////////////////////////////////////////////////
class CircleMultiTypeContent extends PIXI.Graphics {
    constructor(opt){
        super();
        this.setting(opt);
    }

    setting(opt){
        this.container = new PIXI.Sprite();

        this.options = opt;
        this.circleArr = [];
        this.timerIndex = 0;

        this.curAngleTotal = 6;
        this.nextAngleGap = 0;

        this.isMoving = false;
        this.previousAmplitude = 0;

        for(var i=0 ; i<this.curAngleTotal ; i++){
            var circle = new PIXI.Graphics();
            circle.beginFill(0xccff00, 0.8);
            circle.drawCircle(0, 0, 10);
            circle.endFill();

            this.circleArr.push(circle);
            this.container.addChild(circle);
        }

        this.container.x = this.options.stageWidth/2;
        this.container.y = this.options.stageHeight/2;
        this.addChild(this.container);

        this.rectFull = new PIXI.Graphics();
        this.rectFull.beginFill(0x018f8a, 1);
        this.rectFull.drawRect(0, 0, this.options.stageWidth, this.options.stageHeight);
        this.rectFull.endFill();
        this.addChildAt(this.rectFull, 0);


        this.smoothPow = 0;
        this.previousPow = 0;

    }

    init(){

    }


    render(data){
        this.timerIndex++;

        var circleAngle =  this.curAngleTotal;
        if(this.isMoving){
            var smooth = this.getAmplitudeSmooth(1, 0.08);
            var smothAngle = this.nextAngleGap * smooth;
            circleAngle = this.curAngleTotal + smothAngle;

            if(smooth > 0.999){
                //transition end
                this.isMoving = false;
                this.curAngleTotal = this.curAngleTotal + this.nextAngleGap;
            }
        }



        var PI_HALF = Math.PI / 180;
        var tot = this.circleArr.length;
        var pow = data.avg_frequency*3 / 50;
        var radius = this.options.stageWidth / 4;
        var circle, angle;

        var circleScale = 1 - circleAngle * 0.05;

        //a + (b - a) * t
        this.smoothPow = this.previousPow + (pow - this.previousPow) * 0.3;
        this.previousPow = this.smoothPow;

        for(var i=0 ; i<tot ; i++) {
            circle = this.circleArr[i];
            // pow = powArr[i]/256;
            circle.scale.set(this.smoothPow + 1 + circleScale);
            /*circle.scale.x = pow + 1 + circleScale;
            circle.scale.y = pow + 1 + circleScale;*/

            angle = (i * 360) / circleAngle;
            circle.x = (radius) * Math.sin(PI_HALF * angle);
            circle.y = (radius) * Math.cos(PI_HALF * angle);
        }




        //data.isStrong &&
        if(this.timerIndex > 100 && !this.isMoving){
            this.isMoving = true;
            this.timerIndex = 0;
            this.previousAmplitude = 0;

            this.nextAngleGap = Math.floor(Math.random() * 4) - 2;
            if(this.curAngleTotal + this.nextAngleGap < 2 || this.curAngleTotal + this.nextAngleGap > this.circleArr.length-1) this.nextAngleGap = 0;
        }



        this.rectFull.alpha = 2- (this.smoothPow);

        this.container.x = this.options.stageWidth/2;
        this.container.y = this.options.stageHeight/2;
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

    getAmplitudeSmooth(amplitude, factor = 0.15) {
        const amp = amplitude;
        const smoothAmp = this.smoothAmplitude(amp, factor);
        return smoothAmp;
    };

    smoothAmplitude(amp, factor = 0.15) {
        const smoothAmp = this.getLerp(this.previousAmplitude, amp, factor);
        this.previousAmplitude = smoothAmp;
        return smoothAmp;
    };

    getLerp(a, b, t) {
        return a + (b - a) * t;
    }
}





///////////////////////////////////////////////////////
// Triangle Gradient
///////////////////////////////////////////////////////
class TriangleGradient extends PIXI.Graphics {
    constructor(opt){
        super();
        this.setting(opt);
    }

    setting(opt){
        this.options = opt;
        this.container = new PIXI.Graphics();

        this.beginFill(0x000000, 1);
        this.drawRect(0, 0, this.options.stageWidth, this.options.stageHeight);
        this.endFill();

        this.container.beginFill(0xff0000, 1);
        this.container.moveTo(0,0);
        this.container.lineTo(-this.options.stageWidth/2, -this.options.stageHeight);
        this.container.lineTo(this.options.stageWidth/2, -this.options.stageHeight);
        this.container.endFill();

        this.container.x = this.options.stageWidth/2;
        this.container.y = this.options.stageHeight;

        this.addChild(this.container);

        this.container.scale.x = 0;

        this.num = 0;
        this.previousAmplitude = 0;
    }

    init(){

    }

    render(data){
        var per = (data.avg_frequency * 2) / 120;
        var num = Math.floor( per * 255 );
        var shapeColor = "0x"+num.toString(16)+"0000";
        // this.container.scale.x = per;
        this.container.tint = shapeColor;


        var smooth = this.getAmplitudeSmooth(per, 0.5);
        this.container.scale.x = smooth;
        // var smothAngle = this.nextAngleGap * smooth;


        /*this.num += 0.1
        this.container.scale.x = Math.sin(this.num);*/

    }

    resize(){

    }


    getAmplitudeSmooth(amplitude, factor = 0.15) {
        const amp = amplitude;
        const smoothAmp = this.smoothAmplitude(amp, factor);
        return smoothAmp;
    };

    smoothAmplitude(amp, factor = 0.15) {
        const smoothAmp = this.getLerp(this.previousAmplitude, amp, factor);
        this.previousAmplitude = smoothAmp;
        return smoothAmp;
    };

    getLerp(a, b, t) {
        return a + (b - a) * t;
    }

}






///////////////////////////////////////////////////////
// Box multi
///////////////////////////////////////////////////////
class RectMultiTypeContent extends PIXI.Graphics {
    constructor(opt){
        super();
        this.setting(opt);
    }

    setting(opt){
        this.options = opt;
        this.rectArr = [];
        this.addRectArr = [];
        this.curIndex = 4;
        this.vertiNum = 6;
        this.timerIndex = 0;
        this.previousPow = 0;

        var max = this.vertiNum*this.vertiNum;
        for(var i=0 ; i<max ; i++){
            var rect = new PIXI.Graphics();
            rect.beginFill(0x000000, 1);
            rect.drawRect(0, 0, 100, 100);
            rect.endFill();
            this.rectArr.push(rect);

            // this.addChild(rect);
        }

        this.rectFull = new PIXI.Graphics();
        this.rectFull.beginFill(0x000000, 0.5);
        this.rectFull.drawRect(0, 0, this.options.stageWidth, this.options.stageHeight);
        this.rectFull.endFill();
        this.addChild(this.rectFull);

    }

    init(){

    }


    setLayOut(){
        var rectW = this.options.stageWidth / this.curIndex;
        var rectH = this.options.stageHeight / this.curIndex;

        var addMax = this.curIndex * this.curIndex;

        this.addRectArr = [];

        for(var i=0 ; i<this.rectArr.length ; i++){
            var rect = this.rectArr[i];
            rect.width = rectW;
            rect.height = rectH;

            rect.x = (i%this.curIndex) * rectW;
            rect.y = Math.floor(i/this.curIndex) * rectH;

            if(addMax > i){
                this.addRectArr.push(rect);
                this.addChildAt(rect, 0);
            } else {
                if(rect.parent) this.removeChild(rect);
            }

        }

        this.shuffle(this.addRectArr);
    }

    render(data){
        this.timerIndex++;
        if(this.timerIndex <= 1){
            this.setLayOut();
        }

        if(this.timerIndex > 100 && data.isStrong){
            this.timerIndex = 0;
            this.curIndex = Math.floor(Math.random() * this.vertiNum) + 1;
        }

        this.rectFull.alpha = data.avg_frequency/ 150;

        var dataArr = this.getAvgArr(data.frequencyData, this.addRectArr.length);

        for(var i=0 ; i<this.addRectArr.length ; i++){
            var rect = this.addRectArr[i];
            var per = dataArr[i]/128;
            per = per < 0.1 ? 0.1 : per;

            rect.alpha = rect.alpha + (per - rect.alpha) * 0.3;
        }




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
    };



}







///////////////////////////////////////////////////////
// Box
///////////////////////////////////////////////////////
class RectTypeContent extends PIXI.Graphics {
    constructor(opt){
        super();
        this.setting(opt);
    }

    setting(opt){
        this.options = opt;
        this.size = 50;

        this.rectFull = new PIXI.Graphics();
        this.rectFull.beginFill(0x000000, 1);
        this.rectFull.drawRect(0, 0, this.options.stageWidth, this.options.stageHeight);
        this.rectFull.endFill();

        var rectSize = this.options.stageWidth > this.options.stageHeight ? this.options.stageHeight/2 : this.options.stageWidth/2;
        this.rectCenter = new PIXI.Graphics();
        this.rectCenter.beginFill(0x000000, 0.1);
        this.rectCenter.drawRect(-this.options.stageWidth/4, -this.options.stageHeight/4, this.options.stageWidth/2, this.options.stageHeight/2);
        this.rectCenter.endFill();

        this.rectCenter.x = this.options.stageWidth/2;
        this.rectCenter.y = this.options.stageHeight/2;

        this.addChild(this.rectFull);
        this.addChild(this.rectCenter);

        this.prevPer = 0;
    }

    init(){
    }

    render(data){
        var pow = data.avg_frequency;
        var per = pow/100;

        var alpha = this.prevPer + (per - this.prevPer) * 0.3;
        this.prevPer = alpha;

        this.rectFull.alpha = 1 - alpha;
        // this.rectCenter.alpha = per;

        this.rectCenter.scale.x = alpha*3;
        this.rectCenter.scale.y = alpha*3;
    }

    resize(){

    }
}






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

        this.prevAvgArr = [];

        var tot = 8;
        for(var i=0 ; i<tot ; i++){
            var circle = new PIXI.Graphics();
            // circle.y = -100;
            this.circleArr.push(circle);
            this.container.addChild(circle);
            this.rotationArr.push( (i * 360) / tot + this.plusAngle );

            this.prevAvgArr.push(0);
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


            var pow = this.prevAvgArr[i] + (avg_arr[i]/2 - this.prevAvgArr[i]) * 0.3;
            this.prevAvgArr[i] = pow;

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


            var circleTgX = (radius+(pow*1.5)) * Math.sin(PI_HALF * angle);
            var circleTgY = (radius+(pow*1.5)) * Math.cos(PI_HALF * angle);
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
        this.prevAvg_arr = [];
        this.pointArr = [];
        this.total = 20;
        for(var i=0 ; i<this.total ; i++){
            this.pointArr.push(0);
            this.prevAvg_arr.push(0);
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

            var tgPow = avg_arr[pointIndex]/256 * this.options.stageWidth/4;
            var pow = this.prevAvg_arr[pointIndex] + (tgPow - this.prevAvg_arr[pointIndex]) * 0.3;
            this.prevAvg_arr[pointIndex] = tgPow;

            pointIndex = pointIndex + pointDirection;
            if(pointIndex < 0){
                pointIndex = pointIndex + 1;
                pointDirection = 1;
            }


            // var tgX = i%2 ? centerX - (pow*-1) : centerX - (pow);

            this.pointArr[i] = this.pointArr[i] + (pow);
            var tgX = i%2 ? centerX - this.pointArr[i] : centerX + this.pointArr[i] ;
            var tgY = this.options.stageHeight/(tot+1) * (i+1);
            this.pointArr[i] *= 0.2;

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