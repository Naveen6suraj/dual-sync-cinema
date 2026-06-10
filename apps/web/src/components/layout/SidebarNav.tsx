import React from 'react';

interface SidebarNavProps {
    activeTab: 'watch-party' | 'movies' | 'youtube' | 'voice-chat' | 'friends' | 'settings';
    setActiveTab: (tab: 'watch-party' | 'movies' | 'youtube' | 'voice-chat' | 'friends' | 'settings') => void;
    userName: string;
}

export default function SidebarNav({ activeTab, setActiveTab, userName }: SidebarNavProps) {
    return (
        <aside className="w-[76px] bg-[#05040a] border-r border-purple-500/10 flex flex-col items-center py-5 z-10 shrink-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-cyan-500 flex items-center justify-center mb-6 shadow-lg shadow-purple-500/20">
                <i className="fa-solid fa-wand-magic-sparkles text-white text-lg"></i>
            </div>
            
            <nav className="flex flex-col gap-3 items-center w-full flex-grow">
                <div 
                    className={`w-12 h-12 flex items-center justify-center cursor-pointer relative transition-all duration-200 group ${activeTab === 'movies' ? 'bg-purple-600 text-white rounded-xl shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white hover:rounded-xl rounded-full'}`}
                    onClick={() => setActiveTab('movies')}
                    title="Local Movies"
                >
                    <i className="fa-solid fa-film"></i>
                    <span className={`absolute left-0 w-1 rounded-r bg-white transition-all ${activeTab === 'movies' ? 'h-9' : 'h-0 group-hover:h-5'}`}></span>
                </div>

                <div 
                    className={`w-12 h-12 flex items-center justify-center cursor-pointer relative transition-all duration-200 group ${activeTab === 'youtube' ? 'bg-purple-600 text-white rounded-xl shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white hover:rounded-xl rounded-full'}`}
                    onClick={() => setActiveTab('youtube')}
                    title="YouTube Streams"
                >
                    <i className="fa-brands fa-youtube"></i>
                    <span className={`absolute left-0 w-1 rounded-r bg-white transition-all ${activeTab === 'youtube' ? 'h-9' : 'h-0 group-hover:h-5'}`}></span>
                </div>
            </nav>

            <div className="w-12 h-12 rounded-full bg-indigo-900 border border-white/10 flex items-center justify-center text-white font-bold relative cursor-pointer">
                <span>{userName.charAt(0).toUpperCase()}</span>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border border-[#05040a] rounded-full shadow-[0_0_6px_#10b981]"></span>
            </div>
        </aside>
    );
}
