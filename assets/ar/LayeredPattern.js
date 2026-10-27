import * as THREE from '../vendor/three/build/three.module.js';
import {animate,easeOutBack,easeInOutCubic} from './Tween.js';
import {OrnamentEffects} from './OrnamentEffects.js';

export class LayeredPattern {
  constructor({reducedMotion=false,onWarning=()=>{}}={}){
    this.group=new THREE.Group();this.entries=[];this.tweens=[];this.generation=0;this.disposed=false;this.effects=null;this.presentation={};
    this.reducedMotion=reducedMotion;this.onWarning=onWarning;this.amount=1;this.expanded=false;this.selected=-1;this.playCount=0;this.state='collapsed';
  }
  async load(data){
    this.clear();this.disposed=false;this.presentation=data.presentation||{};const generation=++this.generation;
    const definitions=(data.layers||[]).slice(0,8),loader=new THREE.TextureLoader();
    // Sequential loading bounds peak mobile decoding memory. Missing layers are deliberately skipped.
    let size=null;
    for(let index=0;index<definitions.length;index++){
      const definition=definitions[index];if(!definition.src)continue;
      let texture;
      try{
        texture=await loader.loadAsync(definition.src);
        if(this.disposed||generation!==this.generation){texture.dispose();return false;}
        const dimensions=[texture.image.width,texture.image.height];
        if(size&&(size[0]!==dimensions[0]||size[1]!==dimensions[1])){texture.dispose();this.onWarning('图层尺寸不一致，已跳过：'+definition.name);continue;}
        size=dimensions;texture.colorSpace=THREE.SRGBColorSpace;
        const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,side:THREE.DoubleSide,alphaTest:.01});
        const geometry=new THREE.PlaneGeometry(1,dimensions[1]/dimensions[0]);
        const mesh=new THREE.Mesh(geometry,material);
        mesh.renderOrder=index+1;mesh.userData.layerIndex=this.entries.length;
        const reliefDepth=Number(this.presentation.reliefDepth)||0,reliefSteps=Math.min(10,Math.max(0,Math.floor(Number(this.presentation.reliefSteps)||0)));
        for(let step=1;step<=reliefSteps;step++){
          const sideMaterial=new THREE.MeshBasicMaterial({map:texture,color:0x68451e,transparent:true,depthWrite:true,side:THREE.DoubleSide,alphaTest:.035});
          const side=new THREE.Mesh(geometry.clone(),sideMaterial);side.position.z=-reliefDepth*step/reliefSteps;side.renderOrder=index;side.userData.reliefSide=true;mesh.add(side);
        }
        // Keep only alpha bytes for hit testing (1 MB per 1024 layer); never read camera frames.
        const mask=document.createElement('canvas');mask.width=dimensions[0];mask.height=dimensions[1];
        const ctx=mask.getContext('2d',{willReadFrequently:true});ctx.drawImage(texture.image,0,0);
        let pixels=null;try{const rgba=ctx.getImageData(0,0,...dimensions).data;pixels=new Uint8Array(dimensions[0]*dimensions[1]);for(let p=0;p<pixels.length;p++)pixels[p]=rgba[p*4+3];}catch{}
        this.entries.push({mesh,definition,index,depth:Number.isFinite(definition.depth)?definition.depth:index*.012,mask:{pixels,width:dimensions[0],height:dimensions[1]}});
        this.group.add(mesh);
      }catch(error){texture?.dispose();if(generation===this.generation&&!this.disposed)this.onWarning('部分图层未能加载：'+(definition.name||'未命名图层'));}
    }
    if(this.entries.length&&this.presentation.ornament){
      this.effects=new OrnamentEffects({aspect:size?size[1]/size[0]:1,seed:Number(this.presentation.haloSeed)||1});
      this.group.add(this.effects.group);
    }
    return this.entries.length>0;
  }
  mount(parent){parent.add(this.group);return this;}
  stopTweens(){this.tweens.forEach(t=>t.cancel());this.tweens=[];}
  playExplosion(now=performance.now()){
    if(!this.entries.length||this.disposed)return;
    this.stopTweens();this.expanded=true;this.effects?.setExpanded(true);this.selected=-1;this.state='playing';this.playCount++;
    this.entries.forEach((entry,i)=>{
      const {mesh}=entry,target=entry.depth*this.amount;
      mesh.position.set(0,0,0);mesh.rotation.set(0,0,0);mesh.scale.setScalar(i? .93:1);mesh.material.opacity=i?.2:1;
      if(!i){
        if(this.presentation.animateMain){mesh.position.z=target-.075;mesh.scale.setScalar(.88);mesh.material.opacity=.28;this.tweens.push(animate(0,1,this.reducedMotion?0:880,(_,t)=>{const eased=easeOutBack(t);mesh.position.z=target-.075*(1-eased);mesh.scale.setScalar(.88+.12*t);mesh.material.opacity=.28+.72*Math.min(1,t*1.65);},()=>{mesh.position.set(0,0,target);mesh.scale.setScalar(1);mesh.material.opacity=1;},0,{manual:true,start:now}));}
        else mesh.position.z=target;
        return;
      }
      this.tweens.push(animate(0,1,this.reducedMotion?0:680,(_,t)=>{
        mesh.position.z=target*easeOutBack(t);
        mesh.scale.setScalar(t<.7?.93+.105*(1-(1-t/.7)**3):1.035-.035*((t-.7)/.3));
        mesh.material.opacity=.2+.8*Math.min(1,t*1.8);
      },()=>{mesh.position.set(0,0,target);mesh.scale.setScalar(1);mesh.rotation.set(0,0,0);mesh.material.opacity=1;},this.reducedMotion?0:i*125,{manual:true,start:now}));
    });
    this.update(now);
  }
  collapse(now=performance.now()){
    this.stopTweens();this.expanded=false;this.effects?.setExpanded(false);this.selected=-1;this.state='collapsing';
    this.entries.forEach(({mesh})=>{
      const z=mesh.position.z,scale=mesh.scale.x,opacity=mesh.material.opacity;
      this.tweens.push(animate(0,1,this.reducedMotion?0:320,t=>{mesh.position.set(0,0,z*(1-t));mesh.scale.setScalar(scale+(1-scale)*t);mesh.rotation.set(0,0,0);mesh.material.opacity=opacity+(1-opacity)*t;},()=>{mesh.position.set(0,0,0);},0,{manual:true,start:now,easing:easeInOutCubic}));
    });this.update(now);
  }
  setExplodeAmount(value){this.amount=Math.min(3,Math.max(0,Number(value)||0));if(this.expanded)this.transitionSelection();}
  transitionSelection(){
    this.stopTweens();const now=performance.now();
    this.entries.forEach(({mesh,depth},i)=>{
      const z=mesh.position.z,opacity=mesh.material.opacity;
      const targetZ=(this.expanded?depth*this.amount:0)+(i===this.selected?.018:0),alpha=this.selected<0||this.selected===i?1:.15;
      mesh.scale.setScalar(1);mesh.rotation.set(0,0,0);
      this.tweens.push(animate(0,1,this.reducedMotion?0:250,t=>{mesh.position.set(0,0,z+(targetZ-z)*t);mesh.material.opacity=opacity+(alpha-opacity)*t;},()=>{mesh.position.set(0,0,targetZ);mesh.material.opacity=alpha;},0,{manual:true,start:now}));
    });
  }
  highlightLayer(index){if(!this.entries[index])return;this.selected=index;this.transitionSelection();}
  clearHighlight(){this.selected=-1;this.transitionSelection();}
  pick(raycaster){return this.pickDetailed(raycaster)?.layerIndex??-1;}
  pickDetailed(raycaster){
    for(const hit of raycaster.intersectObjects(this.entries.map(e=>e.mesh))){
      const i=hit.object.userData.layerIndex,mask=this.entries[i].mask;
      if(hit.uv&&mask.pixels){const x=Math.min(mask.width-1,Math.max(0,Math.floor(hit.uv.x*mask.width))),y=Math.min(mask.height-1,Math.max(0,Math.floor((1-hit.uv.y)*mask.height)));if(mask.pixels[y*mask.width+x]<40)continue;}
      return {layerIndex:i,uv:hit.uv?{x:hit.uv.x,y:hit.uv.y}:null};
    }return null;
  }
  update(time){this.tweens.forEach(t=>t.update(time));this.tweens=this.tweens.filter(t=>!t.finished);this.effects?.update(time);if(!this.tweens.length)this.state=this.expanded?'active':'collapsed';}
  clear(){this.stopTweens();this.effects?.dispose();this.effects=null;this.entries.forEach(({mesh})=>{mesh.children.forEach(child=>{child.geometry?.dispose();child.material?.dispose();});mesh.geometry.dispose();mesh.material.map?.dispose();mesh.material.dispose();});this.group.clear();this.entries=[];this.selected=-1;this.state='collapsed';this.expanded=false;this.presentation={};}
  dispose(){this.disposed=true;this.generation++;this.clear();this.group.removeFromParent();}
}
