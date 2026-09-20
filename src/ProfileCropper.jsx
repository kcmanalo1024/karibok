import React,{useEffect,useRef,useState} from 'react';
import {X} from 'lucide-react';
import {MAX_FILE_BYTES,imageDimensions,cropRect,drawCrop,encodeCrop} from './profileCrop';
import './profile-cropper.css';

export default function ProfileCropper({file,onCancel,onSave}) {
 const dialog=useRef(),preview=useRef(),drag=useRef(),alive=useRef(true);
 const [image,setImage]=useState(null),[zoom,setZoom]=useState(1),[position,setPosition]=useState({x:.5,y:.5}),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{const previous=document.activeElement;dialog.current.showModal();alive.current=true;return()=>{alive.current=false;previous?.focus();};},[]);
 useEffect(()=>{
  let active=true,url,img;
  (async()=>{try{
   if(!['image/jpeg','image/png'].includes(file.type))throw Error('Choose a JPG or PNG image.');
   if(!file.size||file.size>MAX_FILE_BYTES)throw Error('Choose a non-empty image up to 10 MB.');
   imageDimensions(new Uint8Array(await file.arrayBuffer()),file.type);
   if(!active)return;
   url=URL.createObjectURL(file);img=new Image();img.src=url;
   await img.decode();
   if(active)setImage(img);
  }catch(e){if(active)setError(e.message||'This image could not be opened.');}})();
  return()=>{active=false;if(url)URL.revokeObjectURL(url);if(img)img.src='';};
 },[file]);
 useEffect(()=>{if(image)try{drawCrop(preview.current,image,zoom,position,128);}catch(e){setError(e.message);}},[image,zoom,position]);
 const move=(x,y)=>setPosition(p=>({x:Math.max(0,Math.min(1,p.x+x)),y:Math.max(0,Math.min(1,p.y+y))}));
 const save=async()=>{if(!image||busy)return;setBusy(true);setError('');try{const photo=await encodeCrop(image,zoom,position);if(alive.current)await onSave(photo);}catch(e){if(alive.current)setError(e.message||'Could not save your picture.');}finally{if(alive.current)setBusy(false);}};
 const crop=image?cropRect(image.naturalWidth,image.naturalHeight,zoom,position):null;
 return <dialog ref={dialog} className="modal profile-cropper" aria-labelledby="crop-title" aria-describedby="crop-help" onCancel={e=>{e.preventDefault();if(!busy)onCancel();}}>
  <div className="modal-head"><h2 id="crop-title">Crop profile picture</h2><button className="icon-btn" aria-label="Close cropper" disabled={busy} onClick={onCancel}><X size={18}/></button></div>
  <p id="crop-help" className="muted">Drag to position your picture. Use the zoom slider to get closer.</p>
  {error&&<p role="alert" className="crop-error">{error}</p>}
  {!image&&!error&&<p role="status">Opening image…</p>}
  {image&&<>
   <div className="crop-layout">
    <div className="crop-stage" tabIndex={0} role="group" aria-label="Picture position. Use arrow keys to move the picture." onKeyDown={e=>{const delta={ArrowLeft:[.025,0],ArrowRight:[-.025,0],ArrowUp:[0,.025],ArrowDown:[0,-.025]}[e.key];if(delta&&!busy){e.preventDefault();move(...delta);}}}
     onPointerDown={e=>{if(busy||e.button!==0)return;e.currentTarget.focus();e.currentTarget.setPointerCapture(e.pointerId);drag.current={id:e.pointerId,x:e.clientX,y:e.clientY};}}
     onPointerMove={e=>{const d=drag.current;if(!d||d.id!==e.pointerId||busy)return;const scale=e.currentTarget.clientWidth/crop.size;move(image.naturalWidth>crop.size?-(e.clientX-d.x)/scale/(image.naturalWidth-crop.size):0,image.naturalHeight>crop.size?-(e.clientY-d.y)/scale/(image.naturalHeight-crop.size):0);drag.current={id:e.pointerId,x:e.clientX,y:e.clientY};}}
     onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}} onLostPointerCapture={()=>{drag.current=null;}}>
     <img src={image.src} alt="" draggable={false} style={{width:`${image.naturalWidth/crop.size*100}%`,height:`${image.naturalHeight/crop.size*100}%`,left:`${-crop.x/crop.size*100}%`,top:`${-crop.y/crop.size*100}%`}}/>
     <div className="crop-circle"/>
    </div>
    <div className="crop-preview"><canvas ref={preview} aria-label="Cropped profile picture preview" role="img"/><span className="muted">Preview</span></div>
   </div>
   <label className="field" htmlFor="crop-zoom">Zoom · {zoom.toFixed(1)}×<input id="crop-zoom" type="range" min="1" max="4" step=".01" value={zoom} disabled={busy} onChange={e=>setZoom(Number(e.target.value))}/></label>
  </>}
  <div className="modal-actions"><button className="secondary crop-reset" disabled={!image||busy} onClick={()=>{setZoom(1);setPosition({x:.5,y:.5});setError('');}}>Reset</button><button className="secondary" disabled={busy} onClick={onCancel}>Cancel</button><button className="primary" disabled={!image||busy} onClick={save}>{busy?'Saving…':'Save'}</button></div>
 </dialog>;
}
