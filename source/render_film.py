from pathlib import Path
import sys,json,wave,math,subprocess,re,hashlib,functools
import numpy as np
from PIL import Image,ImageDraw,ImageFont
HERE=Path(__file__).resolve().parent;R=HERE.parents[2] if HERE.name=='source' else Path.cwd();W=HERE/'build-v10-film' if HERE.name=='source' else R/'work/midterm-ai-video';W.mkdir(exist_ok=True);O=HERE.parent if HERE.name=='source' else R/'outputs/BITE-Midterm-Ukulele';(O/'videos').mkdir(exist_ok=True);(O/'source').mkdir(exist_ok=True)
sys.path.insert(0,str(R/'work/media-python'));import imageio_ffmpeg as io
FF=io.get_ffmpeg_exe();FPS=24;SR=48000
PAPER='#f7f5ef';INK='#252622';CORAL='#f65336'
edit=json.loads((HERE/'film-edit.json').read_text(encoding='utf8'));scenes=edit['scenes'];D=sum(s['seconds'] for s in scenes);starts=np.r_[0,np.cumsum([s['seconds'] for s in scenes])];voices=[]
for s in scenes:
 raw=subprocess.run([FF,'-v','error','-i',str(HERE/'audio'/s['source_voice']),'-ar',str(SR),'-ac','1','-f','f32le','-'],capture_output=True,check=True).stdout;voices.append(np.frombuffer(raw,dtype='<f4'))
titles=[s['title'] for s in scenes];requirements=[s['requirement'] for s in scenes]
fonts={}
def font(z,b=False):
 key=(z,b)
 if key not in fonts:fonts[key]=ImageFont.truetype('C:/Windows/Fonts/NotoSansKR-'+('Bold' if b else 'Regular')+'.ttf',z)
 return fonts[key]
def text(d,x,y,s,z=24,c='white',b=False,anchor=None):d.text((x,y),s,font=font(z,b),fill=c,anchor=anchor)
def rr(d,bg,color,r=20):d.rounded_rectangle(bg,r,fill=color)
def logo(width,white=True):
 p=Image.open((O/'assets/logo' if HERE.name=='source' else R/'outputs/BITE-Logo-02')/('bite-logo-white.png' if white else 'bite-logo.png')).convert('RGBA');p=p.crop(p.getbbox());return p.resize((width,round(width*p.height/p.width)),Image.Resampling.LANCZOS)
SMALL=logo(84);BIG=logo(400)
BREAD=Image.open(O/'assets/saltbread.png').convert('RGBA');BREAD.thumbnail((126,84),Image.Resampling.LANCZOS)
@functools.lru_cache(None)
def wrap(s,width,z=25):
 out=[];line=''
 for word in s.split():
  candidate=(line+' '+word).strip()
  if font(z).getlength(candidate)>width and line:out.append(line);line=word
  else:line=candidate
 if line:out.append(line)
 return out

@functools.lru_cache(None)
def deco(n,idx):
 im=Image.new('RGBA',(1280,720),(0,0,0,0));d=ImageDraw.Draw(im)
 if n<9:
  for y in range(540,720):d.line((0,y,1280,y),fill=(12,14,10,round((y-540)/180*190)))
  for y in range(44,275):d.line((0,y,1280,y),fill=(12,14,10,round((275-y)/231*155)))
  rr(d,(46,79,46+font(18,True).getlength(requirements[n])+32,117),CORAL,18);text(d,62,84,requirements[n],18,b=True)
  if n in [0,1,5,6,7,8]:
   text(d,48,146,titles[n],35,b=True)
  if n in [2,4]:
   rr(d,(48,420,1232,594),(247,245,239,226),22);text(d,72,436,'모집 완료 · 반 접시 조건',21,INK,True);text(d,72,486,'모둠튀김 6조각 + 소스',25,INK,True);text(d,552,434,'한 접시 32,000원 → 반 접시',18,INK);text(d,552,466,'16,000원',30,CORAL,True);text(d,552,516,'소분비 300원',20,INK);text(d,943,480,'매장 수락 완료' if idx==2 else '매장 최종 확인',23,INK,True)
  if n==3:rr(d,(48,516,540,590),(247,245,239,226),18);text(d,72,533,'½ + ½  →  수량 충족',28,CORAL,True);text(d,48,474,'칠번 테이블 · 반 접시 참여',23,'white',True)
 else:
  pass
 # Same logo and header across both story and implementation plan.
 d.rectangle((0,0,1280,44),fill=INK);im.paste(SMALL,(46,6),SMALL);text(d,154,9,'반 접시의 밤',18,b=True);text(d,1232,12,'나누기 · 미래 이용 시나리오' if n<9 else 'BITE · 사업 추진 계획',15,anchor='ra')
 # Short lines accumulate within each scene, without a subtitle box.
 narr=scenes[n]['narration'];sentences=[s for s in re.split(r'(?<=[.!?])\s*',narr) if s]
 content=' '.join(sentences[:idx+1]);lines=wrap(content,1152,25);assert len(lines)<=3,(n,lines)
 color='white' if n<9 else INK
 for k,line in enumerate(lines):text(d,64,620+29*k,line,25,color)
 return im.convert('RGBA')
def overlay(im,n,t):
 sentences=[s for s in re.split(r'(?<=[.!?])\s*',scenes[n]['narration']) if s]
 weights=np.cumsum([len(s) for s in sentences]);elapsed=max(0,t-.3);total=max(.1,len(voices[n])/SR);idx=min(len(sentences)-1,int(np.searchsorted(weights,elapsed/total*weights[-1],side='right')))
 if 'sentence_offsets' in scenes[n]:idx=min(len(sentences)-1,int(np.searchsorted(scenes[n]['sentence_offsets'],t,side='right'))-1);idx=max(0,idx)
 if n==4:
  idx=min(idx,1) if t<scenes[n]['accept_offset_seconds'] else 2
 if n>=8:
  part=scenes[n]['ending_part'];dark=part==0;final=part==4
  if part!=0:im=Image.new('RGB',(1280,720),CORAL if final else PAPER)
  d=ImageDraw.Draw(im)
  if dark:
   layer=Image.new('RGBA',(1280,720),(0,0,0,0));dd=ImageDraw.Draw(layer)
   for y in range(44,270):dd.line((0,y,1280,y),fill=(0,0,0,round((270-y)/226*140)))
   for y in range(520,720):dd.line((0,y,1280,y),fill=(0,0,0,round((y-520)/200*215)))
   im=Image.alpha_composite(im.convert('RGBA'),layer).convert('RGB');d=ImageDraw.Draw(im)
   rr(d,(48,88,300,133),CORAL,20);text(d,70,94,'BITE의 콘셉트',27,'white',True);text(d,48,167,'돈도, 음식도 아끼는 한 끼.',40,'white',True)
   if idx>=1:text(d,48,230,'아끼기 + 나누기',33,'white',True)
  elif part==1:
   text(d,64,100,'또 하나의 축, 아끼기.',43,INK,True)
   for j,(head,sub) in enumerate([('이웃의 세일 제보','소금빵 4개'),('매장 직접 등록','오늘 남은 베이커리 1박스')]):
    x=64+j*590;yy=193+round(15*max(0,1-t/.7));rr(d,(x,yy,x+562,574),'white',23)
    text(d,x+26,yy+17,head,28,INK,True)
    badge='발견한 할인·마감세일 제보' if j==0 else '매장이 상품·가격·재고 직접 등록'
    bw=font(19,True).getlength(badge)+26
    rr(d,(x+26,yy+65,x+26+bw,yy+103),'#eeeae1' if j==0 else CORAL,14)
    text(d,x+39,yy+70,badge,19,INK if j==0 else 'white',True)
    bread=BREAD.resize((100,67),Image.Resampling.LANCZOS)
    if j==0:
     for k in range(4):im.paste(bread,(x+103+(k%2)*220,yy+111+(k//2)*65),bread)
    else:
     rr(d,(x+64,yy+119,x+498,yy+241),'#f2e6d3',16)
     d.rounded_rectangle((x+77,yy+130,x+485,yy+230),12,outline='#d8c2a3',width=2)
     for k in range(3):im.paste(bread,(x+93+k*134,yy+142),bread)
     rr(d,(x+380,yy+109,x+510,yy+145),INK,12);text(d,x+394,yy+114,'남은 3박스',18,'white',True)
    d=ImageDraw.Draw(im);text(d,x+26,yy+249,sub,23,INK,True)
    old='10,000원' if j==0 else '24,000원';new='→ 6,000원' if j==0 else '→ 9,900원'
    text(d,x+26,yy+295,old,23,'#79796f');d.line((x+26,yy+311,x+26+font(23).getlength(old),yy+311),fill='#79796f',width=2)
    text(d,x+165,yy+286,new,32,CORAL,True)
    text(d,x+26,yy+341,'현장 방문 구매 · 예약 없음' if j==0 else '앱에서 예약 → 20~21시 매장 픽업',19,INK,j==1)
  elif part==2:
   if idx==0:
    text(d,64,110,'나누기에는 두 가지 조건이 필요하다.',40,INK,True)
    for k,label in enumerate(['같은 메뉴를 원하는 손님','나눠 준비해 줄 매장']):
     x=64+k*590;rr(d,(x,270,x+562,455),'white',23);text(d,x+30,305,'01' if k==0 else '02',27,CORAL,True);text(d,x+30,365,label,31,INK,True)
    text(d,640,514,'같은 동네, 같은 시간에 연결되어야 한다.',27,INK,False,'mm')
   else:
    text(d,64,110,'그래서, 안암의 세일 제보부터.',43,INK,True)
    text(d,64,285,'매장 입점 없이,',35,INK,True);text(d,64,350,'이웃들의 제보로 시작한다.',35,INK,True)
    rr(d,(770,225,1216,530),'#efe9dc',22)
    for yy in [280,350,430]:d.line((786,yy,1200,yy-35),fill='white',width=18)
    for xx in [850,1010,1140]:d.line((xx,242,xx-42,512),fill='white',width=16)
    py=342-round(28*max(0,1-t/.8));d.ellipse((930,py-58,1010,py+22),fill=CORAL);d.polygon([(940,py),(1000,py),(970,py+72)],fill=CORAL);d.ellipse((955,py-33,985,py-3),fill=PAPER)
    text(d,970,468,'BITE Beta · 안암',24,INK,True,'mm')
  elif part==3:
   text(d,64,100,'두 개의 축, 단계적 확장.',43,INK,True)
   text(d,64,173,'아끼기로 이용자와 매장을 모으고, 검증 후 나누기를 더한다.',25,INK)
   rr(d,(64,235,878,565),'#eeeae1',22)
   text(d,88,252,'01  아끼기',28,CORAL,True)
   text(d,274,260,'이웃 제보 + 매장 직접 등록',23,INK,True)
   active=min(2,int(t/max(.1,scenes[n]['seconds'])*3))
   items=[('세일 제보','이웃의 할인 정보'),('실제 방문','방문·반복 이용 확인'),('매장 직접\n세일 상품 등록','오늘마감 · 예약·픽업')]
   for k,(head,sub) in enumerate(items):
    x=84+k*260;fill=INK if k<=active else 'white';fg='white' if k<=active else INK
    rr(d,(x,319,x+244,514),fill,18)
    for z,line in enumerate(head.split('\n')):text(d,x+18,340+z*34,line,24,CORAL,True)
    text(d,x+18,462,sub,18,fg)
    if k<2:text(d,x+247,398,'→',20,INK)
   for yy in range(239,565,18):d.line((905,yy,905,min(yy+9,565)),fill='#aba99f',width=2)
   text(d,940,252,'02  이후 확장',25,CORAL,True)
   rr(d,(932,319,1216,514),INK,18)
   text(d,954,340,'나누기',31,CORAL,True);text(d,954,402,'반 접시 주문',24,'white',True)
   text(d,954,462,'수요·운영 검증 후',20,'white')
   text(d,640,579,'좋은 할인을 찾는 아끼기  /  필요한 양만 주문하는 나누기',22,INK,False,'mm')
  else:
   im.paste(BIG,(440,150),BIG);text(d,640,386,'먹고 싶은 만큼만.',46,'white',True,'mm');text(d,640,482,'아끼기 + 나누기',30,'white',True,'mm')
  d=ImageDraw.Draw(im);d.rectangle((0,0,1280,44),fill=INK);im.paste(SMALL,(46,6),SMALL);text(d,154,9,'반 접시의 밤',18,b=True);text(d,1232,12,'BITE · 두 개의 축, 단계적 확장',15,anchor='ra')
  content=' '.join(sentences[:idx+1]);lines=wrap(content,1152,25);assert len(lines)<=2,(n,lines)
  for k,line in enumerate(lines):text(d,64,620+29*k,line,25,'white' if dark or final else INK)
  return im
 if n==2:
  im=Image.new('RGB',(1280,720),PAPER);d=ImageDraw.Draw(im);end=n==9 and t>scenes[n]['seconds']-5.5
  if end:im=Image.new('RGB',(1280,720),CORAL);d=ImageDraw.Draw(im)
  d.rectangle((0,0,1280,44),fill=INK);im.paste(SMALL,(46,6),SMALL);text(d,154,9,'반 접시의 밤',18,b=True);text(d,1232,12,'나누기 · 미래 이용 시나리오' if n==2 else '나누기 · 매장 실험 계획',15,anchor='ra')
  if n==2:
   text(d,64,100,'지우의 반 접시 요청',42,INK,True)
   yy=round(178+22*max(0,1-t/.65));rr(d,(290,yy,990,572),'white',24)
   text(d,326,yy+25,'삼번 테이블 · 두 명',26,CORAL,True);text(d,326,yy+100,'모둠튀김 반 접시',36,INK,True);text(d,326,yy+162,'주문할 몫     1몫',28,INK,True)
   text(d,326,yy+218,'반 접시 16,000원 + 소분비 300원',23,INK)
   text(d,326,yy+251,'매장이 사전 허용한 나누기 메뉴 · 가격 공개',17,INK)
   rr(d,(326,yy+282,954,yy+350),CORAL,17);text(d,640,yy+303,'매장에 요청 보내기' if t<3.5 else '요청 전송 완료',27,'white',True,'mt')
  elif end:
   im.paste(BIG,(440,180),BIG);text(d,640,395,'먹고 싶은 만큼만.',47,'white',True,'mm');text(d,640,468,'돈도, 음식도 아끼는 한 끼.',29,'white',False,'mm')
  else:
   text(d,64,116,'반 접시 주문이 일상이 되도록.',43,INK,True)
   if t<5.8:
    text(d,640,330,'지우의 딱 맞는 한 끼에서',38,INK,True,'mm');text(d,640,410,'매장과 함께하는 작은 실험으로.',33,CORAL,True,'mm')
   else:
    active=min(2,int((t-5.8)/5))
    for k,(head,desc) in enumerate([('안암의 작은 매장','참여할 매장부터'),('허용 메뉴 설정','나눠 준비할 수 있는 음식'),('매칭·제공 검증','주문을 모아 각자의 몫으로')]):
     if t<5.8+k*.8:continue
     x=64+k*395;fill=INK if k==active else 'white';fg='white' if k==active else INK
     rr(d,(x,280,x+365,476),fill,22);text(d,x+24,310,head,28,CORAL,True);text(d,x+24,385,desc,21,fg)
    progress=min(1,max(0,(t-5.8)/(scenes[n]['seconds']-11.3)));rr(d,(64,500,65+round(1150*progress),508),CORAL,4)
  content=' '.join(sentences[:idx+1]);lines=wrap(content,1152,25);assert len(lines)<=3
  for k,line in enumerate(lines):text(d,64,620+29*k,line,25,'white' if end else INK)
  return im
 return Image.alpha_composite(im.convert('RGBA'),deco(n,idx)).convert('RGB')

out=W/'film-v10-checked.mp4'
audio=HERE/'audio/film-restaurant-mix.wav'
if not audio.exists():
 audio=W/'composite-audio.wav';subprocess.run([FF,'-y','-v','error','-i',str(O/'videos/BITE_AI_Film_Generated_Video.mp4'),'-vn','-ar','48000',str(audio)],check=True)

cmd=[FF,'-y','-f','rawvideo','-pix_fmt','rgb24','-s','1280x720','-r',str(FPS),'-i','-','-i',str(audio),'-c:v','libx264','-threads','2','-preset','veryfast','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','256k','-t',str(D),'-movflags','+faststart',str(out)]
with (W/'render.log').open('wb') as log:
 enc=subprocess.Popen(cmd,stdin=subprocess.PIPE,stderr=log,stdout=subprocess.DEVNULL)
 for n,s in enumerate(scenes):
  count=round(s['seconds']*FPS);dec=None
  if n<9 and n!=2:
   vf=f'setpts={s["seconds"]/8}*PTS,fps=24'
   if n==0:vf+=',crop=420:236:400:450,scale=1280:720'
   dec=subprocess.Popen([FF,'-v','error','-i',str(O/'clips'/('ending-bridge.mp4' if n==9 else 'service-safe.mp4' if n==6 else f'{s["clip"]:02}.mp4')),'-vf',vf,'-f','rawvideo','-pix_fmt','rgb24','-'],stdout=subprocess.PIPE,stderr=subprocess.DEVNULL)
  last=None
  for k in range(count):
   if dec:
    raw=dec.stdout.read(1280*720*3)
    if len(raw)==1280*720*3:last=Image.frombytes('RGB',(1280,720),raw)
    assert last is not None;im=last.copy()
   else:im=Image.new('RGB',(1280,720),PAPER)
   im=overlay(im,n,k/FPS)
   if k==round(count*.62):im.save(W/f'final-{n:02}.jpg',quality=94)
   enc.stdin.write(im.tobytes())
  if dec:dec.stdout.close();dec.wait()
  print(f'scene {n+1}/{len(scenes)}',flush=True)
 enc.stdin.close();assert enc.wait()==0
sheet=Image.new('RGB',(1280,math.ceil(len(scenes)/2)*360),PAPER)
for n in range(len(scenes)):sheet.paste(Image.open(W/f'final-{n:02}.jpg').resize((640,360)),((n%2)*640,(n//2)*360))
sheet.save(O/'storyboard.jpg',quality=92)
(O/'render-edit.json').write_text(json.dumps({'scenes':scenes,'duration_seconds':D,'model':'Google Flow / Veo 3.1 Lite','source_clip_seconds':64,'method':'Text-to-video generated clips with actual subject motion; titles and implementation-plan graphics composited locally. Existing chosen narration clips reused at unchanged rate and pitch. One table-number paragraph regenerated with SunHi neural TTS; scene timing preserved.','new_payment':False,'image_upload_succeeded':False},ensure_ascii=False,indent=2),encoding='utf8')
__import__('shutil').copyfile(out,O/'videos/BITE_AI_Film_Generated_Video.mp4')
print(f'Finished {D:.2f}s',flush=True)
