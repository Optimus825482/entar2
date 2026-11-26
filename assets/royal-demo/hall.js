(() => {
  'use strict';

  const { THREE:T, OrbitControls } = window.MeritThree;

  window.createMeritHall = function createHall(canvas, units, layout, event, callbacks) {
    const renderer = new T.WebGLRenderer({canvas, antialias:true, alpha:false, powerPreference:'low-power'});
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.65));
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    const scene = new T.Scene();
    scene.background = new T.Color('#18130f');
    const camera = new T.PerspectiveCamera(41,1,.12,190);
    camera.position.set(27,48,52);
    const controls = new OrbitControls(camera,canvas);
    controls.target.set(0,0,-1);
    controls.enablePan = false;
    controls.enableDamping = false;
    controls.enableZoom = true;
    controls.zoomSpeed = .95;
    controls.minDistance = 3;
    controls.maxDistance = 135;
    controls.maxPolarAngle = Math.PI/2 - .012;
    canvas.style.touchAction = 'pan-y';

    scene.add(new T.HemisphereLight('#fff1df','#5e4631',2.15));
    const keyLight = new T.DirectionalLight('#fff0d3',2.3);
    keyLight.position.set(-8,22,6);
    scene.add(keyLight);
    const fillLight = new T.DirectionalLight('#d1ddff',.65);
    fillLight.position.set(9,13,-24);
    scene.add(fillLight);

    function material(color, options = {}) {
      return new T.MeshStandardMaterial({color,roughness:.81,...options});
    }

    const palette = {
      travertine:material('#aaa08c'), cream:material('#dfcbb0'),
      panel:material('#877762'), trim:material('#b99768',{metalness:.46}),
      riser:material('#382b22'), stage:material('#211d21'),
      glass:material('#a89981',{metalness:.32,roughness:.32}),
      goldLight:new T.MeshBasicMaterial({color:'#f6c78a'}),
      screen:new T.MeshBasicMaterial({map:screenTexture(),toneMapped:false})
    };

    const boxShape = new T.BoxGeometry(1,1,1);
    function block(parent, mat, w,h,d,x,y,z) {
      const mesh = new T.Mesh(boxShape,mat);
      mesh.position.set(x,y,z);
      mesh.scale.set(w,h,d);
      parent.add(mesh);
      return mesh;
    }

    function texture(width,height,draw) {
      const image = document.createElement('canvas');
      image.width = width;
      image.height = height;
      draw(image.getContext('2d'),width,height);
      const result = new T.CanvasTexture(image);
      result.colorSpace = T.SRGBColorSpace;
      return result;
    }

    function carpetTexture() {
      const rug = texture(256,256,(ctx,w,h) => {
        ctx.fillStyle = '#514941';
        ctx.fillRect(0,0,w,h);
        for (let index=0; index<320; index++) {
          const x = (index * 7919) % w;
          const y = (index * index * 167 + index * 3) % h;
          ctx.fillStyle = ['#6d6255','#5e5146','#473e36','#716659'][index%4];
          ctx.fillRect(x,y,6+index%17,2+index%8);
        }
        ctx.strokeStyle = '#786c5e';
        ctx.lineWidth = 1.5;
        for (let index=0; index<4;index++) {
          ctx.save();
          ctx.translate((index%2)*128+64, Math.floor(index/2)*128+64);
          ctx.rotate(Math.PI/4);
          ctx.strokeRect(-34,-34,68,68);
          ctx.strokeRect(-26,-26,52,52);
          ctx.restore();
        }
      });
      rug.wrapS = rug.wrapT = T.RepeatWrapping;
      rug.repeat.set(13,9);
      rug.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(),8);
      return rug;
    }

    function screenTexture() {
      const width = 1152;
      const height = 440;
      const artwork = window.meritHallPortraits?.[event.id] ?? window.meritHallArtwork;

      function draw(ctx,crest,portrait) {
        const background = ctx.createLinearGradient(0,0,width,height);
        background.addColorStop(0,'#08142c');
        background.addColorStop(.64,'#14345e');
        background.addColorStop(1,'#0b1831');
        ctx.fillStyle = background;
        ctx.fillRect(0,0,width,height);

        if (portrait) {
          const photoX = 680;
          ctx.drawImage(portrait,...artwork.crop,photoX,0,width-photoX,height);
          const blend = ctx.createLinearGradient(photoX,0,photoX+132,0);
          blend.addColorStop(0,'#10284b');
          blend.addColorStop(1,'#10284b00');
          ctx.fillStyle = blend;
          ctx.fillRect(photoX,0,132,height);
          const vignette = ctx.createLinearGradient(0,0,0,height);
          vignette.addColorStop(0,'#060d241e');
          vignette.addColorStop(.63,'#060d2400');
          vignette.addColorStop(1,'#060d2480');
          ctx.fillStyle = vignette;
          ctx.fillRect(photoX,0,width-photoX,height);
        }

        ctx.strokeStyle = '#cba15e';
        ctx.lineWidth = 2;
        ctx.strokeRect(19,19,width-38,height-38);
        ctx.textAlign = 'left';
        if (crest) ctx.drawImage(crest,63,61,126,126*crest.naturalHeight/crest.naturalWidth);
        const eventInset = crest ? 213 : 63;
        ctx.fillStyle = '#f2c67c';
        ctx.font = 'bold 33px sans-serif';
        ctx.fillText(event.label.toLocaleUpperCase('tr-TR'),eventInset,116,440);
        ctx.font = '30px sans-serif';
        ctx.fillText(event.short,eventInset,158,440);

        ctx.fillStyle = '#fff4df';
        ctx.font = 'bold 99px Georgia, serif';
        ctx.fillText(event.artist,63,295,portrait ? 602 : 1010);
        ctx.fillStyle = '#cba15e';
        ctx.fillRect(64,323,156,3);
      }

      async function loadImage(src) {
        if (!src) return null;
        const image = new Image();
        image.src = src;
        try {
          await image.decode();
          return image;
        } catch {
          return null;
        }
      }

      const screen = texture(width,height,ctx => draw(ctx));
      Promise.all([loadImage(window.meritHallLogo),loadImage(artwork?.src)]).then(([crest,portrait]) => {
        if (!crest && !portrait) return;
        draw(screen.image.getContext('2d'),crest,portrait);
        screen.needsUpdate = true;
        schedule();
      });
      return screen;
    }

    const floorWidth = layout.width;
    const floorDepth = layout.back - layout.front;
    const floorCenter = (layout.back + layout.front)/2;
    block(scene,palette.riser,floorWidth+.8,.55,floorDepth+8,0,-.47,floorCenter+2.6);
    block(scene,palette.travertine,floorWidth,.2,floorDepth,0,-.14,floorCenter);
    const rug = new T.Mesh(new T.PlaneGeometry(floorWidth-2.25,floorDepth-1.55),material('#ffffff',{map:carpetTexture()}));
    rug.rotation.x = -Math.PI/2;
    rug.position.set(0,-.025,floorCenter);
    scene.add(rug);
    for (const x of [-31.1,31.1]) block(scene,palette.trim,.12,.032,floorDepth-1,x,-.015,floorCenter);
    block(scene,palette.trim,62,.032,.14,0,-.015,19.45);

    const walls = [
      buildWall(0,layout.front,0,64,13,false),
      buildWall(-32,-.8,Math.PI/2,42,8,true),
      buildWall(32,-.8,-Math.PI/2,42,8,true),
      buildWall(0,layout.balcony+2.25,Math.PI,64,12,true)
    ];

    function buildWall(x,z,angle,width,bays,doors) {
      const wall = new T.Group();
      wall.position.set(x,0,z);
      wall.rotation.y = angle;
      scene.add(wall);
      block(wall,palette.panel,width,7.75,.42,0,3.8,0);
      for (const height of [.23,3.4,7.57]) block(wall,palette.cream,width,.27,.76,0,height,.3);
      const spacing = width / bays;
      for (let i=0;i<=bays;i++) {
        const at = i*spacing-width/2;
        block(wall,palette.cream,.43,7.3,.55,at,3.75,.37);
        block(wall,palette.trim,.12,4.7,.06,at,4.4,.675);
        block(wall,palette.cream,.66,.23,.75,at,7.32,.44);
        if (i === bays) continue;
        const center = at + spacing/2;
        block(wall,doors && (i%4===0) ? palette.stage : palette.travertine,spacing*.74,2.35,.10,center,1.58,.25);
        block(wall,palette.glass,spacing*.56,2.4,.09,center,5.31,.26);
        block(wall,palette.trim,spacing*.62,.11,.15,center,4.07,.31);
        if (i%2 === 0) block(wall,palette.goldLight,.18,.47,.16,center,3.3,.56);
      }
      return wall;
    }

    const stage = new T.Group();
    scene.add(stage);
    for (const [x,z,w,d] of [layout.stage,layout.runway,layout.apron]) {
      block(stage,palette.stage,w,.58,d,x,.29,z);
      block(stage,palette.trim,w+.03,.045,d+.03,x,.62,z);
      block(stage,palette.stage,w-.13,.05,d-.13,x,.65,z);
    }
    block(stage,palette.stage,15.6,6.25,.35,0,3.6,-20.35);
    const screen = new T.Mesh(new T.PlaneGeometry(13.9,5.25),palette.screen);
    screen.position.set(0,3.56,-20.1);
    stage.add(screen);
    block(stage,palette.stage,16.7,.26,.42,0,6.65,-19.89);
    for (const x of [-8,-6,-4,-2,0,2,4,6,8]) block(stage,palette.goldLight,.27,.14,.25,x,6.43,-19.63);
    for (const x of [-8.06,8.06]) {
      block(stage,palette.stage,.55,2.4,.63,x,4.9,-19.39);
      for (const y of [4.15,4.75,5.35]) block(stage,palette.panel,.44,.05,.65,x,y,-19.35);
    }
    for (const wall of [walls[1],walls[2]]) {
      block(wall,palette.stage,13.1,5.1,.4,0,4.18,.56);
      block(wall,palette.trim,12.85,4.86,.09,0,4.18,.79);
      const sideScreen = new T.Mesh(new T.PlaneGeometry(12.6,4.64),palette.screen);
      sideScreen.position.set(0,4.18,.85);
      wall.add(sideScreen);
    }

    block(scene,palette.riser,10,.56,4.65,1.4,.28,15.85);
    block(scene,palette.glass,8,.14,2.7,1.4,.62,15.85);

    const balcony = new T.Group();
    scene.add(balcony);
    block(balcony,palette.cream,62.9,.75,5.8,0,3.94,21.7);
    block(balcony,palette.trim,62.9,.12,.18,0,4.19,18.9);
    const balconyFloor = block(balcony,palette.panel,62.5,.09,5.55,0,4.34,21.75);
    balconyFloor.renderOrder = 0;

    const roof = new T.Group();
    scene.add(roof);
    block(roof,palette.cream,64,.3,46,0,7.85,.5);
    for (const x of [-22.8,-8,8,22.8]) block(roof,palette.trim,.13,.16,40,x,7.61,0);
    for (const z of [-16,-5,7,17]) block(roof,palette.trim,60,.16,.13,0,7.61,z);
    const hanging = new T.Group();
    scene.add(hanging);
    const chandelier = new T.CylinderGeometry(.85,.44,.38,14);
    for (const [x,z] of [[0,-9],[-17,-4],[17,-4],[-17,10],[17,10],[0,14]]) {
      block(hanging,palette.trim,.04,.62,.04,x,7.3,z);
      const lamp = new T.Mesh(chandelier,palette.goldLight);
      lamp.position.set(x,6.84,z);
      hanging.add(lamp);
      block(hanging,palette.trim,1.42,.07,.2,x,6.98,z);
    }

    const chairEntries = [];
    const dummy = new T.Object3D();
    const whiteMaterial = material('#fff9f0');
    const tableTop = new T.MeshBasicMaterial({color:'#ffffff',toneMapped:false});
    const tables = units.filter(item => !item.box);
    const boxes = units.filter(item => item.box);
    const discs = new T.InstancedMesh(new T.CylinderGeometry(.93,.84,.65,28),[whiteMaterial,tableTop,whiteMaterial],tables.length);
    const seatMesh = new T.InstancedMesh(new T.BoxGeometry(.31,.28,.31),whiteMaterial,units.length*12);
    const backMesh = new T.InstancedMesh(new T.BoxGeometry(.32,.34,.085),whiteMaterial,units.length*12);
    const boxMesh = new T.InstancedMesh(boxShape,tableTop,boxes.length);
    scene.add(discs,seatMesh,backMesh,boxMesh);
    function place(mesh,index,x,y,z,angle=0,w=1,h=1,d=1) {
      dummy.position.set(x,y,z);
      dummy.rotation.set(0,angle,0);
      dummy.scale.set(w,h,d);
      dummy.updateMatrix();
      mesh.setMatrixAt(index,dummy.matrix);
    }
    for (const [index,item] of tables.entries()) place(discs,index,item.x,.38,item.z);
    for (const [index,item] of boxes.entries()) {
      place(boxMesh,index,item.x,item.y+.06,item.z,0,4.67,.16,3.2);
      block(balcony,palette.cream,4.74,.56,.24,item.x,4.66,item.z-1.85);
      block(balcony,palette.trim,4.82,.07,.28,item.x,4.96,item.z-1.85);
      block(balcony,palette.cream,.12,.83,3.3,item.x-2.43,4.78,item.z-.08);
      block(balcony,palette.travertine,1.15,.49,.52,item.x,4.66,item.z+1.03);
    }
    function chairPosition(item,number) {
      if (item.box) return {x:item.x+((number-1)%6-2.5)*.58,z:item.z-.53+Math.floor((number-1)/6)*.63,a:0};
      const a = (number - 1) * Math.PI/6;
      return {x:item.x+Math.sin(a)*1.17,z:item.z+Math.cos(a)*1.17,a};
    }
    for (const item of units) {
      for (let i=1;i<=12;i++) {
        const {x,z,a} = chairPosition(item,i);
        const index = chairEntries.length;
        chairEntries.push({item,number:i});
        place(seatMesh,index,x,item.y+.21,z,a);
        place(backMesh,index,x+Math.sin(a)*.12,item.y+.40,z+Math.cos(a)*.12,a);
      }
    }

    const tableLabels = makeLabels(units.map(item => ({text:item.num,x:item.x,y:item.y+(item.box?.15:.716),z:item.z})),.67,.50,28,'#182127',0,'#fff4d0');
    scene.add(tableLabels);
    let chairLabels;
    let labelUnit;
    function makeLabels(labels,w,h,size,color,lift=0,outline) {
      const columns = 16;
      const cell = 48;
      const rows = Math.ceil(labels.length/columns);
      const atlas = texture(columns*cell,rows*cell,ctx => {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold ' + size + 'px sans-serif';
        ctx.fillStyle = color;
        if (outline) {
          ctx.strokeStyle = outline;
          ctx.lineWidth = 3.5;
          ctx.lineJoin = 'round';
        }
        labels.forEach((label,i) => {
          const x = (i%columns+.5)*cell;
          const y = (Math.floor(i/columns)+.51)*cell;
          if (outline) ctx.strokeText(label.text,x,y,cell-5);
          ctx.fillText(label.text,x,y,cell-5);
        });
      });
      const vertices = [], uvs = [], indices = [];
      labels.forEach(({x,y,z},index) => {
        const u = (index%columns)/columns, v = 1-Math.floor(index/columns)/rows;
        vertices.push(x-w,y,z-h, x+w,y,z-h, x+w,y+lift,z+h, x-w,y+lift,z+h);
        uvs.push(u,v,u+1/columns,v,u+1/columns,v-1/rows,u,v-1/rows);
        const n = index*4;
        indices.push(n,n+2,n+1,n,n+3,n+2);
      });
      const shape = new T.BufferGeometry();
      shape.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
      shape.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
      shape.setIndex(indices);
      const mesh = new T.Mesh(shape,new T.MeshBasicMaterial({map:atlas,transparent:true,depthWrite:false,side:T.DoubleSide}));
      mesh.renderOrder = 1;
      return mesh;
    }

    const ring = new T.Mesh(new T.RingGeometry(1.36,1.52,48),new T.MeshBasicMaterial({color:'#fff7e2',toneMapped:false}));
    ring.rotation.x = -Math.PI/2;
    scene.add(ring);

    const colors = {
      open:new T.Color('#eef3f4'), stage:new T.Color('#f1d839'), full:new T.Color('#778391'),
      pick:new T.Color('#edb55e'), seat:new T.Color('#b49a74'), free:new T.Color('#fff1d4'),
      chosen:new T.Color('#edaf51')
    };
    let state;
    const selectedCenter = new T.Vector3();
    const chairPickingDistance = 20;
    let section = true;
    let shown = false;
    let invalidated = false;
    let animation = null;

    function schedule() {
      if (!shown || invalidated) return;
      invalidated = true;
      requestAnimationFrame(render);
    }

    function render(now) {
      invalidated = false;
      if (!shown) return;
      if (animation) {
        const amount = Math.min((now-animation.start)/animation.duration,1);
        const eased = amount*amount*(3-2*amount);
        camera.position.lerpVectors(animation.from,animation.to,eased);
        controls.target.lerpVectors(animation.targetFrom,animation.targetTo,eased);
        controls.update();
        if (amount === 1) animation = null;
        else schedule();
      }
      const {x,y,z} = camera.position;
      walls[0].visible = !section || z > layout.front + 1;
      walls[1].visible = !section || x > -19;
      walls[2].visible = !section || x < 19;
      walls[3].visible = !section || z < 17;
      hanging.visible = !section;
      roof.visible = !section && y < 7.6 && Math.abs(x)<31 && z<24 && z>layout.front;
      if (chairLabels) chairLabels.visible = chairsAreClose();
      renderer.render(scene,camera);
    }

    function chairsAreClose() {
      const item = state?.unit;
      return Boolean(item && !item.box && section && state.manualSeats && !state.located &&
        camera.position.distanceTo(selectedCenter.set(item.x,item.y,item.z)) <= chairPickingDistance);
    }

    function sync(next) {
      state = next;
      const {unit,located,selected,stock,canPick} = next;
      function appearance(item) {
        if (!canPick(item)) return colors.full;
        if (item === unit || item === located) return colors.pick;
        return item.stageSide ? colors.stage : colors.open;
      }
      tables.forEach((item,index) => discs.setColorAt(index,appearance(item)));
      boxes.forEach((item,index) => boxMesh.setColorAt(index,appearance(item)));
      chairEntries.forEach(({item,number},index) => {
        const isFree = stock.get(item.id).includes(number);
        let tint = isFree ? colors.seat : colors.full;
        if (isFree && item === unit) tint = selected.has(number) ? colors.chosen : colors.free;
        seatMesh.setColorAt(index,tint);
        backMesh.setColorAt(index,tint);
      });
      for (const mesh of [discs,boxMesh,seatMesh,backMesh]) mesh.instanceColor.needsUpdate = true;
      const marker = located ?? unit;
      ring.visible = Boolean(marker);
      if (marker) {
        ring.position.set(marker.x,marker.y+.035,marker.z);
        ring.scale.set(marker.box ? 1.88 : 1,marker.box ? 1.4 : 1,1);
      }
      if (labelUnit !== unit) {
        labelUnit = unit;
        if (chairLabels) {
          scene.remove(chairLabels);
          chairLabels.geometry.dispose();
          chairLabels.material.map.dispose();
          chairLabels.material.dispose();
          chairLabels = null;
        }
        if (unit && !unit.box) {
          chairLabels = makeLabels(Array.from({length:12},(_,i) => {
            const {x,z} = chairPosition(unit,i+1);
            return {text:i+1,x,y:unit.y+.57,z};
          }),.145,.12,28,'#f9f0dc',.04);
          scene.add(chairLabels);
        }
      }
      schedule();
    }

    function resize() {
      if (!shown || !canvas.clientWidth || !canvas.clientHeight) return;
      camera.aspect = canvas.clientWidth/canvas.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(canvas.clientWidth,canvas.clientHeight,false);
      schedule();
    }
    new ResizeObserver(resize).observe(canvas);
    controls.addEventListener('change',schedule);
    controls.addEventListener('start',() => { animation = null; callbacks.tooltip(null); });
    canvas.addEventListener('webglcontextlost',event => {
      event.preventDefault();
      shown = false;
      callbacks.failure();
    });

    function fly(position,target,duration=550) {
      animation = null;
      if (callbacks.reducedMotion.matches) {
        camera.position.copy(position);
        controls.target.copy(target);
        controls.update();
      } else {
        animation = {start:performance.now(),duration,from:camera.position.clone(),to:position,targetFrom:controls.target.clone(),targetTo:target};
      }
      schedule();
    }

    function presets(name) {
      if (name === 'overview' || name === 'top') {
        section = true;
        camera.fov = 41;
        camera.updateProjectionMatrix();
        const narrow = canvas.clientWidth/canvas.clientHeight < 1.15;
        const position = name === 'top' ? [0,narrow ? 106 : 81,2] : [narrow ? 15 : 17,narrow ? 69 : 58,narrow ? 72 : 65];
        fly(new T.Vector3(...position),new T.Vector3(0,1,1));
        return;
      }
      animation = null;
      const offset = camera.position.clone().sub(controls.target);
      if (name === 'left' || name === 'right') offset.applyAxisAngle(new T.Vector3(0,1,0),name === 'left' ? -.3 : .3);
      if (name === 'in' || name === 'out') {
        const distance = offset.length();
        offset.setLength(Math.min(controls.maxDistance,Math.max(controls.minDistance,distance*(name === 'in' ? .79 : 1.26))));
      }
      fly(offset.add(controls.target),controls.target.clone(),330);
    }

    function detail(item) {
      section = true;
      camera.fov = 41;
      camera.updateProjectionMatrix();
      fly(new T.Vector3(item.x+1.45,item.y+6.65,item.z+4.4),new T.Vector3(item.x,item.y+.18,item.z),490);
    }

    function pov(item,number) {
      section = false;
      camera.fov = 60;
      camera.updateProjectionMatrix();
      const {target = [0,2.12,-17.65],eyeHeight = 1.22,seatOffset = 1.03} = layout.sightline ?? {};
      const {x,z} = number ? chairPosition(item,number) : {x:item.x,z:item.z+seatOffset};
      fly(new T.Vector3(x,item.y+eyeHeight,z),new T.Vector3(...target),640);
    }

    const mouse = new T.Vector2();
    const ray = new T.Raycaster();
    const targets = [discs,boxMesh,seatMesh,backMesh];
    function pick(event) {
      if (!state || !shown) return null;
      const bounds = canvas.getBoundingClientRect();
      const x = event.clientX-bounds.left, y = event.clientY-bounds.top;
      mouse.set(x/bounds.width*2-1,-y/bounds.height*2+1);
      ray.setFromCamera(mouse,camera);
      for (const hit of ray.intersectObjects(targets,false)) {
        const entry = hit.object === discs ? {item:tables[hit.instanceId]}
          : (hit.object === boxMesh ? {item:boxes[hit.instanceId]} : chairEntries[hit.instanceId]);
        return {...entry,x,y};
      }
      return null;
    }
    const pointers = new Set();
    let down;
    canvas.addEventListener('pointerdown',event => {
      pointers.add(event.pointerId);
      down = event.button === 0 && pointers.size === 1 ? {id:event.pointerId,x:event.clientX,y:event.clientY} : null;
    });
    canvas.addEventListener('pointercancel',event => { pointers.delete(event.pointerId); down=null; });
    canvas.addEventListener('pointerup',event => {
      pointers.delete(event.pointerId);
      const tap = down;
      down = null;
      if (!tap || tap.id !== event.pointerId || Math.hypot(event.clientX-tap.x,event.clientY-tap.y) > 6) return;
      const hit = pick(event);
      if (!hit || !state.canPick(hit.item)) return;
      if (hit.item === state.unit && hit.number && chairsAreClose()) callbacks.chair(hit.number);
      else callbacks.unit(hit.item.id);
    });
    let lastHover = 0;
    canvas.addEventListener('pointermove',event => {
      if (event.pointerType === 'touch' || down || performance.now()-lastHover < 38) return;
      lastHover = performance.now();
      const hit = pick(event);
      canvas.style.cursor = hit ? (state.canPick(hit.item) ? 'pointer' : 'not-allowed') : 'grab';
      callbacks.tooltip(hit?.item,hit?.x,hit?.y);
    });
    canvas.addEventListener('pointerleave',() => { down=null; callbacks.tooltip(null); });

    return {
      camera:presets, detail, pov, sync,
      visible(value) {
        shown = value;
        controls.enabled = value;
        if (value) resize();
      }
    };
  };
})();
