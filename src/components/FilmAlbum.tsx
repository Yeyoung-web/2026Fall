import { useEffect, useState } from 'react'
import { dateLabel, type Meeting, type Photo } from '../data/models'
import { getPhotosForMeetings } from '../data/storage'
import { annualSummary, sortBoothPhotos } from '../data/photoBooth'
import { PhotoImage } from './PhotoSection'
function useRoomPhotos(meetings: Meeting[]) {
  const [photos, setPhotos] = useState<Photo[]>([]), [error, setError] = useState(''), [loading, setLoading] = useState(true)
  useEffect(() => {
    let canceled = false
    setLoading(true)
    void getPhotosForMeetings(meetings.map(m => m.id)).then(result => { if (!canceled) { setPhotos(result); setError('') } })
      .catch(() => { if (!canceled) setError('사진을 열지 못했어요. 다시 이 탭을 열어 주세요.') })
      .finally(() => { if (!canceled) setLoading(false) })
    return () => { canceled = true }
  }, [meetings])
  return { photos, error, loading }
}
export function FilmAlbum({ meetings }: { meetings: Meeting[] }) {
  const { photos, error, loading } = useRoomPhotos(meetings)
  const sorted = sortBoothPhotos(photos, meetings)
  return <section className="film-album"><p className="eyebrow">FOUR FRAMES, ONE STORY</p><h2>네 번의 찰칵, 하나의 추억.</h2><p className="muted">함께 찍은 네컷 {sorted.length}장 · 시간순으로 모았어요.</p>{error && <p className="error" role="alert">{error}</p>}{loading ? <p className="empty">필름을 꺼내는 중…</p> : sorted.length ? <div className="film-scroll" tabIndex={0} role="region" aria-label="시간순 네컷 필름 앨범">{sorted.map(p => { const meeting = meetings.find(m => m.id === p.meetingId)!; return <figure key={p.id} className="film-frame"><PhotoImage photo={p} /><figcaption><time>{dateLabel(meeting.date)}</time><strong>{meeting.title}</strong></figcaption></figure> })}</div> : <div className="empty"><span>🎞</span><h3>네컷이 기다리고 있어요.</h3><p>만남에서 네컷 이미지를 올리면 여기에 모여요.</p></div>}</section>
}
export function YearReview({ meetings }: { meetings: Meeting[] }) {
  const { photos, error, loading } = useRoomPhotos(meetings)
  const years = [...new Set(meetings.map(m => Number(new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'Asia/Seoul' }).format(new Date(m.date)))))].sort((a, b) => b - a)
  const [year, setYear] = useState(years[0] ?? new Date().getFullYear())
  const summary = annualSummary(meetings, photos, year)
  return <section className="year-review"><div className="section-heading"><div><p className="eyebrow">OUR YEAR IN LITTLE MOMENTS</p><h2>{year}년, 함께여서 좋았어.</h2></div><select aria-label="연말 결산 연도" value={year} onChange={e => setYear(Number(e.target.value))}>{(years.length ? years : [year]).map(y => <option key={y} value={y}>{y}년</option>)}</select></div>{error && <p className="error" role="alert">{error}</p>}{loading ? <p className="empty">우리의 1년을 꺼내는 중…</p> : <><div className="year-stat-grid"><div><span>♡</span><strong>{summary.memories}</strong><p>함께한 하루</p></div><div><span>🎞</span><strong>{summary.photoBoothCount}</strong><p>올해 찍은 네컷 {summary.photoBoothCount}장</p></div><div><span>✳</span><strong>{summary.emotionCount}</strong><p>마음으로 적은 순간</p></div><div><span>▧</span><strong>{summary.photos}</strong><p>간직한 사진</p></div></div><div className="year-emotions"><p className="eyebrow">THINGS MONEY CAN'T BUY</p>{summary.meetings.flatMap(m => m.emotions.map((emotion, i) => <span key={`${m.id}-${i}`}>♡ {emotion}</span>))}</div><p className="year-promise">정산은 끝나도, 우리의 이야기는 계속돼.<br /><strong>Every receipt has a story.</strong></p></>}</section>
}
