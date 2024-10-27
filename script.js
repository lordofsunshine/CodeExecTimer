const codeInput = document.getElementById('code');
const languageSelect = document.getElementById('language');
const runButton = document.getElementById('run');
const results = document.getElementById('results');
const executionTimeDisplay = document.getElementById('executionTime');
const historyList = document.getElementById('historyList');
const outputDisplay = document.getElementById('output');
let chart;

runButton.addEventListener('click', runCode);

async function runCode() {
    const code = codeInput.value;
    const language = languageSelect.value;

    if (!code.trim()) {
        alert('Пожалуйста, введите код для выполнения.');
        return;
    }

    runButton.disabled = true;
    runButton.innerHTML = 'Выполнение <div class="loading"></div>';
    outputDisplay.textContent = 'Выполнение кода...';

    const startTime = performance.now();

    try {
        const response = await fetch('https://emkc.org/api/v2/piston/execute', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                language: language,
                version: '*',
                files: [
                    {
                        content: code
                    }
                ]
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ошибка! Статус: ${response.status}`);
        }

        const result = await response.json();
        const endTime = performance.now();
        const executionTime = endTime - startTime;

        if (result.run) {
            outputDisplay.textContent = result.run.output || 'Код выполнен без вывода';
        } else {
            outputDisplay.textContent = 'Ошибка: Неожиданный формат ответа от сервера';
        }

        displayResults(executionTime);
        updateChart(executionTime);
        addToHistory(languageSelect.options[languageSelect.selectedIndex].text, code, executionTime);
    } catch (error) {
        console.error('Error:', error);
        outputDisplay.textContent = `Произошла ошибка при выполнении кода: ${error.message}`;
    } finally {
        runButton.disabled = false;
        runButton.textContent = 'Выполнить';
    }
}

function displayResults(executionTime) {
    executionTimeDisplay.textContent = `Время выполнения: ${executionTime.toFixed(2)} мс`;
    results.classList.add('show');
}

function updateChart(newTime) {
    if (chart) {
        chart.data.labels.push(chart.data.labels.length + 1);
        chart.data.datasets[0].data.push(newTime);
        chart.update();
    } else {
        const ctx = document.getElementById('chart').getContext('2d');
        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['1'],
                datasets: [{
                    label: 'Время выполнения (мс)',
                    data: [newTime],
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
}

function addToHistory(language, code, time) {
    const listItem = document.createElement('li');
    listItem.innerHTML = `
        <span class="language">${escapeHtml(language)}</span>
        <span class="code">${escapeHtml(code.substring(0, 30))}${code.length > 30 ? '...' : ''}</span>
        <span class="time">${time.toFixed(2)} мс</span>
    `;
    historyList.prepend(listItem);

    if (historyList.children.length > 10) {
        historyList.removeChild(historyList.lastChild);
    }
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

codeInput.addEventListener('input', function(e) {
    e.target.value = e.target.value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
});

let lastRequestTime = 0;
const COOLDOWN = 2000;

runButton.addEventListener('click', function(e) {
    const now = Date.now();
    if (now - lastRequestTime < COOLDOWN) {
        e.preventDefault();
        alert('Пожалуйста, подождите несколько секунд перед следующим запросом.');
    } else {
        lastRequestTime = now;
    }
});