from pathlib import Path
from PIL import Image
import numpy as np
root=Path.cwd()
source=Image.open(root/'public/karibok-logo.jpg').convert('RGB')
rgb=np.asarray(source).astype(np.float32)
foreground=(rgb[:,:,0]>100)&(rgb[:,:,0]>rgb[:,:,1]*1.5)
color=np.median(rgb[foreground],axis=0)
coverage=np.clip(rgb[:,:,0]/color[0],0,1)
coverage[(coverage<0.12)|(rgb[:,:,0]-rgb[:,:,1]<8)]=0
coverage[coverage>0.95]=1
clean=rgb.copy()
edge=(coverage>0)&(coverage<1)
clean[edge]=np.clip(rgb[edge]/coverage[edge,None],0,255)
clean[coverage==0]=0
rgba=np.dstack((clean,np.rint(coverage*255))).astype(np.uint8)
logo=Image.fromarray(rgba)
logo.save(root/'public/karibok-logo.png',optimize=True)
icon=Image.new('RGBA',(256,256),(0,0,0,0))
thumb=logo.copy();thumb.thumbnail((240,240),Image.Resampling.LANCZOS)
icon.alpha_composite(thumb,((256-thumb.width)//2,(256-thumb.height)//2))
icon.save(root/'public/favicon.png',optimize=True)
icon.save(root/'public/favicon.ico',sizes=[(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)])
preview=Image.new('RGBA',logo.size,'#fffdf9');preview.alpha_composite(logo);preview.convert('RGB').save(root/'logo-transparency-check.png')
assert logo.getchannel('A').getextrema()==(0,255)
assert logo.getpixel((0,0))[3]==0
print('Transparent logo and favicon saved. Alpha range:',logo.getchannel('A').getextrema(),'Original dimensions:',logo.size,'Foreground color:',color.tolist())
