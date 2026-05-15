/** Shared primitive components used across all admin pages */

/* ── Stat Card ─────────────────────────────────────────────────── */
export function StatCard({ label, value, sub, accent, icon }) {
    return (
        <div className="bg-surface border border-white/[0.06] rounded-xl p-5 flex flex-col gap-2 animate-fade-up">
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted">{label}</span>
                {icon && <span className="text-xl opacity-60">{icon}</span>}
            </div>
            <span
                className="text-2xl font-bold"
                style={{ color: accent || '#eeeef2' }}
            >
                {value}
            </span>
            {sub && <span className="text-xs text-muted">{sub}</span>}
        </div>
    );
}

/* ── Section Header ─────────────────────────────────────────────── */
export function SectionHeader({ title, subtitle, action }) {
    return (
        <div className="flex items-start justify-between gap-4 mb-5">
            <div>
                <h2 className="text-lg font-bold text-white">{title}</h2>
                {subtitle && <p className="text-sm text-muted mt-0.5">{subtitle}</p>}
            </div>
            {action}
        </div>
    );
}

/* ── Badge ────────────────────────────────────────────────────────── */
const BADGE_VARIANTS = {
    success: 'bg-success/10 text-success border-success/20',
    danger: 'bg-danger/10 text-danger border-danger/20',
    info: 'bg-info/10 text-info border-info/20',
    gold: 'bg-gold/10 text-gold border-gold/20',
    muted: 'bg-white/5 text-muted border-white/10',
    warning: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
};

export function Badge({ children, variant = 'muted' }) {
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${BADGE_VARIANTS[variant] || BADGE_VARIANTS.muted}`}>
            {children}
        </span>
    );
}

/* ── Card ─────────────────────────────────────────────────────────── */
export function Card({ children, className = '' }) {
    return (
        <div className={`bg-surface border border-white/[0.06] rounded-xl ${className}`}>
            {children}
        </div>
    );
}

/* ── Table ─────────────────────────────────────────────────────────── */
export function Table({ headers, children, empty = 'No data yet.' }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-white/[0.06]">
                        {headers.map(h => (
                            <th key={h} className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-widest text-muted">
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {children || (
                        <tr>
                            <td colSpan={headers.length} className="py-10 text-center text-muted text-xs">
                                {empty}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

export function TR({ children, onClick }) {
    return (
        <tr
            onClick={onClick}
            className={`border-b border-white/[0.04] last:border-0 transition-colors duration-150 ${onClick ? 'cursor-pointer hover:bg-surface-hi' : ''}`}
        >
            {children}
        </tr>
    );
}

export function TD({ children, className = '' }) {
    return (
        <td className={`py-3 px-4 text-white/80 ${className}`}>
            {children}
        </td>
    );
}

/* ── Loading skeleton ─────────────────────────────────────────────── */
export function Skeleton({ className = 'h-4 w-full' }) {
    return (
        <div className={`bg-surface-hi rounded animate-pulse ${className}`} />
    );
}

/* ── Mock data indicator ─────────────────────────────────────────── */
export function MockBadge() {
    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block" />
            Mock data
        </span>
    );
}

/* ── Icon dot indicators ──────────────────────────────────────────── */
export function StatusDot({ status }) {
    const colors = {
        operational: 'bg-success',
        degraded: 'bg-yellow-400',
        down: 'bg-danger',
        processing: 'bg-info',
        completed: 'bg-success',
        failed: 'bg-danger',
        pending: 'bg-muted',
    };
    return (
        <span className={`w-2 h-2 rounded-full inline-block ${colors[status] || 'bg-muted'}`} />
    );
}

/* ── Modal ──────────────────────────────────────────────────────── */
export function Modal({ open, onClose, title, children }) {
    if (!open) return null;
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.72)' }}
            onClick={onClose}
        >
            <div
                className="bg-surface border border-white/[0.08] rounded-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto animate-fade-up"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
                    <h3 className="font-bold text-white">{title}</h3>
                    <button
                        onClick={onClose}
                        className="text-muted hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-hi"
                    >
                        ✕
                    </button>
                </div>
                <div className="p-5">{children}</div>
            </div>
        </div>
    );
}
