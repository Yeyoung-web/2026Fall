import { INITIAL_MEMBERS, roomKey, type Meeting, type Photo } from './models'
import type { Expense, SplitRule } from '../engine/settlement'
const ids = INITIAL_MEMBERS.map(m => m.id)
interface Scene { date: string; title: string; emotions: string[]; scene: string; places: [string, number, Expense['category']][] }
const scenes: Scene[] = [
  { date: '2025-02-14', title: '떡볶이와 끝없는 수다', scene: 'food', emotions: ['수다 3시간', '맵다고 웃은 횟수 ∞'], places: [['우리동네 떡볶이', 28000, 'restaurant'], ['달콤한 아이스크림', 12000, 'cafe']] },
  { date: '2025-03-22', title: '생일 축하해, 우리의 봄', scene: 'birthday', emotions: ['소원 하나', '너를 위한 마음 네 개'], places: [['작은 케이크 가게', 38000, 'cafe'], ['생일 저녁 식탁', 84000, 'restaurant'], ['네 컷 사진관', 8000, 'other']] },
  { date: '2025-04-12', title: '벚꽃 아래, 네 사람', scene: 'spring', emotions: ['벚꽃잎 주운 날', '사진으로 못 담은 바람'], places: [['봄날의 김밥', 24000, 'restaurant'], ['공원 옆 카페', 22000, 'cafe'], ['한강 자전거', 16000, 'other']] },
  { date: '2025-05-17', title: '시험 끝! 오늘은 아무 생각 없이', scene: 'picnic', emotions: ['해방감 100%', '내일 걱정은 내일'], places: [['수고했어 파스타', 62000, 'restaurant'], ['보드게임 카페', 32000, 'cafe']] },
  { date: '2025-06-28', title: '낯선 동네에서 찾은 단골', scene: 'coffee', emotions: ['새 단골집 +1', '길 잃어도 함께니까'], places: [['골목의 작은 카페', 26000, 'cafe'], ['오래된 책방', 18000, 'other'], ['성수 저녁 골목', 56000, 'restaurant']] },
  { date: '2025-08-09', title: '1박 2일, 우리의 여름', scene: 'travel', emotions: ['파도 소리 무제한', '별 세다 잠든 밤'], places: [['바다로 가는 기차', 120000, 'other'], ['바닷가 점심', 64000, 'restaurant'], ['작은 바다 숙소', 240000, 'stay'], ['밤바다 편의점', 38000, 'other'], ['돌아오는 아침 커피', 18000, 'cafe']] },
  { date: '2025-09-20', title: '서운한 마음도, 결국 우리라서', scene: 'bar', emotions: ['미안해 한마디', '화해의 포옹 네 번'], places: [['우리의 단골 술집', 78000, 'bar'], ['따뜻한 해장 국밥', 36000, 'restaurant']] },
  { date: '2025-11-08', title: '낙엽 밟으며 나눈 작은 꿈', scene: 'autumn', emotions: ['바스락 소리 한 봉지', '꿈을 응원하는 마음'], places: [['늦가을 브런치', 58000, 'restaurant'], ['숲길의 찻집', 24000, 'cafe'], ['작은 전시관', 28000, 'other']] },
  { date: '2025-12-27', title: '올해도 너희라서 참 좋았어', scene: 'winter', emotions: ['함께한 1년', '내년에도 우리 ♡'], places: [['따뜻한 연말 식탁', 96000, 'restaurant'], ['겨울밤 카페', 24000, 'cafe'], ['우리의 마지막 네 컷', 8000, 'other']] },
]
/** Locally generated, offline demo illustrations. Not actual user photographs. */
export function demoIllustration(scene: string, variant = 0): string {
  const palettes: Record<string, [string, string, string]> = {
    food: ['#ded2bc', '#eee2ce', '#bb6546'], birthday: ['#e2d2c2', '#f7ecdb', '#8d9c71'],
    spring: ['#d6ddcf', '#f8ede3', '#daafa9'], picnic: ['#cad4bd', '#e3dbc4', '#839468'],
    coffee: ['#cbd2be', '#e7dfcf', '#98734f'], travel: ['#c2d8d7', '#f1e5ce', '#739b9b'],
    bar: ['#9caa8a', '#d8ceb9', '#697b57'], autumn: ['#ddd3b9', '#ede0c3', '#a88855'],
    winter: ['#c8d2c6', '#eee8d8', '#5b7763'],
  }
  const [bg, light, accent] = palettes[scene] ?? palettes.coffee
  const items: Record<string, string> = {
    food: '<ellipse cx="270" cy="238" rx="120" ry="46" fill="#f5eee2"/><ellipse cx="270" cy="231" rx="98" ry="30" fill="#b96143"/><g stroke="#e6b28a" stroke-width="13" stroke-linecap="round"><path d="M205 224l30 10m20-14l24 19m13-13l30 7m-102 10l30 6"/></g><path d="M385 100l-38 134m50-131l-38 134" stroke="#9d815c" stroke-width="5"/>',
    birthday: '<ellipse cx="275" cy="284" rx="120" ry="28" fill="#f9f2e2"/><path d="M185 210v66q90 27 180 0v-66" fill="#d4bd9d"/><ellipse cx="275" cy="210" rx="90" ry="26" fill="#f9ead7"/><path d="M193 212q6 35 14 3q10 50 17 3q16 39 25 1q10 35 23 0q9 32 20 0q14 33 20-3q12 39 23-2q16 30 24-2" fill="#f9ead7"/><path d="M255 202v-37m34 39v-40" stroke="#83976c" stroke-width="7"/><path d="M255 158q-12-15 0-27q14 20 0 27m34 0q-12-15 0-27q14 20 0 27" fill="#c29a53"/>',
    spring: '<path d="M100 335q20-140 42-220q55-40 120-46M145 114l-40-60m42 70l85 29m-98 19l-65-29" stroke="#9c987a" stroke-width="11" fill="none"/><g fill="#edd5ca"><circle cx="106" cy="60" r="37"/><circle cx="175" cy="93" r="46"/><circle cx="235" cy="89" r="38"/><circle cx="250" cy="146" r="36"/><circle cx="97" cy="139" r="42"/></g><path d="M325 245h115v47H325z" fill="#a8b29a"/><path d="M316 235h135v13H316zm24 56v48m87-48v48" stroke="#8d9c7f" stroke-width="9"/><g fill="#ecd7cb"><ellipse cx="313" cy="152" rx="6" ry="11" transform="rotate(30 313 152)"/><ellipse cx="412" cy="174" rx="6" ry="11" transform="rotate(-30 412 174)"/></g>',
    picnic: '<path d="M110 220h340l-42 112H75z" fill="#e6d5b7"/><g stroke="#c4b59b" stroke-width="2"><path d="M100 245h340m-345 25h336m-340 25h325m-300 25h283M150 222l-30 108m83-108l-23 108m78-108l-10 108m67-108v108m53-108l12 108"/></g><path d="M198 206h105v80H198z" fill="#a79065"/><path d="M201 200q50-65 100 0" fill="none" stroke="#a79065" stroke-width="12"/><ellipse cx="354" cy="276" rx="43" ry="17" fill="#fcf3dc"/>',
    coffee: '<ellipse cx="270" cy="282" rx="115" ry="35" fill="#ddd3bd"/><path d="M189 171h142v66q-9 58-70 58q-70-5-72-58z" fill="#f7f0de"/><path d="M332 185q69-3 60 50q-10 43-61 17" fill="none" stroke="#f7f0de" stroke-width="19"/><ellipse cx="260" cy="173" rx="72" ry="21" fill="#897657"/><ellipse cx="260" cy="173" rx="53" ry="15" fill="#bdab87"/><path d="M254 110q-25-24-5-52m24 52q23-24 5-52" stroke="#f3ecdb" stroke-width="4" fill="none" opacity=".6"/><path d="M390 70l-30 60h80l-15-60z" fill="#859471"/>',
    travel: '<path d="M0 179q80-25 160 0t160 0t220 0v175H0z" fill="#82aaaa"/><path d="M0 255q80-18 160 0t160 0t220 0v100H0z" fill="#ddd3b6"/><path d="M0 241q80-20 160 0t160 0t220 0" fill="none" stroke="#f4edda" stroke-width="5"/><circle cx="412" cy="73" r="33" fill="#f5eacb"/><path d="M118 231l45-119l48 119z" fill="#e8e3cc"/><path d="M164 112v123m-70 2h141l-23 21h-95z" fill="#8d8e74" stroke="#8d8e74" stroke-width="3"/><g stroke="#edf0df" stroke-width="2"><path d="M335 162l10-5l10 5m-48-16l10-5l10 5"/></g>',
    bar: '<ellipse cx="270" cy="308" rx="164" ry="23" fill="#8f9475" opacity=".4"/><path d="M182 169h81l-7 117h-69z" fill="#ede6c4" opacity=".8"/><path d="M190 211h66l-4 69h-57z" fill="#b9ad73"/><path d="M287 170h81l-7 117h-69z" fill="#ede6c4" opacity=".8"/><path d="M295 210h65l-4 70h-57z" fill="#b9ad73"/><path d="M186 174q7-12 18 0q14-15 22 0q20-16 33 0m34 0q7-12 18 0q14-15 22 0q20-16 33 0" stroke="#f6f0db" stroke-width="11" fill="none"/><path d="M198 141l-12-21m135 22l16-20m-67 15v-25" stroke="#efe3bc" stroke-width="3"/>',
    autumn: '<path d="M139 339V121m0 35l-60-54m64 70l80-74m-83 127l-51-37" stroke="#a48c66" stroke-width="10" fill="none"/><g fill="#b79a63"><ellipse cx="112" cy="84" rx="72" ry="52"/><ellipse cx="177" cy="108" rx="76" ry="65"/><ellipse cx="114" cy="153" rx="83" ry="46"/></g><path d="M296 337q-17-73 56-119" stroke="#c4b18b" stroke-width="52" fill="none"/><g fill="#af8f56"><ellipse cx="283" cy="150" rx="7" ry="15" transform="rotate(30 283 150)"/><ellipse cx="426" cy="274" rx="7" ry="15" transform="rotate(-40 426 274)"/></g>',
    winter: '<path d="M0 290q150-40 300 0t240 0v60H0z" fill="#eef0e2"/><path d="M85 262l70-162l70 162z" fill="#738a70"/><path d="M110 201l44-102l45 102z" fill="#f0ecdc"/><path d="M287 203h107v95H287z" fill="#b7ac8e"/><path d="M270 209l70-77l70 77z" fill="#f5f0df"/><path d="M307 236h27v29h-27zm45 0h27v29h-27z" fill="#e9d5a6"/><g fill="#f8f7ed"><circle cx="90" cy="85" r="4"/><circle cx="233" cy="94" r="4"/><circle cx="364" cy="63" r="4"/><circle cx="442" cy="145" r="4"/><circle cx="280" cy="150" r="3"/></g>',
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="540" height="350" viewBox="0 0 540 350"><defs><linearGradient id="bg" x2=".8" y2="1"><stop stop-color="${light}"/><stop offset="1" stop-color="${bg}"/></linearGradient><filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".1"/></feComponentTransfer><feBlend in="SourceGraphic" mode="multiply"/></filter></defs><g filter="url(#grain)"><rect width="540" height="350" fill="url(#bg)"/><circle cx="465" cy="42" r="155" fill="${light}" opacity=".5"/><g transform="translate(${variant % 2 ? 12 : 0} 0)">${items[scene] ?? items.coffee}</g><rect width="540" height="350" fill="${accent}" opacity=".05"/></g><text x="22" y="326" fill="#ffffff" opacity=".8" font-family="monospace" font-size="11" letter-spacing="3">RECEIPTORY · A DAY TO REMEMBER</text></svg>`
}
export function buildDemo(): { meetings: Meeting[]; photos: Photo[] } {
  const photos: Photo[] = []
  const meetings = scenes.map((scene, i): Meeting => {
    const id = `demo-${i + 1}`
    const expenses = scene.places.map(([place, amount, category], j): Expense => {
      const payer = ids[(i + j) % 4]
      let split: SplitRule = { type: 'equal' }
      if (i === 1 && j === 0) split = { type: 'exclude', memberIds: ['b'] }
      if (i === 3 && j === 1) split = { type: 'participants', memberIds: ['a', 'b', 'c'] }
      if (i === 4 && j === 1) split = { type: 'weights', weights: { a: 2, b: 1, c: 1, d: 0 } }
      if (i === 5 && j === 2) split = { type: 'multiple' }
      return { id: `${id}-expense-${j}`, place, amount, category, at: new Date(`${scene.date}T${String(12 + j * 2).padStart(2, '0')}:00:00+09:00`).toISOString(), split,
        payments: split.type === 'multiple' ? [{ memberId: 'a', amount: 180000 }, { memberId: 'b', amount: 60000 }] : [{ memberId: payer, amount }] }
    })
    expenses.forEach((expense, j) => {
      for (let member = 0; member < (j === 0 ? 2 : 1); member++) photos.push({
        id: `${id}-photo-${j}-${member}`, meetingId: id, uploaderId: ids[(i + j + member) % 4],
        fileName: `${scene.title} · 데모 일러스트 ${j + 1}`, blob: new Blob([demoIllustration(scene.scene, j + member)], { type: 'image/svg+xml' }),
        takenAt: new Date(new Date(expense.at).getTime() + (member + 1) * 10 * 60000).toISOString(),
        latitude: (i === 5 ? 37.77 : 37.544) + j * 0.0025, longitude: (i === 5 ? 128.944 : 127.042) + j * 0.003,
        expenseId: expense.id, match: 'auto', demo: true,
      })
    })
    return { id, roomId: roomKey(ids), title: scene.title, date: expenses[0].at, expenses,
      emotions: scene.emotions, paidMemberIds: i === 8 ? ['a', 'b', 'c'] : [...ids],
      coverPhotoId: `${id}-photo-0-0`, demo: true, reactions: { '♡': ['a', 'c'], '✨': ['b'] },
      comments: [{ id: `${id}-comment`, memberId: 'd', text: ['다음엔 덜 맵게… 아니 똑같이!', '함께해서 더 좋은 날 ♡', '이날 바람까지 기억나', '우리 진짜 수고했다!', '또 가자, 그 골목', '아직도 파도 소리가 들리는 것 같아', '말해 줘서 고마워. 우리 오래 보자', '네 꿈을 응원해', '내년에도 잘 부탁해 ♡'][i], at: expenses[0].at }],
    }
  })
  return { meetings, photos }
}
