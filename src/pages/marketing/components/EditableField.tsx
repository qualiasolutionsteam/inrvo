import React, { useState, useRef, useEffect } from 'react';
import { Check, X, Pencil } from 'lucide-react';
import { Attribution } from '../types';
import { AttributionBadge } from './AttributionBadge';

interface EditableFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  multiline?: boolean;
  label?: string;
  onClick?: (e: React.MouseEvent) => void;
  attribution?: Attribution;
  showAttribution?: boolean;
}

export function EditableField({
  value,
  onChange,
  placeholder = 'Click to edit...',
  className = '',
  multiline = false,
  label,
  onClick,
  attribution,
  showAttribution = false,
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setTempValue(value);
  }, [value]);

  const handleSave = () => {
    onChange(tempValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    const InputComponent = multiline ? 'textarea' : 'input';
    return (
      <div className="flex items-start gap-2">
        {label && <span className="text-sm text-slate-500 min-w-[80px]">{label}</span>}
        <div className="flex-1 flex items-start gap-2">
          <InputComponent
            ref={inputRef as any}
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className={`flex-1 bg-white border border-teal-500/50 rounded px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/50 ${multiline ? 'min-h-[100px] resize-y' : ''} ${className}`}
            placeholder={placeholder}
          />
          <button
            onClick={handleSave}
            className="p-2 text-green-500 hover:bg-green-500/10 rounded transition-colors"
          >
            <Check size={16} />
          </button>
          <button
            onClick={handleCancel}
            className="p-2 text-red-500 hover:bg-red-500/10 rounded transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  const handleClick = (e: React.MouseEvent) => {
    onClick?.(e);
    setIsEditing(true);
  };

  return (
    <div
      onClick={handleClick}
      className={`group flex items-start gap-2 cursor-pointer hover:bg-slate-100 rounded px-3 py-2 transition-colors ${className}`}
    >
      {label && <span className="text-sm text-slate-500 min-w-[80px]">{label}</span>}
      <div className="flex-1 flex flex-col gap-1">
        <span className={`${value ? 'text-slate-900' : 'text-slate-400 italic'}`}>
          {value || placeholder}
        </span>
        {showAttribution && attribution && (
          <AttributionBadge attribution={attribution} compact />
        )}
      </div>
      <Pencil size={14} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
    </div>
  );
}

interface EditableNumberProps {
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
  className?: string;
  label?: string;
}

export function EditableNumber({
  value,
  onChange,
  prefix = '',
  suffix = '',
  className = '',
  label,
}: EditableNumberProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setTempValue(value.toString());
  }, [value]);

  const handleSave = () => {
    const num = parseFloat(tempValue) || 0;
    onChange(num);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setTempValue(value.toString());
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        {label && <span className="text-sm text-slate-500">{label}</span>}
        <div className="flex items-center gap-1">
          {prefix && <span className="text-slate-500">{prefix}</span>}
          <input
            ref={inputRef}
            type="number"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className={`w-24 bg-white border border-teal-500/50 rounded px-2 py-1 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/50 ${className}`}
          />
          {suffix && <span className="text-slate-500">{suffix}</span>}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={`group flex items-center gap-2 cursor-pointer hover:bg-slate-100 rounded px-2 py-1 transition-colors ${className}`}
    >
      {label && <span className="text-sm text-slate-500">{label}</span>}
      <span className="text-slate-900 font-medium">
        {prefix}{value.toLocaleString()}{suffix}
      </span>
      <Pencil size={12} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}
