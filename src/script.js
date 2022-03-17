//#region imports
import "./style.css";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { HalftonePass } from "three/examples/jsm/postprocessing/HalftonePass.js";
import * as dat from "dat.gui";
import grassFragment from "./shaders/grass_shaders/grassFragment.glsl";
import grassVertex from "./shaders/grass_shaders/grassVertex.glsl";
//#endregion

//#region initial setup
/**
 * Base
 */
// Debug
const gui = new dat.GUI();

// Canvas
const canvas = document.querySelector("canvas.webgl");

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x894dea);

/**
 * Lights
 */
const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
scene.add(ambientLight);

const hemLight = new THREE.HemisphereLight(0xfff, 0xfff, 0.19);
scene.add(hemLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.set(1024, 1024);
directionalLight.shadow.camera.far = 15;
directionalLight.shadow.camera.left = -7;
directionalLight.shadow.camera.top = 7;
directionalLight.shadow.camera.right = 7;
directionalLight.shadow.camera.bottom = -7;
directionalLight.position.set(0, 19.6, 16.23);
scene.add(directionalLight);

/**
 * Sizes
 */
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};
/**
 * Camera
 */
const camera = new THREE.PerspectiveCamera(
  70,
  sizes.width / sizes.height,
  0.1,
  10000
);
camera.position.set(2, 2, 5);
scene.add(camera);

/* 
  Controls
 */
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0.75, 0);
controls.enableDamping = true;

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

/* 
  GLTF loader
*/
const gltfLoader = new GLTFLoader();

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("/draco");
gltfLoader.setDRACOLoader(dracoLoader);

//#endregion

//#region global parameters
let modelLoaded = false;

let globalParams = {
  modelTypeIndex: 2,
};

let modelFiles = [
  "/models/worldkart2_level123_v64_smart_unwrapped/worldkart2_level123_v64_smart_unwrappedgltf.gltf",
  "/models/worldkart2_level123_v64_unwrapped/worldkart2_level123_v64_unwrappedgltf.gltf",
  "/models/worldkart2_level123_v64/worldkart2_level123_v64.gltf",
];

let grassTexParams = {
  toggleTex: false,
  texRepeat: 200,
};

let grasShaderParams = {
  zoomFactor: 10,
  spaceScale: 10,
  heightThreshold: 0.85,
  shaderType: 1,
  grassNormalSuppressionFactor: 2.25,
  hillNormalSuppressionFactor: 1.5,

  noiseColor: "#00f",

  colors: {
    grassColor: "#0d9b12",
    hillColor: "#f3c409",
  },

  marbleNoise: { marbleScaleFactor: 2.75 },
  turbulenceNoise: { turbulenceScaleFactor: 2.1 },
  halfTonIsh: { halfToneScaleFactor: 2.1 },
  iqNoise: { iqNoiseScaleFactor: 2.1 },
  gridPattern: { gridScaleFactor: 2.1 },
  simplexNoise: { simplexScaleFactor: 2.1 },
};

//#endregion

const loadMeSomeModel = (modelIndex) => {
  if (modelIndex >= 0 && modelIndex < modelFiles.length) {
    gltfLoader.load(
      modelFiles[modelIndex],
      (gltf) => {
        gltf.scene.position.set(0, 0, 0);
        scene.add(gltf.scene);

        modelLoaded = true;

        texOrShader(gltf.scene, grassTexParams.toggleTex, modelLoaded);
      },
      (progress) => {
        console.log((progress.loaded / progress.total) * 100 + "% loaded");
      },
      (error) => {
        console.log(error);
      }
    );
  } else {
    alert(
      "model index is out of range \n I'll load you the first model I have by default"
    );
    globalParams.modelTypeIndex = 0;
    loadMeSomeModel(globalParams.modelTypeIndex);
  }
};

loadMeSomeModel(globalParams.modelTypeIndex);

let grassModifiedShaderMaterial;

const texOrShader = (model, toggle, modelLoaded) => {
  if (modelLoaded) {
    const grassMesh = model.children[0].children[14];

    if (toggle) {
      const tx = new THREE.TextureLoader().load("/gr4.jpg");
      tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
      tx.repeat.set(grassTexParams.texRepeat, grassTexParams.texRepeat);

      const grassMaterial = new THREE.MeshStandardMaterial({ map: tx });
      grassMesh.material = grassMaterial;
    } else {
      grassModifiedShaderMaterial = new THREE.ShaderMaterial({
        vertexShader: grassVertex,
        fragmentShader: grassFragment,
        uniforms: {
          u_resolution: {
            value: {
              x: renderer.domElement.width,
              y: renderer.domElement.height,
            },
          },
          u_height_threshold: { value: grasShaderParams.heightThreshold },
          u_shader_type: { value: grasShaderParams.shaderType },
          u_uv_zoom_factor: { value: grasShaderParams.zoomFactor },
          u_space_scale_factor: { value: grasShaderParams.spaceScale },
          u_noise_color: {
            value: new THREE.Color(grasShaderParams.noiseColor),
          },
          u_grass_color: {
            value: new THREE.Color(grasShaderParams.colors.grassColor),
          },
          u_hill_color: {
            value: new THREE.Color(grasShaderParams.colors.hillColor),
          },
          u_grass_normal_suppression_factor: {
            value: grasShaderParams.grassNormalSuppressionFactor,
          },
          u_hill_normal_suppression_factor: {
            value: grasShaderParams.hillNormalSuppressionFactor,
          },

          u_marble_st_scale_factor: {
            value: grasShaderParams.marbleNoise.marbleScaleFactor,
          },

          u_turbulence_st_scale_factor: {
            value: grasShaderParams.turbulenceNoise.turbulenceScaleFactor,
          },
          u_halftone_st_scale_factor: {
            value: grasShaderParams.halfTonIsh.halfToneScaleFactor,
          },
          u_iqnoise_st_scale_factor: {
            value: grasShaderParams.iqNoise.iqNoiseScaleFactor,
          },
          u_grid_st_scale_factor: {
            value: grasShaderParams.gridPattern.gridScaleFactor,
          },
          u_simplex_st_scale_factor: {
            value: grasShaderParams.simplexNoise.simplexScaleFactor,
          },
        },
      });
      grassMesh.material = grassModifiedShaderMaterial;
    }
  }
};

window.addEventListener("resize", () => {
  // Update sizes
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  // Update camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

//#region postprocessing

const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);

const params = {
  shape: 1,
  radius: 1,
  rotateR: Math.PI / 12,
  rotateB: (Math.PI / 12) * 2,
  rotateG: (Math.PI / 12) * 3,
  scatter: 0,
  blending: 0.13,
  blendingMode: 1,
  greyscale: false,
  disable: false,
};

const halftonePass = new HalftonePass(
  window.innerWidth,
  window.innerHeight,
  params
);
composer.addPass(renderPass);
composer.addPass(halftonePass);

//#endregion

//#region   dat.GUI
const controller = {
  radius: halftonePass.uniforms["radius"].value,
  rotateR: halftonePass.uniforms["rotateR"].value / (Math.PI / 180),
  rotateG: halftonePass.uniforms["rotateG"].value / (Math.PI / 180),
  rotateB: halftonePass.uniforms["rotateB"].value / (Math.PI / 180),
  scatter: halftonePass.uniforms["scatter"].value,
  shape: halftonePass.uniforms["shape"].value,
  greyscale: halftonePass.uniforms["greyscale"].value,
  blending: halftonePass.uniforms["blending"].value,
  blendingMode: halftonePass.uniforms["blendingMode"].value,
  disable: halftonePass.uniforms["disable"].value,
};

gui.remember(grasShaderParams);
gui.saveToLocalStorageIfPossible = true;
gui.width = 300;

function onGUIChange() {
  // update uniforms
  halftonePass.uniforms["radius"].value = controller.radius;
  halftonePass.uniforms["rotateR"].value = controller.rotateR * (Math.PI / 180);
  halftonePass.uniforms["rotateG"].value = controller.rotateG * (Math.PI / 180);
  halftonePass.uniforms["rotateB"].value = controller.rotateB * (Math.PI / 180);
  halftonePass.uniforms["scatter"].value = controller.scatter;
  halftonePass.uniforms["shape"].value = controller.shape;
  halftonePass.uniforms["greyscale"].value = controller.greyscale;
  halftonePass.uniforms["blending"].value = controller.blending;
  halftonePass.uniforms["blendingMode"].value = controller.blendingMode;
  halftonePass.uniforms["disable"].value = controller.disable;
}

/* 
  A small utility function to make the dat.gui UI more flexible and prevent it from
  filling the screen vertically
*/
const updateUI = (index) => {
  if (grassTexParams.toggleTex) {
    grShader.hide();
    grTexture.show();
    grTexture.open();
  } else {
    grTexture.hide();
    grShader.show();
    grShader.open();
  }

  shaderTypeArray.forEach((folder) => {
    folder.close();
    folder.hide();
  });
  index--;
  shaderTypeArray[index].show();
  shaderTypeArray[index].open();
};

/* 
  Note: Model type selection is a bit tricky so the control is left out for now. Please change the model index
  number manually in the coode

  Model selector control to select between original/unwrapped/smart-unwrapped models

  let modelType = gui.addFolder("Model Type");
  modelType
  .add(globalParams, "modelTypeIndex", {
    SmartUnwrapped: 0,
    NormalUnwrapped: 1,
    OriginalUnwrapped: 2,
  })
  .onChange(() => {
    loadMeSomeModel(globalParams.modelTypeIndex);
    texOrShader(scene.children[4], grassTexParams.toggleTex, modelLoaded);
  });
  
*/

/* 
  Toggle between texture and shader for the grass pattern on the selected mesh
*/
let texorshader = gui.addFolder("Texture or shader");
texorshader.add(grassTexParams, "toggleTex").onChange(() => {
  texOrShader(scene.children[4], grassTexParams.toggleTex, modelLoaded);

  updateUI(grasShaderParams.shaderType);
});
texorshader.open();

/* 
  Parameters for the texture based grass pattern
*/
let grTexture = gui.addFolder("Texture params");
grTexture.add(grassTexParams, "texRepeat", 25, 320).onChange(() => {
  texOrShader(scene.children[4], grassTexParams.toggleTex, modelLoaded);
});

//#region grass shader params and controls
/* 
  Parameters for the shader based grass patterns
*/
let grShader = gui.addFolder("Shader params");

let comingSoon = { message: "More controls on the way" };

let marbleNoise = grShader.addFolder("Grass Marble Shader");
marbleNoise
  .add(grasShaderParams.marbleNoise, "marbleScaleFactor", 0, 15, 0.001)
  .onChange(() => {
    texOrShader(scene.children[4], grassTexParams.toggleTex, modelLoaded);
  });
marbleNoise.add(comingSoon, "message").name("Note");

let turbulenceNoise = grShader.addFolder("Turbulence Noise Shader");
turbulenceNoise
  .add(grasShaderParams.turbulenceNoise, "turbulenceScaleFactor", 0, 15, 0.001)
  .onChange(() => {
    texOrShader(scene.children[4], grassTexParams.toggleTex, modelLoaded);
  });
turbulenceNoise.add(comingSoon, "message").name("Note");

let halfTonIsh = grShader.addFolder("Half-Tone-ish Shader");
halfTonIsh
  .add(grasShaderParams.halfTonIsh, "halfToneScaleFactor", 0, 15, 0.001)
  .onChange(() => {
    texOrShader(scene.children[4], grassTexParams.toggleTex, modelLoaded);
  });
halfTonIsh.add(comingSoon, "message").name("Note");

let iqNoise = grShader.addFolder("iqNoise Shader");
iqNoise
  .add(grasShaderParams.iqNoise, "iqNoiseScaleFactor", 0, 15, 0.001)
  .onChange(() => {
    texOrShader(scene.children[4], grassTexParams.toggleTex, modelLoaded);
  });

let gridPattern = grShader.addFolder("Grid Pattern Shader");
gridPattern
  .add(grasShaderParams.gridPattern, "gridScaleFactor", 0, 15, 0.001)
  .onChange(() => {
    texOrShader(scene.children[4], grassTexParams.toggleTex, modelLoaded);
  });

let simplexNoise = grShader.addFolder("Simplex Noise Shader");
simplexNoise
  .add(grasShaderParams.simplexNoise, "simplexScaleFactor", 0, 15, 0.001)
  .onChange(() => {
    texOrShader(scene.children[4], grassTexParams.toggleTex, modelLoaded);
  });

let shaderTypeArray = [
  marbleNoise,
  turbulenceNoise,
  halfTonIsh,
  iqNoise,
  gridPattern,
  simplexNoise,
];

updateUI(grasShaderParams.shaderType);

grShader
  .add(grasShaderParams, "shaderType", {
    MarblePattern: 1,
    TurbulencePattern: 2,
    HalfToneish: 3,
    iqNoise: 4,
    gridPattern: 5,
    simplexPattern: 6,
  })
  .onChange(() => {
    texOrShader(scene.children[4], grassTexParams.toggleTex, modelLoaded);
    updateUI(grasShaderParams.shaderType);
  });

/* 
  General/global properties for the grass shader
*/
let generalProperties = grShader.addFolder("General Shader Properties");
let colors = generalProperties.addFolder("Colors");
colors.addColor(grasShaderParams.colors, "grassColor").onChange(() => {
  texOrShader(scene.children[4], grassTexParams.toggleTex, modelLoaded);
});

colors.addColor(grasShaderParams.colors, "hillColor").onChange(() => {
  texOrShader(scene.children[4], grassTexParams.toggleTex, modelLoaded);
});
colors.open();

generalProperties
  .add(grasShaderParams, "heightThreshold", 0.8, 1, 0.00000000001)
  .onChange(() => {
    texOrShader(scene.children[4], grassTexParams.toggleTex, modelLoaded);
  });

generalProperties
  .add(grasShaderParams, "grassNormalSuppressionFactor", 1.0, 4.0, 0.001)
  .onChange(() => {
    texOrShader(scene.children[4], grassTexParams.toggleTex, modelLoaded);
  });

generalProperties
  .add(grasShaderParams, "hillNormalSuppressionFactor", 1.0, 4.0, 0.001)
  .onChange(() => {
    texOrShader(scene.children[4], grassTexParams.toggleTex, modelLoaded);
  });
generalProperties.open();
//#endregion

/* 
  Parameters and controls for the halftone postproccessing effect
*/
let postProcessing = gui.addFolder("postprocessing");

postProcessing
  .add(controller, "shape", { Dot: 1, Ellipse: 2, Line: 3, Square: 4 })
  .onChange(onGUIChange);
postProcessing.add(controller, "radius", 1, 25).onChange(onGUIChange);
postProcessing.add(controller, "rotateR", 0, 90).onChange(onGUIChange);
postProcessing.add(controller, "rotateG", 0, 90).onChange(onGUIChange);
postProcessing.add(controller, "rotateB", 0, 90).onChange(onGUIChange);
postProcessing.add(controller, "scatter", 0, 1, 0.01).onChange(onGUIChange);
postProcessing.add(controller, "greyscale").onChange(onGUIChange);
postProcessing.add(controller, "blending", 0, 1, 0.01).onChange(onGUIChange);
postProcessing
  .add(controller, "blendingMode", {
    Linear: 1,
    Multiply: 2,
    Add: 3,
    Lighter: 4,
    Darker: 5,
  })
  .onChange(onGUIChange);
postProcessing.add(controller, "disable").onChange(onGUIChange);

//#endregion

/**
 * Animate
 */
const clock = new THREE.Clock();
let previousTime = 0;

const tick = () => {
  // camera.position.set(2, 2, 5);

  const elapsedTime = clock.getElapsedTime();
  const deltaTime = elapsedTime - previousTime;
  previousTime = elapsedTime;

  // Update controls
  controls.update();

  // Render
  // renderer.render(scene, camera);
  composer.render(deltaTime);

  // Call tick again on the next frame
  window.requestAnimationFrame(tick);
};

tick();
