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

const CARNETS_LISTA = ["Carnet B", "Carnet C", "Carnet C+E (Tráiler)", "Carnet D", "CAP en vigor", "ADR Mercancías Peligrosas", "Tarjeta Tacógrafo", "Carretillero"];
const PROVINCIAS = ["Sevilla", "Cádiz", "Huelva", "Córdoba", "Málaga", "Granada", "Jaén", "Almería"];

export default function KaptarTalento() {
  const [vista, setVista] = useState("inicio"); // inicio | candidato | empresa
  const [candidatos, setCandidatos] = useState([]);
  const [filtroProvincia, setFiltroProvincia] = useState("Todas");
  const [filtroCarnet, setFiltroCarnet] = useState("Todos");
  
  // Estado Candidato
  const [formCand, setFormCand] = useState({
    nombre: "", telefono: "", email: "", provincia: "Sevilla", municipio: "",
    puesto: "Conductor Tráiler C+E", experiencia: "3-5 años", disponibilidad: "Incorporación inmediata", carnets: []
  });
  const [enviado, setEnviado] = useState(false);

  // Estado Empresa
  const [empresa, setEmpresa] = useState(null);
  const [formEmp, setFormEmp] = useState({ email: "", nombre_empresa: "", cif: "" });
  const [desbloqueados, setDesbloqueados] = useState([]);

  useEffect(() => {
    cargarCandidatos();
    const empGuardada = localStorage.getItem("kaptar_empresa");
    if (empGuardada) {
      const parsed = JSON.parse(empGuardada);
      refrescarEmpresa(parsed.email);
    }
  }, []);

  // Detectar vuelta de pago de Stripe
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

  async function sumarCreditos(email, nuevosCreditos) {
    await supabase.from("empresas").update({ creditos: nuevosCreditos }).eq("email", email);
    refrescarEmpresa(email);
    alert("¡Pago confirmado! Tus créditos ya están disponibles.");
  }

  function toggleCarnet(c) {
    setFormCand((prev) => ({
      ...prev,
      carnets: prev.carnets.includes(c) ? prev.carnets.filter((x) => x !== c) : [...prev.carnets, c],
    }));
  }

  async function guardarCandidato(e) {
    e.preventDefault();
    if (formCand.carnets.length === 0) return alert("Selecciona al menos un carnet o certificado.");
    const { error } = await supabase.from("candidatos").insert([formCand]);
    if (!error) {
      setEnviado(true);
      cargarCandidatos();
    } else {
      alert("Error al guardar: " + error.message);
    }
  }

  async function accederEmpresa(e) {
    e.preventDefault();
    const { data: existente } = await supabase.from("empresas").select("*").eq("email", formEmp.email).single();
    if (existente) {
      refrescarEmpresa(existente.email);
    } else {
      const { data: nueva, error } = await supabase.from("empresas").insert([{ ...formEmp, creditos: 0 }]).select().single();
      if (!error && nueva) refrescarEmpresa(nueva.email);
    }
  }

  async function desbloquearCandidato(candId) {
    if (!empresa) return;
    if (empresa.creditos < 1) {
      alert("No tienes créditos suficientes. Elige un paquete arriba para desbloquear contactos.");
      return;
    }
    const { error } = await supabase.from("desbloqueos").insert([{ empresa_email: empresa.email, candidato_id: candId }]);
    if (!error) {
      await supabase.from("empresas").update({ creditos: empresa.creditos - 1 }).eq("email", empresa.email);
      refrescarEmpresa(empresa.email);
    }
  }

  const candidatosFiltrados = candidatos.filter((c) => {
    const okProv = filtroProvincia === "Todas" || c.provincia === filtroProvincia;
    const okCarn = filtroCarnet === "Todos" || (c.carnets && c.carnets.includes(filtroCarnet));
    return okProv && okCarn;
  });

  return (
    <div className="min-h-screen flex flex-col">
      {/* CABECERA */}
      <header className="bg-slate-900 text-white py-4 px-6 shadow-md">
        <div className="max-w-5xl mx-auto flex flex-wrap justify-between items-center gap-4">
          <button onClick={() => setVista("inicio")} className="flex items-center gap-2 text-xl font-black tracking-tight text-amber-400">
            <Truck className="w-7 h-7" /> KAPTAR TALENTO
          </button>
          <nav className="flex gap-3 text-sm font-semibold">
            <button onClick={() => setVista("candidato")} className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700">
              Soy Conductor / Profesional
            </button>
            <button onClick={() => setVista("empresa")} className="px-4 py-2 rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400">
              Soy Empresa
            </button>
          </nav>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6">
        {vista === "inicio" && (
          <div className="text-center py-12 space-y-8">
            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full uppercase">
              Portal Directo en Andalucía • Sin Intermediarios
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 leading-tight">
              Las empresas de transporte y logística <span className="text-amber-500">te llaman a ti</span>
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Olvídate de echar currículums a ciegas. Registra tus carnets en 1 minuto totalmente gratis y deja que las empresas de Sevilla y Andalucía te contacten por teléfono o WhatsApp.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
              <button onClick={() => setVista("candidato")} className="px-8 py-4 bg-slate-900 text-white font-bold rounded-xl text-lg shadow-lg hover:bg-slate-800">
                Subir mi Perfil Gratis (Trabajadores)
              </button>
              <button onClick={() => setVista("empresa")} className="px-8 py-4 bg-amber-500 text-slate-950 font-bold rounded-xl text-lg shadow-lg hover:bg-amber-400">
                Buscar Conductores (Empresas)
              </button>
            </div>
            <div className="grid md:grid-cols-3 gap-6 pt-12 text-left">
              <div className="bg-white p-6 rounded-xl shadow-sm border">
                <CheckCircle className="w-8 h-8 text-emerald-600 mb-3" />
                <h3 className="font-bold text-lg">100% Gratis para el Trabajador</h3>
                <p className="text-slate-600 text-sm mt-1">Nunca pagarás nada por estar visible para las mejores flotas y empresas de tu zona.</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border">
                <ShieldCheck className="w-8 h-8 text-amber-500 mb-3" />
                <h3 className="font-bold text-lg">Privacidad Protegida</h3>
                <p className="text-slate-600 text-sm mt-1">Tu nombre y teléfono están ocultos al público. Solo las empresas verificadas pueden desbloquearlo.</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border">
                <Phone className="w-8 h-8 text-blue-600 mb-3" />
                <h3 className="font-bold text-lg">Trato Directo sin ETTs</h3>
                <p className="text-slate-600 text-sm mt-1">Sin muros sociales ni distracciones. Si encajas con lo que buscan, te llaman hoy mismo.</p>
              </div>
            </div>
          </div>
        )}

        {/* FLUJO CANDIDATO */}
        {vista === "candidato" && (
          <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-sm border">
            {enviado ? (
              <div className="text-center py-8 space-y-4">
                <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto" />
                <h2 className="text-2xl font-bold">¡Tu perfil ya está activo en KAPTAR TALENTO!</h2>
                <p className="text-slate-600">Tus datos personales están protegidos. Cuando una empresa de tu zona necesite tus carnets, desbloqueará tu contacto y te llamará.</p>
                <button onClick={() => { setEnviado(false); setVista("inicio"); }} className="px-6 py-2 bg-slate-900 text-white rounded-lg">
                  Volver al inicio
                </button>
              </div>
            ) : (
              <form onSubmit={guardarCandidato} className="space-y-5">
                <h2 className="text-2xl font-bold border-b pb-3">Alta Gratuita de Candidato</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>

