import { parseReceipt } from './parser'
export const receiptSamples = [
  { name: '떡볶이 영수증', place: '우리동네 떡볶이', text: '떡볶이 2 16,000\n튀김 1 5,000\n음료 2 4,000\n쿠폰할인 -3,000\n합계 22,000' },
  { name: '카페 영수증', place: '골목 카페', text: '아메리카노 2 9,000\n라떼 1 5,500\n딸기케이크 1 7,000\n할인 -1,500\n합계 20,000' },
  { name: '술자리 영수증', place: '우리의 단골 술집', text: '안주 1 28,000\n맥주 3 18,000\n공용 봉사료 1 2,000\n합계 48,000' },
]
export const sampleReceipt = (index: number) => parseReceipt(receiptSamples[index].text).receipt
export const sampleImage = (index: number) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><rect width="400" height="500" fill="#fffaf0"/><g fill="#2e4034" font-family="sans-serif"><text x="30" y="50" font-size="22">Receiptory · 시연용 영수증</text>${receiptSamples[index].text.split('\n').map((line, i) => `<text x="30" y="${105 + i * 48}" font-size="19">${line}</text>`).join('')}</g></svg>`)
