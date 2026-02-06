import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { parse, isValid, format } from 'date-fns';

interface DateInputProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
}

export const DateInput: React.FC<DateInputProps> = ({
  value,
  onChange,
  placeholder = "DD/MM/YYYY",
  className = "",
  minDate,
  maxDate,
  disabled = false
}) => {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Sync input value with external value
  useEffect(() => {
    if (value && isValid(value)) {
      setInputValue(format(value, 'dd/MM/yyyy'));
      setError(null);
    } else if (!value) {
      setInputValue('');
      setError(null);
    }
  }, [value]);

  const formatInput = (input: string): string => {
    // Chỉ cho phép số và /
    let value = input.replace(/[^\d/]/g, '');
  
    // Nếu user đã gõ / thì thôi, đừng auto format nữa
    if (value.includes('/')) {
      return value.slice(0, 10);
    }
  
    // Auto format khi chỉ có số
    if (value.length <= 2) {
      return value;
    } else if (value.length <= 4) {
      return `${value.slice(0, 2)}/${value.slice(2)}`;
    } else {
      return `${value.slice(0, 2)}/${value.slice(2, 4)}/${value.slice(4, 8)}`;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formatted = formatInput(rawValue);
    setInputValue(formatted);

    // Only validate and update if we have a complete date (DD/MM/YYYY = 10 chars)
    if (formatted.length === 10) {
      const parsedDate = parse(formatted, 'dd/MM/yyyy', new Date());
      
      if (!isValid(parsedDate)) {
        setError('Ngày không hợp lệ');
        onChange(undefined);
        return;
      }

      // Check min/max date constraints
      if (minDate && parsedDate < minDate) {
        setError('Ngày quá xa trong quá khứ');
        onChange(undefined);
        return;
      }

      if (maxDate && parsedDate > maxDate) {
        setError('Ngày trong tương lai không hợp lệ');
        onChange(undefined);
        return;
      }

      setError(null);
      onChange(parsedDate);
    } else if (formatted.length > 0 && formatted.length < 10) {
      // Partial input - clear the date but don't show error yet
      onChange(undefined);
      setError(null);
    } else {
      onChange(undefined);
      setError(null);
    }
  };

  const handleBlur = () => {
    // Validate on blur if there's partial input
    if (inputValue.length > 0 && inputValue.length < 10) {
      setError('Vui lòng nhập đủ DD/MM/YYYY');
    }
  };

  return (
    <div className="w-full">
      <Input
        type="text"
        value={inputValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={`${className} ${error ? 'border-destructive' : ''}`}
        maxLength={10}
        disabled={disabled}
      />
      {error && (
        <p className="text-xs text-destructive mt-1">{error}</p>
      )}
    </div>
  );
};
