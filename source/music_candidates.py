"""Five original, level-matched music sketches over the same approved speech."""
from pathlib import Path
import sys,math,json,wave,subprocess,re,zipfile
import numpy as np
R=Path(__file__).resolve().parents[2];W=R/'work/midterm-v3';O=R/'outputs/BITE-BGM-Candidates';O.mkdir(exist_ok=True)
TMP=W/'bgm-candidates';TMP.mkdir(exist_ok=True)
sys.path.insert(0,str(R/'work/media-python'))
import imageio_ffmpeg
FF=imageio_ffmpeg.get_ffmpeg_exe();SR=48000;D=10;N=SR*D
B=json.loads((W/'brief.json').read_text(encoding='utf-8'));start=sum(B['motion_scene_seconds'][:3])
with wave.open(str(W/'motion-voice-only.wav'),'rb') as f:
    f.setpos(round(start*SR));voice=np.frombuffer(f.readframes(N),dtype='<i2').reshape(-1,2).astype(np.float32)/32768
assert len(voice)==N
rng=np.random.default_rng(84)
def hz(n):return 440*2**((n-69)/12)
def write(p,a):
    assert np.max(np.abs(a))<1
    with wave.open(str(p),'wb') as f:
        f.setnchannels(2);f.setsampwidth(2);f.setframerate(SR);f.writeframes((a*32767).astype('<i2').tobytes())
def instrument(note,kind,dur=.5):
    x=np.arange(round(dur*SR))/SR;f=hz(note)
    if kind=='guitar':
        a=sum(g*np.sin(2*np.pi*f*h*x+.10*h)*np.exp(-x*(4+3*h)) for h,g in enumerate([1,.50,.25,.15,.08,.035],1))
    elif kind=='rhodes':
        a=(np.sin(2*np.pi*f*x+1.4*np.sin(2*np.pi*f*2*x)*np.exp(-x*12))+.22*np.sin(2*np.pi*f*3*x)*np.exp(-x*13))*np.exp(-x*4)
    elif kind=='wood':
        a=(np.sin(2*np.pi*f*x)*np.exp(-x*10)+.33*np.sin(2*np.pi*f*3.99*x)*np.exp(-x*32)+.12*np.sin(2*np.pi*f*9.9*x)*np.exp(-x*48))
    elif kind=='synth':
        a=sum(np.sin(2*np.pi*f*h*x)/h**1.7 for h in range(1,7))*np.exp(-x*8)
    elif kind=='pad':
        a=(np.sin(2*np.pi*f*x)+.25*np.sin(2*np.pi*f*2*x)+.2*np.sin(2*np.pi*f*1.003*x))*np.minimum(1,x/.09)*np.exp(-x*1.5)
    elif kind=='piano':
        a=sum(g*np.sin(2*np.pi*f*h*x)*np.exp(-x*(2.4+h*1.2)) for h,g in enumerate([1,.40,.22,.08,.03],1))
    elif kind=='bass':
        a=(np.sin(2*np.pi*f*x)+.25*np.sin(4*np.pi*f*x)+.08*np.sin(6*np.pi*f*x))*np.exp(-x*9)
    elif kind=='funkbass':
        a=(np.sin(2*np.pi*f*x)+.5*np.sin(4*np.pi*f*x)*np.exp(-x*15)+.16*np.sin(6*np.pi*f*x))*np.exp(-x*8)
    else:raise ValueError(kind)
    attack=np.minimum(1,x/.005);release=np.minimum(1,(dur-x)/.012)
    return a*attack*release
def drum(kind):
    if kind=='kick':
        x=np.arange(round(.22*SR))/SR;a=np.sin(2*np.pi*(52*x+43*.025*(1-np.exp(-x/.025))))*np.exp(-x*24)
    elif kind=='rim':
        x=np.arange(round(.08*SR))/SR;a=(np.sin(2*np.pi*920*x)+.35*np.sin(2*np.pi*1370*x))*np.exp(-x*65)
    elif kind=='snap':
        x=np.arange(round(.11*SR))/SR;a=(np.sin(2*np.pi*480*x)+.3*np.sin(2*np.pi*750*x))*np.exp(-x*43)
    elif kind=='hat':
        x=np.arange(round(.055*SR))/SR;a=sum(np.sin(2*np.pi*q*x) for q in [6300,7700,8900])*.25*np.exp(-x*100)
    a*=np.minimum(1,x/.003)*np.minimum(1,(len(x)/SR-x)/.005)
    return a
def sketch(style,bpm):
    m=np.zeros((N,2),np.float32);beat=60/bpm
    def add(a,t,g=.1,pan=0):
        st=round(t*SR)
        if st<0 or st>=N:return
        a=a[:N-st]*g
        m[st:st+len(a),0]+=a*(1-max(0,pan)*.45)
        m[st:st+len(a),1]+=a*(1+min(0,pan)*.45)
    def note(n,k,t,g=.1,pan=0,dur=.5):add(instrument(n,k,dur),t,g,pan)
    def chord(notes,k,t,g=.04,spread=.01,dur=.5):
        for j,n in enumerate(notes):note(n,k,t+j*spread,g,-.45+j*.3,dur)
    # C, F, G, C: all sketches use bright major-key harmony.
    triads=[(60,64,67),(65,69,72),(67,71,74),(60,64,67)]
    for bar in range(math.ceil(D/(4*beat))):
        t=bar*4*beat;ch=triads[bar%4];root=ch[0]-24
        if style=='acoustic':
            for off in [0,1,1.5,2.5,3,3.5]:chord(ch,'guitar',t+off*beat,.052 if off%1 else .07,.012,.45)
            for off,n in [(0,root),(2,root+7)]:note(n,'bass',t+off*beat,.16,dur=.36)
            for off in [0,2]:add(drum('kick'),t+off*beat,.09)
            for off in [1,3]:add(drum('snap'),t+off*beat,.045)
            for off,n in [(0,ch[1]+12),(1.5,ch[2]+12),(3,ch[0]+12)]:note(n,'guitar',t+off*beat,.045,.35,.5)
        elif style=='funk':
            sixth=ch+(ch[0]+9,)
            for off in [.5,1.25,2.5,3.5]:chord(sixth,'rhodes',t+off*beat,.043,.002,.32)
            for off,n in [(0,root),(.75,root),(1.5,root+7),(2.25,root+12),(2.75,root+7),(3.5,root)]:note(n,'funkbass',t+off*beat,.17,dur=.27)
            for off in [0,1,2,3]:add(drum('kick'),t+off*beat,.10)
            for off in [1,3]:add(drum('snap'),t+off*beat,.045)
            for off in [.5,1.5,2.5,3.5]:add(drum('hat'),t+off*beat,.017,.4)
            for off,n in [(1,ch[2]+12),(2.5,ch[1]+12)]:note(n,'rhodes',t+off*beat,.045,.3,.45)
        elif style=='marimba':
            pattern=[(0,ch[0]+12),(.5,ch[1]+12),(1,ch[2]+12),(1.75,ch[1]+12),(2.5,ch[0]+12),(3,ch[2]+12),(3.5,ch[1]+12)]
            for j,(off,n) in enumerate(pattern):note(n,'wood',t+off*beat,.15,(-.45 if j%2 else .45),.35)
            for off,n in [(0,root),(1.5,root+7),(2.5,root),(3.5,root+7)]:note(n,'bass',t+off*beat,.14,dur=.27)
            for off in [0,2]:add(drum('kick'),t+off*beat,.09)
            for off in [1,3]:add(drum('rim'),t+off*beat,.035)
        elif style=='house':
            chord(ch,'pad',t,.042,0,1.65)
            for off in [.5,1.5,2.5,3.5]:
                chord(ch,'synth',t+off*beat,.038,0,.24)
                note(root,'bass',t+off*beat,.18,dur=.24)
            for off in [0,1,2,3]:add(drum('kick'),t+off*beat,.16)
            for off in [.5,1.5,2.5,3.5]:add(drum('hat'),t+off*beat,.022,.3)
            for off,n in [(0,ch[2]+12),(1.5,ch[1]+12),(3,ch[0]+12)]:note(n,'synth',t+off*beat,.039,-.35,.45)
        elif style=='jazz':
            sixth=ch+(ch[0]+9,)
            for off in [0,1.66,3]:chord(sixth,'piano',t+off*beat,.070,.007,.65)
            for off,n in [(0,root),(1,root+4),(2,root+7),(3,root+9)]:note(n,'bass',t+off*beat,.17,dur=.38)
            for off in [1,3]:add(drum('rim'),t+off*beat,.042)
            for off in [0,2]:add(drum('kick'),t+off*beat,.06)
            for off,n in [(.66,ch[2]+12),(2.66,ch[1]+12)]:note(n,'piano',t+off*beat,.052,.4,.55)
    tt=np.arange(N)/SR;fade=np.minimum(1,np.minimum(tt/.14,(D-tt)/.32))
    # Identical timing and ducking for all five music beds.
    vlen=B['motion_scene_seconds'][3]-.85
    duck=np.ones(N,np.float32);a=round(.16*SR);b=min(N,round((.3+vlen+.12)*SR));duck[a:b]=.64
    r=round(.1*SR);duck[a:a+r]=np.linspace(1,.64,r);duck[b-r:b]=np.linspace(.64,1,r)
    m*=duck[:,None]*fade[:,None]
    m*=.10/max(.001,float(np.max(np.abs(m))))
    return m
def lufs(p):
    run=subprocess.run([FF,'-hide_banner','-i',str(p),'-af','loudnorm=I=-25:TP=-6:LRA=7:print_format=json','-f','null','-'],capture_output=True,check=True)
    s=run.stderr.decode(errors='replace');obj=json.loads(s[s.rfind('{'):s.rfind('}')+1]);return float(obj['input_i'])
styles=[('01_Acoustic_Pop','acoustic',114,'산뜻한 어쿠스틱 팝'),('02_Funky_Groove','funk',120,'리듬감 있는 펑키 팝'),('03_Marimba_Pop','marimba',126,'통통 튀는 마림바 팝'),('04_Light_House','house',124,'깔끔한 라이트 하우스'),('05_Bright_Jazz','jazz',102,'가벼운 재즈 그루브')]
meta=[]
for name,kind,bpm,label in styles:
    music=sketch(kind,bpm);temp=TMP/f'{name}.wav';write(temp,music)
    measured=lufs(temp);music*=10**((-25-measured)/20)
    mix=voice+music
    assert np.max(np.abs(mix))<.98
    out=O/f'{name}_10s.wav';write(out,mix)
    check=subprocess.run([FF,'-v','error','-i',str(out),'-f','null','-'],capture_output=True,check=True);assert not check.stderr
    with wave.open(str(out),'rb') as f:assert f.getnframes()==N
    meta.append({'file':out.name,'label':label,'bpm':bpm,'seconds':10,'music_lufs':round(measured+20*math.log10(10**((-25-measured)/20)),2),'voice_gain':1,'peak_dbfs':round(float(20*np.log10(np.max(np.abs(mix)))),2),'hard_clipped_samples':0})
    print(name,label,'done',flush=True)
metadata={'voice_excerpt_start_seconds':start,'same_voice_samples_for_all':True,'same_voice_gain_for_all':True,'music_target_lufs':-25,'music_source':'Five original procedural arrangements, not commercial songs','files':meta}
(O/'sample-notes.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2),encoding='utf-8')
with zipfile.ZipFile(O/'BITE_BGM_5_Samples.zip','w',zipfile.ZIP_DEFLATED) as z:
    for name,*_ in styles:z.write(O/f'{name}_10s.wav',f'{name}_10s.wav')
    z.write(O/'sample-notes.json','sample-notes.json')
with zipfile.ZipFile(O/'BITE_BGM_5_Samples.zip') as z:assert z.testzip() is None
print(json.dumps(metadata,ensure_ascii=False,indent=2))
