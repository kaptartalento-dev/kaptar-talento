"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Truck, Lock, Unlock, CheckCircle, Phone, Search, ShieldCheck, CreditCard } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

const STRIPE_LINKS = {
  pack1: "https://stripe.com",
  pack5: "https://stripe.com",
  pack15: "https://stripe.com",
};

const CARNETS = ["Carnet B", "Carnet C", "Carnet C+E", "Carnet D", "CAP en vigor", "ADR", "Tacografo", "Carretillero"];
const PROVINCIAS = ["Sevilla", "Cadiz", "Huelva", "Cordoba", "Malaga", "Granada", "Jaen", "Almeria"];

export default function KaptarTalento() {
  const [vista, setVista] = useState("inicio");
  const [candidatos, setCandidatos] = useState([]);
  const [filtroProv, setFiltroProv] = useState("Todas");
  const [filtroCarn, setFiltroCarn] = useState("Todos");
  const [enviado, setEnviado] = useState(false);

  const [formCand, setFormCand] = useState({
    nombre: "", telefono: "", email: "", provincia: "Sevilla", municipio: "",
    puesto: "Conductor Trailer C+E", experiencia: "3-5 anos",
    disponibilidad: "Incorporacion inmediata", carnets: []
  });

  const [empresa, setEmpresa] = useState(null);
  const [formEmp, setFormEmp] = useState({ email: "", nombre_empresa: "", cif: "" });
  const [desbloqueados, setDesbloqueados] = useState([]);

  useEffect(() => {
    cargarCandidatos();
    const guardada = localStorage.getItem("kaptar_empresa");
    if (guardada) refrescarEmpresa(JSON.parse(guardada).email);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && empresa) {
      const params = new URLSearchParams(window.location.search);
      if (params.get("pago") === "ok") {
        const sumados = parseInt(params.get("creditos") || "0", 10);
        if (sumados > 0) {
          sumarCreditos(empresa.email, empresa.creditos + sumados);
          window.history.replaceState({}, document.title, "/");
        }
      }
    }
  }, [empresa]);

  async function cargarCandidatos() {
    const { data } = await supabase.from("candidatos").select("*").order("created_at", { ascending: false });
    if (data) setCandidatos(data);
  }

  async function refrescarEmpresa(email) {
    const { data } = await supabase.from("empresas").select("*").eq("email", email).single();
    if (data) {
      setEmpresa(data);
      localStorage.setItem("kaptar_empresa", JSON.stringify(data));
      const { data: desb } = await supabase.from("desbloqueos").select("candidato_id").eq("empresa_email", email);
      if (desb) setDesbloqueados(desb.map((d) => d.candidato_id));
    }
  }

  async function sumarCreditos(email, total) {
    await supabase.from("empresas").update({ creditos: total }).eq("email", email);
    refrescarEmpresa(email);
    alert("Pago confirmado. Tus creditos ya estan disponibles.");
  }

  function toggleCarnet(c) {
    setFormCand((p) => ({
      ...p,
      carnets: p.carnets.includes(c) ? p.carnets.filter((x) => x !== c) : [...p.carnets, c],
    }));
  }

  async function guardarCandidato(e) {
    e.preventDefault();
    if (formCand.carnets.length === 0) return alert("Marca al menos un carnet.");
    const { error } = await supabase.from("candidatos").insert([formCand]);
    if (!error) { setEnviado(true); cargarCandidatos(); }
    else alert("Error: " + error.message);
  }

  async function accederEmpresa(e) {
    e.preventDefault();
    const { data: ex } = await supabase.from("empresas").select("*").eq("email", formEmp.email).single();
    if (ex) refrescarEmpresa(ex.email);
    else {
      const { data: nueva } = await supabase.from("empresas").insert([{ ...formEmp, creditos: 0 }]).select().single();
      if (nueva) refrescarEmpresa(nueva.email);
    }
  }

  async function desbloquear(candId) {
    if (!empresa || empresa.creditos < 1) return alert("No tienes creditos. Compra un paquete arriba.");
    const { error } = await supabase.from("desbloqueos").insert([{ empresa_email: empresa.email, candidato_id: candId }]);
    if (!error) {
      await supabase.from("empresas").update({ creditos: empresa.creditos - 1 }).eq("email", empresa.email);
      refrescarEmpresa(empresa.email);
    }
  }

  const filtrados = candidatos.filter((c) => {
    const okP = filtroProv === "Todas" || c.provincia === filtroProv;
    const okC = filtroCarn === "Todos" || (Array.isArray(c.carnets) && c.carnets.includes(filtroCarn));
    return okP && okC;
  });
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-slate-900 text-white py-4 px-6 shadow">
        <div className="max-w-5xl mx-auto flex flex-wrap justify-between items-center gap-4">
          <button onClick={() => setVista("inicio")} className="flex items-center gap-2 text-xl font-black text-amber-400">
            <Truck className="w-7 h-7" /> KAPTAR TALENTO
          </button>
          <nav className="flex gap-3 text-sm font-semibold">
            <button onClick={() => setVista("candidato")} className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700">Soy Trabajador</button>
            <button onClick={() => setVista("empresa")} className="px-4 py-2 rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400">Soy Empresa</button>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-6">
        {vista === "inicio" && (
          <div className="text-center py-12 space-y-8">
            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full uppercase">Andalucia • Contacto Directo</span>
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900">Las empresas de transporte <span className="text-amber-500">te llaman a ti</span></h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">Sube tus carnets en 1 minuto gratis. Sin echar curriculums a ciegas. Las empresas de Sevilla y Andalucia contactan contigo directamente.</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button onClick={() => setVista("candidato")} className="px-8 py-4 bg-slate-900 text-white font-bold rounded-xl text-lg">Subir mi Perfil Gratis</button>
              <button onClick={() => setVista("empresa")} className="px-8 py-4 bg-amber-500 text-slate-950 font-bold rounded-xl text-lg">Buscar Candidatos (Empresas)</button>
            </div>
            <div className="grid md:grid-cols-3 gap-6 pt-10 text-left">
              <div className="bg-white p-6 rounded-xl border"><CheckCircle className="w-7 h-7 text-emerald-600 mb-2" /><h3 className="font-bold">100% Gratis</h3><p className="text-sm text-slate-600">Nunca pagaras nada por estar visible para las empresas.</p></div>
              <div className="bg-white p-6 rounded-xl border"><ShieldCheck className="w-7 h-7 text-amber-500 mb-2" /><h3 className="font-bold">Privacidad Total</h3><p className="text-sm text-slate-600">Tu telefono esta oculto hasta que una empresa te desbloquea.</p></div>
              <div className="bg-white p-6 rounded-xl border"><Phone className="w-7 h-7 text-blue-600 mb-2" /><h3 className="font-bold">Trato Directo</h3><p className="text-sm text-slate-600">Sin muros sociales. Te llaman o escriben por WhatsApp.</p></div>
            </div>
          </div>
        )}

        {vista === "candidato" && (
          <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl border">
            {enviado ? (
              <div className="text-center py-8 space-y-4">
                <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto" />
                <h2 className="text-2xl font-bold">Perfil publicado en KAPTAR TALENTO</h2>
                <p className="text-slate-600">Cuando una empresa busque tus carnets, desbloqueara tu contacto y te llamara.</p>
                <button onClick={() => { setEnviado(false); setVista("inicio"); }} className="px-6 py-2 bg-slate-900 text-white rounded-lg">Volver al inicio</button>
              </div>
            ) : (
              <form onSubmit={guardarCandidato} className="space-y-4">
                <h2 className="text-2xl font-bold border-b pb-3">Alta Gratuita de Candidato</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <input required placeholder="Nombre completo (Privado)" className="border rounded-lg p-2.5" value={formCand.nombre} onChange={(e) => setFormCand({ ...formCand, nombre: e.target.value })} />
                  <input required type="tel" placeholder="Telefono / WhatsApp (Privado)" className="border rounded-lg p-2.5" value={formCand.telefono} onChange={(e) => setFormCand({ ...formCand, telefono: e.target.value })} />
                </div>
                <input required type="email" placeholder="Email (Privado)" className="w-full border rounded-lg p-2.5" value={formCand.email} onChange={(e) => setFormCand({ ...formCand, email: e.target.value })} />
                <div className="grid sm:grid-cols-2 gap-4">
                  <select className="border rounded-lg p-2.5" value={formCand.provincia} onChange={(e) => setFormCand({ ...formCand, provincia: e.target.value })}>
                    {PROVINCIAS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <input required placeholder="Municipio (Ej: Pilas, Dos Hermanas)" className="border rounded-lg p-2.5" value={formCand.municipio} onChange={(e) => setFormCand({ ...formCand, municipio: e.target.value })} />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <select className="border rounded-lg p-2.5" value={formCand.puesto} onChange={(e) => setFormCand({ ...formCand, puesto: e.target.value })}>
                    <option>Conductor Trailer C+E</option>
                    <option>Conductor Camion Rigido C</option>
                    <option>Repartidor Furgoneta B</option>
                    <option>Conductor Autobus D</option>
                    <option>Carretillero / Almacen</option>
                    <option>Maquinaria / Soldador</option>
                  </select>
                  <select className="border rounded-lg p-2.5" value={formCand.experiencia} onChange={(e) => setFormCand({ ...formCand, experiencia: e.target.value })}>
                    <option>Menos de 1 ano</option>
                    <option>1-3 anos</option>
                    <option>3-5 anos</option>
                    <option>Mas de 5 anos</option>
                  </select>
                </div>
                <div>
                  <p className="text-sm font-bold mb-2">Marca tus Carnets y Certificados:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {CARNETS.map((c) => (
                      <label key={c} className="flex items-center gap-2 border p-2 rounded-lg text-sm cursor-pointer">
                        <input type="checkbox" checked={formCand.carnets.includes(c)} onChange={() => toggleCarnet(c)} />
                        <span>{c}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <select className="w-full border rounded-lg p-2.5" value={formCand.disponibilidad} onChange={(e) => setFormCand({ ...formCand, disponibilidad: e.target.value })}>
                  <option>Incorporacion inmediata (Ruta local/regional)</option>
                  <option>Incorporacion inmediata (Ruta nacional/internacional)</option>
                  <option>Trabajando actualmente (Escucho ofertas)</option>
                </select>
                <label className="flex items-start gap-2 text-xs text-slate-600">
                  <input required type="checkbox" className="mt-1" />
                  <span>Acepto la Politica de Privacidad (RGPD) y autorizo la cesion de mis datos a empresas registradas para seleccion laboral.</span>
                </label>
                <button type="submit" className="w-full py-3.5 bg-amber-500 font-bold rounded-xl text-lg">Publicar mi Perfil Gratis</button>
              </form>
            )}
          </div>
        )}

        {vista === "empresa" && (
          <div className="space-y-6">
            {!empresa ? (
              <form onSubmit={accederEmpresa} className="max-w-md mx-auto bg-white p-8 rounded-2xl border space-y-4">
                <h2 className="text-2xl font-bold">Acceso Empresas</h2>
                <input required placeholder="Nombre de la Empresa" className="w-full border rounded-lg p-2.5" value={formEmp.nombre_empresa} onChange={(e) => setFormEmp({ ...formEmp, nombre_empresa: e.target.value })} />
                <input required placeholder="CIF / NIF" className="w-full border rounded-lg p-2.5" value={formEmp.cif} onChange={(e) => setFormEmp({ ...formEmp, cif: e.target.value })} />
                <input required type="email" placeholder="Email corporativo" className="w-full border rounded-lg p-2.5" value={formEmp.email} onChange={(e) => setFormEmp({ ...formEmp, email: e.target.value })} />
                <button type="submit" className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl">Entrar al Buscador</button>
              </form>
            ) : (
              <>
                <div className="bg-slate-900 text-white p-6 rounded-2xl flex flex-wrap justify-between items-center gap-4">
                  <div>
                    <h2 className="text-xl font-bold">{empresa.nombre_empresa}</h2>
                    <p className="text-amber-400 font-bold">Creditos disponibles: {empresa.creditos}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a href={STRIPE_LINKS.pack1} className="px-4 py-2 bg-slate-800 rounded-lg text-sm font-semibold flex items-center gap-1"><CreditCard className="w-4 h-4 text-amber-400" /> 1 Contacto (9€)</a>
                    <a href={STRIPE_LINKS.pack5} className="px-4 py-2 bg-amber-500 text-slate-950 rounded-lg text-sm font-bold flex items-center gap-1"><CreditCard className="w-4 h-4" /> 5 Contactos (35€)</a>
                    <a href={STRIPE_LINKS.pack15} className="px-4 py-2 bg-slate-800 rounded-lg text-sm font-semibold flex items-center gap-1"><CreditCard className="w-4 h-4 text-amber-400" /> 15 Contactos (90€)</a>
                  </div>
        )}
      </main>
      <footer className="bg-slate-900 text-slate-400 text-xs py-6 px-6 text-center mt-12">
        <p>© 2026 KAPTAR TALENTO • Andalucia • Cumplimiento RGPD (UE) 2016/679</p>
      </footer>
    </div>
  );
}

  );
}

