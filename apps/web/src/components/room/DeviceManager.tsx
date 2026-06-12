import React, { useState } from 'react';
import { Listener } from '../../hooks/useAudioEngine';

interface DeviceManagerProps {
    devices: MediaDeviceInfo[];
    listeners: Listener[];
    addListener: (name: string, deviceId?: string) => void;
    removeListener: (id: string) => void;
    updateVolume: (id: string, vol: number) => void;
    updateDelay: (id: string, delayMs: number) => void;
    updateDevice: (id: string, deviceId: string) => void;
    playCalibrationSound: (listener: Listener) => void;
    saveDeviceProfile: (listener: Listener, userId: string) => void;
    userId: string;
}

export default function DeviceManager({
    devices, listeners, addListener, removeListener, updateDelay, updateDevice, playCalibrationSound, saveDeviceProfile, userId
}: DeviceManagerProps) {
    const [newDeviceName, setNewDeviceName] = useState('');

    const handleAdd = () => {
        if (newDeviceName.trim()) {
            if (listeners.length >= 5) {
                alert("Maximum of 5 Bluetooth devices supported simultaneously for no-lag synchronization.");
                return;
            }
            addListener(newDeviceName.trim());
            setNewDeviceName('');
        }
    };

    return (
        <div className="glass-card p-6 flex flex-col gap-4 mt-6 border border-emerald-500/20">
            <div className="flex justify-between items-center border-b border-emerald-500/10 pb-3 mb-1">
                <div className="flex items-center gap-2">
                    <i className="fa-brands fa-bluetooth-b text-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.4)]"></i>
                    <h3 className="font-hud text-xs font-bold tracking-wider text-white">DUAL PAIRING DEVICES <span className="text-gray-500 font-normal">({listeners.length}/5)</span></h3>
                </div>
                <div className="flex gap-2 items-center bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                    <span className="text-xs text-emerald-400 font-bold"><i className="fa-solid fa-plus mr-1"></i> ADD:</span>
                    <select 
                        className="bg-black border border-emerald-500/30 rounded px-2 py-1 text-xs text-white outline-none w-56 cursor-pointer"
                        value=""
                        onChange={(e) => {
                            if (e.target.value) {
                                if (listeners.length >= 5) {
                                    alert("Maximum 5 devices supported.");
                                    return;
                                }
                                const selectedName = e.target.options[e.target.selectedIndex].text;
                                addListener(selectedName, e.target.value);
                            }
                        }}
                    >
                        <option value="" disabled>-- Select Audio Output --</option>
                        {devices.map(d => (
                            <option key={d.deviceId} value={d.deviceId}>{d.label || `Bluetooth Device ${d.deviceId.substring(0,4)}`}</option>
                        ))}
                        {devices.length === 0 && (
                            <option value="default">System Default (Grant Permission First!)</option>
                        )}
                    </select>
                </div>
            </div>

            <div className="flex flex-col gap-4">
                {listeners.length === 0 && (
                    <div className="text-xs text-gray-500 italic py-4 text-center">No paired devices. Add a listener to sync multiple bluetooth headsets!</div>
                )}
                {listeners.map((l) => (
                    <div key={l.id} className="p-4 rounded-xl border border-white/5 bg-white/[0.02] flex flex-col gap-3">
                        <div className="flex justify-between items-center">
                            <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                                <i className="fa-solid fa-headphones"></i> {l.name}
                            </h4>
                            <div className="flex gap-2">
                                <button onClick={() => playCalibrationSound(l)} className="px-2 py-1 bg-white/5 border border-white/10 hover:bg-white/10 rounded text-[10px] text-cyan-400 font-bold transition" title="Play 1000Hz calibration ping">
                                    <i className="fa-solid fa-satellite-dish"></i> PING
                                </button>
                                <button onClick={() => saveDeviceProfile(l, userId)} className="px-2 py-1 bg-white/5 border border-emerald-500/30 hover:bg-emerald-500/20 rounded text-[10px] text-emerald-400 font-bold transition" title="Save this delay profile">
                                    <i className="fa-regular fa-floppy-disk"></i> SAVE
                                </button>
                                <button onClick={() => removeListener(l.id)} className="px-2 py-1 bg-white/5 border border-red-500/30 hover:bg-red-500/20 rounded text-[10px] text-red-400 font-bold transition">
                                    <i className="fa-solid fa-xmark"></i>
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] text-gray-500 uppercase tracking-wider">Target Hardware Device</label>
                                <select 
                                    value={l.deviceId}
                                    onChange={(e) => updateDevice(l.id, e.target.value)}
                                    className="bg-[#05040a] border border-white/10 rounded px-3 py-1.5 text-xs text-white outline-none w-full"
                                >
                                    <option value="default">System Default</option>
                                    {devices.map(d => (
                                        <option key={d.deviceId} value={d.deviceId}>{d.label || `Device ${d.deviceId.substring(0,5)}`}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex flex-col gap-1">
                                <div className="flex justify-between text-[10px] text-gray-500 uppercase tracking-wider">
                                    <span>Sync Delay Offset</span>
                                    <span className="font-mono text-emerald-400 font-bold">{l.delayMs} ms</span>
                                </div>
                                <input 
                                    type="range" 
                                    min={0} 
                                    max={1000} 
                                    step={10}
                                    value={l.delayMs}
                                    onChange={(e) => updateDelay(l.id, parseInt(e.target.value))}
                                    className="w-full accent-emerald-500 h-1.5 bg-white/10 rounded mt-1 cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
