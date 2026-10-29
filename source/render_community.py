"""BITE editorial motion film: varied layouts, phrase captions, chapter cues."""
from pathlib import Path
import json,sys,math,wave,bisect,subprocess,re,ast,functools
import numpy as np
from PIL import Image,ImageDraw,ImageFont
HERE=Path(__file__).resolve().parent
R=HERE.parents[2] if HERE.name=='source' else HERE.parents[1]
O=HERE.parent if HERE.name=='source' else R/'outputs/BITE-Midterm-Branded'
WORK=HERE/'build-v10-motion' if HERE.name=='source' else HERE
WORK.mkdir(exist_ok=True)
sys.path.insert(0,str(R/'work/media-python'))
import render_media_base as base
import imageio_ffmpeg
FF=imageio_ffmpeg.get_ffmpeg_exe();SR=48000;FPS=24;W=1280;H=720
B=json.loads((HERE/'brief.json').read_text(encoding='utf-8'));starts=np.r_[0,np.cumsum(B['motion_scene_seconds'])];D=float(starts[-1]);N=round(D*SR)
PAPER='#f7f5ef';INK='#252622';CORAL='#f65336';MUTED='#79796f';PEACH='#f3e5d5';LINE='#dfded5'
F=base.font
def text(d,x,y,s,size=30,color=INK,bold=False,anchor=None):d.text((x,y),str(s),font=F(size,bold),fill=color,anchor=anchor,spacing=8)
def rr(d,b,c,r=24,outline=None,width=1):d.rounded_rectangle(b,r,fill=c,outline=outline,width=width)
def block(d,x,y,s,size=60,color=INK,gap=12):
    for i,t in enumerate(s.split('\n')):text(d,x,y+i*(size+gap),t,size,color,True)
def center(d,x,y,s,size=30,color=INK,bold=True):text(d,x,y,s,size,color,bold,'mm')
def chapter(n):return 0 if n<3 else 1 if n==3 else 2 if n in [4,5,6,9] else 3 if n==7 else 4 if n==8 else 5
CH=['왜 필요한가','하나의 목표, 두 가지 방법','아끼기 · 이웃 세일 제보','아끼기 · 매장 직접 등록','나누기','안암에서 검증']
CHNUM=['01','02','03-1','03-2','04','05']
def palette(n):return (INK,PAPER) if n==1 else (CORAL,PAPER) if n in [2,11] else (PEACH,INK) if n==9 else (PAPER,INK)
@functools.lru_cache(None)
def plate(count,r=90):
    s=r*2+30;im=Image.new('RGBA',(s,s));d=ImageDraw.Draw(im);cx=cy=s/2
    d.ellipse((cx-r+1,cy-r+6,cx+r+1,cy+r+6),fill='#d9d5ca')
    d.ellipse((cx-r,cy-r,cx+r,cy+r),fill='#ffffff',outline='#e9e4d8',width=2)
    d.ellipse((cx-r+16,cy-r+16,cx+r-16,cy+r-16),outline='#eae5db',width=2)
    coords=[(-.38,-.35),(-.05,-.4),(.3,-.3),(-.42,.02),(-.08,-.02),(.28,.08),(-.32,.35),(.02,.32),(.35,.36),(-.6,-.17),(.52,-.04),(.02,.6)]
    for k in range(count):
        xx,yy=coords[k];x=cx+xx*r;y=cy+yy*r;z=r*.16
        d.rounded_rectangle((x-z,y-z*.65,x+z,y+z*.65),radius=max(3,int(z*.6)),fill='#dc9a3b',outline='#b97c31',width=2)
        d.line((x-z*.5,y-z*.2,x+z*.5,y+z*.2),fill='#f4c875',width=2)
    return im
def putplate(im,x,y,count=6,r=90):
    p=plate(count,r);im.paste(p,(round(x-p.width/2),round(y-p.height/2)),p)
def pill(d,x,y,label,color=CORAL,fg='white',size=20):
    width=F(size,True).getlength(label)+34;rr(d,(x,y,x+width,y+size+21),color,(size+21)//2);text(d,x+17,y+7,label,size,fg,True)
@functools.lru_cache(None)
def logo(width,white=False):
    p=Image.open(O/'assets/logo'/('bite-logo-white.png' if white else 'bite-logo.png')).convert('RGBA')
    p=p.crop(p.getbbox());return p.resize((width,round(width*p.height/p.width)),Image.Resampling.LANCZOS)
def putlogo(im,x,y,width,white=False):
    p=logo(width,white);im.paste(p,(round(x),round(y)),p)
def chrome(im,n,show_example=True):
    d=ImageDraw.Draw(im);bg,fg=palette(n);light=fg==PAPER
    putlogo(im,64,32,98,light)
    text(d,1216,27,'전체 구성 / 아끼기 · 나누기' if n==3 else f'{CHNUM[chapter(n)]} / {CH[chapter(n)]}',30,fg,True,'rt')
    for k in range(6):rr(d,(939+k*47,79,972+k*47,82),fg if k==chapter(n) else ('#ffffff55' if False else '#77776e' if n==1 else '#eea38d' if n in [2,11] else '#d8d6cc'),1)
    if show_example and n in [4,5,6,7,9]:text(d,64,574,'서비스 구상 · 가상 제보 예시',28,fg if light else MUTED,anchor='lt')
    d.line((64,613,1216,613),fill=('#b33924' if n in [2,11] else '#53564d' if n==1 else LINE),width=1)
    return im
from community_scenes import draw_scene
@functools.lru_cache(None)
def scene(n,stage):return draw_scene(n,stage,globals())

def phrases(n):
    raw=re.split(r'(?<=[.!?])\s*',B['motion'][n][2]);out=[]
    for s in raw:
        s=s.strip()
        if not s:continue
        if len(s)>65:
            words=s.split();p=''
            for w in words:
                if len(p+' '+w)>29 and p:out.append(p);p=w
                else:p=(p+' '+w).strip()
            if p:out.append(p)
        else:out.append(s)
    return out
CAPS=[phrases(i) for i in range(12)]
@functools.lru_cache(None)
def caption_layer(n,idx):
    im=Image.new('RGBA',(W,H));d=ImageDraw.Draw(im);bg,fg=palette(n)
    # Append to the same text flow. Earlier words never disappear or shift
    # when a new phrase is added; reset only on the next scene.
    size=26;rows=[];line=''
    content=' '.join(CAPS[n][:idx+1])
    for word in content.split():
        next_line=(line+' '+word).strip()
        if F(size).getlength(next_line)>1118 and line:rows.append(line);line=word
        else:line=next_line
    if line:rows.append(line)
    assert len(rows)<=2,(n,rows)
    for j,row in enumerate(rows):text(d,86,620+j*31,row,size,fg,False)
    rr(d,(64,628,69,649),PAPER if n in [1,2,11] else CORAL,2)
    return im
def active_caption(n,elapsed):
    if elapsed<.3:return None
    cues=B['motion_sentence_starts'][str(n)]
    assert len(cues)==len(CAPS[n]),(n,cues,CAPS[n])
    return min(len(CAPS[n])-1,bisect.bisect_right(cues,elapsed)-1)
def body_frame(t):
    n=min(11,bisect.bisect_right(starts,t)-1);elapsed=t-starts[n];u=elapsed/B['motion_scene_seconds'][n];stage=min(2,int(u*3))
    im=scene(n,stage).copy();d=ImageDraw.Draw(im)
    # Price counts down to the live sale amount; original price stays struck through.
    if n==4:
        p=min(1,max(0,(elapsed-.5)/2.8));price=round((10000-4000*base.ease(p))/100)*100
        text(d,788,419,'10,000원',19,MUTED);d.line((788,431,878,431),fill=MUTED,width=2)
        text(d,903,412,f'→ {price:,}원',28,CORAL,True)
    if n==8:
        p=base.ease(min(1,max(0,(elapsed-1.2)/3.0)))
        if elapsed<1.2:putplate(im,640,358,12,112)
        else:
            putplate(im,640-205*p,358,6,100);putplate(im,640+205*p,358,6,100)
        d=ImageDraw.Draw(im)
        if p>.6:
            center(d,435,488,'삼번 테이블 · 반 접시',22);center(d,845,488,'칠번 테이블 · 반 접시',22)
    if n==6:
        # Animated status marker moves to each state, rather than three static cards.
        phase=min(2,elapsed/(B['motion_scene_seconds'][n]/3));yy=157+135*phase
        rr(d,(733,yy+13,740,yy+96),CORAL,3)
    if n in [3,5,7,9,10] and elapsed<.8:
        p=base.ease(elapsed/.8);region=im.crop((740,105,1280,574));im.paste(palette(n)[0],(740,105,1280,574));im.paste(region,(740+round(180*(1-p)),105))
    if n==10:
        p=base.ease(min(1,elapsed/1.1));yy=468-round(85*(1-p));d=ImageDraw.Draw(im)
        d.ellipse((702,yy-36,746,yy+8),fill=CORAL);d.polygon([(708,yy-7),(740,yy-7),(724,yy+30)],fill=CORAL);d.ellipse((716,yy-23,732,yy-7),fill=PAPER)
    # A quick, content-only entrance preserves an unmoving caption baseline.
    if elapsed<.24:
        p=base.ease(elapsed/.24);bg,_=palette(n);mask=Image.new('RGB',(W,490),bg)
        content=im.crop((0,102,W,592));content=Image.blend(mask,content,p)
        im.paste(content,(0,102+round(15*(1-p))))
    idx=active_caption(n,elapsed)
    if idx is not None:im=Image.alpha_composite(im.convert('RGBA'),caption_layer(n,idx)).convert('RGB')
    return im
ORDER=[0,1,2,3,4,5,6,9,7,8,10,11]
CHAPTERS={0:('01','왜 필요한가','식비의 부담과, 한 접시의 부담',2.5),3:('02','아끼기와 나누기,\n하나의 목표.','돈도, 음식도 아끼는 한 끼',3.0),4:('03-1','아끼기 · 이웃의 세일 제보','발견한 할인·마감세일을 이웃에게',3.0),7:('03-2','아끼기 · 매장 직접 등록','상품·재고를 직접 관리하고, 예약·픽업으로',3.0),8:('04','나누기','필요한 양만 주문해, 남김을 줄이기',2.5),10:('05','안암에서 검증','한 동네에서 시작하는 단계적 확장',2.5)}
TIMELINE=[];BODY_ACTUAL_START={};cursor=0.
for n in ORDER:
 if n in CHAPTERS:
  TIMELINE.append({'kind':'chapter','scene':n,'start':cursor,'seconds':CHAPTERS[n][3]});cursor+=CHAPTERS[n][3]
 BODY_ACTUAL_START[n]=cursor;TIMELINE.append({'kind':'body','scene':n,'start':cursor,'seconds':B['motion_scene_seconds'][n]});cursor+=B['motion_scene_seconds'][n]
D=cursor;N=round(D*SR);TSTARTS=[s['start'] for s in TIMELINE]
@functools.lru_cache(None)
def chapter_card(n):
 im=Image.new('RGB',(W,H),PAPER);dd=ImageDraw.Draw(im);number,title,sub,hold=CHAPTERS[n]
 text(dd,64,147,number,73,CORAL,True);block(dd,64,258,title,53 if n in [4,7] else 62,INK,12);text(dd,68,466,sub,29,MUTED);chrome(im,n,show_example=False)
 return im
def frame(t):
 section=TIMELINE[min(len(TIMELINE)-1,bisect.bisect_right(TSTARTS,t)-1)];elapsed=t-section['start'];n=section['scene']
 if section['kind']=='chapter':return chapter_card(n).copy()
 return body_frame(float(starts[n]+elapsed))


def music_audio():
    # Original instrument library; chapter scores have distinct arrangements.
    source=ast.parse((HERE/'music_candidates.py').read_text(encoding='utf-8'));defs=[]
    for node in source.body:
        if isinstance(node,ast.FunctionDef) and node.name in ['hz','write','instrument','drum','sketch','lufs']:
            if node.name=='sketch':
                kept=[]
                for stmt in node.body:
                    if isinstance(stmt,ast.Assign) and any(isinstance(x,ast.Name) and x.id=='tt' for x in stmt.targets):break
                    kept.append(stmt)
                node.body=kept+[ast.Return(ast.Name(id='m',ctx=ast.Load()))]
            defs.append(node)
    ns={'np':np,'math':math,'SR':SR,'D':D,'N':N,'FF':FF,'subprocess':subprocess,'json':json,'wave':wave}
    exec(compile(ast.fix_missing_locations(ast.Module(body=defs,type_ignores=[])),'original_instruments','exec'),ns)
    voice=np.zeros((N,2),np.float32)
    for i,st in enumerate(starts[:-1]):
        p=HERE/f'audio/motion-{i}.wav' if HERE.name=='source' else WORK/f'voice/motion-{i}.wav'
        with wave.open(str(p),'rb') as f:
            assert f.getframerate()==SR
            a=np.frombuffer(f.readframes(f.getnframes()),dtype='<i2').astype(np.float32)/32768
        pos=round((st+.3)*SR);voice[pos:pos+len(a)]=a[:,None]*1.05
    ns['write'](WORK/'motion-voice-only.wav',voice)
    cues=[(0,float(starts[3]),'jazz',102),(float(starts[3]),float(starts[7]),'acoustic',112),(float(starts[7]),float(starts[9]),'funk',116),(float(starts[9]),D,'jazz',106)]
    music=np.zeros((N,2),np.float32);cue_meta=[]
    for k,(a,b,style,bpm) in enumerate(cues):
        # Build each cue at its own tempo, restarting its musical phrase.
        dur=b-a;ns['D']=dur+.8;ns['N']=round((dur+.8)*SR);raw=ns['sketch'](style,bpm)
        raw*=.09/max(.001,float(np.max(np.abs(raw))))
        temp=WORK/f'cue-{k}.wav';ns['write'](temp,raw)
        raw*=10**((-23-ns['lufs'](temp))/20)
        first=round(a*SR);ln=min(len(raw),N-first);x=np.arange(ln)/SR
        # Crossfade the last 0.65 s into the next cue; no abrupt musical cuts.
        env=np.ones(ln);outstart=dur-.65
        env*=np.minimum(1,np.maximum(0,(dur+.65-x)/1.3))
        if k>0:env*=np.minimum(1,x/.65)
        music[first:first+ln]+=raw[:ln]*env[:,None]
        cue_meta.append({'start_seconds':a,'end_seconds':b,'style':style,'bpm':bpm})
    # Consistent speech gain; same accepted native-rate/native-pitch narration.
    activity=np.zeros(N,np.float32)
    for i,st in enumerate(starts[:-1]):
        vd=B['motion_scene_seconds'][i]-.85;a=max(0,round((st+.16)*SR));b=min(N,round((st+.3+vd+.12)*SR));activity[a:b]=1;r=min(round(.1*SR),(b-a)//2)
        activity[a:a+r]=np.linspace(0,1,r);activity[b-r:b]=np.linspace(1,0,r)
    tt=np.arange(N)/SR;fade=np.minimum(1,np.minimum(tt/.8,(D-tt)/1.6));bed=music*(1-.36*activity[:,None])*fade[:,None]
    gain=1
    while np.max(np.abs(voice*fade[:,None]+bed*gain))>.9:gain*=.98
    mix=voice*fade[:,None]+bed*gain
    ns['write'](WORK/'chapter-mix.wav',mix);ns['write'](WORK/'chapter-bgm.wav',bed*gain)
    (WORK/'audio-verification.json').write_text(json.dumps({'cues':cue_meta,'voice_profile_unchanged':True,'new_script_recording':True,'peak_dbfs':float(20*np.log10(np.max(np.abs(mix)))),'hard_clipped_samples':0,'music_gain':gain},indent=2),encoding='utf-8')
    return WORK/'chapter-mix.wav'
def stamp(t):
    ms=round(t*1000);return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'
def main():
    audio=HERE/'audio/motion-theme-mix.wav' if HERE.name=='source' else R/'outputs/BITE-Midterm-Ukulele/source/audio/motion-ukulele-mix.wav'
    out=WORK/'motion-v10-checked.mp4'
    if not audio.exists():
        audio=WORK/'composite-audio.wav';subprocess.run([FF,'-y','-v','error','-i',str(O/'videos/BITE_MotionGraphic_Branded.mp4'),'-vn','-ar','48000',str(audio)],check=True)
    captions=[]
    for n in ORDER:
        ps=CAPS[n];cues=B['motion_sentence_starts'][str(n)]
        for i,p in enumerate(ps):captions.append((BODY_ACTUAL_START[n]+cues[i],BODY_ACTUAL_START[n]+cues[i+1] if i<len(ps)-1 else BODY_ACTUAL_START[n]+B['motion_scene_seconds'][n]-.02,' '.join(ps[:i+1])))
    (O/'videos/BITE_motion.srt').write_text('\n\n'.join(f'{i+1}\n{stamp(a)} --> {stamp(b)}\n{p}' for i,(a,b,p) in enumerate(captions)),encoding='utf-8')
    cmd=[FF,'-y','-f','rawvideo','-pix_fmt','rgb24','-s','1280x720','-r','24','-i','-','-i',str(audio),'-c:v','libx264','-threads','2','-preset','veryfast','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','256k','-t',str(D),'-movflags','+faststart',str(out)]
    with (WORK/'encode.log').open('wb') as log:
        p=subprocess.Popen(cmd,stdin=subprocess.PIPE,stdout=subprocess.DEVNULL,stderr=log)
        for k in range(round(D*FPS)):
            p.stdin.write(frame(k/FPS).tobytes())
            if k%(24*12)==0:print(f'design {k//24}/{D:.1f}s',flush=True)
        p.stdin.close();assert p.wait()==0
    for n in range(12):frame(float(BODY_ACTUAL_START[n]+B['motion_scene_seconds'][n]*.65)).save(WORK/f'qa-{n:02}.jpg',quality=94)
    sheet=Image.new('RGB',(1280,6*360),PAPER)
    for n in range(12):sheet.paste(Image.open(WORK/f'qa-{n:02}.jpg').resize((640,360)),((n%2)*640,(n//2)*360))
    sheet.save(WORK/'contact.jpg',quality=92)
    frame(float(BODY_ACTUAL_START[4]+3)).save(O/'assets/motion-poster.jpg',quality=94)
    __import__('shutil').copyfile(out,O/'videos/BITE_MotionGraphic_Branded.mp4')
    (HERE/'motion-timeline.json').write_text(json.dumps({'sections':TIMELINE,'duration_seconds':D,'chapter_hold_seconds':{str(n):CHAPTERS[n][3] for n in CHAPTERS}},ensure_ascii=False,indent=2),encoding='utf8')
    print('Finished redesigned film',flush=True)
if __name__=='__main__':main()
