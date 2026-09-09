;(function installTes3mpRenderPolicy(root) {
  "use strict";

  const skippedWaterDraw =
    'var state=tes3mpDrawCompatState();state.waterSkipped++;state.lastReason="skipped water-like draw";state.lastWaterDraw={kind:kind,mode:mode,count:count};return';
  const validatedWaterDraw =
    'var state=tes3mpDrawCompatState();state.waterDraws=(state.waterDraws||0)+1;state.lastReason="validated water-like draw";state.lastWaterDraw={kind:kind,mode:mode,count:count};var restoreWaterState=tes3mpApplyWaterSurfaceState();try{return drawCall()}finally{restoreWaterState()}';
  const drawStatePrologue =
    'function tes3mpWithBrowserDrawState(kind,mode,count,drawCall){if(typeof tes3mpApplyLegacyMaterialUniforms=="function")tes3mpApplyLegacyMaterialUniforms();';
  const waterRuntime = String.raw`
var tes3mpWaterFogColor=new Float32Array([0.12,0.19,0.23,1]);
var tes3mpWaterAmbient=new Float32Array([0.15,0.23,0.29,0.58]);
var tes3mpWaterDiffuse=new Float32Array([0.18,0.30,0.37,0.58]);
var tes3mpWaterEmission=new Float32Array([0.03,0.06,0.08,0.58]);
function tes3mpWaterClamp(value,min,max){return Math.max(min,Math.min(max,value))}
function tes3mpRememberWaterFogColor(){
  if(typeof GLEmulation=="undefined"||!GLEmulation.fogColor)return;
  var color=GLEmulation.fogColor;
  if(color.length<4||Number(color[3]||0)<0.5)return;
  var isGenericFallback=Math.abs(Number(color[0]||0)-0.807843)<0.015&&Math.abs(Number(color[1]||0)-0.890196)<0.015&&Math.abs(Number(color[2]||0)-1)<0.015;
  if(isGenericFallback)return;
  tes3mpWaterFogColor[0]=tes3mpWaterClamp(Number(color[0]||0),0,1);
  tes3mpWaterFogColor[1]=tes3mpWaterClamp(Number(color[1]||0),0,1);
  tes3mpWaterFogColor[2]=tes3mpWaterClamp(Number(color[2]||0),0,1);
}
function tes3mpSetWaterUniform(program,name,value,saved){
  var location=GLctx.getUniformLocation(program,name);
  if(!location)return;
  saved.push([location,GLctx.getUniform(program,location)]);
  GLctx.uniform4fv(location,value);
}
function tes3mpApplyWaterSurfaceState(){
  var renderer=GLImmediate.lastRenderer||GLImmediate.currentRenderer;
  var program=renderer&&renderer.program;
  if(!program)return function(){};
  var fog=tes3mpWaterFogColor;
  tes3mpWaterAmbient[0]=tes3mpWaterClamp(fog[0]*0.75+0.06,0.08,0.32);
  tes3mpWaterAmbient[1]=tes3mpWaterClamp(fog[1]*0.90+0.06,0.14,0.42);
  tes3mpWaterAmbient[2]=tes3mpWaterClamp(fog[2]*0.95+0.07,0.18,0.50);
  tes3mpWaterDiffuse[0]=tes3mpWaterClamp(fog[0]*0.85+0.04,0.08,0.36);
  tes3mpWaterDiffuse[1]=tes3mpWaterClamp(fog[1]*1.05+0.05,0.16,0.48);
  tes3mpWaterDiffuse[2]=tes3mpWaterClamp(fog[2]*1.10+0.06,0.22,0.56);
  tes3mpWaterEmission[0]=tes3mpWaterClamp(fog[0]*0.25,0.015,0.10);
  tes3mpWaterEmission[1]=tes3mpWaterClamp(fog[1]*0.30,0.035,0.14);
  tes3mpWaterEmission[2]=tes3mpWaterClamp(fog[2]*0.35,0.05,0.18);
  var saved=[];
  tes3mpSetWaterUniform(program,"u_materialAmbient",tes3mpWaterAmbient,saved);
  tes3mpSetWaterUniform(program,"u_materialDiffuse",tes3mpWaterDiffuse,saved);
  tes3mpSetWaterUniform(program,"u_materialEmission",tes3mpWaterEmission,saved);
  tes3mpSetWaterUniform(program,"u_fogColor",tes3mpWaterFogColor,saved);
  return function(){
    for(var index=saved.length-1;index>=0;index--){
      if(saved[index][1]!=null)GLctx.uniform4fv(saved[index][0],saved[index][1]);
    }
  };
}
`;

  function restoreValidatedWaterDraws(source) {
    const input = String(source || "");
    if (!input.includes(skippedWaterDraw)) {
      return { source: input, patched: false };
    }
    let output = input.replace(skippedWaterDraw, validatedWaterDraw);
    if (output.includes(drawStatePrologue)) {
      output = output.replace(
        drawStatePrologue,
        `${waterRuntime}${drawStatePrologue}tes3mpRememberWaterFogColor();`
      );
    }
    return {
      source: output,
      patched: true
    };
  }

  root.MorrowindTes3mpRenderPolicy = Object.freeze({
    restoreValidatedWaterDraws
  });
})(globalThis);
