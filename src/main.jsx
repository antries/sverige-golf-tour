import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Home,
  Flag,
  Trophy,
  Users,
  Images,
  Menu,
  LogOut,
  LogIn,
  Upload,
  Trash2,
  Edit3,
  Plus,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
} from "lucide-react";
import { supabase, photoUrl } from "./supabase";
import "./style.css";

const nav = [
  ["Koti", Home],
  ["Matkat", Flag],
  ["Historia", Trophy],
  ["Pelaajat", Users],
  ["Galleria", Images],
];
const fmt = (d) =>
  d ? new Intl.DateTimeFormat("fi-FI").format(new Date(d + "T12:00")) : "";
const slugify = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/å|ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function Logo() {
  return (
    <div className="logo">
      <div className="cross" />
      <div className="core">
        <small>SVERIGE GOLF TOUR</small>
        <b>SGT</b>
        <em>EST. 2026</em>
      </div>
    </div>
  );
}

function Login({ close }) {
  const [email, setEmail] = useState(""),
    [sent, setSent] = useState(false);
  async function send(e) {
    e.preventDefault();
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: location.origin },
    });
    setSent(true);
  }
  return (
    <div className="modal">
      <form onSubmit={send}>
        <button type="button" className="x" onClick={close}>
          <X />
        </button>
        <Logo />
        <h2>Kirjaudu ylläpitoon</h2>
        {sent ? (
          <p>Taikalinkki lähetetty.</p>
        ) : (
          <>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Sähköposti"
            />
            <button className="gold">
              <LogIn />
              Lähetä taikalinkki
            </button>
          </>
        )}
      </form>
    </div>
  );
}

function Lightbox({ items, index, setIndex, close }) {
  const sx = useRef(0);
  return (
    <div
      className="lightbox"
      onClick={close}
      onTouchStart={(e) => (sx.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        const d = e.changedTouches[0].clientX - sx.current;
        if (d > 45) setIndex((index - 1 + items.length) % items.length);
        if (d < -45) setIndex((index + 1) % items.length);
      }}
    >
      <button className="close" onClick={close}>
        <X />
      </button>
      <button
        className="prev"
        onClick={(e) => {
          e.stopPropagation();
          setIndex((index - 1 + items.length) % items.length);
        }}
      >
        <ChevronLeft />
      </button>
      <img onClick={(e) => e.stopPropagation()} src={items[index].url} />
      <button
        className="next"
        onClick={(e) => {
          e.stopPropagation();
          setIndex((index + 1) % items.length);
        }}
      >
        <ChevronRight />
      </button>
      <span>
        {index + 1} / {items.length}
      </span>
    </div>
  );
}

function Gallery({ photos, admin = false, reload, trips }) {
  const [index, setIndex] = useState(null),
    [edit, setEdit] = useState(false),
    [selected, setSelected] = useState([]);
  const toggle = (id) =>
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
    );
  async function remove() {
    if (!confirm(`Poistetaanko ${selected.length} kuvaa pysyvästi?`)) return;
    const ps = photos.filter((p) => selected.includes(p.id));
    await supabase.storage
      .from("trip-photos")
      .remove(ps.map((p) => p.storage_path));
    await supabase.from("photos").delete().in("id", selected);
    setSelected([]);
    reload();
  }
  async function cover() {
    const p = photos.find((x) => x.id === selected[0]);
    await supabase
      .from("trips")
      .update({ cover_image_path: p.storage_path })
      .eq("id", p.trip_id);
    setSelected([]);
    reload();
  }
  return (
    <>
      <div className="galleryBar">
        <b>{photos.length} kuvaa</b>
        {admin && (
          <button
            onClick={() => {
              setEdit(!edit);
              setSelected([]);
            }}
          >
            <Edit3 />
            {edit ? "Valmis" : "Muokkaa"}
          </button>
        )}
      </div>
      <div className="gallery">
        {photos.map((p, n) => (
          <button
            key={p.id}
            className={selected.includes(p.id) ? "selected" : ""}
            onClick={() => (edit ? toggle(p.id) : setIndex(n))}
          >
            <img src={p.url} />
            {edit && <i>{selected.includes(p.id) && <Check />}</i>}
          </button>
        ))}
      </div>
      {edit && selected.length > 0 && (
        <div className="bulk">
          <button onClick={remove}>
            <Trash2 />
            Poista {selected.length}
          </button>
          {selected.length === 1 && (
            <button onClick={cover}>
              <Flag />
              Kansikuvaksi
            </button>
          )}
        </div>
      )}
      {index !== null && (
        <Lightbox
          items={photos}
          index={index}
          setIndex={setIndex}
          close={() => setIndex(null)}
        />
      )}
    </>
  );
}

function TripForm({ trip, players, done }) {
  const empty = {
    name: "",
    year: new Date().getFullYear() + 1,
    location: "",
    start_date: "",
    end_date: "",
    summary: "",
    story: "",
    published: true,
  };
  const [form, setForm] = useState(trip || empty),
    [parts, setParts] = useState([]);
  useEffect(() => {
    if (trip)
      supabase
        .from("trip_participants")
        .select("player_id")
        .eq("trip_id", trip.id)
        .then(({ data }) => setParts((data || []).map((x) => x.player_id)));
  }, [trip]);
  async function save(e) {
    e.preventDefault();
    const payload = {
      ...form,
      slug: trip?.slug || `${slugify(form.name)}-${form.year}`,
    };
    delete payload.id;
    delete payload.created_at;
    const q = trip
      ? await supabase
          .from("trips")
          .update(payload)
          .eq("id", trip.id)
          .select()
          .single()
      : await supabase.from("trips").insert(payload).select().single();
    if (q.error) {
      alert(q.error.message);
      return;
    }
    await supabase.from("trip_participants").delete().eq("trip_id", q.data.id);
    if (parts.length)
      await supabase
        .from("trip_participants")
        .insert(parts.map((player_id) => ({ trip_id: q.data.id, player_id })));
    done();
  }
  return (
    <form className="form" onSubmit={save}>
      <h2>{trip ? "Muokkaa matkaa" : "Lisää matka"}</h2>
      <label>
        Nimi
        <input
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Bro Hof 2027"
        />
      </label>
      <div className="cols">
        <label>
          Vuosi
          <input
            type="number"
            value={form.year}
            onChange={(e) => setForm({ ...form, year: +e.target.value })}
          />
        </label>
        <label>
          Sijainti
          <input
            value={form.location || ""}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
        </label>
      </div>
      <div className="cols">
        <label>
          Alkupäivä
          <input
            type="date"
            required
            value={form.start_date || ""}
            onChange={(e) => setForm({ ...form, start_date: e.target.value })}
          />
        </label>
        <label>
          Loppupäivä
          <input
            type="date"
            required
            value={form.end_date || ""}
            onChange={(e) => setForm({ ...form, end_date: e.target.value })}
          />
        </label>
      </div>
      <label>
        Yhteenveto
        <textarea
          rows="3"
          value={form.summary || ""}
          onChange={(e) => setForm({ ...form, summary: e.target.value })}
        />
      </label>
      <label>
        Matkakertomus
        <textarea
          rows="8"
          value={form.story || ""}
          onChange={(e) => setForm({ ...form, story: e.target.value })}
        />
      </label>
      <fieldset>
        <legend>Osallistujat</legend>
        {players.map((p) => (
          <label className="check" key={p.id}>
            <input
              type="checkbox"
              checked={parts.includes(p.id)}
              onChange={() =>
                setParts((s) =>
                  s.includes(p.id) ? s.filter((x) => x !== p.id) : [...s, p.id],
                )
              }
            />
            {p.display_name}
          </label>
        ))}
      </fieldset>
      <label className="check">
        <input
          type="checkbox"
          checked={form.published}
          onChange={(e) => setForm({ ...form, published: e.target.checked })}
        />
        Julkaistu
      </label>
      <button className="gold">
        <Check />
        Tallenna
      </button>
    </form>
  );
}

function UploadForm({ trips, user, reload }) {
  const [tripId, setTripId] = useState(trips[0]?.id || ""),
    [files, setFiles] = useState([]),
    [msg, setMsg] = useState("");
  async function upload() {
    const trip = trips.find((t) => t.id === tripId);
    let done = 0;
    for (const f of files) {
      const path = `${trip.slug}/${Date.now()}-${crypto.randomUUID()}.${f.name.split(".").pop()}`;
      const u = await supabase.storage.from("trip-photos").upload(path, f);
      if (!u.error) {
        await supabase
          .from("photos")
          .insert({
            trip_id: tripId,
            storage_path: path,
            original_filename: f.name,
            uploaded_by: user.id,
          });
        done++;
        setMsg(`${done}/${files.length}`);
      }
    }
    setFiles([]);
    reload();
  }
  return (
    <section className="form">
      <h2>Lisää kuvia</h2>
      <select value={tripId} onChange={(e) => setTripId(e.target.value)}>
        {trips.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      <label className="picker">
        <Upload />
        Valitse kuvat
        <input
          hidden
          multiple
          accept="image/*"
          type="file"
          onChange={(e) => setFiles([...e.target.files])}
        />
      </label>
      {files.length > 0 && (
        <button className="gold" onClick={upload}>
          Lataa {files.length} kuvaa
        </button>
      )}
      <p>{msg}</p>
    </section>
  );
}

function PlayerForm({ reload }) {
  const [name, setName] = useState(""),
    [nick, setNick] = useState("");
  async function save(e) {
    e.preventDefault();
    const q = await supabase
      .from("players")
      .insert({ display_name: name, nickname: nick });
    if (q.error) alert(q.error.message);
    else {
      setName("");
      setNick("");
      reload();
    }
  }
  return (
    <form className="form" onSubmit={save}>
      <h2>Lisää pelaaja</h2>
      <label>
        Nimi
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label>
        Lempinimi
        <input value={nick} onChange={(e) => setNick(e.target.value)} />
      </label>
      <button className="gold">
        <Plus />
        Lisää
      </button>
    </form>
  );
}

function Admin({ D, user, reload }) {
  const [tab, setTab] = useState("Matkat"),
    [editing, setEditing] = useState(null),
    [photoTrip, setPhotoTrip] = useState("");
  return (
    <main>
      <h1>Ylläpito</h1>
      <div className="tabs">
        {["Matkat", "Kuvat", "Pelaajat"].map((t) => (
          <button
            key={t}
            className={tab === t ? "on" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Matkat" && (
        <>
          <TripForm
            key={editing?.id || "new"}
            trip={editing}
            players={D.players}
            done={() => {
              setEditing(null);
              reload();
            }}
          />
          {D.trips.map((t) => (
            <div className="adminRow" key={t.id}>
              <span>{t.name}</span>
              <button onClick={() => setEditing(t)}>
                <Edit3 />
                Muokkaa
              </button>
            </div>
          ))}
        </>
      )}
      {tab === "Kuvat" && (
        <>
          <UploadForm trips={D.trips} user={user} reload={reload} />
          <select
            value={photoTrip}
            onChange={(e) => setPhotoTrip(e.target.value)}
          >
            <option value="">Valitse matka kuvien hallintaan</option>
            {D.trips.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          {photoTrip && (
            <Gallery
              admin
              photos={D.photos.filter((p) => p.trip_id === photoTrip)}
              reload={reload}
              trips={D.trips}
            />
          )}
        </>
      )}
      {tab === "Pelaajat" && (
        <>
          <PlayerForm reload={reload} />
          {D.players.map((p) => (
            <div className="adminRow" key={p.id}>
              <span>{p.display_name}</span>
            </div>
          ))}
        </>
      )}
    </main>
  );
}

function App() {
  const [page, setPage] = useState("Koti"),
    [login, setLogin] = useState(false),
    [user, setUser] = useState(null),
    [admin, setAdmin] = useState(false),
    [trip, setTrip] = useState(null),
    [D, setD] = useState({
      trips: [],
      players: [],
      photos: [],
      history: [],
      champ: [],
    });
  async function load() {
    const [a, b, c, d, e] = await Promise.all([
      supabase.from("trips").select("*").order("year", { ascending: false }),
      supabase.from("players").select("*").order("display_name"),
      supabase
        .from("photos")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("trip_history")
        .select("*")
        .order("year", { ascending: false }),
      supabase.from("championship_ranking").select("*"),
    ]);
    setD({
      trips: a.data || [],
      players: b.data || [],
      photos: (c.data || []).map((x) => ({
        ...x,
        url: photoUrl(x.storage_path),
      })),
      history: d.data || [],
      champ: e.data || [],
    });
  }
  useEffect(() => {
    load();
    supabase.auth
      .getSession()
      .then(({ data }) => setUser(data.session?.user || null));
    const s = supabase.auth.onAuthStateChange((_e, s) =>
      setUser(s?.user || null),
    ).data.subscription;
    return () => s.unsubscribe();
  }, []);
  useEffect(() => {
    if (user)
      supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single()
        .then(({ data }) => setAdmin(!!data?.is_admin));
    else setAdmin(false);
  }, [user]);
  const latest = D.trips[0],
    h = D.history[0];
  return (
    <div className="app">
      <header>
        <button onClick={() => setPage("Koti")}>
          <Logo />
        </button>
        <button
          onClick={() => (user ? supabase.auth.signOut() : setLogin(true))}
        >
          {user ? <LogOut /> : <Menu />}
        </button>
      </header>
      {page === "Koti" && (
        <main className="home">
          <h1>SVERIGE GOLF TOUR</h1>
          <p>Golfia, kilpailua ja yhteisiä matkoja Ruotsissa</p>
          {latest && (
            <article>
              <small>VIIMEISIN MATKA</small>
              <h2>{latest.name}</h2>
              <p>
                {latest.location}
                <br />
                {fmt(latest.start_date)}–{fmt(latest.end_date)}
              </p>
              <button
                className="gold"
                onClick={() => {
                  setTrip(latest);
                  setPage("Matka");
                }}
              >
                Avaa matka
              </button>
            </article>
          )}
          <div className="champs">
            <div>
              <Trophy />
              <small>TOUR CHAMPION</small>
              <b>{h?.tour_champion || "–"}</b>
            </div>
            <div>
              <Trophy />
              <small>SCRATCH CHAMPION</small>
              <b>{h?.scratch_champion || "–"}</b>
            </div>
          </div>
        </main>
      )}
      {page === "Matkat" && (
        <main>
          <h1>Matkat</h1>
          {D.trips.map((t) => (
            <article
              key={t.id}
              className="trip"
              onClick={() => {
                setTrip(t);
                setPage("Matka");
              }}
            >
              {t.cover_image_path ? (
                <img src={photoUrl(t.cover_image_path)} />
              ) : (
                <Flag />
              )}
              <div>
                <b>{t.name}</b>
                <span>
                  {fmt(t.start_date)}–{fmt(t.end_date)}
                </span>
              </div>
              <ChevronRight />
            </article>
          ))}
        </main>
      )}
      {page === "Matka" && trip && (
        <main>
          <button className="back" onClick={() => setPage("Matkat")}>
            <ChevronLeft />
            Matkat
          </button>
          <h1>{trip.name}</h1>
          {trip.cover_image_path && (
            <img className="cover" src={photoUrl(trip.cover_image_path)} />
          )}
          <p>{trip.summary}</p>
          <h2>Matkakertomus</h2>
          <p className="story">{trip.story}</p>
          <h2>Kuvat</h2>
          <Gallery photos={D.photos.filter((p) => p.trip_id === trip.id)} />
        </main>
      )}
      {page === "Historia" && (
        <main>
          <h1>Historia</h1>
          {D.history.map((x) => (
            <div className="history" key={x.id}>
              <b>{x.name}</b>
              <span>
                {fmt(x.start_date)}–{fmt(x.end_date)}
              </span>
              <small>
                {x.participant_count} osallistujaa
                <br />
                Tour: {x.tour_champion}
                <br />
                Scratch: {x.scratch_champion}
              </small>
            </div>
          ))}
          <h2>Mestaruusranking</h2>
          {D.champ.map((x, i) => (
            <div className="rank" key={x.id}>
              <b>{i + 1}.</b>
              <span>{x.display_name}</span>
              <strong>{x.all_wins}</strong>
            </div>
          ))}
        </main>
      )}
      {page === "Pelaajat" && (
        <main>
          <h1>Pelaajat</h1>
          {D.players.map((x) => (
            <div className="player" key={x.id}>
              <i>
                {x.display_name
                  .split(" ")
                  .map((s) => s[0])
                  .join("")}
              </i>
              <b>{x.display_name}</b>
            </div>
          ))}
        </main>
      )}
      {page === "Galleria" && (
        <main>
          <h1>Galleria</h1>
          <Gallery photos={D.photos} />
        </main>
      )}
      {page === "Admin" && admin && <Admin D={D} user={user} reload={load} />}
      <nav>
        {nav.map(([n, I]) => (
          <button
            key={n}
            className={page === n ? "on" : ""}
            onClick={() => setPage(n)}
          >
            <I />
            <span>{n}</span>
          </button>
        ))}
      </nav>
      {admin && (
        <button className="adminFab" onClick={() => setPage("Admin")}>
          <Edit3 />
        </button>
      )}
      {login && <Login close={() => setLogin(false)} />}
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
