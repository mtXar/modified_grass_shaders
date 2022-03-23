#ifdef GL_ES
precision mediump float;
#endif

/****
Uniforms and varyings start
*****/
    uniform vec2 u_resolution;
    
    uniform int u_shader_type;
    uniform float u_height_threshold;
    uniform vec3 u_grass_color;
    uniform vec3 u_hill_color;
    uniform float u_grass_normal_suppression_factor;
    uniform float u_hill_normal_suppression_factor;

    uniform float u_global_uv_scale_factor;

    uniform float u_marble_st_scale_factor;
    uniform float u_turbulence_st_scale_factor;
    uniform float u_halftone_st_scale_factor;
    uniform float u_halftone_frequency;
    uniform float u_halftone_circle_radius;
    uniform float u_halftone_rotation_factor;
    uniform float u_iqnoise_st_scale_factor;
    uniform float u_grid_st_scale_factor;
    uniform float u_simplex_st_scale_factor;

    varying vec2 vUv;
    varying vec3 vNormal;
    varying float vTerrainHeight;
/****
Uniforms and varyings end
*****/

/****
Utility start
*****/

    //Global helper function
    float random (vec2 st) {
        return fract(sin(dot(st.xy,
                            vec2(12.9898,78.233)))*43758.5453123);
    }

    mat2 rotate2d(float angle){
        return mat2(cos(angle),-sin(angle),
                    sin(angle),cos(angle));
    }

    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

    //Utility functions for the grid pattern
    vec2 skew (vec2 st) {
        vec2 r = vec2(0.0);
        r.x = 1.1547*st.x;
        r.y = st.y+0.5*r.x;
        return r;
    }

    vec3 simplexGrid (vec2 st) {
        vec3 xyz = vec3(0.0);

        vec2 p = fract(skew(st));
        if (p.x > p.y) {
            xyz.xy = 1.0-vec2(p.x,p.y-p.x);
            xyz.z = p.y;
        } else {
            xyz.yz = 1.0-vec2(p.x-p.y,p.y);
            xyz.x = p.x;
        }

        return fract(xyz);
    }

    //Utility functions for the iqNoise
    vec3 hash3( vec2 p ) {
        vec3 q = vec3( dot(p,vec2(127.1,311.7)),
                    dot(p,vec2(269.5,183.3)),
                    dot(p,vec2(419.2,371.9)) );
        return fract(sin(q)*43758.5453);
    }

    float iqnoise( in vec2 x, float u, float v ) {
        vec2 p = floor(x);
        vec2 f = fract(x);

        float k = 1.0+63.0*pow(1.0-v,4.0);

        float va = 0.0;
        float wt = 0.0;
        for (int j=-2; j<=2; j++) {
            for (int i=-2; i<=2; i++) {
                vec2 g = vec2(float(i),float(j));
                vec3 o = hash3(p + g)*vec3(u,u,1.0);
                vec2 r = g - f + o.xy;
                float d = dot(r,r);
                float ww = pow( 1.0-smoothstep(0.0,1.414,sqrt(d)), k );
                va += o.z*ww;
                wt += ww;
            }
        }

        return va/wt;
    }

    
    //Utitlity functions for the turbulence pattern
    float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0
                            0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)
                            -0.577350269189626,  // -1.0 + 2.0 * C.x
                            0.024390243902439); // 1.0 / 41.0
        vec2 i  = floor(v + dot(v, C.yy) );
        vec2 x0 = v -   i + dot(i, C.xx);
        vec2 i1;
        i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod289(i); // Avoid truncation effects in permutation
        vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
            + i.x + vec3(0.0, i1.x, 1.0 ));

        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        m = m*m ;
        m = m*m ;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
        vec3 g;
        g.x  = a0.x  * x0.x  + h.x  * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
    }

    #define TURBULENCE_OCTAVES 6
    float turbulence(in vec2 st) {
        float value = 0.0;
        float amplitude = 1.0;
        for (int i = 0; i < TURBULENCE_OCTAVES; i++) {
            value += amplitude * abs(snoise(st));
            st *= 2.;
            amplitude *= .5;
        }
        return value;
    }


    //Utility functions for the marblel pattern
    float marbleNoise (in vec2 st) {
        vec2 i = floor(st);
        vec2 f = fract(st);

        // Four corners in 2D of a tile
        float a = random(i);
        float b = random(i + vec2(1.0, 0.0));
        float c = random(i + vec2(0.0, 1.0));
        float d = random(i + vec2(1.0, 1.0));

        vec2 u = f * f * (3.0 - 2.0 * f);

        return mix(a, b, u.x) +
                (c - a)* u.y * (1.0 - u.x) +
                (d - b) * u.x * u.y;
    }

    #define MARBLE_OCTAVES 6

    float fbm (in vec2 st) {
        // Initial values
        float value = 0.0;
        float amplitud = .5;
        float frequency = 0.;
        //
        // Loop of octaves
        for (int i = 0; i < MARBLE_OCTAVES; i++) {
            value += amplitud * marbleNoise(st);
            st *= 2.;
            amplitud *= .5;
        }
        return value;
    }

    float edge(float v, float center, float edge0, float edge1) {
        return 1.0 - smoothstep(edge0, edge1, abs(v - center));
    }

/*****
Utility end
******/


void main() {
    vec2 st = u_global_uv_scale_factor * vUv * u_resolution; // add global scale uniform for more fine tuning


/****
Marble pattern start #1
*****/

    vec2 stMarble = u_marble_st_scale_factor * st;
    float v0 = edge(fbm(stMarble * 18.0), 0.5, 0.0, 0.2);
    float v1 = smoothstep(0.5, 0.51, fbm(stMarble * 14.0));
    float v2 = edge(fbm(stMarble * 14.0), 0.5, 0.0, 0.05);
    float v3 = edge(fbm(stMarble * 14.0), 0.5, 0.0, 0.25);

    vec3 marblePattern = vec3(1.0);
    marblePattern -= v0 * 0.75;
    marblePattern = mix(marblePattern, vec3(0.97), v1);
    marblePattern = mix(marblePattern, vec3(0.51), v2);
    marblePattern -= v3 * 0.2;

/****
Marble pattern end
*****/

/****
Turbulence noise start #2
*****/

    vec2 stTurbulence = u_turbulence_st_scale_factor * st;
    float v = turbulence(stTurbulence);
    vec3 turbulencePattern = vec3(v);

/****
Turbulence noise end
*****/

/****
HalfTone-ish pattern start #3
*****/

    vec2 stHalfTone = u_halftone_st_scale_factor * st * rotate2d(u_halftone_rotation_factor);

    vec2 nearest = 2.0*fract(u_halftone_frequency * stHalfTone) - 1.0;
    float dist = length(nearest);
    vec3 white = vec3(1.0, 1.0, 1.0);
    vec3 black = vec3(0.0, 0.0, 0.0);
    vec3 halfTonish = mix(u_grass_color, white, step(u_halftone_circle_radius, dist));

/****
HalfTone-ish pattern end
*****/

/****
iqNoise noise start #4
*****/

    vec2 stIqNoise = u_iqnoise_st_scale_factor * st;

    float n = iqnoise(stIqNoise, 1.0 , 1.0);
    vec3 iqNoiseColor = vec3(n);

/****
iqNoise noise end
*****/

/****
grid pattern start #5
*****/

    vec2 stGrid = u_grid_st_scale_factor * st;

    vec3 gridPattern = vec3(0.0);

    // Show the 2D grid
    gridPattern.rg = fract(stGrid);

    // Skew the 2D grid
    gridPattern.rg = fract(skew(stGrid));

    // Subdivide the grid into to equilateral triangles
    gridPattern = simplexGrid(stGrid);

/****
grid pattern end
*****/

/****
simplex pattern start #6
*****/

    vec2 stSimplex = u_simplex_st_scale_factor * st;

    float simplex = snoise(stSimplex * 1.0) * 0.5 + 0.5;
    vec3 simplexPattern = vec3(simplex);

/****
simplex pattern end
*****/


/****
Shading grass and hill with added noise
*****/

    // Normal vector based color blender calculation to add expression to the faces of the mesh
    vec3 view_nv  = normalize(vNormal);
    vec3 nv_color = view_nv * 0.5 + 0.5; 

    switch(u_shader_type){
        case 1:
            if(vTerrainHeight > u_height_threshold ){
                gl_FragColor = vec4((marblePattern/2.5 + u_grass_color + nv_color/u_grass_normal_suppression_factor),1.0);
            }else{
                gl_FragColor = vec4((u_hill_color + nv_color/u_hill_normal_suppression_factor) ,1.0);
            }
            break;
        case 2:
            if(vTerrainHeight > u_height_threshold ){
                gl_FragColor = vec4((turbulencePattern/2.5 + u_grass_color + nv_color/u_grass_normal_suppression_factor),1.0);
            }else{
                gl_FragColor = vec4((u_hill_color + nv_color/u_hill_normal_suppression_factor) ,1.0);
            }
            break;
        case 3:
            if(vTerrainHeight > u_height_threshold ){
                gl_FragColor = vec4((halfTonish/2.5 + u_grass_color + nv_color/u_grass_normal_suppression_factor),1.0);
            }else{
                gl_FragColor = vec4((u_hill_color + nv_color/u_hill_normal_suppression_factor) ,1.0);
            }
            break;
        case 4:
            if(vTerrainHeight > u_height_threshold ){
                gl_FragColor = vec4((iqNoiseColor/2.5 + u_grass_color + nv_color/u_grass_normal_suppression_factor),1.0);
            }else{
                gl_FragColor = vec4((u_hill_color + nv_color/u_hill_normal_suppression_factor) ,1.0);
            }
            break;
        case 5:
            if(vTerrainHeight > u_height_threshold ){
                gl_FragColor = vec4((gridPattern/2.5 + u_grass_color + nv_color/u_grass_normal_suppression_factor),1.0);
            }else{
                gl_FragColor = vec4((u_hill_color + nv_color/u_hill_normal_suppression_factor) ,1.0);
            }
            break;
        case 6:
            if(vTerrainHeight > u_height_threshold ){
                gl_FragColor = vec4((simplexPattern/2.5 + u_grass_color + nv_color/u_grass_normal_suppression_factor),1.0);
            }else{
                gl_FragColor = vec4((u_hill_color + nv_color/u_hill_normal_suppression_factor) ,1.0);
            }
            break;
        
    }
/****
Shading grass and hill with added noise end
*****/
    
    
}
