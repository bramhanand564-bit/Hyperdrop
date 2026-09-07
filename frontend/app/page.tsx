'use client';

import React, { useState } from 'react';
import { Send, Download, Smartphone, Clock, CheckCircle, FileUp, Settings, Trash2 } from 'lucide-react';
import { useWebRTC } from '../hooks/useWebRTC';
import TransferZone from '../components/TransferZone';

// Dummy data for saved devices
const initialSavedDevices = [
  { id: '1', name: "Aarav's Phone", lastConnected: '2 hours ago', icon: 'smartphone' },
  { id: '2', name: "MacBook Pro", lastConnected: 'Yesterday', icon: 'laptop' },
];

export default function HyperDropHome() {
  const [activeTab, setActiveTab] = useState<'send' | 'receive' | 'history'>('send');
  const [receiveCode, setReceiveCode] = useState('');
  const [savedDevices, setSavedDevices] = useState(initialSavedDevices);
  
  // Naya useWebRTC hook jisme acceptDownload aur incomingFile bhi hai
  const { 
    init, 
    sendFile, 
    acceptDownload, 
    status, 
    progress, 
    roomCode, 
    incomingFile 
  } = useWebRTC('ws://localhost:8080');

  const handleSendStart = () => {
    init(); // Room create karega
  };

  const handleReceiveStart = () => {
    if (receiveCode.length === 6) {
      init(receiveCode); // Room join karega
    }
  };

  const deleteDevice = (id: string) => {
    setSavedDevices(savedDevices.filter(device => device.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30">
      {/* Top Navigation Bar */}
      <nav className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <FileUp className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              HyperDrop
            </span>
          </div>
          <button className="p-2 hover:bg-slate-800 rounded-full transition-colors">
            <Settings className="w-5 h-5 text-slate-400" />
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8">
        
        {/* Main Control Panel (Tabs) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-1.5 flex gap-1 mb-8 shadow-2xl relative z-10">
          <TabButton 
            active={activeTab === 'send'} 
            onClick={() => setActiveTab('send')} 
            icon={<Send className="w-4 h-4" />} 
            label="Send File" 
          />
          <TabButton 
            active={activeTab === 'receive'} 
            onClick={() => setActiveTab('receive')} 
            icon={<Download className="w-4 h-4" />} 
            label="Receive" 
          />
          <TabButton 
            active={activeTab === 'history'} 
            onClick={() => setActiveTab('history')} 
            icon={<Clock className="w-4 h-4" />} 
            label="Recent" 
          />
        </div>

        {/* Content Area */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-10 shadow-2xl relative overflow-hidden min-h-[400px]">
          {/* Background Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-indigo-500/5 blur-[120px] pointer-events-none" />

          {/* SEND TAB */}
          {activeTab === 'send' && (
            <div className="flex flex-col items-center justify-center text-center w-full h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {status === 'disconnected' && (
                <>
                  <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center border border-indigo-500/20 mb-8">
                    <Send className="w-10 h-10 text-indigo-400 ml-1" />
                  </div>
                  <div className="space-y-2 mb-8">
                    <h2 className="text-3xl font-bold text-white">Share Securely</h2>
                    <p className="text-slate-400 max-w-md mx-auto">
                      Generate a 6-digit code or select a recent device to start a direct, end-to-end encrypted transfer.
                    </p>
                  </div>
                  <button 
                    onClick={handleSendStart}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-xl font-semibold transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/25"
                  >
                    Generate Code
                  </button>
                </>
              )}

              {status === 'waiting_for_receiver' && (
                <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 w-full max-w-sm mx-auto shadow-xl">
                  <p className="text-sm text-slate-400 mb-2">Your Transfer Code</p>
                  <div className="text-5xl font-mono tracking-widest text-white mb-6">
                    {roomCode || '------'}
                  </div>
                  <p className="text-sm text-indigo-400 flex items-center justify-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                    </span>
                    Waiting for receiver...
                  </p>
                </div>
              )}

              {(status === 'connected' || status === 'ready_to_transfer') && (
                <div className="w-full">
                  <h3 className="text-xl font-semibold text-white mb-6">Device Connected!</h3>
                  <TransferZone 
                    status={status} 
                    progress={progress} 
                    onSendFile={sendFile} 
                  />
                </div>
              )}
            </div>
          )}

          {/* RECEIVE TAB */}
          {activeTab === 'receive' && status === 'disconnected' && (
            <div className="flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="w-20 h-20 bg-cyan-500/10 rounded-full flex items-center justify-center border border-cyan-500/20">
                <Download className="w-10 h-10 text-cyan-400" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-white">Receive Files</h2>
                <p className="text-slate-400 max-w-md mx-auto">
                  Enter the 6-digit code provided by the sender to connect and download.
                </p>
              </div>

              <div className="w-full max-w-sm space-y-4">
                <input 
                  type="text" 
                  maxLength={6}
                  value={receiveCode}
                  onChange={(e) => setReceiveCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-6 py-4 text-center text-4xl font-mono tracking-widest text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all placeholder:text-slate-800"
                />
                <button 
                  onClick={handleReceiveStart}
                  disabled={receiveCode.length !== 6}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 text-white px-8 py-4 rounded-xl font-semibold transition-all shadow-lg shadow-cyan-500/25 disabled:shadow-none"
                >
                  Connect
                </button>
              </div>
            </div>
          )}

          {/* RECENT / HISTORY TAB */}
          {activeTab === 'history' && status === 'disconnected' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full max-w-lg mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Saved Devices</h2>
                <p className="text-slate-400 text-sm">Connect instantly without a code.</p>
              </div>

              <div className="space-y-3">
                {savedDevices.map((device) => (
                  <div key={device.id} className="group flex items-center justify-between p-4 bg-slate-950 border border-slate-800 hover:border-indigo-500/50 rounded-2xl transition-all cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center">
                        <Smartphone className="w-6 h-6 text-indigo-400" />
                      </div>
                      <div className="text-left">
                        <h4 className="text-white font-medium">{device.name}</h4>
                        <p className="text-xs text-slate-500">{device.lastConnected}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="text-sm bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white px-4 py-2 rounded-lg transition-colors font-medium">
                        Connect
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteDevice(device.id); }}
                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                
                {savedDevices.length === 0 && (
                  <div className="text-center py-12 text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                    No recent devices found.
                  </div>
                )}
              </div>
            </div>
          )}


          {/* ========================================== */}
          {/* OVERLAY SCREENS (Covers the whole card)      */}
          {/* ========================================== */}

          {/* 1. Receiver ko jab file aati dikhe (Save button) */}
          {status === 'incoming_file' && incomingFile && (
            <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-6 animate-in zoom-in-95 duration-300">
              <div className="w-20 h-20 bg-cyan-500/10 rounded-2xl flex items-center justify-center mb-6 border border-cyan-500/20">
                <FileUp className="w-10 h-10 text-cyan-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Incoming File</h3>
              <p className="text-indigo-300 text-xl font-medium mb-1 truncate max-w-[250px]">{incomingFile.name}</p>
              <p className="text-slate-400 mb-8 font-mono">
                Size: {(incomingFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>
              <button 
                onClick={acceptDownload}
                className="w-full max-w-xs bg-cyan-600 hover:bg-cyan-500 text-white px-8 py-4 rounded-xl font-semibold transition-all shadow-lg shadow-cyan-500/25 transform active:scale-95"
              >
                Accept & Save File
              </button>
            </div>
          )}

          {/* 2. Jab Transfer chal raha ho (Dono ke liye) */}
          {(status === 'transferring' || status === 'waiting_for_receiver_accept' || status === 'success') && (
            <div className="absolute inset-0 bg-slate-900 z-20 flex flex-col items-center justify-center p-6 animate-in fade-in">
              <TransferZone 
                status={status} 
                progress={progress} 
                onSendFile={sendFile} 
              />
              
              {status === 'waiting_for_receiver_accept' && (
                <div className="mt-8 flex items-center justify-center gap-3 text-indigo-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <p className="animate-pulse">Waiting for receiver to accept the file...</p>
                </div>
              )}

              {status === 'success' && (
                <button 
                  onClick={() => window.location.reload()}
                  className="mt-8 text-slate-400 hover:text-white underline underline-offset-4"
                >
                  Send Another File
                </button>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

// Helper Component for Tabs
function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium transition-all ${
        active 
          ? 'bg-slate-800 text-white shadow-sm' 
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
