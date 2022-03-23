uniform float u_mesh_peak;
uniform float u_mesh_low;
varying vec2 vUv;
varying vec3 vNormal;
varying float vTerrainHeight;

float map(float value, float min1, float max1, float min2, float max2) {
  return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
}

void main(){
    vec4 modelPosition = modelMatrix * vec4(position , 1.0);

    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;

    gl_Position = projectedPosition;


    vUv = uv;
    vNormal = normalMatrix * normalize(normal);
    // vTerrainHeight = position.z/u_mesh_peak;
    vTerrainHeight = map(position.z , u_mesh_low , u_mesh_peak , 0. , 1.);
    }