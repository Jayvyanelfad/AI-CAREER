// Reusable conceptual diagrams for lessons. These explain relationships rather
// than presenting invented measurements or performance data.
(function () {
  function esc(value) { return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }
  function text(key, fallback) { return window.t ? window.t(key, fallback) : fallback; }
  const diagrams = {
    algorithm: { title: 'An algorithm loop', steps: ['Define the input', 'Apply ordered steps', 'Check the result'] },
    python: { title: 'Python control flow', steps: ['Read a value', 'Test a condition', 'Choose or repeat a step'] },
    aiml: { title: 'Machine-learning workflow', steps: ['Representative examples', 'Train or tune a model', 'Evaluate on separate cases'] },
    rag: { title: 'Retrieval-augmented generation', steps: ['Question', 'Retrieve relevant sources', 'Grounded response with checks'] },
    agent: { title: 'Agent task loop', steps: ['Goal and context', 'Choose a bounded tool action', 'Observe, check, and continue or stop'] }
  };
  function kindFor(title, content) {
    const source = `${title || ''} ${content || ''}`.toLowerCase();
    if (/retrieval|\brag\b|grounded generation/.test(source)) return 'rag';
    if (/\bagent\b|tool.use|tool use|plan.*act/.test(source)) return 'agent';
    if (/machine learning|\bai\b|model training|model evaluation/.test(source)) return 'aiml';
    if (/python|if\s*\/\s*else|loop|control flow/.test(source)) return 'python';
    if (/algorithm|search|sort|step-by-step/.test(source)) return 'algorithm';
    return null;
  }
  function renderLessonVisual({ title, content, id }) {
    const kind = kindFor(title, content);
    if (!kind) return '';
    const diagram = diagrams[kind];
    const heading = text(`lessonVisual.${kind}.title`, diagram.title);
    const labelledBy = `lesson-visual-${esc(id || kind)}-caption`;
    return `<figure class="lesson-visual lesson-visual--${kind}" aria-labelledby="${labelledBy}">
      <div class="lesson-visual__plot" role="img" aria-label="${esc(heading)}: ${esc(diagram.steps.join(', then '))}">
        ${diagram.steps.map((step, index) => `<div class="lesson-visual__step"><span>${String(index + 1).padStart(2, '0')}</span><strong>${esc(text(`lessonVisual.${kind}.step${index + 1}`, step))}</strong></div>${index < diagram.steps.length - 1 ? '<span class="lesson-visual__arrow" aria-hidden="true">→</span>' : ''}`).join('')}
      </div>
      <figcaption id="${labelledBy}">${esc(text('lessonVisual.caption', 'Concept diagram — a relationship to inspect, not measured data.'))}</figcaption>
    </figure>`;
  }
  window.renderLessonVisual = renderLessonVisual;
})();
