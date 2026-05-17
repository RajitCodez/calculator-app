const state = {
    expression: '0',
    isAnimating: false,
    justCalculated: false,
    historyOpen: false,
    history: JSON.parse(localStorage.getItem('calcHistory')) || []
};

const DOM = {
    expDisplay: document.getElementById('expression'),
    previewDisplay: document.getElementById('result-preview'),
    container: document.getElementById('display-container'),
    historyPanel: document.getElementById('history-panel'),
    historyList: document.getElementById('history-list'),
    historyToggleBtn: document.getElementById('history-toggle'),
    keypad: document.getElementById('keypad'),
    clearHistoryBtn: document.getElementById('clear-history')
};


const cleanExpression = (expr) => expr.replace(/[+\-×÷.]$/, '');
        
const evaluateMath = (expr) => {
    try {
        const jsExpr = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/%/g, '/100');
        const result = new Function(`return ${jsExpr}`)();
        return isNaN(result) || result === undefined ? 'indeterminate' : 
               Number.isInteger(result) ? result : parseFloat(result.toFixed(8));
    } catch { return ''; }
};

const updateDisplay = () => {
    DOM.expDisplay.innerHTML = state.expression
        .replace(/([+\-×÷])/g, '<span class="op">$1</span>') || '0';
            
    const evalStr = cleanExpression(state.expression);
    if (/[+\-×÷]/.test(evalStr)) {
        DOM.previewDisplay.innerText = evaluateMath(evalStr);
    } else {
        DOM.previewDisplay.innerText = '';
    }
};

const actions = {
    appendNumber: (num) => {
        if (state.justCalculated) {
            state.expression = num === '.' ? '0.' : num;
            state.justCalculated = false;
        } else if (state.expression === '0' && num !== '.') {
            state.expression = num;
        } else {
            state.expression += num;
        }
    },
    appendOperator: (op) => {
        state.justCalculated = false;
        state.expression = cleanExpression(state.expression) + op;
    },
    clear: () => {
        state.expression = '0';
        state.justCalculated = false;
    },
    delete: () => {
        state.justCalculated = false;
        state.expression = state.expression.length > 1 ? state.expression.slice(0, -1) : '0';
    },
    sign: () => {
        state.justCalculated = false;
        const result = evaluateMath(cleanExpression(state.expression));
        if (result !== '') state.expression = String(result * -1);
    },
    calculate: () => {
        if (DOM.previewDisplay.innerText === '') return;
                
        state.isAnimating = true;
        const resultStr = DOM.previewDisplay.innerText;
        const originalExpr = cleanExpression(state.expression);

        DOM.container.classList.add('animating');
                
        setTimeout(() => {
            DOM.expDisplay.style.transition = DOM.previewDisplay.style.transition = 'none';
                    
            state.expression = resultStr;
            state.justCalculated = true;
                    
            updateDisplay();
            historyManager.save(originalExpr, resultStr);
            DOM.container.classList.remove('animating');
                    
            setTimeout(() => {
                DOM.expDisplay.style.transition = DOM.previewDisplay.style.transition = '';
                state.isAnimating = false;
            }, 20);
        }, 400);
    }
};

const historyManager = {
    toggle: () => {
        state.historyOpen = !state.historyOpen;
        DOM.historyPanel.classList.toggle('open', state.historyOpen);
        DOM.historyToggleBtn.classList.toggle('active', state.historyOpen);
        if (state.historyOpen) historyManager.render();
    },
    save: (expr, res) => {
        const date = new Date();
        const dateStr = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
                
        state.history.unshift({ expr, res, date: dateStr });
        localStorage.setItem('calcHistory', JSON.stringify(state.history));
    },
    render: () => {
        if (!state.history.length) {
            DOM.historyList.innerHTML = '<div style="color: var(--text-muted); text-align: center; margin-top: 20px;">No history yet</div>';
            return;
        }

        DOM.historyList.innerHTML = '';
        let currentDate = null;
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '.');

        state.history.forEach(({ expr, res, date }) => {
            if (date !== currentDate) {
                currentDate = date;
                DOM.historyList.insertAdjacentHTML('beforeend', 
                    `<div class="history-date">${date === today ? 'Today' : date}</div>`
                );
            }

            const item = document.createElement('div');
            item.className = 'history-item';
            item.innerHTML = `<div class="hist-expr">${expr}</div><div class="hist-res">=${res}</div>`;
            item.onclick = () => {
                state.expression = String(res);
                state.justCalculated = true;
                historyManager.toggle();
                updateDisplay();
            };
            DOM.historyList.appendChild(item);
        });
    },
    clear: () => {
        state.history = [];
        localStorage.removeItem('calcHistory');
        historyManager.render();
    }
};


DOM.keypad.addEventListener('click', (e) => {
    if (state.isAnimating) return;
    if (state.historyOpen) historyManager.toggle();

    const btn = e.target.closest('.btn');
    if (!btn) return;

    if (btn.dataset.number) actions.appendNumber(btn.dataset.number);
    if (btn.dataset.operator) actions.appendOperator(btn.dataset.operator);
    if (btn.dataset.action && actions[btn.dataset.action]) actions[btn.dataset.action]();

    if (btn.dataset.action !== 'calculate') updateDisplay();
});

DOM.historyToggleBtn.addEventListener('click', historyManager.toggle);
DOM.clearHistoryBtn.addEventListener('click', historyManager.clear);



const keyboardMap = {
    '0': '[data-number="0"]', '1': '[data-number="1"]', '2': '[data-number="2"]',
    '3': '[data-number="3"]', '4': '[data-number="4"]', '5': '[data-number="5"]',
    '6': '[data-number="6"]', '7': '[data-number="7"]', '8': '[data-number="8"]',
    '9': '[data-number="9"]', '.': '[data-number="."]', '%': '[data-number="%"]',
    '+': '[data-operator="+"]', '-': '[data-operator="-"]',
    '*': '[data-operator="×"]', 'x': '[data-operator="×"]', 'X': '[data-operator="×"]',
    '/': '[data-operator="÷"]',
    'Enter': '[data-action="calculate"]', '=': '[data-action="calculate"]',
    'Backspace': '[data-action="delete"]',
    'Escape': '[data-action="clear"]', 'Delete': '[data-action="clear"]'
};

document.addEventListener('keydown', (e) => {
    if (state.historyOpen) {
        if (e.key === 'Escape') historyManager.toggle();
        return;
    }

    const selector = keyboardMap[e.key];
    if (selector) {
        e.preventDefault();
        const btn = document.querySelector(selector);
        
        if (btn) {
            btn.style.transform = 'scale(0.92)';
            btn.style.filter = 'brightness(0.9)';
            setTimeout(() => {
                btn.style.transform = '';
                btn.style.filter = '';
            }, 100);

            btn.click();
        }
    }
});

updateDisplay();