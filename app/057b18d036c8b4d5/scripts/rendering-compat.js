    (function installShaderCompat() {
      var shaderInfo = new WeakMap();
      var hasModelHelperPrototype = /vec4 modelToClip\(vec4 pos\);\s*vec4 modelToView\(vec4 pos\);\s*vec4 viewToClip\(vec4 pos\);/;
      var modelHelperPrototype = /vec4 modelToClip\(vec4 pos\);\s*vec4 modelToView\(vec4 pos\);\s*vec4 viewToClip\(vec4 pos\);/g;
      var modelToClip =
        "uniform mat4 osg_ModelViewMatrix;\n" +
        "uniform mat4 osg_ProjectionMatrix;\n" +
        "vec4 modelToView(vec4 pos) { return osg_ModelViewMatrix * pos; }\n" +
        "vec4 viewToClip(vec4 pos) { return osg_ProjectionMatrix * pos; }\n" +
        "vec4 modelToClip(vec4 pos) { return osg_ProjectionMatrix * modelToView(pos); }\n";
      var GL_VERTEX_SHADER = 0x8B31;
      var GL_FRAGMENT_SHADER = 0x8B30;
      var browserWaterDisabled = /(?:^|[?&])nowater=1(?:&|$)/.test(window.location.search);
      var browserWaterUvFix = !browserWaterDisabled &&
        !/(?:^|[?&])no-wateruvfix=1(?:&|$)/.test(window.location.search);
      var browserShaderWaterFallback = !browserWaterDisabled &&
        /(?:^|[?&])unsafe-shaderwater=1(?:&|$)/.test(window.location.search);
      var browserWaterFallback = /(?:^|[?&])unsafe-waterfallback=1(?:&|$)/.test(window.location.search);
      var browserWaterStateFix = !browserWaterDisabled &&
        /(?:^|[?&])unsafe-waterstate=1(?:&|$)/.test(window.location.search) &&
        !/(?:^|[?&])no-classicwater=1(?:&|$)/.test(window.location.search);
      var browserClassicWaterPatch = browserWaterStateFix &&
        /(?:^|[?&])unsafe-classicwaterpatch=1(?:&|$)/.test(window.location.search) &&
        !/(?:^|[?&])no-classicwaterpatch=1(?:&|$)/.test(window.location.search);
      var browserWaterDrawFix = /(?:^|[?&])unsafe-wateroverlay=1(?:&|$)/.test(window.location.search);
      var browserUboExtensionPatch = /(?:^|[?&])unsafe-ubopatch=1(?:&|$)/.test(window.location.search) &&
        !/(?:^|[?&])no-ubopatch=1(?:&|$)/.test(window.location.search);
      var browserDisableParallelShaderCompile = !/(?:^|[?&])allow-khr-shader-compile=1(?:&|$)/.test(window.location.search);
      var browserSkyShaderPatch = /(?:^|[?&])unsafe-skypatch=1(?:&|$)/.test(window.location.search) &&
        !/(?:^|[?&])no-skypatch=1(?:&|$)/.test(window.location.search);
      var browserWorldColorFallback = /(?:^|[?&])unsafe-worldcolor=1(?:&|$)/.test(window.location.search);
      var browserWorldFogPatch = !/(?:^|[?&])no-worldfog=1(?:&|$)/.test(window.location.search);
      var browserClassicFogPatch = !/(?:^|[?&])no-classicfog=1(?:&|$)/.test(window.location.search);
      var browserClassicFogColor = [0.807843, 0.890196, 1.0, 1.0];
      var browserClassicFogStart = 3072;
      var browserClassicFogEnd = 7168;

      function isTes3mpVisualParityRuntime() {
        try {
          return !/(?:^|[?&])no-tes3mpvisualparity=1(?:&|$)/.test(window.location.search) &&
            typeof Module !== "undefined" &&
            Module &&
            Module.__runtimeKind === "tes3mp";
        } catch (error) {
          return false;
        }
      }

      function browserSkyShaderPatchEnabled() {
        return browserSkyShaderPatch ||
          (isTes3mpVisualParityRuntime() &&
            !/(?:^|[?&])no-skypatch=1(?:&|$)/.test(window.location.search));
      }

      function browserWaterStateFixEnabled() {
        return browserWaterStateFix ||
          (isTes3mpVisualParityRuntime() &&
            !browserWaterDisabled &&
            !/(?:^|[?&])no-classicwater=1(?:&|$)/.test(window.location.search));
      }

      function browserClassicWaterPatchEnabled() {
        return browserClassicWaterPatch ||
          (browserWaterStateFixEnabled() &&
            isTes3mpVisualParityRuntime() &&
            !/(?:^|[?&])no-classicwaterpatch=1(?:&|$)/.test(window.location.search));
      }

      function browserWaterDrawFixEnabled() {
        return browserWaterDrawFix ||
          (isTes3mpVisualParityRuntime() &&
            !browserWaterDisabled &&
            !/(?:^|[?&])no-wateroverlay=1(?:&|$)/.test(window.location.search));
      }

      function addFallbackFunction(source, signature, body) {
        if (source.indexOf(signature + ";") === -1) return source;
        if (source.indexOf(signature + "\n{") !== -1 || source.indexOf(signature + " {") !== -1) return source;
        return source + "\n" + signature + "\n" + body + "\n";
      }

      function addFallbackBlock(source, signature, block) {
        if (source.indexOf(signature + ";") === -1) return source;
        if (source.indexOf(signature + "\n{") !== -1 || source.indexOf(signature + " {") !== -1) return source;
        return source + "\n" + block + "\n";
      }

      function replaceLegacyAttribute(source, legacyName, webName) {
        if (source.indexOf(legacyName) === -1 || source.indexOf(webName) === -1) return source;
        return source.replace(new RegExp("\\b" + legacyName + "\\b", "g"), webName);
      }

      function shaderUniformInsertIndex(source) {
        var index = 0;
        for (;;) {
          var rest = source.slice(index);
          var match = rest.match(/^\s*(?:(?:#version|#extension)[^\n\r]*(?:\r?\n)?|precision\s+(?:lowp|mediump|highp)\s+(?:float|int)\s*;\s*|#ifdef\s+GL_FRAGMENT_PRECISION_HIGH\s*\r?\n\s*precision\s+highp\s+float\s*;\s*\r?\n\s*#else\s*\r?\n\s*precision\s+mediump\s+float\s*;\s*\r?\n\s*#endif\s*)/);
          if (!match || !match[0]) break;
          index += match[0].length;
        }
        return index;
      }

      function ensureUniform(source, type, name) {
        var existingUniform = new RegExp(
          "\\buniform\\s+(?:(?:lowp|mediump|highp)\\s+)?[A-Za-z_]\\w*\\s+" +
          name +
          "\\s*;"
        );
        if (!new RegExp("\\b" + name + "\\b").test(source) ||
            existingUniform.test(source)) {
          return source;
        }
        var insertIndex = shaderUniformInsertIndex(source);
        return source.slice(0, insertIndex) + "\nuniform " + type + " " + name + ";\n" + source.slice(insertIndex);
      }

      function isOpenMwSkyShaderSource(source) {
        source = String(source || "");
        if (!source) return false;
        if (/\bPASS_CLOUDS\b|\bPASS_ATMOSPHERE\b/.test(source)) return true;
        if (/\bbrowserScreenSky\b|\bbrowserSky(?:Emission|Alpha|Color)\b/.test(source)) return true;
        if (/\bpaint(?:Atmosphere|AtmosphereNight|Clouds)\s*\(/.test(source)) return true;
        return /\bpassColor\b/.test(source) &&
          /\b(diffuseMapUV|cloudsUV|TexCoord|sampleSkyColor)\b/.test(source) &&
          /\b(diffuseMap|Texture|sky)\b/.test(source);
      }

      function hasOpenMwSkyTextureInputs(source) {
        return /\bdiffuseMap\b/.test(source) &&
          /\bdiffuseMapUV\b/.test(source) &&
          /\bpassColor\b/.test(source);
      }

      function browserClassicNightSkyShaderLines() {
        return [
          "void paintAtmosphereNight(inout vec4 color)",
          "{",
          "    vec4 browserClassicNightSample = texture2D(diffuseMap, diffuseMapUV);",
          "    float browserClassicNightRgbMask = dot(max(browserClassicNightSample.rgb, vec3(0.0)), vec3(0.2126, 0.7152, 0.0722));",
          "    float browserClassicNightAlphaMask = clamp(browserClassicNightSample.a, 0.0, 1.0);",
          "    float browserClassicNightMask = smoothstep(0.018, 0.72, min(browserClassicNightRgbMask, browserClassicNightAlphaMask));",
          "    vec3 browserClassicNightMaterialTint = max(gl_FrontMaterial.emission.rgb, vec3(0.0));",
          "    float browserClassicNightMaterialLuma = dot(browserClassicNightMaterialTint, vec3(0.2126, 0.7152, 0.0722));",
          "    vec3 browserClassicNightSkyTint = max(browserSkyEmission.rgb, vec3(0.0));",
          "    float browserClassicNightSkyLuma = dot(browserClassicNightSkyTint, vec3(0.2126, 0.7152, 0.0722));",
          "    vec3 browserClassicNightTint = browserClassicNightMaterialLuma >= 0.015 ? browserClassicNightMaterialTint : (browserClassicNightSkyLuma >= 0.015 ? browserClassicNightSkyTint : vec3(0.42, 0.50, 0.72));",
          "    vec3 browserClassicNightSampleTint = browserClassicNightRgbMask > 0.02 && browserClassicNightRgbMask < 0.92 ? browserClassicNightSample.rgb : browserClassicNightTint;",
          "    color.rgb = clamp(browserClassicNightSampleTint * browserClassicNightMask, 0.0, 1.0);",
          "    color.a = clamp(browserClassicNightMask * passColor.a * opacity, 0.0, 1.0);",
          "}"
        ];
      }

      function fixOpenMwSimpleSkyTextureShader(source) {
        if (!isOpenMwSkyShaderSource(source) ||
            !/\bgl_FragColor\s*=\s*texture2D\s*\(\s*diffuseMap\s*,\s*diffuseMapUV\s*\)\s*\*\s*passColor\s*;/.test(source) ||
            /\bbrowserSimpleSkyPassColor\b/.test(source)) {
          return source;
        }
        return source.replace(
          /\bgl_FragColor\s*=\s*texture2D\s*\(\s*diffuseMap\s*,\s*diffuseMapUV\s*\)\s*\*\s*passColor\s*;/,
          [
            "vec4 browserSimpleSkyPassColor = passColor;",
            "float browserSimpleSkyLuma = dot(max(browserSimpleSkyPassColor.rgb, vec3(0.0)), vec3(0.2126, 0.7152, 0.0722));",
            "if (browserSimpleSkyLuma < 0.015) {",
            "    browserSimpleSkyPassColor.rgb = gl_Fog.color.rgb;",
            "    browserSimpleSkyPassColor.a = max(browserSimpleSkyPassColor.a, 1.0);",
            "}",
            "vec4 browserSimpleSkyTexel = texture2D(diffuseMap, diffuseMapUV);",
            "gl_FragColor = browserSimpleSkyTexel * browserSimpleSkyPassColor;",
            "float browserSimpleSkyOutLuma = dot(max(gl_FragColor.rgb, vec3(0.0)), vec3(0.2126, 0.7152, 0.0722));",
            "float browserSimpleSkyFogLuma = dot(max(gl_Fog.color.rgb, vec3(0.0)), vec3(0.2126, 0.7152, 0.0722));",
            "if (browserSimpleSkyLuma < 0.015 && browserSimpleSkyOutLuma < 0.015 && browserSimpleSkyFogLuma >= 0.015) {",
            "    gl_FragColor.rgb = gl_Fog.color.rgb * max(browserSimpleSkyTexel.a, 0.65);",
            "    gl_FragColor.a = 1.0;",
            "}"
          ].join("\n    ")
        );
      }

      function fixPackagedBrowserSkyShader(source) {
        if (!isOpenMwSkyShaderSource(source) ||
            !/\bPASS_ATMOSPHERE_NIGHT\b/.test(source) ||
            !/\bbrowserScreenSky\b/.test(source)) {
          return source;
        }

        source = source.replace(
          /if\s*\(\s*browserScreenSky\s*!=\s*0\s*\)\s*\n\s*gl_Position\s*=\s*vec4\s*\(\s*((?:gl|osg)_Vertex)\.xy\s*,\s*0\.0\s*,\s*1\.0\s*\)\s*;\s*\n\s*else\s*\n\s*gl_Position\s*=\s*modelToClip\s*\(\s*((?:gl|osg)_Vertex)\s*\)\s*;/,
          function(match, screenVertexName, modelVertexName) {
            var vertexName = screenVertexName || modelVertexName || "osg_Vertex";
            return [
              "vec2 browserSkyClipPosition = " + vertexName + ".xy;",
              "if (pass == PASS_ATMOSPHERE_NIGHT &&",
              "    browserSkyClipPosition.x >= -0.001 && browserSkyClipPosition.x <= 1.001 &&",
              "    browserSkyClipPosition.y >= -0.001 && browserSkyClipPosition.y <= 1.001)",
              "    browserSkyClipPosition = browserSkyClipPosition * 2.0 - 1.0;",
              "if (browserScreenSky != 0 || pass == PASS_ATMOSPHERE_NIGHT)",
              "    gl_Position = vec4(browserSkyClipPosition, 0.0, 1.0);",
              "else",
              "    gl_Position = modelToClip(" + vertexName + ");"
            ].join("\n");
          }
        );

        source = source.replace(
          /if\s*\(\s*browserScreenSky\s*!=\s*0\s*\)\s*\n\s*paintAtmosphere\s*\(\s*color\s*\)\s*;\s*\n\s*else if\s*\(\s*pass\s*==\s*PASS_ATMOSPHERE\s*\)\s*\n\s*paintAtmosphere\s*\(\s*color\s*\)\s*;\s*\n\s*else if\s*\(\s*pass\s*==\s*PASS_ATMOSPHERE_NIGHT\s*\)\s*\n\s*paintAtmosphereNight\s*\(\s*color\s*\)\s*;/,
          [
            "if (pass == PASS_ATMOSPHERE_NIGHT)",
            "    paintAtmosphereNight(color);",
            "else if (pass == PASS_CLOUDS)",
            "    paintClouds(color);",
            "else if (browserScreenSky != 0)",
            "    paintAtmosphere(color);",
            "else if (pass == PASS_ATMOSPHERE)",
            "    paintAtmosphere(color);"
          ].join("\n")
        );

        if (hasOpenMwSkyTextureInputs(source) &&
            /\bpaintAtmosphere\b/.test(source) &&
            !/\bbrowserClassicSkyEmission\b/.test(source)) {
          source = source.replace(
            /void\s+paintAtmosphere\s*\(\s*inout\s+vec4\s+color\s*\)\s*\{[\s\S]*?\n\}/,
            [
              "void paintAtmosphere(inout vec4 color)",
              "{",
              "    vec4 browserClassicSkyEmission = gl_FrontMaterial.emission;",
              "    float browserSkyEmissionLuma = dot(max(browserClassicSkyEmission.rgb, vec3(0.0)), vec3(0.2126, 0.7152, 0.0722));",
              "    vec3 browserUniformSkyEmission = max(browserSkyEmission.rgb, vec3(0.0));",
              "    float browserUniformSkyLuma = dot(browserUniformSkyEmission, vec3(0.2126, 0.7152, 0.0722));",
              "    if (browserSkyEmissionLuma < 0.12)",
              "        browserClassicSkyEmission.rgb = browserUniformSkyLuma >= 0.015 ? browserUniformSkyEmission : gl_Fog.color.rgb;",
              "    color = browserClassicSkyEmission;",
              "    color.a = browserSkyEmissionLuma < 0.12 ? max(color.a * passColor.a, browserClassicSkyEmission.a) : color.a * passColor.a;",
              "}"
            ].join("\n")
          );
        }

        if (hasOpenMwSkyTextureInputs(source) &&
            /\bpaintClouds\b/.test(source) &&
            !/\bbrowserClassicCloudSample\b/.test(source)) {
          source = source.replace(
            /void\s+paintClouds\s*\(\s*inout\s+vec4\s+color\s*\)\s*\{[\s\S]*?\n\}/,
            [
              "void paintClouds(inout vec4 color)",
              "{",
              "    vec4 browserClassicCloudSample = texture2D(diffuseMap, diffuseMapUV);",
              "    color = browserClassicCloudSample;",
              "    color.a *= passColor.a * opacity;",
              "    vec3 browserClassicCloudEmission = max(gl_FrontMaterial.emission.xyz, vec3(0.0));",
              "    float browserCloudEmissionLuma = dot(browserClassicCloudEmission, vec3(0.2126, 0.7152, 0.0722));",
              "    vec3 browserUniformCloudEmission = max(browserSkyEmission.rgb, vec3(0.0));",
              "    float browserUniformCloudLuma = dot(browserUniformCloudEmission, vec3(0.2126, 0.7152, 0.0722));",
              "    vec3 browserVertexCloudEmission = max(passColor.rgb, vec3(0.0));",
              "    float browserVertexCloudLuma = dot(browserVertexCloudEmission, vec3(0.2126, 0.7152, 0.0722));",
              "    if (browserCloudEmissionLuma < 0.12)",
              "        browserClassicCloudEmission = browserUniformCloudLuma >= 0.015 ? browserUniformCloudEmission : (browserVertexCloudLuma >= 0.015 ? browserVertexCloudEmission : gl_Fog.color.rgb);",
              "    color.xyz = clamp(color.xyz * browserClassicCloudEmission, 0.0, 1.0);",
              "    color = mix(vec4(gl_Fog.color.xyz, color.a), color, passColor.a);",
              "}"
            ].join("\n")
          );
        }

        if (hasOpenMwSkyTextureInputs(source) &&
            /\bpaintAtmosphereNight\b/.test(source) &&
            !/\bbrowserClassicNightSample\b/.test(source)) {
          source = source.replace(
            /void\s+paintAtmosphereNight\s*\(\s*inout\s+vec4\s+color\s*\)\s*\{[\s\S]*?\n\}/,
            browserClassicNightSkyShaderLines().join("\n")
          );
        }

        if (hasOpenMwSkyTextureInputs(source)) source = ensureUniform(source, "vec4", "browserSkyEmission");
        return source;
      }

      function normalizeShaderPreamble(source) {
        var extensions = [];
        var derivativeFallback = "";
        if (/\bdFdx\s*\(/.test(source)) derivativeFallback += "#define dFdx(x) vec2(0.0)\n";
        if (/\bdFdy\s*\(/.test(source)) derivativeFallback += "#define dFdy(x) vec2(0.0)\n";
        if (/\bfwidth\s*\(/.test(source)) derivativeFallback += "#define fwidth(x) 0.0001\n";
        source = source.replace(/^\s*#extension[^\n\r]*(?:\r?\n)?/gm, function(line) {
          var trimmed = line.trim();
          if (/GL_ARB_uniform_buffer_object|GL_EXT_gpu_shader4|GL_OES_standard_derivatives/.test(trimmed)) {
            return "";
          }
          extensions.push(trimmed);
          return "";
        });
        source = source.replace(/^\s*precision\s+(?:lowp|mediump|highp)\s+int\s*;\s*/gm, "");
        return (extensions.length ? extensions.join("\n") + "\n" : "") + derivativeFallback + source;
      }

      function ensureFragmentFloatPrecision(source) {
        var version = "";
        source = String(source || "");
        var versionMatch = source.match(/^\s*#version[^\n\r]*(?:\r?\n)?/);
        if (versionMatch) {
          version = versionMatch[0];
          source = source.slice(version.length);
        }
        var extensions = "";
        source = source.replace(/^\s*#extension[^\n\r]*(?:\r?\n)?/gm, function(line) {
          extensions += line;
          return "";
        });
        source = source.replace(/^\s*precision\s+(?:lowp|mediump|highp)\s+int\s*;\s*/gm, "");
        source = source.replace(/^\s*precision\s+(?:lowp|mediump|highp)\s+float\s*;\s*/gm, "");
        source = source.replace(/^\s*#ifdef\s+GL_FRAGMENT_PRECISION_HIGH\s*\r?\n\s*precision\s+highp\s+float\s*;\s*\r?\n\s*#else\s*\r?\n\s*precision\s+mediump\s+float\s*;\s*\r?\n\s*#endif\s*/gm, "");
        return version + extensions +
          "precision highp int;\n" +
          "#ifdef GL_FRAGMENT_PRECISION_HIGH\n" +
          "precision highp float;\n" +
          "#else\n" +
          "precision mediump float;\n" +
          "#endif\n" +
          source;
      }

      function usesUniformBlock(source) {
        return /\buniform\s+\w+\s*\{/.test(source) ||
          /\blayout\s*\([^)]*\)\s*uniform\s+\w+\s*\{/.test(source);
      }

      function convertUniformBlockShaderToGlslEs300(source, shaderType) {
        var extensionLines = [];
        var fragmentOutput = "";
        source = source.replace(/^\s*#version[^\n\r]*(?:\r?\n)?/gm, "");
        source = source.replace(/^\s*#extension[^\n\r]*(?:\r?\n)?/gm, function(line) {
          var trimmed = line.trim();
          if (/GL_ARB_uniform_buffer_object|GL_EXT_gpu_shader4/.test(trimmed)) return "";
          extensionLines.push(trimmed);
          return "";
        });
        source = source.replace(/#ifdef\s+GL_FRAGMENT_PRECISION_HIGH\s*\n\s*precision\s+highp\s+float\s*;\s*\n\s*#else\s*\n\s*precision\s+mediump\s+float\s*;\s*\n\s*#endif\s*/g, "");
        source = source.replace(/^\s*precision\s+(?:lowp|mediump|highp)\s+(?:float|int)\s*;\s*/gm, "");
        source = source.replace(/\btexture2D\s*\(/g, "texture(");
        source = source.replace(/\btextureCube\s*\(/g, "texture(");
        if (shaderType === GL_VERTEX_SHADER) {
          source = source.replace(/\battribute\b/g, "in");
          source = source.replace(/\bvarying\b/g, "out");
        } else if (shaderType === GL_FRAGMENT_SHADER) {
          source = source.replace(/\bvarying\b/g, "in");
          if (/\bgl_FragColor\b/.test(source)) {
            fragmentOutput = "out vec4 browserFragColor;\n";
            source = source.replace(/\bgl_FragColor\b/g, "browserFragColor");
          }
        }
        return [
          "#version 300 es",
          extensionLines.join("\n"),
          "precision highp float;",
          "precision highp int;",
          fragmentOutput + source
        ].filter(function(part) {
          return part;
        }).join("\n");
      }

      function shouldConvertLegacyShaderToGlslEs300(source, shaderType, gl) {
        if (!gl || typeof WebGL2RenderingContext === "undefined" || !(gl instanceof WebGL2RenderingContext)) {
          return false;
        }
        return false;
      }

      function shaderUsesGlslEs300(source) {
        return /^\s*#version\s+300\s+es\b/.test(source);
      }

      function ensureGlslEs300FragmentOutput(source) {
        if (!shaderUsesGlslEs300(source) || /\bout\s+vec4\s+\w+\s*;/.test(source)) return source;
        return source.replace(
          /(#version\s+300\s+es\s*\n(?:#extension[^\n]*\n)*precision\s+highp\s+float\s*;\s*\nprecision\s+highp\s+int\s*;\s*)/,
          "$1out vec4 browserFragColor;\n"
        );
      }

      function finalizeShaderSource(source, shaderType, gl) {
        var needsGlslEs300 = shaderUsesGlslEs300(source) || usesUniformBlock(source) ||
          shouldConvertLegacyShaderToGlslEs300(source, shaderType, gl);
        return needsGlslEs300 ? convertUniformBlockShaderToGlslEs300(source, shaderType) : source;
      }

      function buildSimpleWaterFragmentShader() {
        return [
          "precision highp int;",
          "#ifdef GL_FRAGMENT_PRECISION_HIGH",
          "precision highp float;",
          "#else",
          "precision mediump float;",
          "#endif",
          "varying vec3 worldPos;",
          "uniform float osg_SimulationTime;",
          "",
          "void main(void)",
          "{",
          "    vec2 browserWaterUv = worldPos.xy * 0.0025;",
          "    float browserWaterTime = osg_SimulationTime;",
          "    float browserWave = sin((browserWaterUv.x + browserWaterTime * 0.018) * 48.0) * 0.5 +",
          "        cos((browserWaterUv.y - browserWaterTime * 0.014) * 36.0) * 0.5;",
          "    float browserFineWave = sin((browserWaterUv.x + browserWaterUv.y + browserWaterTime * 0.03) * 120.0) * 0.5 + 0.5;",
          "    float browserPattern = clamp(0.55 + browserWave * 0.13 + browserFineWave * 0.10, 0.0, 1.0);",
          "    vec3 browserDeepWater = vec3(0.025, 0.105, 0.145);",
          "    vec3 browserShallowWater = vec3(0.105, 0.285, 0.315);",
          "    vec3 browserHighlight = vec3(0.34, 0.55, 0.56) * smoothstep(0.78, 1.0, browserPattern);",
          "    gl_FragColor = vec4(mix(browserDeepWater, browserShallowWater, browserPattern) + browserHighlight, 0.84);",
          "}"
        ].join("\n");
      }

      function buildSimpleWaterVertexShader() {
        return [
          "precision highp int;",
          "precision highp float;",
          "attribute vec4 a_position;",
          "attribute vec4 osg_Vertex;",
          "uniform mat4 u_modelView;",
          "uniform mat4 u_projection;",
          "uniform mat4 osg_ModelViewMatrix;",
          "uniform mat4 osg_ProjectionMatrix;",
          "uniform vec3 nodePosition;",
          "varying vec3 worldPos;",
          "",
          "void main(void)",
          "{",
          "    vec4 browserWaterPosition = length(osg_Vertex.xyz) > 0.0001 ? osg_Vertex : a_position;",
          "    bool browserWaterImmediateMatrices = abs(u_projection[0][0]) + abs(u_projection[1][1]) > 0.0001;",
          "    mat4 browserWaterModelView = browserWaterImmediateMatrices ? u_modelView : osg_ModelViewMatrix;",
          "    mat4 browserWaterProjection = browserWaterImmediateMatrices ? u_projection : osg_ProjectionMatrix;",
          "    worldPos = browserWaterPosition.xyz + nodePosition;",
          "    gl_Position = browserWaterProjection * browserWaterModelView * browserWaterPosition;",
          "}"
        ].join("\n");
      }

      function buildBrowserWaterUvFragmentShader() {
        return [
          "precision highp int;",
          "#ifdef GL_FRAGMENT_PRECISION_HIGH",
          "precision highp float;",
          "#else",
          "precision mediump float;",
          "#endif",
          "varying vec2 waterUV;",
          "uniform float u_browserWaterTime;",
          "",
          "void main(void)",
          "{",
          "    vec2 browserSimpleWaterUv = waterUV * 0.035;",
          "    float browserSimpleWaterWaveA = sin((browserSimpleWaterUv.x + browserSimpleWaterUv.y + u_browserWaterTime * 0.030) * 44.0);",
          "    float browserSimpleWaterWaveB = cos((browserSimpleWaterUv.x * 0.71 - browserSimpleWaterUv.y * 1.13 - u_browserWaterTime * 0.021) * 61.0);",
          "    float browserSimpleWaterRipples = sin((browserSimpleWaterUv.x * 1.57 + browserSimpleWaterUv.y * 0.83 + u_browserWaterTime * 0.046) * 117.0);",
          "    float browserSimpleWaterPattern = clamp(0.55 + browserSimpleWaterWaveA * 0.18 + browserSimpleWaterWaveB * 0.14 + browserSimpleWaterRipples * 0.075, 0.0, 1.0);",
          "    vec3 browserSimpleWaterDeep = vec3(0.020, 0.135, 0.180);",
          "    vec3 browserSimpleWaterShallow = vec3(0.125, 0.390, 0.430);",
          "    float browserSimpleWaterHighlight = smoothstep(0.68, 1.0, browserSimpleWaterPattern);",
          "    float browserSimpleWaterGlint = smoothstep(0.90, 1.0, browserSimpleWaterPattern);",
          "    vec3 browserSimpleWaterFoam = vec3(0.320, 0.520, 0.500) * browserSimpleWaterHighlight + vec3(0.18, 0.22, 0.18) * browserSimpleWaterGlint;",
          "    float browserSimpleWaterAlpha = 0.78 + browserSimpleWaterHighlight * 0.12;",
          "    gl_FragColor = vec4(clamp(mix(browserSimpleWaterDeep, browserSimpleWaterShallow, browserSimpleWaterPattern) + browserSimpleWaterFoam, 0.0, 1.0), browserSimpleWaterAlpha);",
          "}"
        ].join("\n");
      }

      function buildDiscardBrowserWaterUvFragmentShader() {
        return [
          "precision highp int;",
          "#ifdef GL_FRAGMENT_PRECISION_HIGH",
          "precision highp float;",
          "#else",
          "precision mediump float;",
          "#endif",
          "varying vec2 waterUV;",
          "",
          "void main(void)",
          "{",
          "    if (waterUV.x > -1.0e20)",
          "        discard;",
          "    gl_FragColor = vec4(0.0);",
          "}"
        ].join("\n");
      }

      function buildBrowserWaterUvVertexShader(source) {
        if (/\ba_position\b/.test(source) || /\bu_modelView\b/.test(source) || /\bu_projection\b/.test(source)) {
          return [
            "precision highp int;",
            "precision highp float;",
            "attribute vec4 a_position;",
            "attribute vec4 a_texCoord0;",
            "uniform mat4 u_modelView;",
            "uniform mat4 u_projection;",
            "varying vec2 waterUV;",
            "",
            "void main(void)",
            "{",
            "    waterUV = length(a_texCoord0.xy) > 0.0001 ? a_texCoord0.xy : a_position.xy * 0.01;",
            "    gl_Position = u_projection * u_modelView * a_position;",
            "}"
          ].join("\n");
        }
        return [
          "precision highp int;",
          "precision highp float;",
          "attribute vec4 osg_Vertex;",
          "attribute vec4 osg_MultiTexCoord0;",
          "uniform mat4 osg_ModelViewMatrix;",
          "uniform mat4 osg_ProjectionMatrix;",
          "varying vec2 waterUV;",
          "",
          "void main(void)",
          "{",
          "    waterUV = length(osg_MultiTexCoord0.xy) > 0.0001 ? osg_MultiTexCoord0.xy : osg_Vertex.xy * 0.01;",
          "    gl_Position = osg_ProjectionMatrix * osg_ModelViewMatrix * osg_Vertex;",
          "}"
        ].join("\n");
      }

      function isBrowserWaterUvFragmentShader(source) {
        return /\bvarying\s+vec2\s+waterUV\s*;/.test(source) &&
          /\bgl_FragColor\b/.test(source) &&
          !/\bgl_Position\b/.test(source);
      }

      function isPackagedBrowserWaterUvFragmentShader(source) {
        return isBrowserWaterUvFragmentShader(source) &&
          /\bwaterUV\s*\*\s*0\.025\b/.test(source) &&
          /\bgl_FragColor\s*=\s*vec4\s*\(\s*color\s*,\s*0\.92\s*\)\s*;/.test(source);
      }

      function isBrowserWaterUvVertexShader(source) {
        return /\bvarying\s+vec2\s+waterUV\s*;/.test(source) &&
          /\bgl_Position\b/.test(source) &&
          !/\bgl_FragColor\b/.test(source);
      }

      function isOpenMwWaterVertexShader(source) {
        return /\bvarying\s+vec3\s+worldPos\s*;/.test(source) &&
          /\bvarying\s+vec2\s+rippleMapUV\s*;/.test(source) &&
          /\buniform\s+vec3\s+nodePosition\s*;/.test(source) &&
          (/\bsetupShadowCoords\s*\(/.test(source) || /\bplayerPos\b/.test(source)) &&
          (/\bmodelToClip\s*\(/.test(source) || /\bgl_Position\b/.test(source));
      }

      function isOpenMwWaterFragmentShader(source) {
        return /\bvarying\s+vec3\s+worldPos\s*;/.test(source) &&
          /\bnormalMap\b/.test(source) &&
          (/\bWATER_COLOR\b/.test(source) || /\bwaterTransparency\b/.test(source)) &&
          (/\brippleMapUV\b/.test(source) || /\bsampleReflectionMap\s*\(/.test(source));
      }

      function isClassicTwoTextureFixedFunctionFragment(source) {
        return /\bu_texUnit0\b/.test(source) &&
          /\bu_texUnit1\b/.test(source) &&
          /\bu_textureMatrix0\b/.test(source) &&
          /\bu_textureMatrix1\b/.test(source) &&
          /\bgl_FragColor\s*=/.test(source);
      }

      function addClassicWaterTextureStageBypass(source) {
        if (!isClassicTwoTextureFixedFunctionFragment(source) || /\bu_browserClassicWaterSurface\b/.test(source)) {
          return source;
        }
        source = source.replace(
          /(uniform\s+mat4\s+u_textureMatrix1\s*;\s*)/,
          "$1\nuniform float u_browserClassicWaterSurface;\n"
        );
        source = source.replace(
          /vec4\s+tej_env1_result\s*=\s*tej_env0_result\s*\*\s*texture2D\s*\(\s*u_texUnit1\s*,\s*\(\s*u_textureMatrix1\s*\*\s*v_texCoord1\s*\)\.xy\s*\)\s*;/,
          [
            "vec4 tej_env1_sample = texture2D(u_texUnit1, (u_textureMatrix1 * v_texCoord1).xy);",
            "  float browserWaterSurface = clamp(u_browserClassicWaterSurface, 0.0, 1.0);",
            "  vec4 tej_env1_result = tej_env0_result * mix(tej_env1_sample, vec4(1.0), browserWaterSurface);",
            "  tej_env1_result.a = mix(tej_env1_result.a, min(tej_env1_result.a, 0.24), browserWaterSurface);"
          ].join("\n  ")
        );

        var colorAssignment = /gl_FragColor\s*=\s*([^;]+);/g;
        var lastAssignment = null;
        var match = null;
        while ((match = colorAssignment.exec(source))) {
          lastAssignment = {
            index: match.index,
            text: match[0],
            expression: match[1]
          };
        }
        if (!lastAssignment) return source;

        return source.slice(0, lastAssignment.index) + [
          "vec4 browserClassicWaterOutput = " + lastAssignment.expression + ";",
          "  if (u_browserClassicWaterSurface > 0.5)",
          "  {",
          "    float browserClassicWaterTone = clamp(dot(browserClassicWaterOutput.rgb, vec3(0.2126, 0.7152, 0.0722)) * 1.15, 0.0, 1.0);",
          "    browserClassicWaterOutput.rgb = mix(vec3(0.025, 0.105, 0.145), vec3(0.105, 0.285, 0.315), browserClassicWaterTone);",
          "    browserClassicWaterOutput.a = min(browserClassicWaterOutput.a, 0.24);",
          "  }",
          "  gl_FragColor = browserClassicWaterOutput;"
        ].join("\n  ") + source.slice(lastAssignment.index + lastAssignment.text.length);
      }

      function isBrowserWorldVertexShader(source) {
        return !/\bPASS_CLOUDS\b/.test(source) &&
          /\bpassWebglColor\b/.test(source) &&
          /\bpassWebglLight\b/.test(source) &&
          /\bmodelToView\s*\(/.test(source) &&
          /\bviewToClip\s*\(/.test(source) &&
          /\bgl_Position\s*=\s*modelToClip\s*\(\s*osg_Vertex\s*\)\s*;/.test(source);
      }

      function isBrowserWorldFragmentShader(source) {
        return !/\bPASS_CLOUDS\b/.test(source) &&
          /\bpassWebglColor\b/.test(source) &&
          /\bpassWebglLight\b/.test(source) &&
          /\bgl_FragColor\s*=\s*color\s*;/.test(source);
      }

      function isBrowserTerrainShaderSource(source) {
        return /\bbrowserDiffuseUvScale\b/.test(source || "") &&
          /\bdiffuseMapUV\b/.test(source || "") &&
          /\bpassWebglLight\b/.test(source || "");
      }

      function insertShaderBlockBeforeMain(source, markerPattern, block) {
        if (markerPattern.test(source)) return source;
        var match = /\n\s*void\s+main\s*\(/.exec(source);
        var insertIndex = match ? match.index + 1 : shaderUniformInsertIndex(source);
        return source.slice(0, insertIndex) + "\n" + block + "\n" + source.slice(insertIndex);
      }

      function addBrowserWorldLightingFallback(source) {
        if (isBrowserWorldVertexShader(source) && !/\bbrowserVertexColorLuma\b/.test(source)) {
          source = source.replace(
            /\bpassWebglColor\s*=\s*osg_Color\s*;/,
            [
              "    passWebglColor = osg_Color;",
              "    float browserVertexColorLuma = dot(abs(passWebglColor.rgb), vec3(0.2126, 0.7152, 0.0722));",
              "    if (browserVertexColorLuma < 0.015)",
              "        passWebglColor.rgb = vec3(1.0);"
            ].join("\n")
          );
          return source;
        }
        if (isBrowserWorldFragmentShader(source)) {
          source = insertShaderBlockBeforeMain(
            source,
            /float\s+browserWorldLight\s*\(/,
            [
              "float browserWorldLight(float value)",
              "{",
              "    return max(value, 0.44);",
              "}"
            ].join("\n")
          );
          source = source.replace(/\*\s*passWebglLight\b/g, "* browserWorldLight(passWebglLight)");
          if (isBrowserTerrainShaderSource(source)) {
            source = source.replace(
              /\bgl_FragColor\s*=\s*color\s*;/,
              [
                "    float browserTerrainLayerAlpha = clamp(passWebglColor.a, 0.0, 1.0);",
                "    if (browserTerrainLayerAlpha <= 0.01)",
                "        discard;",
                "    color.a = browserTerrainLayerAlpha;",
                "    gl_FragColor = color;"
              ].join("\n")
            );
          }
          return source;
        }
        return source;
      }

      function addBrowserWorldColorFallback(source) {
        if (isBrowserWorldVertexShader(source) && !/\bbrowserVertexColorLuma\b/.test(source)) {
          source = source.replace(
            /\bpassWebglColor\s*=\s*osg_Color\s*;/,
            [
              "    passWebglColor = osg_Color;",
              "    float browserVertexColorLuma = dot(abs(passWebglColor.rgb), vec3(0.2126, 0.7152, 0.0722));",
              "    if (browserVertexColorLuma < 0.015)",
              "        passWebglColor.rgb = vec3(1.0);"
            ].join("\n")
          );
          return source;
        }
        if (isBrowserWorldFragmentShader(source)) {
          source = insertShaderBlockBeforeMain(
            source,
            /vec4\s+browserWorldVertexColor\s*\(/,
            [
              "vec4 browserWorldVertexColor(vec4 value)",
              "{",
              "    float luma = dot(abs(value.rgb), vec3(0.2126, 0.7152, 0.0722));",
              "    if (luma < 0.015 || value.a <= 0.0)",
              "        return vec4(1.0);",
              "    return value;",
              "}"
            ].join("\n")
          );
          source = insertShaderBlockBeforeMain(
            source,
            /vec4\s+browserWorldDiffuseColor\s*\(/,
            [
              "vec4 browserWorldDiffuseColor(vec4 value)",
              "{",
              "    float luma = dot(abs(value.rgb), vec3(0.2126, 0.7152, 0.0722));",
              "    if (luma < 0.015 && value.a > 0.01)",
              "        return vec4(0.62, 0.58, 0.50, value.a);",
              "    return value;",
              "}"
            ].join("\n")
          );
          source = insertShaderBlockBeforeMain(
            source,
            /float\s+browserWorldLight\s*\(/,
            [
              "float browserWorldLight(float value)",
              "{",
              "    return max(value, 0.44);",
              "}"
            ].join("\n")
          );
          source = source.replace(
            /\bcolor\s*=\s*texture2D\s*\(\s*diffuseMap\s*,\s*diffuseMapUV\s*\)\s*;/g,
            "color = browserWorldDiffuseColor(texture2D(diffuseMap, diffuseMapUV));"
          );
          source = source.replace(/\bpassWebglColor\.rgb\b/g, "browserWorldVertexColor(passWebglColor).rgb");
          source = source.replace(/\bpassWebglColor\.a\b/g, "browserWorldVertexColor(passWebglColor).a");
          source = source.replace(/\*\s*passWebglLight\b/g, "* browserWorldLight(passWebglLight)");
          if (isBrowserTerrainShaderSource(source)) {
            source = source.replace(
              /\bgl_FragColor\s*=\s*color\s*;/,
              [
                "    float browserTerrainLayerAlpha = clamp(browserWorldVertexColor(passWebglColor).a, 0.0, 1.0);",
                "    if (browserTerrainLayerAlpha <= 0.01)",
                "        discard;",
                "    color.a = browserTerrainLayerAlpha;",
                "    gl_FragColor = color;"
              ].join("\n")
            );
          }
          return source;
        }
        return source;
      }

      function addBrowserWorldFog(source) {
        if (/\bpassWebglFogDepth\b/.test(source)) return source;
        if (isBrowserWorldVertexShader(source)) {
          source = source.replace(
            /(varying\s+float\s+passWebglLight\s*;\s*)/,
            "$1\nvarying float passWebglFogDepth;\n"
          );
          return source.replace(
            /\bgl_Position\s*=\s*modelToClip\s*\(\s*osg_Vertex\s*\)\s*;/,
            [
              "    vec4 browserFogViewPosition = modelToView(osg_Vertex);",
              "    gl_Position = viewToClip(browserFogViewPosition);",
              "    passWebglFogDepth = max(0.0, -browserFogViewPosition.z);"
            ].join("\n")
          );
        }
        if (isBrowserWorldFragmentShader(source)) {
          source = source.replace(
            /(varying\s+float\s+passWebglLight\s*;\s*)/,
            [
              "$1",
              "varying float passWebglFogDepth;",
              "uniform vec4 u_browserFogColor;",
              "uniform float u_browserFogEnd;",
              "uniform float u_browserFogScale;",
              "uniform float u_browserFogEnabled;",
              "",
              "float browserFixedFunctionFog(float ecDistance)",
              "{",
              "    float fog = clamp((u_browserFogEnd - ecDistance) * u_browserFogScale, 0.0, 1.0);",
              "    return mix(1.0, fog, clamp(u_browserFogEnabled, 0.0, 1.0));",
              "}",
              ""
            ].join("\n")
          );
          return source.replace(
            /\bgl_FragColor\s*=\s*color\s*;/,
            [
              "    float browserFogVisibility = browserFixedFunctionFog(passWebglFogDepth);",
              "    color.rgb = mix(u_browserFogColor.rgb, color.rgb, browserFogVisibility);",
              "    gl_FragColor = color;"
            ].join("\n")
          );
        }
        return source;
      }

      function addBrowserMaterialWaterFallback(source) {
        if (!/\bBROWSER_WATER_SURFACE\b/.test(source) || /\bu_browserWaterSurface\b/.test(source)) return source;
        if (!/#if\s+1\s*\n\s*uniform\s+sampler2D\s+diffuseMap\s*;\s*\n\s*varying\s+vec2\s+diffuseMapUV\s*;/.test(source)) return source;
        source = source.replace(
          /(uniform\s+float\s+alphaRef\s*;\s*)/,
          "$1\nuniform float u_browserWaterSurface;\nuniform float u_browserWaterTime;\n"
        );
        return source.replace(
          /#if\s+defined\s*\(\s*BROWSER_WATER_SURFACE\s*\)\s*&&\s*BROWSER_WATER_SURFACE\s*\n[\s\S]*?color\.a\s*=\s*0\.72\s*;\s*\n#else\s*\n(?:#line[^\n]*\n)?\s*if\s*\(\s*color\.a\s*<=\s*max\s*\(\s*alphaRef\s*,\s*0\.01\s*\)\s*\)\s*\n\s*discard\s*;\s*\n#endif/,
          [
            "if (u_browserWaterSurface > 0.5)",
            "{",
            "    float waterTexturePattern = clamp(dot(color.rgb, vec3(0.2126, 0.7152, 0.0722)) * 1.25, 0.0, 1.0);",
            "    float waterWave = sin((diffuseMapUV.x + u_browserWaterTime * 0.020) * 55.0) * 0.5 +",
            "        cos((diffuseMapUV.y - u_browserWaterTime * 0.017) * 42.0) * 0.5;",
            "    float waterPattern = clamp(waterTexturePattern + waterWave * 0.10, 0.0, 1.0);",
            "    color.rgb = mix(vec3(0.025, 0.105, 0.145), vec3(0.120, 0.315, 0.345), waterPattern);",
            "    color.rgb += vec3(0.20, 0.34, 0.34) * smoothstep(0.78, 1.0, waterPattern);",
            "    color.a = 0.82;",
            "}",
            "else",
            "{",
            "    if (color.a <= max(alphaRef, 0.01))",
            "        discard;",
            "}"
          ].join("\n")
        );
      }

      function fixShaderSource(source, shaderType, gl) {
        var needsGlslEs300 = /^\s*#version\s+300\s+es\b/.test(source) || usesUniformBlock(source);
        source = source.replace(/^\s*#version[^\n\r]*(?:\r?\n)?/gm, "");
        source = normalizeShaderPreamble(source);
        needsGlslEs300 = needsGlslEs300 || shouldConvertLegacyShaderToGlslEs300(source, shaderType, gl);
        source = source.replace(/\bcentroid\s+varying\b/g, "varying");
        source = source.replace(/(uniform\s+(?:bool|int|float|vec[234]|mat[234]|sampler2D)\s+\w+)\s*=\s*[^;]+;/g, "$1;");
        if (browserShaderWaterFallback && isOpenMwWaterVertexShader(source)) {
          return finalizeShaderSource(buildSimpleWaterVertexShader(), shaderType, gl);
        }
        source = replaceLegacyAttribute(source, "gl_Vertex", "osg_Vertex");
        source = replaceLegacyAttribute(source, "gl_Color", "osg_Color");
        source = replaceLegacyAttribute(source, "gl_Normal", "osg_Normal");
        source = replaceLegacyAttribute(source, "gl_MultiTexCoord0", "osg_MultiTexCoord0");
        source = replaceLegacyAttribute(source, "gl_MultiTexCoord1", "osg_MultiTexCoord1");
        source = source.replace(/\bgl_FragData\s*\[\s*0\s*\]/g, "gl_FragColor");
        source = source.replace(/^\s*gl_FragData\s*\[\s*1\s*\]\s*(?:\.[xyzwrgba]{1,4})?\s*=\s*[^;]+;\s*$/gm, "");
        source = source.replace(/\bgl_ModelViewMatrixInverse\b/g, "osg_ModelViewMatrixInverse");
        source = source.replace(/\bgl_ModelViewMatrix\b/g, "osg_ModelViewMatrix");
        source = ensureUniform(source, "mat4", "osg_ModelViewMatrix");
        source = ensureUniform(source, "mat4", "osg_ModelViewMatrixInverse");
        source = fixOpenMwSimpleSkyTextureShader(source);
        source = fixPackagedBrowserSkyShader(source);
        if (browserShaderWaterFallback && isBrowserWaterUvVertexShader(source)) {
          return finalizeShaderSource(buildBrowserWaterUvVertexShader(source), shaderType, gl);
        }
        if (hasModelHelperPrototype.test(source) && !/vec4\s+modelToClip\s*\(vec4 pos\)\s*\{/.test(source)) {
          source = source
            .replace(/\s*uniform\s+mat4\s+projectionMatrix\s*;\s*/g, "\n")
            .replace(/\s*uniform\s+mat4\s+u_modelView\s*;\s*/g, "\n")
            .replace(modelHelperPrototype, modelToClip);
        }
        source = source.replace(/\bgl_ClipVertex\s*=\s*[^;]+;/g, "");
        source = source.replace(/\bgl_NormalMatrix\b/g, "mat3(1.0)");
        source = source.replace(/\ba_normalMatrix\b/g, "mat3(1.0)");
        source = source.replace(/\bPointLightIndex\s*\[\s*i\s*\]/g, "0");
        source = source.replace(/\bLightBuffer\s*\[\s*lightIndex\s*\]/g, "LightBuffer[0]");
        source = source.replace(/\bi\s*<\s*PointLightCount\b/g, "i < 1");
        if (browserSkyShaderPatchEnabled() &&
            isOpenMwSkyShaderSource(source) &&
            /\bPASS_CLOUDS\b/.test(source) &&
            /\bbrowserScreenSky\b/.test(source) &&
            !/texture2D\s*\(\s*Texture\s*,\s*TexCoord\s*\)\s*\.zyxw/.test(source)) {
          source = source
            .replace(
              /if\s*\(\s*browserScreenSky\s*!=\s*0(?:\s*&&\s*pass\s*==\s*PASS_ATMOSPHERE)?\s*\)\s*\n\s*gl_Position\s*=\s*vec4\s*\(\s*(?:gl_Vertex|osg_Vertex)\.xy\s*,\s*0\.0\s*,\s*1\.0\s*\)\s*;\s*\n\s*else\s*\n\s*gl_Position\s*=\s*modelToClip\s*\(\s*(?:gl_Vertex|osg_Vertex)\s*\)\s*;/,
              [
                "if (browserScreenSky != 0 && pass == PASS_ATMOSPHERE)",
                "    gl_Position = vec4(osg_Vertex.xy, 0.0, 1.0);",
                "else",
                "    gl_Position = modelToClip(osg_Vertex);"
              ].join("\n")
            )
            .replace(
              /\s*else if\s*\(\s*pass\s*==\s*PASS_CLOUDS\s*\)\s*\n\s*paintClouds\s*\(\s*color\s*\)\s*;/,
              ""
            )
            .replace(
              /if\s*\(\s*browserScreenSky\s*!=\s*0\s*\)\s*\n\s*paintAtmosphere\s*\(\s*color\s*\)\s*;\s*\n\s*else if\s*\(\s*pass\s*==\s*PASS_ATMOSPHERE\s*\)/,
              [
                "if (pass == PASS_CLOUDS)",
                "    paintClouds(color);",
                "else if (browserScreenSky != 0)",
                "    paintAtmosphere(color);",
                "else if (pass == PASS_ATMOSPHERE)"
              ].join("\n")
            )
            .replace(
              /if\s*\(\s*pass\s*==\s*PASS_CLOUDS\s*\)\s*\n\s*paintClouds\s*\(\s*color\s*\)\s*;\s*\n\s*else if\s*\(\s*browserScreenSky\s*!=\s*0\s*\)\s*\n\s*paintAtmosphere\s*\(\s*color\s*\)\s*;\s*\n\s*else if\s*\(\s*pass\s*==\s*PASS_ATMOSPHERE\s*\)/,
              [
                "if (pass == PASS_CLOUDS)",
                "    paintClouds(color);",
                "else if (browserScreenSky != 0)",
                "    paintAtmosphere(color);",
                "else if (pass == PASS_ATMOSPHERE)"
              ].join("\n")
            );
        }
        if (browserSkyShaderPatchEnabled() &&
            isOpenMwSkyShaderSource(source) &&
            /\bpaintAtmosphereNight\b/.test(source) &&
            hasOpenMwSkyTextureInputs(source)) {
          source = source.replace(
            /void\s+paintAtmosphereNight\s*\(\s*inout\s+vec4\s+color\s*\)\s*\{[\s\S]*?\n\}/,
            browserClassicNightSkyShaderLines().join("\n")
          );
          source = ensureUniform(source, "vec4", "browserSkyEmission");
        }
        if (browserSkyShaderPatchEnabled() &&
            isOpenMwSkyShaderSource(source) &&
            /\bpaintClouds\b/.test(source) &&
            hasOpenMwSkyTextureInputs(source) &&
            !/\bbrowserClassicCloudSample\b/.test(source)) {
          source = source.replace(
            /void\s+paintClouds\s*\(\s*inout\s+vec4\s+color\s*\)\s*\{[\s\S]*?\n\}/,
            [
              "void paintClouds(inout vec4 color)",
              "{",
              "    vec4 cloudSample = texture2D(diffuseMap, diffuseMapUV);",
              "    float cloudFade = clamp(passColor.a, 0.0, 1.0);",
              "    float cloudOpacity = clamp(opacity, 0.0, 1.0);",
              "    float cloudRgbMask = max(cloudSample.r, max(cloudSample.g, cloudSample.b));",
              "    float cloudAlphaMask = cloudSample.a < 0.99 ? cloudSample.a : cloudRgbMask;",
              "    float cloudShapeMask = max(cloudRgbMask, cloudAlphaMask);",
              "    float textureCloudMask = browserCloudFallback != 0 ? 0.0 : smoothstep(0.08, 0.58, cloudShapeMask);",
              "    vec2 nativeCloudUv = diffuseMapUV * vec2(2.4, 1.35);",
              "    vec2 nci0 = floor(nativeCloudUv);",
              "    vec2 ncf0 = fract(nativeCloudUv);",
              "    ncf0 = ncf0 * ncf0 * (3.0 - 2.0 * ncf0);",
              "    float nca0 = fract(sin(dot(nci0, vec2(127.1, 311.7))) * 43758.5453);",
              "    float ncb0 = fract(sin(dot(nci0 + vec2(1.0, 0.0), vec2(127.1, 311.7))) * 43758.5453);",
              "    float ncc0 = fract(sin(dot(nci0 + vec2(0.0, 1.0), vec2(127.1, 311.7))) * 43758.5453);",
              "    float ncd0 = fract(sin(dot(nci0 + vec2(1.0, 1.0), vec2(127.1, 311.7))) * 43758.5453);",
              "    float nativeCloudNoise0 = mix(mix(nca0, ncb0, ncf0.x), mix(ncc0, ncd0, ncf0.x), ncf0.y);",
              "    vec2 nativeCloudUv2 = nativeCloudUv * 2.35 + vec2(11.7, 4.3);",
              "    vec2 nci1 = floor(nativeCloudUv2);",
              "    vec2 ncf1 = fract(nativeCloudUv2);",
              "    ncf1 = ncf1 * ncf1 * (3.0 - 2.0 * ncf1);",
              "    float nca1 = fract(sin(dot(nci1, vec2(269.5, 183.3))) * 43758.5453);",
              "    float ncb1 = fract(sin(dot(nci1 + vec2(1.0, 0.0), vec2(269.5, 183.3))) * 43758.5453);",
              "    float ncc1 = fract(sin(dot(nci1 + vec2(0.0, 1.0), vec2(269.5, 183.3))) * 43758.5453);",
              "    float ncd1 = fract(sin(dot(nci1 + vec2(1.0, 1.0), vec2(269.5, 183.3))) * 43758.5453);",
              "    float nativeCloudNoise1 = mix(mix(nca1, ncb1, ncf1.x), mix(ncc1, ncd1, ncf1.x), ncf1.y);",
              "    float fallbackCloudMask = smoothstep(0.56, 0.78, nativeCloudNoise0 * 0.72 + nativeCloudNoise1 * 0.28);",
              "    float fallbackStrength = browserCloudFallback != 0 ? fallbackCloudMask : 0.0;",
              "    float cloudMask = max(textureCloudMask, fallbackStrength);",
              "    float cloudCutoff = browserCloudFallback != 0 ? 0.16 : 0.02;",
              "    if (cloudMask <= cloudCutoff)",
              "        discard;",
              "    float visibleCloudMask = clamp((cloudMask - cloudCutoff) / max(1.0 - cloudCutoff, 0.001), 0.0, 1.0);",
              "    float cloudLayerOpacity = browserCloudFallback != 0 ? max(cloudOpacity, 0.85) : cloudOpacity;",
              "    float cloudAlphaLimit = browserCloudFallback != 0 ? 0.38 : 0.82;",
              "    float cloudAlpha = clamp(visibleCloudMask * cloudFade * cloudLayerOpacity, 0.0, cloudAlphaLimit);",
              "    if (cloudAlpha <= 0.01)",
              "        discard;",
              "    vec3 fallbackShape = vec3(browserCloudFallback != 0 ? visibleCloudMask : cloudMask);",
              "    vec3 cloudShape = browserCloudFallback != 0 ? fallbackShape : max(cloudSample.rgb, max(vec3(cloudMask), fallbackShape));",
              "    vec3 skyEmission = max(browserSkyEmission.rgb, vec3(0.0));",
              "    float skyLuma = dot(skyEmission, vec3(0.2126, 0.7152, 0.0722));",
              "    float nightAmount = 1.0 - smoothstep(0.075, 0.20, skyLuma);",
              "    vec3 dayCloudTint = browserCloudFallback != 0 ? vec3(0.82, 0.82, 0.78) : clamp(skyEmission + vec3(0.14), vec3(0.58, 0.58, 0.54), vec3(0.88, 0.88, 0.82));",
              "    vec3 nightCloudTint = vec3(0.055, 0.064, 0.095);",
              "    vec3 cloudTint = mix(dayCloudTint, nightCloudTint, nightAmount);",
              "    float finalCloudAlpha = min(cloudAlpha, mix(cloudAlphaLimit, 0.22, nightAmount));",
              "    vec3 cloudRgb = clamp(cloudShape * cloudTint, 0.0, 1.0);",
              "    color = vec4(cloudRgb, finalCloudAlpha);",
              "}"
            ].join("\n")
          );
          source = ensureUniform(source, "int", "browserCloudFallback");
          source = ensureUniform(source, "vec4", "browserSkyEmission");
        }
        if (browserShaderWaterFallback && isOpenMwWaterFragmentShader(source)) {
          return finalizeShaderSource(buildSimpleWaterFragmentShader(), shaderType, gl);
        }
        if (!browserShaderWaterFallback && isPackagedBrowserWaterUvFragmentShader(source)) {
          return finalizeShaderSource(
            browserWaterUvFix ? buildBrowserWaterUvFragmentShader() : buildDiscardBrowserWaterUvFragmentShader(),
            shaderType,
            gl
          );
        }
        if (browserShaderWaterFallback && isBrowserWaterUvFragmentShader(source)) {
          return finalizeShaderSource(buildBrowserWaterUvFragmentShader(), shaderType, gl);
        }
        if (browserWaterFallback) source = addBrowserMaterialWaterFallback(source);
        if (browserClassicWaterPatchEnabled()) source = addClassicWaterTextureStageBypass(source);
        source = browserWorldColorFallback
          ? addBrowserWorldColorFallback(source)
          : addBrowserWorldLightingFallback(source);
        if (browserWorldFogPatch) source = addBrowserWorldFog(source);
        source = source.replace(/\bgl_FrontMaterial\.emission\b/g, "browserMaterialEmission");
        source = source.replace(/\bgl_FrontMaterial\.ambient\b/g, "browserMaterialAmbient");
        source = source.replace(/\bgl_FrontMaterial\.diffuse\b/g, "browserMaterialDiffuse");
        source = source.replace(/\bgl_FrontMaterial\.specular\b/g, "browserMaterialSpecular");
        source = source.replace(/\bgl_FrontMaterial\.shininess\b/g, "browserMaterialShininess");
        source = source.replace(/\bgl_FrontLightModelProduct\.sceneColor\b/g, "browserLightModelSceneColor");
        source = source.replace(/\bgl_LightModel\.ambient\b/g, "browserLightModelAmbient");
        source = source.replace(/\bgl_Fog\.start\b/g, "browserFogStart");
        source = source.replace(/\bgl_Fog\.end\b/g, "browserFogEnd");
        source = source.replace(/\bgl_Fog\.scale\b/g, "browserFogScale");
        source = source.replace(/\bgl_Fog\.color\b/g, "browserFogColor");
        source = source.replace(/\bgl_Fog\.density\b/g, "browserFogDensity");
        source = ensureUniform(source, "vec4", "browserMaterialEmission");
        source = ensureUniform(source, "vec4", "browserMaterialAmbient");
        source = ensureUniform(source, "vec4", "browserMaterialDiffuse");
        source = ensureUniform(source, "vec4", "browserMaterialSpecular");
        source = ensureUniform(source, "float", "browserMaterialShininess");
        source = ensureUniform(source, "vec4", "browserLightModelSceneColor");
        source = ensureUniform(source, "vec4", "browserLightModelAmbient");
        source = ensureUniform(source, "float", "browserFogStart");
        source = ensureUniform(source, "float", "browserFogEnd");
        source = ensureUniform(source, "float", "browserFogScale");
        source = ensureUniform(source, "vec4", "browserFogColor");
        source = ensureUniform(source, "float", "browserFogDensity");

        source = addFallbackBlock(source, "vec4 sampleReflectionMap(vec2 uv)",
          "uniform sampler2D reflectionMap;\nvec4 sampleReflectionMap(vec2 uv)\n{ return texture2D(reflectionMap, uv); }");
        source = addFallbackBlock(source, "vec4 sampleRefractionMap(vec2 uv)",
          "uniform sampler2D refractionMap;\nvec4 sampleRefractionMap(vec2 uv)\n{ return texture2D(refractionMap, uv); }");
        source = addFallbackFunction(source, "float sampleRefractionDepthMap(vec2 uv)", "{ return 1.0; }");
        source = addFallbackBlock(source, "vec4 samplerLastShader(vec2 uv)",
          "uniform sampler2D lastShader;\nvec4 samplerLastShader(vec2 uv)\n{ return texture2D(lastShader, uv); }");
        source = addFallbackBlock(source, "vec3 sampleSkyColor(vec2 uv)",
          "uniform sampler2D sky;\nvec3 sampleSkyColor(vec2 uv)\n{ return texture2D(sky, uv).rgb; }");
        source = addFallbackBlock(source, "vec4 sampleOpaqueDepthTex(vec2 uv)",
          "uniform sampler2D opaqueDepthTex;\nvec4 sampleOpaqueDepthTex(vec2 uv)\n{ return texture2D(opaqueDepthTex, uv); }");
        return needsGlslEs300 ? convertUniformBlockShaderToGlslEs300(source, shaderType) : source;
      }

      function patchContext(proto) {
        if (!proto || Object.prototype.hasOwnProperty.call(proto, "__openmwShaderCompat")) return;
        Object.defineProperty(proto, "__openmwShaderCompat", { value: true });
        var GL_ALPHA = 0x1906;
        var GL_LUMINANCE = 0x1909;
        var GL_LUMINANCE_ALPHA = 0x190A;
        var GL_BGR = 0x80E0;
        var GL_BGRA = 0x80E1;
        var GL_LUMINANCE8 = 0x8040;
        var GL_LUMINANCE8_ALPHA8 = 0x8045;
        var GL_TEXTURE_BORDER_COLOR = 0x1004;
        var GL_TEXTURE_COMPARE_FAIL_VALUE_ARB = 0x80BF;
        var GL_GENERATE_MIPMAP = 0x8191;
        var GL_TEXTURE_LOD_BIAS = 0x8501;
        var GL_TEXTURE_MAG_FILTER = 0x2800;
        var GL_TEXTURE_MIN_FILTER = 0x2801;
        var GL_TEXTURE_WRAP_S = 0x2802;
        var GL_TEXTURE_WRAP_T = 0x2803;
        var GL_DEPTH_COMPONENT = 0x1902;
        var GL_DEPTH_COMPONENT16 = 0x81A5;
        var GL_LINEAR = 0x2601;
        var createShader = proto.createShader;
        var shaderSource = proto.shaderSource;
        var compileShader = proto.compileShader;
        var createProgram = proto.createProgram;
        var attachShader = proto.attachShader;
        var linkProgram = proto.linkProgram;
        var bindAttribLocation = proto.bindAttribLocation;
        var getShaderParameter = proto.getShaderParameter;
        var getShaderInfoLog = proto.getShaderInfoLog;
        var getShaderSource = proto.getShaderSource;
        var getProgramParameter = proto.getProgramParameter;
        var getProgramInfoLog = proto.getProgramInfoLog;
        var getParameter = proto.getParameter;
        var getError = proto.getError;
        var getSupportedExtensions = proto.getSupportedExtensions;
        var getExtension = proto.getExtension;
        var getVertexAttrib = proto.getVertexAttrib;
        var texImage2D = proto.texImage2D;
        var texSubImage2D = proto.texSubImage2D;
        var texParameterf = proto.texParameterf;
        var texParameteri = proto.texParameteri;
        var compressedTexImage2D = proto.compressedTexImage2D;
        var compressedTexSubImage2D = proto.compressedTexSubImage2D;
        var generateMipmap = proto.generateMipmap;
        var activeTexture = proto.activeTexture;
        var bindTexture = proto.bindTexture;
        var bindFramebuffer = proto.bindFramebuffer;
        var createBuffer = proto.createBuffer;
        var bindBuffer = proto.bindBuffer;
        var bufferData = proto.bufferData;
        var bufferSubData = proto.bufferSubData;
        var vertexAttribPointer = proto.vertexAttribPointer;
        var enableVertexAttribArray = proto.enableVertexAttribArray;
        var disableVertexAttribArray = proto.disableVertexAttribArray;
        var useProgram = proto.useProgram;
        var getUniformLocation = proto.getUniformLocation;
        var getUniform = proto.getUniform;
        var getAttribLocation = proto.getAttribLocation;
        var getActiveUniform = proto.getActiveUniform;
        var getActiveAttrib = proto.getActiveAttrib;
        var uniform1i = proto.uniform1i;
        var uniform1f = proto.uniform1f;
        var uniform4f = proto.uniform4f;
        var uniform4fv = proto.uniform4fv;
        var uniformMatrix4fv = proto.uniformMatrix4fv;
        var viewport = proto.viewport;
        var drawArrays = proto.drawArrays;
        var drawElements = proto.drawElements;
        var enable = proto.enable;
        var disable = proto.disable;
        var depthFunc = proto.depthFunc;
        var depthMask = proto.depthMask;
        var blendFunc = proto.blendFunc;
        var blendFuncSeparate = proto.blendFuncSeparate;
        var blendEquation = proto.blendEquation;
        var blendEquationSeparate = proto.blendEquationSeparate;
        var traceTextures = /(?:^|[?&])gltrace=1(?:&|$)/.test(window.location.search);
        var skyProbe = /(?:^|[?&])skyprobe=1(?:&|$)/.test(window.location.search);
        var terrainProbe = /(?:^|[?&])terraindiag=1(?:&|$)/.test(window.location.search);
        var browserTerrainBlendFix = !/(?:^|[?&])no-terrainblendfix=1(?:&|$)/.test(window.location.search);
        if (traceTextures && !window.__glTextureTrace) window.__glTextureTrace = [];
        if (traceTextures && !window.__glDrawTrace) window.__glDrawTrace = [];
        if (skyProbe && !window.__openmwSkyProbe) {
          window.__openmwSkyProbe = { shaders: [], programs: [], draws: [], uniformSets: [] };
        }
        var activeTextureUnit = 0;
        var boundTexture2DByUnit = [];
        var currentDrawFramebuffer = null;
        var currentReadFramebuffer = null;
        var boundArrayBuffer = null;
        var boundElementArrayBuffer = null;
        var currentProgram = null;
        var currentProgramInvalid = false;
        var textureInfo = new WeakMap();
        var bufferInfo = new WeakMap();
        var programInfo = new WeakMap();
        var browserWaterPrograms = new WeakMap();
        var browserWaterWhiteTexture = null;
        var uniformInfo = new WeakMap();
        var attribPointerInfo = [];
        var maxVertexAttribs = 16;
        var compileDiagnosticCount = 0;
        var debugProgramCounter = 0;
        var trackedGlState = {
          depthTest: false,
          blend: false,
          depthMask: true,
          depthFunc: 0x0201,
          blendSrcRgb: 1,
          blendDstRgb: 0,
          blendSrcAlpha: 1,
          blendDstAlpha: 0,
          blendEquationRgb: 0x8006,
          blendEquationAlpha: 0x8006
        };
        function cloneTrackedGlState() {
          return {
            depthTest: trackedGlState.depthTest,
            blend: trackedGlState.blend,
            depthMask: trackedGlState.depthMask,
            depthFunc: trackedGlState.depthFunc,
            blendSrcRgb: trackedGlState.blendSrcRgb,
            blendDstRgb: trackedGlState.blendDstRgb,
            blendSrcAlpha: trackedGlState.blendSrcAlpha,
            blendDstAlpha: trackedGlState.blendDstAlpha,
            blendEquationRgb: trackedGlState.blendEquationRgb,
            blendEquationAlpha: trackedGlState.blendEquationAlpha
          };
        }
        function setTrackedEnable(gl, cap, enabled) {
          enabled = !!enabled;
          if (cap === gl.DEPTH_TEST) {
            if (trackedGlState.depthTest === enabled) return;
            trackedGlState.depthTest = enabled;
          } else if (cap === gl.BLEND) {
            if (trackedGlState.blend === enabled) return;
            trackedGlState.blend = enabled;
          }
          if (enabled) {
            if (enable) enable.call(gl, cap);
          } else if (disable) {
            disable.call(gl, cap);
          }
        }
        function setTrackedDepthFunc(gl, value) {
          if (!depthFunc || trackedGlState.depthFunc === value) return;
          trackedGlState.depthFunc = value;
          depthFunc.call(gl, value);
        }
        function setTrackedDepthMask(gl, value) {
          value = !!value;
          if (!depthMask || trackedGlState.depthMask === value) return;
          trackedGlState.depthMask = value;
          depthMask.call(gl, value);
        }
        function setTrackedBlendFuncSeparate(gl, srcRgb, dstRgb, srcAlpha, dstAlpha) {
          if (trackedGlState.blendSrcRgb === srcRgb &&
              trackedGlState.blendDstRgb === dstRgb &&
              trackedGlState.blendSrcAlpha === srcAlpha &&
              trackedGlState.blendDstAlpha === dstAlpha) {
            return;
          }
          trackedGlState.blendSrcRgb = srcRgb;
          trackedGlState.blendDstRgb = dstRgb;
          trackedGlState.blendSrcAlpha = srcAlpha;
          trackedGlState.blendDstAlpha = dstAlpha;
          if (blendFuncSeparate) {
            blendFuncSeparate.call(gl, srcRgb, dstRgb, srcAlpha, dstAlpha);
          } else if (blendFunc) {
            blendFunc.call(gl, srcRgb, dstRgb);
          }
        }
        function setTrackedBlendEquationSeparate(gl, rgb, alpha) {
          if (trackedGlState.blendEquationRgb === rgb &&
              trackedGlState.blendEquationAlpha === alpha) {
            return;
          }
          trackedGlState.blendEquationRgb = rgb;
          trackedGlState.blendEquationAlpha = alpha;
          if (blendEquationSeparate) {
            blendEquationSeparate.call(gl, rgb, alpha);
          } else if (blendEquation) {
            blendEquation.call(gl, rgb);
          }
        }
        function restoreTrackedGlState(gl, state) {
          setTrackedEnable(gl, gl.DEPTH_TEST, state.depthTest);
          setTrackedDepthFunc(gl, state.depthFunc);
          setTrackedDepthMask(gl, state.depthMask);
          setTrackedEnable(gl, gl.BLEND, state.blend);
          setTrackedBlendEquationSeparate(gl, state.blendEquationRgb, state.blendEquationAlpha);
          setTrackedBlendFuncSeparate(gl, state.blendSrcRgb, state.blendDstRgb, state.blendSrcAlpha, state.blendDstAlpha);
        }
        if (!window.__openmwGraphicsWarnings) window.__openmwGraphicsWarnings = [];
        if (!window.__openmwNoProgramDraws) {
          window.__openmwNoProgramDraws = { skipped: 0, last: null };
        }
        if (browserWaterStateFixEnabled() && !window.__openmwWaterStateFix) {
          window.__openmwWaterStateFix = {
            draws: 0,
            applied: 0,
            skipped: 0,
            lastReason: "",
            classicPatch: browserClassicWaterPatchEnabled()
          };
        }
        if (browserWaterStateFixEnabled() && !window.__openmwClassicWaterShaders) {
          window.__openmwClassicWaterShaders = { seen: 0, samples: [], last: null };
        }
        if (browserWaterDrawFixEnabled() && !window.__openmwWaterDrawFix) {
          window.__openmwWaterDrawFix = { draws: 0, programs: 0, skipped: 0, lastReason: "" };
        }
        if (!window.__openmwClientArrayFix) {
          window.__openmwClientArrayFix = { uploads: 0, bytes: 0, skipped: 0, lastReason: "" };
        }
        if (!window.__openmwTerrainBlendFix) {
          window.__openmwTerrainBlendFix = { draws: 0, skipped: 0, lastReason: "", lastDraw: null, samples: [] };
        } else if (!window.__openmwTerrainBlendFix.samples) {
          window.__openmwTerrainBlendFix.samples = [];
        }
        if (!window.__openmwWorldFogPatch) {
          window.__openmwWorldFogPatch = {
            shaders: 0,
            vertexShaders: 0,
            fragmentShaders: 0,
            programs: 0,
            uniformUploads: 0,
            uniformSkips: 0,
            offscreenSkips: 0,
            lastProgram: null
          };
        }
        if ((browserShaderWaterFallback || browserWaterUvFix) && !window.__openmwShaderWater) {
          window.__openmwShaderWater = {
            shaders: 0,
            vertexShaders: 0,
            fragmentShaders: 0,
            programs: 0,
            waterUvShaders: 0,
            waterUvVertexShaders: 0,
            waterUvFragmentShaders: 0,
            waterUvPrograms: 0,
            waterUvDraws: 0,
            waterUvForcedStateDraws: 0,
            waterUvSkippedDraws: 0,
            draws: 0,
            forcedStateDraws: 0,
            lastDraw: null,
            lastProgram: null
          };
        }

        function rememberContext(gl) {
          window.__openmwLastGL = gl;
        }

        if (viewport) {
          proto.viewport = function(x, y, width, height) {
            rememberContext(this);
            if (this.canvas === canvasElement && Number(x) === 0 && Number(y) === 0) {
              if (width > this.canvas.width) width = this.canvas.width;
              if (height > this.canvas.height) height = this.canvas.height;
            }
            return viewport.call(this, x, y, width, height);
          };
        }

        function recordGraphicsWarning(kind, message, detail) {
          var warning = {
            kind: kind,
            message: String(message || ""),
            detail: detail || "",
            time: Date.now()
          };
          if (window.__openmwGraphicsWarnings.length < 80) {
            window.__openmwGraphicsWarnings.push(warning);
          }
          console.warn("[OpenMW WebGL] " + kind + ": " + warning.message, warning.detail);
          try {
            if (typeof Module !== "undefined" && Module.printErr) {
              Module.printErr("[OpenMW WebGL] " + kind + ": " + warning.message);
            }
          } catch (error) {
          }
        }

        window.openmwGraphicsDiagnostics = function() {
          var gl = window.__openmwLastGL;
          if (!gl) return { warnings: window.__openmwGraphicsWarnings.slice() };
          var debugInfo = gl.getExtension && gl.getExtension("WEBGL_debug_renderer_info");
          return {
            vendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
            renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
            version: gl.getParameter(gl.VERSION),
            shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
            fog: getOpenMwFogState(),
            worldFog: window.__openmwWorldFogPatch || null,
            terrainBlend: window.__openmwTerrainBlendFix || null,
            water: window.__openmwWaterDrawFix || null,
            waterState: window.__openmwWaterStateFix || null,
            classicWaterShaders: window.__openmwClassicWaterShaders || null,
            shaderWater: window.__openmwShaderWater || null,
            clientArrays: window.__openmwClientArrayFix || null,
            noProgramDraws: window.__openmwNoProgramDraws || null,
            emergencyShaders: window.__openmwEmergencyShaderFallback || null,
            warnings: window.__openmwGraphicsWarnings.slice()
          };
        };

        function getBoundTexture2D() {
          return boundTexture2DByUnit[activeTextureUnit] || null;
        }

        function rememberFramebufferBinding(gl, target, framebuffer) {
          if (!gl) return;
          if (target === gl.FRAMEBUFFER) {
            currentDrawFramebuffer = framebuffer || null;
            currentReadFramebuffer = framebuffer || null;
            return;
          }
          if (target === gl.DRAW_FRAMEBUFFER) currentDrawFramebuffer = framebuffer || null;
          if (target === gl.READ_FRAMEBUFFER) currentReadFramebuffer = framebuffer || null;
        }

        function renderingToDefaultFramebuffer() {
          return !currentDrawFramebuffer;
        }

        function getAttribTypeByteSize(gl, type) {
          if (type === gl.BYTE || type === gl.UNSIGNED_BYTE) return 1;
          if (type === gl.SHORT || type === gl.UNSIGNED_SHORT || type === gl.HALF_FLOAT) return 2;
          if (type === gl.FLOAT || type === gl.FIXED || type === gl.INT || type === gl.UNSIGNED_INT) return 4;
          return 0;
        }

        function getWasmHeapU8() {
          try {
            if (typeof HEAPU8 !== "undefined" && HEAPU8 && HEAPU8.buffer) return HEAPU8;
          } catch (error) {
          }
          return null;
        }

        function noteClientArraySkip(reason) {
          var stats = window.__openmwClientArrayFix;
          if (!stats) return;
          stats.skipped++;
          stats.lastReason = reason;
        }

        function copyBufferBytes(data, srcOffset, length) {
          if (typeof data === "number") return new Uint8Array(Math.max(0, data | 0));
          if (!data) return null;
          var view = null;
          if (ArrayBuffer.isView(data)) {
            view = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
            if (typeof srcOffset === "number" && srcOffset > 0) {
              var elementSize = data.BYTES_PER_ELEMENT || 1;
              var start = Math.min(view.length, Math.max(0, srcOffset) * elementSize);
              var end = typeof length === "number" && length >= 0
                ? Math.min(view.length, start + length * elementSize)
                : view.length;
              view = view.subarray(start, end);
            }
          } else if (data instanceof ArrayBuffer) {
            view = new Uint8Array(data);
          }
          return view ? new Uint8Array(view) : null;
        }

        function shadowBoundElementBuffer(data, srcOffset, length) {
          if (!boundElementArrayBuffer) return;
          var bytes = copyBufferBytes(data, srcOffset, length);
          if (bytes) bufferInfo.set(boundElementArrayBuffer, { bytes: bytes });
        }

        function shadowBoundElementSubData(dstByteOffset, data, srcOffset, length) {
          if (!boundElementArrayBuffer) return;
          var sourceBytes = copyBufferBytes(data, srcOffset, length);
          if (!sourceBytes) return;
          dstByteOffset = Math.max(0, Number(dstByteOffset) || 0);
          var existing = bufferInfo.get(boundElementArrayBuffer);
          var current = existing && existing.bytes ? existing.bytes : null;
          var nextLength = Math.max(current ? current.length : 0, dstByteOffset + sourceBytes.length);
          var next = new Uint8Array(nextLength);
          if (current) next.set(current.subarray(0, Math.min(current.length, next.length)));
          next.set(sourceBytes, dstByteOffset);
          bufferInfo.set(boundElementArrayBuffer, { bytes: next });
        }

        function getElementIndexRange(gl, type, offset, count) {
          if (!boundElementArrayBuffer || count <= 0) return null;
          var info = bufferInfo.get(boundElementArrayBuffer);
          var bytes = info && info.bytes;
          if (!bytes) return null;
          var bytesPerIndex = type === gl.UNSIGNED_BYTE ? 1 :
            type === gl.UNSIGNED_SHORT ? 2 :
            type === gl.UNSIGNED_INT ? 4 : 0;
          offset = Math.max(0, Number(offset) || 0);
          if (!bytesPerIndex || offset + count * bytesPerIndex > bytes.length) return null;
          var first = Infinity;
          var last = 0;
          for (var i = 0; i < count; i++) {
            var at = offset + i * bytesPerIndex;
            var value;
            if (bytesPerIndex === 1) {
              value = bytes[at];
            } else if (bytesPerIndex === 2) {
              value = bytes[at] | (bytes[at + 1] << 8);
            } else {
              value = (bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16)) + bytes[at + 3] * 16777216;
            }
            if (value < first) first = value;
            if (value + 1 > last) last = value + 1;
          }
          return isFinite(first) ? { first: first, last: last } : null;
        }

        function hasClientPointerAttribs(gl) {
          for (var index = 0; index < Math.max(attribPointerInfo.length, maxVertexAttribs); index++) {
            var pointer = attribPointerInfo[index];
            if (!pointer) continue;
            var enabled = pointer.enabled;
            if (getVertexAttrib) {
              try {
                enabled = !!getVertexAttrib.call(gl, index, gl.VERTEX_ATTRIB_ARRAY_ENABLED);
              } catch (error) {
              }
            }
            if (enabled && pointer.clientPointer) return true;
          }
          return false;
        }

        function drainWebGLErrors(gl) {
          if (!getError) return 0;
          var drained = 0;
          try {
            while (drained < 16 && getError.call(gl) !== gl.NO_ERROR) drained++;
          } catch (error) {
          }
          return drained;
        }

        function recordEmergencyShaderFallback(reason) {
          if (!window.__openmwEmergencyShaderFallback) {
            window.__openmwEmergencyShaderFallback = { applied: 0, failed: 0, lastReason: "" };
          }
          window.__openmwEmergencyShaderFallback.applied++;
          window.__openmwEmergencyShaderFallback.lastReason = reason;
        }

        function buildEmergencyVertexShader(source) {
          if (/\battribute\s+vec4\s+a_position\b/.test(source)) {
            return [
              "precision highp float;",
              "attribute vec4 a_position;",
              "attribute vec4 a_color;",
              "uniform mat4 u_modelView;",
              "uniform mat4 u_projection;",
              "varying vec4 v_color;",
              "void main(void)",
              "{",
              "  gl_Position = u_projection * u_modelView * a_position;",
              "  v_color = a_color;",
              "}"
            ].join("\n");
          }
          if (/\battribute\s+vec4\s+osg_Vertex\b/.test(source)) {
            return [
              "precision highp float;",
              "attribute vec4 osg_Vertex;",
              "attribute vec4 osg_Color;",
              "uniform mat4 osg_ModelViewMatrix;",
              "uniform mat4 osg_ProjectionMatrix;",
              "varying vec4 passColor;",
              "void main(void)",
              "{",
              "  gl_Position = osg_ProjectionMatrix * osg_ModelViewMatrix * osg_Vertex;",
              "  passColor = osg_Color;",
              "}"
            ].join("\n");
          }
          return null;
        }

        function buildEmergencyFragmentShader(source) {
          if (/\bvarying\s+vec4\s+v_color\b/.test(source)) {
            return [
              "precision mediump float;",
              "varying vec4 v_color;",
              "void main(void)",
              "{",
              "  vec3 lit = max(v_color.rgb, vec3(0.16, 0.14, 0.12));",
              "  gl_FragColor = vec4(lit, max(v_color.a, 1.0));",
              "}"
            ].join("\n");
          }
          if (/\bvarying\s+vec4\s+passColor\b/.test(source)) {
            return [
              "precision mediump float;",
              "varying vec4 passColor;",
              "void main(void)",
              "{",
              "  vec3 sky = max(passColor.rgb, vec3(0.38, 0.46, 0.52));",
              "  gl_FragColor = vec4(sky, 1.0);",
              "}"
            ].join("\n");
          }
          return [
            "precision mediump float;",
            "void main(void)",
            "{",
            "  gl_FragColor = vec4(0.50, 0.45, 0.36, 1.0);",
            "}"
          ].join("\n");
        }

        function buildEmergencyShaderSource(gl, info) {
          if (!info || !info.source) return null;
          if (info.type === gl.VERTEX_SHADER) return buildEmergencyVertexShader(info.source);
          if (info.type === gl.FRAGMENT_SHADER) return buildEmergencyFragmentShader(info.source);
          return null;
        }

        function compileSourceOnFreshContext(type, source) {
          if (compileDiagnosticCount >= 8) return null;
          compileDiagnosticCount++;
          try {
            var testCanvas = document.createElement("canvas");
            var testGl = testCanvas.getContext("webgl2") || testCanvas.getContext("webgl");
            if (!testGl) return { ok: false, log: "fresh WebGL context unavailable" };
            var testShader = testGl.createShader(type);
            testGl.shaderSource(testShader, source);
            testGl.compileShader(testShader);
            return {
              ok: !!testGl.getShaderParameter(testShader, testGl.COMPILE_STATUS),
              log: testGl.getShaderInfoLog(testShader) || "",
              error: testGl.getError()
            };
          } catch (error) {
            return { ok: false, log: String(error) };
          }
        }

        function compileSourceOnSameContext(gl, type, source) {
          try {
            var testShader = createShader.call(gl, type);
            shaderSource.call(gl, testShader, source);
            compileShader.call(gl, testShader);
            return {
              ok: !!getShaderParameter.call(gl, testShader, gl.COMPILE_STATUS),
              log: getShaderInfoLog.call(gl, testShader) || "",
              error: getError ? getError.call(gl) : 0
            };
          } catch (error) {
            return { ok: false, log: String(error) };
          }
        }

        function uploadClientAttribsForDraw(gl, first, count, indexType, indexOffset) {
          if (!createBuffer || !bindBuffer || !bufferData || !vertexAttribPointer || count <= 0) return true;
          if (!hasClientPointerAttribs(gl)) return true;
          var heap = getWasmHeapU8();
          if (!heap) {
            noteClientArraySkip("wasm heap unavailable");
            return false;
          }

          var indexRange = indexType ? getElementIndexRange(gl, indexType, indexOffset, count) : null;
          if (indexType && !indexRange && boundElementArrayBuffer) {
            noteClientArraySkip("element index range unavailable");
            return false;
          }
          var highestVertex = indexRange ? indexRange.last : Math.max(0, (first || 0) + count);
          var previousArrayBuffer = boundArrayBuffer;
          var uploadedAny = false;
          if (getParameter) {
            try {
              maxVertexAttribs = getParameter.call(gl, gl.MAX_VERTEX_ATTRIBS) || maxVertexAttribs;
            } catch (error) {
            }
          }

          for (var index = 0; index < Math.max(attribPointerInfo.length, maxVertexAttribs); index++) {
            var pointer = attribPointerInfo[index];
            var enabled = pointer && pointer.enabled;
            var bufferBinding = pointer ? pointer.bound : null;
            if (getVertexAttrib) {
              try {
                enabled = !!getVertexAttrib.call(gl, index, gl.VERTEX_ATTRIB_ARRAY_ENABLED);
                bufferBinding = getVertexAttrib.call(gl, index, gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING);
                if (pointer) pointer.enabled = enabled;
              } catch (error) {
              }
            }
            if (!enabled) continue;
            if (!pointer) {
              pointer = attribPointerInfo[index] = {
                bound: bufferBinding,
                clientPointer: false,
                size: 4,
                type: gl.FLOAT,
                normalized: false,
                stride: 0,
                offset: 0
              };
            }
            if (!pointer.clientPointer && bufferBinding) continue;
            var typeSize = getAttribTypeByteSize(gl, pointer.type);
            if (!typeSize || !pointer.size) {
              noteClientArraySkip("unsupported client attribute type");
              continue;
            }

            var vertexSize = pointer.size * typeSize;
            var stride = pointer.stride || vertexSize;
            var byteLength = highestVertex > 0 ? (highestVertex - 1) * stride + vertexSize : 0;
            var byteOffset = Math.max(0, Number(pointer.offset) || 0);
            if (byteLength <= 0 || byteOffset >= heap.length) {
              noteClientArraySkip("client attribute outside wasm heap");
              continue;
            }

            byteLength = Math.min(byteLength, heap.length - byteOffset, 8 * 1024 * 1024);
            if (!pointer.clientBuffer) pointer.clientBuffer = createBuffer.call(gl);
            bindBuffer.call(gl, gl.ARRAY_BUFFER, pointer.clientBuffer);
            if (pointer.clientPointer) {
              bufferData.call(gl, gl.ARRAY_BUFFER, heap.subarray(byteOffset, byteOffset + byteLength), gl.STREAM_DRAW);
            } else {
              bufferData.call(gl, gl.ARRAY_BUFFER, new Uint8Array(byteLength), gl.STREAM_DRAW);
            }
            vertexAttribPointer.call(gl, index, pointer.size, pointer.type, pointer.normalized, pointer.stride, 0);
            pointer.bound = pointer.clientBuffer;
            uploadedAny = true;

            var stats = window.__openmwClientArrayFix;
            if (stats) {
              stats.uploads++;
              stats.bytes += byteLength;
              stats.lastReason = "uploaded client attribute " + index;
            }
          }

          if (uploadedAny) bindBuffer.call(gl, gl.ARRAY_BUFFER, previousArrayBuffer);
          return true;
        }

        function noteNoProgramDrawSkip(kind, mode, count, reason) {
          var stats = window.__openmwNoProgramDraws;
          if (!stats) return;
          stats.skipped++;
          stats.last = {
            kind: kind,
            mode: mode,
            count: count,
            reason: reason,
            time: Date.now()
          };
        }

        function getActualCurrentProgram(gl) {
          if (!getParameter || !gl || !gl.CURRENT_PROGRAM) return currentProgram || null;
          try {
            return getParameter.call(gl, gl.CURRENT_PROGRAM) || null;
          } catch (error) {
            return currentProgram || null;
          }
        }

        function shouldSkipDrawForInvalidProgram(gl, kind, mode, count) {
          if (currentProgramInvalid) {
            noteNoProgramDrawSkip(kind, mode, count, "invalid linked program");
            return true;
          }
          var actualProgram = getActualCurrentProgram(gl);
          if (!currentProgram && !actualProgram) {
            noteNoProgramDrawSkip(kind, mode, count, "no current program");
            return true;
          }
          if (!actualProgram) {
            noteNoProgramDrawSkip(kind, mode, count, "browser current program missing");
            return true;
          }
          var info = programInfo.get(currentProgram);
          if (info && info.linked === false) {
            noteNoProgramDrawSkip(kind, mode, count, "unlinked program");
            return true;
          }
          return false;
        }

        if (getSupportedExtensions) {
          proto.getSupportedExtensions = function() {
            var extensions = getSupportedExtensions.call(this) || [];
            if (browserDisableParallelShaderCompile) {
              extensions = extensions.filter(function(extension) {
                return extension !== "KHR_parallel_shader_compile";
              });
            }
            if (browserUboExtensionPatch && extensions.indexOf("GL_ARB_uniform_buffer_object") === -1) {
              extensions = extensions.concat(["GL_ARB_uniform_buffer_object"]);
            }
            return extensions;
          };
        }

        if (getExtension) {
          proto.getExtension = function(name) {
            if (browserDisableParallelShaderCompile && name === "KHR_parallel_shader_compile") return null;
            if (browserUboExtensionPatch && name === "GL_ARB_uniform_buffer_object") return {};
            return getExtension.call(this, name);
          };
        }

        function normalizeTrackedTextureFormat(gl, internalFormat, format, type) {
          if (!gl || type !== gl.UNSIGNED_BYTE) {
            return { internalFormat: internalFormat, format: format };
          }
          if (format === GL_BGR || internalFormat === GL_BGR) {
            return { internalFormat: gl.RGB, format: gl.RGB };
          }
          if (format === GL_BGRA || internalFormat === GL_BGRA ||
              format === GL_ALPHA || internalFormat === GL_ALPHA ||
              format === GL_LUMINANCE || internalFormat === GL_LUMINANCE ||
              internalFormat === GL_LUMINANCE8 ||
              format === GL_LUMINANCE_ALPHA || internalFormat === GL_LUMINANCE_ALPHA ||
              internalFormat === GL_LUMINANCE8_ALPHA8) {
            return { internalFormat: gl.RGBA, format: gl.RGBA };
          }
          return { internalFormat: internalFormat, format: format };
        }

        function rememberTexture(gl, width, height, internalFormat, format, type, pixels, srcOffset) {
          var texture = getBoundTexture2D();
          if (texture) {
            var previousInfo = textureInfo.get(texture) || {};
            var trackedFormat = normalizeTrackedTextureFormat(gl, internalFormat, format, type);
            textureInfo.set(texture, {
              width: width,
              height: height,
              sourceInternalFormat: internalFormat,
              sourceFormat: format,
              internalFormat: trackedFormat.internalFormat,
              format: trackedFormat.format,
              type: type,
              parameters: previousInfo.parameters || {},
              browserTerrainBlendMask: !!previousInfo.browserTerrainBlendMask,
              isLikelyWater: (browserWaterFallback || browserWaterDrawFixEnabled() || browserWaterStateFixEnabled()) &&
                isLikelyWaterTexture(gl, width, height, format, type, pixels, srcOffset || 0)
            });
          }
        }

        function rememberTextureParameter(gl, target, pname, param) {
          if (!gl || textureParameterTarget(gl, target) !== gl.TEXTURE_2D) return;
          var texture = getBoundTexture2D();
          var info = texture ? textureInfo.get(texture) : null;
          if (!info) return;
          var parameters = info.parameters || {};
          parameters[pname] = param;
          info.parameters = parameters;
          textureInfo.set(texture, info);
        }

        function isPowerOfTwoTextureSize(value) {
          value = Number(value) || 0;
          return value > 0 && (value & (value - 1)) === 0;
        }

        function markTextureMipmapGenerated(gl, target) {
          if (!gl || textureParameterTarget(gl, target) !== gl.TEXTURE_2D) return;
          var texture = getBoundTexture2D();
          var info = texture ? textureInfo.get(texture) : null;
          if (!info) return;
          info.generatedMipmap = true;
          textureInfo.set(texture, info);
        }

        function isLikelyTerrainBlendMaskInfo(gl, info) {
          if (!gl || !info) return false;
          if (!(info.width >= 4 && info.height >= 4 &&
              info.width <= 64 && info.height <= 64 &&
              info.format === gl.RGBA &&
              info.type === gl.UNSIGNED_BYTE)) {
            return false;
          }
          if (info.sourceFormat === GL_ALPHA || info.sourceInternalFormat === GL_ALPHA) return true;
          return info.width === 10 && info.height === 10 &&
            (info.sourceFormat === gl.RGBA || info.sourceInternalFormat === gl.RGBA ||
              info.sourceFormat == null || info.sourceInternalFormat == null);
        }

        function applyTerrainBlendMaskSampling(gl, target) {
          if (!gl || !texParameteri || target !== gl.TEXTURE_2D) return;
          var texture = getBoundTexture2D();
          var info = texture ? textureInfo.get(texture) : null;
          if (!isLikelyTerrainBlendMaskInfo(gl, info) || info.browserTerrainBlendMask) return;
          try {
            texParameteri.call(gl, target, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            texParameteri.call(gl, target, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            texParameteri.call(gl, target, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            texParameteri.call(gl, target, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            info.parameters = info.parameters || {};
            info.parameters[GL_TEXTURE_WRAP_S] = gl.CLAMP_TO_EDGE;
            info.parameters[GL_TEXTURE_WRAP_T] = gl.CLAMP_TO_EDGE;
            info.parameters[GL_TEXTURE_MIN_FILTER] = gl.LINEAR;
            info.parameters[GL_TEXTURE_MAG_FILTER] = gl.LINEAR;
            info.browserTerrainBlendMask = true;
            textureInfo.set(texture, info);
          } catch (error) {
          }
        }

        function applyTerrainBlendMaskSamplingToUnit(gl, unit) {
          if (!gl || !activeTexture || !bindTexture || !texParameteri) return;
          var texture = boundTexture2DByUnit[unit] || null;
          var info = texture ? textureInfo.get(texture) : null;
          if (!isLikelyTerrainBlendMaskInfo(gl, info) || info.browserTerrainBlendMask) return;
          var previousActiveUnit = activeTextureUnit;
          try {
            activeTextureUnit = unit;
            activeTexture.call(gl, gl.TEXTURE0 + unit);
            bindTexture.call(gl, gl.TEXTURE_2D, texture);
            boundTexture2DByUnit[unit] = texture;
            applyTerrainBlendMaskSampling(gl, gl.TEXTURE_2D);
          } finally {
            activeTextureUnit = previousActiveUnit;
            activeTexture.call(gl, gl.TEXTURE0 + previousActiveUnit);
          }
        }

        function isMipmappableTextureInfo(gl, info) {
          if (!gl || !info || info.type === 0) return false;
          if (!isPowerOfTwoTextureSize(info.width) || !isPowerOfTwoTextureSize(info.height)) return false;
          if (info.format === GL_DEPTH_COMPONENT ||
              info.internalFormat === GL_DEPTH_COMPONENT ||
              info.internalFormat === GL_DEPTH_COMPONENT16) {
            return false;
          }
          if (info.internalFormat !== gl.RGB && info.internalFormat !== gl.RGBA) return false;
          if (info.format !== gl.RGB && info.format !== gl.RGBA) return false;
          return info.type === gl.UNSIGNED_BYTE ||
            info.type === gl.UNSIGNED_SHORT_5_6_5 ||
            info.type === gl.UNSIGNED_SHORT_4_4_4_4 ||
            info.type === gl.UNSIGNED_SHORT_5_5_5_1;
        }

        function maybeGenerateTextureMipmap(gl, target) {
          if (!gl || !generateMipmap || textureParameterTarget(gl, target) !== gl.TEXTURE_2D) return;
          var texture = getBoundTexture2D();
          var info = texture ? textureInfo.get(texture) : null;
          if (!info || info.generatedMipmap || !isMipmappableTextureInfo(gl, info)) return;
          try {
            generateMipmap.call(gl, gl.TEXTURE_2D);
            info.generatedMipmap = true;
            textureInfo.set(texture, info);
          } catch (error) {
          }
        }

        function getProgramInfo(program) {
          var info = programInfo.get(program);
          if (!info) {
            info = {
              shaders: [],
              uniforms: {},
              uniformNames: {},
              attribLocations: {},
              activeAttribs: [],
              isSky: false,
              hasBrowserWorldFog: false,
              browserFogUniforms: null,
              hasBrowserMaterialWater: false,
              browserWaterUniforms: null,
              hasSimpleWaterShader: false,
              hasSimpleWaterVertexShader: false,
              hasSimpleWaterFragmentShader: false,
              hasBrowserWaterUvShader: false,
              hasBrowserWaterUvVertexShader: false,
              hasBrowserWaterUvFragmentShader: false,
              hasPackagedBrowserWaterShader: false,
              browserWaterUvUniforms: null,
              hasClassicTwoTextureShader: false,
              hasClassicWaterBypass: false,
              hasBrowserTerrainBlendShader: false,
              hasBrowserTerrainAlphaShader: false,
              browserClassicWaterSurfaceUniform: undefined,
              diffuseTextureUnit: 0,
              blendTextureUnit: 1,
              debugId: 0
            };
            programInfo.set(program, info);
          }
          return info;
        }

        function isSkyShaderSource(source) {
          return isOpenMwSkyShaderSource(source);
        }

        function getOpenMwFogState() {
          var emulation = window.GLEmulation || (typeof GLEmulation !== "undefined" ? GLEmulation : null);
          var enabled = !!(emulation && emulation.fogEnabled);
          var start = Number(emulation && emulation.fogStart);
          var end = Number(emulation && emulation.fogEnd);
          var fallbackFogColor = browserClassicFogColor.slice();
          var fallbackFogStart = browserClassicFogStart;
          var fallbackFogEnd = browserClassicFogEnd;
          try {
            if (typeof browserTerrainProfile !== "undefined" && browserTerrainProfile && !browserClassicFogPatch) {
              fallbackFogStart = Number(browserTerrainProfile.fogStart) || fallbackFogStart;
              fallbackFogEnd = Number(browserTerrainProfile.fogEnd) || fallbackFogEnd;
            }
          } catch (error) {
          }
          if (!isFinite(start)) start = 0;
          var invalidFogRange = !isFinite(end) || end <= start || (end - start) < 256;
          var color = fallbackFogColor.slice();
          var invalidFogColor = false;
          if (emulation && emulation.fogColor && emulation.fogColor.length >= 3) {
            color = [
              Number(emulation.fogColor[0]) || 0,
              Number(emulation.fogColor[1]) || 0,
              Number(emulation.fogColor[2]) || 0,
              emulation.fogColor.length >= 4 ? Number(emulation.fogColor[3]) || 1 : 1
            ];
          }
          invalidFogColor = color[0] + color[1] + color[2] < 0.03 || color[3] <= 0;
          if (browserClassicFogPatch) {
            start = browserClassicFogStart;
            end = browserClassicFogEnd;
            color = browserClassicFogColor.slice();
            enabled = true;
          } else {
            if (invalidFogRange) {
              start = fallbackFogStart;
              end = Math.max(fallbackFogEnd, start + 1024);
              enabled = true;
            }
            if (invalidFogColor) color = fallbackFogColor.slice();
          }
          if (emulation && (browserClassicFogPatch || invalidFogRange || invalidFogColor)) {
            emulation.fogStart = start;
            emulation.fogEnd = end;
            emulation.fogDensity = 0;
            emulation.fogColor = new Float32Array(color);
            emulation.fogEnabled = !!enabled;
            if ("fogMode" in emulation) emulation.fogMode = 9729;
          }
          return {
            enabled: enabled ? 1 : 0,
            start: start,
            end: end,
            scale: 1 / Math.max(end - start, 1),
            color: color,
            classic: browserClassicFogPatch ? 1 : 0
          };
        }

        function applyBrowserFogUniforms(gl) {
          if (!currentProgram) return;
          var info = programInfo.get(currentProgram);
          if (!info || !info.hasBrowserWorldFog || !info.browserFogUniforms) return;
          var uniforms = info.browserFogUniforms;
          var fog = getOpenMwFogState();
          if (!renderingToDefaultFramebuffer()) {
            fog = {
              enabled: 0,
              start: fog.start,
              end: fog.end,
              scale: fog.scale,
              color: fog.color
            };
            if (window.__openmwWorldFogPatch) window.__openmwWorldFogPatch.offscreenSkips++;
          }
          var last = info.browserFogLast;
          if (last &&
              last.enabled === fog.enabled &&
              Math.abs(last.start - fog.start) < 0.01 &&
              Math.abs(last.end - fog.end) < 0.01 &&
              Math.abs(last.scale - fog.scale) < 0.0000001 &&
              last.color &&
              Math.abs(last.color[0] - fog.color[0]) < 0.001 &&
              Math.abs(last.color[1] - fog.color[1]) < 0.001 &&
              Math.abs(last.color[2] - fog.color[2]) < 0.001 &&
              Math.abs(last.color[3] - fog.color[3]) < 0.001) {
            if (window.__openmwWorldFogPatch) window.__openmwWorldFogPatch.uniformSkips++;
            return;
          }
          if (uniforms.color) uniform4fv.call(gl, uniforms.color, fog.color);
          if (uniforms.end) uniform1f.call(gl, uniforms.end, fog.end);
          if (uniforms.scale) uniform1f.call(gl, uniforms.scale, fog.scale);
          if (uniforms.enabled) uniform1f.call(gl, uniforms.enabled, fog.enabled);
          info.browserFogLast = {
            enabled: fog.enabled,
            start: fog.start,
            end: fog.end,
            scale: fog.scale,
            color: fog.color.slice ? fog.color.slice(0, 4) : Array.prototype.slice.call(fog.color || [0, 0, 0, 1], 0, 4)
          };
          if (window.__openmwWorldFogPatch) {
            window.__openmwWorldFogPatch.uniformUploads++;
            window.__openmwWorldFogPatch.lastProgram = {
              debugId: info.debugId || 0,
              enabled: fog.enabled,
              start: fog.start,
              end: fog.end
            };
          }
        }

        var browserDefaultMaterialAmbient = new Float32Array([0.32, 0.30, 0.26, 1]);
        var browserDefaultMaterialDiffuse = new Float32Array([1, 1, 1, 1]);
        var browserDefaultMaterialSpecular = new Float32Array([0, 0, 0, 1]);
        var browserDefaultMaterialEmission = new Float32Array([0.035, 0.032, 0.028, 1]);
        var browserDefaultLightModelAmbient = new Float32Array([0.42, 0.38, 0.32, 1]);
        var browserDefaultSceneColor = new Float32Array([0.18, 0.16, 0.13, 1]);

        function getOpenMwEmulationState() {
          try {
            if (window.GLEmulation) return window.GLEmulation;
          } catch (error) {
          }
          try {
            if (typeof GLEmulation !== "undefined") return GLEmulation;
          } catch (error) {
          }
          return null;
        }

        function vec4LooksEmpty(value) {
          return !value || value.length < 4 ||
            (Number(value[0] || 0) + Number(value[1] || 0) + Number(value[2] || 0) < 0.015);
        }

        function emulationVec4(value, fallback) {
          return value && value.length >= 4 && !vec4LooksEmpty(value) ? value : fallback;
        }

        function getBrowserLegacyUniforms(gl, info) {
          if (!getUniformLocation || !currentProgram || !info) return null;
          if (info.browserLegacyUniforms !== undefined) return info.browserLegacyUniforms;
          info.browserLegacyUniforms = {
            materialEmission: getUniformLocation.call(gl, currentProgram, "browserMaterialEmission"),
            materialAmbient: getUniformLocation.call(gl, currentProgram, "browserMaterialAmbient"),
            materialDiffuse: getUniformLocation.call(gl, currentProgram, "browserMaterialDiffuse"),
            materialSpecular: getUniformLocation.call(gl, currentProgram, "browserMaterialSpecular"),
            materialShininess: getUniformLocation.call(gl, currentProgram, "browserMaterialShininess"),
            lightModelAmbient: getUniformLocation.call(gl, currentProgram, "browserLightModelAmbient"),
            sceneColor: getUniformLocation.call(gl, currentProgram, "browserLightModelSceneColor"),
            fogStart: getUniformLocation.call(gl, currentProgram, "browserFogStart"),
            fogEnd: getUniformLocation.call(gl, currentProgram, "browserFogEnd"),
            fogScale: getUniformLocation.call(gl, currentProgram, "browserFogScale"),
            fogDensity: getUniformLocation.call(gl, currentProgram, "browserFogDensity"),
            fogColor: getUniformLocation.call(gl, currentProgram, "browserFogColor")
          };
          return info.browserLegacyUniforms;
        }

        function applyBrowserLegacyUniforms(gl) {
          if (!currentProgram || !getUniformLocation) return;
          try {
            if (typeof window.tes3mpApplyLegacyMaterialUniforms === "function") {
              window.tes3mpApplyLegacyMaterialUniforms();
            } else if (typeof tes3mpApplyLegacyMaterialUniforms === "function") {
              tes3mpApplyLegacyMaterialUniforms();
            }
          } catch (error) {
          }
          var info = programInfo.get(currentProgram);
          if (!info) return;
          var uniforms = getBrowserLegacyUniforms(gl, info);
          if (!uniforms) return;
          var emulation = getOpenMwEmulationState();
          var ambient = emulationVec4(emulation && emulation.materialAmbient, browserDefaultMaterialAmbient);
          var diffuse = emulationVec4(emulation && emulation.materialDiffuse, browserDefaultMaterialDiffuse);
          var specular = emulation && emulation.materialSpecular && emulation.materialSpecular.length >= 4
            ? emulation.materialSpecular
            : browserDefaultMaterialSpecular;
          var emission = emulation && emulation.materialEmission && emulation.materialEmission.length >= 4
            ? emulation.materialEmission
            : browserDefaultMaterialEmission;
          if ((!emulation || !emulation.lightingEnabled) && vec4LooksEmpty(emission)) {
            emission = browserDefaultMaterialEmission;
          }
          var lightAmbient = emulationVec4(emulation && emulation.lightModelAmbient, browserDefaultLightModelAmbient);
          if (uniforms.materialEmission) uniform4fv.call(gl, uniforms.materialEmission, emission);
          if (uniforms.materialAmbient) uniform4fv.call(gl, uniforms.materialAmbient, ambient);
          if (uniforms.materialDiffuse) uniform4fv.call(gl, uniforms.materialDiffuse, diffuse);
          if (uniforms.materialSpecular) uniform4fv.call(gl, uniforms.materialSpecular, specular);
          if (uniforms.materialShininess) {
            uniform1f.call(gl, uniforms.materialShininess,
              emulation && emulation.materialShininess ? Number(emulation.materialShininess[0]) || 0 : 0);
          }
          if (uniforms.lightModelAmbient) uniform4fv.call(gl, uniforms.lightModelAmbient, lightAmbient);
          if (uniforms.sceneColor) {
            browserDefaultSceneColor[0] = lightAmbient[0] * ambient[0] + emission[0];
            browserDefaultSceneColor[1] = lightAmbient[1] * ambient[1] + emission[1];
            browserDefaultSceneColor[2] = lightAmbient[2] * ambient[2] + emission[2];
            browserDefaultSceneColor[3] = 1;
            uniform4fv.call(gl, uniforms.sceneColor, browserDefaultSceneColor);
          }
          var fog = getOpenMwFogState();
          if (uniforms.fogStart) uniform1f.call(gl, uniforms.fogStart, fog.start);
          if (uniforms.fogEnd) uniform1f.call(gl, uniforms.fogEnd, fog.end);
          if (uniforms.fogScale) uniform1f.call(gl, uniforms.fogScale, fog.scale);
          if (uniforms.fogDensity) uniform1f.call(gl, uniforms.fogDensity, 0);
          if (uniforms.fogColor) uniform4fv.call(gl, uniforms.fogColor, fog.color);
        }

        function sampleTextureStats(gl, width, height, format, type, pixels, srcOffset) {
          if (!pixels || type !== gl.UNSIGNED_BYTE || width <= 0 || height <= 0) return null;
          var data = pixels && pixels.data && typeof pixels.data.length === "number" ? pixels.data : pixels;
          if (!data || typeof data.length !== "number") return null;
          var channels = 4;
          var redOffset = 0;
          var greenOffset = 1;
          var blueOffset = 2;
          var alphaOffset = 3;
          if (format === gl.RGB) {
            channels = 3;
            alphaOffset = -1;
          } else if (format === GL_BGR) {
            channels = 3;
            redOffset = 2;
            blueOffset = 0;
            alphaOffset = -1;
          } else if (format === GL_BGRA) {
            channels = 4;
            redOffset = 2;
            blueOffset = 0;
          } else if (format === GL_LUMINANCE || format === GL_ALPHA || format === GL_LUMINANCE_ALPHA) {
            return null;
          }
          var stride = Math.max(1, Math.floor(Math.sqrt((width * height) / 96)));
          var count = 0;
          var red = 0;
          var green = 0;
          var blue = 0;
          var alpha = 0;
          srcOffset = srcOffset || 0;
          for (var y = 0; y < height; y += stride) {
            for (var x = 0; x < width; x += stride) {
              var pixel = srcOffset + (y * width + x) * channels;
              if (pixel + channels > data.length) continue;
              red += data[pixel + redOffset];
              green += data[pixel + greenOffset];
              blue += data[pixel + blueOffset];
              alpha += alphaOffset >= 0 ? data[pixel + alphaOffset] : 255;
              count++;
            }
          }
          if (!count) return null;
          return {
            red: red / count,
            green: green / count,
            blue: blue / count,
            alpha: alpha / count
          };
        }

        function isLikelyWaterTexture(gl, width, height, format, type, pixels, srcOffset) {
          var stats = sampleTextureStats(gl, width, height, format, type, pixels, srcOffset);
          if (!stats) return false;
          var waterSized = (width === 128 && height === 128) || (width === 256 && height === 256);
          var blueGreen = stats.blue > stats.red * 1.18 &&
            stats.green > stats.red * 0.92 &&
            stats.blue > 38 &&
            stats.green > 34;
          var translucent = stats.alpha > 35 && stats.alpha < 245;
          return waterSized && blueGreen && (translucent || stats.blue > 65);
        }

        function getCurrentDiffuseTextureInfo() {
          if (!currentProgram) return false;
          var info = programInfo.get(currentProgram);
          if (!info) return false;
          var unit = typeof info.diffuseTextureUnit === "number" ? info.diffuseTextureUnit : 0;
          var texture = boundTexture2DByUnit[unit] || null;
          return texture ? textureInfo.get(texture) : null;
        }

        function currentProgramUsesLikelyWaterTexture() {
          var textureDetails = getCurrentDiffuseTextureInfo();
          return !!(textureDetails && textureDetails.isLikelyWater);
        }

        function applyBrowserWaterUniforms(gl) {
          if (!currentProgram) return;
          var info = programInfo.get(currentProgram);
          if (!info || !info.hasBrowserMaterialWater || !info.browserWaterUniforms) return;
          var uniforms = info.browserWaterUniforms;
          if (uniforms.surface) uniform1f.call(gl, uniforms.surface, currentProgramUsesLikelyWaterTexture() ? 1 : 0);
          if (uniforms.time) {
            var now = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
            uniform1f.call(gl, uniforms.time, now * 0.001);
          }
        }

        function recordWaterFixSkip(reason) {
          if (!window.__openmwWaterDrawFix) return;
          window.__openmwWaterDrawFix.skipped++;
          window.__openmwWaterDrawFix.lastReason = reason;
        }

        function getUniformMatrix(info, name) {
          var value = info && info.uniforms ? info.uniforms[name] : null;
          return value && value.length >= 16 ? value : null;
        }

        function getImmediateMatrix(index) {
          var immediate = window.GLImmediate || (typeof GLImmediate !== "undefined" ? GLImmediate : null);
          var value = immediate && immediate.matrix ? immediate.matrix[index] : null;
          return value && value.length >= 16 ? Array.prototype.slice.call(value, 0, 16) : null;
        }

        function getModelViewMatrix(info) {
          return getUniformMatrix(info, "osg_ModelViewMatrix") || getUniformMatrix(info, "u_modelView") ||
            getImmediateMatrix(0);
        }

        function getProjectionMatrix(info) {
          return getUniformMatrix(info, "osg_ProjectionMatrix") || getUniformMatrix(info, "u_projection") ||
            getImmediateMatrix(1);
        }

        function getProgramAttribLocation(gl, program, info, name) {
          if (info && Object.prototype.hasOwnProperty.call(info.attribLocations, name)) {
            return info.attribLocations[name];
          }
          if (!getAttribLocation) return -1;
          var location = getAttribLocation.call(gl, program, name);
          if (info) info.attribLocations[name] = location;
          return location;
        }

        function compileBrowserWaterShader(gl, type, source) {
          var shader = createShader.call(gl, type);
          shaderSource.call(gl, shader, source);
          compileShader.call(gl, shader);
          if (getShaderParameter && !getShaderParameter.call(gl, shader, gl.COMPILE_STATUS)) {
            recordGraphicsWarning(
              "browser water shader compile failed",
              getShaderInfoLog ? getShaderInfoLog.call(gl, shader) : "unknown shader compile failure",
              source.slice(0, 2500)
            );
            return null;
          }
          return shader;
        }

        function createBrowserWaterProgram(gl, sourceProgram, sourceInfo) {
          var cached = browserWaterPrograms.get(sourceProgram);
          if (cached !== undefined) return cached;
          if (!createProgram || !bindAttribLocation || !uniformMatrix4fv) {
            browserWaterPrograms.set(sourceProgram, null);
            return null;
          }

          var vertexAttrib = getProgramAttribLocation(gl, sourceProgram, sourceInfo, "osg_Vertex");
          if (vertexAttrib < 0) vertexAttrib = getProgramAttribLocation(gl, sourceProgram, sourceInfo, "a_position");
          var texCoordAttrib = getProgramAttribLocation(gl, sourceProgram, sourceInfo, "osg_MultiTexCoord0");
          if (texCoordAttrib < 0) texCoordAttrib = getProgramAttribLocation(gl, sourceProgram, sourceInfo, "a_texCoord0");
          if (vertexAttrib < 0 || texCoordAttrib < 0) {
            browserWaterPrograms.set(sourceProgram, null);
            recordWaterFixSkip("water attributes not available");
            return null;
          }

          var vertexSource = [
            "precision highp float;",
            "attribute vec4 a_browserPosition;",
            "attribute vec4 a_browserTexCoord;",
            "uniform mat4 u_browserModelView;",
            "uniform mat4 u_browserProjection;",
            "varying vec2 v_browserWaterUv;",
            "varying float v_browserWaterDepth;",
            "void main(void)",
            "{",
            "    vec4 viewPosition = u_browserModelView * a_browserPosition;",
            "    gl_Position = u_browserProjection * viewPosition;",
            "    v_browserWaterUv = a_browserTexCoord.xy;",
            "    v_browserWaterDepth = max(0.0, -viewPosition.z);",
            "}"
          ].join("\n");
          var fragmentSource = [
            "#ifdef GL_FRAGMENT_PRECISION_HIGH",
            "precision highp float;",
            "#else",
            "precision mediump float;",
            "#endif",
            "uniform sampler2D diffuseMap;",
            "uniform float u_browserWaterTime;",
            "uniform vec4 u_browserFogColor;",
            "uniform float u_browserFogEnd;",
            "uniform float u_browserFogScale;",
            "uniform float u_browserFogEnabled;",
            "varying vec2 v_browserWaterUv;",
            "varying float v_browserWaterDepth;",
            "void main(void)",
            "{",
            "    vec2 screenUv = gl_FragCoord.xy * 0.006;",
            "    vec2 uv0 = screenUv + v_browserWaterUv * 0.08 + vec2(u_browserWaterTime * 0.010, -u_browserWaterTime * 0.006);",
            "    vec2 uv1 = screenUv * 0.57 + v_browserWaterUv * 0.04 + vec2(-u_browserWaterTime * 0.004, u_browserWaterTime * 0.008);",
            "    vec4 surface0 = texture2D(diffuseMap, uv0);",
            "    vec4 surface1 = texture2D(diffuseMap, uv1);",
            "    float tone0 = dot(surface0.rgb, vec3(0.2126, 0.7152, 0.0722));",
            "    float tone1 = dot(surface1.rgb, vec3(0.2126, 0.7152, 0.0722));",
            "    float wave = clamp(tone0 * 0.72 + tone1 * 0.38, 0.0, 1.0);",
            "    float highlight = smoothstep(0.62, 0.98, wave);",
            "    vec3 deepWater = vec3(0.022, 0.090, 0.125);",
            "    vec3 shallowWater = vec3(0.105, 0.285, 0.325);",
            "    vec3 color = mix(deepWater, shallowWater, wave);",
            "    color += vec3(0.105, 0.160, 0.145) * highlight;",
            "    float fogVisibility = clamp((u_browserFogEnd - v_browserWaterDepth) * u_browserFogScale, 0.0, 1.0);",
            "    fogVisibility = mix(1.0, fogVisibility, clamp(u_browserFogEnabled, 0.0, 1.0));",
            "    color = mix(u_browserFogColor.rgb, color, fogVisibility);",
            "    gl_FragColor = vec4(color, 0.84);",
            "}"
          ].join("\n");

          var vertexShader = compileBrowserWaterShader(gl, gl.VERTEX_SHADER, vertexSource);
          var fragmentShader = compileBrowserWaterShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
          if (!vertexShader || !fragmentShader) {
            browserWaterPrograms.set(sourceProgram, null);
            return null;
          }

          var program = createProgram.call(gl);
          bindAttribLocation.call(gl, program, vertexAttrib, "a_browserPosition");
          bindAttribLocation.call(gl, program, texCoordAttrib, "a_browserTexCoord");
          attachShader.call(gl, program, vertexShader);
          attachShader.call(gl, program, fragmentShader);
          linkProgram.call(gl, program);
          if (getProgramParameter && !getProgramParameter.call(gl, program, gl.LINK_STATUS)) {
            recordGraphicsWarning(
              "browser water program link failed",
              getProgramInfoLog ? getProgramInfoLog.call(gl, program) : "unknown shader link failure"
            );
            browserWaterPrograms.set(sourceProgram, null);
            return null;
          }

          cached = {
            program: program,
            uniforms: {
              modelView: getUniformLocation.call(gl, program, "u_browserModelView"),
              projection: getUniformLocation.call(gl, program, "u_browserProjection"),
              diffuseMap: getUniformLocation.call(gl, program, "diffuseMap"),
              time: getUniformLocation.call(gl, program, "u_browserWaterTime"),
              fogColor: getUniformLocation.call(gl, program, "u_browserFogColor"),
              fogEnd: getUniformLocation.call(gl, program, "u_browserFogEnd"),
              fogScale: getUniformLocation.call(gl, program, "u_browserFogScale"),
              fogEnabled: getUniformLocation.call(gl, program, "u_browserFogEnabled")
            }
          };
          browserWaterPrograms.set(sourceProgram, cached);
          if (window.__openmwWaterDrawFix) window.__openmwWaterDrawFix.programs++;
          return cached;
        }

        function currentProgramUsesClassicWaterTexture() {
          var textureDetails = getCurrentDiffuseTextureInfo();
          return !!(textureDetails && textureDetails.isLikelyWater);
        }

        function currentProgramUsesWaterSizedTexture() {
          var textureDetails = getCurrentDiffuseTextureInfo();
          return !!(textureDetails &&
            ((textureDetails.width === 128 && textureDetails.height === 128) ||
              (textureDetails.width === 256 && textureDetails.height === 256)));
        }

        function recordWaterStateSkip(reason) {
          if (!window.__openmwWaterStateFix) return;
          window.__openmwWaterStateFix.skipped++;
          window.__openmwWaterStateFix.lastReason = reason;
        }

        function isClassicWaterGridDraw(gl, kind, mode, count) {
          if (!currentProgram || mode !== gl.TRIANGLES) return false;
          return count === 9600 || (kind === "arrays" && count === 6400);
        }

        function isClassicWaterCandidate(gl, kind, mode, count, reportSkip) {
          if (!isClassicWaterGridDraw(gl, kind, mode, count)) return false;
          var info = programInfo.get(currentProgram);
          if (!info) {
            if (reportSkip) reportSkip("water program not tracked");
            return false;
          }
          if (currentProgramUsesClassicWaterTexture() || currentProgramUsesWaterSizedTexture()) return true;
          if (!info.hasClassicTwoTextureShader && !info.uniformNames.u_texUnit1) {
            if (reportSkip) reportSkip("water shader not matched");
            return false;
          }
          if (reportSkip) reportSkip("water texture not matched");
          return false;
        }

        function getBrowserWaterWhiteTexture(gl) {
          if (browserWaterWhiteTexture) return browserWaterWhiteTexture;
          if (!gl.createTexture || !activeTexture || !bindTexture || !texImage2D || !texParameteri) return null;
          var previousActiveUnit = activeTextureUnit;
          var hadTexture1 = Object.prototype.hasOwnProperty.call(boundTexture2DByUnit, 1);
          var previousTexture1 = boundTexture2DByUnit[1] || null;
          var texture = gl.createTexture();
          if (!texture) return null;
          try {
            activeTextureUnit = 1;
            activeTexture.call(gl, gl.TEXTURE0 + 1);
            bindTexture.call(gl, gl.TEXTURE_2D, texture);
            boundTexture2DByUnit[1] = texture;
            texImage2D.call(gl, gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
              new Uint8Array([255, 255, 255, 255]));
            texParameteri.call(gl, gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            texParameteri.call(gl, gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            texParameteri.call(gl, gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            texParameteri.call(gl, gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            textureInfo.set(texture, {
              width: 1,
              height: 1,
              internalFormat: gl.RGBA,
              format: gl.RGBA,
              type: gl.UNSIGNED_BYTE,
              isLikelyWater: false,
              isBrowserWaterWhiteTexture: true
            });
            browserWaterWhiteTexture = texture;
          } finally {
            activeTextureUnit = 1;
            activeTexture.call(gl, gl.TEXTURE0 + 1);
            bindTexture.call(gl, gl.TEXTURE_2D, previousTexture1);
            if (hadTexture1) {
              boundTexture2DByUnit[1] = previousTexture1;
            } else {
              delete boundTexture2DByUnit[1];
            }
            activeTextureUnit = previousActiveUnit;
            activeTexture.call(gl, gl.TEXTURE0 + previousActiveUnit);
          }
          return browserWaterWhiteTexture;
        }

        function setClassicWaterSecondTextureUniform(gl, info) {
          if (!getUniformLocation || !uniform1i || !currentProgram || !info) return;
          if (info.browserWaterTexUnit1Location === undefined) {
            info.browserWaterTexUnit1Location = getUniformLocation.call(gl, currentProgram, "u_texUnit1") || null;
          }
          if (info.browserWaterTexUnit1Location) uniform1i.call(gl, info.browserWaterTexUnit1Location, 1);
        }

        function setClassicWaterSurfaceUniform(gl, info, value) {
          if (!getUniformLocation || !uniform1f || !currentProgram || !info) return;
          if (info.browserClassicWaterSurfaceUniform === undefined) {
            info.browserClassicWaterSurfaceUniform =
              getUniformLocation.call(gl, currentProgram, "u_browserClassicWaterSurface") || null;
          }
          if (info.browserClassicWaterSurfaceUniform) {
            uniform1f.call(gl, info.browserClassicWaterSurfaceUniform, value);
          }
        }

        function drawClassicWaterWithStateFix(gl, kind, mode, count, drawCall) {
          if (!browserWaterStateFixEnabled() ||
              !isClassicWaterCandidate(gl, kind, mode, count, recordWaterStateSkip)) {
            return false;
          }
          var info = programInfo.get(currentProgram);
          if (!info || !info.hasClassicWaterBypass) {
            if (window.__openmwWaterStateFix) {
              window.__openmwWaterStateFix.lastProgram = summarizeWaterProgram(info);
            }
            recordWaterStateSkip("classic water shader bypass not active");
            return false;
          }
          var whiteTexture = getBrowserWaterWhiteTexture(gl);
          if (!whiteTexture) {
            recordWaterStateSkip("white texture unavailable");
            return false;
          }

          var diffuseUnit = info && typeof info.diffuseTextureUnit === "number" ? info.diffuseTextureUnit : 0;
          var previousActiveUnit = activeTextureUnit;
          var hadTexture1 = Object.prototype.hasOwnProperty.call(boundTexture2DByUnit, 1);
          var previousTexture1 = boundTexture2DByUnit[1] || null;
          var previousTexture1Info = previousTexture1 ? textureInfo.get(previousTexture1) : null;
          var state = window.__openmwWaterStateFix;
          var oldDepthTest = gl.isEnabled ? gl.isEnabled(gl.DEPTH_TEST) : true;
          var oldDepthMask = gl.getParameter ? !!gl.getParameter(gl.DEPTH_WRITEMASK) : true;
          var oldDepthFunc = gl.getParameter ? gl.getParameter(gl.DEPTH_FUNC) : null;
          var oldBlend = gl.isEnabled ? gl.isEnabled(gl.BLEND) : true;
          var oldBlendSrcRgb = gl.getParameter ? gl.getParameter(gl.BLEND_SRC_RGB) : null;
          var oldBlendDstRgb = gl.getParameter ? gl.getParameter(gl.BLEND_DST_RGB) : null;
          var oldBlendSrcAlpha = gl.getParameter ? gl.getParameter(gl.BLEND_SRC_ALPHA) : null;
          var oldBlendDstAlpha = gl.getParameter ? gl.getParameter(gl.BLEND_DST_ALPHA) : null;
          var oldBlendEquationRgb = gl.getParameter ? gl.getParameter(gl.BLEND_EQUATION_RGB) : null;
          var oldBlendEquationAlpha = gl.getParameter ? gl.getParameter(gl.BLEND_EQUATION_ALPHA) : null;
          var depthBits = gl.getParameter ? Number(gl.getParameter(gl.DEPTH_BITS)) || 0 : 24;
          if (!depthBits) {
            recordWaterStateSkip("no depth buffer");
            return false;
          }

          if (state) {
            state.draws++;
            state.lastDraw = {
              kind: kind,
              count: count,
              diffuseUnit: diffuseUnit,
              depthBits: depthBits,
              depthTest: oldDepthTest,
              depthFunc: oldDepthFunc,
              depthMask: oldDepthMask,
              blend: oldBlend,
              shaderBypass: !!(info && info.hasClassicWaterBypass),
              forcedBlendEquation: !!blendEquationSeparate,
              texture1WasBound: !!previousTexture1,
              texture1: previousTexture1Info ? {
                width: previousTexture1Info.width,
                height: previousTexture1Info.height,
                format: previousTexture1Info.format,
                type: previousTexture1Info.type
              } : null
            };
          }

          try {
            activeTextureUnit = 1;
            activeTexture.call(gl, gl.TEXTURE0 + 1);
            bindTexture.call(gl, gl.TEXTURE_2D, whiteTexture);
            boundTexture2DByUnit[1] = whiteTexture;
            setClassicWaterSecondTextureUniform(gl, info);
            setClassicWaterSurfaceUniform(gl, info, 1);
            if (enable) enable.call(gl, gl.DEPTH_TEST);
            if (depthFunc) depthFunc.call(gl, gl.LEQUAL);
            if (depthMask) depthMask.call(gl, false);
            if (enable) enable.call(gl, gl.BLEND);
            if (blendEquationSeparate) blendEquationSeparate.call(gl, gl.FUNC_ADD, gl.FUNC_ADD);
            if (blendFunc) blendFunc.call(gl, gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            drawCall();
            if (state) {
              state.applied++;
              state.lastReason = "applied";
            }
          } finally {
            if (blendEquationSeparate && oldBlendEquationRgb !== null && oldBlendEquationAlpha !== null) {
              blendEquationSeparate.call(gl, oldBlendEquationRgb, oldBlendEquationAlpha);
            }
            if (blendFuncSeparate && oldBlendSrcRgb !== null && oldBlendDstRgb !== null &&
                oldBlendSrcAlpha !== null && oldBlendDstAlpha !== null) {
              blendFuncSeparate.call(gl, oldBlendSrcRgb, oldBlendDstRgb, oldBlendSrcAlpha, oldBlendDstAlpha);
            }
            if (!oldBlend && disable) disable.call(gl, gl.BLEND);
            if (depthFunc && oldDepthFunc !== null) depthFunc.call(gl, oldDepthFunc);
            if (depthMask) depthMask.call(gl, oldDepthMask);
            if (!oldDepthTest && disable) disable.call(gl, gl.DEPTH_TEST);
            activeTextureUnit = 1;
            activeTexture.call(gl, gl.TEXTURE0 + 1);
            bindTexture.call(gl, gl.TEXTURE_2D, previousTexture1);
            if (hadTexture1) {
              boundTexture2DByUnit[1] = previousTexture1;
            } else {
              delete boundTexture2DByUnit[1];
            }
            setClassicWaterSurfaceUniform(gl, info, 0);
            activeTextureUnit = previousActiveUnit;
            activeTexture.call(gl, gl.TEXTURE0 + previousActiveUnit);
          }
          return true;
        }

        function isClassicWaterDraw(gl, kind, mode, count) {
          if (!browserWaterDrawFixEnabled() || !isClassicWaterCandidate(gl, kind, mode, count, recordWaterFixSkip)) {
            return false;
          }
          var info = programInfo.get(currentProgram);
          if (!info) return false;
          if (!getModelViewMatrix(info) || !getProjectionMatrix(info)) {
            recordWaterFixSkip("water matrices not available");
            return false;
          }
          return true;
        }

        function drawBrowserWaterReplacement(gl, kind, mode, firstOrCount, type, offset) {
          var sourceProgram = currentProgram;
          var sourceInfo = programInfo.get(sourceProgram);
          if (!sourceInfo) return false;
          var modelView = getModelViewMatrix(sourceInfo);
          var projection = getProjectionMatrix(sourceInfo);
          if (!modelView || !projection) return false;
          var replacement = createBrowserWaterProgram(gl, sourceProgram, sourceInfo);
          if (!replacement) return false;
          if (!replacement.uniforms.modelView || !replacement.uniforms.projection) {
            recordWaterFixSkip("replacement water matrices optimized out");
            return false;
          }

          var fog = getOpenMwFogState();
          var diffuseUnit = typeof sourceInfo.diffuseTextureUnit === "number" ? sourceInfo.diffuseTextureUnit : 0;
          var oldBlend = gl.isEnabled ? gl.isEnabled(gl.BLEND) : true;
          var oldDepthMask = gl.getParameter ? gl.getParameter(gl.DEPTH_WRITEMASK) : true;
          var oldBlendSrcRgb = gl.getParameter ? gl.getParameter(gl.BLEND_SRC_RGB) : null;
          var oldBlendDstRgb = gl.getParameter ? gl.getParameter(gl.BLEND_DST_RGB) : null;
          var oldBlendSrcAlpha = gl.getParameter ? gl.getParameter(gl.BLEND_SRC_ALPHA) : null;
          var oldBlendDstAlpha = gl.getParameter ? gl.getParameter(gl.BLEND_DST_ALPHA) : null;
          var oldBlendEquationRgb = gl.getParameter ? gl.getParameter(gl.BLEND_EQUATION_RGB) : null;
          var oldBlendEquationAlpha = gl.getParameter ? gl.getParameter(gl.BLEND_EQUATION_ALPHA) : null;

          useProgram.call(gl, replacement.program);
          uniformMatrix4fv.call(gl, replacement.uniforms.modelView, false, modelView);
          uniformMatrix4fv.call(gl, replacement.uniforms.projection, false, projection);
          if (replacement.uniforms.diffuseMap) uniform1i.call(gl, replacement.uniforms.diffuseMap, diffuseUnit);
          if (replacement.uniforms.time) {
            var now = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
            uniform1f.call(gl, replacement.uniforms.time, now * 0.001);
          }
          if (replacement.uniforms.fogColor) uniform4fv.call(gl, replacement.uniforms.fogColor, fog.color);
          if (replacement.uniforms.fogEnd) uniform1f.call(gl, replacement.uniforms.fogEnd, fog.end);
          if (replacement.uniforms.fogScale) uniform1f.call(gl, replacement.uniforms.fogScale, fog.scale);
          if (replacement.uniforms.fogEnabled) uniform1f.call(gl, replacement.uniforms.fogEnabled, fog.enabled);

          if (gl.enable) gl.enable(gl.BLEND);
          if (gl.blendFunc) gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
          if (gl.depthMask) gl.depthMask(false);
          if (kind === "elements") {
            drawElements.call(gl, mode, firstOrCount, type, offset);
          } else {
            drawArrays.call(gl, mode, firstOrCount, type);
          }

          if (gl.blendEquationSeparate && oldBlendEquationRgb !== null && oldBlendEquationAlpha !== null) {
            gl.blendEquationSeparate(oldBlendEquationRgb, oldBlendEquationAlpha);
          }
          if (gl.blendFuncSeparate && oldBlendSrcRgb !== null && oldBlendDstRgb !== null &&
              oldBlendSrcAlpha !== null && oldBlendDstAlpha !== null) {
            gl.blendFuncSeparate(oldBlendSrcRgb, oldBlendDstRgb, oldBlendSrcAlpha, oldBlendDstAlpha);
          }
          if (!oldBlend && gl.disable) gl.disable(gl.BLEND);
          if (gl.depthMask) gl.depthMask(oldDepthMask);
          useProgram.call(gl, sourceProgram);
          if (window.__openmwWaterDrawFix) {
            window.__openmwWaterDrawFix.draws++;
            window.__openmwWaterDrawFix.lastReason = "drawn";
            window.__openmwWaterDrawFix.lastDraw = { kind: kind, count: kind === "elements" ? firstOrCount : type };
            window.__openmwWaterDrawFix.lastModelView = modelView.slice(0, 16);
            window.__openmwWaterDrawFix.lastProjection = projection.slice(0, 16);
          }
          return true;
        }

        function cloneUniformValue(value) {
          if (value && typeof value.length === "number") return Array.prototype.slice.call(value, 0, Math.min(value.length, 16));
          return value;
        }

        function rememberUniform(location, value) {
          if (!location) return;
          var locationInfo = uniformInfo.get(location);
          if (!locationInfo) return;
          var info = getProgramInfo(locationInfo.program);
          info.uniformNames[locationInfo.name] = true;
          if (locationInfo.name === "diffuseMap" || locationInfo.name === "u_texUnit0") {
            info.diffuseTextureUnit = Number(value) || 0;
          }
          if (locationInfo.name === "blendMap") {
            info.blendTextureUnit = Number(value) || 0;
          }
          if (locationInfo.name === "browserBlendUvScaleOffset" ||
              locationInfo.name === "browserDiffuseUvScale") {
            info.uniforms[locationInfo.name] = cloneUniformValue(value);
          }
          if (browserWaterDrawFixEnabled() &&
              (locationInfo.name === "osg_ModelViewMatrix" || locationInfo.name === "osg_ProjectionMatrix" ||
                locationInfo.name === "u_modelView" || locationInfo.name === "u_projection")) {
            info.uniforms[locationInfo.name] = cloneUniformValue(value);
          }
          if (!skyProbe) return;
          info.uniforms[locationInfo.name] = cloneUniformValue(value);
          if (info.isSky && window.__openmwSkyProbe.uniformSets.length < 300) {
            window.__openmwSkyProbe.uniformSets.push({
              program: info.id || 0,
              name: locationInfo.name,
              value: cloneUniformValue(value)
            });
          }
        }

        function textureSummaryByUnit(unit) {
          var texture = boundTexture2DByUnit[unit] || null;
          var info = texture ? textureInfo.get(texture) : null;
          return info ? {
            width: info.width,
            height: info.height,
            sourceInternalFormat: info.sourceInternalFormat,
            sourceFormat: info.sourceFormat,
            format: info.format,
            type: info.type,
            terrainBlendMask: !!info.browserTerrainBlendMask,
            parameters: info.parameters ? {
              wrapS: info.parameters[GL_TEXTURE_WRAP_S],
              wrapT: info.parameters[GL_TEXTURE_WRAP_T],
              minFilter: info.parameters[GL_TEXTURE_MIN_FILTER],
              magFilter: info.parameters[GL_TEXTURE_MAG_FILTER]
            } : null
          } : null;
        }

        function isBrowserTerrainShaderSource(source) {
          return /\bbrowserDiffuseUvScale\b/.test(source || "") &&
            /\bdiffuseMapUV\b/.test(source || "") &&
            /\bpassWebglLight\b/.test(source || "");
        }

        function isBrowserTerrainProgram(info) {
          return !!(info && info.shaders && info.shaders.some(function(shader) {
            return isBrowserTerrainShaderSource(shader.source || "");
          }));
        }

        function getBrowserTextureMatrix(unit) {
          try {
            var immediate = window.GLImmediate || (typeof GLImmediate !== "undefined" ? GLImmediate : null);
            if (!immediate || !immediate.matrix) return null;
            return immediate.matrix[2 + unit] || null;
          } catch (error) {
            return null;
          }
        }

        function finiteOrFallback(value, fallback) {
          value = Number(value);
          return isFinite(value) ? value : fallback;
        }

        function textureMatrixScale(matrix, fallback) {
          if (!matrix || typeof matrix.length !== "number") return fallback;
          var sx = Math.abs(finiteOrFallback(matrix[0], fallback));
          var sy = Math.abs(finiteOrFallback(matrix[5], sx || fallback));
          var scale = sx || sy || fallback;
          return isFinite(scale) && scale > 0 ? scale : fallback;
        }

        function textureMatrixScaleOffset(matrix) {
          if (!matrix || typeof matrix.length !== "number") return [1, 1, 0, 0];
          var sx = finiteOrFallback(matrix[0], 1);
          var sy = finiteOrFallback(matrix[5], sx || 1);
          if (!sx) sx = 1;
          if (!sy) sy = sx;
          return [
            sx,
            sy,
            finiteOrFallback(matrix[12], 0),
            finiteOrFallback(matrix[13], 0)
          ];
        }

        function cloneQueriedUniformValue(value) {
          if (value && typeof value.length === "number") return Array.prototype.slice.call(value, 0, Math.min(value.length, 16));
          return value;
        }

        function terrainUniformValue(gl, program, name) {
          if (!getUniformLocation || !getUniform || !program) return null;
          try {
            var location = getUniformLocation.call(gl, program, name);
            if (!location) return null;
            return cloneQueriedUniformValue(getUniform.call(gl, program, location));
          } catch (error) {
            return "error:" + (error && error.message ? error.message : String(error));
          }
        }

        function applyBrowserTerrainUniforms(gl) {
          if (!currentProgram || !getUniformLocation) return;
          var info = programInfo.get(currentProgram);
          if (!isBrowserTerrainProgram(info)) return;
          var actualProgram = getActualCurrentProgram(gl) || currentProgram;
          var uniforms = info.browserTerrainUniforms;
          if (!uniforms || info.browserTerrainUniformsProgram !== actualProgram) {
            uniforms = info.browserTerrainUniforms = {
              diffuseMap: getUniformLocation.call(gl, actualProgram, "diffuseMap"),
              blendMap: getUniformLocation.call(gl, actualProgram, "blendMap"),
              diffuseUvScale: getUniformLocation.call(gl, actualProgram, "browserDiffuseUvScale"),
              blendUvScaleOffset: getUniformLocation.call(gl, actualProgram, "browserBlendUvScaleOffset")
            };
            info.browserTerrainUniformsProgram = actualProgram;
          }
          if (uniforms.diffuseMap && uniform1i) {
            uniform1i.call(gl, uniforms.diffuseMap, 0);
            info.uniforms.diffuseMap = 0;
            info.diffuseTextureUnit = 0;
          }
          if (info.hasBrowserTerrainBlendShader && uniforms.blendMap && uniform1i) {
            uniform1i.call(gl, uniforms.blendMap, 1);
            info.uniforms.blendMap = 1;
            info.blendTextureUnit = 1;
          }
          if (uniforms.diffuseUvScale && uniform1f) {
            var diffuseScale = textureMatrixScale(getBrowserTextureMatrix(0), 1);
            uniform1f.call(gl, uniforms.diffuseUvScale, diffuseScale);
            info.uniforms.browserDiffuseUvScale = diffuseScale;
          }
          if (info.hasBrowserTerrainBlendShader && uniforms.blendUvScaleOffset && uniform4f) {
            var blendScaleOffset = textureMatrixScaleOffset(getBrowserTextureMatrix(1));
            uniform4f.call(gl, uniforms.blendUvScaleOffset,
              blendScaleOffset[0], blendScaleOffset[1], blendScaleOffset[2], blendScaleOffset[3]);
            info.uniforms.browserBlendUvScaleOffset = blendScaleOffset;
          }
          if (terrainProbe) {
            info.queriedTerrainUniforms = {
              passive: true,
              diffuseMap: info.uniforms.diffuseMap,
              blendMap: info.uniforms.blendMap,
              browserDiffuseUvScale: info.uniforms.browserDiffuseUvScale,
              browserBlendUvScaleOffset: info.uniforms.browserBlendUvScaleOffset
            };
          }
        }

        function summarizeTerrainAttribPointers(info) {
          if (!info || !info.activeAttribs || !info.activeAttribs.length) return [];
          return info.activeAttribs.slice(0, 12).map(function(attrib) {
            var pointer = attribPointerInfo[attrib.location] || {};
            return {
              name: attrib.name,
              location: attrib.location,
              size: pointer.size || 0,
              type: pointer.type || 0,
              normalized: !!pointer.normalized,
              stride: pointer.stride || 0,
              offset: pointer.offset || 0,
              bound: !!pointer.bound,
              clientPointer: !!pointer.clientPointer
            };
          });
        }

        function recordTerrainBlendSample(gl, info, kind, mode, count) {
          var state = window.__openmwTerrainBlendFix;
          if (!terrainProbe || !state || !state.samples || state.samples.length >= 64) return;
          var diffuseUnit = typeof info.diffuseTextureUnit === "number" ? info.diffuseTextureUnit : 0;
          var blendUnit = typeof info.blendTextureUnit === "number" ? info.blendTextureUnit : 1;
          var sample = {
            program: info.debugId || 0,
            kind: kind,
            mode: mode,
            count: count,
            activeTextureUnit: activeTextureUnit,
            diffuseUnit: diffuseUnit,
            blendUnit: blendUnit,
            textures: [
              textureSummaryByUnit(0),
              textureSummaryByUnit(1),
              textureSummaryByUnit(2),
              textureSummaryByUnit(3)
            ],
            uniforms: Object.assign({}, info.uniforms),
            queriedUniforms: info.queriedTerrainUniforms || null,
            state: Object.assign({ passive: true }, cloneTrackedGlState()),
            attribs: summarizeTerrainAttribPointers(info)
          };
          state.samples.push(sample);
        }

        function shaderSnippetAround(source, token) {
          source = String(source || "");
          var index = source.lastIndexOf(token || "gl_FragColor");
          if (index < 0) index = Math.max(0, source.length - 900);
          var start = Math.max(0, index - 520);
          var end = Math.min(source.length, index + 520);
          return source.slice(start, end);
        }

        function recordClassicWaterShaderSource(rawSource, fixedSource) {
          var state = window.__openmwClassicWaterShaders;
          if (!state) return;
          var raw = String(rawSource || "");
          var fixed = String(fixedSource || "");
          if (!/\bu_texUnit0\b/.test(raw) && !/\btej_env/.test(raw) &&
              !/\bu_texUnit0\b/.test(fixed) && !/\btej_env/.test(fixed)) {
            return;
          }
          var sample = {
            rawHasTexUnit1: /\bu_texUnit1\b/.test(raw),
            rawHasTextureMatrix1: /\bu_textureMatrix1\b/.test(raw),
            rawHasTejEnv1: /\btej_env1/.test(raw),
            fixedHasBypass: /\bu_browserClassicWaterSurface\b/.test(fixed),
            rawTail: shaderSnippetAround(raw, "gl_FragColor"),
            fixedTail: shaderSnippetAround(fixed, "gl_FragColor")
          };
          state.seen++;
          state.last = sample;
          if (state.samples.length < 4) state.samples.push(sample);
        }

        function summarizeWaterProgram(info) {
          if (!info) return null;
          var vertex = null;
          var fragment = null;
          for (var i = 0; i < info.shaders.length; i++) {
            if (info.shaders[i].type === 0x8B31) vertex = info.shaders[i];
            if (info.shaders[i].type === 0x8B30) fragment = info.shaders[i];
          }
          return {
            hasClassicTwoTextureShader: !!info.hasClassicTwoTextureShader,
            hasClassicWaterBypass: !!info.hasClassicWaterBypass,
            hasBrowserWaterUvShader: !!info.hasBrowserWaterUvShader,
            hasBrowserWaterUvVertexShader: !!info.hasBrowserWaterUvVertexShader,
            hasBrowserWaterUvFragmentShader: !!info.hasBrowserWaterUvFragmentShader,
            hasPackagedBrowserWaterShader: !!info.hasPackagedBrowserWaterShader,
            hasSimpleWaterShader: !!info.hasSimpleWaterShader,
            uniforms: Object.keys(info.uniformNames || {}).slice(0, 24),
            vertexTail: vertex && vertex.source ? shaderSnippetAround(vertex.source, "waterUV") : null,
            fragmentTail: fragment && fragment.source ? shaderSnippetAround(fragment.source, "gl_FragColor") : null
          };
        }

        function recordSkyDraw(gl, kind, args) {
          if (!skyProbe || !currentProgram || window.__openmwSkyProbe.draws.length >= 300) return;
          var info = programInfo.get(currentProgram);
          if (!info || !info.isSky) return;
          var attribs = {};
          Object.keys(info.attribLocations).forEach(function(name) {
            var index = info.attribLocations[name];
            if (index < 0) return;
            var pointer = attribPointerInfo[index] || {};
            attribs[name] = {
              index: index,
              enabled: !!(gl.getVertexAttrib && gl.getVertexAttrib(index, gl.VERTEX_ATTRIB_ARRAY_ENABLED)),
              boundAtPointer: !!pointer.bound,
              pointerSize: pointer.size || 0,
              pointerType: pointer.type || 0,
              pointerStride: pointer.stride || 0,
              pointerOffset: pointer.offset || 0
            };
          });
          window.__openmwSkyProbe.draws.push({
            kind: kind,
            args: Array.prototype.slice.call(args),
            program: info.id || 0,
            uniforms: Object.assign({}, info.uniforms),
            attribs: attribs,
            activeTextureUnit: activeTextureUnit,
            textures: [
              textureSummaryByUnit(0),
              textureSummaryByUnit(1),
              textureSummaryByUnit(2),
              textureSummaryByUnit(3)
            ],
            arrayBufferBound: !!boundArrayBuffer,
            elementArrayBufferBound: !!boundElementArrayBuffer
          });
        }

        function recordShaderWaterDraw(kind, mode, count) {
          if (!window.__openmwShaderWater || !currentProgram || mode !== 0x0004) return;
          var info = programInfo.get(currentProgram);
          if (!info || (!info.hasSimpleWaterShader && !info.hasBrowserWaterUvShader)) return;
          window.__openmwShaderWater.draws++;
          if (info.hasBrowserWaterUvShader) window.__openmwShaderWater.waterUvDraws++;
            window.__openmwShaderWater.lastDraw = { kind: kind, mode: mode, count: count };
        }

        function drawBrowserTerrainBlendLayer(gl, kind, mode, count, drawCall) {
          if (!currentProgram || mode !== gl.TRIANGLES) return false;
          var info = programInfo.get(currentProgram);
          if (!browserTerrainBlendFix) return false;
          if (!info || !info.hasBrowserTerrainBlendShader) return false;
          var state = window.__openmwTerrainBlendFix;
          var previousState = cloneTrackedGlState();
          var firstLayer = previousState.depthFunc !== gl.EQUAL && previousState.blendDstRgb !== gl.ONE;
          var layerDepthFunc = firstLayer ? gl.LEQUAL : gl.EQUAL;
          var layerBlendDstRgb = firstLayer ? gl.ZERO : gl.ONE;
          var layerBlendDstAlpha = firstLayer ? gl.ZERO : gl.ONE;
          var blendUnit = typeof info.blendTextureUnit === "number" ? info.blendTextureUnit : 1;
          applyTerrainBlendMaskSamplingToUnit(gl, blendUnit);
          recordTerrainBlendSample(gl, info, kind, mode, count);
          setTrackedEnable(gl, gl.DEPTH_TEST, true);
          setTrackedDepthFunc(gl, layerDepthFunc);
          setTrackedDepthMask(gl, firstLayer ? true : previousState.depthMask);
          setTrackedEnable(gl, gl.BLEND, true);
          setTrackedBlendEquationSeparate(gl, gl.FUNC_ADD, gl.FUNC_ADD);
          setTrackedBlendFuncSeparate(gl, gl.SRC_ALPHA, layerBlendDstRgb, gl.ONE, layerBlendDstAlpha);
          try {
            drawCall();
          } finally {
            restoreTrackedGlState(gl, previousState);
          }
          if (state) {
            var drawInfo = {
              kind: kind,
              mode: mode,
              count: count,
              diffuseUnit: typeof info.diffuseTextureUnit === "number" ? info.diffuseTextureUnit : 0,
              blendUnit: blendUnit,
              firstLayer: firstLayer,
              previousDepthFunc: previousState.depthFunc,
              previousBlendDstRgb: previousState.blendDstRgb,
              previousDepthMask: previousState.depthMask,
              appliedDepthFunc: layerDepthFunc,
              appliedBlendDstRgb: layerBlendDstRgb,
              appliedBlendDstAlpha: layerBlendDstAlpha
            };
            state.draws++;
            if (firstLayer) state.firstLayerDraws = (state.firstLayerDraws || 0) + 1;
            else state.additiveLayerDraws = (state.additiveLayerDraws || 0) + 1;
            state.appliedStateCounts = state.appliedStateCounts || {};
            var appliedStateKey = "depth=" + layerDepthFunc + " dst=" + layerBlendDstRgb + "/" + layerBlendDstAlpha;
            state.appliedStateCounts[appliedStateKey] = (state.appliedStateCounts[appliedStateKey] || 0) + 1;
            if (firstLayer) state.lastFirstLayerDraw = drawInfo;
            else state.lastAdditiveLayerDraw = drawInfo;
            state.lastReason = "applied depth restore";
            state.lastDraw = drawInfo;
          }
          return true;
        }

        function getBrowserTerrainColorAttribPointer(info) {
          if (!info) return null;
          var location = typeof info.attribLocations.osg_Color === "number" ? info.attribLocations.osg_Color : -1;
          if (location < 0 && info.activeAttribs) {
            for (var i = 0; i < info.activeAttribs.length; i++) {
              if (info.activeAttribs[i].name === "osg_Color") {
                location = info.activeAttribs[i].location;
                break;
              }
            }
          }
          return location >= 0 ? attribPointerInfo[location] || null : null;
        }

        function isLikelyBrowserTerrainAlphaDraw(gl, info, kind, mode, count) {
          if (!info || !info.hasBrowserTerrainAlphaShader) return false;
          if (kind !== "elements" || mode !== gl.TRIANGLES || count < 96) return false;
          var unit = typeof info.diffuseTextureUnit === "number" ? info.diffuseTextureUnit : 0;
          var texture = textureSummaryByUnit(unit);
          if (!texture || texture.format !== gl.RGB || texture.type !== gl.UNSIGNED_BYTE) return false;
          var colorPointer = getBrowserTerrainColorAttribPointer(info);
          if (!colorPointer) return false;
          return colorPointer.type === gl.FLOAT || colorPointer.type === gl.UNSIGNED_BYTE;
        }

        function drawBrowserTerrainAlphaLayer(gl, kind, mode, count, drawCall) {
          return false;
          if (!currentProgram || mode !== gl.TRIANGLES) return false;
          var info = programInfo.get(currentProgram);
          if (!isLikelyBrowserTerrainAlphaDraw(gl, info, kind, mode, count)) return false;
          var state = window.__openmwTerrainBlendFix;
          if (enable) enable.call(gl, gl.BLEND);
          if (blendEquationSeparate) blendEquationSeparate.call(gl, gl.FUNC_ADD, gl.FUNC_ADD);
          if (blendFuncSeparate) {
            blendFuncSeparate.call(gl, gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
          } else if (blendFunc) {
            blendFunc.call(gl, gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
          }
          drawCall();
          if (state) {
            state.draws++;
            state.lastReason = "alpha terrain rgb";
            state.lastDraw = {
              kind: kind,
              mode: mode,
              count: count,
              diffuseUnit: typeof info.diffuseTextureUnit === "number" ? info.diffuseTextureUnit : 0
            };
          }
          return true;
        }

        function summarizeActiveAttribPointers(gl, info) {
          if (!info || !info.activeAttribs || !info.activeAttribs.length) return [];
          return info.activeAttribs.map(function(attrib) {
            var location = attrib.location;
            var pointer = location >= 0 ? attribPointerInfo[location] || {} : {};
            return {
              name: attrib.name,
              location: location,
              enabled: location >= 0 && gl.getVertexAttrib
                ? !!gl.getVertexAttrib(location, gl.VERTEX_ATTRIB_ARRAY_ENABLED)
                : !!pointer.enabled,
              pointerSize: pointer.size || 0,
              pointerType: pointer.type || 0,
              pointerStride: pointer.stride || 0,
              pointerOffset: pointer.offset || 0,
              pointerBufferTracked: !!pointer.bound
            };
          });
        }

        function drawShaderWaterWithBrowserState(gl, kind, mode, count, drawCall) {
          if (!currentProgram || mode !== gl.TRIANGLES) return false;
          var info = programInfo.get(currentProgram);
          if (!info || (!info.hasSimpleWaterShader && !info.hasBrowserWaterUvShader)) return false;
          if (info.hasPackagedBrowserWaterShader) {
            if (window.__openmwWaterStateFix) {
              window.__openmwWaterStateFix.applied++;
              window.__openmwWaterStateFix.lastReason = "rendered discarded packaged browser_water shader";
              window.__openmwWaterStateFix.lastProgram = summarizeWaterProgram(info);
            }
            return false;
          }
          if (info.hasBrowserWaterUvShader && !browserWaterUvFix) {
            if (window.__openmwShaderWater) {
              window.__openmwShaderWater.waterUvSkippedDraws++;
              window.__openmwShaderWater.lastDraw = {
                kind: kind,
                mode: mode,
                count: count,
                skipped: true,
                browserWaterUv: true,
                reason: "disabled generated browser_water shader"
              };
            }
            return true;
          }

          var oldDepthTest = gl.isEnabled ? gl.isEnabled(gl.DEPTH_TEST) : true;
          var oldDepthMask = gl.getParameter ? !!gl.getParameter(gl.DEPTH_WRITEMASK) : true;
          var oldDepthFunc = gl.getParameter ? gl.getParameter(gl.DEPTH_FUNC) : null;
          var oldBlend = gl.isEnabled ? gl.isEnabled(gl.BLEND) : true;
          var oldCullFace = gl.isEnabled ? gl.isEnabled(gl.CULL_FACE) : false;
          var oldBlendSrcRgb = gl.getParameter ? gl.getParameter(gl.BLEND_SRC_RGB) : null;
          var oldBlendDstRgb = gl.getParameter ? gl.getParameter(gl.BLEND_DST_RGB) : null;
          var oldBlendSrcAlpha = gl.getParameter ? gl.getParameter(gl.BLEND_SRC_ALPHA) : null;
          var oldBlendDstAlpha = gl.getParameter ? gl.getParameter(gl.BLEND_DST_ALPHA) : null;
          var oldBlendEquationRgb = gl.getParameter ? gl.getParameter(gl.BLEND_EQUATION_RGB) : null;
          var oldBlendEquationAlpha = gl.getParameter ? gl.getParameter(gl.BLEND_EQUATION_ALPHA) : null;
          var depthBits = gl.getParameter ? Number(gl.getParameter(gl.DEPTH_BITS)) || 0 : 0;

          try {
            if (info.hasBrowserWaterUvShader && info.browserWaterUvUniforms && info.browserWaterUvUniforms.time) {
              var now = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
              uniform1f.call(gl, info.browserWaterUvUniforms.time, now * 0.001);
            }
            if (enable) enable.call(gl, gl.DEPTH_TEST);
            if (depthFunc) depthFunc.call(gl, gl.LEQUAL);
            if (depthMask) depthMask.call(gl, false);
            if (disable) disable.call(gl, gl.CULL_FACE);
            if (enable) enable.call(gl, gl.BLEND);
            if (blendEquationSeparate) blendEquationSeparate.call(gl, gl.FUNC_ADD, gl.FUNC_ADD);
            if (blendFunc) blendFunc.call(gl, gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            drawCall();
            if (window.__openmwShaderWater) {
              window.__openmwShaderWater.forcedStateDraws++;
              if (info.hasBrowserWaterUvShader) window.__openmwShaderWater.waterUvForcedStateDraws++;
              window.__openmwShaderWater.lastDraw = {
                kind: kind,
                mode: mode,
                count: count,
                forcedState: true,
                browserWaterUv: !!info.hasBrowserWaterUvShader,
                oldDepthTest: oldDepthTest,
                oldDepthMask: oldDepthMask,
                oldDepthFunc: oldDepthFunc,
                oldBlend: oldBlend,
                depthBits: depthBits,
                attribPointers: summarizeActiveAttribPointers(gl, info)
              };
            }
          } finally {
            if (blendEquationSeparate && oldBlendEquationRgb !== null && oldBlendEquationAlpha !== null) {
              blendEquationSeparate.call(gl, oldBlendEquationRgb, oldBlendEquationAlpha);
            }
            if (blendFuncSeparate && oldBlendSrcRgb !== null && oldBlendDstRgb !== null &&
                oldBlendSrcAlpha !== null && oldBlendDstAlpha !== null) {
              blendFuncSeparate.call(gl, oldBlendSrcRgb, oldBlendDstRgb, oldBlendSrcAlpha, oldBlendDstAlpha);
            }
            if (!oldBlend && disable) disable.call(gl, gl.BLEND);
            if (oldCullFace && enable) enable.call(gl, gl.CULL_FACE);
            if (!oldDepthTest && disable) disable.call(gl, gl.DEPTH_TEST);
            if (depthFunc && oldDepthFunc !== null) depthFunc.call(gl, oldDepthFunc);
            if (depthMask) depthMask.call(gl, oldDepthMask);
          }
          return true;
        }

        function traceTexture(kind, internalFormat, width, height, format, type, pixels, convertedFormat, srcOffset) {
          if (!traceTextures || window.__glTextureTrace.length >= 400) return;
          window.__glTextureTrace.push({
            kind: kind,
            internalFormat: internalFormat,
            width: width,
            height: height,
            format: format,
            type: type,
            convertedFormat: convertedFormat || null,
            srcOffset: srcOffset || 0,
            pixels: pixels ? pixels.length || pixels.byteLength || 0 : 0
          });
        }

        function convertBgraPixels(width, height, pixels, srcOffset) {
          var byteLength = width * height * 4;
          srcOffset = srcOffset || 0;
          if (!pixels || pixels.length < srcOffset + byteLength) return pixels;
          var rgba = new Uint8Array(byteLength);
          for (var i = 0; i < byteLength; i += 4) {
            var src = srcOffset + i;
            rgba[i] = pixels[src + 2];
            rgba[i + 1] = pixels[src + 1];
            rgba[i + 2] = pixels[src];
            rgba[i + 3] = pixels[src + 3];
          }
          return rgba;
        }

        function convertBgrPixels(width, height, pixels, srcOffset) {
          var byteLength = width * height * 3;
          srcOffset = srcOffset || 0;
          if (!pixels || pixels.length < srcOffset + byteLength) return pixels;
          var rgb = new Uint8Array(byteLength);
          for (var i = 0; i < byteLength; i += 3) {
            var src = srcOffset + i;
            rgb[i] = pixels[src + 2];
            rgb[i + 1] = pixels[src + 1];
            rgb[i + 2] = pixels[src];
          }
          return rgb;
        }

        function expandAlphaPixels(width, height, pixels, srcOffset) {
          var byteLength = width * height;
          srcOffset = srcOffset || 0;
          if (!pixels || pixels.length < srcOffset + byteLength) return pixels;
          var rgba = new Uint8Array(byteLength * 4);
          for (var i = 0, j = 0; i < byteLength; ++i, j += 4) {
            rgba[j] = 255;
            rgba[j + 1] = 255;
            rgba[j + 2] = 255;
            rgba[j + 3] = pixels[srcOffset + i];
          }
          return rgba;
        }

        function expandLuminancePixels(width, height, pixels, srcOffset) {
          var byteLength = width * height;
          srcOffset = srcOffset || 0;
          if (!pixels || pixels.length < srcOffset + byteLength) return pixels;
          var rgba = new Uint8Array(byteLength * 4);
          for (var i = 0, j = 0; i < byteLength; ++i, j += 4) {
            var l = pixels[srcOffset + i];
            rgba[j] = l;
            rgba[j + 1] = l;
            rgba[j + 2] = l;
            rgba[j + 3] = 255;
          }
          return rgba;
        }

        function expandLuminanceAlphaPixels(width, height, pixels, srcOffset) {
          var byteLength = width * height * 2;
          srcOffset = srcOffset || 0;
          if (!pixels || pixels.length < srcOffset + byteLength) return pixels;
          var rgba = new Uint8Array(width * height * 4);
          for (var i = 0, j = 0; i < byteLength; i += 2, j += 4) {
            var src = srcOffset + i;
            var l = pixels[src];
            rgba[j] = l;
            rgba[j + 1] = l;
            rgba[j + 2] = l;
            rgba[j + 3] = pixels[src + 1];
          }
          return rgba;
        }

        function isUnsupportedTextureParameter(pname) {
          return pname === GL_TEXTURE_BORDER_COLOR ||
            pname === GL_TEXTURE_COMPARE_FAIL_VALUE_ARB ||
            pname === GL_GENERATE_MIPMAP ||
            pname === GL_TEXTURE_LOD_BIAS;
        }

        function normalizeTextureParameter(pname, param) {
          if ((pname === 0x2802 || pname === 0x2803 || pname === 0x8072) &&
              Number(param) === 0x2900) {
            return 0x812F;
          }
          return param;
        }

        function textureParameterTarget(gl, target) {
          if (!gl) return target;
          if (target >= gl.TEXTURE_CUBE_MAP_POSITIVE_X &&
              target <= gl.TEXTURE_CUBE_MAP_NEGATIVE_Z) {
            return gl.TEXTURE_CUBE_MAP;
          }
          return target;
        }

        var textureAnisotropyExtension;

        function getTextureAnisotropyExtension(gl) {
          if (textureAnisotropyExtension !== undefined) return textureAnisotropyExtension;
          textureAnisotropyExtension = null;
          try {
            textureAnisotropyExtension =
              gl.getExtension("EXT_texture_filter_anisotropic") ||
              gl.getExtension("MOZ_EXT_texture_filter_anisotropic") ||
              gl.getExtension("WEBKIT_EXT_texture_filter_anisotropic") ||
              null;
          } catch (error) {
            textureAnisotropyExtension = null;
          }
          return textureAnisotropyExtension;
        }

        function applyTextureAnisotropy(gl, target) {
          if (!gl || !texParameterf) return;
          var extension = getTextureAnisotropyExtension(gl);
          if (!extension) return;
          try {
            var maxAnisotropy = Number(gl.getParameter(extension.MAX_TEXTURE_MAX_ANISOTROPY_EXT)) || 1;
            texParameterf.call(gl, target, extension.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(16, maxAnisotropy));
          } catch (error) {
          }
        }

        function finishTextureUpload(gl, target, result, skipAutoMipmap) {
          if (!gl || !texParameteri) return result;
          var parameterTarget = textureParameterTarget(gl, target);
          if (parameterTarget !== gl.TEXTURE_2D && parameterTarget !== gl.TEXTURE_CUBE_MAP) return result;
          if (!skipAutoMipmap) maybeGenerateTextureMipmap(gl, target);
          applyTerrainBlendMaskSampling(gl, parameterTarget);
          applyTextureAnisotropy(gl, parameterTarget);
          return result;
        }

        proto.texImage2D = function(target, level, internalFormat, width, height, border, format, type, pixels) {
          var srcOffset = arguments.length > 9 ? arguments[9] : 0;
          if (target === this.TEXTURE_2D && level === 0) {
            rememberTexture(this, width, height, internalFormat, format, type, pixels, srcOffset);
          }
          if (type === this.UNSIGNED_BYTE && (format === GL_ALPHA || internalFormat === GL_ALPHA)) {
            traceTexture("texImage2D", internalFormat, width, height, format, type, pixels, this.RGBA, srcOffset);
            return finishTextureUpload(this, target, texImage2D.call(this, target, level, this.RGBA, width, height, border, this.RGBA, type,
              expandAlphaPixels(width, height, pixels, srcOffset)));
          }
          if (type === this.UNSIGNED_BYTE && (format === GL_LUMINANCE ||
              internalFormat === GL_LUMINANCE || internalFormat === GL_LUMINANCE8)) {
            traceTexture("texImage2D", internalFormat, width, height, format, type, pixels, this.RGBA, srcOffset);
            return finishTextureUpload(this, target, texImage2D.call(this, target, level, this.RGBA, width, height, border, this.RGBA, type,
              expandLuminancePixels(width, height, pixels, srcOffset)));
          }
          if (type === this.UNSIGNED_BYTE && (format === GL_LUMINANCE_ALPHA ||
              internalFormat === GL_LUMINANCE_ALPHA || internalFormat === GL_LUMINANCE8_ALPHA8)) {
            traceTexture("texImage2D", internalFormat, width, height, format, type, pixels, this.RGBA, srcOffset);
            return finishTextureUpload(this, target, texImage2D.call(this, target, level, this.RGBA, width, height, border, this.RGBA, type,
              expandLuminanceAlphaPixels(width, height, pixels, srcOffset)));
          }
          if (format === GL_BGR && type === this.UNSIGNED_BYTE) {
            traceTexture("texImage2D", internalFormat, width, height, format, type, pixels, this.RGB, srcOffset);
            return finishTextureUpload(this, target, texImage2D.call(this, target, level, this.RGB, width, height, border, this.RGB, type,
              convertBgrPixels(width, height, pixels, srcOffset)));
          }
          if (format === GL_BGRA && type === this.UNSIGNED_BYTE) {
            traceTexture("texImage2D", internalFormat, width, height, format, type, pixels, this.RGBA, srcOffset);
            return finishTextureUpload(this, target, texImage2D.call(this, target, level, this.RGBA, width, height, border, this.RGBA, type,
              convertBgraPixels(width, height, pixels, srcOffset)));
          }
          if (internalFormat === GL_DEPTH_COMPONENT && format === GL_DEPTH_COMPONENT && type === this.UNSIGNED_BYTE) {
            return finishTextureUpload(this, target, texImage2D.call(this, target, level, GL_DEPTH_COMPONENT16, width, height, border, format,
              this.UNSIGNED_SHORT, null));
          }
          traceTexture("texImage2D", internalFormat, width, height, format, type, pixels, null, srcOffset);
          return finishTextureUpload(this, target, texImage2D.apply(this, arguments));
        };

        proto.texSubImage2D = function(target, level, xoffset, yoffset, width, height, format, type, pixels) {
          var srcOffset = arguments.length > 9 ? arguments[9] : 0;
          if (target === this.TEXTURE_2D && level === 0) {
            var texture = getBoundTexture2D();
            var existing = texture ? textureInfo.get(texture) : null;
            rememberTexture(this, existing && existing.width ? existing.width : width,
              existing && existing.height ? existing.height : height, format, format, type, pixels, srcOffset);
          }
          if (format === GL_ALPHA && type === this.UNSIGNED_BYTE) {
            traceTexture("texSubImage2D", null, width, height, format, type, pixels, this.RGBA, srcOffset);
            return finishTextureUpload(this, target, texSubImage2D.call(this, target, level, xoffset, yoffset, width, height, this.RGBA, type,
              expandAlphaPixels(width, height, pixels, srcOffset)));
          }
          if (format === GL_LUMINANCE && type === this.UNSIGNED_BYTE) {
            traceTexture("texSubImage2D", null, width, height, format, type, pixels, this.RGBA, srcOffset);
            return finishTextureUpload(this, target, texSubImage2D.call(this, target, level, xoffset, yoffset, width, height, this.RGBA, type,
              expandLuminancePixels(width, height, pixels, srcOffset)));
          }
          if (format === GL_LUMINANCE_ALPHA && type === this.UNSIGNED_BYTE) {
            traceTexture("texSubImage2D", null, width, height, format, type, pixels, this.RGBA, srcOffset);
            return finishTextureUpload(this, target, texSubImage2D.call(this, target, level, xoffset, yoffset, width, height, this.RGBA, type,
              expandLuminanceAlphaPixels(width, height, pixels, srcOffset)));
          }
          if (format === GL_BGR && type === this.UNSIGNED_BYTE) {
            traceTexture("texSubImage2D", null, width, height, format, type, pixels, this.RGB, srcOffset);
            return finishTextureUpload(this, target, texSubImage2D.call(this, target, level, xoffset, yoffset, width, height, this.RGB, type,
              convertBgrPixels(width, height, pixels, srcOffset)));
          }
          if (format === GL_BGRA && type === this.UNSIGNED_BYTE) {
            traceTexture("texSubImage2D", null, width, height, format, type, pixels, this.RGBA, srcOffset);
            return finishTextureUpload(this, target, texSubImage2D.call(this, target, level, xoffset, yoffset, width, height, this.RGBA, type,
              convertBgraPixels(width, height, pixels, srcOffset)));
          }
          traceTexture("texSubImage2D", null, width, height, format, type, pixels, null, srcOffset);
          return finishTextureUpload(this, target, texSubImage2D.apply(this, arguments));
        };

        if (compressedTexImage2D) {
          proto.compressedTexImage2D = function(target, level, internalFormat, width, height, border, data) {
            if ((target === this.TEXTURE_2D || textureParameterTarget(this, target) === this.TEXTURE_CUBE_MAP) &&
                level === 0) {
              rememberTexture(this, width, height, internalFormat, internalFormat, 0, data, 0);
              traceTexture("compressedTexImage2D", internalFormat, width, height, internalFormat, 0, data, null, 0);
            }
            return finishTextureUpload(this, target, compressedTexImage2D.apply(this, arguments));
          };
        }

        if (compressedTexSubImage2D) {
          proto.compressedTexSubImage2D = function(target, level, xoffset, yoffset, width, height, format, data) {
            if ((traceTextures || skyProbe || browserWaterFallback || browserWaterDrawFixEnabled() || browserWaterStateFixEnabled()) &&
                (target === this.TEXTURE_2D || textureParameterTarget(this, target) === this.TEXTURE_CUBE_MAP) &&
                level === 0) {
              traceTexture("compressedTexSubImage2D", null, width, height, format, 0, data, null, 0);
            }
            return finishTextureUpload(this, target, compressedTexSubImage2D.apply(this, arguments));
          };
        }

        if (generateMipmap) {
          proto.generateMipmap = function(target) {
            var texture = textureParameterTarget(this, target) === this.TEXTURE_2D ? getBoundTexture2D() : null;
            var info = texture ? textureInfo.get(texture) : null;
            if (info && !isMipmappableTextureInfo(this, info)) return;
            var result = generateMipmap.apply(this, arguments);
            markTextureMipmapGenerated(this, target);
            return finishTextureUpload(this, target, result, true);
          };
        }

        proto.enable = function(cap) {
          if (cap === this.DEPTH_TEST) trackedGlState.depthTest = true;
          if (cap === this.BLEND) trackedGlState.blend = true;
          return enable.call(this, cap);
        };

        proto.disable = function(cap) {
          if (cap === this.DEPTH_TEST) trackedGlState.depthTest = false;
          if (cap === this.BLEND) trackedGlState.blend = false;
          return disable.call(this, cap);
        };

        if (depthFunc) {
          proto.depthFunc = function(func) {
            trackedGlState.depthFunc = func;
            return depthFunc.call(this, func);
          };
        }

        if (depthMask) {
          proto.depthMask = function(flag) {
            trackedGlState.depthMask = !!flag;
            return depthMask.call(this, flag);
          };
        }

        if (blendFunc) {
          proto.blendFunc = function(sfactor, dfactor) {
            trackedGlState.blendSrcRgb = sfactor;
            trackedGlState.blendDstRgb = dfactor;
            trackedGlState.blendSrcAlpha = sfactor;
            trackedGlState.blendDstAlpha = dfactor;
            return blendFunc.call(this, sfactor, dfactor);
          };
        }

        if (blendFuncSeparate) {
          proto.blendFuncSeparate = function(srcRgb, dstRgb, srcAlpha, dstAlpha) {
            trackedGlState.blendSrcRgb = srcRgb;
            trackedGlState.blendDstRgb = dstRgb;
            trackedGlState.blendSrcAlpha = srcAlpha;
            trackedGlState.blendDstAlpha = dstAlpha;
            return blendFuncSeparate.call(this, srcRgb, dstRgb, srcAlpha, dstAlpha);
          };
        }

        if (blendEquation) {
          proto.blendEquation = function(mode) {
            trackedGlState.blendEquationRgb = mode;
            trackedGlState.blendEquationAlpha = mode;
            return blendEquation.call(this, mode);
          };
        }

        if (blendEquationSeparate) {
          proto.blendEquationSeparate = function(modeRgb, modeAlpha) {
            trackedGlState.blendEquationRgb = modeRgb;
            trackedGlState.blendEquationAlpha = modeAlpha;
            return blendEquationSeparate.call(this, modeRgb, modeAlpha);
          };
        }

        proto.texParameterf = function(target, pname, param) {
          if (isUnsupportedTextureParameter(pname)) return;
          param = normalizeTextureParameter(pname, param);
          rememberTextureParameter(this, target, pname, param);
          return texParameterf.call(this, target, pname, param);
        };

        proto.texParameteri = function(target, pname, param) {
          if (isUnsupportedTextureParameter(pname)) return;
          param = normalizeTextureParameter(pname, param);
          rememberTextureParameter(this, target, pname, param);
          return texParameteri.call(this, target, pname, param);
        };

        if (activeTexture && bindTexture) {
          proto.activeTexture = function(texture) {
            activeTextureUnit = texture - this.TEXTURE0;
            return activeTexture.call(this, texture);
          };

          proto.bindTexture = function(target, texture) {
            if (target === this.TEXTURE_2D) boundTexture2DByUnit[activeTextureUnit] = texture;
            return bindTexture.call(this, target, texture);
          };
        }

        if (bindFramebuffer) {
          proto.bindFramebuffer = function(target, framebuffer) {
            rememberContext(this);
            rememberFramebufferBinding(this, target, framebuffer);
            return bindFramebuffer.call(this, target, framebuffer);
          };
        }

        if (traceTextures) {
          proto.drawArrays = function(mode, first, count) {
            if (window.__glDrawTrace.length < 800) {
              var texture = getBoundTexture2D();
              var info = texture ? textureInfo.get(texture) : null;
              window.__glDrawTrace.push({
                mode: mode,
                first: first,
                count: count,
                texture: info ? {
                  width: info.width,
                  height: info.height,
                  format: info.format,
                  type: info.type
                } : null
              });
            }
            return drawArrays.call(this, mode, first, count);
          };
        }

        proto.bindBuffer = function(target, buffer) {
          if (target === this.ARRAY_BUFFER) boundArrayBuffer = buffer;
          if (target === this.ELEMENT_ARRAY_BUFFER) boundElementArrayBuffer = buffer;
          return bindBuffer.call(this, target, buffer);
        };

        if (bufferData) {
          proto.bufferData = function(target, dataOrSize, usage) {
            if (target === this.ELEMENT_ARRAY_BUFFER) {
              shadowBoundElementBuffer(dataOrSize, arguments.length > 3 ? arguments[3] : 0, arguments.length > 4 ? arguments[4] : undefined);
            }
            return bufferData.apply(this, arguments);
          };
        }

        if (bufferSubData) {
          proto.bufferSubData = function(target, dstByteOffset, srcData) {
            if (target === this.ELEMENT_ARRAY_BUFFER) {
              shadowBoundElementSubData(dstByteOffset, srcData, arguments.length > 3 ? arguments[3] : 0, arguments.length > 4 ? arguments[4] : undefined);
            }
            return bufferSubData.apply(this, arguments);
          };
        }

        proto.vertexAttribPointer = function(index, size, type, normalized, stride, offset) {
          var clientPointer = !boundArrayBuffer;
          attribPointerInfo[index] = {
            bound: boundArrayBuffer,
            clientPointer: clientPointer,
            size: size,
            type: type,
            normalized: normalized,
            stride: stride,
            offset: offset
          };
          if (clientPointer) {
            var stats = window.__openmwClientArrayFix;
            if (stats) stats.lastReason = "captured client attribute " + index;
            return;
          }
          return vertexAttribPointer.call(this, index, size, type, normalized, stride, offset);
        };

        proto.enableVertexAttribArray = function(index) {
          attribPointerInfo[index] = attribPointerInfo[index] || {};
          attribPointerInfo[index].enabled = true;
          return enableVertexAttribArray.call(this, index);
        };

        proto.disableVertexAttribArray = function(index) {
          attribPointerInfo[index] = attribPointerInfo[index] || {};
          attribPointerInfo[index].enabled = false;
          return disableVertexAttribArray.call(this, index);
        };

        proto.getAttribLocation = function(program, name) {
          var existingInfo = programInfo.get(program);
          if (existingInfo && existingInfo.linked === false) return -1;
          var location = getAttribLocation.call(this, program, name);
          getProgramInfo(program).attribLocations[String(name)] = location;
          return location;
        };

        if (skyProbe || terrainProbe || browserWaterFallback || browserWaterDrawFix || browserWaterStateFix) {
          proto.getUniformLocation = function(program, name) {
            var existingInfo = programInfo.get(program);
            if (existingInfo && existingInfo.linked === false) return null;
            var location = getUniformLocation.call(this, program, name);
            getProgramInfo(program).uniformNames[String(name)] = true;
            if (location) uniformInfo.set(location, { program: program, name: String(name) });
            return location;
          };

          proto.uniform1i = function(location, x) {
            rememberUniform(location, x);
            return uniform1i.call(this, location, x);
          };

          proto.uniform1f = function(location, x) {
            rememberUniform(location, x);
            return uniform1f.call(this, location, x);
          };

          proto.uniform4f = function(location, x, y, z, w) {
            rememberUniform(location, [x, y, z, w]);
            return uniform4f.call(this, location, x, y, z, w);
          };

          proto.uniform4fv = function(location, value) {
            rememberUniform(location, value);
            return uniform4fv.call(this, location, value);
          };

          proto.uniformMatrix4fv = function(location, transpose, value) {
            rememberUniform(location, value);
            return uniformMatrix4fv.call(this, location, transpose, value);
          };
        }

        proto.useProgram = function(program) {
          rememberContext(this);
          if (!program) {
            currentProgram = null;
            currentProgramInvalid = false;
            return useProgram.call(this, program);
          }
          var existingInfo = programInfo.get(program);
          if (existingInfo && existingInfo.linked === false) {
            currentProgram = program;
            currentProgramInvalid = true;
            useProgram.call(this, null);
            return;
          }
          currentProgram = program;
          currentProgramInvalid = false;
          return useProgram.call(this, program);
        };

        var drawArraysWithTrace = proto.drawArrays;
        proto.drawArrays = function(mode, first, count) {
          var gl = this;
          rememberContext(this);
          if (shouldSkipDrawForInvalidProgram(this, "drawArrays", mode, count)) return;
          if (browserWaterFallback) applyBrowserWaterUniforms(this);
          applyBrowserFogUniforms(this);
          applyBrowserLegacyUniforms(this);
          applyBrowserTerrainUniforms(this);
          if (!uploadClientAttribsForDraw(this, first, count)) return;
          recordSkyDraw(this, "drawArrays", arguments);
          recordShaderWaterDraw("arrays", mode, count);
          if (drawShaderWaterWithBrowserState(this, "arrays", mode, count, function() {
            return drawArraysWithTrace.call(gl, mode, first, count);
          })) {
            return;
          }
          if (drawBrowserTerrainBlendLayer(this, "arrays", mode, count, function() {
            return drawArraysWithTrace.call(gl, mode, first, count);
          })) {
            return;
          }
          if (drawBrowserTerrainAlphaLayer(this, "arrays", mode, count, function() {
            return drawArraysWithTrace.call(gl, mode, first, count);
          })) {
            return;
          }
          if (drawClassicWaterWithStateFix(this, "arrays", mode, count, function() {
            return drawArraysWithTrace.call(gl, mode, first, count);
          })) {
            return;
          }
          if (isClassicWaterDraw(this, "arrays", mode, count) &&
              drawBrowserWaterReplacement(this, "arrays", mode, first, count, 0)) {
            return;
          }
          return drawArraysWithTrace.call(this, mode, first, count);
        };

        proto.drawElements = function(mode, count, type, offset) {
          var gl = this;
          rememberContext(this);
          if (shouldSkipDrawForInvalidProgram(this, "drawElements", mode, count)) return;
          if (browserWaterFallback) applyBrowserWaterUniforms(this);
          applyBrowserFogUniforms(this);
          applyBrowserLegacyUniforms(this);
          applyBrowserTerrainUniforms(this);
          if (!uploadClientAttribsForDraw(this, 0, count, type, offset)) return;
          recordSkyDraw(this, "drawElements", arguments);
          recordShaderWaterDraw("elements", mode, count);
          if (drawShaderWaterWithBrowserState(this, "elements", mode, count, function() {
            return drawElements.call(gl, mode, count, type, offset);
          })) {
            return;
          }
          if (drawBrowserTerrainBlendLayer(this, "elements", mode, count, function() {
            return drawElements.call(gl, mode, count, type, offset);
          })) {
            return;
          }
          if (drawBrowserTerrainAlphaLayer(this, "elements", mode, count, function() {
            return drawElements.call(gl, mode, count, type, offset);
          })) {
            return;
          }
          if (drawClassicWaterWithStateFix(this, "elements", mode, count, function() {
            return drawElements.call(gl, mode, count, type, offset);
          })) {
            return;
          }
          if (isClassicWaterDraw(this, "elements", mode, count) &&
              drawBrowserWaterReplacement(this, "elements", mode, count, type, offset)) {
            return;
          }
          return drawElements.call(this, mode, count, type, offset);
        };

        proto.createShader = function(type) {
          rememberContext(this);
          var shader = createShader.call(this, type);
          shaderInfo.set(shader, { type: type, helperOnly: false });
          return shader;
        };
        proto.shaderSource = function(shader, source) {
          rememberContext(this);
          var rawSource = String(source);
          var info = shaderInfo.get(shader) || {};
          var fixed = fixShaderSource(rawSource, info.type, this);
          if (info.type === this.FRAGMENT_SHADER) fixed = ensureFragmentFloatPrecision(fixed);
          info.helperOnly = !/\bvoid\s+main\s*\(/.test(fixed);
          info.rawSource = rawSource;
          info.source = fixed;
          info.isSky = isSkyShaderSource(fixed);
          info.hasBrowserWorldFog = /\bu_browserFogColor\b/.test(fixed);
          if (info.hasBrowserWorldFog && window.__openmwWorldFogPatch) {
            window.__openmwWorldFogPatch.shaders++;
            if (info.type === this.VERTEX_SHADER) window.__openmwWorldFogPatch.vertexShaders++;
            if (info.type === this.FRAGMENT_SHADER) window.__openmwWorldFogPatch.fragmentShaders++;
          }
          info.hasBrowserMaterialWater = browserWaterFallback && /\bu_browserWaterSurface\b/.test(fixed);
          info.hasSimpleWaterVertexShader = /\bbrowserWaterPosition\b/.test(fixed);
          info.hasSimpleWaterFragmentShader = /\bbrowserDeepWater\b/.test(fixed);
          info.hasSimpleWaterShader = info.hasSimpleWaterVertexShader || info.hasSimpleWaterFragmentShader;
          info.hasBrowserWaterUvVertexShader = /\bbrowserWaterUvPosition\b/.test(fixed) ||
            isBrowserWaterUvVertexShader(fixed);
          info.hasBrowserWaterUvFragmentShader = /\bbrowserSimpleWaterDeep\b/.test(fixed) ||
            isBrowserWaterUvFragmentShader(fixed);
          info.hasBrowserWaterUvShader = info.hasBrowserWaterUvVertexShader || info.hasBrowserWaterUvFragmentShader;
          info.hasPackagedBrowserWaterShader = info.hasBrowserWaterUvShader &&
            !/\bbrowserWaterUvPosition\b/.test(fixed) &&
            !/\bbrowserSimpleWaterDeep\b/.test(fixed);
          info.browserWaterUvUniforms = null;
          if (info.hasSimpleWaterShader && window.__openmwShaderWater) {
            window.__openmwShaderWater.shaders++;
            if (info.hasSimpleWaterVertexShader) window.__openmwShaderWater.vertexShaders++;
            if (info.hasSimpleWaterFragmentShader) window.__openmwShaderWater.fragmentShaders++;
          }
          if (info.hasBrowserWaterUvShader && window.__openmwShaderWater) {
            window.__openmwShaderWater.shaders++;
            window.__openmwShaderWater.waterUvShaders++;
            if (info.hasBrowserWaterUvVertexShader) window.__openmwShaderWater.waterUvVertexShaders++;
            if (info.hasBrowserWaterUvFragmentShader) window.__openmwShaderWater.waterUvFragmentShaders++;
          }
          info.hasClassicTwoTextureShader = /\bu_texUnit0\b/.test(fixed) &&
            /\bu_texUnit1\b/.test(fixed) &&
            /\bu_textureMatrix0\b/.test(fixed) &&
            /\bu_textureMatrix1\b/.test(fixed);
          info.hasClassicWaterBypass = /\bu_browserClassicWaterSurface\b/.test(fixed);
          if (browserWaterStateFixEnabled() && info.type === this.FRAGMENT_SHADER) {
            recordClassicWaterShaderSource(rawSource, fixed);
          }
          if (skyProbe && info.isSky && window.__openmwSkyProbe.shaders.length < 20) {
            window.__openmwSkyProbe.shaders.push({
              type: info.type,
              helperOnly: info.helperOnly,
              sourceHead: fixed.slice(0, 2200)
            });
          }
          if (info.helperOnly) {
            if (info.type === this.VERTEX_SHADER) {
              fixed += "\nvoid main() { gl_Position = vec4(0.0); }\n";
            } else if (shaderUsesGlslEs300(fixed)) {
              fixed = ensureGlslEs300FragmentOutput(fixed);
              fixed += "\nvoid main() { browserFragColor = vec4(0.0); }\n";
            } else {
              fixed += "\nvoid main() { gl_FragColor = vec4(0.0); }\n";
            }
            info.source = fixed;
          }
          shaderInfo.set(shader, info);
          return shaderSource.call(this, shader, fixed);
        };
        proto.compileShader = function(shader) {
          rememberContext(this);
          var lostBeforeCompile = this.isContextLost ? this.isContextLost() : false;
          var drainedBeforeCompile = drainWebGLErrors(this);
          var result = compileShader.call(this, shader);
          var lostAfterCompile = this.isContextLost ? this.isContextLost() : false;
          if (getShaderParameter && !getShaderParameter.call(this, shader, this.COMPILE_STATUS)) {
            var info = shaderInfo.get(shader) || {};
            var message = getShaderInfoLog ? getShaderInfoLog.call(this, shader) : "";
            if (!message) {
              drainWebGLErrors(this);
              compileShader.call(this, shader);
              message = getShaderInfoLog ? getShaderInfoLog.call(this, shader) : "";
            }
            if (getShaderParameter && getShaderParameter.call(this, shader, this.COMPILE_STATUS)) {
              return result;
            }
            var fallbackSource = buildEmergencyShaderSource(this, info);
            if (fallbackSource && createShader) {
              var replacementShader = createShader.call(this, info.type);
              shaderSource.call(this, replacementShader, fallbackSource);
              drainWebGLErrors(this);
              compileShader.call(this, replacementShader);
              message = getShaderInfoLog ? getShaderInfoLog.call(this, replacementShader) : "";
              if (getShaderParameter && getShaderParameter.call(this, replacementShader, this.COMPILE_STATUS)) {
                info.source = fallbackSource;
                info.emergencyFallback = true;
                info.replacementShader = replacementShader;
                recordEmergencyShaderFallback(
                  info.type === this.VERTEX_SHADER ? "vertex fallback compiled" : "fragment fallback compiled"
                );
                return result;
              }
              if (!window.__openmwEmergencyShaderFallback) {
                window.__openmwEmergencyShaderFallback = { applied: 0, failed: 0, lastReason: "" };
              }
              window.__openmwEmergencyShaderFallback.failed++;
              window.__openmwEmergencyShaderFallback.lastReason =
                info.type === this.VERTEX_SHADER ? "vertex fallback failed" : "fragment fallback failed";
            }
            var diagnosticSource = info.source || "";
            var freshCompile = diagnosticSource ? compileSourceOnFreshContext(info.type, diagnosticSource) : null;
            var sameContextCompile = diagnosticSource ? compileSourceOnSameContext(this, info.type, diagnosticSource) : null;
            var shaderSourceReadback = "";
            if (getShaderSource) {
              try {
                shaderSourceReadback = getShaderSource.call(this, shader) || "";
              } catch (error) {
                shaderSourceReadback = String(error);
              }
            }
            var diagnosticDetail = [
              "lostBefore=" + lostBeforeCompile,
              "lostAfter=" + lostAfterCompile,
              "drainedBefore=" + drainedBeforeCompile,
              "freshCompile=" + (freshCompile ? JSON.stringify(freshCompile) : "null"),
              "sameContextCompile=" + (sameContextCompile ? JSON.stringify(sameContextCompile) : "null"),
              "shaderSourceReadback=" + shaderSourceReadback.slice(0, 500),
              diagnosticSource.slice(0, 2500)
            ].join("\n");
            recordGraphicsWarning(
              info.type === this.VERTEX_SHADER ? "vertex shader compile failed" : "fragment shader compile failed",
              message || "unknown shader compile failure",
              diagnosticDetail
            );
          }
          return result;
        };
        if (getShaderParameter) {
          proto.getShaderParameter = function(shader, pname) {
            var info = shaderInfo.get(shader);
            if (info && info.emergencyFallback && pname === this.COMPILE_STATUS) return true;
            return getShaderParameter.call(this, shader, pname);
          };
        }
        if (getShaderInfoLog) {
          proto.getShaderInfoLog = function(shader) {
            var info = shaderInfo.get(shader);
            if (info && info.emergencyFallback) return "";
            return getShaderInfoLog.call(this, shader);
          };
        }
        proto.attachShader = function(program, shader) {
          rememberContext(this);
          var info = shaderInfo.get(shader);
          if (info && info.helperOnly) return;
          if (info) getProgramInfo(program).shaders.push(info);
          return attachShader.call(this, program, info && info.replacementShader ? info.replacementShader : shader);
        };
        proto.linkProgram = function(program) {
          rememberContext(this);
          drainWebGLErrors(this);
          var result = linkProgram.call(this, program);
          var info = getProgramInfo(program);
          var linkMessage = "";
          if (getProgramParameter && !getProgramParameter.call(this, program, this.LINK_STATUS)) {
            linkMessage = getProgramInfoLog ? getProgramInfoLog.call(this, program) : "";
            if (!linkMessage) {
              drainWebGLErrors(this);
              linkProgram.call(this, program);
              linkMessage = getProgramInfoLog ? getProgramInfoLog.call(this, program) : "";
            }
          }
          info.linked = getProgramParameter ? !!getProgramParameter.call(this, program, this.LINK_STATUS) : null;
          if (!info.debugId) info.debugId = ++debugProgramCounter;
          if (getProgramParameter && !getProgramParameter.call(this, program, this.LINK_STATUS)) {
            var failedShaderDetails = info.shaders.map(function(shader, index) {
              return [
                "shader[" + index + "] type=" + shader.type,
                "helperOnly=" + !!shader.helperOnly,
                "source=" + (shader.source || "").slice(0, 1200)
              ].join("\n");
            }).join("\n---\n");
            recordGraphicsWarning(
              "program link failed",
              linkMessage || "unknown shader link failure",
              failedShaderDetails
            );
            return result;
          }
          info.hasBrowserWorldFog = info.shaders.some(function(shader) { return !!shader.hasBrowserWorldFog; });
          if (info.hasBrowserWorldFog && window.__openmwWorldFogPatch) {
            window.__openmwWorldFogPatch.programs++;
          }
          info.hasBrowserMaterialWater = browserWaterFallback && info.shaders.some(function(shader) { return !!shader.hasBrowserMaterialWater; });
          info.hasSimpleWaterVertexShader = info.shaders.some(function(shader) { return !!shader.hasSimpleWaterVertexShader; });
          info.hasSimpleWaterFragmentShader = info.shaders.some(function(shader) { return !!shader.hasSimpleWaterFragmentShader; });
          info.hasSimpleWaterShader = info.hasSimpleWaterFragmentShader;
          info.hasBrowserWaterUvVertexShader = info.shaders.some(function(shader) { return !!shader.hasBrowserWaterUvVertexShader; });
          info.hasBrowserWaterUvFragmentShader = info.shaders.some(function(shader) { return !!shader.hasBrowserWaterUvFragmentShader; });
          info.hasBrowserWaterUvShader = info.hasBrowserWaterUvVertexShader || info.hasBrowserWaterUvFragmentShader;
          info.hasPackagedBrowserWaterShader = info.shaders.some(function(shader) { return !!shader.hasPackagedBrowserWaterShader; });
          if (info.hasBrowserWaterUvShader && getUniformLocation) {
            info.browserWaterUvUniforms = {
              time: getUniformLocation.call(this, program, "u_browserWaterTime")
            };
          }
          if ((info.hasSimpleWaterShader || info.hasBrowserWaterUvShader) && window.__openmwShaderWater) {
            var waterVertexShader = null;
            var waterFragmentShader = null;
            var waterActiveAttribs = [];
            for (var shaderIndex = 0; shaderIndex < info.shaders.length; shaderIndex++) {
              if (info.shaders[shaderIndex].type === this.VERTEX_SHADER) waterVertexShader = info.shaders[shaderIndex];
              if (info.shaders[shaderIndex].type === this.FRAGMENT_SHADER) waterFragmentShader = info.shaders[shaderIndex];
            }
            if (getProgramParameter && getActiveAttrib && getAttribLocation) {
              var waterAttribCount = getProgramParameter.call(this, program, this.ACTIVE_ATTRIBUTES) || 0;
              for (var waterAttribIndex = 0; waterAttribIndex < waterAttribCount; waterAttribIndex++) {
                var waterAttrib = getActiveAttrib.call(this, program, waterAttribIndex);
                if (waterAttrib) {
                  waterActiveAttribs.push({
                    name: waterAttrib.name,
                    size: waterAttrib.size,
                    type: waterAttrib.type,
                    location: getAttribLocation.call(this, program, waterAttrib.name)
                  });
                }
              }
            }
            info.activeAttribs = waterActiveAttribs.slice();
            window.__openmwShaderWater.programs++;
            if (info.hasBrowserWaterUvShader) window.__openmwShaderWater.waterUvPrograms++;
            window.__openmwShaderWater.lastProgram = {
              linked: getProgramParameter ? !!getProgramParameter.call(this, program, this.LINK_STATUS) : null,
              hasVertex: info.hasSimpleWaterVertexShader,
              hasFragment: info.hasSimpleWaterFragmentShader,
              hasWaterUvVertex: info.hasBrowserWaterUvVertexShader,
              hasWaterUvFragment: info.hasBrowserWaterUvFragmentShader,
              shaderCount: info.shaders.length,
              activeAttribs: waterActiveAttribs,
              rawVertexTail: waterVertexShader && waterVertexShader.rawSource
                ? shaderSnippetAround(waterVertexShader.rawSource, "waterUV")
                : null,
              rawFragmentTail: waterFragmentShader && waterFragmentShader.rawSource
                ? shaderSnippetAround(waterFragmentShader.rawSource, "gl_FragColor")
                : null,
              vertexTail: waterVertexShader && waterVertexShader.source
                ? shaderSnippetAround(waterVertexShader.source, "waterUV")
                : null,
              fragmentTail: waterFragmentShader && waterFragmentShader.source
                ? shaderSnippetAround(waterFragmentShader.source, "gl_FragColor")
                : null
            };
          }
          info.hasClassicTwoTextureShader = info.shaders.some(function(shader) { return !!shader.hasClassicTwoTextureShader; });
          info.hasClassicWaterBypass = info.shaders.some(function(shader) { return !!shader.hasClassicWaterBypass; });
          var terrainBlendMapUniform = getUniformLocation ? getUniformLocation.call(this, program, "blendMap") : null;
          var terrainBlendUvUniform = getUniformLocation ? getUniformLocation.call(this, program, "browserBlendUvScaleOffset") : null;
          var hasBrowserTerrainBlendSampler = info.shaders.some(function(shader) {
            return /#if\s+1[\s\S]{0,240}\buniform\s+sampler2D\s+blendMap\s*;/.test(shader.source || "");
          });
          var hasBrowserTerrainBlendUv = info.shaders.some(function(shader) {
            return /#if\s+1[\s\S]{0,240}\bbrowserBlendUvScaleOffset\b/.test(shader.source || "");
          });
          info.hasBrowserTerrainBlendShader = !!(terrainBlendMapUniform && terrainBlendUvUniform) ||
            (hasBrowserTerrainBlendSampler && hasBrowserTerrainBlendUv);
          if (info.hasBrowserTerrainBlendShader && getUniformLocation) {
            info.browserTerrainBlendUvUniform = terrainBlendUvUniform || getUniformLocation.call(this, program, "browserBlendUvScaleOffset");
            info.browserTerrainDiffuseUvScaleUniform = getUniformLocation.call(this, program, "browserDiffuseUvScale");
          }
          info.hasBrowserTerrainAlphaShader = info.shaders.some(function(shader) {
            return /\bbrowserTerrainLayerAlpha\b/.test(shader.source || "") &&
              /\bpassWebglColor\b/.test(shader.source || "") &&
              /\bdiffuseMap\b/.test(shader.source || "");
          });
          if ((info.hasBrowserTerrainBlendShader || info.hasBrowserTerrainAlphaShader) &&
              getProgramParameter && getActiveAttrib && getAttribLocation) {
            var terrainAlphaAttribCount = getProgramParameter.call(this, program, this.ACTIVE_ATTRIBUTES) || 0;
            info.activeAttribs = [];
            for (var terrainAlphaAttribIndex = 0; terrainAlphaAttribIndex < terrainAlphaAttribCount; terrainAlphaAttribIndex++) {
              var terrainAlphaAttrib = getActiveAttrib.call(this, program, terrainAlphaAttribIndex);
              if (terrainAlphaAttrib) {
                var terrainAlphaAttribLocation = getAttribLocation.call(this, program, terrainAlphaAttrib.name);
                info.attribLocations[String(terrainAlphaAttrib.name)] = terrainAlphaAttribLocation;
                info.activeAttribs.push({
                  name: terrainAlphaAttrib.name,
                  size: terrainAlphaAttrib.size,
                  type: terrainAlphaAttrib.type,
                  location: terrainAlphaAttribLocation
                });
              }
            }
          }
          if (info.hasBrowserWorldFog) {
            info.browserFogUniforms = {
              color: getUniformLocation.call(this, program, "u_browserFogColor"),
              end: getUniformLocation.call(this, program, "u_browserFogEnd"),
              scale: getUniformLocation.call(this, program, "u_browserFogScale"),
              enabled: getUniformLocation.call(this, program, "u_browserFogEnabled")
            };
          }
          if (info.hasBrowserMaterialWater) {
            info.browserWaterUniforms = {
              surface: getUniformLocation.call(this, program, "u_browserWaterSurface"),
              time: getUniformLocation.call(this, program, "u_browserWaterTime")
            };
          }
          if (skyProbe) {
            info.isSky = info.shaders.some(function(shader) { return !!shader.isSky; });
            if (info.isSky) {
              info.id = window.__openmwSkyProbe.programs.length + 1;
              if (getProgramParameter && getActiveAttrib) {
                var count = getProgramParameter.call(this, program, this.ACTIVE_ATTRIBUTES) || 0;
                for (var i = 0; i < count; i++) {
                  var attrib = getActiveAttrib.call(this, program, i);
                  if (attrib) info.activeAttribs.push({ name: attrib.name, size: attrib.size, type: attrib.type });
                }
              }
              if (window.__openmwSkyProbe.programs.length < 20) {
                window.__openmwSkyProbe.programs.push({
                  id: info.id,
                  linked: getProgramParameter ? !!getProgramParameter.call(this, program, this.LINK_STATUS) : null,
                  activeAttribs: info.activeAttribs.slice(),
                  shaderCount: info.shaders.length
                });
              }
            }
          }
          return result;
        };
      }

      patchContext(window.WebGLRenderingContext && WebGLRenderingContext.prototype);
      patchContext(window.WebGL2RenderingContext && WebGL2RenderingContext.prototype);
    })();

