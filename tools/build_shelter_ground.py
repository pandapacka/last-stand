from PIL import Image,ImageDraw,ImageOps
from pathlib import Path
p=Path('assets/atlas-sprites/nature')
im=Image.open(p/'grass.png').convert('RGB')
w,h=im.size
tile=im.crop((w//4,h//4,3*w//4,3*h//4)).resize((96,48),Image.Resampling.LANCZOS)
patch=Image.new('RGB',(192,96));patch.paste(tile,(0,0));patch.paste(ImageOps.mirror(tile),(96,0));patch.paste(ImageOps.flip(patch.crop((0,0,192,48))),(0,48))
ground=Image.new('RGBA',(2161,1081))
for y in range(0,1081,96):
 for x in range(0,2161,192):ground.paste(patch,(x,y))
def point(x,y):return (int(864+54*(x-y)),int(27*(x+y)))
mask=Image.new('L',ground.size);ImageDraw.Draw(mask).polygon([point(0,0),point(24,0),point(24,16),point(0,16)],fill=255)
d=ImageDraw.Draw(ground)
for x in range(25):d.line([point(x,0),point(x,16)],fill='#959775',width=1)
for y in range(17):d.line([point(0,y),point(24,y)],fill='#959775',width=1)
d.line([point(4,3),point(11,3),point(11,9),point(4,9),point(4,3)],fill='#b3a27c',width=3)
ground.putalpha(mask);ground.save(p/'shelter-ground.png',optimize=True)
