from PIL import Image, ImageDraw, ImageFilter
import random, math
from pathlib import Path
random.seed(47)
S=1024
im=Image.new('RGBA',(S,S),(0,0,0,0))
d=ImageDraw.Draw(im,'RGBA')
def poly(points,fill,outline=None,width=2):
 d.polygon(points,fill=fill)
 if outline:d.line(points+[points[0]],fill=outline,width=width,joint='curve')
def line(points,fill,width=2):d.line(points,fill=fill,width=width,joint='curve')
# shadow and base
shadow=Image.new('RGBA',(S,S));sd=ImageDraw.Draw(shadow,'RGBA')
sd.ellipse((105,735,933,910),fill=(8,12,9,125))
shadow=shadow.filter(ImageFilter.GaussianBlur(30));im.alpha_composite(shadow);d=ImageDraw.Draw(im,'RGBA')
poly([(120,606),(492,405),(902,614),(528,826)],(83,71,52,255),(30,30,25,255),9)
# concrete isometric walls
poly([(143,438),(525,648),(525,798),(143,587)],(70,75,66,255),(30,36,31,255),8)
poly([(525,648),(884,453),(884,600),(525,798)],(96,96,83,255),(30,36,31,255),8)
# wall cracks, rust, rivets
for i in range(500):
 x=random.randrange(145,875);y=random.randrange(480,795)
 if x<525 and 438+(x-143)*.55<y<587+(x-143)*.55:
  c=random.choice([(35,42,37,115),(153,117,75,105),(25,28,27,80)])
 elif x>=525 and 648-(x-525)*.54<y<798-(x-525)*.54:
  c=random.choice([(39,44,40,115),(144,103,69,120),(26,30,26,90)])
 else:continue
 d.line((x,y,x+random.randint(-12,12),y+random.randint(2,16)),fill=c,width=random.randint(1,4))
# heavy metal roof
roof=[(123,432),(480,238),(900,448),(526,656)]
poly(roof,(54,63,58,255),(22,28,26,255),11)
poly([(137,430),(480,252),(884,453),(526,636)],(69,76,70,255))
# hundreds of roof seams, scratches and corrosion
for j in range(11):
 t=j/11
 x1=138+(480-138)*t;y1=432+(252-432)*t
 x2=526+(884-526)*t;y2=636+(453-636)*t
 line([(int(x1),int(y1)),(int(x2),int(y2))],(137,143,124,150),3)
 line([(int(x1+5),int(y1+4)),(int(x2+5),int(y2+4))],(25,31,29,170),2)
for i in range(1300):
 u=random.random();v=random.random()
 x=int((1-u)*(1-v)*137+u*(1-v)*480+u*v*884+(1-u)*v*526)
 y=int((1-u)*(1-v)*430+u*(1-v)*252+u*v*453+(1-u)*v*636)
 r=random.randint(1,5)
 d.ellipse((x-r,y-r,x+r,y+r),fill=random.choice([(145,92,54,80),(24,33,29,90),(164,159,122,50),(104,110,91,70)]))
# raised parapets
line([(123,432),(480,238),(900,448)],(148,150,133,255),14)
line([(123,432),(526,656),(900,448)],(29,38,35,255),12)
# windows
def window(x,y,w=54,h=65):
 poly([(x,y),(x+w,y-26),(x+w,y+h-26),(x,y+h)],(18,24,21,255),(21,25,22,255),9)
 poly([(x+8,y+7),(x+w-8,y-14),(x+w-8,y+h-38),(x+8,y+h-17)],(255,180,76,255))
 line([(x+w//2,y-6),(x+w//2,y+h-30)],(58,47,33,255),6)
 line([(x+6,y+h//2),(x+w-7,y+h//2-22)],(57,43,31,255),5)
window(597,677);window(757,589,47,58)
# left windows with opposite slant
for x,y in [(208,573),(371,661)]:
 poly([(x,y),(x+53,y+28),(x+53,y+88),(x,y+59)],(18,25,21,255),(21,25,21,255),9)
 poly([(x+8,y+11),(x+45,y+30),(x+45,y+72),(x+8,y+52)],(248,166,72,255))
 line([(x+27,y+16),(x+27,y+63)],(64,49,34,255),5)
# door with canopy
poly([(651,650),(734,606),(734,730),(651,777)],(21,26,24,255),(152,137,105,255),9)
poly([(617,637),(699,578),(790,620),(706,679)],(64,76,55,255),(168,154,110,255),8)
for j in range(8):
 x=622+j*20;y=641-j*10
 line([(x,y),(x+84,y+43)],(148,144,103,140),3)
for j in range(5):
 y=767+j*18
 poly([(643-j*9,y),(734-j*9,y-50),(760-j*9,y-35),(665-j*9,y+18)],(113-j*6,105-j*5,83-j*4,255),(45,43,36,255),3)
# layered tarpaulin shelters, stitched creases
poly([(70,509),(186,433),(322,513),(205,595)],(75,80,57,255),(185,169,123,255),7)
poly([(752,493),(866,433),(969,506),(846,569)],(70,78,54,255),(185,169,124,255),7)
for a,b in [((76,510),(205,595)),((185,437),(205,595)),((753,495),(846,569)),((868,440),(846,569))]:
 line([a,b],(167,159,113,180),4)
# boxes
for x,y in [(82,662),(125,681),(179,708),(857,680),(902,657),(831,713)]:
 poly([(x,y),(x+42,y-23),(x+86,y),(x+44,y+24)],(119,95,64,255),(47,43,34,255),4)
 poly([(x,y),(x+44,y+24),(x+44,y+66),(x,y+43)],(80,67,47,255),(44,39,30,255),4)
 poly([(x+44,y+24),(x+86,y),(x+86,y+42),(x+44,y+66)],(99,77,53,255),(44,39,30,255),4)
 line([(x+22,y-11),(x+66,y+12)],(176,146,99,255),4)
# red hanging flag
poly([(538,557),(641,504),(641,613),(538,665)],(122,45,37,255),(208,158,111,255),6)
d.ellipse((565,550,618,608),outline=(224,194,152,255),width=6)
line([(592,545),(592,615)],(224,194,152,255),5)
# tower antenna
line([(333,324),(371,66),(413,332)],(124,70,52,255),12)
for j in range(7):
 y=92+j*35
 line([(367-(y-66)*.14,y),(371+(y-66)*.16,y)],(165,87,58,255),7)
line([(348,180),(400,261)],(182,103,65,255),5)
d.ellipse((361,52,383,74),fill=(255,71,48,255))
# satellite dish and its support
poly([(609,352),(640,199),(684,195),(676,361)],(41,48,45,255),(20,25,23,255),8)
d.ellipse((538,76,780,261),fill=(184,181,157,255),outline=(50,59,55,255),width=16)
d.arc((558,90,757,243),10,340,fill=(106,111,100,255),width=7)
line([(659,169),(734,80)],(46,54,52,255),12)
d.ellipse((650,157,673,179),fill=(54,60,56,255))
# roof solar panels
for x,y in [(412,397),(508,445)]:
 poly([(x,y),(x+89,y-46),(x+143,y-19),(x+54,y+31)],(30,52,69,255),(154,160,150,255),6)
 for k in range(1,4):line([(x+k*22,y-k*11),(x+54+k*22,y+31-k*11)],(112,146,161,180),2)
# warm hanging bulbs
for x,y in [(620,668),(182,585),(813,612)]:
 d.ellipse((x-13,y-13,x+13,y+13),fill=(255,188,72,175))
 d.ellipse((x-5,y-5,x+5,y+5),fill=(255,239,165,255))
# ground detail
for i in range(120):
 x=random.randrange(140,860);y=random.randrange(805,900)
 d.line((x,y,x+random.randrange(-12,12),y+random.randrange(-5,5)),fill=(72,62,44,random.randrange(45,140)),width=2)
out=Path('assets/shelter/hq.png');out.parent.mkdir(parents=True,exist_ok=True)
im.save(out,optimize=True)
print(out,im.size)

# Render revision 0.18
