import "./globals.css";

export const metadata = {
  title: "KAPTAR TALENTO | Conductores y Profesionales en Andalucía",
  description: "Sube tu perfil gratis y deja que las empresas de transporte y logística te llamen directamente.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="bg-slate-50 text-slate-900 font-sans">{children}</body>
    </html>
  );
}

