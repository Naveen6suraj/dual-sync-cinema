import React from 'react';

interface AudioConsoleProps {
    subtitleDelay: number;
    setSubtitleDelay: (val: number | ((prev: number) => number)) => void;
    subtitleSize: number;
    setSubtitleSize: (val: number) => void;
    onSubtitleUpload: (file: File) => void;
    subtitleFileName?: string;
    
    embeddedAudioTracks: { index: number; label: string }[];
    selectedAudioTrack: number;
    setSelectedAudioTrack: (idx: number) => void;
    
    embeddedVideoTracks: { index: number; label: string }[];
    selectedVideoTrack: number;
    setSelectedVideoTrack: (idx: number) => void;
    
    onSecondaryAudioUpload: (file: File) => void;
    secondaryAudioFileName?: string;
}

export default function AudioConsole({
    subtitleDelay, setSubtitleDelay, subtitleSize, setSubtitleSize, onSubtitleUpload, subtitleFileName,
    embeddedAudioTracks, selectedAudioTrack, setSelectedAudioTrack,
    embeddedVideoTracks, selectedVideoTrack, setSelectedVideoTrack,
    onSecondaryAudioUpload, secondaryAudioFileName
}: AudioConsoleProps) {
    return (
        <div className="glass-card p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-purple-500/10 pb-3 mb-1">
                <i className="fa-solid fa-sliders text-purple-400 shadow-[0_0_6px_rgba(168,85,247,0.4)]"></i>
                <h3 className="font-hud text-xs font-bold tracking-wider text-white">VLC STUDIO SYSTEM SETTINGS</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Subtitle adjustment deck */}
                <div className="flex flex-col gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.01]">
                    <h4 className="text-xs font-hud font-bold tracking-wide text-purple-400 flex items-center gap-2">
                        <i className="fa-regular fa-closed-captioning"></i> SUBTITLE ADVANCED SETTINGS
                    </h4>
                    
                    <label className="flex items-center justify-center gap-2 py-2 px-4 rounded bg-white/5 border border-purple-500/10 hover:bg-white/10 cursor-pointer text-xs font-bold transition">
                        LOAD SUBTITLES (.SRT / .VTT)
                        <input 
                            type="file" 
                            accept=".srt,.vtt" 
                            className="hidden" 
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) onSubtitleUpload(file);
                            }}
                        />
                    </label>
                    <span className="text-[10px] text-gray-500 text-center truncate">{subtitleFileName || 'No file loaded'}</span>

                    <div className="flex flex-col gap-1.5 mt-2">
                        <div className="flex justify-between text-[11px] text-gray-400">
                            <span>Subtitle timing delay</span>
                            <span className="font-mono text-cyan-400 font-bold">{subtitleDelay.toFixed(1)}s</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setSubtitleDelay(prev => Math.max(-5, prev - 0.1))} className="px-2 py-1 bg-white/5 border border-white/10 hover:bg-white/10 rounded text-[10px] font-mono">-0.1s</button>
                            <input 
                                type="range" 
                                min={-5} 
                                max={5} 
                                step={0.1} 
                                value={subtitleDelay}
                                onChange={(e) => setSubtitleDelay(parseFloat(e.target.value))}
                                className="flex-grow accent-cyan-400 h-1 bg-white/10 rounded"
                            />
                            <button onClick={() => setSubtitleDelay(prev => Math.min(5, prev + 0.1))} className="px-2 py-1 bg-white/5 border border-white/10 hover:bg-white/10 rounded text-[10px] font-mono">+0.1s</button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5 mt-2">
                        <div className="flex justify-between text-[11px] text-gray-400">
                            <span>Font size scaling</span>
                            <span className="font-mono text-purple-400 font-bold">{subtitleSize}px</span>
                        </div>
                        <input 
                            type="range" 
                            min={14} 
                            max={32} 
                            value={subtitleSize}
                            onChange={(e) => setSubtitleSize(parseInt(e.target.value))}
                            className="w-full accent-purple-500 h-1 bg-white/10 rounded"
                        />
                    </div>
                </div>

                {/* Multi dialogue track */}
                <div className="flex flex-col gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.01]">
                    <h4 className="text-xs font-hud font-bold tracking-wide text-cyan-400 flex items-center gap-2">
                        <i className="fa-solid fa-language"></i> MULTI-TRACK CONTROLS
                    </h4>
                    
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] text-gray-500 uppercase tracking-wider">Embedded Audio Track</label>
                            <select 
                                value={selectedAudioTrack}
                                onChange={(e) => setSelectedAudioTrack(parseInt(e.target.value))}
                                className="bg-[#05040a] border border-white/10 rounded px-3 py-1.5 text-xs text-white outline-none w-full"
                            >
                                <option value={-1}>Default / Track 1</option>
                                {embeddedAudioTracks.map(t => (
                                    <option key={t.index} value={t.index}>{t.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] text-gray-500 uppercase tracking-wider">Embedded Video Track / Quality</label>
                            <select 
                                value={selectedVideoTrack}
                                onChange={(e) => setSelectedVideoTrack(parseInt(e.target.value))}
                                className="bg-[#05040a] border border-white/10 rounded px-3 py-1.5 text-xs text-white outline-none w-full"
                            >
                                <option value={-1}>Default / Auto</option>
                                {embeddedVideoTracks.map(t => (
                                    <option key={t.index} value={t.index}>{t.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <h5 className="text-[10px] font-bold text-cyan-400 tracking-wider uppercase mt-2">Load External Dialogue File</h5>
                    <label className="flex items-center justify-center gap-2 py-2 px-4 rounded bg-white/5 border border-purple-500/10 hover:bg-white/10 cursor-pointer text-xs font-bold transition mt-2">
                        LOAD DIALOGUE FILE
                        <input 
                            type="file" 
                            accept="audio/*" 
                            className="hidden" 
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) onSecondaryAudioUpload(file);
                            }}
                        />
                    </label>
                    <span className="text-[10px] text-gray-500 text-center truncate">{secondaryAudioFileName || 'No track loaded'}</span>
                </div>
            </div>
        </div>
    );
}
