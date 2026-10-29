from pathlib import Path
import json, math, sys, subprocess, wave, shutil, random
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps
ROOT=Path(__file__).resolve().parents[2]
WORK=ROOT/'work/midterm'; OUT=ROOT/'outputs/BITE-Midterm'
BRIEF=WORK/'brief.json'
if Path(__file__).resolve().parent.name=='source':
    OUT=Path(__file__).resolve().parent.parent; WORK=OUT/'source/build';BRIEF=OUT/'source/brief.json';WORK.mkdir(exist_ok=True)
sys.path.insert(0,str(ROOT/'work/media-python'))
import imageio_ffmpeg
FF=imageio_ffmpeg.get_ffmpeg_exe()
B=json.loads(BRIEF.read_text(encoding='utf-8'))
W,H,FPS=1280,720,24
PAPER='#f7f6f2'; INK='#252622'; MUTED='#72756d'; ORANGE='#f75235'; LINE='#dedfd5'
REG='C:/Windows/Fonts/NotoSansKR-Regular.ttf'; BOLD='C:/Windows/Fonts/NotoSansKR-Bold.ttf'
fonts={}
def font(size,bold=False):
    key=(size,bold)
    if key not in fonts: fonts[key]=ImageFont.truetype(BOLD if bold else REG,size)
    return fonts[key]
def txt(d,xy,s,size=30,fill=INK,bold=False,anchor=None):
    d.text(xy,str(s),font=font(size,bold),fill=fill,anchor=anchor,spacing=12)
def rr(d,box,fill,r=22,outline=None,width=1):d.rounded_rectangle(box,r,fill=fill,outline=outline,width=width)
def ease(t):return 1-(1-max(0,min(1,t)))**3
def lines(d,xy,s,size=55,fill=INK,bold=True,gap=12):
    for i,line in enumerate(s.split('\n')): txt(d,(xy[0],xy[1]+i*(size+gap)),line,size,fill,bold)
def wrap(s,maxpx,size):
    result=[];line='';f=font(size)
    for c in s:
        if c=='\n' or f.getlength(line+c)>maxpx:
            if line:result.append(line)
            line='' if c=='\n' else c
        else:line+=c
    if line:result.append(line)
    return result
def subtitle(im,s):
    layer=Image.new('RGBA',(W,H));d=ImageDraw.Draw(layer)
    ls=wrap(s,1120,25); top=H-40-len(ls)*36
    rr(d,(48,top-15,W-48,H-27),(19,20,17,218),14)
    for i,line in enumerate(ls):txt(d,(W/2,top+i*36),line,25,'#ffffff',False,'mt')
    return Image.alpha_composite(im.convert('RGBA'),layer).convert('RGB')
def portion(d,cx,cy,r,filled=1,total=2,phase=1):
    d.ellipse((cx-r,cy-r,cx+r,cy+r),fill='#e6e5db')
    for i in range(filled):
        start=-90+360*i/total;end=start+360/total-3
        d.pieslice((cx-r,cy-r,cx+r,cy+r),start,end,fill=ORANGE)
    d.ellipse((cx-r-13,cy-r-13,cx+r+13,cy+r+13),outline=INK,width=3)
def badge(d,xy,s,color=ORANGE):
    f=font(18,True);width=f.getlength(s)+36;rr(d,(xy[0],xy[1],xy[0]+width,xy[1]+38),color,19);txt(d,(xy[0]+18,xy[1]+5),s,18,'white',True)
def motion_frame(t):
    n=min(11,int(t//7));u=(t%7)/7;scene=B['motion'][n]
    im=Image.new('RGB',(W,H),PAPER);d=ImageDraw.Draw(im)
    txt(d,(64,30),'BITE.',34,INK,True);txt(d,(W-64,44),f'{n+1:02d} / 12  ·  BITE BETA / ANAM',15,MUTED,False,'ra')
    d.line((64,90,1216,90),fill=LINE,width=1)
    y=int(147+24*(1-ease(u*4)))
    badge(d,(64,111),scene[0]);lines(d,(64,y+30),scene[1],48)
    # All diagrams are authored vector-style graphics, animated continuously.
    if n==0:
        portion(d,925,340,125,2,2); txt(d,(925,505),'한 접시 ₩32,000',27,INK,True,'mm')
        txt(d,(64,410),'양 때문에 포기한 주문',26,MUTED);txt(d,(64,452),'개인의 과잉주문 + 매장의 남는 재고',23,MUTED)
    elif n==1:
        portion(d,930,340,135,1,2);txt(d,(930,515),'½접시부터',32,INK,True,'mm')
        txt(d,(64,414),'고객이 요청하고, 매장이 준비해요.',29,MUTED)
    elif n==2:
        rr(d,(710,155,1195,535),'white',25,LINE);txt(d,(748,185),'3번 테이블 · 2명',27,INK,True)
        txt(d,(748,242),'모둠튀김',36,INK,True);txt(d,(748,300),'반 접시 1개 요청',30,ORANGE,True)
        txt(d,(748,360),'1몫 ≠ 1인분',24,MUTED);badge(d,(748,435),'요청 단계 · 결제 없음',INK)
    elif n==3:
        for i,(a,b) in enumerate([('구성','튀김 6조각 + 소스'),('상품 / 소분비','₩16,000 / ₩300'),('제공 시간','19:30–20:00')]):
            yy=166+i*104;rr(d,(710,yy,1190,yy+84),'white',16,LINE);txt(d,(735,yy+10),a,18,MUTED);txt(d,(735,yy+39),b,26,INK,True)
        txt(d,(64,420),'조건을 바꾸면 다시 확인.',27,MUTED)
    elif n==4:
        rr(d,(745,150,1185,525),INK,25);txt(d,(965,190),'내 결제 승인액',23,'#c8c8bd',False,'mt');txt(d,(965,255),'₩16,300',57,'white',True,'mt')
        txt(d,(965,350),'아직 결제 확정 전',25,'#ffb39d',True,'mt');txt(d,(965,420),'실패하면 승인 취소',24,'white',False,'mt')
    elif n==5:
        for x,s in [(820,'3번'),(1080,'7번')]:portion(d,x,280,83,1,2);txt(d,(x,398),s+' 테이블',25,INK,True,'mm')
        p=min(1,u*1.6);rr(d,(745,465,1185,480),'#e1e0d5',7);rr(d,(745,465,745+max(14,440*p),480),ORANGE,7)
        txt(d,(965,518),('2몫 / 2몫  ·  MATCHED!' if p>=1 else '1몫 / 2몫  ·  모집 중'),26,ORANGE,True,'mm')
    elif n==6:
        portion(d,825,300,75,1,2);portion(d,1085,300,75,1,2)
        txt(d,(825,425),'3번에 제공',24,INK,True,'mm');txt(d,(1085,425),'7번에 제공',24,INK,True,'mm')
        txt(d,(955,500),'합석 없음 · 직접 분배 없음',24,ORANGE,True,'mm')
    elif n==7:
        for i in range(3):rr(d,(730+i*154,210,865+i*154,350),ORANGE if i<2 else INK,20);txt(d,(798+i*154,280),'1몫',27,'white',True,'mm')
        txt(d,(875,430),'고객 A: 2몫',27,ORANGE,True,'mm');txt(d,(1080,430),'B: 1몫',27,INK,True,'mm');txt(d,(955,505),'수량 합계로 매칭',26,MUTED,False,'mm')
    elif n==8:
        rr(d,(740,175,1185,500),'#ecebe2',25);txt(d,(960,230),'BAKERY / LAST CALL',20,MUTED,True,'mm');txt(d,(960,315),'₩24,000',42,MUTED,False,'mm');d.line((825,315,1095,315),fill=MUTED,width=2)
        txt(d,(960,410),'₩9,900',64,ORANGE,True,'mm');txt(d,(64,420),'큰 묶음도 원하는 몫만.',27,MUTED)
    elif n==9:
        for i,(a,b) in enumerate([('3–5','파일럿 점포'),('5–10','Split 메뉴'),('1km','도보 생활권')]):
            xx=735+i*158;txt(d,(xx,260),a,42,ORANGE,True,'mm');txt(d,(xx,320),b,19,INK,False,'mm')
        txt(d,(945,445),'초기 가설 · 달성 실적 아님',22,MUTED,False,'mm')
    elif n==10:
        for i,s in enumerate(['요청 응답 시간','고객 수락률','매칭률 · 재사용']):
            yy=180+i*100;rr(d,(730,yy,1185,yy+75),'white',15,LINE);txt(d,(760,yy+20),s,28,INK,True)
        txt(d,(64,425),'v9 · 자동 테스트 80개 통과',25,ORANGE,True)
    else:
        rr(d,(720,150,1200,530),ORANGE,26);txt(d,(960,280),'BITE.',100,'white',True,'mm');txt(d,(960,410),'Save money. Waste less.',23,'white',False,'mm')
        txt(d,(64,430),'요청은 가볍게. 주문은 필요한 만큼.',25,MUTED)
    d.line((64,579,1216,579),fill=LINE,width=1);d.line((64,579,64+1152*t/84,579),fill=ORANGE,width=3)
    return subtitle(im,scene[2])
imgs={}
def photo(n,t):
    if n not in imgs:imgs[n]=Image.open(OUT/f'assets/film-{n}.png').convert('RGB')
    # Camera animation: a restrained push-in and lateral drift; the underlying still remains unchanged.
    src=imgs[n];scale=max(W/src.width,H/src.height)*(1.035+.055*t);nw,nh=round(src.width*scale),round(src.height*scale)
    r=src.resize((nw,nh),Image.Resampling.BICUBIC);x=round((nw-W)*(.4+.15*t));y=round((nh-H)*.45)
    return r.crop((x,y,x+W,y+H))
def film_frame(t):
    n=min(10,int(t//8));u=(t%8)/8;asset,title,narr=B['film'][n]
    im=photo(asset,u)
    over=Image.new('RGBA',(W,H));d=ImageDraw.Draw(over)
    # Letterbox and restrained exposure treatment establish a separate film language.
    d.rectangle((0,0,W,44),fill=(8,9,7,255));d.rectangle((0,H-46,W,H),fill=(8,9,7,255))
    d.rectangle((0,44,W,145),fill=(0,0,0,75))
    txt(d,(48,13),'BITE ORIGINAL / 반 접시의 밤',17,'#eee9df',True)
    txt(d,(W-48,13),f'AI CINEMATIC SHORT  ·  {n+1:02d}',15,'#bcb7aa',False,'ra')
    if n<2: badge(d,(48,77),'주문 전, 상상 속 한 접시', '#3e3a33')
    else: badge(d,(48,77),['','','3번 테이블 · 요청','매장 조건 확인','7번 테이블 · 참여','주방에서 처음부터 소분','테이블마다 따로 제공','필요한 만큼','각자의 저녁','BITE BETA / ANAM','먹고 싶은 만큼만'][n])
    if n in (2,3):
        rr(d,(790,175,1208,490),(247,246,242,240),22);txt(d,(822,202),'BITE / 3번 테이블',22,INK,True)
        txt(d,(822,258),'모둠튀김 반 접시',29,INK,True);txt(d,(822,310),'튀김 6조각 + 소스',23,MUTED)
        txt(d,(822,359),'₩16,000 + ₩300',28,ORANGE,True);txt(d,(822,413),'요청 접수' if n==2 else '총 ₩16,300 · 수락',25,INK,True)
    if n==4:
        rr(d,(720,315,1208,455),(247,246,242,239),20);txt(d,(964,350),'3번 ½ + 7번 ½',33,INK,True,'mm');txt(d,(964,410),'MATCHED · 결제 확정',28,ORANGE,True,'mm')
    if n==6:
        badge(d,(65,455),'3번 테이블','#3e3a33');badge(d,(985,455),'7번 테이블','#3e3a33')
    if n in (0,1,5,7,8,9):
        lines(d,(64,175 if n<2 else 155),title,46,'#fff9ef',True,10)
    if n==10:
        d.rectangle((0,44,W,H-46),fill=(20,21,18,165));txt(d,(W/2,225),'BITE.',113,'#fff9ef',True,'mm');txt(d,(W/2,355),'먹고 싶은 만큼만.',43,'#fff9ef',True,'mm');txt(d,(W/2,430),'Save money. Waste less.',27,'#ffbda9',False,'mm')
    im=Image.alpha_composite(im.convert('RGBA'),over).convert('RGB')
    im=subtitle(im,narr)
    # Fade gently between shots via a short dip-to-black; no false lip-sync is implied.
    edge=min(u,1-u);alpha=min(1,edge/.045)
    if alpha<1:im=Image.blend(Image.new('RGB',(W,H),'black'),im,alpha)
    return im
cached_motion={};cached_film={}
def motion_fast(t):
    n=min(11,int(t//7));u=t%7/7
    if n not in cached_motion:cached_motion[n]=motion_frame(n*7+6.3)
    base=cached_motion[n];im=base.copy();d=ImageDraw.Draw(im)
    if u<.17:
        e=ease(u/.17);left=base.crop((55,151,700,565));right=base.crop((705,145,1215,558))
        d.rectangle((48,148,1216,569),fill=PAPER)
        im.paste(left,(55-round((1-e)*65),151));im.paste(right,(705+round((1-e)*65),145))
    d.line((64,579,1216,579),fill=LINE,width=3);d.line((64,579,64+1152*t/84,579),fill=ORANGE,width=3)
    if n==5:
        p=min(1,u*1.6);d.rectangle((735,452,1200,551),fill=PAPER);rr(d,(745,465,1185,480),'#e1e0d5',7);rr(d,(745,465,745+max(14,440*p),480),ORANGE,7)
        txt(d,(965,518),'2몫 / 2몫 · MATCHED!' if p>=1 else '1몫 / 2몫 · 모집 중',26,ORANGE,True,'mm')
    return im
def film_fast(t):
    n=min(10,int(t//8));u=t%8/8
    if n not in cached_film:cached_film[n]=film_frame(n*8+3.8)
    base=cached_film[n];z=1+.018*u;nw,nh=round(W*z),round(H*z)
    im=base.resize((nw,nh),Image.Resampling.BILINEAR).crop(((nw-W)//2,(nh-H)//2,(nw+W)//2,(nh+H)//2))
    edge=min(u,1-u);a=min(1,edge/.045)
    if a<1:im=Image.blend(Image.new('RGB',(W,H),'black'),im,a)
    return im
def wavread(p):
    with wave.open(str(p),'rb') as w:
        raw=w.readframes(w.getnframes());a=np.frombuffer(raw,dtype='<i2').astype(np.float32)/32768
        channels=w.getnchannels();sr=w.getframerate()
        if channels>1:a=a.reshape(-1,channels).mean(axis=1)
        return a,sr
def wavwrite(p,a,sr=48000):
    a=np.clip(a,-.97,.97)
    with wave.open(str(p),'wb') as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(sr);w.writeframes((a*32767).astype('<i2').tobytes())
def audio(kind):
    dur=B['durations'][kind];seg=7 if kind=='motion' else 8;sr=48000;length=dur*sr;tt=np.arange(length)/sr
    music=np.zeros(length,dtype=np.float32);chords=[[146.83,185.,220.],[130.81,164.81,196.],[110.,138.59,164.81],[130.81,174.61,220.]]
    for k in np.arange(0,dur,.625):
        st=int(k*sr);ln=min(sr*2,length-st);x=np.arange(ln)/sr;freq=chords[int(k//5)%4][int(k/.625)%3]*2
        note=np.sin(2*np.pi*freq*x)*np.exp(-x*3.2)*.025+np.sin(2*np.pi*freq*2*x)*np.exp(-x*5)*.005
        music[st:st+ln]+=note
    mix=np.stack([music,music*.94],axis=1)
    for i,scene in enumerate(B[kind]):
        if not (WORK/f'voice/{kind}-{i}.wav').exists():continue
        a,ar=wavread(WORK/f'voice/{kind}-{i}.wav')
        target=seg-1.05;ad=len(a)/ar
        if ad>target:
            adjusted=WORK/f'voice/{kind}-{i}-fit.wav';rate=min(2,ad/target)
            subprocess.run([FF,'-y','-i',str(WORK/f'voice/{kind}-{i}.wav'),'-af',f'atempo={rate:.6f}',str(adjusted)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,check=True);a,ar=wavread(adjusted)
        a=np.interp(np.arange(round(len(a)/ar*sr))/sr,np.arange(len(a))/ar,a).astype(np.float32)
        if a.size:a=a/(max(.1,float(np.max(np.abs(a)))))*.68
        st=int((i*seg+.35)*sr);end=min(length,st+len(a));mix[st:end]+=a[:end-st,None]
    # Original two-note match sound and subtle edit ticks.
    for tm in ([35.2,42.1,56.1] if kind=='motion' else [32.2,40.4,48.4]):
        st=int(tm*sr);x=np.arange(int(.6*sr))/sr;ding=(np.sin(2*np.pi*880*x)+.5*np.sin(2*np.pi*1320*x))*np.exp(-x*8)*.07;mix[st:st+len(ding)]+=ding[:,None]
    fade=np.minimum(1,np.minimum(tt/1.5,(dur-tt)/2));mix*=fade[:,None]
    out=WORK/f'{kind}-mix.wav';wavwrite(out,mix);return out
def srt(kind):
    sec=7 if kind=='motion' else 8
    def stamp(x):return f'{int(x)//3600:02}:{int(x)//60%60:02}:{int(x)%60:02},{int(x%1*1000):03}'
    content='\n\n'.join(f'{i+1}\n{stamp(i*sec+.2)} --> {stamp((i+1)*sec-.2)}\n'+scene[2] for i,scene in enumerate(B[kind]))
    (OUT/f'videos/BITE_{kind}.srt').write_text(content,encoding='utf-8')
def render(kind):
    duration=B['durations'][kind];draw=motion_fast if kind=='motion' else film_fast
    name='BITE_MotionGraphic_84s.mp4' if kind=='motion' else 'BITE_AI_Film_88s.mp4'
    audiofile=audio(kind);srt(kind);out=OUT/'videos'/name
    cmd=[FF,'-y','-f','rawvideo','-vcodec','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-i',str(audiofile),'-c:v','libx264','-threads','2','-preset','veryfast','-crf','23','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-ar','48000','-movflags','+faststart','-t',str(duration),str(out)]
    log=(WORK/f'{kind}-encode.log').open('wb');proc=subprocess.Popen(cmd,stdin=subprocess.PIPE,stdout=subprocess.DEVNULL,stderr=log)
    for i in range(duration*FPS):
        im=draw(i/FPS);proc.stdin.write(im.tobytes())
        if i%(FPS*14)==0:print(f'{kind}: {i//FPS}/{duration}s',flush=True)
    proc.stdin.close();code=proc.wait();log.close()
    if code:raise RuntimeError(f'Encoder exit {code}')
    for i,t in enumerate(([3,17,31,38,45,52,59,73,80] if kind=='motion' else [3,19,27,35,43,51,59,75,83])):draw(t).save(WORK/f'{kind}-qa-{i+1}.jpg',quality=90)
    draw(3 if kind=='motion' else 59).save(OUT/f'assets/{kind}-poster.jpg',quality=92)
    print(f'Finished {out} ({out.stat().st_size} bytes)',flush=True)
if __name__=='__main__':render(sys.argv[1])
