// Run with Node.js and FFmpeg (including ffprobe) on PATH.
const { execFile, execFileSync } = require('node:child_process');
const { mkdir, readFile } = require('node:fs/promises');
const { join, resolve } = require('node:path');
const { promisify } = require('node:util');
const { runInNewContext } = require('node:vm');

const run = promisify(execFile);
const assets = resolve(__dirname,'../assets/royal-demo');
const output = join(assets,'sightlines');
const aspectRatio = 16/9;
const references = {
  near:{file:'view-front-gala.webp', focusX:.54, focusY:.52},
  axial:{file:'view-axial-gala.webp', focusX:.50, focusY:.52},
  middle:{file:'view-middle-gala.webp', focusX:.642, focusY:.51},
  // The stage edge and runway establish the camera side in these references.
  left:{file:'view-right.webp', focusX:.215, focusY:.50},
  right:{file:'view-left.webp', focusX:.78, focusY:.47},
  oblique:{file:'view-oblique-gala.webp', focusX:.46, focusY:.55},
  wing:{file:'view-wing-gala.webp', focusX:.48, focusY:.54},
  center:{file:'view-rear.webp', focusX:.51, focusY:.51},
  balconyCenter:{file:'view-balcony-gala.webp', focusX:.50, focusY:.51},
  balcony:{file:'view-loca.webp', focusX:.26, focusY:.47}
};

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum,value));
}

function frameFor(unit, sightline) {
  const {target:[stageX,stageY,stageZ],eyeHeight,seatOffset} = sightline;
  const across = unit.x-stageX;
  const ahead = unit.z+seatOffset-stageZ;
  const distance = Math.hypot(across,ahead,unit.y+eyeHeight-stageY);
  const angle = Math.atan2(across,ahead);
  const degrees = Math.abs(angle*180/Math.PI);

  // A reference supplies the camera position and perspective for its section.
  // Distance adjusts the crop while the angle positions the stage within it.
  if (unit.box) {
    if (degrees<18) {
      const zoom = clamp(1.23-(distance-38)*.015,1.07,1.23);
      return {source:'balconyCenter', zoom, position:.50+Math.sin(angle)*.26};
    }
    return {source:'balcony', mirror:angle>0, zoom:clamp(1.33-(distance-40)*.017,1.12,1.33), position:.5+Math.sin(angle)*.5};
  }
  if (degrees>=80) {
    const zoom = clamp(1.12+(22-distance)*.010+(degrees-84)*.004,1.02,1.25);
    return {source:'wing', mirror:angle>0, zoom, position:.50+Math.sin(angle)*.12};
  }
  if (degrees>=54 && (distance<31 || degrees>=65)) {
    const zoom = 1.04+4.14/(distance+18)+(degrees-54)*.0017;
    return {source:'oblique', mirror:angle>0, zoom, position:.5+Math.sin(angle)*.12};
  }
  if (degrees<=12 && distance<23) {
    return {source:'axial', zoom:clamp(1.15-(distance-14)*.013,1.02,1.2), position:.50+Math.sin(angle)*.20};
  }
  if (distance<20 && degrees<40) {
    const side = Math.sin(angle);
    return {source:'near', mirror:angle<0, zoom:clamp(1.26-distance*.0075,1.08,1.26), position:.5+side*.17};
  }
  if (distance<29 && degrees>12 && degrees<29) {
    return {source:'middle', mirror:angle>0, zoom:1.10+(29-distance)*.009, position:.5+Math.sin(angle)*.30};
  }
  if (degrees>23) {
    const towardStage = Math.sin(angle);
    const zoom = 1.03+6.3/(distance+18)+(degrees-23)*.001;
    return {source:angle<0 ? 'left' : 'right', zoom, position:.5+towardStage*.36};
  }
  return {source:'center', zoom:clamp(1.44-(distance-16)*.019,1.02,1.44), position:.51+Math.sin(angle)*.19};
}

function cropFilters({source,mirror,zoom,position}, dimensions) {
  const {focusX,focusY} = references[source];
  const {width,height} = dimensions[source];
  const cropWidth = Math.round(Math.min(width,height*aspectRatio)/zoom);
  const cropHeight = Math.round(cropWidth/aspectRatio);
  const stageX = mirror ? 1-focusX : focusX;
  const pan = clamp(.5+(stageX-position)*2,0,1);
  const x = Math.round((width-cropWidth)*pan);
  const y = Math.round(clamp(focusY*height-.49*cropHeight,0,height-cropHeight));
  return [
    ...(mirror ? ['hflip'] : []),
    'crop=' + [cropWidth,cropHeight,x,y].join(':') + ':exact=1',
    'scale=960:540:flags=lanczos',
    'setsar=1'
  ].join(',');
}

async function main() {
  const context = {window:{}};
  runInNewContext(await readFile(join(assets,'plan-data.js'),'utf8'),context);
  const {geometry,units} = context.window.MeritPlan;
  const dimensions = Object.fromEntries(Object.entries(references).map(([name,{file}]) => {
    const stream = execFileSync('ffprobe',['-v','error','-select_streams','v:0','-show_entries',
      'stream=width,height','-of','json',join(assets,file)],{encoding:'utf8'});
    return [name,JSON.parse(stream).streams[0]];
  }));
  const views = [...units,{id:'overview',x:0,y:0,z:15}];
  await mkdir(output,{recursive:true});
  for (let index=0; index<views.length; index+=4) {
    await Promise.all(views.slice(index,index+4).map(unit => {
      const frame = frameFor(unit,geometry.sightline);
      return run('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',join(assets,references[frame.source].file),
        '-filter_threads','1','-vf',cropFilters(frame,dimensions),'-frames:v','1','-c:v','libwebp',
        '-quality','77',join(output,unit.id+'.webp')]);
    }));
  }
  console.log(views.length + ' views rendered to ' + output);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
