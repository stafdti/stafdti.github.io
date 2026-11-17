# FDE Self-Assessment

A standalone browser app for assessing readiness for a **Forward Deployed Engineer (FDE)** role: the hybrid role that connects customer discovery, software delivery, AI and data, product thinking, communication, operations, trust, and business outcomes.

The app turns a 1–5 questionnaire into:

- A live overall readiness score
- A capability radar / spider chart
- Category-level scores
- A prioritized three-part development plan
- Local browser persistence
- JSON export and import

No backend or account is required.

## Run the app

Open [`src/index.html`](src/index.html) directly in a browser, or serve the repository with a local static server:

```bash
python -m http.server 8000
```

Then visit:

```text
http://localhost:8000/fde-self-assessment/src/
```

The app uses Chart.js and Google Fonts from CDNs. The questionnaire itself works without a server; a local server is useful for predictable browser behavior and development.

## How to use it

1. Select one rating from **1 to 5** for every statement.
2. Read the live radar chart and category scores.
3. Review the three lowest-scoring categories in **Development plan**.
4. Export the assessment if you want to keep a snapshot or share it with a mentor.
5. Import a previous JSON snapshot to continue later.
6. Use **Reset** to clear all answers from the current browser.

Answers are automatically saved in `localStorage` under the key:

```text
fde-self-assessment-v1
```

## Rating rubric

The assessment is intentionally behavior-oriented. Rate what you can reliably do today, not what you have encountered in a course or read about.

| Rating | Level | Meaning |
| --- | --- | --- |
| 1 | Exposure | I understand the concept, but need significant support to apply it. |
| 2 | Assisted | I can complete familiar tasks with examples and review. |
| 3 | Working | I can deliver independently in a bounded, familiar context. |
| 4 | Advanced | I can adapt the approach, debug ambiguity, and coach others. |
| 5 | Leading | I can set the standard and lead high-stakes customer outcomes. |

## Assessment model

The questionnaire contains **32 questions across 8 capability categories**. Each category contains four statements. A category score is the arithmetic mean of its answered questions.

The overall readiness score is the mean of the category scores that have at least one answer. This means partial assessments still provide useful signals, while the progress indicator shows how much of the questionnaire is complete.

The three lowest-scoring categories become the recommended focus areas. For categories without answers, the app labels the recommendation **Start with a baseline**.

This is a reflection and development tool, not a hiring score or objective certification. Use the results as a conversation starter with a manager, mentor, or project team.

## Categories and skills checked

### 1. Customer Discovery

Can you turn ambiguous customer input into a clear, testable problem?

The questions check:

- Outcome-oriented discovery conversations
- Separating symptoms, requests, and root problems
- Stakeholder and constraint mapping
- Problem statements and success criteria

### 2. Technical Delivery

Can you build and ship useful solutions in a live customer context?

The questions check:

- Production-shaped prototyping
- APIs, authentication, webhooks, and data formats
- Debugging unfamiliar systems under pressure
- Testing, documentation, incremental delivery, and rollback

### 3. AI & Data Fluency

Can you apply AI capabilities realistically and evaluate whether they work?

The questions check:

- Model capabilities, limitations, cost, latency, and failure modes
- Prompting, tool use, and retrieval-augmented workflows
- Data preparation, querying, and validation
- Quality, safety, and regression evaluation

### 4. Product Thinking

Can you prioritize the smallest valuable solution and learn from usage?

The questions check:

- Identifying the smallest experiment or solution
- Value, effort, risk, and reversibility trade-offs
- Adoption and outcome metrics
- Turning field learning into product feedback

### 5. Communication

Can you create clarity across technical and non-technical audiences?

The questions check:

- Explaining technical concepts in customer language
- Managing expectations when scope or feasibility changes
- Facilitating decisions
- Writing concise updates with clear risks and asks

### 6. Execution & Operations

Can you create momentum while managing dependencies and risk?

The questions check:

- Milestones and exit criteria
- Parallel stakeholders and changing priorities
- Early risk identification and mitigation
- Reversible decisions under imperfect information

### 7. Trust & Safety

Can you make solutions secure, responsible, and appropriate to context?

The questions check:

- Sensitive data and access boundaries
- AI risks and mitigations
- Privacy, governance, auditability, and human oversight
- Safe failure, monitoring, and escalation

### 8. Commercial & Domain Acumen

Can you connect technical work to the customer’s business?

The questions check:

- Operating model, economics, and value chain
- ROI, adoption, risk, and time-to-value
- Responsible recognition of expansion opportunities
- Sustainable customer operating models and handover

## Development suggestions

Use the lowest scores to select practical next steps:

- **Below 2.5 — Build the foundation:** study the concepts, shadow someone experienced, and complete a small guided exercise.
- **2.5 to 3.4 — Strengthen through reps:** apply the skill repeatedly in bounded projects and request targeted feedback.
- **3.5 and above — Sharpen the edge:** lead a higher-ambiguity engagement, create reusable playbooks, and coach another person.

A useful development cycle is:

1. Pick one low-scoring category.
2. Define one observable behavior to improve.
3. Practice it in a real or simulated customer scenario.
4. Ask for evidence-based feedback.
5. Re-rate yourself after several repetitions.
6. Compare the new radar shape with the previous exported snapshot.

## Privacy and data handling

- Answers stay in the browser’s local storage.
- There is no application backend and no analytics endpoint.
- Export creates a local JSON file.
- Import reads the selected JSON file in the browser and keeps only recognized ratings from 1 to 5.
- Google Fonts and Chart.js are loaded from external CDNs when the page has network access.

Do not enter confidential customer information into the assessment. The questions are capability prompts, not a place to store engagement notes.

## Project structure

```text
fde-self-assessment/
├── README.md
└── src/
    ├── index.html       # Application markup and page structure
    ├── css/
    │   └── style.css    # Responsive visual design
    └── js/
        └── app.js       # Questions, scoring, chart, persistence, import/export
```

## Extending the app

To add or change assessment content, edit the `categories` array in [`src/js/app.js`](src/js/app.js).

Each category has this shape:

```javascript
{
  name: 'Category name',
  shortName: 'Chart label',
  description: 'Short explanation shown above the questions.',
  color: '#d8f36a',
  recommendation: 'Action-oriented development suggestion.',
  questions: [
    'Observable capability statement one',
    'Observable capability statement two',
    'Observable capability statement three',
    'Observable capability statement four'
  ]
}
```

When changing the number of questions, also update the static fallback text in `src/index.html`:

```html
<span class="stat-detail" id="totalQuestions">of 32</span>
```

The JavaScript replaces this value after initialization, but updating the fallback keeps the initial markup accurate.

## Browser support

The app uses modern browser APIs including:

- `localStorage`
- `FileReader`
- `Blob`
- `URL.createObjectURL`
- ES2019+ JavaScript features

Current versions of Chrome, Edge, Firefox, and Safari are supported.
