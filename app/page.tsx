"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Bot, Code2, Compass, FileSearch, Globe2, Menu, Mic, Paperclip, Plus, Search, Sparkles, X, Zap, Hammer, LogIn, Play, Download, Palette } from "lucide-react";

type Mode = "Eye Mode" | "Research" | "EyeCode" | "Agents" | "EyeBuild";
type Theme = "dark" | "light" | "green" | "white" | "brown";
type Message = { role: "user" | "assistant"; content: string; fileName?: string };
const modes: Mode[] = ["Eye Mode", "Research", "EyeCode", "Agents", "EyeBuild"];
const themes: { value: Theme; label: string }[] = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
  { value: "green", label: "Green" },
  { value: "white", label: "White" },
  { value: "brown", label: "Brown" }
];
const starters = [
  ["⌁", "Research", "Research a business opportunity in The Gambia"],
  ["</>", "Build", "Build a modern website for my business"],
  ["◈", "Analyze", "Analyze this document or dataset"],
  ["✦", "Create", "Create a brand and launch plan"]
];

export default function Home() {
  const [sidebar, setSidebar] = useState(true);
  const [mode, setMode] = useState<Mode>("Eye Mode");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<{name:string; text:string} | null>(null);
  const [projects, setProjects] = useState<string[]>([]);
  const [project, setProject] = useState("New mission");
  const [buildResult, setBuildResult] = useState("");
  const [code, setCode] = useState("// Paste code here and ask EyeCode to review it.\nconst greeting = 'Hello Gambia';");
  const [codeResult, setCodeResult] = useState("");
  const [agentResult, setAgentResult] = useState("");
  const [user, setUser] = useState<any>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login"|"signup">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [theme, setTheme] = useState<Theme>("dark");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetch("/api/auth/me").then(r=>r.json()).then(d=>setUser(d.user)).catch(()=>{});
    try {
      setMessages(JSON.parse(localStorage.getItem("eye_messages") || "[]"));
      setProjects(JSON.parse(localStorage.getItem("eye_projects") || "[]"));
      const savedTheme = localStorage.getItem("eye_theme") as Theme | null;
      if (savedTheme && themes.some((item) => item.value === savedTheme)) setTheme(savedTheme);
    } catch {}
  }, []);
  useEffect(() => { localStorage.setItem("eye_messages", JSON.stringify(messages)); }, [messages]);
  useEffect(() => { localStorage.setItem("eye_projects", JSON.stringify(projects)); }, [projects]);
  useEffect(() => { localStorage.setItem("eye_theme", theme); }, [theme]);

  const empty = messages.length === 0 && mode === "Eye Mode";

  async function send(text = input) {
    const clean = text.trim(); if ((!clean && !file) || busy) return;
    const next = [...messages, { role: "user" as const, content: clean || `Analyze ${file?.name}`, fileName: file?.name }];
    setMessages(next); setInput(""); setBusy(true);
    if (!projects.includes(project)) setProjects((p) => [...p, project]);
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: clean, mode, attachment: file?.text || "", history: messages.slice(-10) }) });
      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", content: data.reply || data.error || "EyeGambia could not complete that mission." }]);
    } catch { setMessages((m) => [...m, { role: "assistant", content: "Connection error. Check the server and try again." }]); }
    finally { setBusy(false); setFile(null); }
  }

  async function build() {
    if (!input.trim() || busy) return; setBusy(true); setBuildResult("");
    try { const r = await fetch("/api/build", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({prompt:input})}); const d=await r.json(); setBuildResult(d.blueprint || d.error); }
    catch { setBuildResult("EyeBuild could not connect to the server."); } finally { setBusy(false); }
  }

  async function runAgents() {
    if (!input.trim() || busy) return; setBusy(true); setAgentResult("");
    try { const r=await fetch("/api/agents",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mission:input,agents:["researcher","coder","builder","analyst","operator"]})}); const d=await r.json(); setAgentResult(d.result || JSON.stringify(d.plan,null,2)); }
    catch { setAgentResult("EyeAgents could not connect to the server."); } finally { setBusy(false); }
  }

  async function runSandbox() {
    if (!code.trim() || busy) return; setBusy(true); setCodeResult("");
    try { const r=await fetch("/api/sandbox",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({language:"javascript",code})}); const d=await r.json(); setCodeResult(d.out ? `Exit code: ${d.code}\n\n${d.out}${d.err?`\n\nSTDERR\n${d.err}`:""}` : (d.error||"No output.")); }
    catch { setCodeResult("Sandbox could not connect to the server."); } finally { setBusy(false); }
  }

  async function generateApp() {
    if (!input.trim() || busy) return; setBusy(true);
    try { const r=await fetch("/api/build/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:input})}); if(!r.ok){const d=await r.json(); throw new Error(d.error)} const blob=await r.blob(); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download="eyegambia-generated-app.zip"; a.click(); URL.revokeObjectURL(url); setBuildResult("Real starter application generated. The ZIP download has started."); }
    catch(e:any){setBuildResult(e.message||"EyeBuild generation failed.");} finally {setBusy(false);}
  }

  async function authenticate() {
    const endpoint=authMode==="login"?"/api/auth/login":"/api/auth/signup"; const r=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:authEmail,password:authPassword})}); const d=await r.json(); if(!r.ok) return alert(d.error||"Authentication failed"); setUser(d.user); setAuthOpen(false); setAuthPassword("");
  }

  async function logout() { await fetch("/api/auth/logout",{method:"POST"}); setUser(null); }

  async function upgrade() { const r=await fetch("/api/billing",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:user?.email})}); const d=await r.json(); if(d.url) location.href=d.url; else alert(d.error||"Billing is not configured yet."); }

  async function reviewCode() {
    if (!code.trim() || busy) return; setBusy(true); setCodeResult("");
    try { const r=await fetch("/api/code", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({instruction:input || "Find bugs and improve this code.",code})}); const d=await r.json(); setCodeResult(d.result || d.error); }
    catch { setCodeResult("EyeCode could not connect to the server."); } finally { setBusy(false); }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f=e.target.files?.[0]; if(!f) return;
    const allowed=/\.(txt|md|json|csv|js|jsx|ts|tsx|py|html|css|sql|xml|yml|yaml)$/i.test(f.name);
    if(!allowed){ setFile({name:f.name,text:"This MVP reads text/code files. PDF/image parsing will be added in the next tool layer."}); return; }
    const reader=new FileReader(); reader.onload=()=>setFile({name:f.name,text:String(reader.result).slice(0,80000)}); reader.readAsText(f);
  }

  const title = useMemo(() => mode === "EyeBuild" ? "Describe the app you want to build." : mode === "EyeCode" ? "Give EyeCode a mission." : mode === "Research" ? "What should EyeResearch investigate?" : "What do you want to accomplish?", [mode]);

  return <main className="shell" data-theme={theme}>
    {authOpen && <div className="modal-backdrop" onClick={()=>setAuthOpen(false)}><div className="pro-modal auth-modal" onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setAuthOpen(false)}>×</button><div className="modal-orb">E</div><p className="eyebrow">EYE ID</p><h2>{authMode==="login"?"Welcome back":"Create your Eye ID"}</h2><input className="auth-input" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} placeholder="Email" type="email"/><input className="auth-input" value={authPassword} onChange={e=>setAuthPassword(e.target.value)} placeholder="Password (8+ characters)" type="password"/><button className="upgrade-main" onClick={authenticate}>{authMode==="login"?"Log in":"Create account"}</button><button className="switch-auth" onClick={()=>setAuthMode(authMode==="login"?"signup":"login")}>{authMode==="login"?"Need an account? Sign up":"Already have an account? Log in"}</button></div></div>}
    {sidebar && <aside className="sidebar">
      <div className="brand"><div className="brand-mark">E</div><div><strong>EyeGambia</strong><small>One AI. Every mission.</small></div></div>
      <button className="new-btn" onClick={()=>{setMessages([]);setProject("New mission");setBuildResult("");setCodeResult("")}}><Plus size={18}/> New mission</button>
      <nav><p>WORKSPACE</p>
        <button className={mode==="Eye Mode"?"nav-active":""} onClick={()=>setMode("Eye Mode")}><Sparkles size={17}/> Eye Mode</button>
        <button className={mode==="Research"?"nav-active":""} onClick={()=>setMode("Research")}><Compass size={17}/> EyeResearch</button>
        <button className={mode==="EyeCode"?"nav-active":""} onClick={()=>setMode("EyeCode")}><Code2 size={17}/> EyeCode</button>
        <button className={mode==="Agents"?"nav-active":""} onClick={()=>setMode("Agents")}><Bot size={17}/> EyeAgents</button>
        <button className={mode==="EyeBuild"?"nav-active":""} onClick={()=>setMode("EyeBuild")}><Hammer size={17}/> EyeBuild</button>
        <button onClick={()=>fileRef.current?.click()}><FileSearch size={17}/> Files</button>
      </nav>
      <div className="sidebar-bottom"><div className="pro-card"><Zap size={18}/><div><strong>EyeGambia Pro</strong><span>Advanced missions</span></div><button onClick={upgrade}>Upgrade</button></div><div className="profile">{user?<><div className="avatar">{user.email[0].toUpperCase()}</div><span>{user.email}</span><button className="logout" onClick={logout}>Log out</button></>:<><div className="avatar">G</div><span>Guest workspace</span><button className="logout" onClick={()=>setAuthOpen(true)}><LogIn size={13}/></button></>}</div></div>
    </aside>}
    <section className="workspace">
      <header className="topbar"><button className="icon-btn" onClick={()=>setSidebar(!sidebar)}>{sidebar?<X size={19}/>:<Menu size={19}/>}</button><div className="mode-pill"><span className="pulse"/>{mode}<span className="chev">⌄</span></div><div className="project-name">{project}</div><div className="top-actions"><label className="theme-picker" title="Choose appearance"><Palette size={14}/><select aria-label="Choose appearance" value={theme} onChange={e=>setTheme(e.target.value as Theme)}>{themes.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select></label>{!user&&<button className="top-link" onClick={()=>{setAuthMode("login");setAuthOpen(true)}}><LogIn size={14}/> Log in</button>}<span className="local-pill">ENGINE v0.4</span><button className="avatar mini">{user?user.email[0].toUpperCase():"G"}</button></div></header>
      <div className="content">
        {empty && <section className="welcome"><div className="orb-wrap"><div className="orb"><span>◉</span></div></div><p className="eyebrow">EYE MODE · MISSION AI</p><h1>What do you want to <span>accomplish?</span></h1><p className="sub">Tell EyeGambia the outcome. It decides whether you need research, reasoning, coding, creation, analysis or a combination.</p><div className="mission-grid">{starters.map(([icon,t,text])=><button key={t} className="mission-card" onClick={()=>{setInput(text);setMode(t==="Research"?"Research":t==="Build"?"EyeBuild":"Eye Mode")}}><b>{icon}</b><strong>{t}</strong><span>{text}</span></button>)}</div></section>}
        {mode==="EyeCode" && <section className="tool-panel"><div className="tool-heading"><Code2/><div><h2>EyeCode</h2><p>Review, explain and improve code. Execution sandbox comes next.</p></div></div><textarea className="code-editor" value={code} onChange={e=>setCode(e.target.value)} spellCheck={false}/>{codeResult&&<pre className="result">{codeResult}</pre>}<button className="upgrade-main tool-action" onClick={runSandbox} disabled={busy||!code.trim()}><Play size={16}/> Run in secure sandbox</button></section>}
        {mode==="Agents" && <section className="tool-panel"><div className="tool-heading"><Bot/><div><h2>EyeAgents</h2><p>Coordinate specialist agents, then verify the result.</p></div></div>{agentResult&&<pre className="result">{agentResult}</pre>}<div className="agent-row"><span>Researcher</span><span>Coder</span><span>Builder</span><span>Analyst</span><span>Operator</span></div></section>}
        {mode==="EyeBuild" && <section className="tool-panel"><div className="tool-heading"><Hammer/><div><h2>EyeBuild</h2><p>Turn an idea into an implementation-ready product blueprint.</p></div></div>{buildResult&&<pre className="result">{buildResult}</pre>}<button className="upgrade-main tool-action" onClick={generateApp} disabled={busy||!input.trim()}><Download size={16}/> Generate real starter app ZIP</button></section>}
        {messages.length>0 && <div className="conversation">{messages.map((m,i)=><div key={i} className={`message ${m.role}`}><div className="message-label">{m.role==="user"?"You":"EyeGambia"}{m.fileName&&` · ${m.fileName}`}</div><div className="message-body">{m.content}</div></div>)}{busy&&<div className="thinking"><span/><span/><span/> EyeGambia is working on your mission…</div>}</div>}
        <div className="composer-wrap"><div className="composer">{file&&<div className="attachment"><Paperclip size={14}/>{file.name}<button onClick={()=>setFile(null)}><X size={13}/></button></div>}<textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();mode==="EyeBuild"?generateApp():mode==="EyeCode"?reviewCode():mode==="Agents"?runAgents():send()}}} placeholder={title} rows={2}/><div className="composer-tools"><div className="tool-left"><button title="Attach file" onClick={()=>fileRef.current?.click()}><Paperclip size={18}/></button><button title="Web research" onClick={()=>setMode("Research")}><Globe2 size={18}/></button><button title="Search" onClick={()=>setMode("Research")}><Search size={18}/></button><button title="Voice" disabled><Mic size={18}/></button><input ref={fileRef} type="file" hidden onChange={handleFile}/></div><button className="send" disabled={busy||(!input.trim()&&!file)} onClick={()=>mode==="EyeBuild"?generateApp():mode==="EyeCode"?reviewCode():mode==="Agents"?runAgents():send()}><ArrowUp size={19}/></button></div></div><p className="disclaimer">EyeGambia can make mistakes. Verify important information before acting.</p></div>
      </div>
    </section>
  </main>;
}
