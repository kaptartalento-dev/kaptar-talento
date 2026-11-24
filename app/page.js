"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Truck, Lock, Unlock, CheckCircle, Phone, Search, ShieldCheck, CreditCard } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

// PEGA AQUÍ TUS 3 ENLACES DE STRIPE ENTRE LAS COMILLAS:
const STRIPE_LINKS = {
  pack1: "https://stripe.com",
  pack5: "https://stripe.com",
  pack15: "https://stripe.com",
};

const CARNETS = ["Carnet B", "Carnet C", "Carnet C+E (Tráiler)", "Carnet D", "CAP en vigor", "ADR Mercancías Peligrosas", "Tarjeta Tacógrafo", "Carretillero"];
const PROVINCIAS = ["Sevilla", "Cádiz", "Huelva", "Córdoba", "Málaga", "Granada", "Jaén", "Almería"];

export default function KaptarTalento() {
  const [vista, setVista] = useState("inicio");
  const [candidatos, setCandidatos] = useState([]);
  const [filtroProv, setFiltroProv] = useState("Todas");
  const [filtroCarn, setFiltroCarn] = useState("Todos");
  const [enviado, setEnviado] = useState(false);

  const [formCand, setFormCand] = useState({
    nombre: "", telefono: "", email: "", provincia: "Sevilla", municipio: "",
    puesto: "Conductor Tráiler C+E", experiencia: "3-5 años",
    disponibilidad: "Incorporación inmediata", carnets: []
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
    alert("¡Pago confirmado! Tus créditos ya están disponibles.");
  }

  function toggleCarnet(c) {
    setFormCand((p) => ({
      ...p,
      carnets: p.carnets.includes(c) ? p.carnets.filter((x) => x !== c) : [...p.carnets, c],
    }));
  }

  async function guardarCandidato(e) {
    e.preventDefault();
    if (formCand.carnets.length === 0) return alert("Marca al menos un carnet o certificado.");
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
    if (!empresa || empresa.creditos < 1) return alert("No tienes créditos. Compra un paquete arriba.");
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
            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full uppercase">Andalucía • Contacto Directo</span>
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900">Las empresas de transporte <span className="text-amber-500">te llaman a ti</span></h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">Sube tus carnets en 1 minuto gratis. Sin echar currículums a ciegas. Las empresas de Sevilla y Andalucía contactan contigo directamente.</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button onClick={() => setVista("candidato")} className="px-8 py-4 bg-slate-900 text-white font-bold rounded-xl text-lg">Subir mi Perfil Gratis</button>
              <button onClick={() => setVista("empresa")} className="px-8 py-4 bg-amber-500 text-slate-950 font-bold rounded-xl text-lg">Buscar Candidatos (Empresas)</button>
            </div>
            <div className="grid md:grid-cols-3 gap-6 pt-10 text-left">
              <div className="bg-white p-6 rounded-xl border"><CheckCircle className="w-7 h-7 text-emerald-600 mb-2" /><h3 className="font-bold">100% Gratis</h3><p className="text-sm text-slate-600">Nunca pagarás nada por estar visible para las empresas.</p></div>
              <div className="bg-white p-6 rounded-xl border"><ShieldCheck className="w-7 h-7 text-amber-500 mb-2" /><h3 className="font-bold">Privacidad Total</h3><p className="text-sm text-slate-600">Tu teléfono está oculto hasta que una empresa te desbloquea.</p></div>
              <div className="bg-white p-6 rounded-xl border"><Phone className="w-7 h-7 text-blue-600 mb-2" /><h3 className="font-bold">Trato Directo</h3><p className="text-sm text-slate-600">Sin muros sociales. Te llaman o escriben por WhatsApp.</p></div>
            </div>
          </div>
        )}

        {vista === "candidato" && (
          <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl border">
            {enviado ? (
              <div className="text-center py-8 space-y-4">
                <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto" />
                <h2 className="text-2xl font-bold">¡Perfil publicado en KAPTAR TALENTO!</h2>
                <p className="text-slate-600">Cuando una empresa busque tus carnets, desbloqueará tu contacto y te llamará.</p>
                <button onClick={() => { setEnviado(false); setVista("inicio"); }} className="px-6 py-2 bg-slate-900 text-white rounded-lg">Volver al inicio</button>
              </div>
            ) : (
              <form onSubmit={guardarCandidato} className="space-y-4">
                <h2 className="text-2xl font-bold border-b pb-3">Alta Gratuita de Candidato</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <input required placeholder="Nombre completo (Privado)" className="border rounded-lg p-2.5" value={formCand.nombre} onChange={(e) => setFormCand({ ...formCand, nombre: e.target.value })} />
                  <input required type="tel" placeholder="Teléfono / WhatsApp (Privado)" className="border rounded-lg p-2.5" value={formCand.telefono} onChange={(e) => setFormCand({ ...formCand, telefono: e.target.value })} />
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
