;(function installOpenMwRuntimePolicy(root) {
  "use strict";

  const staleDetachTarget =
    "var _emscripten_glDetachShader=(program,shader)=>{GLctx.detachShader(GL.programs[program],GL.shaders[shader])};";
  const staleDetachGuard =
    'var _emscripten_glDetachShader=(program,shader)=>{var glProgram=GL.programs[program],glShader=GL.shaders[shader];if(!glProgram||!glShader){var runtimeRoot=typeof globalThis!="undefined"?globalThis:{};runtimeRoot.__openmwStaleShaderDetachSkips=(runtimeRoot.__openmwStaleShaderDetachSkips||0)+1;return}GLctx.detachShader(glProgram,glShader)};';
  const debugTrackingTarget =
    "var index=programShader.indexOf(shader);programShader.splice(index,1);orig_glDetachShader(program,shader)";
  const debugTrackingGuard =
    "var index=programShader.indexOf(shader);if(index!==-1)programShader.splice(index,1);orig_glDetachShader(program,shader)";

  function guardStaleShaderDetach(source) {
    let patchedSource = String(source || "");
    const guardedDetach = patchedSource.includes(staleDetachTarget);
    const guardedTracking = patchedSource.includes(debugTrackingTarget);

    if (guardedDetach) {
      patchedSource = patchedSource.replace(staleDetachTarget, staleDetachGuard);
    }
    if (guardedTracking) {
      patchedSource = patchedSource.replace(debugTrackingTarget, debugTrackingGuard);
    }

    return {
      source: patchedSource,
      guardedDetach,
      guardedTracking
    };
  }

  root.MorrowindOpenMwRuntimePolicy = Object.freeze({
    guardStaleShaderDetach
  });
})(globalThis);
