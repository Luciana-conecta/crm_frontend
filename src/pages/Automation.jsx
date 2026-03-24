
import React from 'react';
import { useNavigate } from 'react-router-dom';

const Automation = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-screen w-full bg-background-light dark:bg-background-dark overflow-hidden font-display">
      <header className="h-16 flex items-center justify-between px-6 bg-surface-light dark:bg-slate-900 border-b border-border-light dark:border-slate-800 shrink-0 z-30 transition-colors">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-all">
            <span className="material-symbols-outlined text-text-main-light dark:text-white">arrow_back</span>
          </button>
          <div>
            <h2 className="text-lg font-black text-text-main-light dark:text-white leading-none">New Lead Nurture Flow</h2>
            <p className="text-[10px] text-text-sub-light font-bold uppercase tracking-widest mt-1">Campaigns / Automations / Edit Flow</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/10 px-4 py-1.5 rounded-full border border-amber-100 dark:border-amber-900/30">
              <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">Draft Mode</span>
           </div>
           <button className="px-6 py-2 bg-primary text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all flex items-center gap-2">
             <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
             Publish
           </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Toolbox */}
        <aside className="w-72 bg-surface-light dark:bg-slate-900 border-r border-border-light dark:border-slate-800 flex flex-col shrink-0">
          <div className="p-6 border-b border-gray-100 dark:border-slate-800">
            <h3 className="text-base font-black text-text-main-light dark:text-white">Toolbox</h3>
            <p className="text-[10px] text-text-sub-light font-bold uppercase mt-1">Drag nodes to canvas</p>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
             <div>
                <h4 className="text-[10px] font-black text-text-sub-light uppercase tracking-widest mb-4">Triggers</h4>
                <div className="space-y-2">
                  {[
                    { label: 'New Lead', sub: 'Form submission', icon: 'bolt', color: 'bg-green-50 text-green-600' },
                    { label: 'Schedule', sub: 'Date/time trigger', icon: 'schedule', color: 'bg-green-50 text-green-600' },
                  ].map((node, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 border border-border-light dark:border-slate-700 rounded-2xl hover:border-primary cursor-grab transition-all">
                      <div className={`size-10 rounded-xl flex items-center justify-center ${node.color}`}><span className="material-symbols-outlined">{node.icon}</span></div>
                      <div>
                         <p className="text-sm font-bold text-text-main-light dark:text-white leading-none">{node.label}</p>
                         <p className="text-[10px] text-text-sub-light mt-1">{node.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
             </div>
             <div>
                <h4 className="text-[10px] font-black text-text-sub-light uppercase tracking-widest mb-4">Actions</h4>
                <div className="space-y-2">
                  {[
                    { label: 'Send Email', sub: 'SMTP Integration', icon: 'mail', color: 'bg-blue-50 text-blue-600' },
                    { label: 'WhatsApp', sub: 'Template msg', icon: 'chat', color: 'bg-blue-50 text-blue-600' },
                  ].map((node, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 border border-border-light dark:border-slate-700 rounded-2xl hover:border-primary cursor-grab transition-all">
                      <div className={`size-10 rounded-xl flex items-center justify-center ${node.color}`}><span className="material-symbols-outlined">{node.icon}</span></div>
                      <div>
                         <p className="text-sm font-bold text-text-main-light dark:text-white leading-none">{node.label}</p>
                         <p className="text-[10px] text-text-sub-light mt-1">{node.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
             </div>
          </div>
        </aside>

        {/* Canvas */}
        <main className="flex-1 relative bg-gray-50 dark:bg-[#080c14] dot-pattern overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
            <span className="material-symbols-outlined text-[300px] text-gray-900 dark:text-white">hub</span>
          </div>

          {/* SVG Connector mock */}
          <svg className="absolute inset-0 size-full pointer-events-none">
            <path d="M 280 250 C 350 250, 350 250, 420 250" stroke="#D4A574" strokeWidth="2" fill="none" />
            <path d="M 670 250 C 720 250, 720 180, 760 180" stroke="#D4A574" strokeWidth="2" fill="none" />
            <path d="M 670 250 C 720 250, 720 320, 760 320" stroke="#dbdfe6" strokeWidth="2" fill="none" />
          </svg>

          {/* Nodes */}
          <div className="absolute top-1/2 left-20 -translate-y-1/2 w-64">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border-2 border-green-500 overflow-hidden">
               <div className="h-1 bg-green-500" />
               <div className="p-4 flex gap-4">
                  <div className="size-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center shrink-0"><span className="material-symbols-outlined">bolt</span></div>
                  <div className="flex-1 min-w-0">
                    <h5 className="text-sm font-black text-text-main-light dark:text-white truncate">New Lead Created</h5>
                    <p className="text-[10px] text-text-sub-light font-bold truncate">SOURCE: WEB FORM</p>
                  </div>
               </div>
            </div>
          </div>

          <div className="absolute top-1/2 left-[420px] -translate-y-1/2 w-64">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border-2 border-primary ring-8 ring-primary/5 overflow-hidden scale-105">
               <div className="h-1 bg-primary" />
               <div className="p-4 flex gap-4">
                  <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0"><span className="material-symbols-outlined">call_split</span></div>
                  <div className="flex-1 min-w-0">
                    <h5 className="text-sm font-black text-text-main-light dark:text-white truncate">Check Deal Value</h5>
                    <p className="text-[10px] text-text-sub-light font-bold truncate">VALUE  $1,000</p>
                  </div>
                  <span className="material-symbols-outlined text-primary text-sm animate-pulse">adjust</span>
               </div>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="absolute bottom-6 left-6 flex flex-col gap-2">
             <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-border-light dark:border-slate-800 p-1 flex flex-col overflow-hidden">
                <button className="p-2.5 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all"><span className="material-symbols-outlined text-[20px]">add</span></button>
                <div className="h-px bg-gray-100 dark:bg-slate-800" />
                <button className="p-2.5 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all"><span className="material-symbols-outlined text-[20px]">remove</span></button>
                <div className="h-px bg-gray-100 dark:bg-slate-800" />
                <div className="p-2.5 text-[10px] font-black text-center text-text-sub-light">100%</div>
             </div>
          </div>
        </main>

        {/* Property Panel */}
        <aside className="w-80 bg-surface-light dark:bg-slate-900 border-l border-border-light dark:border-slate-800 flex flex-col shrink-0 transition-colors">
          <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-start">
             <div>
                <span className="text-[10px] font-black uppercase text-amber-600 tracking-widest">Logic Node</span>
                <h3 className="text-lg font-black text-text-main-light dark:text-white mt-1">Check Deal Value</h3>
             </div>
             <button className="text-text-sub-light hover:text-text-main-light transition-all"><span className="material-symbols-outlined">close</span></button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
             <div className="space-y-3">
                <label className="text-[10px] font-black text-text-sub-light uppercase tracking-widest">Internal Name</label>
                <input 
                  type="text" 
                  defaultValue="Check Deal Value"
                  className="w-full h-11 px-4 bg-gray-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20"
                />
             </div>
             <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-text-sub-light uppercase tracking-widest">Conditions</label>
                  <button className="text-[10px] font-black text-primary uppercase hover:underline">Add Group</button>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 space-y-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-black text-text-sub-light uppercase tracking-widest">If all match</span>
                    <button className="text-text-sub-light hover:text-red-500"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                  </div>
                  <select className="w-full bg-white dark:bg-slate-900 border-none rounded-lg text-xs font-bold py-2 shadow-sm"><option>Deal Value</option></select>
                  <select className="w-full bg-white dark:bg-slate-900 border-none rounded-lg text-xs font-bold py-2 shadow-sm"><option>Is greater than</option></select>
                  <input type="number" defaultValue="1000" className="w-full bg-white dark:bg-slate-900 border-none rounded-lg text-xs font-bold py-2 px-3 shadow-sm" />
                </div>
                <button className="w-full py-3 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-2xl text-[10px] font-black text-text-sub-light uppercase tracking-widest hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">add</span> Add Condition
                </button>
             </div>
          </div>
          <div className="p-6 border-t border-gray-100 dark:border-slate-800">
             <button className="w-full py-3.5 bg-primary text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 hover:bg-primary-hover transition-all">Apply Changes</button>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Automation;
