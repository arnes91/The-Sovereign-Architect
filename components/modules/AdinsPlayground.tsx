
import React, { useState, useRef, useEffect } from 'react';
import { generateImage, streamStrategyChat } from '../../services/geminiService';
import { PROMPT_TEMPLATES } from '../../config/promptTemplates';
import { StorageService } from '../../services/storageService';

// --- SOUND ENGINE (Self-Contained) ---
const playSound = (type: 'BEEP' | 'SUCCESS' | 'SURPRISE' | 'ERROR') => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === 'BEEP') {
            osc.frequency.setValueAtTime(600, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
            osc.start();
            osc.stop(ctx.currentTime + 0.1);
        } else if (type === 'SUCCESS') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(400, ctx.currentTime);
            osc.frequency.setValueAtTime(600, ctx.currentTime + 0.1);
            osc.frequency.setValueAtTime(1000, ctx.currentTime + 0.2);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
            osc.start();
            osc.stop(ctx.currentTime + 0.4);
        } else if (type === 'SURPRISE') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.5);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
            osc.start();
            osc.stop(ctx.currentTime + 0.5);
        }
    } catch (e) { console.error("Sound error", e); }
};

const AdinsPlayground: React.FC = () => {
    const [mode, setMode] = useState<'HOME' | 'AVATAR' | 'SURPRISE' | 'CHAT'>('HOME');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(localStorage.getItem('adin_avatar_url'));
    const [credits, setCredits] = useState<number>(parseInt(localStorage.getItem('adin_credits') || "100"));
    
    // Avatar State
    const [avatarPrompt, setAvatarPrompt] = useState("");
    const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);

    // Surprise Box State
    const [boxShaking, setBoxShaking] = useState(false);
    const [prize, setPrize] = useState<{image: string, text: string} | null>(null);

    // Chat State
    const [chatInput, setChatInput] = useState("");
    const [chatHistory, setChatHistory] = useState<{role: string, text: string}[]>([]);
    const [isChatting, setIsChatting] = useState(false);

    const updateCredits = (amount: number) => {
        const newVal = credits + amount;
        setCredits(newVal);
        localStorage.setItem('adin_credits', newVal.toString());
    };

    // --- AVATAR CREATOR ---
    const createAvatar = async () => {
        if (!avatarPrompt) return;
        playSound('BEEP');
        setIsGeneratingAvatar(true);
        try {
            // Kid-safe prompt injection
            const safePrompt = `A cool, cartoon-style avatar for a kid's video game. ${avatarPrompt}. 3D Pixar style, colorful, vibrant, friendly, high quality.`;
            const b64 = await generateImage(safePrompt, "1:1");
            if (b64) {
                const url = `data:image/jpeg;base64,${b64}`;
                setAvatarUrl(url);
                localStorage.setItem('adin_avatar_url', url);
                playSound('SUCCESS');
                updateCredits(50); // Reward
            }
        } catch (e) {
            alert("Oops! The robot painter dropped his brush. Try again!");
        } finally {
            setIsGeneratingAvatar(false);
        }
    };

    // --- SURPRISE BOX ---
    const openSurpriseBox = async () => {
        if (credits < 20) {
            alert("Need 20 Space Coins! Ask Robo-Buddy for a mission!");
            return;
        }
        setBoxShaking(true);
        playSound('SURPRISE');
        
        try {
            // 1. Generate Random Item Idea
            const items = ['Space Dinosaur', 'Flying Pizza', 'Robot Cat', 'Laser Sword', 'Alien Slime', 'Rocket Shoes'];
            const randomItem = items[Math.floor(Math.random() * items.length)];
            
            // 2. Generate Image
            const b64 = await generateImage(`A funny cute cartoon 3d render of a ${randomItem} floating in space. Magical glowing effect.`, "1:1");
            
            if (b64) {
                setPrize({
                    image: `data:image/jpeg;base64,${b64}`,
                    text: `YOU FOUND A: ${randomItem.toUpperCase()}!`
                });
                updateCredits(-20);
                playSound('SUCCESS');
            }
        } catch (e) {
            alert("The box is stuck! Try again.");
        } finally {
            setBoxShaking(false);
        }
    };

    // --- ROBO-BUDDY CHAT ---
    const sendMessage = async () => {
        if (!chatInput) return;
        playSound('BEEP');
        const userMsg = { role: 'user', text: chatInput };
        setChatHistory(prev => [...prev, userMsg]);
        setChatInput("");
        setIsChatting(true);

        try {
            const historyForAi = chatHistory.map(m => ({
                role: m.role === 'user' ? 'user' : 'model',
                parts: [{ text: m.text }]
            }));

            const stream = streamStrategyChat(historyForAi, userMsg.text, 'FAST', PROMPT_TEMPLATES.ROBO_BUDDY);
            
            let fullResponse = "";
            for await (const chunk of stream) {
                if (chunk.text) fullResponse += chunk.text;
            }
            
            setChatHistory(prev => [...prev, { role: 'model', text: fullResponse }]);
            playSound('SUCCESS');
        } catch (e) {
            setChatHistory(prev => [...prev, { role: 'model', text: "Beep boop... I'm tired. Try again?" }]);
        } finally {
            setIsChatting(false);
        }
    };

    return (
        <div className="h-full bg-slate-900 text-white p-6 relative overflow-hidden font-sans">
            {/* Background Stars */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-20 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
            
            {/* TOP BAR */}
            <div className="relative z-10 flex justify-between items-center bg-slate-800 p-4 rounded-xl border-b-4 border-blue-500 shadow-xl mb-6">
                <div className="flex items-center gap-4">
                    {avatarUrl ? (
                        <img src={avatarUrl} className="w-16 h-16 rounded-full border-4 border-yellow-400 bg-black" />
                    ) : (
                        <div className="w-16 h-16 rounded-full border-4 border-dashed border-gray-500 flex items-center justify-center bg-gray-800">
                            <span className="text-2xl">?</span>
                        </div>
                    )}
                    <div>
                        <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                            CAPTAIN ADIN
                        </h1>
                        <p className="text-sm text-blue-200">Level 1 Space Explorer</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-black/30 px-6 py-2 rounded-full border border-yellow-500">
                    <span className="text-2xl">🪙</span>
                    <span className="text-2xl font-bold text-yellow-400">{credits}</span>
                </div>
            </div>

            {/* MAIN AREA */}
            <div className="relative z-10 h-[calc(100%-100px)]">
                
                {/* HOME MENU */}
                {mode === 'HOME' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full content-center">
                        <button onClick={() => { setMode('AVATAR'); playSound('BEEP'); }} className="group bg-blue-600 hover:bg-blue-500 rounded-2xl p-8 transition-all transform hover:-translate-y-2 border-b-8 border-blue-800 shadow-2xl flex flex-col items-center">
                            <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">🎨</div>
                            <h2 className="text-2xl font-black">MAKE AVATAR</h2>
                            <p className="text-blue-200 mt-2 text-center">Design your own hero!</p>
                        </button>
                        
                        <button onClick={() => { setMode('SURPRISE'); playSound('BEEP'); }} className="group bg-purple-600 hover:bg-purple-500 rounded-2xl p-8 transition-all transform hover:-translate-y-2 border-b-8 border-purple-800 shadow-2xl flex flex-col items-center">
                            <div className="text-6xl mb-4 group-hover:animate-bounce">🎁</div>
                            <h2 className="text-2xl font-black">SURPRISE BOX</h2>
                            <p className="text-purple-200 mt-2 text-center">Open for cool loot!</p>
                        </button>

                        <button onClick={() => { setMode('CHAT'); playSound('BEEP'); }} className="group bg-green-600 hover:bg-green-500 rounded-2xl p-8 transition-all transform hover:-translate-y-2 border-b-8 border-green-800 shadow-2xl flex flex-col items-center">
                            <div className="text-6xl mb-4 group-hover:rotate-12 transition-transform">🤖</div>
                            <h2 className="text-2xl font-black">ROBO-BUDDY</h2>
                            <p className="text-green-200 mt-2 text-center">Talk to your AI friend!</p>
                        </button>
                    </div>
                )}

                {/* AVATAR MODE */}
                {mode === 'AVATAR' && (
                    <div className="bg-slate-800 p-8 rounded-3xl border-4 border-blue-500 max-w-2xl mx-auto shadow-2xl">
                        <h2 className="text-3xl font-black text-center mb-6 text-blue-300">DESIGN YOUR HERO</h2>
                        
                        {isGeneratingAvatar ? (
                             <div className="h-64 flex flex-col items-center justify-center animate-pulse">
                                 <div className="text-6xl mb-4">🖌️</div>
                                 <h3 className="text-xl font-bold">Painting your picture...</h3>
                             </div>
                        ) : (
                            <>
                                <div className="mb-6">
                                    <label className="block text-lg font-bold mb-2">What do you look like?</label>
                                    <input 
                                        type="text" 
                                        value={avatarPrompt}
                                        onChange={e => setAvatarPrompt(e.target.value)}
                                        placeholder="e.g. A space ninja with a red cape"
                                        className="w-full text-xl p-4 rounded-xl bg-slate-700 border-2 border-slate-500 focus:border-blue-400 outline-none text-white placeholder-slate-400"
                                    />
                                </div>
                                <button 
                                    onClick={createAvatar}
                                    className="w-full bg-green-500 hover:bg-green-400 text-black font-black text-2xl py-4 rounded-xl border-b-8 border-green-700 active:border-b-0 active:translate-y-2 transition-all"
                                >
                                    CREATE MY HERO!
                                </button>
                            </>
                        )}
                        <button onClick={() => setMode('HOME')} className="mt-6 text-slate-400 font-bold hover:text-white block mx-auto">← BACK TO BASE</button>
                    </div>
                )}

                {/* SURPRISE MODE */}
                {mode === 'SURPRISE' && (
                    <div className="flex flex-col items-center justify-center h-full">
                        {!prize ? (
                            <button 
                                onClick={openSurpriseBox}
                                disabled={boxShaking}
                                className={`
                                    w-64 h-64 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-3xl border-8 border-orange-700 shadow-2xl flex items-center justify-center transform transition-all
                                    ${boxShaking ? 'animate-spin' : 'hover:scale-110 hover:rotate-3'}
                                `}
                            >
                                <span className="text-8xl">{boxShaking ? '⏳' : '?'}</span>
                            </button>
                        ) : (
                            <div className="bg-white text-black p-6 rounded-3xl shadow-2xl text-center max-w-md animate-in zoom-in duration-500">
                                <h2 className="text-3xl font-black mb-4 text-purple-600">{prize.text}</h2>
                                <img src={prize.image} className="w-full rounded-xl border-4 border-purple-200 mb-6" />
                                <button onClick={() => setPrize(null)} className="bg-purple-600 text-white font-bold py-3 px-8 rounded-full text-xl hover:bg-purple-500">
                                    AWESOME!
                                </button>
                            </div>
                        )}
                         {!prize && <p className="mt-8 text-2xl font-bold text-yellow-400 animate-pulse">COST: 20 COINS</p>}
                         <button onClick={() => setMode('HOME')} className="mt-12 text-slate-400 font-bold hover:text-white">← BACK TO BASE</button>
                    </div>
                )}

                {/* CHAT MODE */}
                {mode === 'CHAT' && (
                    <div className="bg-slate-800 p-6 rounded-3xl border-4 border-green-500 h-full flex flex-col max-w-3xl mx-auto shadow-2xl">
                         <div className="flex items-center gap-4 mb-4 border-b border-slate-700 pb-4">
                             <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-2xl">🤖</div>
                             <div>
                                 <h2 className="text-xl font-black">ROBO-BUDDY</h2>
                                 <p className="text-green-400 text-xs">Online & Ready!</p>
                             </div>
                         </div>
                         
                         <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
                             {chatHistory.length === 0 && (
                                 <div className="text-center text-slate-500 mt-10">
                                     <p className="text-4xl mb-4">👋</p>
                                     <p>Say hello to Robo-Buddy!</p>
                                 </div>
                             )}
                             {chatHistory.map((msg, i) => (
                                 <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                     <div className={`p-4 rounded-2xl max-w-[80%] text-lg font-medium ${
                                         msg.role === 'user' 
                                         ? 'bg-blue-600 text-white rounded-tr-none' 
                                         : 'bg-slate-700 text-green-300 rounded-tl-none border-2 border-slate-600'
                                     }`}>
                                         {msg.text}
                                     </div>
                                 </div>
                             ))}
                             {isChatting && <div className="text-green-500 animate-pulse font-bold">Robo-Buddy is typing...</div>}
                         </div>

                         <div className="flex gap-2">
                             <input 
                                type="text" 
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                                placeholder="Type a message..."
                                className="flex-1 bg-slate-900 border-2 border-slate-600 rounded-xl p-4 text-white outline-none focus:border-green-500 text-lg"
                             />
                             <button onClick={sendMessage} className="bg-green-600 text-white p-4 rounded-xl font-bold hover:bg-green-500">SEND</button>
                         </div>
                         <button onClick={() => setMode('HOME')} className="mt-4 text-slate-500 hover:text-white text-center text-sm">EXIT CHAT</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdinsPlayground;
