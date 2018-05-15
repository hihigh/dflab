var FilterImage = function(args){

    var opts = args || {};
    var _this = this;

    var renderNum = 0;
    var image_thumb;

    var video = document.querySelector('#gum-local');
    var constraints = window.constraints = {
        audio: false,
        // video: true
        video: { facingMode: { exact: "user" } }
    };

    this.setting(opts);
    this.setLayout();

    this.init = function(){
        _this.addToStage();
        addEvent();
        checkVideoSrc();
    };



    var checkVideoSrc = function(){

        navigator.mediaDevices.getUserMedia(constraints).
        then(handleSuccess).catch(handleError);
    };


    var handleSuccess = function(stream) {
        var videoTracks = stream.getVideoTracks();
        console.log('Got stream with constraints:', constraints);
        console.log('Using video device: ' + videoTracks[0].label);
        stream.oninactive = function() {
            console.log('Stream inactive');
        };
        window.stream = stream; // make variable available to browser console
        video.srcObject = stream;

        startVideoPlay();
    };

    var handleError = function(error) {
        console.error("error");
        var url = "./video/test_v0.mp4";
        video.src = url;

        startVideoPlay();
    };

    var startVideoPlay = function(){
        video.onloadedmetadata = function() {
            setSprite();
            addEvent();
            // drawCanvas();
        };
    };


    var setSprite = function(){
        var image_thumb = new ImageThumb(video);
        image_thumb.init();
        _this.pixi.mainContainer.addChild(image_thumb);
    };



    var drawCanvas = function(){
        _this.pixi.render.add(function( dleta ) {
            renderNum++;
            if(image_thumb) image_thumb.render();

        });
    };


    var addEvent = function(){
        var btn = document.querySelector("#gum-local");
        // btn.addEventListener("touchstart", saveImage);


    };

    var saveImage = function(){


        /*var url = filterPixi.saveImage();

        var img = document.createElement('img');
        img.src = url;

        var wrap = document.querySelector(".wrap-capture");
        wrap.appendChild(img);*/


        var canvas = document.querySelector(".content canvas");

        var img = document.createElement('img');
        img.src = canvas.toDataURL();

        var wrap = document.querySelector(".wrap-capture");
        wrap.appendChild(img);

        var image = new Image();
        image.src = canvas.toDataURL();;

        var w = window.open("");
        w.document.write(image.outerHTML);

    }

};



FilterImage.prototype = {
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

        console.log(this.options)
    },

    resetValue : function(){

    },

    saveImage : function(){
        var url = this.pixi.app.renderer.view.toDataURL("image/png", 1)
        return url;
    }
};











/*
* image Thumbnail
* */
class ImageThumb extends PIXI.Sprite {
    constructor(video){
        super();
        this.setting(video);
    }

    setting(video){

        this.settingFilters();


        this.texture = PIXI.Texture.fromVideo(video);

        var ratio = window.devicePixelRatio;
        var stH = filterPixi.pixi.app.screen.height;

        var per = stH / video.videoHeight;

        this.height = stH * ratio;
        this.width = (video.videoWidth * per) * ratio;


        /*var ratio = 1;

        var per = (filterPixi.options.stageHeight * ratio) / video.videoHeight;

        this.height = filterPixi.options.stageHeight * ratio;
        this.width = video.videoWidth * per;
        this.x = -(this.width - (oriW*ratio)) * 0.5;*/

        /*var per = (filterPixi.options.stageWidth * window.devicePixelRatio) / video.videoWidth;

        this.width = filterPixi.options.stageWidth * window.devicePixelRatio;
        this.height = video.videoHeight * per;*/

        this.filters = [this.filtersArr[this.filtersIndex]];
    }

    settingFilters(){
        var filter;
        this.filtersArr = [];
        this.filtersIndex = 0;

        this.filtersArr.push("");

        filter = new PIXI.filters.CRTFilter();
        this.filtersArr.push(filter);

        filter = new PIXI.filters.GodrayFilter();
        this.filtersArr.push(filter);

        filter = new PIXI.filters.PixelateFilter();
        filter.size.x = 5;
        filter.size.y = 5;
        this.filtersArr.push(filter);

        filter = new PIXI.filters.DotFilter();
        filter.scale = 0.4;
        this.filtersArr.push(filter);

        filter = new PIXI.filters.DotFilter();
        filter.scale = 0;
        this.filtersArr.push(filter);

        filter = new PIXI.filters.RGBSplitFilter();
        this.filtersArr.push(filter);

        filter = new PIXI.filters.OldFilmFilter();
        this.filtersArr.push(filter);

        var colorMatrix =  [
            1,0,0,0,
            0,1,0,0,
            0,0,1,0,
            0,0,0,1
        ];
        filter = new PIXI.filters.ColorMatrixFilter();
        filter.matrix = colorMatrix;
        this.filtersArr.push(filter);

        filter = new PIXI.filters.CrossHatchFilter();
        this.filtersArr.push(filter);


    }

    init(){
        this.interactive = true;
        this.buttonMode = true;

        this.on('pointertap', this.changeFilters);
    }

    changeFilters(){
        this.filtersIndex = (this.filtersIndex + 1) % this.filtersArr.length;
        this.filters = [this.filtersArr[this.filtersIndex]];

    }

    render(){

    }


}
















