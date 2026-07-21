import React, { useState, useEffect } from "react";
import { Search, Download, Calendar } from "lucide-react";
import { COLORS, money, secondaryBtnStyle } from "../styles.js";
import { SectionHeader } from "./Shared.jsx";
import { api } from "../api.js";
import { downloadCSV } from "../csv.js";

export default function SalesHistory() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    api.salesHistory().then(setSales).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  const f = sales.filter(s => s.productName.toLowerCase().includes(search.toLowerCase()) || s.productSku.toLowerCase().includes(search.toLowerCase()));
  const rev = f.reduce((a,s) => a + s.totalValue, 0);
  const units = f.reduce((a,s) => a + s.units, 0);

  return (
    <div>
      <SectionHeader title="Sales History" subtitle="Every sale recorded across all products." action={
        <button onClick={() => {
          const h = ["Date","Product","SKU","Units","Unit Price","Total"];
          const r = f.map(s => [s.recordedAt, s.productName, s.productSku, s.units, s.unitPrice, s.totalValue]);
          downloadCSV(`sales-${new Date().toISOString().slice(0,10)}.csv`, [h, ...r]);
        }} disabled={f.length===0} style={secondaryBtnStyle}>
          <span style={{display:"flex",alignItems:"center",gap:6}}><Download size={15}/> Export CSV</span>
        </button>
      }/>
      <div style={{display:"flex",gap:14,marginBottom:18,flexWrap:"wrap"}}>
        <div style={{background:COLORS.panel,border:`1px solid ${COLORS.line}`,borderRadius:12,padding:"14px 18px",flex:1,minWidth:140}}>
          <div style={{fontFamily:"Inter",fontSize:12,color:COLORS.sub,marginBottom:4}}>Total sales</div>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:22,fontWeight:700,color:COLORS.ink}}>{f.length}</div>
        </div>
        <div style={{background:COLORS.panel,border:`1px solid ${COLORS.line}`,borderRadius:12,padding:"14px 18px",flex:1,minWidth:140}}>
          <div style={{fontFamily:"Inter",fontSize:12,color:COLORS.sub,marginBottom:4}}>Units sold</div>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:22,fontWeight:700,color:COLORS.ink}}>{units}</div>
        </div>
        <div style={{background:COLORS.panel,border:`1px solid ${COLORS.line}`,borderRadius:12,padding:"14px 18px",flex:1,minWidth:140}}>
          <div style={{fontFamily:"Inter",fontSize:12,color:COLORS.sub,marginBottom:4}}>Revenue</div>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:22,fontWeight:700,color:COLORS.primary}}>{money(rev)}</div>
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8,background:"#fff",border:`1px solid ${COLORS.line}`,borderRadius:9,padding:"8px 12px",marginBottom:16,maxWidth:320}}>
        <Search size={15} color={COLORS.sub}/>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or SKU"
          style={{border:"none",outline:"none",fontFamily:"Inter",fontSize:13.5,width:"100%"}}/>
      </div>
      <div style={{background:COLORS.panel,border:`1px solid ${COLORS.line}`,borderRadius:14,overflow:"hidden"}}>
        <table>
          <thead><tr><th>Date</th><th>Product</th><th>SKU</th><th>Units</th><th>Unit Price</th><th>Total</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={6} style={{textAlign:"center",color:COLORS.sub,padding:30}}>Loading...</td></tr>
            : f.length === 0 ? <tr><td colSpan={6} style={{textAlign:"center",color:COLORS.sub,padding:30}}>{search ? "No matches." : "No sales yet."}</td></tr>
            : f.map(s => (
                <tr key={s.id}>
                  <td style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:12.5,color:COLORS.sub,whiteSpace:"nowrap"}}>
                    <span style={{display:"flex",alignItems:"center",gap:5}}><Calendar size={12}/>{new Date(s.recordedAt).toLocaleString()}</span>
                  </td>
                  <td style={{fontWeight:500}}>{s.productName}</td>
                  <td style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:12.5,color:COLORS.sub}}>{s.productSku}</td>
                  <td style={{fontFamily:"'IBM Plex Mono',monospace",fontWeight:600}}>{s.units}</td>
                  <td style={{fontFamily:"'IBM Plex Mono',monospace"}}>{money(s.unitPrice)}</td>
                  <td style={{fontFamily:"'IBM Plex Mono',monospace",fontWeight:600,color:COLORS.teal}}>{money(s.totalValue)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {error && <div style={{background:COLORS.roseSoft,color:COLORS.rose,borderRadius:8,padding:"10px 16px",fontFamily:"Inter",fontSize:13,marginTop:16}}>{error}</div>}
    </div>
  );
}
