"use client";

import { useEffect, useState } from "react";

type Dashboard = {
  health: any;
  metrics: any;
  events: any[];
};

export default function AdminPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");
  const [token, setToken] = useState("");
  const [adminToken, setAdminToken] = useState("");

  async function load(currentToken = adminToken) {
    try {
      const res = await fetch("/api/admin/overview", { cache: "no-store", headers: currentToken ? { "x-eyegambia-admin-token": currentToken } : {} });
      if (!res.ok) throw new Error(res.status === 401 ? "Unauthorized — enter the admin token below." : "Admin endpoint unavailable");
      setData(await res.json());
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load dashboard");
    }
  }

  useEffect(() => {
    const stored = sessionStorage.getItem("eyegambia_admin_token") || "";
    setToken(stored);
    setAdminToken(stored);
  }, []);

  useEffect(() => {
    load(adminToken);
    const t = setInterval(() => load(adminToken), 30000);
    return () => clearInterval(t);
  }, [adminToken]);

  if (error) return <main className="admin"><h1>EyeGambia Operations</h1><p className="error">{error}</p>{error.includes("Unauthorized") && <form onSubmit={(e)=>{e.preventDefault(); sessionStorage.setItem("eyegambia_admin_token", token); setAdminToken(token);}}><input aria-label="Admin token" type="password" placeholder="Admin token" value={token} onChange={e=>setToken(e.target.value)} /><button type="submit">Unlock</button></form>}</main>;
  if (!data) return <main className="admin"><h1>EyeGambia Operations</h1><p>Loading telemetry…</p></main>;

  const m=data.metrics.remote?.configured ? { ...data.metrics, requests:data.metrics.remote.requests, errors:data.metrics.remote.errors, errorRate:data.metrics.remote.requests ? data.metrics.remote.errors/data.metrics.remote.requests : 0, inputTokens:data.metrics.remote.inputTokens, outputTokens:data.metrics.remote.outputTokens, estimatedCostUsd:data.metrics.remote.estimatedCostUsd } : data.metrics;
  const cards=[
    ["Requests", m.requests], ["Errors", m.errors],
    ["Error rate", `${(m.errorRate*100).toFixed(2)}%`],
    ["Avg latency", `${m.avgLatencyMs} ms`],
    ["P95 latency", `${m.p95LatencyMs} ms`],
    ["AI cost", `$${m.estimatedCostUsd.toFixed(4)}`],
    ["Input tokens", m.inputTokens.toLocaleString()],
    ["Output tokens", m.outputTokens.toLocaleString()]
  ];

  return <main className="admin">
    <header className="admin-head">
      <div><span className="admin-kicker">EYE GAMBIA · OPERATIONS</span><h1>Mission Control</h1><p>Health, traffic, AI usage and estimated cost.</p></div>
      <button onClick={() => load(adminToken)}>Refresh</button>
    </header>
    <section className="status"><span className={data.health.ok ? "dot good":"dot bad"}></span><b>{data.health.ok ? "Systems operational":"Degraded"}</b><span>AI: {data.health.aiConfigured ? "configured":"not configured"}</span><span>Rate limiting: {data.health.rateLimitMode}</span><span>Redis: {data.health.redis}</span></section>
    <section className="cards">{cards.map(([label,value])=><article key={label as string}><small>{label}</small><strong>{value}</strong></article>)}</section>
    <section className="panel"><h2>Recent traces</h2><div className="events">{data.events.slice(0,60).map((e,i)=><div className="event" key={i}><code>{e.traceId?.slice(0,8)}</code><span>{e.event}</span><span>{e.route}</span><span>{e.status ?? ""}</span><time>{new Date(e.timestamp).toLocaleTimeString()}</time></div>)}</div></section>
  </main>
}
