from pathlib import Path
import json, textwrap, io
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.graphics import renderPDF
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor, Color, white
from reportlab.lib.utils import ImageReader
HERE=Path(__file__).resolve().parent;R=HERE.parents[1]; O=HERE.parent if HERE.name=='source' else R/'outputs/BITE-Midterm-New-BGM';B=json.loads((HERE/'brief.json').read_text(encoding='utf-8'))
def jpeg_image(p):
 im=Image.open(p).convert('RGB');im.thumbnail((1500,1000));buf=io.BytesIO();im.save(buf,'JPEG',quality=87);buf.seek(0);return ImageReader(buf)
pdfmetrics.registerFont(TTFont('KR','C:/Windows/Fonts/NanumBarunGothic.ttf'))
pdfmetrics.registerFont(TTFont('KRB','C:/Windows/Fonts/NanumBarunGothicBold.ttf'))
W,H=595.28,841.89; M=44; CW=W-M*2
INK=HexColor('#252622'); ORANGE=HexColor('#f65336'); MUTED=HexColor('#6b6e64'); PAPER=HexColor('#f7f6f2'); PALE=HexColor('#eaeae2')
path=O/'report/BITE_Midterm_Report.pdf'; c=canvas.Canvas(str(path),pagesize=(W,H));c.setTitle('BITE | 먹고 싶은 만큼만. | 중간 프로젝트 보고서');c.setAuthor('이예영');c.setCreator('BITE Report · 이예영');page=0
def text(x,y,s,size=10,color=INK,bold=False):
 c.setFillColor(color);c.setFont('KRB' if bold else 'KR',size);c.drawString(x,y,s)
def wrap(s,width,size=10,bold=False):
 lines=[];font='KRB' if bold else 'KR'
 for para in s.split('\n'):
  line=''
  for ch in para:
   if pdfmetrics.stringWidth(line+ch,font,size)>width:
    lines.append(line);line=ch
   else:line+=ch
  lines.append(line)
 return lines
def para(s,y,x=M,width=CW,size=10,leading=16,color=INK,bold=False):
 for line in wrap(s,width,size,bold):text(x,y,line,size,color,bold);y-=leading
 if y<46:raise ValueError(f'Page {page} overflow: {y}')
 return y
def rule(y):c.setStrokeColor(HexColor('#d8dad0'));c.line(M,y,W-M,y)
def box(x,y,w,h,fill=PALE):c.setFillColor(fill);c.roundRect(x,y,w,h,12,fill=1,stroke=0)
def start(kicker,title,sub=''):
 global page
 page+=1;c.setFillColor(PAPER);c.rect(0,0,W,H,fill=1,stroke=0)
 c.drawImage(ImageReader(str(O/'assets/logo/bite-logo.png')),M-2,H-45,width=75,height=30,mask='auto');text(W-195,H-35,'MIDTERM PROJECT / 2026',8,MUTED)
 rule(H-53);text(M,H-88,kicker,9,ORANGE,True);text(M,H-124,title,25,INK,True)
 if sub:para(sub,H-149,size=10,color=MUTED)
 return H-190
def finish():
 rule(40);text(M,25,'BITE Beta · Anam | 먹고 싶은 만큼만.',8,MUTED);text(W-M-20,25,f'{page:02}',9,ORANGE,True);c.showPage()
def heading(s,y):text(M,y,s,14,INK,True);return y-25
def bullet(label,body,y):
 text(M,y,label,11,ORANGE,True);return para(body,y-21,size=10)-23
def table(headers,rows,y,widths=None,rowh=42):
 widths=widths or [CW/len(headers)]*len(headers);c.setFillColor(INK);c.roundRect(M,y-30,CW,30,7,fill=1,stroke=0)
 xx=M
 for hd,w in zip(headers,widths):text(xx+10,y-19,hd,9,white,True);xx+=w
 y-=30
 for row in rows:
  hh=max(rowh,max(len(wrap(str(s),w-20,9)) for s,w in zip(row,widths))*14+18)
  c.setFillColor(white);c.rect(M,y-hh,CW,hh,fill=1,stroke=0);xx=M
  for s,w in zip(row,widths):para(str(s),y-17,xx+10,w-20,9,14);xx+=w
  c.setStrokeColor(PALE);c.line(M,y-hh,W-M,y-hh);y-=hh
 if y<55:raise ValueError(f'Table overflow {page}: {y}')
 return y-25

def image(p,x,y,w,h):
 im=Image.open(p);c.drawImage(ImageReader(im),x,y,width=w,height=h,preserveAspectRatio=True,anchor='c',mask='auto')
def logo(x,y,w,white_version=False):
 im=Image.open(O/'assets/logo'/('bite-logo-white.png' if white_version else 'bite-logo.png')).convert('RGBA');im=im.crop(im.getbbox());c.drawImage(ImageReader(im),x,y,width=w,height=w*im.height/im.width,mask='auto')


def repo_qr(x,y,size=82):
 q=QrCodeWidget('https://github.com/Yeyoung-web/2026Fall');bounds=q.getBounds();width=bounds[2]-bounds[0];height=bounds[3]-bounds[1]
 drawing=Drawing(size,size,transform=[size/width,0,0,size/height,0,0]);drawing.add(q)
 c.setFillColor(white);c.roundRect(x-4,y-4,size+8,size+8,5,fill=1,stroke=0);renderPDF.draw(drawing,c,x,y)
 c.linkURL('https://github.com/Yeyoung-web/2026Fall',(x,y,x+size,y+size),relative=0)

# Layout has thirteen numbered pages; contents use the same page map.
page+=1;c.setFillColor(INK);c.rect(0,0,W,H,fill=1,stroke=0);logo(M,620,310,True)
text(M,554,'먹고 싶은 만큼만.',29,white,True);text(M,514,'Save money. Waste less.',16,ORANGE,True)
para('아끼기로 시작하고, 나누기로 확장하는\n동네 음식 생활 플랫폼',425,size=24,leading=38,color=white,bold=True)
para('중간 프로젝트 보고서\n이예영 / 2021130860\nGitHub: https://github.com/Yeyoung-web/2026Fall',262,size=13,leading=26,color=white)
repo_qr(459,89,82);text(468,72,'GitHub',9,white)
text(M,100,'2026.10.29 | BITE Beta · Anam',11,white);finish()
y=start('CONTENTS','전체 구성','사업 구상과 두 영상의 제작 방식')
for title,pno in [('사업을 구상한 이유와 경쟁 비교',3),('아끼기: 이웃 제보와 매장 직접 등록',4),('나누기: 반 접시 주문의 운영 구조',5),('진입 일정과 사업 검증 계획',6),('v9 MVP의 구현 범위',7),('모션그래픽: 기능과 절차의 시각화',8),('AI 영화: 반 접시의 밤',9),('AI 영화 제작 과정과 프롬프트',10),('AI 협업: 도구를 연결한 제작과 검토',11),('브랜드 디자인과 영상 적용',12),('평가 기준 연결과 출처',13)]:
 text(M,y,title,13,INK,True);text(W-M-20,y,str(pno),13,ORANGE,True);rule(y-15);y-=42
para('이유: 식비 부담과 과잉 주문의 불편\n내용: 아끼기와 나누기\n계획: 안암에서 지역 수요 검증 후 단계적 확장\n절차: 제보·확인·방문에서 매장 등록·예약·반 접시 주문으로',175,size=11,leading=21);finish()
y=start('01 / 사업 배경','좋은 할인은 가까이에 있다','돈도 아끼고 필요한 만큼만 먹는 생활 경험에서 출발했다.')
y=bullet('구상 이유','학생과 자취생에게 식비는 반복되는 부담이다. 동네 세일은 흩어져 있고, 정보가 늦으면 헛걸음하게 된다. 한편 통닭이나 피자처럼 한 단위로 파는 음식은 필요한 양보다 커 주문을 포기하게 만든다.',y)
y=table(['비교 대상','기존 이용 맥락 / BITE의 설계'],[['당근 동네생활','동네 정보와 가게 소식을 공유하는 커뮤니티. BITE는 세일 제보를 확인 시각·판매 상태 중심으로 구조화하고, 이후 매장 예약·나누기로 연결한다.'],['마감 할인 서비스','라스트오더 등 잉여 상품 할인 서비스가 존재한다. BITE는 초기 매장 입점 이전에 이웃 제보를 이용 이유로 삼는다.'],['공동 주문 사례','공동 주문 자체가 새롭다는 주장은 하지 않는다. 매장이 준비·제공을 맡아 손님 간 만남과 음식 분배가 필요 없는 구조에 집중한다.']],y,[110,CW-110],80)
y=heading('차별화는 검증할 가설이다',y)
para('동네생활에서도 할인 정보가 공유될 수 있으므로 단순 게시판만으로는 차별화하기 어렵다. BITE는 정보의 최신성, 실제 방문 피드백, 매장과 연결되는 주문 경험으로 반복 이용 이유를 만들고자 한다. 현재 제휴·매출·고객 수가 검증된 서비스는 아니다.',y,size=11,leading=19);finish()
y=start('02 / 아끼기','제보가 첫 이용 이유','아끼기 = 이웃의 세일 제보 · 매장 직접 등록(할인·마감 상품 예약)')
y=bullet('발견 → 제보 → 확인 → 방문','사진, 위치, 구성과 양, 할인 전후 가격, 할인 시간과 확인 시각을 등록한다. 예: 소금빵 4개 10,000원 → 6,000원. 초기 제보는 현장 판매 정보이며 예약이나 재고를 보장하지 않는다.',y)
y=bullet('판매 중 → 품절 → 종료','다녀온 이웃이 상태를 갱신하고 오래된 정보의 노출을 줄인다. 정보 확인 시각을 함께 보여 방문자가 최신성을 판단하도록 한다.',y)
y=bullet('왜 제보하는가','정확한 제보와 갱신에 포인트·동네 등급을 부여하고, “제보 보고 다녀왔어요” 피드백으로 기여를 확인한다. 중복·허위 제보로 점수를 얻지 못하도록 방문 확인과 정정 이력을 반영한다. 보상이 실제 제보의 지속으로 이어지는지는 파일럿에서 검증한다.',y)
y=bullet('매장 직접 등록으로 확장','방문과 재방문이 쌓인 동네에서 매장 참여를 제안한다. 매장이 상품·재고·픽업 시간을 직접 관리하는 할인·마감 상품 등록과 예약으로 확장한다. 이웃도 마감세일을 제보할 수 있다. 구분 기준은 할인 종류가 아니라 등록 주체, 예약·재고 관리 여부다.',y)
image(O/'assets/motion-poster.jpg',M,70,CW,210);finish()
y=start('03 / 나누기','한 접시 대신, 반 접시 주문','나누기 = 반 접시 주문(분할 주문). 매장이 각자의 몫을 준비한다.')
y=table(['단계','운영 절차'],[['사전 설정','매장이 나누기 허용 메뉴·분량·가격·소분비·시간을 공개'],['고객 모집','고객이 공개 조건을 확인해 필요한 몫을 요청하고, 다른 고객이 참여'],['매장 최종 수락','예: 10분간 모집. 수량 충족 후 매장이 최종 수락하면 결제 확정·조리 시작'],['실패 처리','기한 내 미충족·매장 거절 시 결제 승인 취소. 최종 수락 전에는 조리하지 않음'],['준비·제공','처음부터 별도 포장 또는 테이블별 제공. 손님 간 만남·분배 불필요']],y,[105,CW-105],53)
y=bullet('매장이 반 접시 메뉴를 팔면 되지 않을까?','독립적으로 반 접시를 조리할 수 있다면 단품 소량 메뉴가 더 간단할 수 있다. 매칭은 통닭·피자·대방어처럼 조리·판매 단위가 크거나 한 단위 수요를 모아야 하는 메뉴에 의미가 있다. 매장이 허용한 메뉴에만 적용하며 추가 소분비를 설정할 수 있다.',y)
para('가상 예시: 한 접시 32,000원 → 반 접시 16,000원 + 소분비 300원. 한 고객이 3몫 중 2몫을 선택하는 설계도 가능하다. 실제 운영에 앞서 매장 업무량과 수익, 매칭 대기 허용 시간을 확인한다.',y,size=10,leading=17);finish()
y=start('04 / 추진 일정','안암에서 작게, 밀도 있게','일정은 운영 검증에 따라 조정하는 목표이며 확정된 제휴 일정이 아니다.')
y=table(['목표 시기','실행과 진행 판단'],[['2026년 11~12월','안암 세일 제보 파일럿. 소수 참여자와 매장 밀집 구역에서 정보 정확도·실제 방문·재방문 검증'],['2027년 상반기','방문 수요가 확인된 3~5개 개인 점포에 참여 제안. 오늘마감 등록·재고 관리·예약·픽업 실험'],['이후 검증 통과 시','동일 매장·메뉴·시간대 수요를 확인한 뒤 5~10개 허용 메뉴로 나누기 파일럿']],y,[115,CW-115],79)
y=bullet('수익 모델','소비자 이용은 무료로 계획한다. 거래가 발생하는 오늘마감 예약·나누기 주문의 소액 수수료, 매장 분석 서비스의 유료화를 검토한다. 초기 제보 수를 매출로 계산하지 않는다.',y)
y=bullet('검증 지표','아끼기는 제보 정확도·유효 정보 비율·실제 방문·재방문·매장 참여 의향을 확인한다. 나누기는 매칭률·중앙 매칭시간·실패율·수령 완료율·매장 추가 주문을 측정한다.',y)
para('지역 이용자 증가 → 같은 시간대 수요 증가 → 매칭 경험 개선 → 매장 참여·메뉴 증가라는 선순환을 기대한다. 지역 트래픽이 곧바로 동일 메뉴 수요가 되는 것은 아니므로 단계마다 별도로 검증한다.',y,size=11,leading=19);finish()
y=start('05 / MVP','복잡한 흐름부터 검증했다','v9는 나누기의 기술 검증용 모바일 웹 프로토타입이다.')
y=para('진입 전략은 아끼기지만, 개발에서는 기술적으로 가장 복잡한 요청·매칭·결제 상태 전이를 먼저 검증하기 위해 나누기 흐름을 선행 구현했다. 결제·배달·POS는 실제 연동이 아닌 시뮬레이션이다. 세일 제보 커뮤니티는 다음 개발 범위이며 영상 속 화면은 서비스 구상이다.',y,size=11,leading=18)
for i,(name,label) in enumerate([('mvp-home.png','홈 · 메뉴 발견'),('mvp-split.png','나누기 · 몫 선택\n(앱 내 기존 명칭: 같이먹기)'),('mvp-request.png','고객 요청·매장 확인')]):
 p=O/'assets'/name
 if p.exists():image(p,M+i*174,230,160,315);para(label,208,M+i*174,160,8.8,13,color=INK,bold=True)
y=bullet('동작 범위','몫 수량 선택, 매칭·만료, 결제 승인·확정·취소, 주문·픽업 코드, 테이블 연결, 고객 요청·매장 조건 확인을 모델링했다.',170)
para('개발 우선순위: 세일 제보 작성 → 위치·가격·시간 확인 → 판매 상태 갱신 → 저장·공유 → 방문 피드백. 이후 검증 결과에 따라 매장 예약과 나누기를 연결한다.',y,size=10,leading=17);finish()
y=start('06 / 모션그래픽','한 끼의 두 가지 방법','재생 시간 2분 10.21초 | 이웃 제보 → 매장 직접 등록 → 나누기 → 안암 검증')
image(O/'assets/motion-split.jpg',M,390,CW,250)
y=374;y=bullet('이유와 내용','식비 부담과 필요한 양보다 큰 한 접시의 불편에서 출발해 “돈도, 음식도 아끼는 한 끼”라는 하나의 사업 테마를 제시한다. 아끼기는 가격 부담을, 나누기는 양과 남김의 부담을 줄이는 두 가지 방법이다. 아끼기의 이웃 세일 제보와 매장 직접 등록, 나누기의 반 접시 주문을 구분한다.',y)
y=bullet('표현과 절차','할인 가격 카운트다운과 취소선, 판매 중·품절·종료 전환, 한 접시가 두 몫으로 나뉘는 동작으로 기능을 설명한다.\n아끼기는 03-1 이웃 세일 제보, 03-2 매장 직접 등록으로 나눈다. 각 장 표지는 2.5~3초 동안 제시하고, 표지가 끝난 뒤 해당 설명을 시작한다. 문장 누적 자막은 최대 두 줄로 구성한다.',y)
para('계획: 안암의 정보 정확도와 방문·재방문을 먼저 검증한 뒤 매장 참여와 나누기로 확장한다. 밝은 음악과 코랄 색상으로 실용적인 음식 생활 서비스의 인상을 전달한다.',y,size=10,leading=17);finish()
y=start('07 / AI 영화','반 접시의 밤','재생 시간 2분 6.75초 | 인물의 불편에서 주문과 매장 제공으로 이어지는 미래 이용 시나리오')
image(O/'assets/film-brand-24.jpg',M,425,CW,210)
image(O/'assets/film-story-strip.jpg',M,315,CW,95)
y=294;y=para('지우와 친구는 양과 가격 때문에 주문을 망설인다. 삼번 테이블이 매장이 미리 허용한 메뉴의 공개 조건을 보고 반 접시를 요청한다. 칠번 테이블도 참여해 한 접시 수량이 모이면, 매장이 최종 주문을 수락한 뒤 결제를 확정하고 각각 준비한다. 합석이나 손님 간 음식 분배 없이 필요한 만큼 먹는 경험을 보여준다.',y,size=11,leading=19)
y=bullet('이유·내용·절차','한 접시와 반 접시의 가격을 비교하고, 허용 메뉴의 조건 공개 → 요청·참여 → 수량 충족 → 매장 최종 수락 → 결제·준비·제공을 이야기로 연결한다. 화면은 가상 이용 시나리오이며 실제 거래 장면이 아니다.',y-10)
para('엔딩은 영화 장면 뒤에 “돈도, 음식도 아끼는 한 끼”라는 공통 콘셉트와 아끼기·나누기 두 축을 먼저 제시한다. 이후 아끼기부터 시작하는 이유로 이어진다. 이웃의 세일 제보와 매장의 직접 등록을 구분하고, 방문 수요를 확인해 매장 등록·예약으로 확장한 뒤 나누기를 더한다. 세부 주문·결제 절차는 사업 설계에서 다룬다. 생성 영상 특성상 컷 사이 인물·음식 형태에 차이가 있을 수 있다.',y,size=10,leading=17);finish()
y=start('08 / 제작 과정','장면 설계에서 최종 합성까지','Veo 생성 동영상, 한국어 합성 내레이션, 직접 작성한 그래픽을 편집했다.')
p=O/'assets/Flow-generation-proof.png';im=Image.open(p);image(p,M,435,CW,210)
y=414;y=para('Google Flow / Veo 3.1 Lite로 장면별 8초 동영상을 생성했다. 인물의 손짓, 주문 확인, 조리와 음식 집기 등 실제 움직임을 담고, 컷의 의미가 내레이션과 맞도록 필요한 구간을 선택해 편집했다.',y,size=10,leading=17)
y=heading('장면 프롬프트 예시',y-13)
y=para('요청 장면: “Over-the-shoulder shot of the woman holding a phone. She taps once. Her friend leans in and nods. No readable screens.”\n\n다른 테이블: “Two adult women check a phone at a separate table. They stay seated and never meet the main friends.”',y,size=9,leading=15)
y=heading('합성과 음향',y-12)
para('Python/Pillow로 타이포·카드·자막·애니메이션 프레임을 구성하고 FFmpeg로 H.264/AAC 영상에 합성했다. 한국어 내레이션은 SunHi 음성으로 제작하며 BGM은 말소리 아래로 낮췄다. 메뉴의 생성 문자와 서빙 컷은 내용 전달을 방해하지 않도록 구도를 조정했다.',y,size=10,leading=17);finish()
y=start('09 / AI 협업','AI를 제작 전 과정에 연결하다','기획 · 브라우저 조작 · 생성 · 교차 검토 · 수정 · 검증의 반복')
y=para('AI를 단발성 결과물 생성에 한정하지 않고, 사업 구상부터 MVP 구현·영상 생성·편집·보고서 작성·품질 확인까지 연결했다. ChatGPT/Codex의 제작 결과를 Claude로 교차 검토하고, 내가 판단한 개선점을 반영했다.',y,size=11,leading=19)
y-=17
y=table(['구간 / 도구','활용 방식과 나의 판단'],[
 ['기획·구현\nChatGPT·Codex','사업의 두 축과 진입 순서, 고객 요청·매칭·결제 상태를 구체화하고 MVP와 영상 편집 코드를 제작했다. 나는 소비자·매장 경험과 사업 논리의 일관성을 판단했다.'],
 ['생성·조작\nGoogle Flow','브라우저 연동·자동화로 AI가 Flow 화면을 직접 조작해 장면별 프롬프트 입력과 생성 작업을 수행하도록 했다. 나는 주문·조리·테이블 제공 장면의 의미를 확인했다.'],
 ['교차 검토\nClaude','제작 결과물과 과제 공지를 함께 제시해 요구 항목 충족, 서사 흐름, 화면의 모순과 가독성을 검토했다. 검토 의견을 그대로 채택하지 않고 사업 의도와 맞는지 비교했다.'],
 ['재제작\nChatGPT·Codex','내 피드백과 외부 AI의 검토 의견을 전달해 대본·그래픽·자막·음향·보고서를 수정하고 재출력했다. 문장 단위 음성 분리와 쉼, 얼굴을 가리지 않는 카드 배치 등 구체적인 기준을 제시했다.'],
 ['최종 확인\n직접 검토·자동 검사','두 영상의 이유·내용·계획·절차, 실제 재생 시간과 화면 의미를 확인했다. 코드로 프레임 수·자막·음량·파일 무결성을 확인하고, 내가 최종 결과물을 보고 판단했다.']
 ],y,[122,CW-122],72)
y=heading('내가 주도한 핵심 의사결정',y)
para('돈도, 음식도 아끼는 한 끼라는 통합 테마, 이웃 제보와 매장 직접 등록의 구분, 아끼기에서 나누기로 가는 단계적 확장, 고객 참여 후 매장 최종 수락이라는 운영 순서를 반복 검토했다. AI의 실행 능력을 활용하면서 사업 방향과 최종 선택의 책임은 제작자인 내가 맡았다.',y,size=10,leading=17);finish()
y=start('10 / 브랜드','한입의 모양으로 기억하는 BITE','코랄·차콜·웜 오프화이트와 베어 문 B 심볼')
box(M,525,CW,150,white);logo(M+60,555,330)
y=497;y=para('B의 오른쪽을 곡선으로 베어 문 형태와 간결한 워드마크를 결합했다. 코랄은 음식의 따뜻함과 활기, 차콜은 정보의 가독성, 웜 오프화이트는 음식 사진을 받치는 바탕이다. 환경 상징보다 식비 절약과 득템의 감각을 우선한다.',y,size=11,leading=19)
for i,(p,label) in enumerate([(O/'assets/motion-poster.jpg','모션그래픽'),(O/'assets/film-brand-24.jpg','AI 영화')]):
 image(p,M+i*260,185,247,139);text(M+i*260,163,label,11,INK,True)
para('두 영상 상단에 같은 로고를 배치하고 엔딩에서 크게 보여 브랜드를 연결했다. 인물의 얼굴과 가격·자막을 가리지 않도록 정보 카드는 얼굴 아래 영역에 배치한다.',119,size=10,leading=17);finish()
y=start('11 / 평가와 출처','사업 구상과 제작을 연결하다','모션그래픽 1편 · AI 영화 1편 · 보고서')
y=table(['평가 기준','본 프로젝트의 접근'],[['참여도','AI 도구를 연결해 기획·생성·교차 검토·수정을 반복하고 제작자가 최종 판단'],['완성도','이유·내용·계획·절차를 두 영상과 보고서에 연결'],['난이도','상태 기반 MVP, 직접 프레임 렌더링, AI 생성 동영상(Veo) 영화, 음향 합성'],['독창성','세일 제보의 최신성 관리에서 매장 예약·반 접시 주문으로 연결']],y,[85,CW-85],47)
y=heading('자료와 제작 자산',y)
y=para('사업 기획 및 v9 프로토타입: 이예영, BITE 개인 프로젝트.\n동네 정보 공유 참고: 당근 공식 보도자료 “당근 동네백과, 지역생활 지침서 역할 톡톡!”(2024.01.26).\nAI 영상: Google Flow / Veo 3.1 Lite. 로고·그래픽: 프로젝트 자체 설계.\nBGM: ikoliks - Children Ukulele Upbeat Positive Pop Rock (Pixabay Content License).\nBGM: SoundSurfer - Restaurant (Pixabay Content License).\n음원 출처와 라이선스 URL은 source/music-credit.md에 수록했다.',y,size=9,leading=16)
y=heading('영상과 저장소',y-15)
for label,rel in [('모션그래픽 보기','https://github.com/Yeyoung-web/2026Fall/blob/main/%EC%A4%91%EA%B0%84%EA%B3%A0%EC%82%AC%20%EB%8C%80%EC%B2%B4%EA%B3%BC%EC%A0%9C/videos/BITE_MotionGraphic_Branded.mp4'),('AI 영화 보기','https://github.com/Yeyoung-web/2026Fall/blob/main/%EC%A4%91%EA%B0%84%EA%B3%A0%EC%82%AC%20%EB%8C%80%EC%B2%B4%EA%B3%BC%EC%A0%9C/videos/BITE_AI_Film_Generated_Video.mp4')]:
 text(M,y,label,11,ORANGE,True);c.linkURL(rel,(M,y-3,M+180,y+14),relative=0);y-=26
para('GitHub: https://github.com/Yeyoung-web/2026Fall\n제작자: 이예영 / 2021130860',y,size=10,leading=20)
c.linkURL('https://github.com/Yeyoung-web/2026Fall',(M,y-3,W-M,y+14),relative=0)
finish();c.save();assert page==13;print(f'Report: {page} pages / {path}',flush=True)
