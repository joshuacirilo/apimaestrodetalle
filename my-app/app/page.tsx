"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

type Mission = { misionId: number; nombre: string; descripcion: string | null };
type Student = { carnet: string; nombre: string; correo: string; misiones: { misionId: number; estado: boolean }[] };
type Notice = { kind: "success" | "error"; text: string };
const empty = { carnet: "", nombre: "", correo: "" };
async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...options });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "No se pudo completar la solicitud.");
  return body;
}

export default function Home() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [form, setForm] = useState(empty);
  const [states, setStates] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(false);

  async function refresh() {
    setLoading(true);
    setLoadError("");
    try {
      const [catalog, roster] = await Promise.all([
        request<Mission[]>("/api/misiones"), request<Student[]>("/api/estudiantes"),
      ]);
      setMissions(catalog); setStudents(roster); setReady(true);
    } catch {
      setLoadError("No se pudieron actualizar los datos. Revisa la conexión e inténtalo de nuevo.");
      throw new Error("refresh");
    } finally { setLoading(false); }
  }
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      request<Mission[]>("/api/misiones", { signal: controller.signal }),
      request<Student[]>("/api/estudiantes", { signal: controller.signal }),
    ]).then(([catalog, roster]) => {
      if (controller.signal.aborted) return;
      setMissions(catalog); setStudents(roster); setReady(true);
    }).catch(() => {
      if (!controller.signal.aborted) setLoadError("No se pudieron cargar los datos. Inténtalo de nuevo.");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  function edit(student: Student) {
    setForm({ carnet: student.carnet, nombre: student.nombre, correo: student.correo });
    setStates(Object.fromEntries(student.misiones.map((m) => [m.misionId, m.estado])));
    setEditing(true); setNotice(null);
    document.getElementById("registro")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function reset() { setForm(empty); setStates({}); setEditing(false); setNotice(null); }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || loading || !ready) return;
    setSaving(true); setNotice(null);
    try {
      await request("/api/registro", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estudiante: form, misiones: missions.map((m) => ({ misionId: m.misionId, estado: !!states[m.misionId] })) }),
      });
      setNotice({ kind: "success", text: "Registro guardado correctamente." });
      try { await refresh(); }
      catch { setNotice({ kind: "success", text: "El registro se guardó, pero el tablero no se pudo actualizar. Pulsa Actualizar; no necesitas guardar otra vez." }); }
    } catch (error) { setNotice({ kind: "error", text: error instanceof Error ? error.message : "No se pudo guardar el registro." }); }
    finally { setSaving(false); }
  }
  const completed = (student: Student) => missions.filter((m) => student.misiones.some((s) => s.misionId === m.misionId && s.estado)).length;
  const percentage = (count: number) => missions.length ? Math.round(count / missions.length * 100) : 0;
  const totalDone = students.reduce((sum, student) => sum + completed(student), 0);
  const average = students.length && missions.length ? Math.round(totalDone / (students.length * missions.length) * 100) : 0;
  const filtered = students.filter((s) => `${s.carnet} ${s.nombre} ${s.correo}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));

  return (
    <main className="workspace">
      <header className="topbar"><Link className="brand" href="/"> <span className="brand-mark" aria-hidden="true">M</span> Misiones <span className="brand-divider">/</span> <span className="brand-sub">Aula</span></Link><span className="pill">Seguimiento académico</span></header>
      <section className="intro"><div><p className="eyebrow">APRENDER · COMPLETAR · AVANZAR</p><h1>Cada misión cuenta.</h1><p>Registra a tus estudiantes y acompaña su progreso, misión a misión.</p></div><a className="text-link" href="#tablero">Ver el tablero <span aria-hidden="true">↗</span></a></section>
      <section className="stats" aria-label="Resumen">
        <article><span>Estudiantes registrados</span><strong>{ready ? students.length : "—"}</strong><small>Una vista de todo el grupo</small></article>
        <article><span>Misiones disponibles</span><strong>{ready ? missions.length : "—"}</strong><small>Objetivos del catálogo</small></article>
        <article className="accent-stat"><span>Avance del grupo</span><strong>{ready ? `${average}%` : "—"}</strong><small>Completadas sobre el total posible</small></article>
      </section>
      {loadError && <div role="alert" className="notice error">{loadError} <button type="button" onClick={() => void refresh().catch(() => {})} disabled={loading || saving}>Reintentar</button></div>}
      <div className="columns">
        <section className="panel form-panel" id="registro" aria-labelledby="form-title">
          <div className="panel-heading"><div><p className="eyebrow">01 / REGISTRO</p><h2 id="form-title">{editing ? "Editar estudiante" : "Nuevo estudiante"}</h2></div><span className="section-icon" aria-hidden="true">＋</span></div>
          <p className="section-description">Completa sus datos y marca las misiones realizadas.</p>
          <form onSubmit={save}>
            <fieldset disabled={saving || loading || !ready}>
              <label htmlFor="carnet">Carnet</label><input id="carnet" name="carnet" placeholder="Ej. 2026-001" required maxLength={25} pattern="[\x21-\x7E]+" title="Hasta 25 caracteres sin espacios ni acentos" readOnly={editing} value={form.carnet} onChange={(e) => setForm({ ...form, carnet: e.target.value })} onBlur={() => { if (!editing) { const existing = students.find((s) => s.carnet.toLowerCase() === form.carnet.trim().toLowerCase()); if (existing) edit(existing); } }} />
              <label htmlFor="nombre">Nombre completo</label><input id="nombre" name="nombre" autoComplete="name" placeholder="Nombre del estudiante" required maxLength={150} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
              <label htmlFor="correo">Correo electrónico</label><input id="correo" name="correo" type="email" autoComplete="email" placeholder="estudiante@ejemplo.com" required maxLength={150} value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} />
              <div className="mission-heading"><h3>Misiones completadas</h3><span>{missions.filter((m) => states[m.misionId]).length} / {missions.length}</span></div>
              {loading && !ready ? <p className="empty">Cargando misiones…</p> : missions.length === 0 ? <p className="empty">No hay misiones disponibles. Puedes registrar los datos del estudiante.</p> : <div className="mission-list">{missions.map((mission, index) => <label className={`mission-option ${states[mission.misionId] ? "checked" : ""}`} key={mission.misionId}><input type="checkbox" checked={!!states[mission.misionId]} onChange={(e) => setStates({ ...states, [mission.misionId]: e.target.checked })} /><span><strong>{mission.nombre}</strong>{mission.descripcion && <small>{mission.descripcion}</small>}</span><span className="mission-number">{String(index + 1).padStart(2, "0")}</span></label>)}</div>}
              <button className="primary-button" type="submit">{saving ? "Guardando…" : editing ? "Guardar cambios" : "Guardar estudiante"}<span aria-hidden="true">→</span></button>
            </fieldset>
            <button className="reset-button" type="button" disabled={saving} onClick={reset}>{editing ? "Registrar otro estudiante" : "Limpiar formulario"}</button>
            {notice && <p className={`notice ${notice.kind}`} role={notice.kind === "error" ? "alert" : "status"}>{notice.text}</p>}
          </form>
        </section>
        <section className="panel dashboard" id="tablero" aria-labelledby="dashboard-title" aria-busy={loading}>
          <div className="panel-heading"><div><p className="eyebrow">02 / SEGUIMIENTO</p><h2 id="dashboard-title">Tablero de avance</h2></div><button className="refresh-button" type="button" disabled={loading || saving} onClick={() => void refresh().catch(() => {})}>{loading ? "Cargando…" : "↻ Actualizar"}</button></div>
          <p className="section-description">Cada casilla completada es un paso más.</p>
          <label className="sr-only" htmlFor="search">Buscar estudiantes</label><input className="search" id="search" type="search" placeholder="Buscar por nombre, carnet o correo…" value={search} onChange={(e) => setSearch(e.target.value)} />
          {!ready ? <div className="empty-state"><span aria-hidden="true">◎</span><h3>{loading ? "Preparando el tablero…" : "No se pudo cargar el tablero"}</h3><p>{loading ? "Estamos consultando los estudiantes y sus misiones." : "Usa Reintentar para recuperar los datos."}</p></div> : filtered.length === 0 ? <div className="empty-state"><span aria-hidden="true">◎</span><h3>{students.length ? "Sin coincidencias" : "Aquí comienza el progreso"}</h3><p>{students.length ? "Prueba con otro nombre o carnet." : "Guarda el primer estudiante para ver sus misiones y avance."}</p></div> : <div className="student-list">{filtered.map((student) => { const done = completed(student); const progress = percentage(done); return <article className="student-card" key={student.carnet}>
            <div className="student-heading"><span className="avatar" aria-hidden="true">{student.nombre.trim().slice(0, 1).toUpperCase()}</span><div className="student-identity"><h3>{student.nombre}</h3><p>{student.carnet} <span aria-hidden="true">·</span> {student.correo}</p></div><button className="edit-button" type="button" disabled={saving || loading} onClick={() => edit(student)} aria-label={`Editar a ${student.nombre}`}>Editar</button></div>
            <div className="progress-label"><span>{done} de {missions.length} misiones completadas</span><strong>{progress}%</strong></div><progress value={progress} max={100} aria-label={`Avance de ${student.nombre}: ${progress}%`} />
            <div className="mission-tags">{missions.map((m) => { const finished = student.misiones.some((s) => s.misionId === m.misionId && s.estado); return <span key={m.misionId} className={finished ? "done" : "pending"}><span aria-hidden="true">{finished ? "✓" : "○"}</span> {m.nombre}<span className="sr-only">: {finished ? "completada" : "pendiente"}</span></span>; })}</div>
          </article>; })}</div>}
          <footer className="board-footer"><span>{ready ? `${filtered.length} estudiantes en vista` : "Esperando datos"}</span><span>Avance sobre el catálogo completo</span></footer>
        </section>
      </div>
      <footer className="page-footer">Misiones / Aula <span>Pequeños logros. Grandes avances.</span></footer>
    </main>
  );
}
