import test from 'node:test';
import assert from 'node:assert/strict';
import {imageDimensions,cropRect} from '../src/profileCrop.js';
function png(width,height){const bytes=new Uint8Array(24);bytes.set([137,80,78,71,13,10,26,10]);const view=new DataView(bytes.buffer);view.setUint32(12,0x49484452);view.setUint32(16,width);view.setUint32(20,height);return bytes;}
test('rejects invalid, spoofed and excessive dimensions before decoding',()=>{
 assert.deepEqual(imageDimensions(png(800,600),'image/png'),{width:800,height:600});
 for(const bytes of [new Uint8Array(),png(0,600),png(6000,6000),png(13000,1)])assert.throws(()=>imageDimensions(bytes,'image/png'));
 assert.throws(()=>imageDimensions(png(800,600),'image/jpeg'));
 assert.throws(()=>imageDimensions(new Uint8Array([255,216,255,192,255,255]),'image/jpeg'));
 const jpeg=new Uint8Array([255,216,255,192,0,8,8,2,88,3,32,0]);
 assert.deepEqual(imageDimensions(jpeg,'image/jpeg'),{width:800,height:600});
});
test('crop stays within portrait and landscape boundaries at every zoom and edge',()=>{
 for(const [w,h] of [[1200,800],[800,1200],[1,1]])for(const zoom of [1,2,4])for(const x of [0,.5,1])for(const y of [0,.5,1]){
  const r=cropRect(w,h,zoom,{x,y});assert.ok(r.x>=0&&r.y>=0&&r.x+r.size<=w&&r.y+r.size<=h);
 }
 assert.deepEqual(cropRect(1200,800,1,{x:.5,y:.5}),{x:200,y:0,size:800});
});
