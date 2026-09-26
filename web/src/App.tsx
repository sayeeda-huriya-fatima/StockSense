import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { 
  Boxes, 
  ArrowUpRight, 
  ShieldCheck, 
  Layers, 
  RefreshCw, 
  Activity, 
  Send, 
  CheckCircle2, 
  PackageCheck,
  TrendingUp,
  Cpu
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  sku: string;
  uom: string;
}

interface LocationNode {
  id: string;
  location_name: string;
  type: string;
}

interface OperationManifest {
  id: string;
  reference_no: string;
  type: string;
  status: string;
  partner_name: string;
  created_at: string;
}

interface StockBalance {
  product_id: string;
  product_name: string;
  sku: string;
  location_name: string;
  stock: number;
}

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<LocationNode[]>([]);
  const [operations, setOperations] = useState<OperationManifest[]>([]);
  const [stockBalances, setStockBalances] = useState<StockBalance[]>([]);
  const [totalStock, setTotalStock] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'telemetry' | 'dispatch' | 'ledger'>('telemetry');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Form State
  const [refNo, setRefNo] = useState(`OP-${Math.floor(1000 + Math.random() * 9000)}`);
  const [opType, setOpType] = useState('receipt');
  const [sourceId, setSourceId] = useState('');
  const [destId, setDestId] = useState('');
  const [partner, setPartner] = useState('Apex Orbital Supply');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [qty, setQty] = useState(50);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [prodRes, locRes, opRes] = await Promise.all([
        supabase.from('products').select('id, name, sku, uom'),
        supabase.from('locations').select('id, location_name, type'),
        supabase.from('operations').select('*').order('created_at', { ascending: false }).limit(10)
      ]);

      const prods: Product[] = prodRes.data || [];
      const locs: LocationNode[] = locRes.data || [];
      const ops: OperationManifest[] = opRes.data || [];

      setProducts(prods);
      setLocations(locs);
      setOperations(ops);

      if (prods.length > 0 && !selectedProduct) {
        setSelectedProduct(prods[0].id);
      }

      if (locs.length > 0 && !sourceId && !destId) {
        const vendor = locs.find(l => l.type === 'vendor') || locs[0];
        const internal = locs.find(l => l.type === 'internal') || (locs[1] || locs[0]);
        if (vendor) setSourceId(vendor.id);
        if (internal) setDestId(internal.id);
      }

      const internalLocs = locs.filter(l => l.type === 'internal');
      const balances: StockBalance[] = [];
      let totalUnits = 0;

      for (const loc of internalLocs) {
        for (const prod of prods) {
          try {
            const { data } = await supabase.rpc('get_current_stock', {
              p_product_id: prod.id,
              p_location_id: loc.id
            });
            const stockCount = Number(data || 0);
            if (stockCount > 0) {
              balances.push({
                product_id: prod.id,
                product_name: prod.name,
                sku: prod.sku,
                location_name: loc.location_name,
                stock: stockCount
              });
              totalUnits += stockCount;
            }
          } catch {
            // resilient catch
          }
        }
      }
      setStockBalances(balances);
      setTotalStock(totalUnits);
    } catch (err: any) {
      setStatusMsg(`Data error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProduct || !sourceId || !destId) {
      setStatusMsg('Please verify product and routing node selections.');
      return;
    }

    setLoading(true);
    setStatusMsg(null);
    try {
      const { error } = await supabase.rpc('create_operation_with_lines', {
        p_reference_no: refNo,
        p_operation_type: opType,
        p_source_location_id: sourceId,
        p_destination_location_id: destId,
        p_partner_name: partner,
        p_items: [{ product_id: selectedProduct, quantity: Number(qty) }]
      });

      if (error) throw error;
      setStatusMsg(`Manifest ${refNo} locked in pipeline.`);
      setRefNo(`OP-${Math.floor(1000 + Math.random() * 9000)}`);
      setActiveTab('ledger');
      await loadData();
    } catch (err: any) {
      setStatusMsg(`Dispatch error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleValidate(id: string) {
    setLoading(true);
    setStatusMsg(null);
    try {
      const { error } = await supabase.rpc('validate_operation', { p_operation_id: id });
      if (error) throw error;
      setStatusMsg('Operation committed. Immutable double-entry rows updated.');
      await loadData();
    } catch (err: any) {
      setStatusMsg(`Validation failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#05070A',
      color: '#FFFFFF',
      fontFamily: '"Space Grotesk", -apple-system, sans-serif',
      padding: '2rem 1.5rem',
      maxWidth: '820px',
      margin: '0 auto',
      boxSizing: 'border-box'
    }}>
      {/* Editorial Header / HUD Bar */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: '1.5rem',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        marginBottom: '2rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #D4FF00 0%, #9BC500 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#000'
          }}>
            <Cpu size={18} strokeWidth={2.5} />
          </div>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: '1.25rem',
              fontFamily: '"Syne", sans-serif',
              fontWeight: 900,
              letterSpacing: '-0.02em',
              lineHeight: 1
            }}>
              STOCKSENSE <span style={{ color: '#D4FF00' }}>//</span>
            </h1>
            <div style={{ fontSize: '0.65rem', color: '#64748B', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: '0.2rem' }}>
              Autonomous Digital Twin Ledger
            </div>
          </div>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          style={{
            background: '#D4FF00',
            color: '#05070A',
            border: 'none',
            padding: '0.55rem 1.1rem',
            borderRadius: '999px',
            fontSize: '0.75rem',
            fontWeight: 800,
            letterSpacing: '0.04em',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            transition: 'transform 0.15s ease'
          }}
          onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.96)')}
          onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <RefreshCw size={13} strokeWidth={2.5} className={loading ? 'spin' : ''} />
          {loading ? 'SYNCING...' : 'SYNC LEDGER'}
        </button>
      </header>

      {/* Dynamic Status / Alert Flash */}
      {statusMsg && (
        <div style={{
          background: 'rgba(212,255,0,0.06)',
          border: '1px solid rgba(212,255,0,0.4)',
          color: '#D4FF00',
          padding: '0.85rem 1.1rem',
          borderRadius: '10px',
          fontSize: '0.8rem',
          fontWeight: 600,
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem'
        }}>
          <Activity size={16} />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Pill Navigation (Lando-inspired segmented control) */}
      <nav style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '2rem',
        background: '#0B0F15',
        padding: '0.4rem',
        borderRadius: '14px',
        border: '1px solid rgba(255,255,255,0.06)'
      }}>
        {(['telemetry', 'dispatch', 'ledger'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '0.75rem 0',
              background: activeTab === tab ? '#D4FF00' : 'transparent',
              color: activeTab === tab ? '#05070A' : '#94A3B8',
              border: 'none',
              borderRadius: '10px',
              fontFamily: '"Syne", sans-serif',
              fontWeight: 800,
              fontSize: '0.8rem',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            {tab === 'telemetry' && 'Telemetry'}
            {tab === 'dispatch' && 'Dispatch'}
            {tab === 'ledger' && `Manifests (${operations.length})`}
          </button>
        ))}
      </nav>

      {/* TAB 1: TELEMETRY (Hero Digital-Twin Cards) */}
      {activeTab === 'telemetry' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Main Hero Card */}
          <div style={{
            position: 'relative',
            borderRadius: '20px',
            overflow: 'hidden',
            background: 'radial-gradient(circle at 100% 0%, rgba(212,255,0,0.12) 0%, rgba(13,18,26,0.95) 60%)',
            border: '1px solid rgba(212,255,0,0.3)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
            padding: '2rem',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <span style={{
                background: '#D4FF00',
                color: '#05070A',
                fontSize: '0.7rem',
                fontWeight: 900,
                padding: '0.3rem 0.65rem',
                borderRadius: '6px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}>
                <ShieldCheck size={13} strokeWidth={2.5} /> HUB ALPHA
              </span>
              <span style={{ color: '#4ADE80', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ADE80', boxShadow: '0 0 8px #4ADE80' }} />
                DOUBLE-ENTRY VERIFIED
              </span>
            </div>

            <div>
              <div style={{ fontSize: '0.78rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Aggregate Verified Physical Stock
              </div>
              <div style={{
                fontSize: '3.6rem',
                fontFamily: '"Syne", sans-serif',
                fontWeight: 900,
                color: '#FFFFFF',
                letterSpacing: '-0.04em',
                margin: '0.2rem 0'
              }}>
                {totalStock} <span style={{ fontSize: '1.2rem', color: '#D4FF00', fontWeight: 800 }}>UNITS</span>
              </div>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              paddingTop: '1.2rem',
              marginTop: '1rem'
            }}>
              <span style={{ fontSize: '0.85rem', color: '#94A3B8' }}>Primary Facility — Automated Pipeline</span>
              <span style={{ color: '#D4FF00', fontSize: '0.8rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                LIVE FEED <ArrowUpRight size={14} />
              </span>
            </div>
          </div>

          {/* Granular Inventory Nodes Grid */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '0.85rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94A3B8' }}>
                Node Balances
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#64748B' }}>{stockBalances.length} active positions</span>
            </div>

            {stockBalances.length === 0 ? (
              <div style={{
                padding: '2.5rem',
                textAlign: 'center',
                background: '#0B0F15',
                borderRadius: '16px',
                border: '1px dashed rgba(255,255,255,0.1)',
                color: '#64748B'
              }}>
                <Boxes size={28} style={{ margin: '0 auto 0.5rem auto', opacity: 0.5 }} />
                <div>No physical stock balance records detected in storage facilities.</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
                {stockBalances.map(b => (
                  <div
                    key={`${b.product_id}-${b.location_name}`}
                    style={{
                      background: '#0B0F15',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: '14px',
                      padding: '1.2rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'border-color 0.2s ease'
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(212,255,0,0.5)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.68rem', color: '#64748B', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                          {b.sku}
                        </span>
                        <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.06)', padding: '0.2rem 0.45rem', borderRadius: '4px', color: '#94A3B8' }}>
                          {b.location_name}
                        </span>
                      </div>
                      <div style={{ fontFamily: '"Syne", sans-serif', fontWeight: 800, fontSize: '1rem', marginTop: '0.5rem' }}>
                        {b.product_name}
                      </div>
                    </div>

                    <div style={{ marginTop: '1.2rem', display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
                      <span style={{ fontSize: '1.8rem', fontFamily: '"Syne", sans-serif', fontWeight: 900, color: '#D4FF00' }}>
                        {b.stock}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>units</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DISPATCH MOVEMENT */}
      {activeTab === 'dispatch' && (
        <div style={{
          background: '#0B0F15',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px',
          padding: '2rem'
        }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0, fontFamily: '"Syne", sans-serif', fontSize: '1.3rem', fontWeight: 800 }}>
              CREATE DISPATCH MANIFEST
            </h2>
            <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.8rem', color: '#64748B' }}>
              Draft an atomic inventory movement across source and destination nodes.
            </p>
          </div>

          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
                Manifest Reference ID
              </label>
              <input
                style={{
                  width: '100%',
                  padding: '0.8rem 1rem',
                  background: '#121721',
                  border: '1px solid #1E293B',
                  color: '#FFFFFF',
                  borderRadius: '10px',
                  boxSizing: 'border-box',
                  fontFamily: 'monospace',
                  fontSize: '0.9rem'
                }}
                value={refNo}
                onChange={e => setRefNo(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
                  Operation Type
                </label>
                <select
                  style={{ width: '100%', padding: '0.8rem', background: '#121721', border: '1px solid #1E293B', color: '#FFF', borderRadius: '10px' }}
                  value={opType}
                  onChange={e => setOpType(e.target.value)}
                >
                  <option value="receipt">Receipt (Inbound)</option>
                  <option value="delivery">Delivery (Outbound)</option>
                  <option value="internal">Internal Relocation</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
                  Counterparty Entity
                </label>
                <input
                  style={{ width: '100%', padding: '0.8rem', background: '#121721', border: '1px solid #1E293B', color: '#FFF', borderRadius: '10px', boxSizing: 'border-box' }}
                  value={partner}
                  onChange={e => setPartner(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
                  Source Facility
                </label>
                <select
                  style={{ width: '100%', padding: '0.8rem', background: '#121721', border: '1px solid #1E293B', color: '#FFF', borderRadius: '10px' }}
                  value={sourceId}
                  onChange={e => setSourceId(e.target.value)}
                >
                  {locations.map(l => (
                    <option key={l.id} value={l.id}>{l.location_name} ({l.type})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
                  Destination Facility
                </label>
                <select
                  style={{ width: '100%', padding: '0.8rem', background: '#121721', border: '1px solid #1E293B', color: '#FFF', borderRadius: '10px' }}
                  value={destId}
                  onChange={e => setDestId(e.target.value)}
                >
                  {locations.map(l => (
                    <option key={l.id} value={l.id}>{l.location_name} ({l.type})</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
                  Assigned SKU
                </label>
                <select
                  style={{ width: '100%', padding: '0.8rem', background: '#121721', border: '1px solid #1E293B', color: '#FFF', borderRadius: '10px' }}
                  value={selectedProduct}
                  onChange={e => setSelectedProduct(e.target.value)}
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} [{p.sku}]</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
                  Transfer Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  style={{ width: '100%', padding: '0.8rem', background: '#121721', border: '1px solid #1E293B', color: '#FFF', borderRadius: '10px', boxSizing: 'border-box' }}
                  value={qty}
                  onChange={e => setQty(Number(e.target.value))}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '1rem',
                padding: '1rem',
                background: '#D4FF00',
                color: '#05070A',
                fontFamily: '"Syne", sans-serif',
                fontWeight: 900,
                fontSize: '0.9rem',
                letterSpacing: '0.05em',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              <Send size={16} />
              {loading ? 'COMMITTING MANIFEST...' : 'DISPATCH DRAFT MANIFEST'}
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: LEDGER MANIFESTS */}
      {activeTab === 'ledger' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
            <h2 style={{ margin: 0, fontFamily: '"Syne", sans-serif', fontSize: '1.2rem', fontWeight: 800 }}>
              OPERATION PIPELINE
            </h2>
            <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Real-time state machine</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {operations.map(op => {
              const isDone = op.status === 'done';
              return (
                <div
                  key={op.id}
                  style={{
                    background: '#0B0F15',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '14px',
                    padding: '1.2rem 1.4rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <strong style={{ fontSize: '1rem', fontFamily: '"Syne", sans-serif', color: '#FFFFFF' }}>
                        {op.reference_no}
                      </strong>
                      <span style={{
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        background: isDone ? 'rgba(74, 222, 128, 0.12)' : 'rgba(212, 255, 0, 0.12)',
                        color: isDone ? '#4ADE80' : '#D4FF00',
                        textTransform: 'uppercase'
                      }}>
                        {op.status}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.35rem' }}>
                      {op.type.toUpperCase()} • Entity: <span style={{ color: '#CBD5E1' }}>{op.partner_name || 'Terminal'}</span>
                    </div>
                  </div>

                  {!isDone && (
                    <button
                      onClick={() => handleValidate(op.id)}
                      disabled={loading}
                      style={{
                        background: '#D4FF00',
                        color: '#05070A',
                        border: 'none',
                        padding: '0.6rem 1.1rem',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                      }}
                    >
                      <CheckCircle2 size={14} /> VALIDATE
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}