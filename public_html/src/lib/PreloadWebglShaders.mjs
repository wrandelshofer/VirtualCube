/* @(#)PreloadWebglShaders.mjs  1.0  2014-01-17
 * Copyright (c) 2014 Werner Randelshofer, Switzerland. MIT License.
 */

/** Preloads the shaders used by WebglPlayerApplet. 
 */

import J3DI from './J3DI.mjs';

J3DI.setFileData("/shaders/texture.frag",
 "/*\n" +
                " * @(#)texture.frag\n" +
                " * Copyright (c) 2014 Werner Randelshofer, Switzerland.\n" +
                " * You may only use this software in accordance with the license terms.\n" +
                " */\n" +
                "\n" +
                "// WebGL Fragment Shader\n" +
                "#ifdef GL_ES\n" +
                "    precision mediump float;\n" +
                "#endif\n" +
                "\n" +
                "// World information\n" +
                "// -----------------\n" +
                "uniform vec3 camPos;         // camera position in world coordinates\n" +
                "uniform vec3 lightPos;       // light position in world coordinates\n" +
                "\n" +
                "// Model information\n" +
                "// -----------------\n" +
                "uniform vec4 mPhong;         // vertex ambient, diffuse, specular, shininess\n" +
                "uniform sampler2D mTexture;  // texture\n" +
                "uniform bool mHasTexture; \n" +
                "\n" +
                "\n" +
                "// Fragment information\n" +
                "// --------------------\n" +
                "varying vec4 fColor;\n" +
                "varying vec4 fNormal;\n" +
                "varying vec4 fPos;\n" +
                "varying vec2 fTexture;       // fragment texture cooordinates\n" +
                "\n" +
                "\n" +
                "void main() {\n" +
                "  vec3 wi = normalize(lightPos - fPos.xyz); // direction to light source\n" +
                "  vec3 wo = normalize(camPos - fPos.xyz); // direction to observer\n" +
                "  vec3 n = normalize(fNormal.xyz);\n" +
                "  float specular=pow( max(0.0,-dot(reflect(wi, n), wo)), mPhong.w)*mPhong.z;\n" +
                "  float diffuse=max(0.0,dot(wi,n))*mPhong.y;\n" +
                "  float ambient=mPhong.x;\n" +
                "  \n" +
                "  vec4 color=(mHasTexture)?texture2D(mTexture, fTexture):fColor;\n" +
                "  \n" +
                "  gl_FragColor=vec4(color.rgb*(diffuse+ambient)+specular*vec3(1,1,1), color.a);\n" +
                "  //gl_FragColor=vec4(n.x,n.y,n.z, color.a);\n" +
                "}"
);

J3DI.setFileData("/shaders/texture.vert",
  "/*\n" +
                  " * @(#)texture.vert\n" +
                  " * Copyright (c) 2014 Werner Randelshofer, Switzerland.\n" +
                  " * You may only use this software in accordance with the license terms.\n" +
                  " */\n" +
                  " \n" +
                  "// WebGL Vertex Shader\n" +
                  "#ifdef GL_ES\n" +
                  "    precision mediump float;\n" +
                  "#endif\n" +
                  "\n" +
                  "// World information\n" +
                  "// -----------------\n" +
                  "uniform vec3 camPos;         // camera position in view coordinates\n" +
                  "uniform vec3 lightPos;       // light position in world coordinates\n" +
                  "\n" +
                  "// Model information\n" +
                  "// -----------------\n" +
                  "uniform mat4 mvMatrix;       // model-view matrix\n" +
                  "uniform mat4 mvNormalMatrix; // model-view normal matrix\n" +
                  "uniform mat4 mvpMatrix;      // model-view-perspective matrix\n" +
                  "uniform vec4 mPhong;         // vertex ambient, diffuse, specular, shininess\n" +
                  "\n" +
                  "// Vertex information\n" +
                  "// ------------------\n" +
                  "attribute vec4 vPos;         // vertex position in model coordinates\n" +
                  "attribute vec3 vNormal;      // vertex normal in model coordinates\n" +
                  "attribute vec4 vColor;       // vertex color\n" +
                  "attribute vec2 vTexture;     // vertex texture uv coordinates\n" +
                  "\n" +
                  "// Fragment information\n" +
                  "// ------------------\n" +
                  "varying vec4 fPos;           // fragment position in view coordinates\n" +
                  "varying vec4 fColor;         // fragment color\n" +
                  "varying vec4 fNormal;        // fragment normal in view coordinates\n" +
                  "varying vec2 fTexture;       // fragment texture cooordinates\n" +
                  "\t\t\n" +
                  "void main() {\n" +
                  " fPos = mvMatrix * vPos;\n" +
                  " fNormal = mvNormalMatrix * vec4(vNormal, 1);\n" +
                  " fColor=vColor/255.0;\n" +
                  " gl_Position = mvpMatrix * vPos;\n" +
                  " fTexture=vTexture;\n" +
                  "}\n" +
                  "\n"
  );

J3DI.setFileData("/shaders/phong.frag",
          "/*\n" +
                  " * @(#)phong.frag\n" +
                  " * Copyright (c) 2014 Werner Randelshofer, Switzerland.\n" +
                  " * You may only use this software in accordance with the license terms.\n" +
                  " */\n" +
                  "\n" +
                  "// WebGL Fragment Shader\n" +
                  "#ifdef GL_ES\n" +
                  "    precision mediump float;\n" +
                  "#endif\n" +
                  "\n" +
                  "// World information\n" +
                  "// -----------------\n" +
                  "uniform vec3 camPos;         // camera position in world coordinates\n" +
                  "uniform vec3 lightPos;       // light position in world coordinates\n" +
                  "\n" +
                  "// Model information\n" +
                  "// -----------------\n" +
                  "uniform vec4 mPhong;         // vertex ambient, diffuse, specular, shininess\n" +
                  "\n" +
                  "\n" +
                  "// Fragment information\n" +
                  "// --------------------\n" +
                  "varying vec4 fColor;\n" +
                  "varying vec4 fNormal;\n" +
                  "varying vec4 fPos;\n" +
                  "\n" +
                  "\n" +
                  "void main() {\n" +
                  "  vec3 wi = normalize(lightPos - fPos.xyz); // direction to light source\n" +
                  "  vec3 wo = normalize(camPos - fPos.xyz); // direction to observer\n" +
                  "  vec3 n = normalize(fNormal.xyz);\n" +
                  "  float specular=pow( max(0.0,-dot(reflect(wi, n), wo)), mPhong.w)*mPhong.z;\n" +
                  "  float diffuse=max(0.0,dot(wi,n))*mPhong.y;\n" +
                  "  float ambient=mPhong.x;\n" +
                  "\n" +
                  "  gl_FragColor=vec4(fColor.rgb*(diffuse+ambient)+specular*vec3(1,1,1), fColor.a);\n" +
                  "  //gl_FragColor=vec4(n.x,n.y,n.z, fColor.a);\n" +
                  "}\n" +
                  " \n" +
                  " \n"
  );

J3DI.setFileData("/shaders/phong.vert",
"/*\n" +
        " * @(#)phong.vert\n" +
        " * Copyright (c) 2014 Werner Randelshofer, Switzerland.\n" +
        " * You may only use this software in accordance with the license terms.\n" +
        " */\n" +
        " \n" +
        "// WebGL Vertex Shader\n" +
        "#ifdef GL_ES\n" +
        "    precision mediump float;\n" +
        "#endif\n" +
        "\n" +
        "// World information\n" +
        "// -----------------\n" +
        "uniform vec3 camPos;         // camera position in view coordinates\n" +
        "uniform vec3 lightPos;       // light position in world coordinates\n" +
        "\n" +
        "// Model information\n" +
        "// -----------------\n" +
        "uniform mat4 mvMatrix;       // model-view matrix\n" +
        "uniform mat4 mvNormalMatrix; // model-view normal matrix\n" +
        "uniform mat4 mvpMatrix;      // model-view-perspective matrix\n" +
        "uniform vec4 mPhong;         // vertex ambient, diffuse, specular, shininess\n" +
        "\n" +
        "// Vertex information\n" +
        "// ------------------\n" +
        "attribute vec4 vPos;         // vertex position in model coordinates\n" +
        "attribute vec3 vNormal;      // vertex normal in model coordinates\n" +
        "attribute vec4 vColor;       // vertex color\n" +
        "\n" +
        "// Fragment information\n" +
        "// ------------------\n" +
        "varying vec4 fPos;           // fragment position in view coordinates\n" +
        "varying vec4 fColor;         // fragment color\n" +
        "varying vec4 fNormal;        // fragment normal in view coordinates\n" +
        "\t\t\n" +
        "void main() {\n" +
        " fPos = mvMatrix * vPos;\n" +
        " fNormal = mvNormalMatrix * vec4(vNormal, 1);\n" +
        " fColor=vColor/255.0;\n" +
        " gl_Position = mvpMatrix * vPos;\n" +
        "}\n" +
        "\n"
  );

// ------------------
// MODULE API    
// ------------------
export default {};


