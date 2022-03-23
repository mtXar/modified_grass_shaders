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

//#region setup
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

const MESH_NAME = "down_terrain_grass_color3dd26e"; // the name of model we want to shade

let modelLoaded = false; //this is used to make sure the model is loaded beore performing any operation

let globalParams = {
  modelTypeIndex: 0, //this is intended to enable to see the effec of the shader on the original/unwraped/smart unwrapped meshes
};

// these are the original/unwrapped/smart unwrapped models | use either unwrapped/smart unwrapped model to see the shaders in action
let modelFiles = [
  "/models/worldkart2_level123_v64_smart_unwrapped/worldkart2_level123_v64_smart_unwrappedgltf.gltf",
  "/models/worldkart2_level123_v64_unwrapped/worldkart2_level123_v64_unwrappedgltf.gltf",
  "/models/worldkart2_level123_v64/worldkart2_level123_v64.gltf",
];

//parameters related to grass texture
let grassTexParams = {
  toggleTex: false,
  texRepeat: 200,
};

//parameters related to grass shaders
let grasShaderParams = {
  zoomFactor: 10,
  spaceScale: 10,
  heightThreshold: 0.5555,
  shaderType: 1,
  grassNormalSuppressionFactor: 2.25,
  hillNormalSuppressionFactor: 1.5,

  globalUvScaleFactor: 0.05,

  colors: {
    grassColor: "#0d9b12",
    hillColor: "#f3c409",
  },
  //specific parameters related to the specific shader patterns
  marbleNoise: { marbleScaleFactor: 2.75 },
  turbulenceNoise: { turbulenceScaleFactor: 2.1 },
  halfTonIsh: {
    halfToneScaleFactor: 2.1,
    halfToneFrequency: 50,
    halfToneRadius: 0.3125,
    halfToneRotation: 45,
  },
  iqNoise: { iqNoiseScaleFactor: 2.1 },
  gridPattern: { gridScaleFactor: 2.1 },
  simplexNoise: { simplexScaleFactor: 2.1 },
};

//#endregion

//function to load the given gltf model based on the index f the array above
const loadModel = (modelIndex) => {
  if (modelIndex >= 0 && modelIndex < modelFiles.length) {
    gltfLoader.load(
      modelFiles[modelIndex],
      (gltf) => {
        gltf.scene.position.set(0, 0, 0);
        scene.add(gltf.scene);

        modelLoaded = true;

        renderGrassMaterial();
      },
      (progress) => {
        console.log((progress.loaded / progress.total) * 100 + "% loaded");
      },
      (error) => {
        console.log(error);
      }
    );
  } else {
    // just making sure an incorrect index will not cause issues
    alert(
      "model index is out of range \n I'll load you the first model I have by default"
    );
    globalParams.modelTypeIndex = 0;
    loadModel(globalParams.modelTypeIndex);
  }
};

loadModel(globalParams.modelTypeIndex);

//the material that will be applied on the mesh of interest
let grassModifiedShaderMaterial;

//function to render/rerennder the grass mesh's material whenever something changes
const renderGrassMaterial = () => {
  if (modelLoaded) {
    const grassMesh = scene.getObjectByName(MESH_NAME);
    console.log(grassMesh);

    if (grassTexParams.toggleTex) {
      const tx = new THREE.TextureLoader().load("/gr4.jpg");
      tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
      tx.repeat.set(grassTexParams.texRepeat, grassTexParams.texRepeat);

      const grassMaterial = new THREE.MeshStandardMaterial({ map: tx });
      grassMesh.material = grassMaterial;
    } else {
      grassMesh.geometry.computeBoundingBox();
      let meshHigh = grassMesh.geometry.boundingBox.max.y;
      let meshLow = grassMesh.geometry.boundingBox.min.y;
      // console.log("The mesh peak is  :" + meshPeak);
      grassModifiedShaderMaterial = new THREE.ShaderMaterial({
        vertexShader: grassVertex,
        fragmentShader: grassFragment,
        // wireframe: true,
        uniforms: {
          u_mesh_peak: { value: meshHigh },
          u_mesh_low: { value: meshLow },
          u_resolution: {
            value: {
              x: renderer.domElement.width,
              y: renderer.domElement.height,
            },
          },
          u_height_threshold: { value: grasShaderParams.heightThreshold },
          u_shader_type: { value: grasShaderParams.shaderType },

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

          u_global_uv_scale_factor: {
            value: grasShaderParams.globalUvScaleFactor,
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
          u_halftone_frequency: {
            value: grasShaderParams.halfTonIsh.halfToneFrequency,
          },
          u_halftone_circle_radius: {
            value: grasShaderParams.halfTonIsh.halfToneRadius,
          },
          u_halftone_rotation_factor: {
            value: grasShaderParams.halfTonIsh.halfToneRotation,
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
const updateUI = (shaderTypeFolderIndex) => {
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
  shaderTypeFolderIndex--; //offset the index by one to access the right folder from the array
  shaderTypeArray[shaderTypeFolderIndex].show();
  shaderTypeArray[shaderTypeFolderIndex].open();
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
    texOrShader();
  });
  
*/

/* 
  Toggle between texture and shader for the grass pattern on the selected mesh
*/
let texorshader = gui.addFolder("Texture or shader");
texorshader.add(grassTexParams, "toggleTex").onChange(() => {
  renderGrassMaterial();

  updateUI(grasShaderParams.shaderType);
});
texorshader.open();

/* 
  Parameters for the texture based grass pattern
*/
let grTexture = gui.addFolder("Texture params");
grTexture.add(grassTexParams, "texRepeat", 25, 320).onChange(() => {
  renderGrassMaterial();
});

//#region grass shader params and controls
/* 
  Parameters for the shader based grass patterns
*/
let grShader = gui.addFolder("Shader params");

let comingSoon = { message: "More controls on the way" };
grShader
  .add(grasShaderParams, "globalUvScaleFactor", 0, 0.1, 0.001)
  .onChange(() => {
    renderGrassMaterial();
  });

let marbleNoise = grShader.addFolder("Grass Marble Shader");
marbleNoise
  .add(grasShaderParams.marbleNoise, "marbleScaleFactor", 0, 15, 0.001)
  .onChange(() => {
    renderGrassMaterial();
  });
marbleNoise.add(comingSoon, "message").name("Note");

let turbulenceNoise = grShader.addFolder("Turbulence Noise Shader");
turbulenceNoise
  .add(grasShaderParams.turbulenceNoise, "turbulenceScaleFactor", 0, 15, 0.001)
  .onChange(() => {
    renderGrassMaterial();
  });
turbulenceNoise.add(comingSoon, "message").name("Note");

let halfTonIsh = grShader.addFolder("Half-Tone-ish Shader");
halfTonIsh
  .add(grasShaderParams.halfTonIsh, "halfToneScaleFactor", 0, 5, 0.0001)
  .onChange(() => {
    renderGrassMaterial();
  });
halfTonIsh
  .add(grasShaderParams.halfTonIsh, "halfToneFrequency", 0, 100, 1)
  .onChange(() => {
    renderGrassMaterial();
  });

halfTonIsh
  .add(grasShaderParams.halfTonIsh, "halfToneRadius", 0, 1, 0.0125)
  .onChange(() => {
    renderGrassMaterial();
  });

halfTonIsh
  .add(grasShaderParams.halfTonIsh, "halfToneRotation", 0, 90, 1)
  .onChange(() => {
    renderGrassMaterial();
  });

let iqNoise = grShader.addFolder("iqNoise Shader");
iqNoise
  .add(grasShaderParams.iqNoise, "iqNoiseScaleFactor", 0, 15, 0.001)
  .onChange(() => {
    renderGrassMaterial();
  });

let gridPattern = grShader.addFolder("Grid Pattern Shader");
gridPattern
  .add(grasShaderParams.gridPattern, "gridScaleFactor", 0, 15, 0.001)
  .onChange(() => {
    renderGrassMaterial();
  });

let simplexNoise = grShader.addFolder("Simplex Noise Shader");
simplexNoise
  .add(grasShaderParams.simplexNoise, "simplexScaleFactor", 0, 15, 0.001)
  .onChange(() => {
    renderGrassMaterial();
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
    renderGrassMaterial();
    updateUI(grasShaderParams.shaderType);
  });

/* 
  General/global properties for the grass shader
*/
let generalProperties = grShader.addFolder("General Shader Properties");
let colors = generalProperties.addFolder("Colors");
colors.addColor(grasShaderParams.colors, "grassColor").onChange(() => {
  renderGrassMaterial();
});

colors.addColor(grasShaderParams.colors, "hillColor").onChange(() => {
  renderGrassMaterial();
});
colors.open();

generalProperties
  .add(grasShaderParams, "heightThreshold", 0.555, 0.6, 0.00001)
  .onChange(() => {
    renderGrassMaterial();
  })
  .name("Hill Slider");

generalProperties
  .add(grasShaderParams, "grassNormalSuppressionFactor", 1.0, 4.0, 0.001)
  .onChange(() => {
    renderGrassMaterial();
  });

generalProperties
  .add(grasShaderParams, "hillNormalSuppressionFactor", 1.0, 4.0, 0.001)
  .onChange(() => {
    renderGrassMaterial();
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
