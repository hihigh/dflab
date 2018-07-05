



var VideoDisplacementMap = function(args, video){

    var opts = args || {};
    var _this = this;

    var _ratio = Math.floor(window.devicePixelRatio);

    var renderer, scene, cameraL, light, light2, controls,
        geometry, material, texture, plane;

    var SCREEN_WIDTH = window.innerWidth,
        SCREEN_HEIGHT = window.innerHeight;

    var container = document.getElementById("displ");
    var video = video//document.getElementById("gum-local");

    function setting(opts, _ratio){

    }

    function _init(){
        scene = new THREE.Scene();

        cameraL = new THREE.PerspectiveCamera(75, SCREEN_WIDTH / SCREEN_HEIGHT, 1, 1000);
        cameraL.position.set(0, 0, 150);
        controls = new THREE.OrbitControls(cameraL);
        scene.add(cameraL);

        light = new THREE.AmbientLight(0xffffff);
        scene.add(light);

        light2 = new THREE.DirectionalLight(0xffffff, 1);
        light2.position.set(20, 20, 20);
        scene.add(light2);

        geometry = new THREE.PlaneGeometry(96, 54, 128, 128);
        //w, h, seX, seY
        texture = new THREE.VideoTexture(video);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.format = THREE.RGBFormat;

        material = new THREE.MeshPhongMaterial({
            side: THREE.DoubleSide,    // 両面に映す
            map: texture,              // テクスチャ
            displacementMap: texture,  // displacementのテクスチャ
            displacementScale: -12     // displacementの大きさ
        });
        plane = new THREE.Mesh(geometry, material);
        plane.geometry.verticesNeedUpdate = true;
        scene.add(plane);

        renderer = new THREE.WebGLRenderer({antialias: true});
        renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
        renderer.setClearColor(0x000000);
        renderer.autoClear = false;

        container.appendChild(renderer.domElement);

        render();
    }



    function render() {
        requestAnimationFrame(render);
        controls.update();
        plane.geometry.verticesNeedUpdate = true;

        cameraL.aspect = SCREEN_WIDTH / SCREEN_HEIGHT;
        cameraL.updateProjectionMatrix();

        renderer.setViewport(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
        renderer.clear();

        renderer.setViewport(1, 1, SCREEN_WIDTH, SCREEN_HEIGHT);
        renderer.render(scene, cameraL);

    }


    return {
        init: _init
    }





}
















