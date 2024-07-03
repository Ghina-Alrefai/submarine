import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as dat from 'dat.gui';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

let camera, scene, renderer;
let controls, water, sun, clock;
const mixers = [];
let submarine; // To hold the submarine model

init();
animate();

function init() {
  renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 20000);
  camera.position.set(0, 200, 1000000);
  sun = new THREE.Vector3();

  // Water
  const waterGeometry = new THREE.PlaneGeometry(100000, 100000);
  const texture = new THREE.TextureLoader().load("textures/sea1/waternormals.png");
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  water = new Water(
    waterGeometry,
    {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: texture,
      sunDirection: new THREE.Vector3(),
      sunColor: 0xffffff,
      waterColor: 0x001e0f,
      distortionScale: 3.7,
      fog: scene.fog !== undefined
    }
  );
  water.rotation.x = -Math.PI / 2;
  scene.add(water);

  // Light
  const ambientLight = new THREE.AmbientLight('white', 1);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight('white', 0.5);
  directionalLight.position.x = 1;
  directionalLight.position.z = 2;
  scene.add(directionalLight);

  const moveDirection = new THREE.Vector3();

  // Skybox
  const sky = new Sky();
  sky.scale.setScalar(100000);
  scene.add(sky);

  const skyUniforms = sky.material.uniforms;
  skyUniforms['turbidity'].value = 10;
  skyUniforms['rayleigh'].value = 2;
  skyUniforms['mieCoefficient'].value = 0.005;
  skyUniforms['mieDirectionalG'].value = 0.8;

  const parameters = {
    elevation: 2,
    azimuth: 180
  };

  const pmremGenerator = new THREE.PMREMGenerator(renderer);

  function updateSun() {
    const phi = THREE.MathUtils.degToRad(90 - parameters.elevation);
    const theta = THREE.MathUtils.degToRad(parameters.azimuth);
    sun.setFromSphericalCoords(1, phi, theta);
    sky.material.uniforms['sunPosition'].value.copy(sun);
    water.material.uniforms['sunDirection'].value.copy(sun).normalize();
    scene.environment = pmremGenerator.fromScene(sky).texture;
  }

  updateSun();

  controls = new OrbitControls(camera, renderer.domElement);
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.target.set(0, 10, 8900);
  controls.minDistance = 40.0;
  controls.maxDistance = 200.0;
  controls.update();

  const waterUniforms = water.material.uniforms;

  window.addEventListener('resize', onWindowResize);

  // Debug UI
  const gui = new dat.GUI();
  gui.add(parameters, 'elevation', -90, 180).onChange(updateSun);
  gui.add(parameters, 'azimuth', -180, 180).onChange(updateSun);

  const loader = new GLTFLoader();
  loader.load('model/submarine.glb', function (glb) {
    submarine = glb.scene;
    scene.add(submarine);
    submarine.position.set(100, -150, 8500);
    submarine.scale.set(3, 3, 3);

    // Submarine movement controls
    const submarineFolder = gui.addFolder('Submarine Position');
    submarineFolder.add(submarine.position, 'x', -1000, 1000).name('Move X');
    submarineFolder.add(submarine.position, 'y', -1000, 1000).name('Move Y');
    submarineFolder.add(submarine.position, 'z', -1000, 10000).name('Move Z');

    // Submarine rotation controls
    submarineFolder.add(submarine.rotation, 'x', 0, Math.PI * 2).name('Rotate X');
    submarineFolder.add(submarine.rotation, 'y', 0, Math.PI * 2).name('Rotate Y');
    submarineFolder.add(submarine.rotation, 'z', 0, Math.PI * 2).name('Rotate Z');
    submarineFolder.open();
  });

  const mtlLoader = new MTLLoader();
  mtlLoader.load('model/island3.mtl', function (materials) {
    materials.preload();

    const objLoader = new OBJLoader();
    objLoader.setMaterials(materials);
    objLoader.load('model/island3.obj', function (obj) {
      scene.add(obj);
      obj.position.set(-10000, -50, -50);
      obj.scale.set(10, 10, 10);
    });
  });

  mtlLoader.load('model/island3.mtl', function (materials) {
    materials.preload();

    const objLoader = new OBJLoader();
    objLoader.setMaterials(materials);
    objLoader.load('model/island3.obj', function (obj) {
      scene.add(obj);
      obj.position.set(5900, -50, -50);
      obj.scale.set(10, 10, 10);
    });
  });

  mtlLoader.load('model/island3.mtl', function (materials) {
    materials.preload();

    const objLoader = new OBJLoader();
    objLoader.setMaterials(materials);
    objLoader.load('model/island3.obj', function (obj) {
      scene.add(obj);
      obj.position.set(-15000, -50, -50);
      obj.scale.set(10, 10, 10);
    });
  });

  loader.load('model/birds.glb', function (glb) {
    const model = glb.scene;
    scene.add(model);
    model.position.set(0, 1500, 0);
    model.scale.set(500, 500, 500);

    // Check if the model has animations
    if (glb.animations && glb.animations.length) {
      const mixer = new THREE.AnimationMixer(model);
      glb.animations.forEach((clip) => {
        mixer.clipAction(clip).play();
      });
      mixers.push(mixer);
    }
  });

  clock = new THREE.Clock();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;

function onKeyDown(event) {
  switch (event.keyCode) {
    case 87: // W
      moveForward = true;
      break;
    case 65: // A
      moveLeft = true;
      break;
    case 83: // S
      moveBackward = true;
      break;
    case 68: // D
      moveRight = true;
      break;
  }
}

function onKeyUp(event) {
  switch (event.keyCode) {
    case 87: // W
      moveForward = false;
      break;
    case 65: // A
      moveLeft = false;
      break;
    case 83: // S
      moveBackward = false;
      break;
    case 68: // D
      moveRight = false;
      break;
  }
}

function draw() {
  const delta = clock.getDelta();
  if (moveForward) camera.translateZ(-10 * delta);
  if (moveBackward) camera.translateZ(10 * delta);
  if (moveLeft) camera.translateX(-10 * delta);
  if (moveRight) camera.translateX(10 * delta);
  mixers.forEach((mixer) => mixer.update(delta));
  renderer.render(scene, camera);
  renderer.setAnimationLoop(draw);
}

function animate() {
  requestAnimationFrame(animate);
  render();
}

function render() {
  water.material.uniforms['time'].value += 1.0 / 60.0;
  renderer.render(scene, camera);
}

window.addEventListener('resize', onWindowResize);
document.addEventListener('keydown', onKeyDown, false);
document.addEventListener('keyup', onKeyUp, false);

draw();
