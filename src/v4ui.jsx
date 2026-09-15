import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Dialog } from './features';
import { money } from './domain';
export const centsMoney = cents => money(cents / 100);
export function Field({ label, value, onChange, options, multiline, ...props }) {
  return <label className="v4-field"><span>{label}</span>{options
    ? <select aria-label={label} value={value ?? ''} onChange={e => onChange(e.target.value)} {...props}>{options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}</select>
    : multiline ? <textarea aria-label={label} value={value ?? ''} onChange={e => onChange(e.target.value)} rows={3} maxLength={2000} {...props} />
    : <input aria-label={label} value={value ?? ''} onChange={e => onChange(e.target.value)} maxLength={200} {...props} />}</label>;
}
export function RecordActions({ label, onEdit, onDelete }) { return <div className="record-actions"><button className="more" aria-label={`Edit ${label}`} onClick={onEdit}><Pencil size={16}/></button><button className="more" aria-label={`Delete ${label}`} onClick={onDelete}><Trash2 size={16}/></button></div>; }
export function Metrics({ items }) { return <div className="v4-metrics">{items.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>; }
export function DeleteDialog({ label, description, onClose, onDelete }) { return <Dialog title={`Delete ${label}?`} submitLabel="Delete" onClose={onClose} onSubmit={e => { e.preventDefault(); onDelete(); }}><p className="muted v4-copy">{description || 'This record will be removed. Other records will not be deleted.'}</p></Dialog>; }
