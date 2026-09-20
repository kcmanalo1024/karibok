export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export function imageDimensions(bytes, type) {
 const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
 let width, height;
 if (type === 'image/png' && bytes.length >= 24 && [137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n) && v.getUint32(12)===0x49484452) {
  width=v.getUint32(16); height=v.getUint32(20);
 } else if (type === 'image/jpeg' && bytes[0]===255 && bytes[1]===216) {
  let p=2;
  while(p+3<bytes.length) {
   if(bytes[p++]!==255) break;
   while(bytes[p]===255)p++;
   const marker=bytes[p++];
   if(marker===0xda||marker===0xd9)break;
   if(marker===0x01||(marker>=0xd0&&marker<=0xd7))continue;
   if(p+2>bytes.length)break;
   const length=v.getUint16(p);
   if(length<2||p+length>bytes.length)break;
   if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)&&length>=8){height=v.getUint16(p+3);width=v.getUint16(p+5);break;}
   p+=length;
  }
 }
 if(!width||!height)throw Error('This file is not a valid JPG or PNG image.');
 if(width>12000||height>12000||width*height>24000000)throw Error('This image is too large. Choose an image up to 24 megapixels and 12,000 pixels per side.');
 return {width,height};
}
export function cropRect(width,height,zoom,position) {
 const size=Math.min(width,height)/zoom;
 return {x:(width-size)*position.x,y:(height-size)*position.y,size};
}
export function drawCrop(canvas,image,zoom,position,size) {
 canvas.width=canvas.height=size;
 const ctx=canvas.getContext('2d');
 if(!ctx)throw Error('Image editing is unavailable in this browser.');
 const crop=cropRect(image.naturalWidth,image.naturalHeight,zoom,position);
 ctx.save();ctx.beginPath();ctx.arc(size/2,size/2,size/2,0,Math.PI*2);ctx.clip();
 ctx.imageSmoothingQuality='high';
 ctx.drawImage(image,crop.x,crop.y,crop.size,crop.size,0,0,size,size);ctx.restore();
}
export async function encodeCrop(image,zoom,position) {
 const canvas=document.createElement('canvas');
 for(const size of [512,256]) {
  drawCrop(canvas,image,zoom,position,size);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.82));
  if(blob&&blob.size<=200*1024) {
   return await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Could not prepare your picture. Please try again.'));reader.readAsDataURL(blob);});
  }
 }
 throw Error('Could not compress this picture. Please choose another image.');
}
