
"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';
import { History, X } from 'lucide-react';
import { Separator } from './ui/separator';

type CalculatorDialogProps = {
  isOpen: boolean;
  onClose: () => void;
};

const CalculatorButton = ({
  onClick,
  children,
  className = '',
  variant = 'secondary',
}: {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link';
}) => (
  <Button
    onClick={onClick}
    variant={variant}
    className={cn(
      'text-2xl h-16 w-16 rounded-full shadow-md active:shadow-inner transition-shadow',
      'flex items-center justify-center',
      className
    )}
  >
    {children}
  </Button>
);

export function CalculatorDialog({ isOpen, onClose }: CalculatorDialogProps) {
  const [displayValue, setDisplayValue] = useState('0');
  const [firstOperand, setFirstOperand] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForSecondOperand, setWaitingForSecondOperand] = useState(false);
  const [memory, setMemory] = useState<number>(0);
  const [history, setHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event.key) return;
      if (/[0-9]/.test(event.key)) {
        inputDigit(event.key);
      } else if (event.key === '.') {
        inputDot();
      } else if (event.key === 'Backspace') {
        // Not a standard calculator feature, but good for UX
        setDisplayValue(displayValue.slice(0, -1) || '0');
      } else if (event.key === 'Enter' || event.key === '=') {
        event.preventDefault();
        performOperation();
      } else if (/[+\-*/]/.test(event.key)) {
        handleOperator(event.key === '*' ? '×' : event.key === '/' ? '÷' : event.key);
      } else if (event.key.toLowerCase() === 'c') {
        clearCalculator();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [displayValue, operator, firstOperand, waitingForSecondOperand]);

  const inputDigit = (digit: string) => {
    if (waitingForSecondOperand) {
      setDisplayValue(digit);
      setWaitingForSecondOperand(false);
    } else {
      setDisplayValue(displayValue === '0' ? digit : displayValue + digit);
    }
  };

  const inputDot = () => {
    if (waitingForSecondOperand) {
      setDisplayValue('0.');
      setWaitingForSecondOperand(false);
    } else if (!displayValue.includes('.')) {
      setDisplayValue(displayValue + '.');
    }
  };

  const clearCalculator = () => {
    setDisplayValue('0');
    setFirstOperand(null);
    setOperator(null);
    setWaitingForSecondOperand(false);
  };
  
  const clearAll = () => {
    clearCalculator();
    setHistory([]);
  }

  const toggleSign = () => {
    setDisplayValue(String(parseFloat(displayValue) * -1));
  };

  const inputPercent = () => {
    const currentValue = parseFloat(displayValue);
    if (currentValue === 0) return;
    const fixedValue = currentValue / 100;
    setDisplayValue(String(fixedValue));
  };

  const handleOperator = (nextOperator: string) => {
    const inputValue = parseFloat(displayValue);

    if (operator && waitingForSecondOperand) {
      setOperator(nextOperator);
      return;
    }

    if (firstOperand === null) {
      setFirstOperand(inputValue);
    } else if (operator) {
      const result = calculate(firstOperand, inputValue, operator);
      const resultString = `${firstOperand} ${operator} ${inputValue} = ${result}`;
      setHistory([resultString, ...history]);
      setDisplayValue(String(result));
      setFirstOperand(result);
    }

    setWaitingForSecondOperand(true);
    setOperator(nextOperator);
  };
  
  const performOperation = () => {
    if (operator && firstOperand !== null) {
      const inputValue = parseFloat(displayValue);
      const result = calculate(firstOperand, inputValue, operator);
      const resultString = `${firstOperand} ${operator} ${inputValue} = ${result}`;
      setHistory([resultString, ...history]);
      
      setDisplayValue(String(result));
      setFirstOperand(null);
      setOperator(null);
      setWaitingForSecondOperand(false);
    }
  };

  const calculate = (first: number, second: number, op: string): number => {
    switch (op) {
      case '+': return first + second;
      case '-': return first - second;
      case '×': return first * second;
      case '÷': return first / second;
      default: return second;
    }
  };

  const handleMemory = (memOp: 'MC' | 'MR' | 'M+' | 'M-') => {
    const currentValue = parseFloat(displayValue);
    switch (memOp) {
      case 'MC': setMemory(0); break;
      case 'MR': setDisplayValue(String(memory)); break;
      case 'M+': setMemory(memory + currentValue); break;
      case 'M-': setMemory(memory - currentValue); break;
    }
  };
  
  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn("sm:max-w-md p-0", showHistory && "sm:max-w-[550px]")} onInteractOutside={(e) => e.preventDefault()}>
        <div className='flex'>
          <div className="p-4 space-y-4">
            <DialogHeader className="px-2">
              <DialogTitle>Calculator</DialogTitle>
              <DialogDescription>A simple calculator for your convenience.</DialogDescription>
            </DialogHeader>
            <div className="bg-muted text-right p-4 rounded-lg break-all">
                <div className="text-4xl font-mono text-foreground">{displayValue}</div>
                <div className="text-muted-foreground text-sm h-5">
                    {operator && firstOperand !== null ? `${firstOperand} ${operator}` : ''}
                </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <CalculatorButton onClick={() => handleMemory('MC')}>MC</CalculatorButton>
              <CalculatorButton onClick={() => handleMemory('MR')}>MR</CalculatorButton>
              <CalculatorButton onClick={() => handleMemory('M-')}>M-</CalculatorButton>
              <CalculatorButton onClick={() => handleMemory('M+')} variant="default">M+</CalculatorButton>

              <CalculatorButton onClick={clearCalculator}>{displayValue === '0' && firstOperand === null ? 'AC' : 'C'}</CalculatorButton>
              <CalculatorButton onClick={toggleSign}>+/-</CalculatorButton>
              <CalculatorButton onClick={inputPercent}>%</CalculatorButton>
              <CalculatorButton onClick={() => handleOperator('÷')} variant="default">÷</CalculatorButton>

              <CalculatorButton onClick={() => inputDigit('7')}>7</CalculatorButton>
              <CalculatorButton onClick={() => inputDigit('8')}>8</CalculatorButton>
              <CalculatorButton onClick={() => inputDigit('9')}>9</CalculatorButton>
              <CalculatorButton onClick={() => handleOperator('×')} variant="default">×</CalculatorButton>

              <CalculatorButton onClick={() => inputDigit('4')}>4</CalculatorButton>
              <CalculatorButton onClick={() => inputDigit('5')}>5</CalculatorButton>
              <CalculatorButton onClick={() => inputDigit('6')}>6</CalculatorButton>
              <CalculatorButton onClick={() => handleOperator('-')} variant="default">-</CalculatorButton>

              <CalculatorButton onClick={() => inputDigit('1')}>1</CalculatorButton>
              <CalculatorButton onClick={() => inputDigit('2')}>2</CalculatorButton>
              <CalculatorButton onClick={() => inputDigit('3')}>3</CalculatorButton>
              <CalculatorButton onClick={() => handleOperator('+')} variant="default">+</CalculatorButton>
              
              <CalculatorButton onClick={() => setShowHistory(!showHistory)}><History className="h-6 w-6"/></CalculatorButton>
              <CalculatorButton onClick={() => inputDigit('0')}>0</CalculatorButton>
              <CalculatorButton onClick={inputDot}>.</CalculatorButton>
              <CalculatorButton onClick={performOperation} variant="default">=</CalculatorButton>
            </div>
          </div>
          {showHistory && (
              <div className="w-64 border-l bg-secondary/30 p-4 flex flex-col">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold">History</h3>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowHistory(false)}>
                        <X className="h-4 w-4"/>
                    </Button>
                  </div>
                  <Separator />
                  <ScrollArea className="flex-1 mt-4">
                      {history.length > 0 ? (
                          <div className="space-y-2 text-sm text-muted-foreground">
                            {history.map((item, index) => (
                              <p key={index} className="break-all">{item}</p>
                            ))}
                          </div>
                      ) : (
                          <p className="text-sm text-muted-foreground italic text-center mt-4">No history yet.</p>
                      )}
                  </ScrollArea>
                   {history.length > 0 && (
                     <Button variant="destructive" size="sm" onClick={clearAll} className="mt-4">
                        Clear History
                     </Button>
                   )}
              </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
