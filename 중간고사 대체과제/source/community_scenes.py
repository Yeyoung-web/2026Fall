"""Concept visuals for community-first BITE. All listings are fictional."""
from functools import lru_cache
from pathlib import Path
from PIL import Image as PILImage
@lru_cache(None)
def bread_sprite(path,width,angle):
    im=PILImage.open(path).convert('RGBA')
    im.thumbnail((width,round(width*2/3)),PILImage.Resampling.LANCZOS)
    return im.rotate(angle,resample=PILImage.Resampling.BICUBIC,expand=True)

def draw_scene(n,stage,k):
    Image=k['Image'];ImageDraw=k['ImageDraw'];text=k['text'];block=k['block'];rr=k['rr'];center=k['center'];pill=k['pill'];putplate=k['putplate']
    PAPER,INK,CORAL,MUTED,PEACH=[k[x] for x in ['PAPER','INK','CORAL','MUTED','PEACH']]
    bg,fg=k['palette'](n);im=Image.new('RGB',(1280,720),bg);d=ImageDraw.Draw(im)
    def bread(x,y,scale=1,angle=0):
        img=bread_sprite(str(k['O']/'assets/saltbread.png'),round(170*scale),angle)
        im.paste(img,(round(x-img.width/2),round(y-img.height/2)),img)
    if n==0:
        block(d,64,151,'식비는 부담.\n한 접시는 너무 많아.',65)
        text(d,67,424,'돈도, 음식도 아끼는 한 끼가 필요해요.',25,MUTED)
        putplate(im,1020,333,12,126)
        pill(d,889,484,'가격도, 양도 부담',CORAL)
    elif n==1:
        rows=[('할인을 놓쳤네.','제때 찾기 어려운 세일 정보'),('한 접시는 많아.','필요한 양보다 큰 주문 단위')]
        for i,(a,b) in enumerate(rows):
            y=149+i*136;col=PAPER if i<=stage else '#66685e';text(d,64,y,a,61,col,True)
            if i<=stage:text(d,800,y+31,b,24,PAPER)
            if stage==i:d.line((68,y+88,653,y+88),fill=CORAL,width=6)
    elif n==2:
        block(d,64,166,'돈도, 음식도\n아끼는 한 끼.',81,PAPER)
        text(d,68,442,'아끼기와 나누기, 하나의 식생활 경험.',29,PAPER)
        mark=PILImage.open(k['O']/'assets/logo/bite-mark.png').convert('RGBA');mark=mark.crop(mark.getbbox());mark.thumbnail((170,220),PILImage.Resampling.LANCZOS);white=PILImage.new('RGBA',mark.size,'white');white.putalpha(mark.getchannel('A'));im.paste(white,(round(1056-white.width/2),round(310-white.height/2)),white)
        center(d,1056,499,'BITE NOW',25,PAPER)
    elif n==3:
        text(d,64,138,'하나의 목표, 두 가지 방법.',57,INK,True)
        text(d,68,234,'돈도, 음식도 아끼는 한 끼.',26,MUTED)
        for i,(title,phase,line1,line2) in enumerate([
            ('아끼기','돈·음식 절약','이웃 제보 · 매장 직접 등록','가격 부담을 줄이는 방법'),
            ('나누기','필요한 양만','필요한 만큼, 반 접시 주문','남김 부담을 줄이는 방법')]):
            x=64+i*590;rr(d,(x,320,x+562,559),'white',24)
            text(d,x+27,338,title,48,CORAL,True);pill(d,x+401,345,phase,PEACH,INK,size=16)
            text(d,x+29,441,line1,25,INK,True);text(d,x+29,502,line2,22,MUTED)
    elif n==4:
        pill(d,64,111,'아끼기 · 세일 제보',CORAL,size=18)
        block(d,64,158,'세일 발견!\n우리 동네에 알려요.',61)
        text(d,68,432,'매장 등록을 기다리지 않는 첫 이용 이유.',24,MUTED)
        rr(d,(760,132,1216,566),'white',28);pill(d,785,154,'이웃 제보',INK, size=17)
        text(d,1186,179,'10분 전 확인',16,MUTED,False,'ra')
        for x in [880,1080]:
            for y in [242,307]:bread(x,y,.70)
        text(d,788,358,'안암 베이크 · 마감세일',27,INK,True)
        text(d,788,388,'소금빵 4개',22,INK,True)
        text(d,788,449,'오늘 20:00–21:00 · 현장 판매',19,MUTED)
        for x,label in [(787,'저장'),(919,'공유'),(1051,'봤어요')]:
            rr(d,(x,498,x+114,541),PEACH,14);center(d,x+57,519,label,18)
    elif n==5:
        block(d,64,173,'사진 한 장에,\n필요한 정보만.',62)
        text(d,68,425,'장소 · 가격 · 시간 · 확인 시각',26,CORAL,True)
        text(d,68,480,'초기 제보는 예약·재고 보장과 구분.',22,MUTED)
        rr(d,(796,117,1138,575),INK,39);rr(d,(804,125,1130,567),'white',32)
        rr(d,(907,139,1027,149),INK,5);text(d,829,175,'세일 알려주기',25,INK,True)
        rows=[('어디서?','안암 베이크'),('얼마에?','빵 4개 · 6,000원'),('언제 확인?','오늘 20:10')]
        for i,(a,b) in enumerate(rows):
            y=243+i*80;text(d,830,y,a,17,MUTED)
            if stage>=i:text(d,830,y+29,b,23,INK,True)
        rr(d,(826,510,1108,552),CORAL,14);center(d,967,530,'동네에 공유',21,PAPER)
    elif n==6:
        block(d,64,162,'정보는 새롭게.\n헛걸음은 적게.',64)
        text(d,68,426,'다녀온 사람이 상태를 다시 알려요.',25,MUTED)
        rows=[('판매 중','20:15 · 방문자 확인'),('품절','남은 수량이 없어요'),('종료','할인 시간이 지났어요')]
        for i,(a,b) in enumerate(rows):
            y=157+i*135;active=i==stage;rr(d,(751,y,1216,y+110),CORAL if active else 'white',24)
            c=PAPER if active else INK;text(d,780,y+15,a,33,c,True);text(d,780,y+66,b,20,c)
    elif n==7:
        block(d,64,142,'사람들이 모이는 곳에,\n매장도 직접.',55)
        text(d,68,430,'방문·재방문이 확인되면 참여를 제안.',24,MUTED)
        text(d,68,482,'매장 직접 등록 → 재고 설정 → 예약·픽업',23,CORAL,True)
        rr(d,(783,144,1187,565),'white',28);pill(d,812,166,'아끼기 · 매장 직접 등록',INK,size=18)
        text(d,816,252,'마감 베이커리 박스',27,INK,True)
        for x in [885,1080]:
            for y in [310,350,390]:bread(x,y,.52)
        text(d,817,426,'24,000원',20,MUTED);d.line((817,441,912,441),fill=MUTED,width=2);text(d,930,417,'→ 9,900원',27,CORAL,True)
        text(d,817,467,'수량 3개 · 픽업 20:00–21:00',20,MUTED)
        rr(d,(814,508,1157,549),CORAL,13);center(d,986,528,'매장 등록 상품 예약',20,PAPER)
    elif n==8:
        block(d,64,128,'나누기는, 수요가 쌓인 곳부터.',47)
        pill(d,959,207,'나누기 · 이후 확장',INK,size=18)
        text(d,66,533,'필요한 양을 모아 주문 · 매장이 각자 준비',26,INK,True)
    elif n==9:
        block(d,64,164,'득템을 공유하고,\n다시 찾게.',68)
        text(d,68,439,'팔로워 수보다, 동네에서 얻는 실용적인 정보.',23,MUTED)
        rr(d,(773,155,1216,552),'white',27);pill(d,800,179,'방문 후기 예시',INK,size=17)
        text(d,803,259,'오늘 빵 4개, 6,000원에!',27,INK,True)
        for x in [886,1100]:
            for y in [327,382]:bread(x,y,.65)
        text(d,804,433,'“제보 보고 들렀어요.”',28,CORAL,True)
        text(d,804,492,'구매 경험 → 정보 확인 → 다음 방문',19,MUTED)
    elif n==10:
        block(d,64,148,'한 동네에서 시작.\n정확한 정보부터.',62)
        text(d,68,442,'BITE Beta · Anam',31,CORAL,True)
        text(d,68,498,'실제 방문과 재방문을 먼저 검증.',23,MUTED)
        rows=[('01','제보 정확도'),('02','제보 → 실제 방문'),('03','재방문 · 매장 참여 의향')]
        for i,(a,b) in enumerate(rows):
            y=166+i*131;rr(d,(771,y,1216,y+107),'white',24);text(d,801,y+24,a,38,CORAL,True);text(d,876,y+36,b,23,INK,True)
    else:
        p=k['logo'](425,True);im.paste(p,(round(640-p.width/2),round(240-p.height/2)),p)
        center(d,640,414,'돈도, 음식도',57,PAPER)
        center(d,640,482,'아끼는 한 끼.',57,PAPER)
        center(d,640,549,'Save money. Waste less.',24,PAPER,False)
    return k['chrome'](im,n)
