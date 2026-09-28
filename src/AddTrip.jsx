import React, { useMemo, useState } from 'react'
import { CalendarPlus, CheckCircle2, LoaderCircle, MapPin, Users } from 'lucide-react'
import { supabase } from './supabase'

function slugify(value) {
  return value
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/å/g, 'a').replace(/ä/g, 'a').replace(/ö/g, 'o')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function AddTrip({ players = [], onCreated }) {
  const yearNow = new Date().getFullYear()
  const [form, setForm] = useState({
    destination: '', year: yearNow + 1, location: '',
    start_date: '', end_date: '', summary: '', story: ''
  })
  const [selectedPlayers, setSelectedPlayers] = useState([])
  const [state, setState] = useState('idle')
  const [message, setMessage] = useState('')

  const tripName = useMemo(() => {
    const destination = form.destination.trim()
    return destination ? `${destination} ${form.year}` : ''
  }, [form.destination, form.year])

  function update(field, value) {
    setForm(current => ({ ...current, [field]: value }))
  }

  function togglePlayer(id) {
    setSelectedPlayers(current =>
      current.includes(id) ? current.filter(item => item !== id) : [...current, id]
    )
  }

  async function submit(event) {
    event.preventDefault()
    setState('loading'); setMessage('')
    if (!form.destination.trim() || !form.start_date || !form.end_date) {
      setState('error'); setMessage('Täytä kohde sekä alku- ja loppupäivä.'); return
    }
    if (form.end_date < form.start_date) {
      setState('error'); setMessage('Loppupäivä ei voi olla ennen alkupäivää.'); return
    }
    const payload = {
      slug: `${slugify(form.destination)}-${form.year}`,
      name: tripName,
      year: Number(form.year),
      location: form.location.trim() || `${form.destination.trim()}, Ruotsi`,
      country: 'Ruotsi',
      start_date: form.start_date,
      end_date: form.end_date,
      summary: form.summary.trim(),
      story: form.story.trim(),
      published: true
    }
    const { data: trip, error } = await supabase.from('trips').insert(payload).select().single()
    if (error) { setState('error'); setMessage(error.message); return }
    if (selectedPlayers.length) {
      const rows = selectedPlayers.map(player_id => ({ trip_id: trip.id, player_id }))
      const { error: participantError } = await supabase.from('trip_participants').insert(rows)
      if (participantError) { setState('error'); setMessage(participantError.message); return }
    }
    setState('done'); setMessage(`${tripName} lisättiin onnistuneesti.`)
    setForm({ destination:'', year:yearNow+1, location:'', start_date:'', end_date:'', summary:'', story:'' })
    setSelectedPlayers([])
    if (onCreated) await onCreated(trip)
  }

  return <section className="adminPanel addTripPanel">
    <h2><CalendarPlus /> Lisää matka</h2>
    <form onSubmit={submit}>
      <div className="adminTwoCols">
        <label>Kohde *
          <input value={form.destination} onChange={e=>update('destination',e.target.value)} placeholder="Esim. Bro Hof" />
        </label>
        <label>Vuosi *
          <input type="number" min="2026" max="2100" value={form.year} onChange={e=>update('year',e.target.value)} />
        </label>
      </div>
      {tripName && <div className="tripNamePreview">Matkan nimeksi tulee <b>{tripName}</b></div>}
      <label><MapPin size={16}/> Kenttä / sijainti
        <input value={form.location} onChange={e=>update('location',e.target.value)} placeholder="Esim. Bro Hof Slott Golf Club, Ruotsi" />
      </label>
      <div className="adminTwoCols">
        <label>Alkupäivä *<input type="date" value={form.start_date} onChange={e=>update('start_date',e.target.value)} /></label>
        <label>Loppupäivä *<input type="date" value={form.end_date} onChange={e=>update('end_date',e.target.value)} /></label>
      </div>
      <label>Lyhyt yhteenveto
        <textarea rows="3" value={form.summary} onChange={e=>update('summary',e.target.value)} placeholder="Näkyy matkan esittelyssä" />
      </label>
      <label>Matkakertomus
        <textarea rows="8" value={form.story} onChange={e=>update('story',e.target.value)} placeholder="Tekstiä voi täydentää myöhemmin" />
      </label>
      <fieldset className="participants"><legend><Users size={16}/> Osallistujat</legend>
        {players.map(player => <label className="checkRow" key={player.id}>
          <input type="checkbox" checked={selectedPlayers.includes(player.id)} onChange={()=>togglePlayer(player.id)} />
          <span>{player.display_name}</span>
        </label>)}
      </fieldset>
      <button className="primaryBtn" disabled={state==='loading'}>
        {state==='loading' ? <LoaderCircle className="spin"/> : <CalendarPlus/>} Luo matka
      </button>
      {message && <p className={state==='error'?'error':'success'}>
        {state==='done' && <CheckCircle2/>}{message}
      </p>}
    </form>
  </section>
}
