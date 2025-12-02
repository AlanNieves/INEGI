import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";

const Navbar: React.FC = () => {
    const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Cerrar el menú al hacer click fuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsAdminMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <nav className="w-full bg-gradient-to-r from-blue-900/90 via-blue-800/90 to-indigo-900/90 backdrop-blur-md text-white py-4 px-8 flex items-center justify-between shadow-2xl fixed top-0 left-0 z-50 border-b border-blue-400/20">
            <div className="flex items-center gap-2">
                <Link to="/" className="text-xl font-bold hover:text-blue-200 transition-all duration-300 hover:scale-105">
                    INEGI
                </Link>
            </div>
            <div className="flex gap-6 items-center">
                <Link to="/" className="hover:text-blue-200 transition-all duration-300 hover:scale-105 font-medium">
                    Inicio
                </Link>
                
                {/* Menú desplegable de Administración */}
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setIsAdminMenuOpen(!isAdminMenuOpen)}
                        className="flex items-center gap-2 hover:text-blue-200 transition-all duration-300 focus:outline-none font-medium hover:scale-105"
                    >
                        <span>Administración</span>
                        <svg 
                            className={`w-4 h-4 transition-transform duration-300 ${isAdminMenuOpen ? 'rotate-180' : ''}`}
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {/* Dropdown Menu con estilo glass */}
                    {isAdminMenuOpen && (
                        <div className="absolute right-0 mt-2 w-64 glass-panel rounded-xl overflow-hidden z-50 border border-blue-400/30 shadow-2xl">
                            <div className="py-2">
                                <div className="px-4 py-2 text-xs font-semibold text-blue-200 uppercase tracking-wider">
                                    Catálogos
                                </div>
                                <Link
                                    to="/admin/convocatorias"
                                    onClick={() => setIsAdminMenuOpen(false)}
                                    className="block px-4 py-3 text-blue-100 hover:bg-blue-500/20 transition-all duration-200 border-l-2 border-transparent hover:border-blue-400"
                                >
                                    <div className="flex items-center gap-3">
                                        <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <span className="font-medium">Convocatorias</span>
                                    </div>
                                </Link>
                                <Link
                                    to="/admin/concursos"
                                    onClick={() => setIsAdminMenuOpen(false)}
                                    className="block px-4 py-3 text-blue-100 hover:bg-blue-500/20 transition-all duration-200 border-l-2 border-transparent hover:border-blue-400"
                                >
                                    <div className="flex items-center gap-3">
                                        <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                        </svg>
                                        <span className="font-medium">Concursos</span>
                                    </div>
                                </Link>
                                <Link
                                    to="/admin/especialistas"
                                    onClick={() => setIsAdminMenuOpen(false)}
                                    className="block px-4 py-3 text-blue-100 hover:bg-blue-500/20 transition-all duration-200 border-l-2 border-transparent hover:border-blue-400"
                                >
                                    <div className="flex items-center gap-3">
                                        <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                        <span className="font-medium">Especialistas</span>
                                    </div>
                                </Link>

                                <div className="border-t border-blue-400/20 my-2"></div>

                                <div className="px-4 py-2 text-xs font-semibold text-blue-200 uppercase tracking-wider">
                                    Gestión
                                </div>
                                <Link
                                    to="/admin/plazas"
                                    onClick={() => setIsAdminMenuOpen(false)}
                                    className="block px-4 py-3 text-blue-100 hover:bg-blue-500/20 transition-all duration-200 border-l-2 border-transparent hover:border-blue-400"
                                >
                                    <div className="flex items-center gap-3">
                                        <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                        <span className="font-medium">Plazas</span>
                                    </div>
                                </Link>
                                <Link
                                    to="/admin/aspirantes"
                                    onClick={() => setIsAdminMenuOpen(false)}
                                    className="block px-4 py-3 text-blue-100 hover:bg-blue-500/20 transition-all duration-200 border-l-2 border-transparent hover:border-blue-400"
                                >
                                    <div className="flex items-center gap-3">
                                        <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                        </svg>
                                        <span className="font-medium">Aspirantes</span>
                                    </div>
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;