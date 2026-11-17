const STORAGE_KEY = 'fde-self-assessment-v1';

const categories = [
  {
    name: 'Customer Discovery',
    shortName: 'Discovery',
    description: 'Turn ambiguous customer problems into a sharp, testable brief.',
    color: '#d8f36a',
    recommendation: 'Practice structured discovery: interview for outcomes, constraints, users, and evidence before discussing solutions.',
    questions: [
      'Can you run a discovery conversation that uncovers the customer’s real business outcome?',
      'Can you distinguish a symptom, a request, and an underlying problem?',
      'Can you map stakeholders, decision makers, users, and operational constraints?',
      'Can you turn ambiguous input into a concise problem statement with success criteria?'
    ]
  },
  {
    name: 'Technical Delivery',
    shortName: 'Delivery',
    description: 'Build, integrate, debug, and ship useful solutions in the field.',
    color: '#75b9ff',
    recommendation: 'Build a small end-to-end integration with realistic failure modes, observability, tests, and a clear handover.',
    questions: [
      'Can you rapidly prototype a production-shaped solution, not just a demo?',
      'Can you work confidently with APIs, authentication, webhooks, and data formats?',
      'Can you debug an unfamiliar system methodically under customer time pressure?',
      'Can you ship an incremental solution with tests, documentation, and rollback options?'
    ]
  },
  {
    name: 'AI & Data Fluency',
    shortName: 'AI + Data',
    description: 'Apply AI capabilities responsibly and make data useful for decisions.',
    color: '#c3a2ff',
    recommendation: 'Create an evaluation set and compare prompts, retrieval, tools, and models against measurable customer outcomes.',
    questions: [
      'Can you explain model capabilities, limitations, latency, cost, and failure modes?',
      'Can you design a reliable prompt, tool-use, or retrieval-augmented workflow?',
      'Can you prepare, query, and validate the data needed for an AI use case?',
      'Can you define an evaluation approach for quality, safety, and regression testing?'
    ]
  },
  {
    name: 'Product Thinking',
    shortName: 'Product',
    description: 'Prioritize the smallest valuable solution and learn from usage.',
    color: '#ff9d6c',
    recommendation: 'Write a one-page product brief for a customer problem: user, job, non-goals, MVP, metric, and learning loop.',
    questions: [
      'Can you identify the smallest solution that proves or disproves the key assumption?',
      'Can you prioritize trade-offs using customer value, effort, risk, and reversibility?',
      'Can you define an adoption or outcome metric that reflects real value?',
      'Can you turn field learnings into actionable product feedback and roadmap input?'
    ]
  },
  {
    name: 'Communication',
    shortName: 'Communication',
    description: 'Create clarity across technical and non-technical audiences.',
    color: '#f4d35e',
    recommendation: 'Practice writing decision memos: context, options, recommendation, risks, owner, and next step in one page.',
    questions: [
      'Can you explain a complex technical concept in language a customer can use?',
      'Can you set expectations clearly when scope, timing, or feasibility changes?',
      'Can you facilitate a meeting toward a decision rather than only sharing information?',
      'Can you write concise updates that make progress, risks, and asks unambiguous?'
    ]
  },
  {
    name: 'Execution & Operations',
    shortName: 'Execution',
    description: 'Create momentum while managing risk, scope, and dependencies.',
    color: '#7ee0c4',
    recommendation: 'Use a lightweight delivery cadence with explicit owners, risks, decision logs, and weekly outcome reviews.',
    questions: [
      'Can you break a complex engagement into milestones with clear exit criteria?',
      'Can you manage parallel stakeholders, dependencies, and changing priorities?',
      'Can you identify delivery risks early and create practical mitigations?',
      'Can you move forward with imperfect information while keeping decisions reversible?'
    ]
  },
  {
    name: 'Trust & Safety',
    shortName: 'Trust + Safety',
    description: 'Make solutions secure, responsible, and fit for the customer context.',
    color: '#ef8fbd',
    recommendation: 'Threat-model your next AI workflow: data access, prompt injection, privacy, abuse, monitoring, and human fallback.',
    questions: [
      'Can you identify sensitive data, access boundaries, and security requirements?',
      'Can you explain relevant AI risks and design mitigations with the customer?',
      'Can you account for privacy, governance, auditability, and human oversight?',
      'Can you define safe failure behavior, monitoring, and an escalation path?'
    ]
  },
  {
    name: 'Commercial & Domain Acumen',
    shortName: 'Commercial',
    description: 'Connect technical work to the customer’s business and operating model.',
    color: '#9cb8ff',
    recommendation: 'Learn the customer’s value chain and economics well enough to connect every technical milestone to a business result.',
    questions: [
      'Can you understand the customer’s operating model, economics, and source of value?',
      'Can you connect technical choices to ROI, adoption, risk, or time-to-value?',
      'Can you recognize expansion opportunities without compromising customer trust?',
      'Can you leave the customer with a sustainable operating model, not dependency?'
    ]
  }
];

const allQuestions = categories.flatMap((category, categoryIndex) =>
  category.questions.map((text, questionIndex) => ({
    id: `q${categoryIndex + 1}-${questionIndex + 1}`,
    categoryIndex,
    text
  }))
);

let answers = {};
let radarChart;
let toastTimer;

const $ = (selector) => document.querySelector(selector);

function loadAnswers() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    answers = saved && typeof saved === 'object' ? saved : {};
  } catch {
    answers = {};
  }
}

function saveAnswers() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
  $('#saveStatus').textContent = 'Saved just now';
  window.clearTimeout(saveAnswers.statusTimer);
  saveAnswers.statusTimer = window.setTimeout(() => {
    $('#saveStatus').textContent = 'Saved locally';
  }, 1800);
}

function renderQuestionnaire() {
  $('#questionnaire').innerHTML = categories.map((category, categoryIndex) => `
    <section class="category-block">
      <div class="category-header">
        <span class="category-index">${String(categoryIndex + 1).padStart(2, '0')}</span>
        <div>
          <h3>${category.name}</h3>
          <p class="category-description">${category.description}</p>
        </div>
        <span class="category-score" id="category-score-${categoryIndex}">— / 5</span>
      </div>
      ${category.questions.map((question, questionIndex) => {
        const id = `q${categoryIndex + 1}-${questionIndex + 1}`;
        return `
          <div class="question">
            <p class="question-text"><span class="question-id">${String(questionIndex + 1).padStart(2, '0')}</span>${question}</p>
            <div class="rating" role="radiogroup" aria-label="Rating for ${question}">
              ${[1, 2, 3, 4, 5].map((value) => `
                <label class="rating-option" title="${ratingLabel(value)}">
                  <input type="radio" name="${id}" value="${value}" ${Number(answers[id]) === value ? 'checked' : ''}>
                  <span>${value}</span>
                </label>
              `).join('')}
            </div>
          </div>
        `;
      }).join('')}
    </section>
  `).join('');

  $('#questionnaire').addEventListener('change', (event) => {
    if (event.target.matches('input[type="radio"]')) {
      answers[event.target.name] = Number(event.target.value);
      saveAnswers();
      updateDashboard();
    }
  });
}

function ratingLabel(value) {
  return ['Exposure', 'Assisted', 'Working', 'Advanced', 'Leading'][value - 1];
}

function getScores() {
  return categories.map((category, categoryIndex) => {
    const values = category.questions.map((_, questionIndex) =>
      answers[`q${categoryIndex + 1}-${questionIndex + 1}`]
    ).filter((value) => Number.isFinite(value));
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  });
}

function formatScore(score) {
  return score ? score.toFixed(1) : '—';
}

function updateStats(scores) {
  const answered = Object.keys(answers).filter((id) => allQuestions.some((question) => question.id === id)).length;
  const overall = answered ? scores.filter(Boolean).reduce((sum, score) => sum + score, 0) / scores.filter(Boolean).length : 0;
  const scored = scores.map((score, index) => ({ score, index })).filter((item) => item.score);
  const strongest = scored.length ? [...scored].sort((a, b) => b.score - a.score)[0] : null;
  const focus = scored.length ? [...scored].sort((a, b) => a.score - b.score)[0] : null;
  const percent = Math.round((answered / allQuestions.length) * 100);

  $('#answeredCount').textContent = answered;
  $('#totalQuestions').textContent = `of ${allQuestions.length}`;
  $('#overallScore').textContent = overall ? overall.toFixed(1) : '—';
  $('#strongestCategory').textContent = strongest ? categories[strongest.index].shortName : '—';
  $('#strongestScore').textContent = strongest ? `${formatScore(strongest.score)} / 5` : 'Complete the assessment';
  $('#focusCategory').textContent = focus ? categories[focus.index].shortName : '—';
  $('#focusScore').textContent = focus ? `${formatScore(focus.score)} / 5` : 'Complete the assessment';
  $('#progressText').textContent = `${percent}% complete`;
  $('#progressBar').style.width = `${percent}%`;

  categories.forEach((_, index) => {
    $(`#category-score-${index}`).textContent = scores[index] ? `${formatScore(scores[index])} / 5` : '— / 5';
  });
}

function renderLegend(scores) {
  $('#categoryLegend').innerHTML = categories.map((category, index) => `
    <div class="legend-item">
      <span class="legend-dot" style="background:${category.color}"></span>
      <span>${category.shortName}</span>
      <span class="legend-value">${scores[index] ? formatScore(scores[index]) : '—'}</span>
    </div>
  `).join('');
}

function updateChart(scores) {
  const data = scores.map((score) => score || 0);
  if (!window.Chart) {
    $('#radarChart').replaceWith(Object.assign(document.createElement('p'), {
      className: 'chart-fallback',
      textContent: 'Chart library unavailable. Your category scores are shown below.'
    }));
    return;
  }

  if (!radarChart) {
    radarChart = new Chart($('#radarChart'), {
      type: 'radar',
      data: {
        labels: categories.map((category) => category.shortName),
        datasets: [{
          data,
          backgroundColor: 'rgba(216, 243, 106, .16)',
          borderColor: '#d8f36a',
          pointBackgroundColor: '#d8f36a',
          pointBorderColor: '#101827',
          pointHoverBackgroundColor: '#fff',
          pointRadius: 3,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            min: 0,
            max: 5,
            ticks: { display: false, stepSize: 1 },
            grid: { color: 'rgba(180, 194, 214, .2)' },
            angleLines: { color: 'rgba(180, 194, 214, .2)' },
            pointLabels: { color: '#b3bdcc', font: { family: 'DM Mono', size: 9 } }
          }
        },
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => ` ${context.raw.toFixed(1)} / 5` } } }
      }
    });
  } else {
    radarChart.data.datasets[0].data = data;
    radarChart.update();
  }
}

function renderRecommendations(scores) {
  const scored = scores.map((score, index) => ({ score, index }))
    .sort((a, b) => (a.score || 0) - (b.score || 0));
  const recommendations = scored.slice(0, 3);
  $('#recommendations').innerHTML = recommendations.map(({ score, index }, rank) => {
    const category = categories[index];
    const title = score ? (score < 2.5 ? 'Build the foundation' : score < 3.5 ? 'Strengthen through reps' : 'Sharpen the edge') : 'Start with a baseline';
    return `
      <article class="recommendation">
        <span class="rec-meta">Priority ${String(rank + 1).padStart(2, '0')} · ${score ? `${formatScore(score)} / 5` : 'Not rated'}</span>
        <h3>${category.name}</h3>
        <p><strong>${title}.</strong> ${category.recommendation}</p>
      </article>
    `;
  }).join('');
}

function updateDashboard() {
  const scores = getScores();
  updateStats(scores);
  renderLegend(scores);
  updateChart(scores);
  renderRecommendations(scores);
}

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('visible'), 2400);
}

function exportAnswers() {
  const payload = {
    app: 'FDE Self-Assessment',
    version: 1,
    exportedAt: new Date().toISOString(),
    answers
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'fde-self-assessment.json';
  link.click();
  URL.revokeObjectURL(url);
  showToast('Assessment exported');
}

function importAnswers(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      const candidate = imported.answers || imported;
      const validAnswers = {};
      allQuestions.forEach((question) => {
        if (candidate && Number(candidate[question.id]) >= 1 && Number(candidate[question.id]) <= 5) {
          validAnswers[question.id] = Number(candidate[question.id]);
        }
      });
      answers = validAnswers;
      saveAnswers();
      renderQuestionnaire();
      updateDashboard();
      showToast('Assessment imported');
    } catch {
      showToast('Could not read that file');
    }
    event.target.value = '';
  };
  reader.readAsText(file);
}

function resetAssessment() {
  if (!Object.keys(answers).length || window.confirm('Reset all assessment answers?')) {
    answers = {};
    localStorage.removeItem(STORAGE_KEY);
    renderQuestionnaire();
    updateDashboard();
    showToast('Assessment reset');
  }
}

function init() {
  loadAnswers();
  renderQuestionnaire();
  updateDashboard();
  $('#exportBtn').addEventListener('click', exportAnswers);
  $('#importInput').addEventListener('change', importAnswers);
  $('#resetBtn').addEventListener('click', resetAssessment);
}

init();
