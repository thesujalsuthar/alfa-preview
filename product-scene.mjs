import * as THREE from 'three';
import {OrbitControls} from './vendor/three/OrbitControls.js';
import {RoomEnvironment} from './vendor/three/RoomEnvironment.js';
import {SVGLoader} from './vendor/three/SVGLoader.js';
import {constrainShowroomCamera} from './showroom-camera-bounds.mjs';

let circularVector=null;
export async function loadShowroomVectors(){
  if(circularVector)return;
  const response=await fetch('assets/vectors/circular%20saw.svg');
  if(!response.ok)throw new Error('Circular vector artwork unavailable');
  const data=new SVGLoader().parse((await response.text()).replace(/fill:url\([^;]+\);/g,'fill:#c0c6cc;'));
  const outline=SVGLoader.createShapes(data.paths[0]);
  const core=SVGLoader.createShapes(data.paths[155]);
  const box=new THREE.Box2().setFromPoints(core.flatMap(s=>s.getPoints(16)));
  const center=box.getCenter(new THREE.Vector2());
  const radius=Math.max(...outline.flatMap(s=>s.getPoints(12)).map(p=>p.distanceTo(center)));
  const tips=data.paths.slice(1,155).filter(p=>{
    const c=p.color;return Math.max(c.r,c.g,c.b)-Math.min(c.r,c.g,c.b)<.13;
  });
  circularVector={data,center,radius,tips,coreRadius:box.getSize(new THREE.Vector2()).x/(2*radius)};
}

// Original illustrative geometry, built for this site. Product data remains in the catalogue.
const BLUE = 0x0051d2;
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function brushedTexture() {
  const size = 256, data = new Uint8Array(size * size * 4);
  let seed = 29;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let y = 0; y < size; y++) {
    const streak = 118 + random() * 28;
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4, n = streak + random() * 9;
      data[i] = n; data[i + 1] = n; data[i + 2] = n; data[i + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 1); texture.needsUpdate = true;
  return texture;
}

function concreteTexture(){
  const size=512,data=new Uint8Array(size*size*4);let seed=103;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    seed=(seed*1664525+1013904223)>>>0;
    const joint=x<2||y<2,grain=(seed/4294967296-.5)*18;
    const value=joint?154:187+grain+Math.sin(x*.028)*2+Math.cos(y*.037)*2;
    const i=(y*size+x)*4;data[i]=value;data[i+1]=value;data[i+2]=value;data[i+3]=255;
  }
  const texture=new THREE.DataTexture(data,size,size);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.repeat.set(8,8);texture.needsUpdate=true;return texture;
}

function bladeGeometry(length = 7.6, height = .54, count = 31, depth = .12) {
  const s = new THREE.Shape(), left = -length / 2, bottom = -height / 2;
  s.moveTo(left, bottom); s.lineTo(length / 2, bottom); s.lineTo(length / 2, height / 2 - depth);
  const pitch = length / count;
  for (let i = count - 1; i >= 0; i--) {
    const x = left + i * pitch;
    // Long relief flank, sharp hooked tip, then a positive-rake face.
    // The face returns under the tip before the rounded chip gullet.
    s.lineTo(x + pitch * .24, height / 2);
    s.lineTo(x + pitch * .34, height / 2 - depth * .86);
    s.bezierCurveTo(x + pitch * .37, height / 2 - depth * 1.15,
      x + pitch * .12, height / 2 - depth * 1.22, x, height / 2 - depth);
  }
  s.closePath();
  return new THREE.ExtrudeGeometry(s, {depth:.035, bevelEnabled:true, bevelSegments:1, steps:1, bevelSize:.0005, bevelThickness:.0005,curveSegments:12});
}

function printTexture(name) {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#18222a'; ctx.font = '700 68px Arial'; ctx.fillText('ALFA', 30, 93);
  ctx.font = '500 40px Arial'; ctx.fillText(name, 300, 88);
  const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function contactShadowTexture() {
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=64;
  const ctx=canvas.getContext('2d');
  const gradient=ctx.createLinearGradient(0,0,0,64);
  gradient.addColorStop(0,'rgba(0,0,0,0)');gradient.addColorStop(.35,'rgba(0,0,0,.09)');
  gradient.addColorStop(.65,'rgba(0,0,0,.22)');gradient.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,256,64);
  return new THREE.CanvasTexture(canvas);
}

function sampleBlade(name, index, steel) {
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(bladeGeometry(7.5, .54, 44 - index * 2, .065 + index * .004), steel);
  mesh.castShadow = mesh.receiveShadow = true; group.add(mesh);
  const label = new THREE.Mesh(new THREE.PlaneGeometry(2.45, .29), new THREE.MeshBasicMaterial({map:printTexture(name),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));
  label.position.set(1.64, -.065, .045); group.add(label);
  return group;
}

function circularBlade(product, radius=1) {
  const group=new THREE.Group(), teeth=60, root=radius*.925;
  const vectorProfile=product.family==='HSS SAW'?null:circularVector;
  const shape=new THREE.Shape();
  const polar=(r,a)=>[r*Math.cos(a),r*Math.sin(a)];
  shape.moveTo(...polar(root,0));
  for(let i=0;i<teeth;i++){
    const a=i*Math.PI*2/teeth,step=Math.PI*2/teeth;
    // A sloping clearance land meets the raked cutting face at one edge;
    // no constant-radius plateau around the top of the tooth.
    shape.lineTo(...polar(radius*.988,a+step*.52));
    shape.lineTo(...polar(radius,a+step*.68));
    shape.lineTo(...polar(root+radius*.006,a+step*.53));
    shape.bezierCurveTo(...polar(radius*.904,a+step*.60),
      ...polar(radius*.905,a+step*.85),...polar(root,a+step));
  }
  shape.closePath();
  const hole=(x,y,r)=>{const p=new THREE.Path();p.absarc(x,y,r,0,Math.PI*2,true);shape.holes.push(p);};
  hole(0,0,radius*.14);
  const drives=product.family==='MAX'?2:product.family==='PRO MAX'?6:4;
  for(let i=0;i<drives;i++){const a=i*Math.PI*2/drives;hole(Math.cos(a)*radius*.28,Math.sin(a)*radius*.28,radius*.038);}
  const colors={silver:0xbfc8d1,bronze:0x96805f,gold:0xc4a45b,slate:0x59627e,violet:0x826481};
  const grain=brushedTexture();grain.repeat.set(1,1);
  const material=new THREE.MeshPhysicalMaterial({color:colors[product.finish]||colors.silver,metalness:.86,roughness:.29,roughnessMap:grain,envMapIntensity:1.2});
  let geometry;
  if(vectorProfile){
    const v=vectorProfile,s=radius/v.radius,profile=SVGLoader.createShapes(v.data.paths[0]);
    // The supplied outer profile is already a ring. Its centre is a separate
    // steel component below; adding bore holes to the ring would overlap holes.
    geometry=new THREE.ExtrudeGeometry(profile,{depth:radius*.038,bevelEnabled:false,curveSegments:8,steps:1});
    geometry.translate(-v.center.x,-v.center.y,0);geometry.scale(s,-s,-1);geometry.translate(0,0,radius*.038);
    const tipShapes=v.tips.flatMap(p=>SVGLoader.createShapes(p));
    const tipGeometry=new THREE.ExtrudeGeometry(tipShapes,{depth:radius*.041,bevelEnabled:false,curveSegments:5,steps:1});
    tipGeometry.translate(-v.center.x,-v.center.y,0);tipGeometry.scale(s,-s,-1);tipGeometry.translate(0,0,radius*.041);
    const inserts=new THREE.Mesh(tipGeometry,new THREE.MeshPhysicalMaterial({color:0xd4d8dc,metalness:.82,roughness:.25}));
    group.userData.inserts=inserts;
  }else geometry=new THREE.ExtrudeGeometry(shape,{depth:radius*.038,bevelEnabled:true,bevelSize:radius*.00035,bevelThickness:radius*.00035,bevelSegments:1,curveSegments:12,steps:1});
  const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.productId=product.id;group.add(mesh);
  if(group.userData.inserts){group.userData.inserts.userData.productId=product.id;group.add(group.userData.inserts);}
  // Coated catalogue examples retain a bright central mounting area.
  if(vectorProfile||product.finish!=='silver'){
    const core=new THREE.Shape();core.absarc(0,0,radius*(vectorProfile ? vectorProfile.coreRadius+.005 : .69),0,Math.PI*2,false);
    for(const h of shape.holes)core.holes.push(h.clone());
    const center=new THREE.Mesh(new THREE.ExtrudeGeometry(core,{depth:radius*.038,bevelEnabled:false,curveSegments:32}),new THREE.MeshPhysicalMaterial({color:0xc8cfd5,metalness:.8,roughness:.34,roughnessMap:grain}));
    center.position.z=radius*.0015;center.userData.productId=product.id;group.add(center);
  }
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=160;const ctx=canvas.getContext('2d');
  ctx.fillStyle='#35404a';ctx.font='italic 700 48px Arial';ctx.textAlign='center';ctx.fillText('ESPADA',256,57);
  ctx.font='500 28px Arial';ctx.fillText(product.name,256,104);
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
  const label=new THREE.Mesh(new THREE.PlaneGeometry(radius*1.04,radius*.325),new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false}));
  label.position.set(0,radius*.46,radius*.05);group.add(label);
  const halo=new THREE.Mesh(new THREE.RingGeometry(radius*1.035,radius*1.065,100),new THREE.MeshBasicMaterial({color:BLUE,transparent:true,opacity:.85,side:THREE.DoubleSide}));
  halo.position.z=radius*.01;halo.visible=false;group.add(halo);group.userData.halo=halo;
  return group;
}

function initialise(container, {dark = false, shadow = false} = {}) {
  const renderer = new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = dark ? .95 : .8;
  renderer.shadowMap.enabled = shadow; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.append(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(dark ? 0x050b10 : 0xe4e9ed);
  const camera = new THREE.PerspectiveCamera(39, 1, .05, 100);
  const environment = new RoomEnvironment(), pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(environment,.04); scene.environment = env.texture;
  environment.dispose(); pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xebf3ff, dark ? 0x071320 : 0x939ba5, dark ? .5 : .8));
  const key = new THREE.DirectionalLight(0xffffff, dark ? 3 : 2.0);
  key.position.set(-4,8,6); key.castShadow = shadow;
  if (shadow) {
    key.shadow.mapSize.set(1024,1024); key.shadow.camera.left=-12; key.shadow.camera.right=12;
    key.shadow.camera.top=12; key.shadow.camera.bottom=-12; key.shadow.normalBias=.025;
  }
  scene.add(key);
  const fill = new THREE.DirectionalLight(dark ? 0x1b70ff : 0xc8dcff, dark ? 4.5 : .65); fill.position.set(7,4,-2); scene.add(fill);
  let disposed = false, frame = 0;
  const size = () => {
    if (disposed) return;
    const {width,height} = container.getBoundingClientRect();
    renderer.setSize(Math.max(1,width),Math.max(1,height),false); camera.aspect = Math.max(1,width) / Math.max(1,height); camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(size); observer.observe(container); size();
  function dispose() {
    disposed = true; cancelAnimationFrame(frame); observer.disconnect();
    const geometries = new Set(), materials = new Set(), textures = new Set();
    scene.traverse(obj => {
      if (obj.geometry) geometries.add(obj.geometry);
      for (const m of Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : []) {
        materials.add(m); for (const value of Object.values(m)) if (value?.isTexture) textures.add(value);
      }
    });
    geometries.forEach(g=>g.dispose()); materials.forEach(m=>m.dispose()); textures.forEach(t=>t.dispose());
    env.dispose(); renderer.dispose(); renderer.domElement.remove();
  }
  return {renderer,scene,camera,size,dispose,setFrame(id){frame=id;},get disposed(){return disposed;}};
}

export function createShowroom(container, products, {markers,onSelect,onFeature,onHover,onStation,kind='bimetal'}) {
  const circular=kind==='circular',unified=kind==='unified';
  const isCircular=p=>p.category==='circular-saws';
  const state = initialise(container,{shadow:true});
  const {renderer,scene,camera} = state;
  let needsRender=true;
  scene.fog = new THREE.Fog(0xe8edf0,35,80);
  const controls = new OrbitControls(camera,renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor=.08; controls.enablePan=unified;
  controls.panSpeed=.7;controls.zoomSpeed=.8;
  controls.zoomToCursor=false;
  controls.minDistance=unified?1.1:3; controls.maxDistance=unified?65:23; controls.maxPolarAngle=Math.PI*.49; controls.minPolarAngle=.12;
  controls.minAzimuthAngle=-Math.PI*.4; controls.maxAzimuthAngle=Math.PI*.4;
  renderer.domElement.tabIndex=0; renderer.domElement.setAttribute('aria-label','3D blade display. Use the product list and feature buttons to change the view.');
  const gray = new THREE.MeshStandardMaterial({color:0xe6e9eb,roughness:.73});
  const white = new THREE.MeshStandardMaterial({color:0xf8fafc,roughness:.8});
  const navy = new THREE.MeshStandardMaterial({color:0x0e294f,roughness:.42,metalness:.23});
  const blue = new THREE.MeshStandardMaterial({color:BLUE,roughness:.6});
  const gallery = new THREE.Group(); scene.add(gallery);
  function box(w,h,d,x,y,z,material,shadow=false) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material); mesh.position.set(x,y,z);
    mesh.castShadow=shadow; mesh.receiveShadow=true; gallery.add(mesh); return mesh;
  }
  const floorTexture=unified?concreteTexture():null;
  const floorMat = new THREE.MeshStandardMaterial({color:unified?0x9ea4a8:0xb7bfc6,roughness:unified?.83:.51,metalness:unified?0:.18,map:floorTexture,bumpMap:floorTexture,bumpScale:.018});
  box(50,.12,50,0,-.08,0,floorMat);
  box(30,9,.2,0,4.5,-6,white);
  box(.2,9,unified?34:25,-13,4.5,unified?9:4,gray); box(.2,9,unified?34:25,13,4.5,unified?9:4,gray);
  box(30,unified?.13:.65,.04,0,unified?.85:2.2,-5.87,blue);
  for(const x of [-8.2,8.2]) {box(.6,8,.65,x,4,-3.5,gray,true);box(.86,.16,.9,x,.06,-3.5,navy);}
  if(!unified)box(30,.16,22,0,8,-2,white);
  const lightMaterial = new THREE.MeshBasicMaterial({color:0xffffff});
  if(unified){
    box(26.2,.12,34,0,8.75,9,white);
    const beam=new THREE.MeshStandardMaterial({color:0x7f939e,roughness:.65,metalness:.3});
    for(const z of [-5,0,5]){
      box(25,.36,.22,0,8.4,z,beam,true);
      box(25,.055,.48,0,8.59,z,beam);box(25,.055,.48,0,8.2,z,beam);
      for(const x of [-7,0,7]){box(4.8,.1,.65,x,8.03,z,gray);box(4.5,.025,.49,x,7.965,z,lightMaterial);}
    }
    box(30,.3,.2,0,.15,-5.83,gray);
    for(const x of [-12,12]){box(.18,8.5,15,x,4.25,-.5,gray);box(.44,.18,15,x,8.5,-.5,beam);}
  }else for(const x of [-5,0,5])box(.12,.035,6,x,7.84,-1,lightMaterial);
  const textureLoader = new THREE.TextureLoader();
  const logoTex = textureLoader.load('assets/logo-scene.svg',()=>{needsRender=true;}); logoTex.colorSpace=THREE.SRGBColorSpace;
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(4.6,1.55),new THREE.MeshBasicMaterial({map:logoTex,transparent:true,depthWrite:false,toneMapped:false}));
  logo.position.set(0,unified?7:circular?7:4.85,-5.84);if(circular)logo.scale.setScalar(.7);gallery.add(logo);
  if(unified){logo.position.set(-1.1,6.5,-5.84);logo.scale.setScalar(.95);}
  if(!unified){box(9.15,.76,3.9,0,.38,.45,navy,true);box(8.9,.06,3.7,0,.79,.45,blue);}
  const board = new THREE.Group(); board.position.set(unified?-4.9:0,circular?3.4:2.65,unified?2.4:.1); board.rotation.x=-.56; scene.add(board);
  const boardMaterial=new THREE.MeshStandardMaterial({color:unified?0x192530:0xc0c7cf,metalness:unified?.15:.32,roughness:unified?.7:.5});
  const backing = new THREE.Mesh(new THREE.BoxGeometry(8.65,circular?6.7:4.7,.17),boardMaterial); backing.castShadow=true; backing.receiveShadow=true; board.add(backing);
  const circularBoard=new THREE.Group();
  if(unified){
    scene.add(circularBoard);circularBoard.position.set(5.35,3.85,-1.15);
    const back=new THREE.Mesh(new THREE.BoxGeometry(8.65,6.7,.18),white);back.castShadow=back.receiveShadow=true;circularBoard.add(back);
    for(const x of [1.45,9.25]){box(.14,7.35,.18,x,3.67,-1.3,navy,true);box(1.15,.14,2,x,.07,-1.1,navy,true);}
    // Restore the original inclined bandsaw sample tray on its cabinet.
    box(9.15,.76,3.9,-4.9,.38,2.75,navy,true);
    box(8.9,.06,3.7,-4.9,.79,2.75,blue);
    box(8.7,.46,.04,-4.9,.39,4.72,gray);
    for(const x of [-7.1,-2.7]){box(4.12,.41,.025,x,.4,4.75,white);box(.43,.035,.07,x,.53,4.8,navy);}
    const sign=(text,x,y,z,w)=>{const c=document.createElement('canvas');c.width=1024;c.height=110;const t=c.getContext('2d');t.fillStyle='#0051d2';t.fillRect(0,0,1024,110);t.fillStyle='white';t.font='500 43px Arial';t.textAlign='center';t.fillText(text,512,72);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(w,.65),new THREE.MeshBasicMaterial({map:tex,toneMapped:false}));m.position.set(x,y,z);gallery.add(m);};
    sign('CIRCULAR SAW BLADES',5.35,7.2,-1.02,8.65);
    const trayFrame=new THREE.Mesh(new THREE.BoxGeometry(8.92,4.96,.12),new THREE.MeshStandardMaterial({color:0x71818e,metalness:.6,roughness:.4}));trayFrame.position.z=-.07;board.add(trayFrame);
  }
  const grain = brushedTexture();
  const steel = new THREE.MeshPhysicalMaterial({color:0x89949e,metalness:.7,roughness:.5,anisotropy:.35,bumpMap:grain,bumpScale:.002,envMapIntensity:.55});
  const blades = products.map((p,i)=>{
    if(circular || unified&&isCircular(p)){
      const index=unified?products.filter(isCircular).findIndex(x=>x.id===p.id):i;
      const sample=circularBlade(p,.92);sample.position.set((index%3-1)*2.7,2.18-Math.floor(index/3)*2.18,.13);(unified?circularBoard:board).add(sample);
      return {product:p,sample,marker:new THREE.Vector3(0,-1.14,.1)};
    }
    const index=unified?products.filter(x=>!isCircular(x)).findIndex(x=>x.id===p.id):i;
    const sample = sampleBlade(p.name,index,steel); sample.children[0].userData.productId=p.id;sample.position.set(0,1.72-index*.85,.12); board.add(sample);
    const shadow=new THREE.Mesh(new THREE.PlaneGeometry(7.56,.68),new THREE.MeshBasicMaterial({map:contactShadowTexture(),transparent:true,depthWrite:false}));
    shadow.position.set(0,sample.position.y-.03,.092);board.add(shadow);
    return {product:p,sample,marker:new THREE.Vector3(-2.8,0,.09)};
  });
  // The selected sample is a separate inspection object so the hall remains intact.
  const inspection = new THREE.Group(); inspection.position.set(0,3.4,1.8); scene.add(inspection); inspection.visible=false;
  let inspectedMesh = null, selected = null, mode='overview', activeFeature=null, transition=null,stationRange=null;
  function enforceBounds(){
    if(!unified)return;
    const bounded=constrainShowroomCamera(camera.position,controls.target,mode==='product'||mode==='feature');
    camera.position.set(bounded.position.x,bounded.position.y,bounded.position.z);
    controls.target.set(bounded.target.x,bounded.target.y,bounded.target.z);
    camera.lookAt(controls.target);
  }
  function viewLens(overview=false){
    if(!unified)return;
    camera.fov=camera.aspect<1?(overview?Math.min(100,Math.max(39,THREE.MathUtils.radToDeg(2*Math.atan(21/(44*camera.aspect)))+4)):60):39;
    camera.updateProjectionMatrix();
  }
  const inspectionSteel = new THREE.MeshPhysicalMaterial({color:0xb9c1c9,metalness:.68,roughness:.55,roughnessMap:grain,bumpMap:grain,bumpScale:.001,envMapIntensity:1.1});
  const target = new THREE.Vector3(), featurePoints={tooth:new THREE.Vector3(.05,.52,.08),body:new THREE.Vector3(2.2,-.15,.08),pitch:new THREE.Vector3(-2.1,.52,.08)};
  const markerElements=[];
  function clearMarkers(){markers.replaceChildren();markerElements.length=0;}
  function marker(label, point, action,compact=false,id=null) {
    const element=document.createElement('button');element.type='button';element.className='scene-marker';element.setAttribute('aria-label',label);
    if(compact)element.classList.add('is-feature');
    element.innerHTML=`<span class="marker-dot">${window.AlfaExperience.icon('plus')}</span><span class="marker-name"></span>`;
    element.querySelector('.marker-name').textContent=label;
    element.addEventListener('click',action);markers.append(element);markerElements.push({element,point});
    if(id && onHover){element.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')onHover(id);});element.addEventListener('focus',()=>onHover(id));}
  }
  function overviewMarkers(){
    clearMarkers();
    if(unified&&mode==='overview'){
      marker('Bimetal bandsaws',()=>board.localToWorld(new THREE.Vector3(0,2.7,.2)),()=>onStation?.('bimetal-bandsaws'));
      marker('Circular saw blades',()=>new THREE.Vector3(5.35,7.8,-1),()=>onStation?.('circular-saws'));return;
    }
    if(unified&&mode!=='station')return;
    blades.filter(b=>!unified||b.product.category===stationRange).forEach(b=>marker(b.product.name,()=>b.sample.localToWorld(b.marker.clone()),()=>onSelect(b.product.id),false,circular||unified?b.product.id:null));
  }
  function featureMarkers(){clearMarkers();if(circular||selected&&isCircular(selected.product))return;for(const [id,point] of Object.entries(featurePoints))marker(({tooth:'Tooth geometry',body:'Blade body',pitch:'Tooth pitch'})[id],()=>inspection.localToWorld(point.clone()),()=>onFeature?.(id),true);}
  function move(position,look,instant=false) {
    needsRender=true;
    controls.enabled=false;
    container.dataset.cameraMoving='true';
    if(instant || reducedMotion()) {camera.position.copy(position);controls.target.copy(look);controls.update();enforceBounds();controls.enabled=true;transition=null;container.dataset.cameraMoving='false';return;}
    transition={start:performance.now(),from:camera.position.clone(),to:position.clone(),targetFrom:controls.target.clone(),targetTo:look.clone()};
  }
  const overviewPose=()=>({position:new THREE.Vector3(.8,unified?6.8:circular?6.1:5.6,Math.max(unified?20:circular?16:13.4,(unified?21:9.2)/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.aspect)*1.12)),look:new THREE.Vector3(0,unified?3.1:circular?3.7:2.9,unified?.7:-.3)});
  function overview(instant=false){
    mode='overview';selected=null;inspection.visible=false;board.visible=true;circularBoard.visible=unified;gallery.visible=true;
    viewLens(true);controls.enablePan=unified;controls.zoomToCursor=false;controls.minPolarAngle=unified?Math.PI*.38:.12;controls.maxPolarAngle=Math.PI*.49;
    controls.minAzimuthAngle=-Math.PI*(unified?.27:.4);controls.maxAzimuthAngle=Math.PI*(unified?.27:.4);
    controls.minDistance=unified?1.1:8;controls.maxDistance=unified?24:23;const pose=overviewPose();move(pose.position,pose.look,instant);overviewMarkers();
  }
  function focusStation(range,instant=false){
    if(!unified)return;
    mode='station';stationRange=range;selected=null;activeFeature=null;inspection.visible=false;board.visible=true;circularBoard.visible=true;gallery.visible=true;overviewMarkers();
    viewLens();controls.enablePan=true;controls.zoomToCursor=false;controls.minPolarAngle=Math.PI*.38;controls.maxPolarAngle=Math.PI*.49;
    controls.minAzimuthAngle=-Math.PI*.27;controls.maxAzimuthAngle=Math.PI*.27;
    const look=new THREE.Vector3(range==='circular-saws'?5.35:-4.9,range==='circular-saws'?3.85:2.65,range==='circular-saws'?-.8:2.4);
    const distance=Math.max(range==='circular-saws'?13.3:12,9.2/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.aspect)*1.1);
    controls.minDistance=1.1;controls.maxDistance=24;move(look.clone().add(new THREE.Vector3(.2,range==='circular-saws'?1:4,distance)),look,instant);
  }
  function select(id,instant=false){
    const b=blades.find(b=>b.product.id===id);if(!b)return;
    const selectedCircular=circular||isCircular(b.product);
    mode='product';selected=b;activeFeature=null;board.visible=false;circularBoard.visible=false;gallery.visible=false;inspection.visible=true;
    viewLens();controls.enablePan=false;controls.zoomToCursor=false;controls.minPolarAngle=.3;controls.maxPolarAngle=Math.PI*.62;
    controls.minAzimuthAngle=-Math.PI*.4;controls.maxAzimuthAngle=Math.PI*.4;
    if(inspectedMesh){
      inspection.remove(inspectedMesh);
      const discardedTextures=new Set(),discardedMaterials=new Set();
      inspectedMesh.traverse(obj=>{
        obj.geometry?.dispose();
        if(inspectedMesh.userData.circular && obj.material){discardedMaterials.add(obj.material);for(const value of Object.values(obj.material))if(value?.isTexture)discardedTextures.add(value);}
        else if(obj.material?.map?.isCanvasTexture){discardedTextures.add(obj.material.map);discardedMaterials.add(obj.material);}
      });
      discardedTextures.forEach(t=>t.dispose());discardedMaterials.forEach(m=>m.dispose());
    }
    if(selectedCircular)inspectedMesh=circularBlade(b.product,1.65);
    else{inspectedMesh=sampleBlade(b.product.name,products.filter(p=>!isCircular(p)).indexOf(b.product),inspectionSteel);inspectedMesh.scale.y=2.25;inspectedMesh.children[1].scale.y=1/2.25;}
    inspectedMesh.userData.circular=selectedCircular;
    inspection.add(inspectedMesh);
    inspection.rotation.set(-.08,-.08,.02);controls.minDistance=2;controls.maxDistance=unified?22:18;
    const look=new THREE.Vector3(0,3.4,1.8), distance=selectedCircular?Math.max(6,3.7/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*Math.min(1,camera.aspect))*1.2):Math.max(7.7,7.5/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.aspect)*1.22);
    move(new THREE.Vector3(.6,4.5,distance+1.8),look,instant);featureMarkers();
  }
  function feature(id,instant=false){
    if(!selected || !featurePoints[id])return;
    mode='feature';activeFeature=id;const point=inspection.localToWorld(featurePoints[id].clone());
    const distance=camera.aspect<1.2?4.5:3.5;
    move(point.clone().add(new THREE.Vector3(.1,.45,distance)),point,instant);
    markerElements.forEach(m=>{m.element.hidden=true;});
  }
  const abort = new AbortController();
  function highlight(id){
    if(!circular&&!unified)return;blades.forEach(b=>{if(b.sample.userData.halo)b.sample.userData.halo.visible=b.product.id===id;});needsRender=true;
  }
  if(circular||unified){
    const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let down=null;
    const hit=e=>{
      const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);
      const meshes=mode==='overview'||mode==='station'?blades.flatMap(b=>b.sample.children.filter(c=>c.userData.productId)):[];
      return raycaster.intersectObjects(meshes,false)[0]?.object.userData.productId;
    };
    renderer.domElement.addEventListener('pointermove',e=>{if(e.pointerType==='touch'||e.buttons)return;const id=hit(e);renderer.domElement.style.cursor=id?'pointer':'grab';if(id)onHover?.(id);},{signal:abort.signal});
    renderer.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};},{signal:abort.signal});
    renderer.domElement.addEventListener('pointerup',e=>{if(down && Math.hypot(e.clientX-down.x,e.clientY-down.y)<6){const id=hit(e);if(id)onSelect(id);}down=null;},{signal:abort.signal});
  }
  controls.addEventListener('start',()=>{transition=null;});
  controls.addEventListener('change',()=>{enforceBounds();needsRender=true;});
  renderer.domElement.addEventListener('keydown',e=>{
    if(e.key==='Home'){e.preventDefault();selected?select(selected.product.id):overview();}
  },{signal:abort.signal});
  const watchSize=new ResizeObserver(()=>{state.size();if(mode==='overview')overview(true);else if(mode==='station')focusStation(stationRange,true);else if(mode==='product')select(selected.product.id,true);else if(mode==='feature'&&activeFeature)feature(activeFeature,true);});watchSize.observe(container);
  overview(true);
  function draw(now){
    if(state.disposed)return;
    if(!document.hidden){
      if(transition){
        const elapsed=Math.min(1,(now-transition.start)/850),t=elapsed<.5?4*elapsed*elapsed*elapsed:1-Math.pow(-2*elapsed+2,3)/2;
        camera.position.lerpVectors(transition.from,transition.to,t);controls.target.lerpVectors(transition.targetFrom,transition.targetTo,t);
        if(elapsed===1){transition=null;controls.enabled=true;container.dataset.cameraMoving='false';}
      }
      controls.update();
      enforceBounds();
      if(needsRender || transition){
        renderer.render(scene,camera);needsRender=false;
        container.dataset.cameraPosition=camera.position.toArray().map(n=>n.toFixed(4)).join(',');
        container.dataset.cameraTarget=controls.target.toArray().map(n=>n.toFixed(4)).join(',');
        const {width,height}=container.getBoundingClientRect();
        for(const item of markerElements){
          if(mode==='feature'){item.element.hidden=true;continue;}
          target.copy(item.point()).project(camera);
          const x=(target.x*.5+.5)*width,y=(-target.y*.5+.5)*height;
          item.element.hidden=target.z>1 || target.z<0 || x<20 || x>width-20 || y<20 || y>height-(circular?20:60);
          item.element.style.left=x+'px';item.element.style.top=y+'px';
        }
      }
    }
    state.setFrame(requestAnimationFrame(draw));
  }
  state.setFrame(requestAnimationFrame(draw));
  return {overview,select,feature,highlight,focusStation,zoom(factor){transition=null;controls.enabled=true;container.dataset.cameraMoving='false';const offset=camera.position.clone().sub(controls.target);const distance=THREE.MathUtils.clamp(offset.length()*factor,controls.minDistance,controls.maxDistance);camera.position.copy(controls.target).add(offset.setLength(distance));needsRender=true;controls.update();},resize:state.size,dispose(){abort.abort();watchSize.disconnect();clearMarkers();controls.dispose();state.dispose();}};
}
