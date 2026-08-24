import React, { useState } from 'react';

const Calculator = () => {
    const [display, setDisplay] = useState('0');
    const [prevValue, setPrevValue] = useState(null);
    const [operator, setOperator] = useState(null);
    const [waitingForOperand, setWaitingForOperand] = useState(false);

    const inputDigit = (digit) => {
        if (waitingForOperand) {
            setDisplay(String(digit));
            setWaitingForOperand(false);
        } else {
            setDisplay(display === '0' ? String(digit) : display + digit);
        }
    };

    const performOperation = (nextOperator) => {
        const inputValue = parseFloat(display);

        if (prevValue === null) {
            setPrevValue(inputValue);
        } else if (operator) {
            const currentValue = prevValue || 0;
            const newValue = calculate(currentValue, inputValue, operator);
            setPrevValue(newValue);
            setDisplay(String(newValue));
        }

        setWaitingForOperand(true);
        setOperator(nextOperator);
    };

    const calculate = (prev, next, op) => {
        switch (op) {
            case '+': return prev + next;
            case '-': return prev - next;
            case '*': return prev * next;
            case '/': return prev / next;
            default: return next;
        }
    };

    const clear = () => {
        setDisplay('0');
        setPrevValue(null);
        setOperator(null);
        setWaitingForOperand(false);
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#333' }}>
            <div style={{
                flex: 1,
                color: '#fff',
                fontSize: '48px',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'flex-end',
                padding: '10px 20px',
                fontWeight: '300'
            }}>
                {display}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', backgroundColor: '#333' }}>
                {['C', '±', '%', '/'].map(btn => (
                    <button key={btn} onClick={() => btn === 'C' ? clear() : performOperation(btn)} style={btnStyle(btn === '/')}>{btn}</button>
                ))}
                {['7', '8', '9', '*'].map(btn => (
                    <button key={btn} onClick={() => ['*'].includes(btn) ? performOperation(btn) : inputDigit(btn)} style={btnStyle(['*'].includes(btn))}>{btn}</button>
                ))}
                {['4', '5', '6', '-'].map(btn => (
                    <button key={btn} onClick={() => ['-'].includes(btn) ? performOperation(btn) : inputDigit(btn)} style={btnStyle(['-'].includes(btn))}>{btn}</button>
                ))}
                {['1', '2', '3', '+'].map(btn => (
                    <button key={btn} onClick={() => ['+'].includes(btn) ? performOperation(btn) : inputDigit(btn)} style={btnStyle(['+'].includes(btn))}>{btn}</button>
                ))}
                <button onClick={() => inputDigit(0)} style={{ ...btnStyle(false), gridColumn: 'span 2', textAlign: 'left', paddingLeft: '25px' }}>0</button>
                <button onClick={() => inputDigit('.')} style={btnStyle(false)}>.</button>
                <button onClick={() => performOperation('=')} style={btnStyle(true)}>=</button>
            </div>
        </div>
    );
};

const btnStyle = (isOperator) => ({
    border: 'none',
    backgroundColor: isOperator ? '#ff9f0a' : '#505050',
    color: '#fff',
    fontSize: '24px',
    padding: '15px 0',
    cursor: 'pointer',
    outline: 'none'
});

export default Calculator;
